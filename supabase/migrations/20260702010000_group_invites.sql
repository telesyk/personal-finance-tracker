create table public.group_invites (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  token      uuid not null unique default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz,
  used_by    uuid references public.profiles(id) on delete set null
);

alter table public.group_invites enable row level security;

-- Group members can see and create invites for their own group
create policy "group members read" on public.group_invites
  for select using (group_id = my_group_id());

create policy "group members insert" on public.group_invites
  for insert with check (group_id = my_group_id());

-- ============================================================
-- get_invite_info: validates a token and returns the group name.
-- SECURITY DEFINER so unauthenticated users can call it without
-- having direct SELECT access to group_invites or groups.
-- ============================================================
create or replace function public.get_invite_info(invite_token uuid)
returns table(group_name text, is_valid boolean)
language plpgsql
security definer set search_path = ''
as $$
begin
  return query
  select g.name::text, true::boolean
  from public.group_invites gi
  join public.groups g on g.id = gi.group_id
  where gi.token = invite_token
    and gi.used_at is null
    and gi.expires_at > now();
end;
$$;

grant execute on function public.get_invite_info(uuid) to anon, authenticated;

-- ============================================================
-- generate_group_invite: creates a 7-day invite for the
-- calling user's group, returns the token UUID.
-- ============================================================
create or replace function public.generate_group_invite()
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  new_token      uuid;
  caller_group   uuid;
begin
  select group_id into caller_group
  from public.profiles
  where id = auth.uid();

  if caller_group is null then
    raise exception 'You must belong to a group to create invites.';
  end if;

  insert into public.group_invites (group_id, created_by)
  values (caller_group, auth.uid())
  returning token into new_token;

  return new_token;
end;
$$;

grant execute on function public.generate_group_invite() to authenticated;

-- ============================================================
-- join_group_via_invite: validates token and joins the group.
-- Marks the token as used atomically.
-- ============================================================
create or replace function public.join_group_via_invite(invite_token uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  invite record;
begin
  select * into invite
  from public.group_invites
  where token = invite_token
    and used_at is null
    and expires_at > now();

  if not found then
    raise exception 'Invite is invalid or has expired.';
  end if;

  if (select group_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'You already belong to a group.';
  end if;

  update public.profiles
  set group_id = invite.group_id
  where id = auth.uid();

  update public.group_invites
  set used_at = now(), used_by = auth.uid()
  where id = invite.id;

  return invite.group_id;
end;
$$;

grant execute on function public.join_group_via_invite(uuid) to authenticated;
