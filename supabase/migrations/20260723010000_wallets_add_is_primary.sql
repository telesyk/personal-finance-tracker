-- Add is_primary flag to wallets.
-- At most one wallet per group should have is_primary = true.
-- Enforced in application logic (unset all others before setting a new primary).

alter table public.wallets
  add column is_primary boolean not null default false;
