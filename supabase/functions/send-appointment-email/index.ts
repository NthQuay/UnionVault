import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
  const FROM_ADDR = Deno.env.get('APPT_FROM') ?? 'appointments@unionvault.app'
  const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/

  if (!RESEND_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Email service not configured' }), {
      status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Signed-in users only — stops the function being used as an open mail relay.
  const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const ur = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { Authorization: req.headers.get('Authorization') ?? '', apikey: req.headers.get('apikey') || SB_ANON },
  })
  const user = ur.ok ? await ur.json() : null
  if (!user?.id) {
    return new Response(JSON.stringify({ ok: false, error: 'Sign in to send email' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  let body: {
    to: string[]; subject: string; body: string; ics?: string; fromName?: string; replyTo?: string; kicker?: string; title?: string; htmlText?: string; signature?: string[]
    templateId?: string; designOpts?: { accentColor?: string; fontFamily?: string; showLogo?: boolean; headerImage?: string }; preview?: boolean
  }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const isPreview = !!body.preview
  const { to, subject, body: text, ics, fromName, replyTo, kicker, title, htmlText, signature } = body
  if (!isPreview && (!to?.length || to.length > 10 || !subject)) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing to or subject' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // "Liam & Amanda <appointments@unionvault.app>", replies to the couple.
  const name = String(fromName ?? '').replace(/[<>"\r\n]/g, '').trim().slice(0, 80) || 'UnionVault'
  const payload: Record<string, unknown> = { from: `${name} <${FROM_ADDR}>`, to, subject, text }
  const rt = EMAIL_RE.test(String(replyTo ?? '')) ? String(replyTo) : user.email
  if (rt) payload.reply_to = rt
  const sigLines = Array.isArray(signature) ? signature.map((l) => String(l).slice(0, 200)).slice(0, 4) : []

  // Same free/paid branding gate as send-guest-email (this function is already
  // signed-in-only, so the tier is looked up for the calling user directly).
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
  const HEX_RE = /^#[0-9a-fA-F]{6}$/
  const accentColor = HEX_RE.test(String(body.designOpts?.accentColor || '')) ? String(body.designOpts!.accentColor) : '#8a6a2c'
  const showLogo = body.designOpts?.showLogo !== false
  const headerImageRaw = String(body.designOpts?.headerImage || '')
  const headerImageCustom = headerImageRaw.startsWith(`${SB_URL}/storage/v1/object/public/photos/${user.id}/`) && !headerImageRaw.includes('..') ? headerImageRaw : ''
  // No custom header → the UnionVault default banner; 'none' → the couple turned it off.
  const headerImage = headerImageRaw === 'none' ? '' : (headerImageCustom || 'https://unionvault.app/assets/email_header_default_blackgold.png')

  payload.html = brandedHtml({
    kicker: String(kicker ?? '').slice(0, 120),
    title: String(title ?? '').slice(0, 200),
    text: String(htmlText || text || '').slice(0, 10000),
    signature: sigLines,
    accentColor, showBranding, showLogo: showLogo || showBranding, headerImage,
  })

  if (isPreview) {
    return new Response(JSON.stringify({ ok: true, html: payload.html }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  if (ics) {
    payload.attachments = [{ filename: 'appointment.ics', content: ics }]
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!r.ok) {
    const err = await r.text()
    console.error('Resend error:', r.status, err)
    return new Response(JSON.stringify({ ok: false, error: 'Send failed' }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})

// ── Branded HTML version of a plain-text email ────────────────────────────────
// Everything passed in is plain text and is escaped here, so callers can't inject
// markup. Black logo on cream; email apps that honour prefers-color-scheme swap
// to the white logo on a dark band.
const LOGO_BASE = 'https://unionvault.app/assets'
const escH = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function linkifyWith(escaped: string, color: string): string {
  return escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)'"]/g, (u) => `<a href="${u}" style="color:${color}">${u}</a>`)
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
function brandedHtml(opts: { kicker?: string; title?: string; text: string; signature?: string[]; accentColor?: string; showBranding?: boolean; showLogo?: boolean; headerImage?: string }): string {
  const ac = escH(opts.accentColor || '#8a6a2c')
  const showBranding = opts.showBranding !== false
  const showLogo = opts.showLogo !== false
  const paras = String(opts.text ?? '').trim().split(/\n{2,}/).map((p) => {
    const isHeading = /^##\s+/.test(p)
    const body = isHeading ? p.replace(/^##\s+/, '') : p
    const html = applyInlineMarkup(linkifyWith(escH(body), ac)).replace(/\n/g, '<br>')
    return isHeading
      ? `<p style="margin:0 0 14px;font-size:17px;line-height:1.4;font-style:italic;font-weight:500">${html}</p>`
      : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${html}</p>`
  }).join('')
  const signatureHtml = opts.signature?.length
    ? `<div class="uv-muted" style="text-align:center;font-style:italic;font-size:13px;color:#6E6259;margin-top:4px">${opts.signature.map((l) => applyInlineMarkup(escH(l)).replace(/\bUnion ?Vault\b/g, (m) => `<a href="https://unionvault.app" style="color:${ac};text-decoration:none">${m}</a>`)).join('<br>')}</div>`
    : ''
  const logoImg = `<picture><source srcset="${LOGO_BASE}/email-logo-white.png" media="(prefers-color-scheme: dark)"><img src="${LOGO_BASE}/email-logo-black.png" width="60" alt="Union Vault" style="display:block;width:60px;height:auto;border:0;margin:0 auto"></picture>`
  const headerBand = opts.headerImage
    ? `<tr><td style="padding:0"><img src="${escH(opts.headerImage)}" width="560" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>`
    : ''
  // Footer (same as send-guest-email's): shown when Show logo is on, and always on the
  // free plan. Logo only when Show logo is on; the "Wedding planned with" line whenever
  // the footer shows. Lives in the footer so a header image can't displace the logo.
  const brandingFooter = (showBranding || showLogo)
    ? `<tr><td style="padding:0 26px 6px"><hr class="uv-rule" style="border:none;border-top:1px solid #E0D8CF;margin:0 0 14px"></td></tr>
${showLogo ? `<tr><td align="center" style="padding:0 26px 10px"><a href="https://unionvault.app" style="text-decoration:none">${logoImg}</a></td></tr>` : ''}
<tr><td align="center" class="uv-muted" style="padding:0 26px 22px;font-size:11px;color:#6E6259">Wedding planned with <a href="https://unionvault.app" style="color:${ac};text-decoration:none">Union Vault</a></td></tr>`
    : `<tr><td style="height:16px;line-height:16px;font-size:0">&nbsp;</td></tr>`
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>@media (prefers-color-scheme: dark){.uv-bg{background:#111114!important}.uv-card{background:#1A1A1F!important;color:#EDE6DA!important}.uv-band{background:#111114!important}.uv-muted{color:#A79E92!important}.uv-kicker{color:#E3C878!important}.uv-rule{border-top-color:#34343B!important}}</style></head>
<body class="uv-bg" style="margin:0;padding:24px 12px;background:#EFEAE1;font-family:Helvetica,Arial,sans-serif;color:#2C2222">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="max-width:560px;background:#FBF8F3;border-radius:12px;overflow:hidden">
${headerBand}
<tr><td style="padding:24px 26px 10px">
${opts.kicker ? `<div class="uv-kicker" style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:8px">${escH(opts.kicker)}</div>` : ''}
${opts.title ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;margin-bottom:16px">${escH(opts.title)}</div>` : ''}
${paras}
${signatureHtml}
</td></tr>
${brandingFooter}
</table></td></tr></table></body></html>`
}
