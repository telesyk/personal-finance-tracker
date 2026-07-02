-- Fix profiles RLS: the original "group members only" policy uses
-- `group_id = my_group_id()`, which evaluates to NULL = NULL (false) for
-- new users who have no group yet, blocking them from reading or updating
-- their own profile. Replace it with two targeted policies.

drop policy "group members only" on profiles;

-- Users can always read/write their own profile row.
create policy "own profile" on profiles
  for all using (id = auth.uid());

-- Group members can see each other's profiles (read-only cross-member access).
create policy "group members read" on profiles
  for select using (group_id = my_group_id() and group_id is not null);

-- ============================================================
-- create_group_and_join: atomically creates a group and links
-- the calling user's profile to it. SECURITY DEFINER bypasses
-- RLS on both `groups` (INSERT blocked for groupless users) and
-- `profiles` (UPDATE already fixed above, but kept atomic here).
-- ============================================================
create or replace function public.create_group_and_join(group_name text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  new_group_id uuid;
begin
  insert into public.groups (name, created_by)
  values (group_name, auth.uid())
  returning id into new_group_id;

  update public.profiles
  set group_id = new_group_id
  where id = auth.uid();

  return new_group_id;
end;
$$;
