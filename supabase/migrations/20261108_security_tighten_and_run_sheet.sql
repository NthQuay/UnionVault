-- 1) public_run_sheet(uid): what the shared ?runsheet= page needs — names/date/venue plus ONLY the
--    timeline moments the couple marked as visible (pub = true). Works whether or not the website is published.
create or replace function public.public_run_sheet(uid uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case when not exists (select 1 from planner_data where user_id = uid) then null else jsonb_build_object(
    'event', coalesce((
      select jsonb_strip_nulls(jsonb_build_object(
        'partner1', p.data->'partner1', 'partner2', p.data->'partner2',
        'date', p.data->'date', 'venue', p.data->'venue'))
      from planner_data p where p.user_id = uid and p.section = 'event'), '{}'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(t)
      from planner_data p,
           jsonb_array_elements(case when jsonb_typeof(p.data)='array' then p.data else '[]'::jsonb end) t
      where p.user_id = uid and p.section = 'timeline' and (t->>'pub') = 'true'), '[]'::jsonb)
  ) end;
$function$;
grant execute on function public.public_run_sheet(uuid) to anon, authenticated;

-- 2) Anonymous direct reads of planner_data are limited to the four sections the published website needs.
--    (Everything else — guests, settings, families, wishingwell, budget, vendors … — is only reachable via RPCs.)
-- Rollback: drop policy ...; create policy "Public read published wedding site" on public.planner_data
--           for select to anon using (is_published_wedding(user_id));
drop policy if exists "Public read published wedding site" on public.planner_data;
create policy "Public read published wedding site" on public.planner_data
  for select to anon
  using (is_published_wedding(user_id) and section in ('website','event','timeline','inspo'));

-- 3) vendor_tokens was readable by everyone (`using (true)`); the vendor brief page uses the vendor_brief(token) RPC.
-- Rollback: create policy "public reads by token" on public.vendor_tokens for select to public using (true);
drop policy if exists "public reads by token" on public.vendor_tokens;
