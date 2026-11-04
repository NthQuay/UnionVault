// Receives bounce/complaint events from Resend (configured as a webhook endpoint in the
// Resend dashboard) and records them so the app stops re-sending to a guest address that's
// already known to be bad — repeatedly sending to a bounced/complained address is one of
// the biggest drivers of a sending domain's reputation (and therefore spam placement)
// going bad, so this closes the loop that List-Unsubscribe and tags open.
//
// Resend delivers webhooks signed the same way Svix does: `svix-id`, `svix-timestamp` and
// `svix-signature` headers, verified with HMAC-SHA256 over `${id}.${timestamp}.${rawBody}`
// using the webhook's own signing secret (RESEND_WEBHOOK_SECRET, format `whsec_<base64>`,
// copied from the webhook's settings in the Resend dashboard — see docs/sessions for the
// exact steps). No Svix/npm package needed; verified by hand with Web Crypto below.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })

// Svix tolerates clock drift but rejects anything stale — 5 minutes either side, same
// window Svix's own libraries use, guards against a captured payload being replayed later.
const TOLERANCE_SECONDS = 300

async function verifySignature(secret: string, svixId: string, svixTimestamp: string, body: string, svixSignature: string): Promise<boolean> {
  const ts = Number(svixTimestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false

  const keyB64 = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  const keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signedContent = `${svixId}.${svixTimestamp}.${body}`
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))

  // svix-signature is a space-separated list of "v1,<base64sig>" — any match is valid
  // (lets a secret rotation have both the old and new secret briefly accept both).
  return svixSignature.split(' ').some((entry) => {
    const sig = entry.startsWith('v1,') ? entry.slice(3) : entry
    return sig.length === expected.length && sig === expected
  })
}

serve(async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' })

  const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? ''
  if (!WEBHOOK_SECRET || !SB_SERVICE) {
    // Not set up yet — ack with 200 so Resend doesn't treat it as a hard failure and
    // disable the endpoint, but do nothing (nothing can be verified without the secret).
    console.warn('resend-webhook: RESEND_WEBHOOK_SECRET or service role not configured')
    return json(200, { ok: true, skipped: true })
  }

  const svixId = req.headers.get('svix-id') ?? ''
  const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
  const svixSignature = req.headers.get('svix-signature') ?? ''
  const rawBody = await req.text()
  if (!svixId || !svixTimestamp || !svixSignature) return json(400, { ok: false, error: 'Missing signature headers' })

  const valid = await verifySignature(WEBHOOK_SECRET, svixId, svixTimestamp, rawBody, svixSignature)
  if (!valid) return json(401, { ok: false, error: 'Invalid signature' })

  let payload: { type?: string; data?: Record<string, unknown> }
  try { payload = JSON.parse(rawBody) } catch { return json(400, { ok: false, error: 'Invalid JSON' }) }

  const kind = payload.type === 'email.bounced' ? 'bounced' : payload.type === 'email.complained' ? 'complained' : null
  if (!kind) return json(200, { ok: true, ignored: payload.type }) // event type we don't act on — ack so Resend stops retrying

  const data = payload.data ?? {}
  const tags = Array.isArray(data.tags) ? (data.tags as Array<{ name?: string; value?: string }>) : []
  const coupleId = tags.find((t) => t?.name === 'couple_id')?.value || ''
  const guestId = tags.find((t) => t?.name === 'guest_id')?.value || ''
  if (!coupleId || !guestId) return json(200, { ok: true, skipped: 'no guest tag on this send' })

  const toList = Array.isArray(data.to) ? (data.to as string[]) : typeof data.to === 'string' ? [data.to] : []
  const email = toList[0] || null
  // Resend's bounce/complaint detail shape isn't guaranteed stable across event versions —
  // capture whatever's there as a readable string rather than depending on exact fields.
  const detail = (data.bounce ?? data.complaint ?? null) as Record<string, unknown> | null
  const reason = detail ? JSON.stringify(detail).slice(0, 500) : null

  const r = await fetch(`${SB_URL}/rest/v1/email_issues`, {
    method: 'POST',
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ couple_id: coupleId, guest_id: guestId, email, kind, reason }),
  })
  if (!r.ok) {
    console.error('resend-webhook: failed to record email issue', r.status, await r.text())
    return json(500, { ok: false, error: 'Failed to record' })
  }

  return json(200, { ok: true })
})
