-- The IF NOT FOUND guard in the previous version catches "0 rows matched" but
-- not "row matched, group_id was set to NULL". If new_group_id was somehow NULL
-- at UPDATE time (e.g. INSERT RETURNING silently returned nothing), the UPDATE
-- would write NULL into group_id, FOUND would be true, the guard would not fire,
-- and the function would return NULL — leaving profiles.group_id = NULL.
--
-- Fix: use RETURNING … INTO to capture the value actually committed, then assert
-- it equals new_group_id. Any divergence (including NULL) raises a clear error.

create or replace function public.create_group_and_join(group_name text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  new_group_id  uuid;
  caller_id     uuid;
  committed_gid uuid;
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

  -- RETURNING lets us read back exactly what was committed, not just whether
  -- a row was found. committed_gid stays NULL if 0 rows were updated.
  update public.profiles
  set group_id = new_group_id
  where id = caller_id
  returning group_id into committed_gid;

  if committed_gid is distinct from new_group_id then
    raise exception 'Profile link failed — group_id not committed (expected %, got %)',
      new_group_id, committed_gid;
  end if;

  return new_group_id;
end;
$$;

grant execute on function public.create_group_and_join(text) to authenticated;
