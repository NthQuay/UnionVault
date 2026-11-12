// Emails the portal admin when a new couple account is created. Called by the database trigger
// (pg_net) with only an event id; everything else is read from account_events, so the request
// carries no trust. Each event is claimed once (emailed_at), so retries or replays cannot re-send.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ADMIN_EMAIL = 'admin@unionvault.app'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const ok = () => new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })

serve(async (req) => {
  const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const RESEND = Deno.env.get('RESEND_API_KEY') ?? ''
  let id = ''
  try { id = String((await req.json())?.id ?? '') } catch { /* ignore */ }
  if (!UUID_RE.test(id) || !KEY || !RESEND) return ok()

  const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
  // claim: only the first caller gets the row back
  const c = await fetch(`${SB_URL}/rest/v1/account_events?id=eq.${id}&kind=eq.signup&emailed_at=is.null`, {
    method: 'PATCH', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify({ emailed_at: new Date().toISOString() }),
  })
  const rows = c.ok ? await c.json() : []
  const ev = rows?.[0]
  if (!ev) return ok()

  const email = String(ev.email ?? 'unknown')
  // A vendor approved through the portal also creates an auth user; that is not a couple signing up.
  const vr = await fetch(`${SB_URL}/rest/v1/vendor_requests?email=eq.${encodeURIComponent(email)}&select=id&limit=1`, { headers: h })
  if (vr.ok && (await vr.json())?.length) return ok()
  const when = new Date(ev.occurred_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' })
  const via = String(ev.detail?.provider ?? 'email')
  const text = `A new couple just created a UnionVault account.\n\nEmail: ${email}\nSigned up: ${when} (Sydney)\nSign-in method: ${via}\n\nTheir full activity log is in the vendor portal (Users tab): https://vendors.unionvault.app`
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2a2620">
<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a6a2c;margin-bottom:6px">New account</div>
<div style="font-size:20px;margin-bottom:14px">A new couple just signed up</div>
<table style="font-size:14px;line-height:1.7"><tr><td style="color:#8a8174;padding-right:14px">Email</td><td><strong>${esc(email)}</strong></td></tr>
<tr><td style="color:#8a8174;padding-right:14px">Signed up</td><td>${esc(when)} (Sydney)</td></tr>
<tr><td style="color:#8a8174;padding-right:14px">Method</td><td>${esc(via)}</td></tr></table>
<p style="margin-top:18px"><a href="https://vendors.unionvault.app" style="color:#8a6a2c">Open their activity log in the vendor portal</a> (Users tab).</p></div>`
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Union Vault Alerts <alerts@unionvault.app>', to: [ADMIN_EMAIL], subject: `New Union Vault account — ${email}`, text, html }),
  })
  if (!r.ok) {
    console.error('alert email failed', r.status, await r.text())
    // release the claim so a later retry can send
    await fetch(`${SB_URL}/rest/v1/account_events?id=eq.${id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ emailed_at: null }) })
  }
  return ok()
})
