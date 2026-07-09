-- The previous version of create_group_and_join returned success even when the
-- UPDATE profiles SET group_id affected 0 rows (silent failure). This caused a
-- redirect loop: no error shown on client, but dashboard still saw group_id=null
-- and bounced back to /onboarding.
--
-- Fix: move caller_id init to BEGIN (clearer execution order), add IF NOT FOUND
-- after the UPDATE so any future silent failure surfaces as a real error.

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

  -- Ensure profile row exists (idempotent: no-op if already present).
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

  if not found then
    raise exception 'Profile link failed — no profile row found for this user. Please sign out and sign back in.';
  end if;

  return new_group_id;
end;
$$;

grant execute on function public.create_group_and_join(text) to authenticated;
