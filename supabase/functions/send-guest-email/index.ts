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
// 'botanical' was retired in the app; any old value falls back to classic below.
const VALID_TEMPLATES = ['classic', 'modern', 'editorial', 'atelier'] as const
const HEX_RE = /^#[0-9a-fA-F]{6}$/
// Email-safe font stacks, keyed by the ids the app stores (fontFamily = header, bodyFont = body).
const FONT_STACKS: Record<string, string> = {
  'serif': "Georgia,'Times New Roman',serif",
  'palatino': "'Palatino Linotype',Palatino,'Book Antiqua',serif",
  'sans-serif': 'Helvetica,Arial,sans-serif',
  'trebuchet': "'Trebuchet MS',Verdana,sans-serif",
}

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
           templateId?: string; designOpts?: { accentColor?: string; fontFamily?: string; bodyFont?: string; showLogo?: boolean; headerImage?: string }; preview?: boolean;
           htmlText?: string; guestId?: string; ctaLinks?: { rsvp?: string; website?: string };
           logKind?: string; toNames?: string[];
           issue?: { names?: string; date?: string; time?: string; venue?: string };
           inviteBlock?: { imageSrc?: string; imageHref?: string; imageCaption?: string; fallbackLinkLabel?: string; fallbackLinkUrl?: string; rsvpUrl?: string; rsvpByText?: string; rsvpButtonLabel?: string; rsvpLeadText?: string; websiteUrl?: string; websiteLabel?: string; closingText?: string } }
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
  const fontFamily = FONT_STACKS[String(b.designOpts?.fontFamily || '')] || FONT_STACKS['serif']
  const bodyFont = FONT_STACKS[String((b.designOpts as { bodyFont?: string } | undefined)?.bodyFont || '')] || FONT_STACKS['sans-serif']
  const showLogo = b.designOpts?.showLogo !== false
  const headerImageRaw = String(b.designOpts?.headerImage || '')
  const headerImageCustom = headerImageRaw.startsWith(`${SB_URL}/storage/v1/object/public/photos/`) && !headerImageRaw.includes('..') ? headerImageRaw : ''
  // No custom header → the UnionVault default banner; 'none' → the couple turned it off.
  const headerImage = headerImageRaw === 'none' ? '' : (headerImageCustom || 'https://unionvault.app/assets/email_header_default_blackgold.png')

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
      if (ib.rsvpLeadText) safe.rsvpLeadText = String(ib.rsvpLeadText).slice(0, 200)
    }
    if (ib.websiteUrl && isHttps(ib.websiteUrl)) {
      safe.websiteUrl = ib.websiteUrl
      safe.websiteLabel = String(ib.websiteLabel || 'Visit our website').slice(0, 40)
    }
    if (ib.closingText) safe.closingText = String(ib.closingText).slice(0, 200)
    if (Object.keys(safe).length) inviteBlock = safe
  }

  // RSVP / website buttons the couple placed in the text ({rsvp_button} / {website_button}
  // on a line of their own) — drawn from these links; https only, like the invite block.
  const ctaLinks = {
    rsvp: b.ctaLinks?.rsvp && /^https:\/\//i.test(b.ctaLinks.rsvp) ? String(b.ctaLinks.rsvp) : '',
    website: b.ctaLinks?.website && /^https:\/\//i.test(b.ctaLinks.website) ? String(b.ctaLinks.website) : '',
  }
  // Names / date / venue for the Editorial and Atelier layouts (masthead, cover lines,
  // details panel). Plain strings, length-capped; escaped where they're drawn.
  const iss = b.issue || {}
  const issue = {
    names: String(iss.names ?? '').replace(/[\r\n]/g, ' ').slice(0, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(iss.date ?? '')) ? String(iss.date) : '',
    time: String(iss.time ?? '').slice(0, 30),
    venue: String(iss.venue ?? '').replace(/[\r\n]/g, ' ').slice(0, 120),
  }
  const html = brandedHtml({
    kicker: String(b.kicker ?? '').slice(0, 120),
    title: String(b.title ?? '').slice(0, 200),
    text: String(b.htmlText || text) || 'Preview of your email template.',
    showBranding, accentColor, fontFamily, bodyFont, showLogo: showLogo || showBranding, headerImage, templateId: tplId,
    inviteBlock, ctaLinks, issue,
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
  const sent = await r.json().catch(() => ({})) as { id?: string }
  const LOG_KINDS = ['savedate', 'invite', 'reminder']
  const logKind = LOG_KINDS.includes(String(b.logKind || '')) ? String(b.logKind) : 'other'
  const names = Array.isArray(b.toNames) ? b.toNames.map((n) => String(n ?? '').slice(0, 120)) : []
  await logSent(SB_URL, SB_SERVICE, to.map((email, i) => ({
    couple_id: user.id, kind: logKind, subject, to_email: email, to_name: names[i] || null,
    guest_id: guestId || null, from_name: name, resend_id: sent.id || null, html,
  })))
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

function buildParas(text: string, color: string, links?: { rsvp?: string; website?: string }, invHtml?: string, variant = 'pill'): string {
  return String(text ?? '').trim().split(/\n{2,}/).map((p) => {
    // {invitation_image} on its own line: the couple's invitation (image, or a link for a PDF) drawn right here.
    if (/^\{invitation_image\}$/.test(p.trim())) return invHtml || ''
    const btn = p.trim().match(/^\{(rsvp|website)_button\}$/)
    if (btn) {
      const url = btn[1] === 'rsvp' ? links?.rsvp : links?.website
      return url ? ctaButtonHtml(url, btn[1] === 'rsvp' ? 'RSVP' : 'Visit our website', color, variant) : ''
    }
    // Paragraph size prefixes: "## " intro (larger italic), "### " large, "-# " small; none = normal.
    // Optional alignment prefix first: "~c " centre, "~r " right; none = left.
    const al = p.match(/^~([cr])\s+/)
    const p2 = al ? p.slice(al[0].length) : p
    const ta = al ? `text-align:${al[1] === 'c' ? 'center' : 'right'};` : ''
    const sz = p2.match(/^(###|##|-#)\s+/)
    const body = sz ? p2.slice(sz[0].length) : p2
    const html = applyInlineMarkup(linkifyWith(escH(body), color)).replace(/\n/g, '<br>')
    if (sz && sz[1] === '##') return `<p style="${ta}margin:0 0 14px;font-size:17px;line-height:1.4;font-style:italic;font-weight:500">${html}</p>`
    if (sz && sz[1] === '###') return `<p style="${ta}margin:0 0 14px;font-size:21px;line-height:1.35">${html}</p>`
    if (sz && sz[1] === '-#') return `<p style="${ta}margin:0 0 14px;font-size:12px;line-height:1.5;color:#8a8077">${html}</p>`
    return `<p style="${ta}margin:0 0 14px;font-size:15px;line-height:1.6">${html}</p>`
  }).join('')
}

// A centred pill button — shared by the RSVP and wedding-website CTAs below.
// variant: 'pill' (Classic/Modern), 'editorial' (square, ink, letter-spaced), 'atelier' (outlined accent).
function ctaButtonHtml(url: string, label: string, color: string, variant = 'pill'): string {
  if (variant === 'editorial') return `<div style="text-align:left;margin:8px 0 18px"><a href="${escH(url)}" class="uv-btn" style="display:inline-block;background:#1D1916;color:#FBF8F3;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;padding:14px 30px;text-decoration:none">${escH(label)}</a></div>`
  if (variant === 'atelier') return `<div style="text-align:left;margin:8px 0 18px"><a href="${escH(url)}" class="uv-btn" style="display:inline-block;border:1px solid ${color};color:${color};font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;padding:13px 30px;text-decoration:none">${escH(label)}</a></div>`
  return `<div style="text-align:center;margin:6px 0 16px"><a href="${escH(url)}" style="display:inline-block;background:${color};color:#fff;font-size:13.5px;font-weight:600;padding:11px 26px;border-radius:8px;text-decoration:none">${escH(label)}</a></div>`
}

// Invite-only block: an embedded, clickable invitation image (or a plain link when
// there's no image to show — a PDF, say), the RSVP CTA, an optional "visit our wedding
// website" CTA, and a sign-off. Spliced in after the greeting/intro paragraphs built
// from `text` above. Both Invite and the RSVP reminder email use this same block shape.
// The invitation itself — an embedded, clickable image, or a plain link when there's no image
// to show. `withCaption` is the legacy automatic version; a placed {invitation_image} has no
// caption of its own (the couple writes whatever words they like next to it).
function invitationHtml(block: NonNullable<TemplateOpts['inviteBlock']>, color: string, withCaption: boolean): string {
  const parts: string[] = []
  if (block.imageSrc) {
    const img = `<img src="${escH(block.imageSrc)}" alt="Invitation" style="display:block;width:100%;max-width:340px;height:auto;margin:0 auto;border-radius:8px;border:1px solid rgba(0,0,0,.08)">`
    parts.push(`<div style="text-align:center;margin:2px 0 ${withCaption ? 6 : 16}px">${block.imageHref ? `<a href="${escH(block.imageHref)}" style="text-decoration:none">${img}</a>` : img}</div>`)
    if (withCaption) parts.push(`<div style="text-align:center;font-size:11.5px;color:#8a8077;margin:0 0 16px">${escH(block.imageCaption || 'Click on invite to open in new page.')}</div>`)
  } else if (block.fallbackLinkUrl) {
    parts.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${escH(block.fallbackLinkLabel || 'View your invitation')}: <a href="${escH(block.fallbackLinkUrl)}" style="color:${escH(color)}">${escH(block.fallbackLinkUrl)}</a></p>`)
  }
  return parts.join('')
}
const placesInvitation = (text: string) => /(^|\n)\s*\{invitation_image\}\s*(\n|$)/.test(text || '')

function inviteBlockHtml(block: NonNullable<TemplateOpts['inviteBlock']>, color: string, placed = false, variant = 'pill'): string {
  const parts: string[] = []
  // When the couple placed {invitation_image} themselves it is already drawn in the text.
  if (!placed) parts.push(invitationHtml(block, color, true))
  if (block.rsvpUrl && block.rsvpButtonLabel) {
    if (block.rsvpLeadText) {
      parts.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${escH(block.rsvpLeadText)}</p>`)
    }
    parts.push(ctaButtonHtml(block.rsvpUrl, block.rsvpButtonLabel, color, variant))
  } else if (block.rsvpUrl) {
    const byPart = block.rsvpByText ? ` by ${escH(block.rsvpByText)}` : ''
    parts.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Kindly RSVP${byPart} by clicking <a href="${escH(block.rsvpUrl)}" style="color:${escH(color)}">here</a>.</p>`)
  }
  if (block.websiteUrl) {
    parts.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6">For all the wedding details, check out our wedding website</p>`)
    parts.push(ctaButtonHtml(block.websiteUrl, block.websiteLabel || 'Visit our website', color, variant))
  }
  if (block.closingText) parts.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${escH(block.closingText)}</p>`)
  return parts.join('')
}

// ── Template dispatcher ──────────────────────────────────────────────────────
interface TemplateOpts {
  kicker?: string; title?: string; text: string; showBranding?: boolean
  accentColor: string; fontFamily: string; showLogo: boolean; templateId: string
  headerImage: string
  bodyFont?: string
  ctaLinks?: { rsvp?: string; website?: string }
  issue?: { names: string; date: string; time: string; venue: string }
  inviteBlock?: { imageSrc?: string; imageHref?: string; imageCaption?: string; fallbackLinkLabel?: string; fallbackLinkUrl?: string; rsvpUrl?: string; rsvpByText?: string; rsvpButtonLabel?: string; rsvpLeadText?: string; websiteUrl?: string; websiteLabel?: string; closingText?: string }
}

function brandedHtml(opts: TemplateOpts): string {
  if (opts.templateId === 'modern') return modernTemplate(opts)
  if (opts.templateId === 'editorial') return editorialTemplate(opts)
  if (opts.templateId === 'atelier') return atelierTemplate(opts)
  return classicTemplate(opts)
}

// ── Classic template ─────────────────────────────────────────────────────────
// Cream card on beige background, logo header band, serif title, gold accents.
function classicTemplate(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const placed = placesInvitation(opts.text)
  const paras = buildParas(opts.text, ac, opts.ctaLinks, opts.inviteBlock ? invitationHtml(opts.inviteBlock, ac, false) : '')
  const bf = escH(opts.bodyFont || 'Helvetica,Arial,sans-serif')

  const headerBand = opts.headerImage
    ? `<tr><td style="padding:0"><img src="${opts.headerImage}" width="560" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>` : ''

  const logoFooter = opts.showLogo
    ? `<tr><td align="center" style="padding:0 26px 10px">
<a href="https://unionvault.app" style="text-decoration:none">
<picture><source srcset="${LOGO_BASE}/email-logo-white.png" media="(prefers-color-scheme: dark)"><img src="${LOGO_BASE}/email-logo-black.png" width="60" alt="Union Vault" style="display:block;width:60px;height:auto;border:0;margin:0 auto"></picture>
</a></td></tr>` : ''

  const brandingFooter = (opts.showBranding || opts.showLogo)
    ? `<tr><td style="padding:0 26px 6px"><hr style="border:none;border-top:1px solid #E0D8CF;margin:0 0 14px"></td></tr>
${logoFooter}
<tr><td align="center" class="uv-muted" style="padding:0 26px 22px;font-size:11px;color:#6E6259">Wedding planned with <a href="https://unionvault.app" style="color:${ac};text-decoration:none">Union Vault</a></td></tr>`
    : ''

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>@media (prefers-color-scheme: dark){.uv-bg{background:#111114!important}.uv-card{background:#1A1A1F!important;color:#EDE6DA!important}.uv-band{background:#111114!important}.uv-muted{color:#A79E92!important}.uv-kicker{color:#E3C878!important}}</style></head>
<body class="uv-bg" style="margin:0;padding:24px 12px;background:#EFEAE1;font-family:${bf};color:#2C2222">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="max-width:560px;background:#FBF8F3;border-radius:12px;overflow:hidden">
${headerBand}
<tr><td style="padding:24px 26px 10px;font-family:${bf}">
${opts.kicker ? `<div class="uv-kicker" style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:8px">${escH(opts.kicker)}</div>` : ''}
${opts.title ? `<div style="font-family:${escH(opts.fontFamily)};font-size:24px;line-height:1.2;margin-bottom:16px">${escH(opts.title)}</div>` : ''}
${paras}
${opts.inviteBlock ? inviteBlockHtml(opts.inviteBlock, ac, placed) : ''}
</td></tr>
${brandingFooter}
</table></td></tr></table></body></html>`
}

// ── Modern template ──────────────────────────────────────────────────────────
// Clean white card, left accent border, sans-serif, minimal.
function modernTemplate(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const placed = placesInvitation(opts.text)
  const paras = buildParas(opts.text, ac, opts.ctaLinks, opts.inviteBlock ? invitationHtml(opts.inviteBlock, ac, false) : '')
  const bf = escH(opts.bodyFont || 'Helvetica,Arial,sans-serif')

  const headerBand = opts.headerImage
    ? `<tr><td style="padding:0"><img src="${opts.headerImage}" width="560" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>` : ''

  const logoFooter = opts.showLogo
    ? `<tr><td align="center" style="padding:0 26px 10px">
<a href="https://unionvault.app" style="text-decoration:none">
<picture><source srcset="${LOGO_BASE}/email-logo-white.png" media="(prefers-color-scheme: dark)"><img src="${LOGO_BASE}/email-logo-black.png" width="53" alt="Union Vault" style="display:block;width:53px;height:auto;border:0;margin:0 auto"></picture>
</a></td></tr>` : ''

  const brandingFooter = (opts.showBranding || opts.showLogo)
    ? `<tr><td style="padding:0 26px 6px"><hr style="border:none;border-top:1px solid #EBEBEB;margin:0 0 14px"></td></tr>
${logoFooter}
<tr><td align="center" class="uv-muted" style="padding:0 26px 20px;font-size:11px;color:#999">Wedding planned with <a href="https://unionvault.app" style="color:${ac};text-decoration:none">Union Vault</a></td></tr>`
    : ''

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>@media (prefers-color-scheme: dark){.uv-bg{background:#1A1A1D!important}.uv-card{background:#232328!important;color:#E8E8E8!important}.uv-muted{color:#888!important}.uv-kicker{color:${ac}!important}}</style></head>
<body class="uv-bg" style="margin:0;padding:24px 12px;background:#F5F5F5;font-family:${bf};color:#1A1A1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:8px;overflow:hidden"><tr>
<td width="4" style="width:4px;background:${ac};font-size:0;line-height:0">&nbsp;</td>
<td style="padding:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="background:#FFFFFF">
${headerBand}
<tr><td style="padding:24px 26px 10px;font-family:${bf}">
${opts.kicker ? `<div class="uv-kicker" style="font-size:11px;font-weight:600;letter-spacing:.1em;color:${ac};margin-bottom:8px">${escH(opts.kicker)}</div>` : ''}
${opts.title ? `<div style="font-family:${escH(opts.fontFamily)};font-size:22px;font-weight:600;line-height:1.25;margin-bottom:16px">${escH(opts.title)}</div>` : ''}
${paras}
${opts.inviteBlock ? inviteBlockHtml(opts.inviteBlock, ac, placed) : ''}
</td></tr>
${brandingFooter}
</table></td></tr></table></td></tr></table></body></html>`
}

// ── Editorial + Atelier (shared bits) ────────────────────────────────────────
// The website's two magazine formats, in email-safe form: table layout, inline styles,
// web fonts with safe fallbacks (Apple Mail shows the magazine serif; Gmail/Outlook fall
// back to Georgia), and prefers-color-scheme dark overrides.
const MAG_FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet">'
const BODONI = "'Bodoni Moda','Bodoni 72',Didot,'Playfair Display',Georgia,serif"
const PLAYFAIR = "'Playfair Display',Georgia,'Times New Roman',serif"
const MAG_SANS = 'Helvetica,Arial,sans-serif'
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
function issueDate(iso: string) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (isNaN(dt.getTime()) || m < 1 || m > 12) return null
  const dd = String(d).padStart(2, '0'), mm = String(m).padStart(2, '0')
  return { short: `${dd}.${mm}`, full: `${d} ${MONTHS[m - 1]} ${y}`, monthYear: `${MONTHS[m - 1]} ${y}`, weekday: WEEKDAYS[dt.getUTCDay()], dotted: `${dd}.${mm}.${y}` }
}
// Big first letter on the first REAL paragraph (Editorial) — skipping a short greeting
// ("Dear Sarah & James,"), which a three-line drop cap would hang out of. Only when the
// paragraph starts with a plain letter — never inside markup.
function dropCap(html: string, color: string): string {
  const open = '<p style="margin:0 0 14px;font-size:15px;line-height:1.6">'
  let at = html.indexOf(open)
  while (at !== -1) {
    const end = html.indexOf('</p>', at)
    const inner = html.slice(at + open.length, end)
    if (/^[A-Za-z]/.test(inner) && inner.replace(/<[^>]+>/g, '').length >= 90) {
      return html.slice(0, at) + `<p style="margin:0 0 14px;font-size:16px;line-height:1.65"><span style="float:left;font-family:${BODONI};font-size:56px;line-height:.82;padding:4px 8px 0 0;color:${color}">${inner[0]}</span>` + inner.slice(1) + html.slice(end)
    }
    at = html.indexOf(open, end)
  }
  return html
}
function magFooter(opts: TemplateOpts, ac: string, line: string): string {
  const logo = opts.showLogo
    ? `<tr><td align="center" style="padding:0 26px 10px"><a href="https://unionvault.app" style="text-decoration:none"><picture><source srcset="${LOGO_BASE}/email-logo-white.png" media="(prefers-color-scheme: dark)"><img src="${LOGO_BASE}/email-logo-black.png" width="56" alt="Union Vault" style="display:block;width:56px;height:auto;border:0;margin:0 auto"></picture></a></td></tr>` : ''
  const brand = (opts.showBranding || opts.showLogo)
    ? `${logo}<tr><td align="center" class="uv-muted" style="padding:0 26px 22px;font-family:${MAG_SANS};font-size:11px;color:#7A6F64">Wedding planned with <a href="https://unionvault.app" style="color:${ac};text-decoration:none">Union Vault</a></td></tr>` : ''
  return `${line ? `<tr><td class="uv-muted" align="center" style="padding:18px 26px 12px;font-family:${MAG_SANS};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#7A6F64">${line}</td></tr>` : '<tr><td style="padding:10px 0 0"></td></tr>'}${brand}`
}
const MAG_HEAD = (darkCss: string) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">${MAG_FONTS}
<style>@media (max-width:480px){.uv-pad{padding-left:18px!important;padding-right:18px!important}.uv-mast{font-size:40px!important}.uv-h{font-size:30px!important}.uv-stack{display:block!important;width:100%!important;padding:0!important}.uv-stack-img{margin-top:20px!important}.uv-sp-copy{padding:16px 14px!important}.uv-btn{padding:13px 18px!important;letter-spacing:.16em!important}}
@media (prefers-color-scheme: dark){${darkCss}}</style></head>`

// Date / time / venue rows for the details panel beside the invitation.
function detailsRows(issue: TemplateOpts['issue'], font: string, rule: string): string {
  const d = issueDate(issue?.date || '')
  const rows: [string, string][] = []
  if (d) rows.push(['Date', d.full])
  if (issue?.time) rows.push(['Time', issue.time])
  if (issue?.venue) rows.push(['Venue', issue.venue])
  return rows.map(([k, v]) => `<tr><td class="uv-rule" style="padding:9px 0;border-bottom:1px solid ${rule}">
