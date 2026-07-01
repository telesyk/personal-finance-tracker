-- Auto-create a profiles row whenever a new user signs up.
-- Handles both email/password signups and OAuth (e.g. Google).
-- display_name uses full_name from OAuth metadata when available,
-- falls back to the email prefix for plain email signups.
-- group_id is left null — filled in during onboarding.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
