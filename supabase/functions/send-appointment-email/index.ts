import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
  const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'UnionVault <appointments@unionvault.app>'

  if (!RESEND_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Email service not configured' }), {
      status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  let body: { to: string[]; subject: string; body: string; ics?: string }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { to, subject, body: text, ics } = body
  if (!to?.length || !subject) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing to or subject' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const payload: Record<string, unknown> = { from: FROM_EMAIL, to, subject, text }
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