<div class="uv-muted" style="font-family:${MAG_SANS};font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#7A6F64">${k}</div>
<div class="uv-ink" style="font-family:${font};font-size:15px;line-height:1.35;color:#1D1916;margin-top:2px">${escH(v)}</div></td></tr>`).join('')
}
function inviteImg(block: NonNullable<TemplateOpts['inviteBlock']>): string {
  const img = `<img src="${escH(block.imageSrc || '')}" width="290" alt="Invitation" style="display:block;width:100%;height:auto;border:0">`
  return block.imageHref ? `<a href="${escH(block.imageHref)}" style="text-decoration:none">${img}</a>` : img
}

// ── Editorial template ───────────────────────────────────────────────────────
// Magazine cover: issue line, masthead names, cover photo, cover lines, Nº eyebrow,
// Didone heading, drop cap; invitation + details side by side; square ink buttons.
function editorialTemplate(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const placed = placesInvitation(opts.text)
  const bf = escH(opts.bodyFont || MAG_SANS)
  const iss = opts.issue
  const d = issueDate(iss?.date || '')
  const names = iss?.names || ''
  const ib = opts.inviteBlock
  const spread = !!(ib && ib.imageSrc && !placed)
  const paras = dropCap(buildParas(opts.text, ac, opts.ctaLinks, ib ? invitationHtml(ib, ac, false) : '', 'editorial'), ac)
  const dark = '.uv-bg{background:#121110!important}.uv-card{background:#1A1816!important;color:#E9E2D6!important}.uv-ink{color:#F2ECE2!important}.uv-muted{color:#A89F92!important}.uv-rule{border-color:#3A352F!important}.uv-btn{background:#F2ECE2!important;color:#1A1816!important}.uv-band{background:#221F1C!important}'
  const rule = `<tr><td class="uv-pad" style="padding:0 40px"><div class="uv-rule" style="border-top:1px solid #DDD3C6;font-size:0;line-height:0">&nbsp;</div></td></tr>`
  const mast = names
    ? escH(names).replace(/ &amp; /, ' <i style="font-size:.5em;text-transform:none;letter-spacing:0">&amp;</i> ')
    : escH(opts.kicker || '')
  return MAG_HEAD(dark) + `
