-- rsvp_page(uid): everything the stand-alone RSVP page (the link in invites) needs for one couple,
-- WITHOUT requiring the wedding website to be published — a couple can take RSVPs without using the
-- website at all. The link carries the couple's id, which is unguessable.
--
-- It returns only what the RSVP form uses:
--   website : theme + RSVP settings + slug/published/title (not the site's story/photos/etc.)
--   event   : the event section (names, date, venue)
--   extras  : same guest names/groupings, meal settings and wishing well (minus contributions) that
--             public_wedding_extras(uid) returns for a published site.
-- Nothing else (budget, vendors, checklist, guest emails/phones/addresses, contributions) is exposed.
create or replace function public.rsvp_page(uid uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case when not exists (select 1 from planner_data where user_id = uid) then null else jsonb_build_object(
    'website', coalesce((
      select jsonb_strip_nulls(jsonb_build_object(
        'theme', p.data->'theme', 'rsvp', p.data->'rsvp', 'slug', p.data->'slug',
        'published', p.data->'published', 'title', p.data->'title'))
      from planner_data p where p.user_id = uid and p.section = 'website'), '{}'::jsonb),
    'event', coalesce((select p.data from planner_data p where p.user_id = uid and p.section = 'event'), '{}'::jsonb),
    'extras', jsonb_build_object(
      'guests', coalesce((
        select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'id', g->'id', 'name', g->'name', 'listType', g->'listType',
          'coupleId', g->'coupleId', 'plusOneId', g->'plusOneId', 'ageBand', g->'ageBand')))
        from planner_data p,
             jsonb_array_elements(case when jsonb_typeof(p.data)='array' then p.data else '[]'::jsonb end) g
        where p.user_id = uid and p.section = 'guests'), '[]'::jsonb),
      'families', coalesce((
        select jsonb_agg(jsonb_build_object('id', f->'id', 'memberIds', f->'memberIds', 'kind', f->'kind'))
        from planner_data p,
             jsonb_array_elements(case when jsonb_typeof(p.data)='array' then p.data else '[]'::jsonb end) f
        where p.user_id = uid and p.section = 'families'), '[]'::jsonb),
      'settings', coalesce((
        select jsonb_strip_nulls(jsonb_build_object(
          'mealChoiceOn', p.data->'mealChoiceOn', 'mealOptions', p.data->'mealOptions',
          'childrenMealOn', p.data->'childrenMealOn', 'childrenMealOptions', p.data->'childrenMealOptions',
          'highChairOn', p.data->'highChairOn',
          'rsvpEmailOn', p.data->'rsvpEmailOn'))
        from planner_data p where p.user_id = uid and p.section = 'settings'), '{}'::jsonb),
      'wishingwell', coalesce((
        select p.data - 'contributions'
        from planner_data p where p.user_id = uid and p.section = 'wishingwell'), '{}'::jsonb)
    )
  ) end;
$function$;

grant execute on function public.rsvp_page(uuid) to anon, authenticated;
