-- Sign-up failed with "Database error saving new user": the on_auth_user_created trigger function
-- referred to user_profiles without a schema or search_path, so under Supabase Auth's own search_path
-- it raised `relation "user_profiles" does not exist`. Qualify the table and pin the search_path.
create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.user_profiles (user_id, tier)
  values (new.id, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$function$;