<body class="uv-bg" style="margin:0;padding:24px 10px;background:#EDE7DE;font-family:${bf};color:#3B342E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="max-width:600px;background:#FBF8F3">
<tr><td class="uv-pad" style="padding:16px 40px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td class="uv-ink" style="font-family:${MAG_SANS};font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:#1D1916">The Wedding Issue</td>
<td class="uv-ink" align="right" style="font-family:${MAG_SANS};font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:#1D1916">${d ? `Nº 01 · ${escH(d.monthYear)}` : 'Nº 01'}</td>
</tr></table></td></tr>
${rule}
${mast ? `<tr><td class="uv-pad uv-ink uv-mast" align="center" style="padding:22px 24px 18px;font-family:${BODONI};font-size:60px;line-height:.92;letter-spacing:-.02em;text-transform:uppercase;color:#1D1916">${mast}</td></tr>` : ''}
${opts.headerImage ? `<tr><td style="padding:0"><img src="${opts.headerImage}" width="600" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>` : ''}
${(d || iss?.venue) ? `<tr><td class="uv-pad" style="padding:20px 40px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="bottom" class="uv-ink" style="font-family:${MAG_SANS};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#1D1916">${escH(iss?.venue || '')}</td>
${d ? `<td valign="bottom" align="right" style="white-space:nowrap;padding-left:16px"><div class="uv-muted" style="font-family:${MAG_SANS};font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:#7A6F64">${d.weekday}</div><div class="uv-ink" style="font-family:${BODONI};font-size:38px;line-height:1;color:#1D1916">${d.short}</div></td>` : ''}
</tr></table></td></tr>` : ''}
<tr><td class="uv-pad" style="padding:22px 40px 6px;font-family:${bf}">
<div style="font-family:${MAG_SANS};font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:${ac};margin-bottom:10px">Nº 02${opts.title ? ` — ${escH(opts.title)}` : ''}</div>
${opts.title ? `<div class="uv-ink uv-h" style="font-family:${BODONI};font-size:40px;line-height:1.04;color:#1D1916;margin-bottom:16px">${escH(opts.title)}</div>` : ''}
${paras}
</td></tr>
${spread ? `<tr><td style="padding:10px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="50%" valign="top" style="width:50%;padding:0">${inviteImg(ib!)}</td>
<td width="50%" valign="middle" class="uv-band uv-sp-copy" style="width:50%;padding:24px 26px;background:#F2ECE3">
<div style="font-family:${MAG_SANS};font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:${ac};margin-bottom:6px">The details</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailsRows(iss, BODONI, '#DDD3C6')}</table>
</td></tr></table></td></tr>` : ''}
${ib ? `<tr><td class="uv-pad" style="padding:22px 40px 4px;font-family:${bf}">${inviteBlockHtml(ib, ac, placed || spread, 'editorial')}</td></tr>` : ''}
${rule}
${magFooter(opts, ac, [names ? escH(names) : '', d ? d.dotted : ''].filter(Boolean).join(' · '))}
</table></td></tr></table></body></html>`
}

// ── Atelier template ─────────────────────────────────────────────────────────
// Big stacked names beside the cover photo, tinted panels with soft section numbers,
// invitation beside a details panel, outlined accent buttons.
function atelierTemplate(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const placed = placesInvitation(opts.text)
  const bf = escH(opts.bodyFont || MAG_SANS)
  const iss = opts.issue
  const d = issueDate(iss?.date || '')
  const ib = opts.inviteBlock
  const spread = !!(ib && ib.imageSrc && !placed)
  const paras = buildParas(opts.text, ac, opts.ctaLinks, ib ? invitationHtml(ib, ac, false) : '', 'atelier')
  const dark = '.uv-bg{background:#131211!important}.uv-card{background:#1B1918!important;color:#E9E2D6!important}.uv-ink{color:#F2ECE2!important}.uv-muted{color:#A89F92!important}.uv-panel{background:#25221F!important}.uv-rule{border-color:#4A443D!important}.uv-num{color:#C9A22766!important}'
  const parts = (iss?.names || '').split(' & ')
  const namesHtml = parts.length === 2
    ? `${escH(parts[0])}<br><i style="font-size:.45em;color:${ac};letter-spacing:0">&amp;</i><br>${escH(parts[1])}`
    : escH(iss?.names || opts.kicker || '')
  const meta = (k: string, v: string) => `<td valign="top" class="uv-rule" style="border-top:1px solid #1D1916;padding-top:8px;width:50%">
