// Pure helpers for vendor-click (kept separate so they can be unit-tested without Deno/Supabase).
export const SLUG = /^[a-z0-9_-]{1,40}$/
export const REDIRECT_LINKS = ['website', 'book', 'instagram', 'contact']   // forwarded to a stored destination
export const PING_LINKS = ['call', 'email']                                    // phone / mailto taps: logged only

/** Destination with Union Vault's tracking parameters added (existing parameters are kept). */
export function buildDestination(url: string, clickId: string, append: boolean): string {
  const u = new URL(url)
  if (u.protocol !== 'https:') throw new Error('destination must be https')
  if (append) {
    u.searchParams.set('utm_source', 'unionvault')
    u.searchParams.set('utm_medium', 'referral')
    u.searchParams.set('utm_campaign', 'recommended_vendors')
    u.searchParams.set('uvc', clickId.replace(/-/g, '').slice(0, 12))   // short click id the vendor can quote back
  }
  return u.toString()
}

export function isBot(ua: string): boolean {
  return /bot|crawl|spider|preview|slurp|facebookexternalhit|whatsapp|headless/i.test(ua || '')
}

export function refererHost(ref: string | null): string | null {
  try { return ref ? new URL(ref).host.slice(0, 120) : null } catch { return null }
}

// ── click tokens ────────────────────────────────────────────────────────────────────────
// A signed-in couple asks the function for a short-lived token (proving who they are with their login), and the app
// adds it to tracked links as ?ct=…. Links can't carry an Authorization header, and a login token must never sit in a
// URL, so this token is a separate, narrow thing: "<user id>.<expiry>.<signature>". It only lets the function note
// which account clicked; it cannot be used for anything else. The key is the function's own server-side secret.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
async function hmacHex(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)))
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('')
}
export const TOKEN_TTL_SECONDS = 6 * 3600
export async function makeClickToken(userId: string, key: string, nowSec: number): Promise<{ t: string; exp: number }> {
  if (!UUID.test(userId) || !key) throw new Error('bad input')
  const exp = nowSec + TOKEN_TTL_SECONDS
  const body = `${userId}.${exp}`
  return { t: `${body}.${(await hmacHex(key, 'uvc1:' + body)).slice(0, 32)}`, exp }
}
/** The user id if the token is genuine and unexpired, otherwise null. */
export async function readClickToken(token: string | null, key: string, nowSec: number): Promise<string | null> {
  if (!token || !key || token.length > 120) return null
  const [uid, exp, sig] = token.split('.')
  if (!uid || !exp || !sig || !UUID.test(uid) || !/^\d{1,12}$/.test(exp) || Number(exp) < nowSec) return null
  const want = (await hmacHex(key, `uvc1:${uid}.${exp}`)).slice(0, 32)
  let diff = want.length ^ sig.length
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ (sig.charCodeAt(i) || 0)
  return diff === 0 ? uid : null
}
