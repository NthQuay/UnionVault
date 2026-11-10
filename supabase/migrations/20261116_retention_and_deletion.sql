-- Retention and account deletion, to match the published Terms & Privacy Policy (November 2026):
--   * vendor-link click records are kept for up to 24 months, then deleted;
--   * referral / commission records are kept for accounting (7 years) but are de-identified when the user deletes
--     their account: the link to the person is removed, the financial record stays.
-- STATUS: applied to production on 2026-11-10.

-- Deleting a user must not be blocked by (or delete) a referral that commission rows point to.
alter table public.referrals alter column user_id drop not null;
alter table public.referrals drop constraint if exists referrals_user_id_fkey;
alter table public.referrals add constraint referrals_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- The partner's list keeps working for referrals whose user has since been de-identified.
create or replace function public.partner_referrals()
returns table (anon_id text, signed_up_at timestamptz, subscription_status text)
language sql stable security definer set search_path = public as $$
  select substr(md5(coalesce(r.user_id, r.id)::text), 1, 8), r.signed_up_at, coalesce(s.status, 'none')
  from public.referrals r
  join public.partners p on p.id = r.partner_id and p.user_id = auth.uid()
  left join public.subscriptions s on s.user_id = r.user_id
  where r.status = 'attributed'
  order by r.signed_up_at desc;
$$;

-- 24-month click retention, run monthly by pg_cron.
create or replace function public.purge_old_vendor_clicks() returns bigint
language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  delete from public.vendor_clicks where clicked_at < now() - interval '24 months';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.purge_old_vendor_clicks() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-old-vendor-clicks';
    perform cron.schedule('purge-old-vendor-clicks', '30 3 1 * *', 'select public.purge_old_vendor_clicks()');
  end if;
end $$;