<div class="uv-muted" style="font-family:${MAG_SANS};font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:#7A6F64">${k}</div>
<div class="uv-ink" style="font-family:${PLAYFAIR};font-size:16px;color:#1D1916;margin-top:3px">${escH(v)}</div></td>`
  const metaRow = [d ? meta('Date', d.full) : '', iss?.venue ? meta('Place', iss.venue) : ''].filter(Boolean).join('<td style="width:14px"></td>')
  const hasImg = !!opts.headerImage
  const head = `<td ${hasImg ? 'class="uv-stack" width="52%" ' : ''}valign="middle" style="${hasImg ? 'width:52%;padding-right:18px' : ''}">
<div style="font-family:${MAG_SANS};font-size:9px;letter-spacing:.26em;text-transform:uppercase;color:${ac};margin-bottom:12px">The wedding of</div>
<div class="uv-ink uv-mast" style="font-family:${PLAYFAIR};font-size:58px;line-height:.92;letter-spacing:-.02em;color:#1D1916">${namesHtml}</div>
${metaRow ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px"><tr>${metaRow}</tr></table>` : ''}
</td>${hasImg ? `<td class="uv-stack" width="48%" valign="middle" style="width:48%"><img src="${opts.headerImage}" width="260" alt="" class="uv-stack-img" style="display:block;width:100%;height:auto;border:0"></td>` : ''}`
  return MAG_HEAD(dark) + `
<body class="uv-bg" style="margin:0;padding:24px 10px;background:#EAE3D9;font-family:${bf};color:#3B342E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="max-width:600px;background:#F6F1EA">
<tr><td class="uv-pad" style="padding:36px 36px 30px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${head}</tr></table></td></tr>
<tr><td class="uv-pad" style="padding:0 36px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-panel" style="background:#E8DFD2"><tr><td style="padding:26px 26px 14px;font-family:${bf}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td valign="top">
${opts.title ? `<div class="uv-ink uv-h" style="font-family:${PLAYFAIR};font-size:34px;line-height:1.08;color:#1D1916;margin-bottom:14px">${escH(opts.title)}</div>` : ''}
</td><td valign="top" align="right" class="uv-num" style="font-family:${PLAYFAIR};font-size:58px;line-height:.9;color:${ac}55;padding-left:10px">01</td></tr></table>
${paras}
</td></tr></table></td></tr>
${spread ? `<tr><td class="uv-pad" style="padding:20px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="44%" valign="top" style="width:44%">${inviteImg(ib!)}</td>
<td width="56%" valign="middle" class="uv-panel uv-sp-copy" style="width:56%;background:#E8DFD2;padding:20px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-family:${MAG_SANS};font-size:9px;letter-spacing:.26em;text-transform:uppercase;color:${ac}">The details</td><td align="right" class="uv-num" style="font-family:${PLAYFAIR};font-size:40px;line-height:.9;color:${ac}55">02</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailsRows(iss, PLAYFAIR, '#D6CBBB')}</table>
</td></tr></table></td></tr>` : ''}
${ib ? `<tr><td class="uv-pad" style="padding:22px 36px 4px;font-family:${bf}">${inviteBlockHtml(ib, ac, placed || spread, 'atelier')}</td></tr>` : ''}
${magFooter(opts, ac, [iss?.names ? escH(iss.names) : '', d ? d.dotted : ''].filter(Boolean).join(' · '))}
</table></td></tr></table></body></html>`
}

// ── Sent-emails log ──────────────────────────────────────────────────────────
// One row per recipient in email_log (Communications → Sent). Best effort: a failed
// write is logged and never fails the send itself.
async function logSent(sbUrl: string, sbService: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!sbUrl || !sbService || !rows.length) return
  try {
    const r = await fetch(`${sbUrl}/rest/v1/email_log`, {
      method: 'POST',
      headers: { apikey: sbService, Authorization: `Bearer ${sbService}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(rows),
    })
    if (!r.ok) console.error('email_log insert failed', r.status, await r.text())
  } catch (e) { console.error('email_log insert failed', e) }
}
