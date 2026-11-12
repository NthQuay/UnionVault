import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { COMMISSION_EVENTS, paymentArgs, paymentLifecycleArgs, cancelArgs, invoicePlan, planMonths, refundArgs, creditNoteArgs, disputeArgs } from './commission.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const STRIPE_KEY    = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
  const SB_URL        = Deno.env.get('SUPABASE_URL') ?? ''
  const SB_SERVICE    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!STRIPE_KEY || !WEBHOOK_SECRET) return json(503, { error: 'Not configured' })

  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  if (!await verifySignature(rawBody, sig, WEBHOOK_SECRET)) {
    return json(400, { error: 'Invalid signature' })
  }

  const event = JSON.parse(rawBody)
  const type = event.type as string

  try {
    if (type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object, SB_URL, SB_SERVICE, STRIPE_KEY)
    } else if (type === 'customer.subscription.updated') {
      await handleSubUpdated(event.data.object, SB_URL, SB_SERVICE)
    } else if (type === 'customer.subscription.deleted') {
      await handleSubDeleted(event.data.object, SB_URL, SB_SERVICE)
    } else if (type === 'invoice.payment_failed') {
      await handlePaymentFailed(event.data.object, SB_URL, SB_SERVICE)
    } else if (COMMISSION_EVENTS.includes(type)) {
      await handleCommissionEvent(event, SB_URL, SB_SERVICE, STRIPE_KEY)
    }
    // Admin account log (Users tab in the vendor portal). Best effort, idempotent per Stripe event.
    try { await logAccountEvent(event, SB_URL, SB_SERVICE, STRIPE_KEY) } catch (e) { console.error('account log failed', type, e) }
    // Cancellation requested / resumed / ended, for the vendor-facing log. Never allowed to break subscription handling.
    if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      try {
        const a = cancelArgs(event)
        if (a) await rpc(SB_URL, SB_SERVICE, 'affiliate_record_lifecycle', a)
      } catch (e) { console.error('lifecycle log failed', type, e) }
    }
  } catch (e) {
    console.error('Webhook handler error:', type, e)
    return json(500, { error: 'Handler failed' })
  }

  return json(200, { received: true })
})

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Record<string, unknown>, sbUrl: string, sbKey: string, stripeKey: string
) {
  if (session.mode !== 'subscription') return
  const userId = (session.metadata as Record<string, string>)?.user_id
  const customerId = session.customer as string
  const subId = session.subscription as string
  if (!userId || !subId) return

  const sub = await stripeGet(`subscriptions/${subId}`, stripeKey)

  await sbUpsert(sbUrl, sbKey, 'subscriptions', 'user_id', {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subId,
    status: sub.status ?? 'active',
    price_id: sub.items?.data?.[0]?.price?.id ?? null,
    current_period_start: tsToIso(sub.current_period_start),
    current_period_end: tsToIso(sub.current_period_end),
    trial_end: sub.trial_end ? tsToIso(sub.trial_end) : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
  })

  await sbPatch(sbUrl, sbKey, 'user_profiles', 'user_id', userId, {
    tier: 'full', stripe_customer_id: customerId,
  })
}

async function handleSubUpdated(sub: Record<string, unknown>, sbUrl: string, sbKey: string) {
  const subId = sub.id as string
  const status = sub.status as string

  const row: Record<string, unknown> = {
    status,
    price_id: (sub.items as any)?.data?.[0]?.price?.id ?? null,
    current_period_start: tsToIso(sub.current_period_start as number),
    current_period_end: tsToIso(sub.current_period_end as number),
    trial_end: sub.trial_end ? tsToIso(sub.trial_end as number) : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
  }

  await fetch(`${sbUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${subId}`, {
    method: 'PATCH',
    headers: sbHeaders(sbKey),
    body: JSON.stringify(row),
  })

  // Update tier based on status
  const tier = (status === 'active' || status === 'trialing') ? 'full' : 'free'
  const lookupRes = await fetch(
    `${sbUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${subId}&select=user_id`,
    { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
  )
  const rows = await lookupRes.json()
  if (rows?.[0]?.user_id) {
    await sbPatch(sbUrl, sbKey, 'user_profiles', 'user_id', rows[0].user_id, { tier })
  }
}

async function handleSubDeleted(sub: Record<string, unknown>, sbUrl: string, sbKey: string) {
  const subId = sub.id as string

  const lookupRes = await fetch(
    `${sbUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${subId}&select=user_id`,
    { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
  )
  const rows = await lookupRes.json()

  await fetch(`${sbUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${subId}`, {
    method: 'PATCH',
    headers: sbHeaders(sbKey),
    body: JSON.stringify({ status: 'canceled', cancel_at_period_end: false, updated_at: new Date().toISOString() }),
  })

  if (rows?.[0]?.user_id) {
    await sbPatch(sbUrl, sbKey, 'user_profiles', 'user_id', rows[0].user_id, { tier: 'free' })
  }
}

async function handlePaymentFailed(invoice: Record<string, unknown>, sbUrl: string, sbKey: string) {
  const subId = invoice.subscription as string
  if (!subId) return
  await fetch(`${sbUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${subId}`, {
    method: 'PATCH',
    headers: sbHeaders(sbKey),
    body: JSON.stringify({ status: 'past_due', updated_at: new Date().toISOString() }),
  })
}

// ── Stripe signature verification (HMAC-SHA256 via Web Crypto) ──────────────

async function verifySignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts: Record<string, string> = {}
  for (const pair of header.split(',')) {
    const eq = pair.indexOf('=')
    if (eq > 0) parts[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim()
  }
  const timestamp = parts.t
  if (!timestamp || !parts.v1) return false

  const fiveMinutes = 300
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > fiveMinutes) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${payload}`))
  const hex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')

  if (hex.length !== parts.v1.length) return false
  let result = 0
  for (let i = 0; i < hex.length; i++) result |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i)
  return result === 0
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sbHeaders(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }
}

async function sbUpsert(sbUrl: string, key: string, table: string, conflict: string, row: Record<string, unknown>) {
  await fetch(`${sbUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...sbHeaders(key), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  })
}

