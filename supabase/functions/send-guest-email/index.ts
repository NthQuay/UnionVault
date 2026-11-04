// Sends a save-the-date / invitation email to guests via Resend, optionally with the
// couple's uploaded invitation attached. Only signed-in UnionVault users may call it,
// and an attachment may only come from that user's own folder in the public `photos`
// bucket — so the function can't be used as an open mail relay.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/
const MAX_TO = 10
const VALID_TEMPLATES = ['classic', 'modern', 'botanical'] as const
const HEX_RE = /^#[0-9a-fA-F]{6}$/

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
  const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const FROM_ADDR = Deno.env.get('INVITE_FROM') ?? 'invites@unionvault.app'
  if (!RESEND_KEY) return json(503, { ok: false, error: 'Email service not configured' })

  // Signed-in users only.
  const auth = req.headers.get('Authorization') ?? ''
  const ur = await fetch(`${SB_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: req.headers.get('apikey') || SB_ANON } })
  if (!ur.ok) return json(401, { ok: false, error: 'Sign in to send email' })
  const user = await ur.json()
  if (!user?.id) return json(401, { ok: false, error: 'Sign in to send email' })

  let b: { to?: string[]; subject?: string; body?: string; fromName?: string; replyTo?: string; kicker?: string; title?: string;
           attachment?: { filename?: string; path?: string }; ics?: string;
           templateId?: string; designOpts?: { accentColor?: string; fontFamily?: string; showLogo?: boolean; headerImage?: string }; preview?: boolean;
           htmlText?: string; guestId?: string;
           inviteBlock?: { imageSrc?: string; imageHref?: string; imageCaption?: string; fallbackLinkLabel?: string; fallbackLinkUrl?: string; rsvpUrl?: string; rsvpByText?: string; rsvpButtonLabel?: string; closingText?: string } }
  try { b = await req.json() } catch { return json(400, { ok: false, error: 'Invalid JSON' }) }

  const isPreview = !!b.preview

  const to = (b.to ?? []).map((e) => String(e).trim()).filter((e) => EMAIL_RE.test(e))
  if (!isPreview && (!to.length || to.length > MAX_TO)) return json(400, { ok: false, error: 'Invalid recipients' })
  const subject = String(b.subject ?? '').slice(0, 200)
  const text = String(b.body ?? '').slice(0, 10000)
  if (!isPreview && (!subject || !text)) return json(400, { ok: false, error: 'Missing subject or body' })

  const name = String(b.fromName ?? '').replace(/[<>"\r\n]/g, '').trim().slice(0, 80) || 'UnionVault'
  const replyTo = EMAIL_RE.test(String(b.replyTo ?? '')) ? String(b.replyTo) : user.email

  // Template + design options (validated server-side, never trust the client)
  const tplId = VALID_TEMPLATES.includes(String(b.templateId || '') as typeof VALID_TEMPLATES[number]) ? String(b.templateId) : 'classic'
  const accentColor = HEX_RE.test(String(b.designOpts?.accentColor || '')) ? String(b.designOpts!.accentColor) : '#8a6a2c'
  const fontFamilyId = b.designOpts?.fontFamily === 'sans-serif' ? 'sans-serif' : 'serif'
  const fontFamily = fontFamilyId === 'sans-serif' ? "Helvetica,Arial,sans-serif" : "Georgia,'Times New Roman',serif"
  const showLogo = b.designOpts?.showLogo !== false
  const headerImageRaw = String(b.designOpts?.headerImage || '')
  const headerImage = headerImageRaw.startsWith(`${SB_URL}/storage/v1/object/public/photos/`) && !headerImageRaw.includes('..') ? headerImageRaw : ''

  // Look up sender's tier for branding decision
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

  // Invite-only: an embedded invitation image (or a plain link when there's no image —
  // a PDF, say) plus a "click here" RSVP line, spliced into the template between the
  // greeting/intro paragraphs and the sign-off. imageSrc is restricted to the sender's
  // own photos folder, same rule as the attachment path below; the other URLs just need
  // to be real https links so they can't be used to run a non-http scheme in an href.
  const isHttps = (u: string) => /^https:\/\//i.test(u)
  let inviteBlock: TemplateOpts['inviteBlock']
  if (b.inviteBlock) {
    const ib = b.inviteBlock
    const imgAllowed = `${SB_URL}/storage/v1/object/public/photos/${user.id}/`
    const imageSrc = ib.imageSrc && ib.imageSrc.startsWith(imgAllowed) && !ib.imageSrc.includes('..') ? ib.imageSrc : ''
    const safe: NonNullable<TemplateOpts['inviteBlock']> = {}
    if (imageSrc) {
      safe.imageSrc = imageSrc
      if (ib.imageHref && isHttps(ib.imageHref)) safe.imageHref = ib.imageHref
      if (ib.imageCaption) safe.imageCaption = String(ib.imageCaption).slice(0, 160)
    } else if (ib.fallbackLinkUrl && isHttps(ib.fallbackLinkUrl)) {
      safe.fallbackLinkUrl = ib.fallbackLinkUrl
      safe.fallbackLinkLabel = String(ib.fallbackLinkLabel || 'View your invitation').slice(0, 80)
    }
    if (ib.rsvpUrl && isHttps(ib.rsvpUrl)) {
      safe.rsvpUrl = ib.rsvpUrl
      if (ib.rsvpByText) safe.rsvpByText = String(ib.rsvpByText).slice(0, 80)
      if (ib.rsvpButtonLabel) safe.rsvpButtonLabel = String(ib.rsvpButtonLabel).slice(0, 40)
    }
    if (ib.closingText) safe.closingText = String(ib.closingText).slice(0, 200)
    if (Object.keys(safe).length) inviteBlock = safe
  }

  const html = brandedHtml({
    kicker: String(b.kicker ?? '').slice(0, 120),
    title: String(b.title ?? '').slice(0, 200),
    text: String(b.htmlText || text) || 'Preview of your email template.',
    showBranding, accentColor, fontFamily, showLogo, headerImage, templateId: tplId,
    inviteBlock,
  })

  if (isPreview) return json(200, { ok: true, html })

  const payload: Record<string, unknown> = { from: `${name} <${FROM_ADDR}>`, to, subject, text, html }
  if (replyTo) payload.reply_to = replyTo

  // A mailto List-Unsubscribe header — mail clients that honour it (Gmail, Outlook, Apple
  // Mail) surface an "Unsubscribe" action next to the sender that just emails the couple,
  // which is both a genuine deliverability signal (its mere presence tells spam filters
  // this is bulk-ish mail sent responsibly) and a real way for a guest to opt out. The
  // couple's own reply_to is the target, so the request reaches them directly; the subject
  // names the guest so it's actionable without opening the message.
  if (replyTo) {
    const unsubSubject = `Unsubscribe request${to[0] ? ` — ${to[0]}` : ''}`
    payload.headers = { 'List-Unsubscribe': `<mailto:${replyTo}?subject=${encodeURIComponent(unsubSubject)}>` }
  }

  // Tags Resend echoes back on delivery/bounce/complaint webhook events, so a bounce can
  // be attributed to the right couple + guest without us tracking message ids ourselves.
  // Values must be alnum/underscore/dash only — both ids already are, but sanitise anyway
  // since this is user-adjacent input.
  const tagVal = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100)
  const guestId = tagVal(String(b.guestId || ''))
  if (guestId) {
    payload.tags = [
      { name: 'couple_id', value: tagVal(user.id) },
      { name: 'guest_id', value: guestId },
    ]
  }

  if (b.attachment?.path) {
    const allowed = `${SB_URL}/storage/v1/object/public/photos/${user.id}/`
    const path = String(b.attachment.path)
    if (!path.startsWith(allowed) || path.includes('..')) return json(400, { ok: false, error: 'Invalid attachment' })
    const filename = String(b.attachment.filename ?? 'invitation').replace(/[\\/\r\n"]/g, '').slice(0, 120) || 'invitation'
    payload.attachments = [{ filename, path }]
  } else if (b.ics) {
    // Save-the-date calendar invite — client already base64-encoded it (same pattern
    // send-appointment-email uses), so just pass it through as-is.
    payload.attachments = [{ filename: 'wedding.ics', content: String(b.ics) }]
  }

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
// — applied after escaping/linkifying, so a guest's typed text can never inject real HTML,
// only these specific patterns become tags. Double-star is matched before single-star so
// **bold** doesn't get half-eaten by the italic pass.
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

// Invite-only block: an embedded, clickable invitation image (or a plain link when
// there's no image to show — a PDF, say) followed by the RSVP line and sign-off.
// Spliced in after the greeting/intro paragraphs built from `text` above.
function inviteBlockHtml(block: NonNullable<TemplateOpts['inviteBlock']>, color: string): string {
  const parts: string[] = []
  if (block.imageSrc) {
    const img = `<img src="${escH(block.imageSrc)}" alt="Invitation" style="display:block;width:100%;max-width:340px;height:auto;margin:0 auto;border-radius:8px;border:1px solid rgba(0,0,0,.08)">`
    parts.push(`<div style="text-align:center;margin:2px 0 6px">${block.imageHref ? `<a href="${escH(block.imageHref)}" style="text-decoration:none">${img}</a>` : img}</div>`)
    parts.push(`<div style="text-align:center;font-size:11.5px;color:#8a8077;margin:0 0 16px">${escH(block.imageCaption || 'Click on invite to open in new page.')}</div>`)
  } else if (block.fallbackLinkUrl) {
    parts.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${escH(block.fallbackLinkLabel || 'View your invitation')}: <a href="${escH(block.fallbackLinkUrl)}" style="color:${escH(color)}">${escH(block.fallbackLinkUrl)}</a></p>`)
  }
  if (block.rsvpUrl && block.rsvpButtonLabel) {
    // Reminder emails: a plain sentence stating the deadline, then an actual button —
    // not the inline "by clicking here" link Invite uses below, which reads too quietly
    // for a follow-up nudge.
    if (block.rsvpByText) {
      parts.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Please submit your RSVP by ${escH(block.rsvpByText)} so we know whether to account for you or not.</p>`)
    }
    parts.push(`<div style="text-align:center;margin:6px 0 16px"><a href="${escH(block.rsvpUrl)}" style="display:inline-block;background:${color};color:#fff;font-size:13.5px;font-weight:600;padding:11px 26px;border-radius:8px;text-decoration:none">${escH(block.rsvpButtonLabel)}</a></div>`)
  } else if (block.rsvpUrl) {
    const byPart = block.rsvpByText ? ` by ${escH(block.rsvpByText)}` : ''
    parts.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Kindly RSVP${byPart} by clicking <a href="${escH(block.rsvpUrl)}" style="color:${escH(color)}">here</a>.</p>`)
  }
  if (block.closingText) parts.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${escH(block.closingText)}</p>`)
  return parts.join('')
}

// ── Template dispatcher ──────────────────────────────────────────────────────
interface TemplateOpts {
  kicker?: string; title?: string; text: string; showBranding?: boolean
  accentColor: string; fontFamily: string; showLogo: boolean; templateId: string
  headerImage: string
  inviteBlock?: { imageSrc?: string; imageHref?: string; imageCaption?: string; fallbackLinkLabel?: string; fallbackLinkUrl?: string; rsvpUrl?: string; rsvpByText?: string; rsvpButtonLabel?: string; closingText?: string }
}

function brandedHtml(opts: TemplateOpts): string {
  if (opts.templateId === 'modern') return modernTemplate(opts)
  if (opts.templateId === 'botanical') return botanicalTemplate(opts)
  return classicTemplate(opts)
}

// ── Classic template ─────────────────────────────────────────────────────────
// Cream card on beige background, logo header band, serif title, gold accents.
function classicTemplate(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const paras = buildParas(opts.text, ac)

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
${opts.inviteBlock ? inviteBlockHtml(opts.inviteBlock, ac) : ''}
</td></tr>
${brandingFooter}
</table></td></tr></table></body></html>`
}

// ── Modern template ──────────────────────────────────────────────────────────
// Clean white card, left accent border, sans-serif, minimal.
function modernTemplate(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const paras = buildParas(opts.text, ac)

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
${opts.inviteBlock ? inviteBlockHtml(opts.inviteBlock, ac) : ''}
</td></tr>
${brandingFooter}
</table></td></tr></table></body></html>`
}

// ── Botanical template ───────────────────────────────────────────────────────
// Soft sage tones, serif headings, leaf motif in header band.
function botanicalTemplate(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const paras = buildParas(opts.text, ac)

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
${opts.inviteBlock ? inviteBlockHtml(opts.inviteBlock, ac) : ''}
</td></tr>
${brandingFooter}
</table></td></tr></table></body></html>`
}
