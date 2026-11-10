-- Referral commission engine: payments, reversals and quarterly payouts.
-- NOT applied anywhere yet. Depends on 20261110 (schema) and 20261116 (referrals keep on delete).
--
-- Money rules (see the Storyline proposal, 10 Nov 2026):
--   * commission = rate × the client's payment, for as long as the client stays subscribed
--     (partners.commission_months limits this if a partner's agreement says so; NULL = no limit);
--   * only for new accounts that arrived through the partner's link (referrals.status = 'attributed');
--   * a partner with no agreed rate (rate IS NULL) earns nothing and no row is written;
--   * refunds / credit notes / lost disputes write NEGATIVE rows that point at the original payment;
--     nothing is ever edited or deleted;
--   * payouts are quarterly in arrears: a payout collects every unpaid ledger row up to the end of that quarter
--     (so late refunds net off the next payout), and a payout that would be zero or negative is not created.
-- Writers (payment / reversal) are for the service role only (the Stripe webhook). Payout functions are admin-only.

-- (also in the vendors repo's 20261115; repeated here so this file works on its own — a NULL rate means "not yet agreed")
alter table public.partners alter column rate drop not null;
alter table public.partners alter column rate drop default;
alter table public.partners
  add column if not exists commission_months int check (commission_months is null or commission_months > 0);
comment on column public.partners.commission_months is
  'How many months after sign-up a referred client earns commission. NULL = for as long as they stay subscribed.';

-- ── a paid invoice → one commission row ────────────────────────────────────────────────────────────────
create or replace function public.affiliate_record_payment(
  p_event_id text, p_invoice_id text, p_charge_id text, p_customer_id text,
  p_gross_cents bigint, p_tax_cents bigint, p_occurred_at timestamptz,
  p_currency text default 'aud', p_fee_cents bigint default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; r public.referrals; pt public.partners; v_base bigint; v_comm bigint;
begin
  if p_event_id is null or p_invoice_id is null or p_customer_id is null then
    return jsonb_build_object('status', 'bad_input');
  end if;
  if coalesce(p_gross_cents, 0) <= 0 then return jsonb_build_object('status', 'no_amount'); end if;   -- free trials, $0 invoices
  if exists (select 1 from public.commission_entries where stripe_event_id = p_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  select s.user_id into v_uid from public.subscriptions s where s.stripe_customer_id = p_customer_id limit 1;
  if v_uid is null then return jsonb_build_object('status', 'no_user'); end if;
  select * into r from public.referrals where user_id = v_uid;
  if not found then return jsonb_build_object('status', 'not_referred'); end if;
  if r.status <> 'attributed' then return jsonb_build_object('status', 'excluded', 'why', r.status); end if;

  select * into pt from public.partners where id = r.partner_id;
  if not found or not pt.active then return jsonb_build_object('status', 'partner_inactive'); end if;
  if pt.rate is null then return jsonb_build_object('status', 'no_rate'); end if;
  if pt.commission_months is not null and p_occurred_at > r.signed_up_at + make_interval(months => pt.commission_months) then
    return jsonb_build_object('status', 'term_over');
  end if;

  v_base := case pt.basis
    when 'gross'  then p_gross_cents
    when 'ex_tax' then p_gross_cents - coalesce(p_tax_cents, 0)
    else p_gross_cents - coalesce(p_tax_cents, 0) - coalesce(p_fee_cents, 0) end;
  if pt.basis = 'net_of_fees' and p_fee_cents is null then return jsonb_build_object('status', 'fee_missing'); end if;
  if v_base <= 0 then return jsonb_build_object('status', 'no_amount'); end if;
  v_comm := round(v_base::numeric * pt.rate)::bigint;                              -- half away from zero: $12.99 × 20% = $2.60

  insert into public.commission_entries
    (partner_id, referral_id, kind, status, source, stripe_event_id, stripe_invoice_id, stripe_charge_id, currency,
     gross_cents, tax_cents, fee_cents, basis, rate, commission_cents, occurred_at, period_start)
  values
    (pt.id, r.id, 'payment', 'pending', 'subscription', p_event_id, p_invoice_id, p_charge_id, coalesce(p_currency, 'aud'),
     p_gross_cents, coalesce(p_tax_cents, 0), p_fee_cents, pt.basis, pt.rate, v_comm, p_occurred_at,
     public.affiliate_quarter_start(p_occurred_at))
  on conflict do nothing;                                                           -- a retried event / invoice is harmless
  if not found then return jsonb_build_object('status', 'duplicate'); end if;

  update public.referrals set stripe_customer_id = coalesce(stripe_customer_id, p_customer_id) where id = r.id;
  return jsonb_build_object('status', 'recorded', 'commission_cents', v_comm);
end $$;

-- ── a refund / credit note / lost dispute → a negative row against the original payment ───────────────────
create or replace function public.affiliate_record_reversal(
  p_event_id text, p_kind text, p_ref_id text, p_invoice_id text, p_charge_id text,
  p_amount_cents bigint, p_occurred_at timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.commission_entries; v_done bigint; v_rev bigint; v_amt bigint;
begin
  if p_kind not in ('refund', 'credit_note', 'dispute') or p_event_id is null or p_ref_id is null or coalesce(p_amount_cents, 0) <= 0 then
    return jsonb_build_object('status', 'bad_input');
  end if;
  if exists (select 1 from public.commission_entries where stripe_event_id = p_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  select * into o from public.commission_entries
   where kind = 'payment' and ((p_invoice_id is not null and stripe_invoice_id = p_invoice_id)
                            or (p_charge_id  is not null and stripe_charge_id  = p_charge_id))
   order by occurred_at desc limit 1;
  if not found then return jsonb_build_object('status', 'not_ours'); end if;       -- a client who was never referred

  v_amt := least(p_amount_cents, o.gross_cents);
  select coalesce(-sum(commission_cents), 0) into v_done from public.commission_entries where reverses_entry_id = o.id;
  v_rev := least(round(o.commission_cents::numeric * v_amt / o.gross_cents)::bigint, o.commission_cents - v_done);
  if v_rev <= 0 then return jsonb_build_object('status', 'nothing_to_reverse'); end if;

  insert into public.commission_entries
    (partner_id, referral_id, kind, status, source, stripe_event_id, stripe_invoice_id, stripe_charge_id,
     stripe_refund_id, stripe_credit_note_id, stripe_dispute_id, currency,
     gross_cents, tax_cents, basis, rate, commission_cents, reverses_entry_id, occurred_at, period_start)
  values
    (o.partner_id, o.referral_id, 'reversal', 'pending', o.source, p_event_id, o.stripe_invoice_id, o.stripe_charge_id,
     case when p_kind = 'refund'      then p_ref_id end,
     case when p_kind = 'credit_note' then p_ref_id end,
     case when p_kind = 'dispute'     then p_ref_id end, o.currency,
     -v_amt, 0, o.basis, o.rate, -v_rev, o.id, p_occurred_at, public.affiliate_quarter_start(p_occurred_at))
  on conflict do nothing;
  if not found then return jsonb_build_object('status', 'duplicate'); end if;
  return jsonb_build_object('status', 'reversed', 'commission_cents', -v_rev);
end $$;

-- ── quarterly payouts (admin only) ────────────────────────────────────────────────────────────────────────────
-- Collects every unpaid ledger row up to the end of the quarter that starts on p_quarter_start.
create or replace function public.affiliate_create_payout(p_partner uuid, p_quarter_start date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_end date; v_total bigint; v_id uuid;
begin
  if not public.is_admin() then return jsonb_build_object('status', 'admin_only'); end if;
  if p_quarter_start is null or p_quarter_start <> public.affiliate_quarter_start(p_quarter_start::timestamp at time zone 'Australia/Brisbane') then
    return jsonb_build_object('status', 'not_a_quarter_start');
  end if;
  v_end := (p_quarter_start + interval '3 months' - interval '1 day')::date;
  if (now() at time zone 'Australia/Brisbane')::date <= v_end then return jsonb_build_object('status', 'quarter_not_finished'); end if;
  if exists (select 1 from public.payouts where partner_id = p_partner and period_start = p_quarter_start) then
    return jsonb_build_object('status', 'exists');
  end if;
  select coalesce(sum(commission_cents), 0) into v_total from public.commission_entries
   where partner_id = p_partner and payout_id is null and status in ('pending', 'approved') and period_start <= p_quarter_start;
  if v_total <= 0 then return jsonb_build_object('status', 'nothing_due', 'carry_cents', v_total); end if;

  insert into public.payouts (partner_id, period_start, period_end, total_cents) values (p_partner, p_quarter_start, v_end, v_total)
  returning id into v_id;
  update public.commission_entries set payout_id = v_id, status = 'approved'
   where partner_id = p_partner and payout_id is null and status in ('pending', 'approved') and period_start <= p_quarter_start;
  return jsonb_build_object('status', 'created', 'payout_id', v_id, 'total_cents', v_total);
end $$;

create or replace function public.affiliate_mark_payout_paid(p_payout uuid, p_reference text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare po public.payouts;
begin
  if not public.is_admin() then return jsonb_build_object('status', 'admin_only'); end if;
  select * into po from public.payouts where id = p_payout for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if po.status = 'paid' then return jsonb_build_object('status', 'already_paid'); end if;
  update public.payouts set status = 'paid', paid_at = now(), reference = nullif(btrim(coalesce(p_reference, '')), '') where id = po.id;
  update public.commission_entries set status = 'paid' where payout_id = po.id;
  return jsonb_build_object('status', 'paid');
end $$;

-- A draft payout can be cancelled (its rows go back to pending); a paid one cannot.
create or replace function public.affiliate_void_payout(p_payout uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare po public.payouts;
begin
  if not public.is_admin() then return jsonb_build_object('status', 'admin_only'); end if;
  select * into po from public.payouts where id = p_payout for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if po.status <> 'draft' then return jsonb_build_object('status', 'not_a_draft'); end if;
  update public.commission_entries set payout_id = null, status = 'pending' where payout_id = po.id;
  delete from public.payouts where id = po.id;
  return jsonb_build_object('status', 'voided');
end $$;

-- ── read functions for the portal ───────────────────────────────────────────────────────────────────────────
-- A partner's statement lines for one calendar quarter: anonymous client ID, what the client paid, the commission.
create or replace function public.partner_statement_lines(p_period date)
returns table (occurred_at timestamptz, anon_id text, kind text, paid_cents bigint, commission_cents bigint, status text)
language sql stable security definer set search_path = public as $$
  select ce.occurred_at, substr(md5(coalesce(r.user_id, r.id)::text), 1, 8), ce.kind, ce.gross_cents - ce.tax_cents, ce.commission_cents, ce.status
  from public.commission_entries ce
  join public.partners p on p.id = ce.partner_id and p.user_id = auth.uid()
  join public.referrals r on r.id = ce.referral_id
  where ce.period_start = p_period
  order by ce.occurred_at;
$$;

-- Admin: what is owed to each partner right now, and the payouts so far.
create or replace function public.admin_payout_overview()
returns table (partner_id uuid, name text, rate numeric, unpaid_cents bigint, in_draft_cents bigint, paid_cents bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.rate,
    coalesce(sum(ce.commission_cents) filter (where ce.payout_id is null and ce.status = 'pending'), 0)::bigint,
    coalesce(sum(ce.commission_cents) filter (where ce.status = 'approved'), 0)::bigint,
    coalesce(sum(ce.commission_cents) filter (where ce.status = 'paid'), 0)::bigint
  from public.partners p left join public.commission_entries ce on ce.partner_id = p.id
  where public.is_admin() group by p.id, p.name, p.rate order by p.name;
$$;
create or replace function public.admin_payouts()
returns table (id uuid, partner_id uuid, name text, period_start date, period_end date, total_cents bigint, status text, paid_at timestamptz, reference text)
language sql stable security definer set search_path = public as $$
  select po.id, po.partner_id, p.name, po.period_start, po.period_end, po.total_cents, po.status, po.paid_at, po.reference
  from public.payouts po join public.partners p on p.id = po.partner_id
  where public.is_admin() order by po.period_start desc, p.name;
$$;

-- ── privileges ────────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.affiliate_record_payment(text, text, text, text, bigint, bigint, timestamptz, text, bigint),
  public.affiliate_record_reversal(text, text, text, text, text, bigint, timestamptz),
  public.affiliate_create_payout(uuid, date), public.affiliate_mark_payout_paid(uuid, text), public.affiliate_void_payout(uuid),
  public.partner_statement_lines(date), public.admin_payout_overview(), public.admin_payouts() from public, anon, authenticated;
grant execute on function public.affiliate_record_payment(text, text, text, text, bigint, bigint, timestamptz, text, bigint),
  public.affiliate_record_reversal(text, text, text, text, text, bigint, timestamptz) to service_role;
grant execute on function public.affiliate_create_payout(uuid, date), public.affiliate_mark_payout_paid(uuid, text), public.affiliate_void_payout(uuid),
  public.partner_statement_lines(date), public.admin_payout_overview(), public.admin_payouts() to authenticated;
