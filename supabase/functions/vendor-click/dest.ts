// Pure helpers for vendor-click (kept separate so they can be unit-tested without Deno/Supabase).
export const SLUG = /^[a-z0-9_-]{1,40}$/

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
