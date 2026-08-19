-- ============================================================
-- Fix: cross-owner transfers silently not updating the
-- destination wallet's balance.
--
-- Root cause: update_wallet_balance() runs under the calling
-- user's RLS context. The "wallet update" policy restricts
-- UPDATE to owner_id = auth.uid(), so the trigger's
--   UPDATE public.wallets SET balance = balance + amount
--      WHERE id = transfer_to_wallet_id
-- silently affects 0 rows when the destination wallet is owned
-- by a different group member.
--
-- Fix: add SECURITY DEFINER SET search_path = '' so the
-- function executes as its owner (postgres, BYPASSRLS).
-- This is safe because:
--   (1) the trigger fires only after a transaction row passes
--       its own RLS WITH CHECK — the user already proved they
--       have access to wallet_id before we get here.
--   (2) balance accounting is pure arithmetic with no data
--       exposed back to the caller.
--   (3) SET search_path = '' prevents search-path injection.
-- ============================================================

CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN
      UPDATE public.wallets SET balance = balance + NEW.amount WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'transfer' THEN
      UPDATE public.wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
      UPDATE public.wallets SET balance = balance + NEW.amount WHERE id = NEW.transfer_to_wallet_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'income' THEN
      UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
      UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.transfer_to_wallet_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse the old state first
    IF OLD.type = 'income' THEN
      UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
      UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.transfer_to_wallet_id;
    END IF;
    -- Apply the new state
    IF NEW.type = 'income' THEN
      UPDATE public.wallets SET balance = balance + NEW.amount WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'transfer' THEN
      UPDATE public.wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
      UPDATE public.wallets SET balance = balance + NEW.amount WHERE id = NEW.transfer_to_wallet_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
