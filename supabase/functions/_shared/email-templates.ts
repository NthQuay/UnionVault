// Shared email templates for send-guest-email and send-vendor-brief-email.
// ONE copy of every design (Classic, Modern, Editorial, Atelier) so a change to a template
// changes it for invites/save-the-dates/reminders AND vendor briefs. Each sender only
// supplies its own content: guest emails the invitation / RSVP blocks, vendor briefs the
// "View your brief" button and expiry note.

export interface Issue { names: string; date: string; time: string; venue: string }
export interface InviteBlock { imageSrc?: string; imageHref?: string; imageCaption?: string; fallbackLinkLabel?: string; fallbackLinkUrl?: string; rsvpUrl?: string; rsvpByText?: string; rsvpButtonLabel?: string; rsvpLeadText?: string; websiteUrl?: string; websiteLabel?: string; closingText?: string }
// Everything a template needs that isn't content.
export interface EmailShell {
  kicker?: string; title?: string; showBranding?: boolean
  accentColor: string; fontFamily: string; showLogo: boolean; headerImage: string
  bodyFont?: string; issue?: Issue
}
// Editorial / Atelier content slots:
//   article — the main text (paragraphs, plus anything that belongs with them, e.g. a button)
//   spread  — full-width rows after the article (invitation + details, or a details panel)
//   tail    — closing content after the spread (RSVP/website buttons, sign-off)
export interface MagSlots { article: string; spread?: string; tail?: string }

export const LOGO_BASE = 'https://unionvault.app/assets'
export const escH = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function linkifyWith(escaped: string, color: string): string {
  return escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)'"]/g, (u) => `<a href="${u}" style="color:${escH(color)}">${u}</a>`)
}

