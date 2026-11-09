-- Affiliate system — access-control and attribution tests.
-- Run on a Supabase BRANCH / local database (never production) in the SQL editor, AFTER applying
-- 20261110_affiliate_schema.sql. Everything happens inside one transaction that is rolled back,
-- so nothing is left behind. Any failed check raises an exception; success ends with "ALL AFFILIATE TESTS PASSED".
begin;

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create or replace function pg_temp.as_service() returns void language plpgsql as $$
begin execute 'reset role'; end $$;
create or replace function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'TEST FAILED: %', msg; end if; end $$;

-- fixtures (as the superuser) ----------------------------------------------------------
insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'partner-a@example.test', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000b1', 'partner-b@example.test', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000c1', 'newuser-1@example.test', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000c2', 'newuser-2@example.test', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000c3', 'old-user@example.test',  now() - interval '10 days'),
  ('00000000-0000-0000-0000-0000000000c4', 'late-click@example.test', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.test',     now() - interval '30 days');
insert into public.app_admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');
insert into public.partners (id, user_id, code, name, contact_email) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'partner-a', 'Partner A', 'partner-a@example.test'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'partner-b', 'Partner B', 'partner-b@example.test');
insert into public.referrals (id, user_id, partner_id, code, clicked_at, signed_up_at) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000a', 'partner-a', now() - interval '2 hours', now() - interval '1 hour');
insert into public.commission_entries (partner_id, referral_id, kind, stripe_event_id, stripe_invoice_id, gross_cents, tax_cents, basis, rate, commission_cents, occurred_at, period_start)
values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'payment', 'evt_test_1', 'in_test_1', 1299, 118, 'ex_tax', 0.25, 295, now(), public.affiliate_quarter_start(now()));

-- 1. partners see only their own rows ----------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.commission_entries) = 1, 'partner A should see exactly their own commission entry');
select pg_temp.check((select count(*) from public.partners) = 1, 'partner A should see only their own partner row');
select pg_temp.as_service();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.check((select count(*) from public.commission_entries) = 0, 'partner B must not see partner A commission entries');
select pg_temp.check((select count(*) from public.referrals) = 0, 'partners cannot read the referrals table directly');
select pg_temp.check((select count(*) from public.partner_referrals()) = 0, 'partner B sees no referred users');
select pg_temp.as_service();

-- 2. partner A sees an anonymised referral list (no email / user id) ----------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.partner_referrals()) = 1, 'partner A sees their one referral');
select pg_temp.check((select (partner_summary()->>'earned_cents')::int) = 295, 'summary earned_cents');
select pg_temp.check((select anon_id from public.partner_referrals() limit 1) !~ '@', 'anon id must not contain an email');
select pg_temp.as_service();

-- 3. nobody can write the ledger with a user token ------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  begin
    insert into public.commission_entries (partner_id, referral_id, kind, stripe_event_id, gross_cents, basis, rate, commission_cents, occurred_at, period_start)
    values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'payment', 'evt_hack', 100, 'gross', 1, 100, now(), current_date);
    raise exception 'TEST FAILED: a partner was able to insert into commission_entries';
  exception when insufficient_privilege then null; end;
  begin
    update public.partners set rate = 1 where id = '10000000-0000-0000-0000-00000000000a';
    raise exception 'TEST FAILED: a partner was able to change their own rate';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.as_service();

-- 4. admin sees everything ----------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.check((select count(*) from public.partners) = 2, 'admin sees both partners');
select pg_temp.check((select count(*) from public.referrals) = 1, 'admin sees referrals');
select pg_temp.as_service();

-- 5. claim_referral rules --------------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.check((public.claim_referral('partner-a', now() - interval '2 hours')->>'status') = 'attributed', 'new account is attributed');
select pg_temp.check((public.claim_referral('partner-b', now() - interval '2 hours')->>'status') = 'already_claimed', 'second claim must not overwrite');
select pg_temp.as_service();
select pg_temp.check((select code from public.referrals where user_id = '00000000-0000-0000-0000-0000000000c2') = 'partner-a', 'first referral kept');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select pg_temp.check((public.claim_referral('partner-a', now() - interval '1 day')->>'error') = 'existing_account', 'account older than the window is refused');
select pg_temp.as_service();

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select pg_temp.check((public.claim_referral('partner-a', now())->>'error') = 'existing_account', 'a click made after the account existed is refused');
select pg_temp.check((public.claim_referral('no-such-code', now() - interval '2 hours')->>'error') = 'invalid_code', 'unknown code is refused');
select pg_temp.as_service();

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.as_service();
-- self-referral: partner A's own login claiming partner A's code (make the account look new first)
update auth.users set created_at = now() - interval '1 hour' where id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((public.claim_referral('partner-a', now() - interval '2 hours')->>'status') = 'excluded_self', 'self-referral is excluded');
select pg_temp.as_service();

select 'ALL AFFILIATE TESTS PASSED' as result;
rollback;
