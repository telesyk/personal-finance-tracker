-- ============================================================
-- Stage 8: Wallet Ownership Model
-- Wallets belong to users; groups get access only when a wallet
-- is explicitly shared (group_id set). Joining a group no longer
-- exposes any wallets automatically.
-- ============================================================

-- 1. Make group_id nullable on wallets and transactions
ALTER TABLE wallets ALTER COLUMN group_id DROP NOT NULL;
ALTER TABLE transactions ALTER COLUMN group_id DROP NOT NULL;

-- 2. Add owner_id column to groups for live admin tracking
--    created_by remains as historical audit field
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

UPDATE groups SET owner_id = created_by WHERE owner_id IS NULL;

-- 3. Update RLS on wallets:
--    owner has full control; group members can only read/write shared wallets,
--    but cannot INSERT (create) wallets or DELETE them — only owners can
DROP POLICY IF EXISTS "group wallets" ON wallets;

CREATE POLICY "wallet select" ON wallets
  FOR SELECT USING (
    owner_id = auth.uid()
    OR group_id = my_group_id()
  );

-- Only the owner can create, modify or delete their wallets
CREATE POLICY "wallet insert" ON wallets
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "wallet update" ON wallets
  FOR UPDATE USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "wallet delete" ON wallets
  FOR DELETE USING (owner_id = auth.uid());

-- 4. Update RLS on transactions:
--    full access (read + write) to transactions on any accessible wallet
DROP POLICY IF EXISTS "group transactions" ON transactions;

CREATE POLICY "transaction access" ON transactions
  FOR ALL USING (
    wallet_id IN (
      SELECT id FROM wallets
      WHERE owner_id = auth.uid() OR group_id = my_group_id()
    )
  ) WITH CHECK (
    wallet_id IN (
      SELECT id FROM wallets
      WHERE owner_id = auth.uid() OR group_id = my_group_id()
    )
  );

-- 5. Trigger: new transactions auto-inherit their wallet's group_id
CREATE OR REPLACE FUNCTION sync_transaction_group_id()
RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN
  NEW.group_id := (SELECT group_id FROM public.wallets WHERE id = NEW.wallet_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transaction_group_id ON transactions;
CREATE TRIGGER trg_transaction_group_id
  BEFORE INSERT OR UPDATE OF wallet_id ON transactions
  FOR EACH ROW EXECUTE FUNCTION sync_transaction_group_id();

-- 6. Trigger: when a wallet's sharing status changes, sync all its transactions
CREATE OR REPLACE FUNCTION sync_wallet_transactions_group_id()
RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.group_id IS DISTINCT FROM NEW.group_id THEN
    UPDATE public.transactions SET group_id = NEW.group_id WHERE wallet_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_group_id_change ON wallets;
CREATE TRIGGER trg_wallet_group_id_change
  AFTER UPDATE OF group_id ON wallets
  FOR EACH ROW EXECUTE FUNCTION sync_wallet_transactions_group_id();

-- 7. Update delete_my_group() to handle nullable group_id:
--    deletes wallets owned by user OR in the group, and their transactions
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

  -- Delete transactions on wallets owned by the user or shared with the group
  DELETE FROM public.transactions
  WHERE wallet_id IN (
    SELECT id FROM public.wallets WHERE owner_id = auth.uid() OR group_id = gid
  );

  -- Delete those wallets
  DELETE FROM public.wallets WHERE owner_id = auth.uid() OR group_id = gid;

  -- Delete custom categories in the group
  DELETE FROM public.categories WHERE group_id = gid;

  -- Clear group membership
  UPDATE public.profiles SET group_id = NULL WHERE group_id = gid;

  -- Delete the group
  DELETE FROM public.groups WHERE id = gid;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_my_group() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_transaction_group_id() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_wallet_transactions_group_id() TO authenticated;
