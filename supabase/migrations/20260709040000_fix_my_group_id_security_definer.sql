-- Root cause of infinite recursion on all profiles SELECTs:
--
-- "group members read" policy on profiles calls my_group_id().
-- my_group_id() does SELECT group_id FROM profiles.
-- That SELECT fires "group members read" again → calls my_group_id() again → infinite loop.
-- PostgreSQL exhausts the stack (error 54001) before it can return a result.
--
-- This explains why every profile read — server-side in dashboard/onboarding pages AND
-- client-side in the form — was silently returning null, making group_id always appear
-- null even after create_group_and_join successfully committed it to the DB.
--
-- Fix: SECURITY DEFINER on my_group_id() so its internal SELECT runs as the function
-- owner (postgres, which has BYPASSRLS). The inner profiles query bypasses RLS entirely,
-- breaking the recursion chain. The policies that call my_group_id() still run as the
-- authenticated user — only the function's own internal read is elevated.

create or replace function public.my_group_id()
returns uuid language sql stable
security definer set search_path = ''
as $$ select group_id from public.profiles where id = auth.uid() $$;
