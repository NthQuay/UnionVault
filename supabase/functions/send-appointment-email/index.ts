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

  let body: { to: string[]; subject: string; body: string; ics?: string; fromName?: string; replyTo?: string; kicker?: string; title?: string; htmlText?: string }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { to, subject, body: text, ics, fromName, replyTo, kicker, title, htmlText } = body
  if (!to?.length || to.length > 10 || !subject) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing to or subject' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // "Liam & Amanda <appointments@unionvault.app>", replies to the couple.
  const name = String(fromName ?? '').replace(/[<>"\r\n]/g, '').trim().slice(0, 80) || 'UnionVault'
  const payload: Record<string, unknown> = { from: `${name} <${FROM_ADDR}>`, to, subject, text }
  const rt = EMAIL_RE.test(String(replyTo ?? '')) ? String(replyTo) : user.email
  if (rt) payload.reply_to = rt
  payload.html = brandedHtml({ kicker: String(kicker ?? '').slice(0, 120), title: String(title ?? '').slice(0, 200), text: String(htmlText || text || '').slice(0, 10000) })
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
function linkify(escaped: string): string {
  return escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)'"]/g, (u) => `<a href="${u}" style="color:#8a6a2c">${u}</a>`)
}
function brandedHtml(opts: { kicker?: string; title?: string; text: string }): string {
  const paras = String(opts.text ?? '').trim().split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${linkify(escH(p)).replace(/\n/g, '<br>')}</p>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>@media (prefers-color-scheme: dark){.uv-bg{background:#111114!important}.uv-card{background:#1A1A1F!important;color:#EDE6DA!important}.uv-band{background:#111114!important}.uv-muted{color:#A79E92!important}.uv-kicker{color:#E3C878!important}}</style></head>
<body class="uv-bg" style="margin:0;padding:24px 12px;background:#EFEAE1;font-family:Helvetica,Arial,sans-serif;color:#2C2222">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="max-width:560px;background:#FBF8F3;border-radius:12px;overflow:hidden">
<tr><td class="uv-band" align="center" style="background:#F4EEE4;padding:22px 0 16px">
<picture><source srcset="${LOGO_BASE}/email-logo-white.png" media="(prefers-color-scheme: dark)"><img src="${LOGO_BASE}/email-logo-black.png" width="120" alt="UnionVault" style="display:block;width:120px;height:auto;border:0"></picture>
</td></tr>
<tr><td style="padding:24px 26px 10px">
${opts.kicker ? `<div class="uv-kicker" style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a6a2c;margin-bottom:8px">${escH(opts.kicker)}</div>` : ''}
${opts.title ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;margin-bottom:16px">${escH(opts.title)}</div>` : ''}
${paras}
</td></tr>
<tr><td class="uv-muted" style="padding:0 26px 22px;font-size:11.5px;color:#6E6259">Sent with <a href="https://unionvault.app" style="color:#8a6a2c">UnionVault</a></td></tr>
</table></td></tr></table></body></html>`
}
