-- The RETURNING clause added in 20260709020000 triggers the SELECT RLS policy on
-- profiles. That policy includes "group members read" which calls my_group_id(),
-- which does SELECT group_id FROM profiles — applying the same SELECT policy again,
-- calling my_group_id() again: infinite recursion → "stack depth limit exceeded".
--
-- Fix: drop RETURNING entirely. Instead, guard against NULL new_group_id explicitly
-- before the UPDATE (catches "INSERT RETURNING produced no ID") and keep IF NOT FOUND
-- after the UPDATE (catches "0 rows updated"). Both failure modes now surface as
-- clear exceptions without triggering the recursive policy path.

create or replace function public.create_group_and_join(group_name text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  new_group_id uuid;
  caller_id    uuid;
begin
  caller_id := auth.uid();

  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Ensure profile row exists (idempotent — no-op if already present).
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

  -- Explicit NULL guard: if the INSERT somehow returned no ID, fail loudly
  -- before writing NULL into group_id (which IF NOT FOUND would not catch).
  if new_group_id is null then
    raise exception 'Group creation failed — INSERT returned no ID for caller %', caller_id;
  end if;

  update public.profiles
  set group_id = new_group_id
  where id = caller_id;

  if not found then
    raise exception 'Profile link failed — no profile row found for caller %', caller_id;
  end if;

  return new_group_id;
end;
$$;

grant execute on function public.create_group_and_join(text) to authenticated;
