-- Deletes the current user's group and all associated data.
-- Only succeeds if the caller is the sole member of the group.
CREATE OR REPLACE FUNCTION delete_my_group()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  gid uuid;
  member_count int;
BEGIN
  SELECT group_id INTO gid FROM public.profiles WHERE id = auth.uid();
  IF gid IS NULL THEN
    RAISE EXCEPTION 'User has no group';
  END IF;

  SELECT count(*) INTO member_count FROM public.profiles WHERE group_id = gid;
  IF member_count > 1 THEN
    RAISE EXCEPTION 'Cannot delete a group with multiple members';
  END IF;

  -- Clear group membership first to avoid FK conflicts during cascade
  UPDATE public.profiles SET group_id = NULL WHERE group_id = gid;
  DELETE FROM public.transactions WHERE group_id = gid;
  DELETE FROM public.wallets WHERE group_id = gid;
  DELETE FROM public.categories WHERE group_id = gid;
  DELETE FROM public.groups WHERE id = gid;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_my_group() TO authenticated;
