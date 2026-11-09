// Public click-through for recommended vendors.
//   GET  ?v=<vendor>&l=<website|book|instagram|contact>  → log, then 302 to the stored destination
//   POST ?v=<vendor>&l=<call|email>                      → log only (sent with navigator.sendBeacon when a phone/mailto link is tapped), 204
// Logs the click (vendor, link, time, referrer host, bot flag — no IP, no user id) and 302-redirects to the
// destination stored in public.vendor_links. Deploy with verify_jwt = false (it is opened from a plain link).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SLUG, REDIRECT_LINKS, PING_LINKS, buildDestination, isBot, refererHost } from './dest.ts'

const HOME = 'https://unionvault.app/'
const redirect = (to: string) => new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', 'Referrer-Policy': 'origin' } })

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const p = new URL(req.url).searchParams
  const vendor = (p.get('v') ?? '').toLowerCase()
  const link = (p.get('l') ?? '').toLowerCase()
  const isPing = req.method === 'POST'
  const noContent = () => new Response(null, { status: 204, headers: CORS })
  if (!SLUG.test(vendor) || !(isPing ? PING_LINKS : REDIRECT_LINKS).includes(link) || !SB_URL || !SB_SERVICE) return isPing ? noContent() : redirect(HOME)

  const h = { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` }
  try {
    if (isPing) {
      // Only count pings for vendors we actually list (stops anyone filling the log with made-up vendors).
      const vr = await fetch(`${SB_URL}/rest/v1/vendor_links?vendor_id=eq.${vendor}&active=eq.true&select=vendor_id&limit=1`, { headers: h })
      const known = vr.ok ? await vr.json() : []
      if (known?.length) {
        await fetch(`${SB_URL}/rest/v1/vendor_clicks`, {
          method: 'POST', headers: { ...h, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ vendor_id: vendor, link, referrer_host: refererHost(req.headers.get('origin') ?? req.headers.get('referer')), is_bot: isBot(req.headers.get('user-agent') ?? '') }),
        }).catch((e) => console.error('vendor_clicks ping insert failed', e))
      }
      return noContent()
    }
    const r = await fetch(`${SB_URL}/rest/v1/vendor_links?vendor_id=eq.${vendor}&link=eq.${link}&active=eq.true&select=url,append_params&limit=1`, { headers: h })
    const rows = r.ok ? await r.json() : []
    if (!rows?.length) return redirect(HOME)
    const clickId = crypto.randomUUID()
    const ua = req.headers.get('user-agent') ?? ''
    // Log best-effort: a failed write must never stop the visitor reaching the vendor.
    await fetch(`${SB_URL}/rest/v1/vendor_clicks`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ id: clickId, vendor_id: vendor, link, referrer_host: refererHost(req.headers.get('referer')), is_bot: isBot(ua) }),
    }).catch((e) => console.error('vendor_clicks insert failed', e))
    return redirect(buildDestination(rows[0].url, clickId, rows[0].append_params !== false))
  } catch (e) {
    console.error('vendor-click error', e)
    return redirect(HOME)
  }
})
