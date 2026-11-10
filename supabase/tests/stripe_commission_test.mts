// Run:  node --experimental-strip-types supabase/tests/stripe_commission_test.mts
import { paymentArgs, paymentLifecycleArgs, cancelArgs, invoicePlan, planMonths, refundArgs, creditNoteArgs, disputeArgs, taxFromInvoice } from '../functions/stripe-webhook/commission.ts'
import assert from 'node:assert/strict'
const inv = (o: object = {}) => ({ id: 'evt_1', created: 1_800_000_000, data: { object: { id: 'in_1', customer: 'cus_1', amount_paid: 1299, currency: 'aud', charge: 'ch_1', status_transitions: { paid_at: 1_800_000_100 }, ...o } } })
let a = paymentArgs(inv())!
assert.equal(a.p_gross_cents, 1299); assert.equal(a.p_tax_cents, 0); assert.equal(a.p_invoice_id, 'in_1'); assert.equal(a.p_charge_id, 'ch_1')
assert.equal(a.p_occurred_at, new Date(1_800_000_100 * 1000).toISOString())                      // uses the paid-at time, not the event time
assert.equal(paymentArgs(inv({ amount_paid: 0 })), null)                                         // free trial invoice
assert.equal(paymentArgs(inv({ customer: null })), null)
assert.equal(paymentArgs(inv({ customer: { id: 'cus_9' } }))!.p_customer_id, 'cus_9')            // expanded customer object
assert.equal(paymentArgs(inv({ charge: undefined }))!.p_charge_id, null)                         // newer API versions have no charge on the invoice
// tax across API versions
assert.equal(taxFromInvoice({ tax: 118 }), 118)
assert.equal(taxFromInvoice({ total_tax_amounts: [{ amount: 100 }, { amount: 18 }] }), 118)
assert.equal(taxFromInvoice({ total_taxes: [{ amount: 118 }] }), 118)
assert.equal(taxFromInvoice({}), 0)
// refunds
const ev = { id: 'evt_2', created: 1_800_000_500 }
assert.equal(refundArgs(ev, { id: 're_1', status: 'succeeded', amount: 500, charge: 'ch_1', created: 1_800_000_400 }, 'in_1')!.p_event_id, 'evt_2:re_1')   // unique per refund
assert.equal(refundArgs(ev, { id: 're_1', status: 'pending', amount: 500, charge: 'ch_1' }, 'in_1'), null)                                                  // only succeeded
assert.equal(refundArgs(ev, { id: 're_1', status: 'succeeded', amount: 0, charge: 'ch_1' }, 'in_1'), null)
// credit notes: only the part not refunded to the card
assert.equal(creditNoteArgs({ id: 'evt_3', data: { object: { id: 'cn_1', invoice: 'in_1', amount: 1299, refund_amount: 1299, credit_amount: 0, out_of_band_amount: 0 } } }), null)
assert.equal(creditNoteArgs({ id: 'evt_3', data: { object: { id: 'cn_1', invoice: 'in_1', amount: 1299, refund_amount: 0, credit_amount: 1299 } } })!.p_amount_cents, 1299)
assert.equal(creditNoteArgs({ id: 'evt_3', data: { object: { id: 'cn_1', invoice: 'in_1', amount: 1000, refund_amount: 400, credit_amount: 600 } } })!.p_amount_cents, 600)
// disputes: only lost ones
const dis = (status: string, type = 'charge.dispute.closed') => ({ id: 'evt_4', type, created: 1_800_000_900, data: { object: { id: 'dp_1', status, amount: 1299, charge: 'ch_1' } } })
assert.equal(disputeArgs(dis('lost'), 'in_1')!.p_kind, 'dispute')
assert.equal(disputeArgs(dis('won'), 'in_1'), null)
assert.equal(disputeArgs(dis('lost', 'charge.dispute.created'), 'in_1'), null)
// plans
assert.equal(planMonths({ interval: 'month', interval_count: 1 }), 1)
assert.equal(planMonths({ interval: 'month', interval_count: 3 }), 3)
assert.equal(planMonths({ interval: 'year', interval_count: 1 }), 12)
assert.equal(planMonths({ interval: 'week' }), null)
assert.equal(planMonths(null), null)
assert.deepEqual(invoicePlan({ lines: { data: [{ price: { id: 'price_3', recurring: { interval: 'month', interval_count: 3 } } }] } }), { months: 3, priceId: 'price_3' })
assert.deepEqual(invoicePlan({ lines: { data: [{ plan: { interval: 'year', interval_count: 1 } }] } }).months, 12)               // older API
assert.deepEqual(invoicePlan({ lines: { data: [{ pricing: { price_details: { price: 'price_x' } } }] } }), { months: null, priceId: 'price_x' })   // newer API: look the price up
assert.equal(paymentArgs(inv(), 3)!.p_plan_months, 3)
const pl = paymentLifecycleArgs(inv({ amount_paid: 3118, tax: 0 }), 3)!
assert.equal(pl.p_kind, 'payment'); assert.equal(pl.p_amount_cents, 3118); assert.equal(pl.p_plan_months, 3)
assert.equal(paymentLifecycleArgs(inv({ amount_paid: 0 }), 1), null)
// cancellations
const sub = (type: string, o: object, prev?: object) => ({ id: 'evt_s', type, created: 1_800_001_000, data: { object: { customer: 'cus_1', ...o }, ...(prev ? { previous_attributes: prev } : {}) } })
assert.equal(cancelArgs(sub('customer.subscription.updated', { cancel_at_period_end: true, canceled_at: 1_800_000_900 }, { cancel_at_period_end: false }))!.p_kind, 'cancel_requested')
assert.equal(cancelArgs(sub('customer.subscription.updated', { cancel_at_period_end: false }, { cancel_at_period_end: true }))!.p_kind, 'resumed')
assert.equal(cancelArgs(sub('customer.subscription.updated', { cancel_at: 1_800_500_000 }, { cancel_at: null }))!.p_kind, 'cancel_requested')   // scheduled end date set
assert.equal(cancelArgs(sub('customer.subscription.updated', { status: 'active' }, { status: 'trialing' })), null)                      // unrelated change
assert.equal(cancelArgs(sub('customer.subscription.updated', { cancel_at_period_end: true }, { cancel_at_period_end: true })), null)    // no change
assert.equal(cancelArgs(sub('customer.subscription.deleted', { ended_at: 1_800_002_000 }))!.p_kind, 'cancelled')
assert.equal(cancelArgs(sub('customer.subscription.deleted', { ended_at: 1_800_002_000 }))!.p_occurred_at, new Date(1_800_002_000 * 1000).toISOString())
assert.equal(cancelArgs(sub('invoice.paid', {})), null)
console.log('stripe-webhook commission mapping: all tests passed')
