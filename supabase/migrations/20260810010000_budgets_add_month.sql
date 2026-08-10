-- Stage 11 Cluster C — add month column to budgets
--
-- Each budget row is now scoped to a specific month (YYYY-MM).
-- This replaces the perpetual model where a single row covers all months.
-- Existing rows are migrated to the current month automatically via the column default.

-- 1. Add month column; default = current month at insert time
alter table budgets
  add column month char(7) not null default to_char(current_date, 'YYYY-MM');

-- 2. Replace unique constraint to include month
--    (one budget per scope+category per month; NULL category_id still treated as equal
--    within the same month via NULLS NOT DISTINCT)
alter table budgets drop constraint budgets_unique_scope;
alter table budgets add constraint budgets_unique_scope
  unique nulls not distinct (group_id, owner_id, category_id, month);