async function sbPatch(sbUrl: string, key: string, table: string, col: string, val: string, data: Record<string, unknown>) {
  await fetch(`${sbUrl}/rest/v1/${table}?${col}=eq.${val}`, {
    method: 'PATCH',
    headers: sbHeaders(key),
    body: JSON.stringify(data),
  })
}

async function stripeGet(endpoint: string, key: string) {
  const r = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    headers: { Authorization: `Basic ${btoa(key + ':')}` },
  })
  return r.json()
}

function tsToIso(ts: unknown): string | null {
  if (!ts) return null
  return new Date(Number(ts) * 1000).toISOString()
}


// ── Referral commission ─────────────────────────────────────────────────────────────────────────────────────
// Every Stripe event is recorded once in stripe_events; the money rules themselves live in SQL
// (affiliate_record_payment / affiliate_record_reversal), which are idempotent, so a retried webhook is harmless.
async function rpc(sbUrl: string, key: string, fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${sbUrl}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
  if (!r.ok) throw new Error(`${fn} failed: ${r.status} ${await r.text()}`)
  const out = await r.json()
  console.log(`commission ${fn}`, args.p_event_id, JSON.stringify(out))
  return out
}

/** The invoice a charge paid for. Works on older API versions (charge.invoice) and newer ones (invoice_payments). */
async function invoiceIdForCharge(charge: Record<string, any>, stripeKey: string): Promise<string | null> {
  if (typeof charge?.invoice === 'string') return charge.invoice
  const pi = typeof charge?.payment_intent === 'string' ? charge.payment_intent : charge?.payment_intent?.id
  if (!pi) return null
  try {
    const r = await stripeGet(`invoice_payments?payment[type]=payment_intent&payment[payment_intent]=${encodeURIComponent(pi)}&limit=1`, stripeKey)
    const inv = r?.data?.[0]?.invoice
    return typeof inv === 'string' ? inv : inv?.id ?? null
  } catch (_) { return null }
}

async function handleCommissionEvent(event: Record<string, any>, sbUrl: string, sbKey: string, stripeKey: string) {
  // whole-event idempotency: skip events already fully processed; re-run ones that failed part-way
  const ins = await fetch(`${sbUrl}/rest/v1/stripe_events`, {
    method: 'POST', headers: { ...sbHeaders(sbKey), 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ event_id: event.id, type: event.type }),
  })
  if (!ins.ok) throw new Error(`stripe_events insert failed: ${ins.status}`)
  const seen = await fetch(`${sbUrl}/rest/v1/stripe_events?event_id=eq.${encodeURIComponent(event.id)}&select=processed_at`, { headers: sbHeaders(sbKey) })
  const row = (await seen.json())?.[0]
  if (row?.processed_at) return

  if (event.type === 'invoice.paid') {
    const inv = event.data.object
    let { months, priceId } = invoicePlan(inv)
    if (months == null && priceId) { try { months = planMonths((await stripeGet(`prices/${encodeURIComponent(priceId)}`, stripeKey))?.recurring) } catch (_) { /* plan stays unknown */ } }
    const life = paymentLifecycleArgs(event, months); if (life) await rpc(sbUrl, sbKey, 'affiliate_record_lifecycle', life)
    const a = paymentArgs(event, months); if (a) await rpc(sbUrl, sbKey, 'affiliate_record_payment', a)
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object
    const invoiceId = await invoiceIdForCharge(charge, stripeKey)
    const refunds = await stripeGet(`refunds?charge=${encodeURIComponent(charge.id)}&limit=100`, stripeKey)
    for (const rf of refunds?.data ?? []) {
      const a = refundArgs(event, rf, invoiceId); if (a) await rpc(sbUrl, sbKey, 'affiliate_record_reversal', a)
    }
  } else if (event.type === 'credit_note.created') {
    const a = creditNoteArgs(event); if (a) await rpc(sbUrl, sbKey, 'affiliate_record_reversal', a)
  } else if (event.type === 'charge.dispute.closed') {
    const d = event.data.object
    const charge = d?.charge ? await stripeGet(`charges/${encodeURIComponent(typeof d.charge === 'string' ? d.charge : d.charge.id)}`, stripeKey) : null
    const a = disputeArgs(event, charge ? await invoiceIdForCharge(charge, stripeKey) : null)
    if (a) await rpc(sbUrl, sbKey, 'affiliate_record_reversal', a)
  }

  await fetch(`${sbUrl}/rest/v1/stripe_events?event_id=eq.${encodeURIComponent(event.id)}`, {
    method: 'PATCH', headers: { ...sbHeaders(sbKey), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ processed_at: new Date().toISOString() }),
  })
}


