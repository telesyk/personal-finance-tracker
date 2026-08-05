-- Enable real-time for the wallets table.
--
-- REPLICA IDENTITY FULL is required so Supabase real-time can filter change
-- events server-side using RLS policies. Without it, only the primary key is
-- available in the WAL record, so row-level security checks on other columns
-- (e.g. owner_id, group_id) cannot be evaluated and clients may receive events
-- they are not authorised to see.
--
-- The supabase_realtime publication is the Supabase-managed publication that
-- the real-time server listens to. Adding wallets here activates change events
-- for this table. Without this, postgres_changes subscriptions silently receive
-- no events even when the subscription call succeeds.

alter table wallets replica identity full;
alter publication supabase_realtime add table wallets;
