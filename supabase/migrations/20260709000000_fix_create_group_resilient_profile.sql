-- create_group_and_join was failing with a FK violation
-- (groups_created_by_fkey → profiles.id) when the calling user's profiles row
-- was missing. This happens when the handle_new_user trigger was not yet
-- applied when the user registered, or if the trigger failed silently.
--
-- Fix: upsert the profile from auth.users metadata before inserting the group.
-- ON CONFLICT DO NOTHING makes it a no-op for users whose profile already exists.
-- An explicit auth.uid() null-guard surfaces unauthenticated calls clearly.

create or replace function public.create_group_and_join(group_name text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  new_group_id uuid;
  caller_id    uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Ensure profile row exists. Idempotent: no-op if it already does.
  insert into public.profiles (id, display_name)
  select
    caller_id,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      split_part(u.email, '@', 1),
      'User'
    )
  from auth.users u
  where u.id = caller_id
  on conflict (id) do nothing;

  insert into public.groups (name, created_by)
  values (group_name, caller_id)
  returning id into new_group_id;

  update public.profiles
  set group_id = new_group_id
  where id = caller_id;

  return new_group_id;
end;
$$;

grant execute on function public.create_group_and_join(text) to authenticated;
