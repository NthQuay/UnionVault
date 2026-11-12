-- Affiliate referral system — step 1: schema, RLS, attribution claim, partner read functions.
-- NOT applied anywhere yet. Review, then run on a Supabase BRANCH / local database first.
-- Money is stored in integer cents. Commission rows are written only by the Stripe webhook
-- Edge Function and admin functions (service role); nothing here lets a client write to them.

-- ── helpers ──────────────────────────────────────────────────────────────────────
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;   -- no policies: service role / SQL editor only

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Calendar quarter (Australia/Brisbane) that contains a moment; returns its first day.
create or replace function public.affiliate_quarter_start(ts timestamptz)
returns date language sql immutable set search_path = public as $$
  select date_trunc('quarter', ts at time zone 'Australia/Brisbane')::date;
$$;

-- One-row settings table: every attribution rule that may change lives here.
create table if not exists public.affiliate_settings (
  id                        int primary key default 1 check (id = 1),
  attribution_window_days   int  not null default 90,    -- how long a click stays valid
  new_account_window_hours  int  not null default 72,    -- a referral can only be claimed this soon after sign-up
  default_rate              numeric(5,4) not null default 0.25,
  default_basis             text not null default 'ex_tax' check (default_basis in ('gross','ex_tax','net_of_fees'))
);
insert into public.affiliate_settings (id) values (1) on conflict (id) do nothing;
alter table public.affiliate_settings enable row level security;
drop policy if exists affiliate_settings_admin_read on public.affiliate_settings;
create policy affiliate_settings_admin_read on public.affiliate_settings for select using (public.is_admin());

-- ── partners ─────────────────────────────────────────────────────────────────────
create table if not exists public.partners (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique references auth.users(id) on delete set null,  -- the partner's login (linked later)
  code           text not null unique check (code = lower(code) and code ~ '^[a-z0-9][a-z0-9_-]{2,39}$'),
  name           text not null,
  contact_email  text,
  rate           numeric(5,4) not null default 0.25 check (rate >= 0 and rate <= 1),
  basis          text not null default 'ex_tax' check (basis in ('gross','ex_tax','net_of_fees')),
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.partners enable row level security;
drop policy if exists partners_read_own on public.partners;
create policy partners_read_own on public.partners for select using (user_id = auth.uid() or public.is_admin());

-- ── referrals (one per referred user; never overwritten) ─────────────────────────
create table if not exists public.referrals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users(id) on delete cascade,
  partner_id          uuid not null references public.partners(id),
  code                text not null,
  clicked_at          timestamptz,
  signed_up_at        timestamptz not null,
  status              text not null default 'attributed'
                      check (status in ('attributed','excluded_self','excluded_listing','void')),
  source              text not null default 'partner_link' check (source in ('partner_link','vendor_listing')),
  stripe_customer_id  text,
  created_at          timestamptz not null default now()
);
create index if not exists referrals_partner_idx on public.referrals (partner_id, signed_up_at desc);
create index if not exists referrals_customer_idx on public.referrals (stripe_customer_id) where stripe_customer_id is not null;
alter table public.referrals enable row level security;
-- Partners never read this table directly (it holds user ids and Stripe ids): they use partner_referrals().
drop policy if exists referrals_admin_read on public.referrals;
create policy referrals_admin_read on public.referrals for select using (public.is_admin());

-- ── payouts ──────────────────────────────────────────────────────────────────────
create table if not exists public.payouts (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references public.partners(id),
  period_start  date not null,                       -- first day of the calendar quarter
  period_end    date not null,                       -- last day (inclusive)
  total_cents   bigint not null,
  currency      text not null default 'aud',
  status        text not null default 'draft' check (status in ('draft','paid')),
  paid_at       timestamptz,
  reference     text,
  created_at    timestamptz not null default now(),
  unique (partner_id, period_start)
);
alter table public.payouts enable row level security;
drop policy if exists payouts_read_own on public.payouts;
create policy payouts_read_own on public.payouts for select using (
  public.is_admin() or partner_id in (select id from public.partners where user_id = auth.uid()));

