// Pure mapping from Stripe objects to the arguments of the commission SQL functions (20261117_commission_engine.sql).
// All money rules live in SQL; this file only reads Stripe's shapes. Kept free of Deno/Supabase imports so it can be
// unit-tested with Node (supabase/tests/stripe_commission_test.mts).

type Obj = Record<string, any>

const iso = (unixSeconds: unknown): string => new Date((Number(unixSeconds) || Math.floor(Date.now() / 1000)) * 1000).toISOString()
const idOf = (v: unknown): string | null => (typeof v === 'string' ? v : (v as Obj | null)?.id ?? null)

/** Tax on an invoice, across the API versions Stripe has used (older: tax / total_tax_amounts, newer: total_taxes). */
export function taxFromInvoice(inv: Obj): number {
  if (typeof inv.tax === 'number') return inv.tax
  const sum = (a: unknown) => (Array.isArray(a) ? a.reduce((t, x) => t + (Number(x?.amount) || 0), 0) : null)
  return sum(inv.total_tax_amounts) ?? sum(inv.total_taxes) ?? 0
}

/** invoice.paid → affiliate_record_payment arguments (null when it cannot earn: no customer, nothing paid). */
export function paymentArgs(event: Obj): Obj | null {
  const inv = event?.data?.object
  const customer = idOf(inv?.customer)
  if (!inv?.id || !customer || !(Number(inv.amount_paid) > 0)) return null
  return {
    p_event_id: event.id, p_invoice_id: inv.id, p_charge_id: idOf(inv.charge), p_customer_id: customer,
    p_gross_cents: Number(inv.amount_paid), p_tax_cents: taxFromInvoice(inv),
    p_occurred_at: iso(inv.status_transitions?.paid_at ?? event.created), p_currency: String(inv.currency ?? 'aud'),
  }
}

/** One succeeded refund → affiliate_record_reversal arguments. The event id is made unique per refund. */
export function refundArgs(event: Obj, refund: Obj, invoiceId: string | null): Obj | null {
  if (refund?.status !== 'succeeded' || !(Number(refund.amount) > 0) || !refund.id) return null
  return {
    p_event_id: `${event.id}:${refund.id}`, p_kind: 'refund', p_ref_id: refund.id, p_invoice_id: invoiceId,
    p_charge_id: idOf(refund.charge), p_amount_cents: Number(refund.amount), p_occurred_at: iso(refund.created ?? event.created),
  }
}

/** A credit note reverses only the part NOT refunded to the card (refunds arrive as their own events). */
export function creditNoteArgs(event: Obj): Obj | null {
  const cn = event?.data?.object
  const amount = (Number(cn?.credit_amount) || 0) + (Number(cn?.out_of_band_amount) || 0)
  if (!cn?.id || !cn.invoice || amount <= 0) return null
  return {
    p_event_id: event.id, p_kind: 'credit_note', p_ref_id: cn.id, p_invoice_id: idOf(cn.invoice),
    p_charge_id: null, p_amount_cents: amount, p_occurred_at: iso(cn.created ?? event.created),
  }
}

/** charge.dispute.closed with status "lost" → reversal. Won / warning disputes change nothing. */
export function disputeArgs(event: Obj, invoiceId: string | null): Obj | null {
  const d = event?.data?.object
  if (event?.type !== 'charge.dispute.closed' || d?.status !== 'lost' || !d.id || !(Number(d.amount) > 0)) return null
  return {
    p_event_id: event.id, p_kind: 'dispute', p_ref_id: d.id, p_invoice_id: invoiceId, p_charge_id: idOf(d.charge),
    p_amount_cents: Number(d.amount), p_occurred_at: iso(d.created ?? event.created),
  }
}

export const COMMISSION_EVENTS = ['invoice.paid', 'charge.refunded', 'charge.dispute.closed', 'credit_note.created']
