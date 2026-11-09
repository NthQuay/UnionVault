-- Recommended-vendor outbound links, tracked through Union Vault.
-- NOT applied anywhere yet. Destinations live here (server-side), so the click endpoint can only
-- ever forward to a URL you put in this table — it is not an open redirect.

create table if not exists public.vendor_links (
  vendor_id      text not null check (vendor_id ~ '^[a-z0-9_-]{1,40}$'),
  link           text not null check (link in ('website','book','instagram')),
  url            text not null check (url ~ '^https://'),
  append_params  boolean not null default true,   -- add utm_source/utm_medium/utm_campaign + uvc click id
  active         boolean not null default true,
  updated_at     timestamptz not null default now(),
  primary key (vendor_id, link)
);

create table if not exists public.vendor_clicks (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     text not null,
  link          text not null,
  clicked_at    timestamptz not null default now(),
  referrer_host text,                 -- host of the page the click came from (never the full URL, never an IP)
  is_bot        boolean not null default false
);
create index if not exists vendor_clicks_vendor_idx on public.vendor_clicks (vendor_id, link, clicked_at desc);

alter table public.vendor_links  enable row level security;
alter table public.vendor_clicks enable row level security;
revoke all on public.vendor_links, public.vendor_clicks from anon, authenticated;
-- Only the click Edge Function (service role) writes; admins can read.
do $$ begin
  if to_regprocedure('public.is_admin()') is not null then
    execute 'create policy vendor_links_admin_read  on public.vendor_links  for select using (public.is_admin())';
    execute 'create policy vendor_clicks_admin_read on public.vendor_clicks for select using (public.is_admin())';
    execute 'grant select on public.vendor_links, public.vendor_clicks to authenticated';
  end if;
exception when duplicate_object then null; end $$;

-- Seed. The two Book online URL is NOT known yet — add it with the insert shown at the bottom.
insert into public.vendor_links (vendor_id, link, url) values
  ('storyline',  'website',   'https://storylineceremonies.com.au/'),
  ('jordanleef', 'instagram', 'https://www.instagram.com/jordan_leef_photography/')
on conflict (vendor_id, link) do nothing;

-- Once you have Storyline's booking link:
--   insert into public.vendor_links (vendor_id, link, url) values ('storyline','book','https://…')
--   on conflict (vendor_id, link) do update set url = excluded.url, updated_at = now();
--
-- Clicks per vendor and link, last 30 days:
--   select vendor_id, link, count(*) filter (where not is_bot) as clicks
--   from public.vendor_clicks where clicked_at > now() - interval '30 days' group by 1, 2 order by 1, 2;
