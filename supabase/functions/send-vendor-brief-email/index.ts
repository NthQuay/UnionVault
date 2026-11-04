// Sends a vendor brief link to a vendor via Resend. Only signed-in UnionVault users may
// call it — same pattern as send-guest-email/send-appointment-email, so it can't be used
// as an open mail relay. The brief itself (vendor_tokens row) is created separately by the
// client before calling this; this function only emails the link.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/
const VALID_TEMPLATES = ['classic', 'modern', 'botanical'] as const
const HEX_RE = /^#[0-9a-fA-F]{6}$/

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
  const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const FROM_ADDR = Deno.env.get('APPT_FROM') ?? 'appointments@unionvault.app'
  if (!RESEND_KEY) return json(503, { ok: false, error: 'Email service not configured' })

  // Signed-in users only.
  const auth = req.headers.get('Authorization') ?? ''
  const ur = await fetch(`${SB_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: req.headers.get('apikey') || SB_ANON } })
  if (!ur.ok) return json(401, { ok: false, error: 'Sign in to send email' })
  const user = await ur.json()
  if (!user?.id) return json(401, { ok: false, error: 'Sign in to send email' })

  let b: {
    to?: string; vendor_name?: string; brief_url?: string; expiry_display?: string
    fromName?: string; replyTo?: string
    intro_override?: string; button_label_override?: string; closing_override?: string
    templateId?: string; designOpts?: { accentColor?: string; fontFamily?: string; showLogo?: boolean; headerImage?: string }; preview?: boolean
  }
  try { b = await req.json() } catch { return json(400, { ok: false, error: 'Invalid JSON' }) }

  const isPreview = !!b.preview
  const toEmail = EMAIL_RE.test(String(b.to ?? '')) ? String(b.to).trim() : ''
  if (!isPreview && !toEmail) return json(400, { ok: false, error: 'Invalid recipient' })
  const vendorName = String(b.vendor_name ?? '').trim().slice(0, 200) || (isPreview ? '[vendor name]' : 'there')
  const briefUrl = /^https?:\/\//i.test(String(b.brief_url ?? '')) ? String(b.brief_url).trim() : (isPreview ? 'https://unionvault.app' : '')
  if (!isPreview && !briefUrl) return json(400, { ok: false, error: 'Missing brief link' })
  const expiryDisplay = String(b.expiry_display ?? '').trim().slice(0, 60)

  const name = String(b.fromName ?? '').replace(/[<>"\r\n]/g, '').trim().slice(0, 80) || 'UnionVault'
  const replyTo = EMAIL_RE.test(String(b.replyTo ?? '')) ? String(b.replyTo) : user.email

  const tplId = VALID_TEMPLATES.includes(String(b.templateId || '') as typeof VALID_TEMPLATES[number]) ? String(b.templateId) : 'classic'
  const accentColor = HEX_RE.test(String(b.designOpts?.accentColor || '')) ? String(b.designOpts!.accentColor) : '#8a6a2c'
  const fontFamilyId = b.designOpts?.fontFamily === 'sans-serif' ? 'sans-serif' : 'serif'
  const fontFamily = fontFamilyId === 'sans-serif' ? 'Helvetica,Arial,sans-serif' : "Georgia,'Times New Roman',serif"
  const showLogo = b.designOpts?.showLogo !== false
  const headerImageRaw = String(b.designOpts?.headerImage || '')
  const headerImage = headerImageRaw.startsWith(`${SB_URL}/storage/v1/object/public/photos/`) && !headerImageRaw.includes('..') ? headerImageRaw : ''

  // Same free/paid branding gate as send-guest-email.
  const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  let senderTier = 'free'
  if (SB_SERVICE) {
    try {
      // compute_tier mirrors get_my_subscription()'s effective-tier logic (granted
      // access + subscriptions table), not just the bare user_profiles.tier column —
      // a plain column read missed any couple on a granted-access or active plan.
      const pr = await fetch(`${SB_URL}/rest/v1/rpc/compute_tier`, {
        method: 'POST',
        headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_user_id: user.id }),
      })
      const t = await pr.json()
      if (typeof t === 'string' && t) senderTier = t
    } catch (_) { /* default to free — branding shown */ }
  }
  const showBranding = senderTier === 'free'

  // Editable copy from the Communications page — {names} and {vendor_name} are the only
  // tokens that make sense here. Unset/blank overrides keep the original wording.
  const names = name
  const fillTokens = (t: string) => t.replace(/\{names\}/g, names).replace(/\{vendor_name\}/g, vendorName)
  const intro = (b.intro_override ?? '').trim()
    ? fillTokens(b.intro_override!.trim())
    : `Hi ${vendorName},\n\nPlease find your vendor brief for our wedding below. You won't need an account to view it.`
  const buttonLabel = (b.button_label_override ?? '').trim() ? b.button_label_override!.trim().slice(0, 40) : 'View your brief'
  const closing = (b.closing_override ?? '').trim()
    ? fillTokens(b.closing_override!.trim())
    : `Let us know if you have any questions.\n\nWarm regards,\n${names}`

  const subject = `Vendor brief — ${vendorName}`
  const text = [intro, `${buttonLabel}: ${briefUrl}`, expiryDisplay ? `Expires ${expiryDisplay}` : '', closing].filter(Boolean).join('\n\n')
  const html = brandedHtml({
    kicker: names ? `${names}'s wedding` : '', title: 'Your vendor brief', text: intro,
    cta: { url: briefUrl, label: buttonLabel }, ctaNote: expiryDisplay ? `Expires ${expiryDisplay}` : '',
    afterText: closing,
    showBranding, accentColor, fontFamily, showLogo, headerImage, templateId: tplId,
  })

  if (isPreview) return json(200, { ok: true, html })

  const payload: Record<string, unknown> = { from: `${name} <${FROM_ADDR}>`, to: [toEmail], subject, text, html }
  if (replyTo) payload.reply_to = replyTo

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) {
    console.error('Resend error:', r.status, await r.text())
    return json(502, { ok: false, error: 'Send failed' })
  }
  return json(200, { ok: true })
})