// The Communications page's lightweight formatting markup — **bold** *italic* __underline__
// — applied after escaping/linkifying, so a guest's typed text can never inject real HTML,
// only these specific patterns become tags. Double-star is matched before single-star so
// **bold** doesn't get half-eaten by the italic pass.
export function applyInlineMarkup(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

export function buildParas(text: string, color: string, links?: { rsvp?: string; website?: string }, invHtml?: string, variant = 'pill'): string {
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
export function ctaButtonHtml(url: string, label: string, color: string, variant = 'pill'): string {
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
export function invitationHtml(block: InviteBlock, color: string, withCaption: boolean): string {
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
export const placesInvitation = (text: string) => /(^|\n)\s*\{invitation_image\}\s*(\n|$)/.test(text || '')

export function inviteBlockHtml(block: InviteBlock, color: string, placed = false, variant = 'pill'): string {
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

// ── Classic template ─────────────────────────────────────────────────────────
// Cream card on beige background, logo header band, serif title, gold accents.
export function classicHtml(opts: EmailShell, content: string[]): string {
  const ac = escH(opts.accentColor)
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
${content.join('\n')}
</td></tr>
${brandingFooter}
</table></td></tr></table></body></html>`
}

// ── Modern template ──────────────────────────────────────────────────────────
// Clean white card, left accent border, sans-serif, minimal.
export function modernHtml(opts: EmailShell, content: string[]): string {
  const ac = escH(opts.accentColor)
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
${content.join('\n')}
</td></tr>
${brandingFooter}
</table></td></tr></table></td></tr></table></body></html>`
}

// ── Editorial + Atelier (shared bits) ────────────────────────────────────────
// The website's two magazine formats, in email-safe form: table layout, inline styles,
// web fonts with safe fallbacks (Apple Mail shows the magazine serif; Gmail/Outlook fall
// back to Georgia), and prefers-color-scheme dark overrides.
const MAG_FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet">'
export const BODONI = "'Bodoni Moda','Bodoni 72',Didot,'Playfair Display',Georgia,serif"
export const PLAYFAIR = "'Playfair Display',Georgia,'Times New Roman',serif"
export const MAG_SANS = 'Helvetica,Arial,sans-serif'
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export function issueDate(iso: string) {
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
export function dropCap(html: string, color: string): string {
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
function magFooter(opts: EmailShell, ac: string, line: string): string {
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
export function detailsRows(issue: Issue | undefined, font: string, rule: string): string {
  const d = issueDate(issue?.date || '')
  const rows: [string, string][] = []
  if (d) rows.push(['Date', d.full])
  if (issue?.time) rows.push(['Time', issue.time])
  if (issue?.venue) rows.push(['Venue', issue.venue])
  return rows.map(([k, v]) => `<tr><td class="uv-rule" style="padding:9px 0;border-bottom:1px solid ${rule}">
<div class="uv-muted" style="font-family:${MAG_SANS};font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#7A6F64">${k}</div>
<div class="uv-ink" style="font-family:${font};font-size:15px;line-height:1.35;color:#1D1916;margin-top:2px">${escH(v)}</div></td></tr>`).join('')
}
export function inviteImg(block: InviteBlock): string {
  const img = `<img src="${escH(block.imageSrc || '')}" width="290" alt="Invitation" style="display:block;width:100%;height:auto;border:0">`
  return block.imageHref ? `<a href="${escH(block.imageHref)}" style="text-decoration:none">${img}</a>` : img
}

// ── Editorial template ───────────────────────────────────────────────────────
// Magazine cover: issue line, masthead names, cover photo, cover lines, Nº eyebrow,
// Didone heading, drop cap; spread / details; square ink buttons.
export function editorialHtml(opts: EmailShell, slots: MagSlots): string {
  const ac = escH(opts.accentColor)
  const bf = escH(opts.bodyFont || MAG_SANS)
  const iss = opts.issue
  const d = issueDate(iss?.date || '')
  const names = iss?.names || ''
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
<td class="uv-ink" align="right" style="font-family:${MAG_SANS};font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:#1D1916">${d ? escH(d.monthYear) : 'Special Edition'}</td>
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
${dropCap(slots.article, ac)}
</td></tr>
${slots.spread || ''}
${slots.tail ? `<tr><td class="uv-pad" style="padding:22px 40px 4px;font-family:${bf}">${slots.tail}</td></tr>` : ''}
${rule}
${magFooter(opts, ac, [names ? escH(names) : '', d ? d.dotted : ''].filter(Boolean).join(' · '))}
</table></td></tr></table></body></html>`
}

// ── Atelier template ─────────────────────────────────────────────────────────
// Big stacked names beside the cover photo, tinted panels with soft section numbers,
// outlined accent buttons.
export function atelierHtml(opts: EmailShell, slots: MagSlots): string {
  const ac = escH(opts.accentColor)
  const bf = escH(opts.bodyFont || MAG_SANS)
  const iss = opts.issue
  const d = issueDate(iss?.date || '')
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
${slots.article}
</td></tr></table></td></tr>
${slots.spread || ''}
${slots.tail ? `<tr><td class="uv-pad" style="padding:22px 36px 4px;font-family:${bf}">${slots.tail}</td></tr>` : ''}
${magFooter(opts, ac, [iss?.names ? escH(iss.names) : '', d ? d.dotted : ''].filter(Boolean).join(' · '))}
</table></td></tr></table></body></html>`
}

// ── Spread rows for Editorial / Atelier ──────────────────────────────────────
// Invitation image beside a details panel (guest emails).
export function inviteSpreadRow(fmt: 'editorial' | 'atelier', ib: InviteBlock, iss: Issue | undefined, accent: string): string {
  const ac = escH(accent)
  if (fmt === 'editorial') return `<tr><td style="padding:10px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="50%" valign="top" style="width:50%;padding:0">${inviteImg(ib)}</td>
<td width="50%" valign="middle" class="uv-band uv-sp-copy" style="width:50%;padding:24px 26px;background:#F2ECE3">
<div style="font-family:${MAG_SANS};font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:${ac};margin-bottom:6px">The details</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailsRows(iss, BODONI, '#DDD3C6')}</table>
</td></tr></table></td></tr>`
  return `<tr><td class="uv-pad" style="padding:20px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="44%" valign="top" style="width:44%">${inviteImg(ib)}</td>
<td width="56%" valign="middle" class="uv-panel uv-sp-copy" style="width:56%;background:#E8DFD2;padding:20px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-family:${MAG_SANS};font-size:9px;letter-spacing:.26em;text-transform:uppercase;color:${ac}">The details</td><td align="right" class="uv-num" style="font-family:${PLAYFAIR};font-size:40px;line-height:.9;color:${ac}55">02</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailsRows(iss, PLAYFAIR, '#D6CBBB')}</table>
</td></tr></table></td></tr>`
}
// A full-width details panel (vendor briefs) — empty when there are no details to show.
export function detailsPanelRow(fmt: 'editorial' | 'atelier', iss: Issue | undefined, accent: string): string {
  const ac = escH(accent)
  if (fmt === 'editorial') {
    const rows = detailsRows(iss, BODONI, '#DDD3C6')
    return rows ? `<tr><td class="uv-pad" style="padding:6px 40px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-band" style="background:#F2ECE3"><tr><td style="padding:20px 24px">
<div style="font-family:${MAG_SANS};font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:${ac};margin-bottom:4px">The details</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr></table></td></tr>` : ''
  }
  const rows = detailsRows(iss, PLAYFAIR, '#D6CBBB')
  return rows ? `<tr><td class="uv-pad" style="padding:20px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-panel" style="background:#E8DFD2"><tr><td style="padding:20px 24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-family:${MAG_SANS};font-size:9px;letter-spacing:.26em;text-transform:uppercase;color:${ac}">The details</td><td align="right" class="uv-num" style="font-family:${PLAYFAIR};font-size:40px;line-height:.9;color:${ac}55">02</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr></table></td></tr>` : ''
}

// ── Issue fields from a request body — plain strings, capped; escaped where drawn. ──
export function parseIssue(raw: unknown): Issue {
  const iss = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    names: String(iss.names ?? '').replace(/[\r\n]/g, ' ').slice(0, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(iss.date ?? '')) ? String(iss.date) : '',
    time: String(iss.time ?? '').slice(0, 30),
    venue: String(iss.venue ?? '').replace(/[\r\n]/g, ' ').slice(0, 120),
  }
}
// 'botanical' was retired in the app; anything unknown falls back to classic.
export const VALID_TEMPLATES = ['classic', 'modern', 'editorial', 'atelier'] as const
export function templateIdOf(v: unknown): string {
  return (VALID_TEMPLATES as readonly string[]).includes(String(v || '')) ? String(v) : 'classic'
}
