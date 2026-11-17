-- DRAFT — NOT applied to the live project yet. Written for review alongside the Storyline
-- referral-commission proposal; apply only once the vendor agreement is signed and the
-- Privacy Policy amendment (index.html, "What Vendors Can See") has gone live.
--
-- Two things:
--   1. A real bug fix, independent of the new feature: vendor-click/index.ts has always
--      tried to insert a `user_id` into vendor_clicks for signed-in couples' clicks, but the
--      column never existed — PostgREST rejects the whole insert, and because the write is
--      wrapped in a best-effort .catch(), every signed-in couple's click has been silently
--      dropped rather than logged. Adding the column fixes that for ALL vendors, not just
--      commission partners — right now the click counts vendors already see may be missing
--      a meaningful share of their real traffic.
--   2. An admin-only export that joins a vendor's clicks to the couple who made them, for
--      vendors with a signed, written referral-commission agreement only. Gated by the
--      same public.is_admin() used by vendor_clicks_admin_read / vendor_links_admin_read.

alter table public.vendor_clicks
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists vendor_clicks_user_idx on public.vendor_clicks (user_id) where user_id is not null;

-- admin_vendor_referral_export(vendor_id, from_ts, to_ts)
-- Returns one row per click in range for that vendor, with the clicking couple's name/email
-- where the click carried a valid account token. Raises if the caller isn't an admin — do
-- not relax this; this function is the one place in the schema that deliberately re-attaches
-- identity to a click, which is otherwise anonymous-by-design everywhere else in the app.
create or replace function public.admin_vendor_referral_export(vendor text, from_ts timestamptz, to_ts timestamptz)
returns table (
  clicked_at timestamptz,
  link       text,
  partner1   text,
  partner2   text,
  email      text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    c.clicked_at,
    c.link,
    nullif(trim(ev.data->>'partner1'), ''),
    nullif(trim(ev.data->>'partner2'), ''),
    coalesce(
      nullif(trim(st.data->>'userEmail'), ''),
      (select u.email from auth.users u where u.id = c.user_id)
    )
  from public.vendor_clicks c
  left join public.planner_data ev on ev.user_id = c.user_id and ev.section = 'event'
  left join public.planner_data st on st.user_id = c.user_id and st.section = 'settings'
  where public.is_admin()                       -- raises nothing; just returns no rows for non-admins, same style as RLS
    and c.vendor_id = vendor
    and c.clicked_at >= from_ts and c.clicked_at < to_ts
    and not c.is_bot
    and c.user_id is not null                    -- a click we can't attribute to an account can never be matched to a booking anyway
  order by c.clicked_at desc;
$function$;

revoke all on function public.admin_vendor_referral_export(text, timestamptz, timestamptz) from anon, authenticated;
grant execute on function public.admin_vendor_referral_export(text, timestamptz, timestamptz) to authenticated;
-- authenticated can call it, but the is_admin() check inside means a non-admin just gets zero rows back.
