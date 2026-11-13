-- vendor_brief(t): add 'coupleEmail' — the couple's own reply-to address (settings.userEmail,
-- falling back to their login email), so the brief's "Contact" block can show who the vendor
-- should actually get in touch with. It previously showed the VENDOR's own stored contact
-- name/email back at them (matchedVendor.contact/.email) — often blank, since not every
-- vendor row has a contact name or email filled in, and even when it isn't, showing a vendor
-- their own details isn't a "contact" for anyone. The couple's name was already available
-- client-side from `event`; only the email was missing from this RPC's payload.
-- Rollback: re-run the previous definition (20261109_inspo_brief_and_meal_diet.sql).

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
    'coupleEmail', coalesce(
      (select nullif(trim(p.data->>'userEmail'), '') from planner_data p
       where p.user_id = v.couple_id and p.section = 'settings'),
      (select u.email from auth.users u where u.id = v.couple_id)
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
