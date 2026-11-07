-- Session 18
-- 1. vendor_brief(token): new 'inspo' section — the inspiration items attached to the
--    vendor's card (vendors[].inspoIds → inspo.items), in the card's order. Only returned
--    when the brief link was created with the Inspiration section. Legacy inline data:
--    images are not sent (image = null); storage ids / web URLs are.
-- 2. rsvp_page(uid) and public_wedding_extras(uid): pass through settings.mealDietaryOn
--    (false = couple hid the "Dietary requirements" meal option on the RSVP form).
-- Everything else in the three functions is unchanged.
-- Rollback: re-run the previous definitions (vendor_brief from the live DB before this
-- change; rsvp_page in 20261107_rsvp_page_rpc.sql) — removing the added lines is enough.

CREATE OR REPLACE FUNCTION public.vendor_brief(t text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'vendor', jsonb_build_object(
      'token', v.token,
      'couple_id', v.couple_id,
      'vendor_name', v.vendor_name,
      'sections', to_jsonb(v.sections),
      'expires_at', v.expires_at
    ),
    'event', coalesce(
      (select p.data from planner_data p
       where p.user_id = v.couple_id and p.section = 'event'),
      '{}'::jsonb
    ),
    'theme', coalesce(
      (select p.data->'theme' from planner_data p
       where p.user_id = v.couple_id and p.section = 'website'),
      '{}'::jsonb
    ),
    'guestCount', (
      select jsonb_build_object(
        'attending', count(*) filter (where g->>'rsvp' = 'attending'),
        'declined',  count(*) filter (where g->>'rsvp' = 'declined'),
        'awaiting',  count(*) filter (where coalesce(g->>'rsvp','awaiting') = 'awaiting'),
        'total',     count(*)
      )
      from planner_data p,
           jsonb_array_elements(case when jsonb_typeof(p.data)='array' then p.data else '[]'::jsonb end) g
      where p.user_id = v.couple_id and p.section = 'guests'
        and coalesce(g->>'listType','A') <> 'B' and coalesce(g->>'name','') <> ''
    ),
    'vendorCard', (
      select jsonb_strip_nulls(jsonb_build_object(
        'category',  x->'category',
        'setupTime', x->'setupTime',
        'email',     x->'email',
        'contact',   x->'contact',
        'phone',     x->'phone'
      ))
      from planner_data p,
           jsonb_array_elements(case when jsonb_typeof(p.data)='array' then p.data else '[]'::jsonb end) x
      where p.user_id = v.couple_id and p.section = 'vendors'
        and (x->>'business' = v.vendor_name or x->>'contact' = v.vendor_name)
      limit 1
    ),
    'sectionData', (
      select coalesce(jsonb_object_agg(sec, content), '{}'::jsonb)
      from (
        select 'timeline'::text as sec,
               coalesce((
                 select jsonb_agg(
                   jsonb_build_object(
                     'time', e->>'time', 'title', e->>'title', 'cat', e->>'cat',
                     'location', e->>'location', 'notes', e->>'notes', 'who', e->>'who'
                   ) order by e->>'time'
                 )
                 from planner_data p,
                      jsonb_array_elements(case when jsonb_typeof(p.data)='array' then p.data else '[]'::jsonb end) e
                 where p.user_id = v.couple_id and p.section = 'timeline'
                   and coalesce((e->>'pub')::boolean, true) = true
               ), '[]'::jsonb) as content
        where 'timeline' = any(v.sections)
        union all
        select 'budget'::text,
               coalesce((
                 select p.data->'items'
                 from planner_data p
                 where p.user_id = v.couple_id and p.section = 'budget'
               ), '[]'::jsonb)
        where 'budget' = any(v.sections)
        union all
        select 'checklist'::text,
               coalesce((
                 select jsonb_agg(
                   jsonb_build_object(
                     'id', e->>'id', 'text', e->>'text', 'done', (e->>'done')::boolean,
                     'category', e->>'category', 'dueDate', e->>'dueDate', 'notes', e->>'notes'
                   ) order by e->>'category', e->>'dueDate'
                 )
                 from planner_data p,
                      jsonb_array_elements(case when jsonb_typeof(p.data)='array' then p.data else '[]'::jsonb end) e
                 where p.user_id = v.couple_id and p.section = 'checklist'
               ), '[]'::jsonb)
        where 'checklist' = any(v.sections)
        union all
        select 'contacts'::text,
               coalesce((
                 select jsonb_agg(
                   jsonb_build_object(
                     'business', x->>'business', 'contact', x->>'contact',
                     'email', x->>'email', 'phone', x->>'phone',
                     'category', x->>'category', 'address', x->>'address',
                     'website', x->>'website'
                   )
                 )
                 from planner_data p,
                      jsonb_array_elements(case when jsonb_typeof(p.data)='array' then p.data else '[]'::jsonb end) x
                 where p.user_id = v.couple_id and p.section = 'vendors'
                   and coalesce(x->>'status','') not in ('removed','declined')
                   and coalesce(x->>'business','') <> ''
                   and x->>'business' <> v.vendor_name
               ), '[]'::jsonb)
        where 'contacts' = any(v.sections)
        union all
        select 'notes'::text,
               coalesce((
                 select jsonb_build_object(
                   'notes', coalesce(x->>'notes',''),
                   'brief', coalesce(x->>'brief','')
                 )
                 from planner_data p,
                      jsonb_array_elements(case when jsonb_typeof(p.data)='array' then p.data else '[]'::jsonb end) x
                 where p.user_id = v.couple_id and p.section = 'vendors'
                   and (x->>'business' = v.vendor_name or x->>'contact' = v.vendor_name)
                 limit 1
               ), '{}'::jsonb)
        where 'notes' = any(v.sections)
        union all
        select 'inspo'::text,
               coalesce((
                 select jsonb_agg(
                   jsonb_build_object(
                     'id', i->>'id', 'title', i->>'title', 'category', i->>'category',
                     'image', case when coalesce(i->>'image','') like 'data:%' then null else i->>'image' end,
                     'notes', i->>'notes', 'link', i->>'link'
                   ) order by ids.n
                 )
                 from (
                   select x
                   from planner_data pv,
                        jsonb_array_elements(case when jsonb_typeof(pv.data)='array' then pv.data else '[]'::jsonb end) x
                   where pv.user_id = v.couple_id and pv.section = 'vendors'
                     and (x->>'business' = v.vendor_name or x->>'contact' = v.vendor_name)
                   limit 1
                 ) vc,
                 jsonb_array_elements_text(case when jsonb_typeof(vc.x->'inspoIds')='array' then vc.x->'inspoIds' else '[]'::jsonb end) with ordinality ids(iid, n),
                 planner_data pi,
                 jsonb_array_elements(case when jsonb_typeof(pi.data->'items')='array' then pi.data->'items' else '[]'::jsonb end) i
                 where pi.user_id = v.couple_id and pi.section = 'inspo'
                   and i->>'id' = ids.iid
               ), '[]'::jsonb)
        where 'inspo' = any(v.sections)
      ) secs
    )
  )
  from vendor_tokens v
  where v.token = t and coalesce(t,'') <> ''
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.rsvp_page(uid uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
          'highChairOn', p.data->'highChairOn', 'mealDietaryOn', p.data->'mealDietaryOn',
          'rsvpEmailOn', p.data->'rsvpEmailOn'))
        from planner_data p where p.user_id = uid and p.section = 'settings'), '{}'::jsonb),
      'wishingwell', coalesce((
        select p.data - 'contributions'
        from planner_data p where p.user_id = uid and p.section = 'wishingwell'), '{}'::jsonb)
    )
  ) end;
$function$;

CREATE OR REPLACE FUNCTION public.public_wedding_extras(uid uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when not public.is_published_wedding(uid) then null else jsonb_build_object(
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
        'highChairOn', p.data->'highChairOn', 'mealDietaryOn', p.data->'mealDietaryOn',
        'rsvpEmailOn', p.data->'rsvpEmailOn'))
      from planner_data p where p.user_id = uid and p.section = 'settings'), '{}'::jsonb),
    'wishingwell', coalesce((
      select p.data - 'contributions'
      from planner_data p where p.user_id = uid and p.section = 'wishingwell'), '{}'::jsonb)
  ) end;
$function$;
