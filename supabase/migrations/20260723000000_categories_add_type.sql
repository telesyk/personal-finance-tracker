-- Add transaction_type to categories so income and expense categories are kept separate.
-- NULL = universal (reserved for future use); 'expense' = expense only; 'income' = income only.

alter table public.categories
  add column type transaction_type;

-- Existing 9 seeded categories are all expense-oriented.
update public.categories
set type = 'expense'
where is_default = true;

-- Seed 6 income categories.
insert into public.categories (name, icon, group_id, is_default, type) values
  ('Salary',               '💼', null, true, 'income'),
  ('Freelance & Business', '🧾', null, true, 'income'),
  ('Investments',          '📈', null, true, 'income'),
  ('Rental Income',        '🏠', null, true, 'income'),
  ('Social Benefits',      '🏛️', null, true, 'income'),
  ('Other Income',         '📦', null, true, 'income');