-- ── commission ledger ────────────────────────────────────────────────────────────
-- One 'payment' row per paid Stripe invoice; 'reversal' rows (negative) for refunds, credit notes,
-- lost disputes. The unique indexes below are what make webhook retries harmless.
create table if not exists public.commission_entries (
  id                 uuid primary key default gen_random_uuid(),
  partner_id         uuid not null references public.partners(id),
  referral_id        uuid not null references public.referrals(id),
  kind               text not null check (kind in ('payment','reversal')),
  status             text not null default 'pending' check (status in ('pending','approved','paid','reversed')),
  source             text not null default 'subscription' check (source in ('subscription','booking')),  -- 'booking' = phase 2 vendor referral fees
  vendor_booking_id  uuid,                                                                             -- phase 2, unused now
  stripe_event_id    text not null,
  stripe_invoice_id  text,
  stripe_charge_id   text,
  stripe_refund_id   text,
  stripe_credit_note_id text,
  stripe_dispute_id  text,
  currency           text not null default 'aud',
  gross_cents        bigint not null,                 -- negative on reversals
  tax_cents          bigint not null default 0,
  ex_tax_cents       bigint generated always as (gross_cents - tax_cents) stored,
  fee_cents          bigint,                          -- Stripe fee when retrievable
  basis              text not null check (basis in ('gross','ex_tax','net_of_fees')),
  rate               numeric(5,4) not null,
  commission_cents   bigint not null,                 -- negative on reversals
  reverses_entry_id  uuid references public.commission_entries(id),
  occurred_at        timestamptz not null,
  period_start       date not null,
  payout_id          uuid references public.payouts(id),
  created_at         timestamptz not null default now(),
  check ((kind = 'payment' and commission_cents >= 0) or (kind = 'reversal' and commission_cents <= 0)),
  check (kind = 'payment' or reverses_entry_id is not null)
);
create unique index if not exists ce_event_uniq     on public.commission_entries (stripe_event_id);
create unique index if not exists ce_invoice_uniq   on public.commission_entries (stripe_invoice_id) where kind = 'payment' and source = 'subscription';
create unique index if not exists ce_refund_uniq    on public.commission_entries (stripe_refund_id) where stripe_refund_id is not null;
create unique index if not exists ce_credit_uniq    on public.commission_entries (stripe_credit_note_id) where stripe_credit_note_id is not null;
create unique index if not exists ce_dispute_uniq   on public.commission_entries (stripe_dispute_id, kind) where stripe_dispute_id is not null;
create index if not exists ce_partner_period_idx    on public.commission_entries (partner_id, period_start);
create index if not exists ce_referral_idx          on public.commission_entries (referral_id);
alter table public.commission_entries enable row level security;
drop policy if exists ce_read_own on public.commission_entries;
create policy ce_read_own on public.commission_entries for select using (
  public.is_admin() or partner_id in (select id from public.partners where user_id = auth.uid()));

-- Every Stripe event we have processed (whole-event idempotency, ahead of the per-row unique indexes).
create table if not exists public.stripe_events (
  event_id      text primary key,
  type          text not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);
alter table public.stripe_events enable row level security;   -- no policies: service role only

-- ── privileges: nobody writes with a user token ──────────────────────────────────
revoke all on public.app_admins, public.affiliate_settings, public.partners, public.referrals,
              public.payouts, public.commission_entries, public.stripe_events from anon, authenticated;
grant select on public.partners, public.referrals, public.payouts, public.commission_entries,
                public.affiliate_settings to authenticated;   -- rows still filtered by the RLS policies above

