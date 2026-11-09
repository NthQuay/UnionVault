// Public click-through for recommended vendors:  GET /functions/v1/vendor-click?v=<vendor>&l=<website|book|instagram>
// Logs the click (vendor, link, time, referrer host, bot flag — no IP, no user id) and 302-redirects to the
// destination stored in public.vendor_links. Deploy with verify_jwt = false (it is opened from a plain link).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SLUG, buildDestination, isBot, refererHost } from './dest.ts'

const HOME = 'https://unionvault.app/'
const redirect = (to: string) => new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', 'Referrer-Policy': 'origin' } })

serve(async (req) => {
  const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const p = new URL(req.url).searchParams
  const vendor = (p.get('v') ?? '').toLowerCase()
  const link = (p.get('l') ?? '').toLowerCase()
  if (!SLUG.test(vendor) || !['website', 'book', 'instagram'].includes(link) || !SB_URL || !SB_SERVICE) return redirect(HOME)

  const h = { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` }
  try {
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
