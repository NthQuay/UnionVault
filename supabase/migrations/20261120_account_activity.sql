-- Account activity log for the portal admin: every new couple account, and each subscription step after it
-- (trial / subscribed / plan / payment / coupon / cancel / resume / cancelled). Admin-only: RLS on, no policies,
-- reads go through is_admin()-gated functions. Account deletion de-identifies the log (email dropped, user_id nulled).

create extension if not exists pg_net with schema extensions;

create table if not exists public.account_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  email           text,
  kind            text not null check (kind in ('signup','trial_started','subscribed','plan_changed','payment','payment_failed','cancel_requested','resumed','cancelled','coupon')),
  plan_months     integer,
  amount_cents    bigint,
  coupon          text,
  detail          jsonb not null default '{}'::jsonb,
  stripe_event_id text unique,
  occurred_at     timestamptz not null default now(),
  emailed_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists account_events_user_idx on public.account_events (user_id, occurred_at desc);
create index if not exists account_events_time_idx on public.account_events (occurred_at desc);
alter table public.account_events enable row level security;
revoke all on public.account_events from anon, authenticated;

-- ── New account: log it and ask the notify function to email the admin ──────────────────────────
create or replace function public.account_signup_logged() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare ev uuid;
begin
  -- vendor-portal logins are created by the approval flow with this flag; they are not couples
  if coalesce(new.raw_user_meta_data->>'vendor_portal', '') = 'true' then return new; end if;
  insert into public.account_events (user_id, email, kind, occurred_at, detail)
  values (new.id, lower(new.email), 'signup', coalesce(new.created_at, now()),
          jsonb_build_object('provider', coalesce(new.raw_app_meta_data->>'provider', 'email')))
  returning id into ev;
  begin
    perform net.http_post(
      url := 'https://hzafdlfprtzfxtyaebmc.supabase.co/functions/v1/account-activity-notify',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('id', ev));
  exception when others then null;   -- never block a sign-up over an alert
  end;
  return new;
exception when others then
  return new;                         -- logging must never block a sign-up
end $$;
drop trigger if exists on_auth_user_created_log on auth.users;
create trigger on_auth_user_created_log after insert on auth.users
  for each row execute function public.account_signup_logged();

-- De-identify the log when an account is deleted.
create or replace function public.account_events_deidentify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.account_events set email = null, detail = '{}'::jsonb where user_id = old.id;
  return old;
end $$;
drop trigger if exists on_auth_user_deleted_log on auth.users;
create trigger on_auth_user_deleted_log before delete on auth.users
  for each row execute function public.account_events_deidentify();

-- ── Called by the Stripe webhook (service role only) ────────────────────────────────────────────
create or replace function public.account_event_record(
  p_event_id text, p_kind text, p_customer_id text, p_user_id uuid default null,
  p_plan_months integer default null, p_amount_cents bigint default null, p_coupon text default null,
  p_detail jsonb default '{}'::jsonb, p_occurred_at timestamptz default now()
) returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := p_user_id; em text; ev uuid;
begin
  if uid is null and p_customer_id is not null then
    select user_id into uid from public.user_profiles where stripe_customer_id = p_customer_id limit 1;
    if uid is null then select user_id into uid from public.subscriptions where stripe_customer_id = p_customer_id limit 1; end if;
  end if;
  if uid is null then return null; end if;   -- not one of ours (e.g. a vendor test charge)
  select lower(email) into em from auth.users where id = uid;
  insert into public.account_events (user_id, email, kind, plan_months, amount_cents, coupon, detail, stripe_event_id, occurred_at)
  values (uid, em, p_kind, p_plan_months, p_amount_cents, nullif(p_coupon, ''), coalesce(p_detail, '{}'::jsonb), p_event_id, coalesce(p_occurred_at, now()))
  on conflict (stripe_event_id) do nothing
  returning id into ev;
  return ev;
