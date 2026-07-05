-- create_group_and_join was missing an explicit GRANT EXECUTE.
-- Supabase/PostgREST does not expose functions to authenticated users
-- unless the privilege is explicitly granted, regardless of SECURITY DEFINER.
grant execute on function public.create_group_and_join(text) to authenticated;
