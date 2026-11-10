// Run:  node --experimental-strip-types supabase/tests/stripe_commission_test.mts
import { paymentArgs, refundArgs, creditNoteArgs, disputeArgs, taxFromInvoice } from '../functions/stripe-webhook/commission.ts'
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
console.log('stripe-webhook commission mapping: all tests passed')