-- ── claim a referral after sign-up (server-side validation) ──────────────────────
create or replace function public.claim_referral(p_code text, p_clicked_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_user    auth.users;
  v_partner public.partners;
  s         public.affiliate_settings;
  v_click   timestamptz;
  v_status  text := 'attributed';
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  select * into s from public.affiliate_settings where id = 1;

  if exists (select 1 from public.referrals where user_id = v_uid) then
    return jsonb_build_object('ok', true, 'status', 'already_claimed');     -- never overwrite
  end if;

  select * into v_partner from public.partners where code = lower(btrim(coalesce(p_code, ''))) and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;

  select * into v_user from auth.users where id = v_uid;
  -- Only NEW accounts: the account must be recent, and the click must not come after the account existed.
  if v_user.created_at < now() - make_interval(hours => s.new_account_window_hours) then
    return jsonb_build_object('ok', false, 'error', 'existing_account');
  end if;
  v_click := least(coalesce(p_clicked_at, v_user.created_at), now());
  if v_click > v_user.created_at + interval '10 minutes' then
    return jsonb_build_object('ok', false, 'error', 'existing_account');
  end if;
  if v_click < now() - make_interval(days => s.attribution_window_days) then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  -- Self-referral: the partner's own login, or an email that matches the partner's contact email.
  if v_partner.user_id = v_uid or (v_partner.contact_email is not null and lower(v_user.email) = lower(v_partner.contact_email)) then
    v_status := 'excluded_self';
  end if;

  insert into public.referrals (user_id, partner_id, code, clicked_at, signed_up_at, status)
  values (v_uid, v_partner.id, v_partner.code, v_click, v_user.created_at, v_status)
  on conflict (user_id) do nothing;

  return jsonb_build_object('ok', true, 'status', v_status);
end $$;
revoke all on function public.claim_referral(text, timestamptz) from public, anon;
grant execute on function public.claim_referral(text, timestamptz) to authenticated;

-- ── partner-facing read functions (aggregates and anonymised rows only) ──────────
create or replace function public.partner_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_partner public.partners;
begin
  select * into v_partner from public.partners where user_id = auth.uid();
  if not found then return null; end if;
  return jsonb_build_object(
    'name', v_partner.name, 'code', v_partner.code, 'rate', v_partner.rate,
    'signups', (select count(*) from public.referrals r where r.partner_id = v_partner.id and r.status = 'attributed'),
    'active_subscribers', (select count(*) from public.referrals r join public.subscriptions s on s.user_id = r.user_id
                            where r.partner_id = v_partner.id and r.status = 'attributed' and s.status = 'active'),
    'earned_cents',  coalesce((select sum(commission_cents) from public.commission_entries where partner_id = v_partner.id), 0),
    'unpaid_cents',  coalesce((select sum(commission_cents) from public.commission_entries where partner_id = v_partner.id and status <> 'paid'), 0),
    'paid_cents',    coalesce((select sum(commission_cents) from public.commission_entries where partner_id = v_partner.id and status = 'paid'), 0));
end $$;

-- Referred users shown by a short anonymous id only: no email, no name, no user id.
create or replace function public.partner_referrals()
returns table (anon_id text, signed_up_at timestamptz, subscription_status text)
language sql stable security definer set search_path = public as $$
  select substr(md5(r.user_id::text), 1, 8), r.signed_up_at, coalesce(s.status, 'none')
  from public.referrals r
  join public.partners p on p.id = r.partner_id and p.user_id = auth.uid()
  left join public.subscriptions s on s.user_id = r.user_id
  where r.status = 'attributed'
  order by r.signed_up_at desc;
$$;

-- One row per calendar quarter: what was earned and whether it has been paid.
create or replace function public.partner_statements()
returns table (period_start date, period_end date, earned_cents bigint, paid boolean, paid_at timestamptz, reference text)
language sql stable security definer set search_path = public as $$
  select ce.period_start, (ce.period_start + interval '3 months' - interval '1 day')::date,
         sum(ce.commission_cents)::bigint,
         coalesce(bool_and(ce.status = 'paid'), false),
         max(po.paid_at), max(po.reference)
  from public.commission_entries ce
  join public.partners p on p.id = ce.partner_id and p.user_id = auth.uid()
  left join public.payouts po on po.id = ce.payout_id
  group by ce.period_start
  order by ce.period_start desc;
$$;
revoke all on function public.partner_summary(), public.partner_referrals(), public.partner_statements() from public, anon;
grant execute on function public.partner_summary(), public.partner_referrals(), public.partner_statements() to authenticated;