// ── Admin account log ───────────────────────────────────────────────────────────────────────────────────────
/** Coupon / promotion code applied to a subscription (readable code first, else coupon name or id). */
async function couponOf(subId: string, stripeKey: string): Promise<string | null> {
  try {
    const s = await stripeGet(`subscriptions/${encodeURIComponent(subId)}?expand[]=discounts.promotion_code`, stripeKey)
    const list: Record<string, any>[] = [...(Array.isArray(s?.discounts) ? s.discounts : []), ...(s?.discount ? [s.discount] : [])].filter((d) => d && typeof d === 'object')
    const names = list.map((d) => d.promotion_code?.code ?? d.coupon?.name ?? d.coupon?.id ?? d.source?.coupon?.name ?? d.source?.coupon?.id).filter(Boolean)
    return names.length ? [...new Set(names)].join(', ') : null
  } catch (_) { return null }
}

async function logAccountEvent(event: Record<string, any>, sbUrl: string, sbKey: string, stripeKey: string) {
  const o = event.data?.object ?? {}
  const prev = event.data?.previous_attributes ?? {}
  const at = new Date((Number(event.created) || Math.floor(Date.now() / 1000)) * 1000).toISOString()
  const customer = typeof o.customer === 'string' ? o.customer : o.customer?.id
  const send = (kind: string, extra: Record<string, unknown> = {}, suffix = '') =>
    rpc(sbUrl, sbKey, 'account_event_record', { p_event_id: event.id + suffix, p_kind: kind, p_customer_id: customer ?? null, p_occurred_at: at, ...extra })

  if (event.type === 'checkout.session.completed') {
    if (o.mode !== 'subscription' || !o.subscription) return
    const sub = await stripeGet(`subscriptions/${o.subscription}`, stripeKey)
    const rec = sub?.items?.data?.[0]?.price?.recurring
    await send(sub?.status === 'trialing' ? 'trial_started' : 'subscribed', {
      p_user_id: o.metadata?.user_id ?? null, p_plan_months: planMonths(rec), p_coupon: await couponOf(String(o.subscription), stripeKey),
      p_detail: { status: sub?.status ?? null, trial_end: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null },
    })
  } else if (event.type === 'customer.subscription.updated') {
    const rec = o.items?.data?.[0]?.price?.recurring
    const months = planMonths(rec)
    if ('items' in prev && months != null) await send('plan_changed', { p_plan_months: months }, ':plan')
    if ('cancel_at_period_end' in prev) {
      await send(o.cancel_at_period_end ? 'cancel_requested' : 'resumed', {
        p_plan_months: months, p_detail: { ends: o.current_period_end ? new Date(o.current_period_end * 1000).toISOString() : null },
      }, ':cancel')
    }
    if (prev.status === 'trialing' && o.status === 'active') await send('subscribed', { p_plan_months: months, p_detail: { note: 'Free trial ended, now paying' } }, ':convert')
    // A coupon/discount added (or changed) directly on an EXISTING subscription — e.g. an admin
    // applying one in the Stripe Dashboard after the original checkout. couponOf() above was only
    // ever read at checkout.session.completed, so a discount attached later never reached
    // account_events, and the vendor portal's Users > Coupon column stayed "—" forever for that
    // account even though Stripe genuinely had the discount on file.
    if ('discount' in prev || 'discounts' in prev) {
      const coupon = await couponOf(o.id as string, stripeKey)
      if (coupon) await send('coupon', { p_plan_months: months, p_coupon: coupon }, ':coupon')
    }
  } else if (event.type === 'customer.subscription.deleted') {
    await send('cancelled', { p_plan_months: planMonths(o.items?.data?.[0]?.price?.recurring) })
  } else if (event.type === 'invoice.paid') {
    if (!(Number(o.amount_paid) > 0)) return
    await send('payment', { p_plan_months: invoicePlan(o).months, p_amount_cents: Number(o.amount_paid), p_detail: { invoice: o.id, currency: o.currency ?? 'aud' } })
  } else if (event.type === 'invoice.payment_failed') {
    await send('payment_failed', { p_amount_cents: Number(o.amount_due) || null, p_detail: { invoice: o.id } })
  }
}