end $$;
revoke all on function public.account_event_record(text, text, text, uuid, integer, bigint, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.account_event_record(text, text, text, uuid, integer, bigint, text, jsonb, timestamptz) to service_role;

-- ── Admin reads ─────────────────────────────────────────────────────────────────────────────────
-- Current status of every couple account (the main list).
create or replace function public.admin_accounts() returns table (
  user_id uuid, email text, signed_up_at timestamptz, phase text, plan_months integer,
  subscribed_at timestamptz, coupons text[], last_activity timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  return query
  select u.id, lower(u.email)::text, u.created_at,
    case
      when s.id is not null and s.status = 'trialing' then 'trial'
      when s.id is not null and s.status in ('active') and s.cancel_at_period_end then 'cancelling'
      when s.id is not null and s.status = 'active' then 'paying'
      when s.id is not null and s.status = 'past_due' then 'past_due'
      when s.id is not null then 'cancelled'
      when p.granted_access_until is not null and p.granted_access_until > now() then 'granted'
      when p.trial_started is not null and p.trial_started + interval '14 days' > now() then 'trial'
      else 'free'
    end,
    (select e.plan_months from public.account_events e where e.user_id = u.id and e.plan_months is not null order by e.occurred_at desc limit 1),
    (select min(e.occurred_at) from public.account_events e where e.user_id = u.id and e.kind in ('subscribed','trial_started')),
    coalesce((select array_agg(distinct e.coupon) from public.account_events e where e.user_id = u.id and e.coupon is not null), '{}'::text[]),
    coalesce((select max(e.occurred_at) from public.account_events e where e.user_id = u.id), u.created_at)
  from auth.users u
  left join public.user_profiles p on p.user_id = u.id
  left join lateral (select * from public.subscriptions x where x.user_id = u.id order by x.created_at desc limit 1) s on true
  where not exists (select 1 from public.partners pa where pa.user_id = u.id)
    and not exists (select 1 from public.app_admins a where a.user_id = u.id)
  order by u.created_at desc;
end $$;
revoke all on function public.admin_accounts() from public, anon;
grant execute on function public.admin_accounts() to authenticated;

-- One account: summary plus the full running log, newest first.
create or replace function public.admin_account_detail(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  select jsonb_build_object(
    'user_id', a.user_id, 'email', a.email, 'signed_up_at', a.signed_up_at, 'phase', a.phase, 'plan_months', a.plan_months,
    'subscribed_at', a.subscribed_at, 'coupons', to_jsonb(a.coupons),
    'trial_ends', (select coalesce(s.trial_end, p.trial_started + interval '14 days')
                   from public.user_profiles p left join public.subscriptions s on s.user_id = p.user_id where p.user_id = a.user_id limit 1),
    'renews_or_ends', (select s.current_period_end from public.subscriptions s where s.user_id = a.user_id order by s.created_at desc limit 1),
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'occurred_at', e.occurred_at, 'plan_months', e.plan_months,
                          'amount_cents', e.amount_cents, 'coupon', e.coupon, 'detail', e.detail) order by e.occurred_at desc)
                        from public.account_events e where e.user_id = a.user_id), '[]'::jsonb))
  into r from public.admin_accounts() a where a.user_id = p_user;
  return r;
end $$;
revoke all on function public.admin_account_detail(uuid) from public, anon;
grant execute on function public.admin_account_detail(uuid) to authenticated;

-- ── Backfill: existing accounts and subscriptions (no emails for these) ──────────────────────────
insert into public.account_events (user_id, email, kind, occurred_at, emailed_at, detail)
select u.id, lower(u.email), 'signup', u.created_at, now(), jsonb_build_object('provider', coalesce(u.raw_app_meta_data->>'provider','email'), 'backfill', true)
from auth.users u
where not exists (select 1 from public.account_events e where e.user_id = u.id and e.kind = 'signup')
  and not exists (select 1 from public.partners pa where pa.user_id = u.id)
  and not exists (select 1 from public.app_admins a where a.user_id = u.id);

insert into public.account_events (user_id, email, kind, occurred_at, emailed_at, detail)
select s.user_id, lower(u.email), 'subscribed', s.created_at, now(), jsonb_build_object('backfill', true, 'status', s.status)
from public.subscriptions s join auth.users u on u.id = s.user_id
where not exists (select 1 from public.account_events e where e.user_id = s.user_id and e.kind = 'subscribed');

-- Follow-up (applied as account_activity_trial_fix): the free trial now starts when someone subscribes
-- (Stripe trialing), not at signup, so "trial" in admin_accounts() comes from the subscription only and
-- admin_account_detail().trial_ends is the subscription's trial_end. See compute_tier().
