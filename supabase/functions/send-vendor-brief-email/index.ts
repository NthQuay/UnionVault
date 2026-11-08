// Sends a vendor brief link to a vendor via Resend. Only signed-in UnionVault users may
// call it — same pattern as send-guest-email/send-appointment-email, so it can't be used
// as an open mail relay. The brief itself (vendor_tokens row) is created separately by the
// client before calling this; this function only emails the link.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  type EmailShell, type Issue, escH, buildParas, ctaButtonHtml, MAG_SANS,
  classicHtml, modernHtml, editorialHtml, atelierHtml, detailsPanelRow, parseIssue, templateIdOf,
} from '../_shared/email-templates.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/
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
    templateId?: string; designOpts?: { accentColor?: string; fontFamily?: string; bodyFont?: string; showLogo?: boolean; headerImage?: string; bgColor?: string; boxColor?: string }; preview?: boolean
    issue?: { names?: string; date?: string; time?: string; venue?: string }
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

  const tplId = templateIdOf(b.templateId)
  const accentColor = HEX_RE.test(String(b.designOpts?.accentColor || '')) ? String(b.designOpts!.accentColor) : '#8a6a2c'
  const fontFamily = FONT_STACKS[String(b.designOpts?.fontFamily || '')] || FONT_STACKS['serif']
  const bodyFont = FONT_STACKS[String(b.designOpts?.bodyFont || '')] || FONT_STACKS['sans-serif']
  const showLogo = b.designOpts?.showLogo !== false
  const bgColor = HEX_RE.test(String(b.designOpts?.bgColor || '')) ? String(b.designOpts!.bgColor) : ''
  const boxColor = HEX_RE.test(String(b.designOpts?.boxColor || '')) ? String(b.designOpts!.boxColor) : ''
  const headerImageRaw = String(b.designOpts?.headerImage || '')
  const headerImageCustom = headerImageRaw.startsWith(`${SB_URL}/storage/v1/object/public/photos/`) && !headerImageRaw.includes('..') ? headerImageRaw : ''
  // No custom header → the UnionVault default banner; 'none' → the couple turned it off.
  const headerImage = headerImageRaw === 'none' ? '' : (headerImageCustom || 'https://unionvault.app/assets/email_header_default_blackgold.png')

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
  // Names / date / venue for the Editorial and Atelier layouts (masthead, details panel).
  const issue = parseIssue(b.issue)
  const html = brandedHtml({ issue,
    kicker: names ? `${names}'s wedding` : '', title: 'Your vendor brief', text: intro,
    cta: { url: briefUrl, label: buttonLabel }, ctaNote: expiryDisplay ? `Expires ${expiryDisplay}` : '',
    afterText: closing,
    showBranding, accentColor, fontFamily, bodyFont, showLogo: showLogo || showBranding, headerImage, bgColor, boxColor, templateId: tplId,
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
  const sent = await r.json().catch(() => ({})) as { id?: string }
  await logSent(SB_URL, SB_SERVICE, [{
    couple_id: user.id, kind: 'vendor', subject, to_email: toEmail, to_name: vendorName,
    from_name: name, resend_id: sent.id || null, html,
  }])
  return json(200, { ok: true })
})

// ── Email HTML ───────────────────────────────────────────────────────────────
// The designs live in ../_shared/email-templates.ts (shared with send-guest-email). This
// sender only supplies its own content: the intro, the "View your brief" button with its
// expiry note, and the sign-off.
interface TemplateOpts extends EmailShell {
  text: string; afterText?: string; templateId: string
  cta?: { url: string; label: string }; ctaNote?: string
  issue?: Issue
}

// Classic / Modern: the centred button, with the expiry note under it.
function briefCta(cta: { url: string; label: string }, note: string, color: string): string {
  const noteHtml = note ? `<div style="text-align:center;font-size:11.5px;color:#8a8077;margin:-8px 0 16px">${escH(note)}</div>` : ''
  return ctaButtonHtml(cta.url, cta.label, color) + noteHtml
}
// Editorial / Atelier: square ink (Editorial) or outlined accent (Atelier), left-aligned.
function magCta(cta: { url: string; label: string } | undefined, note: string, color: string, variant: string): string {
  if (!cta) return ''
  const btn = variant === 'editorial'
    ? `<a href="${escH(cta.url)}" class="uv-btn" style="display:inline-block;background:#1D1916;color:#FBF8F3;font-family:${MAG_SANS};font-size:11px;letter-spacing:.22em;text-transform:uppercase;padding:14px 30px;text-decoration:none">${escH(cta.label)}</a>`
    : `<a href="${escH(cta.url)}" class="uv-btn" style="display:inline-block;border:1px solid ${color};color:${color};font-family:${MAG_SANS};font-size:11px;letter-spacing:.22em;text-transform:uppercase;padding:13px 30px;text-decoration:none">${escH(cta.label)}</a>`
  return `<div style="margin:10px 0 ${note ? 6 : 18}px">${btn}</div>${note ? `<div class="uv-muted" style="font-family:${MAG_SANS};font-size:11px;color:#7A6F64;margin:0 0 18px">${escH(note)}</div>` : ''}`
}

function brandedHtml(opts: TemplateOpts): string {
  const ac = escH(opts.accentColor)
  const paras = buildParas(opts.text, ac)
  const after = opts.afterText ? buildParas(opts.afterText, ac) : ''
  if (opts.templateId === 'editorial' || opts.templateId === 'atelier') {
    const fmt = opts.templateId as 'editorial' | 'atelier'
    return (fmt === 'editorial' ? editorialHtml : atelierHtml)(opts, {
      article: paras + magCta(opts.cta, opts.ctaNote || '', ac, fmt),
      spread: detailsPanelRow(fmt, opts.issue, ac),
      tail: after,
    })
  }
  const content = [paras, opts.cta ? briefCta(opts.cta, opts.ctaNote || '', ac) : '', after]
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