// ── Shared helpers ───────────────────────────────────────────────────────────
const LOGO_BASE = 'https://unionvault.app/assets'
const escH = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function linkifyWith(escaped: string, color: string): string {
  return escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)'"]/g, (u) => `<a href="${u}" style="color:${escH(color)}">${u}</a>`)
}
// The Communications page's lightweight formatting markup — **bold** *italic* __underline__
// — applied after escaping/linkifying, so typed text can never inject real HTML, only
// these specific patterns become tags. Double-star before single-star so **bold** doesn't
// get half-eaten by the italic pass.
function applyInlineMarkup(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}
function buildParas(text: string, color: string): string {
  return String(text ?? '').trim().split(/\n{2,}/).map((p) => {
    const isHeading = /^##\s+/.test(p)
    const body = isHeading ? p.replace(/^##\s+/, '') : p
    const html = applyInlineMarkup(linkifyWith(escH(body), color)).replace(/\n/g, '<br>')
    return isHeading
      ? `<p style="margin:0 0 14px;font-size:17px;line-height:1.4;font-style:italic;font-weight:500">${html}</p>`
      : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${html}</p>`
  }).join('')
}
function ctaButtonHtml(cta: { url: string; label: string }, note: string, color: string): string {
  const button = `<div style="text-align:center;margin:6px 0 16px"><a href="${escH(cta.url)}" style="display:inline-block;background:${color};color:#fff;font-size:13.5px;font-weight:600;padding:11px 26px;border-radius:8px;text-decoration:none">${escH(cta.label)}</a></div>`
  const noteHtml = note ? `<div style="text-align:center;font-size:11.5px;color:#8a8077;margin:-8px 0 16px">${escH(note)}</div>` : ''
  return button + noteHtml
}

interface TemplateOpts {
  kicker?: string; title?: string; text: string; afterText?: string; showBranding?: boolean
  accentColor: string; fontFamily: string; showLogo: boolean; templateId: string; headerImage: string
  cta?: { url: string; label: string }; ctaNote?: string
}

function brandedHtml(opts: TemplateOpts): string {
  if (opts.templateId === 'modern') return modernTemplate(opts)
  if (opts.templateId === 'botanical') return botanicalTemplate(opts)
  return classicTemplate(opts)
}

// ── Classic template ─────────────────────────────────────────────────────────
function classicTemplate(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const paras = buildParas(opts.text, ac)
  const afterParas = opts.afterText ? buildParas(opts.afterText, ac) : ''
  const ctaHtml = opts.cta ? ctaButtonHtml(opts.cta, opts.ctaNote || '', ac) : ''

  const headerBand = opts.headerImage
    ? `<tr><td style="padding:0"><img src="${opts.headerImage}" width="560" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>` : ''

  const logoFooter = opts.showLogo
    ? `<tr><td align="center" style="padding:0 26px 10px">
<a href="https://unionvault.app" style="text-decoration:none">
<picture><source srcset="${LOGO_BASE}/email-logo-white.png" media="(prefers-color-scheme: dark)"><img src="${LOGO_BASE}/email-logo-black.png" width="90" alt="Union Vault" style="display:block;width:90px;height:auto;border:0;margin:0 auto"></picture>
</a></td></tr>` : ''

  const brandingFooter = (opts.showBranding || opts.showLogo)
    ? `<tr><td style="padding:0 26px 6px"><hr style="border:none;border-top:1px solid #E0D8CF;margin:0 0 14px"></td></tr>
${logoFooter}
${opts.showBranding ? `<tr><td align="center" class="uv-muted" style="padding:0 26px 22px;font-size:11px;color:#6E6259">Planned with <a href="https://unionvault.app" style="color:${ac};text-decoration:none">Union Vault</a></td></tr>` : ''}`
    : ''

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>@media (prefers-color-scheme: dark){.uv-bg{background:#111114!important}.uv-card{background:#1A1A1F!important;color:#EDE6DA!important}.uv-band{background:#111114!important}.uv-muted{color:#A79E92!important}.uv-kicker{color:#E3C878!important}}</style></head>
<body class="uv-bg" style="margin:0;padding:24px 12px;background:#EFEAE1;font-family:Helvetica,Arial,sans-serif;color:#2C2222">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="max-width:560px;background:#FBF8F3;border-radius:12px;overflow:hidden">
${headerBand}
<tr><td style="padding:24px 26px 10px">
${opts.kicker ? `<div class="uv-kicker" style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:8px">${escH(opts.kicker)}</div>` : ''}
${opts.title ? `<div style="font-family:${escH(opts.fontFamily)};font-size:24px;line-height:1.2;margin-bottom:16px">${escH(opts.title)}</div>` : ''}
${paras}
${ctaHtml}
${afterParas}
</td></tr>
${brandingFooter}
</table></td></tr></table></body></html>`
}

// ── Modern template ──────────────────────────────────────────────────────────
function modernTemplate(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const paras = buildParas(opts.text, ac)
  const afterParas = opts.afterText ? buildParas(opts.afterText, ac) : ''
  const ctaHtml = opts.cta ? ctaButtonHtml(opts.cta, opts.ctaNote || '', ac) : ''

  const headerBand = opts.headerImage
    ? `<tr><td style="padding:0"><img src="${opts.headerImage}" width="560" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>` : ''

  const logoFooter = opts.showLogo
    ? `<tr><td align="center" style="padding:0 26px 10px">
<a href="https://unionvault.app" style="text-decoration:none">
<picture><source srcset="${LOGO_BASE}/email-logo-white.png" media="(prefers-color-scheme: dark)"><img src="${LOGO_BASE}/email-logo-black.png" width="80" alt="Union Vault" style="display:block;width:80px;height:auto;border:0;margin:0 auto"></picture>
</a></td></tr>` : ''

  const brandingFooter = (opts.showBranding || opts.showLogo)
    ? `<tr><td style="padding:0 26px 6px"><hr style="border:none;border-top:1px solid #EBEBEB;margin:0 0 14px"></td></tr>
${logoFooter}
${opts.showBranding ? `<tr><td align="center" class="uv-muted" style="padding:0 26px 20px;font-size:11px;color:#999">Planned with <a href="https://unionvault.app" style="color:${ac};text-decoration:none">Union Vault</a></td></tr>` : ''}`
    : ''

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>@media (prefers-color-scheme: dark){.uv-bg{background:#1A1A1D!important}.uv-card{background:#232328!important;color:#E8E8E8!important;border-color:#3A3A3F!important}.uv-muted{color:#888!important}.uv-kicker{color:${ac}!important}}</style></head>
<body class="uv-bg" style="margin:0;padding:24px 12px;background:#F5F5F5;font-family:Helvetica,Arial,sans-serif;color:#1A1A1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="max-width:560px;background:#FFFFFF;border-radius:8px;overflow:hidden;border-left:4px solid ${ac}">
${headerBand}
<tr><td style="padding:24px 26px 10px">
${opts.kicker ? `<div class="uv-kicker" style="font-size:11px;font-weight:600;letter-spacing:.1em;color:${ac};margin-bottom:8px">${escH(opts.kicker)}</div>` : ''}
${opts.title ? `<div style="font-family:${escH(opts.fontFamily)};font-size:22px;font-weight:600;line-height:1.25;margin-bottom:16px">${escH(opts.title)}</div>` : ''}
${paras}
${ctaHtml}
${afterParas}
</td></tr>
${brandingFooter}
</table></td></tr></table></body></html>`
}

// ── Botanical template ───────────────────────────────────────────────────────
function botanicalTemplate(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const paras = buildParas(opts.text, ac)
  const afterParas = opts.afterText ? buildParas(opts.afterText, ac) : ''
  const ctaHtml = opts.cta ? ctaButtonHtml(opts.cta, opts.ctaNote || '', ac) : ''

  const leafSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="24" viewBox="0 0 80 24" fill="none" style="display:block;margin:0 auto 6px"><path d="M40 22C30 18 22 12 20 4c6 2 14 6 20 14C46 10 54 6 60 4c-2 8-10 14-20 18z" fill="${ac}" opacity=".18"/><path d="M40 22V4" stroke="${ac}" stroke-width=".7" opacity=".25"/></svg>`

  const headerBand = opts.headerImage
    ? `<tr><td style="padding:0"><img src="${opts.headerImage}" width="560" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>`
    : `<tr><td class="uv-band" align="center" style="background:#E8EDE6;padding:14px 0 10px">${leafSvg}</td></tr>`

  const logoFooter = opts.showLogo
    ? `<tr><td align="center" style="padding:0 26px 10px">
<a href="https://unionvault.app" style="text-decoration:none">
<picture><source srcset="${LOGO_BASE}/email-logo-white.png" media="(prefers-color-scheme: dark)"><img src="${LOGO_BASE}/email-logo-black.png" width="85" alt="Union Vault" style="display:block;width:85px;height:auto;border:0;margin:0 auto"></picture>
</a></td></tr>` : ''

  const brandingFooter = (opts.showBranding || opts.showLogo)
    ? `<tr><td style="padding:0 26px 6px"><hr style="border:none;border-top:1px solid #D4DCD2;margin:0 0 14px"></td></tr>
${logoFooter}
${opts.showBranding ? `<tr><td align="center" class="uv-muted" style="padding:0 26px 22px;font-size:11px;color:#7A8B78">Planned with <a href="https://unionvault.app" style="color:${ac};text-decoration:none">Union Vault</a></td></tr>` : ''}`
    : ''

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>@media (prefers-color-scheme: dark){.uv-bg{background:#0F1410!important}.uv-card{background:#1A1F1C!important;color:#DDE5DB!important}.uv-band{background:#151C17!important}.uv-muted{color:#8A9B8E!important}.uv-kicker{color:${ac}!important}}</style></head>
<body class="uv-bg" style="margin:0;padding:24px 12px;background:#F4F7F2;font-family:Helvetica,Arial,sans-serif;color:#2C332C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden">
${headerBand}
<tr><td style="padding:24px 26px 10px">
${opts.kicker ? `<div class="uv-kicker" style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:8px">${escH(opts.kicker)}</div>` : ''}
${opts.title ? `<div style="font-family:${escH(opts.fontFamily)};font-size:24px;line-height:1.2;margin-bottom:16px">${escH(opts.title)}</div>` : ''}
${paras}
${ctaHtml}
${afterParas}
</td></tr>
${brandingFooter}
</table></td></tr></table></body></html>`
}
