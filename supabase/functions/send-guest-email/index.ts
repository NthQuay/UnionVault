// Sends a save-the-date / invitation email to guests via Resend, optionally with the
// couple's uploaded invitation attached. Only signed-in UnionVault users may call it,
// and an attachment may only come from that user's own folder in the public `photos`
// bucket — so the function can't be used as an open mail relay.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  type EmailShell, type InviteBlock, type Issue, escH, buildParas, invitationHtml, inviteBlockHtml, placesInvitation,
  classicHtml, modernHtml, editorialHtml, atelierHtml, inviteSpreadRow, parseIssue, templateIdOf,
} from '../_shared/email-templates.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/
const MAX_TO = 10
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
  const tplId = templateIdOf(b.templateId)
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
  // Names / date / venue for the Editorial and Atelier layouts (masthead, cover lines, details).
  const issue = parseIssue(b.issue)
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

// ── Email HTML ───────────────────────────────────────────────────────────────
// The designs live in ../_shared/email-templates.ts (shared with send-vendor-brief-email).
// This sender only supplies its own content: the couple's text plus the invitation block.
interface TemplateOpts extends EmailShell {
  text: string; templateId: string
  ctaLinks?: { rsvp?: string; website?: string }
  inviteBlock?: InviteBlock
  issue?: Issue
}

function brandedHtml(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const placed = placesInvitation(opts.text)
  const ib = opts.inviteBlock
  if (opts.templateId === 'editorial' || opts.templateId === 'atelier') {
    const fmt = opts.templateId as 'editorial' | 'atelier'
    // The invitation goes beside the details when the couple didn't place it in the text.
    const spread = !!(ib && ib.imageSrc && !placed)
    return (fmt === 'editorial' ? editorialHtml : atelierHtml)(opts, {
      article: buildParas(opts.text, ac, opts.ctaLinks, ib ? invitationHtml(ib, ac, false) : '', fmt),
      spread: spread ? inviteSpreadRow(fmt, ib!, opts.issue, ac) : '',
      tail: ib ? inviteBlockHtml(ib, ac, placed || spread, fmt) : '',
    })
  }
  const content = [
    buildParas(opts.text, ac, opts.ctaLinks, ib ? invitationHtml(ib, ac, false) : ''),
    ib ? inviteBlockHtml(ib, ac, placed) : '',
  ]
  return opts.templateId === 'modern' ? modernHtml(opts, content) : classicHtml(opts, content)
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
