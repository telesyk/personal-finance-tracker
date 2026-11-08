-- ============================================================
-- wallets.balance reflects SETTLED transactions only.
--
-- A transaction is settled when date <= current_date; a future-dated
-- ("planned") transaction does not touch any balance until its date arrives.
--
-- Design: transactions.balance_applied records whether a row's amount is
-- currently included in wallet balances. The AFTER trigger reverses the OLD
-- row only if it was applied and applies the NEW row only if it is applied,
-- so every path (insert, edit, date change across today, delete, settlement)
-- stays consistent regardless of how long a settlement run was missed.
--   * BEFORE INSERT/UPDATE: balance_applied := (date <= current_date)
--   * settle_planned_transactions(): touches rows whose date has arrived;
--     the same triggers then apply them. Scheduled daily with pg_cron.
-- current_date follows the database time zone (UTC on Supabase).
-- ============================================================

-- Existing rows are all included in balances today -> default true.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS balance_applied boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.set_transaction_balance_applied()
RETURNS trigger LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.balance_applied := (NEW.date <= current_date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transaction_balance_applied ON public.transactions;
CREATE TRIGGER trg_transaction_balance_applied
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_transaction_balance_applied();

CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Reverse the old state (only if it was included in balances)
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.balance_applied THEN
    IF OLD.type = 'income' THEN
      UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
      UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.transfer_to_wallet_id;
    END IF;
  END IF;

  -- Apply the new state (only if settled)
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.balance_applied THEN
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

-- Settlement: re-save rows whose date has arrived; the BEFORE trigger flips
-- balance_applied and the AFTER trigger applies the amount.
CREATE OR REPLACE FUNCTION public.settle_planned_transactions()
RETURNS integer LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  settled integer;
BEGIN
  UPDATE public.transactions
     SET balance_applied = true
   WHERE NOT balance_applied AND date <= current_date;
  GET DIAGNOSTICS settled = ROW_COUNT;
  RETURN settled;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_planned_transactions() FROM PUBLIC, anon, authenticated;

-- Backfill: un-apply rows that are still in the future. The UPDATE fires the
-- triggers above (OLD applied -> NEW not applied) and reverses their effect.
UPDATE public.transactions SET date = date WHERE date > current_date;

-- Daily settlement (shortly after UTC midnight). Requires pg_cron
-- (Supabase: Database -> Extensions, available on the free tier).
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('settle-planned-transactions')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'settle-planned-transactions');
SELECT cron.schedule('settle-planned-transactions', '5 0 * * *',
                     $$SELECT public.settle_planned_transactions()$$);
