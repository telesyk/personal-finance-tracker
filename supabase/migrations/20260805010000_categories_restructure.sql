-- Stage 8.6 — Expense category restructure
--
-- Replaces the 9 original flat expense categories with a two-level hierarchy:
-- parent groups → selectable subcategories (or leaf parents when they have no children).
-- Income categories are untouched.
--
-- transactions.category_id has ON DELETE SET NULL so all existing transactions linked
-- to removed categories automatically become uncategorised — no manual UPDATE needed.

-- 1. Add parent_id (self-referencing FK, nullable)
alter table categories
  add column parent_id uuid references categories(id) on delete set null;

-- 2. Remove existing default expense categories (income categories unaffected)
delete from categories
  where type = 'expense' and is_default = true and group_id is null;

-- 3. Insert parent / leaf categories
insert into categories (name, icon, type, is_default, group_id) values
  ('Housing',                '🏠', 'expense', true, null),
  ('Utilities & Services',   '⚡', 'expense', true, null),
  ('Insurance',              '🛡️', 'expense', true, null),
  ('Groceries',              '🛒', 'expense', true, null),
  ('Cafes & Restaurants',    '🍔', 'expense', true, null),
  ('Transport',              '🚗', 'expense', true, null),
  ('Leisure',                '🎮', 'expense', true, null),
  ('Health',                 '💊', 'expense', true, null),
  ('Clothing & Goods',       '👕', 'expense', true, null),
  ('Online & Subscriptions', '💻', 'expense', true, null),
  ('Education',              '📚', 'expense', true, null),
  ('Family & Personal',      '👨‍👩‍👧', 'expense', true, null),
  ('Other',                  '📦', 'expense', true, null);

-- 4. Insert subcategories, resolved via parent name lookup
insert into categories (name, icon, type, is_default, group_id, parent_id)
select sub.name, sub.icon, 'expense', true, null, c.id
from categories c
join (values
  ('Housing',                'Rent',                    '🏠'),
  ('Housing',                'Repairs & Moving',        '🔧'),
  ('Utilities & Services',   'Electricity',             '💡'),
  ('Utilities & Services',   'Heating',                 '🔥'),
  ('Utilities & Services',   'Internet',                '🌐'),
  ('Utilities & Services',   'Phone',                   '📱'),
  ('Utilities & Services',   'Rundfunkbeitrag',         '📺'),
  ('Transport',              'Fuel',                    '⛽'),
  ('Transport',              'Tickets & Transit Passes','🚌'),
  ('Leisure',                'Recreation',              '🎪'),
  ('Leisure',                'Sports',                  '⚽'),
  ('Health',                 'Pharmacy',                '💊'),
  ('Health',                 'Doctors & Medical',       '🏥'),
  ('Health',                 'Personal Care',           '🧴'),
  ('Online & Subscriptions', 'Subscriptions',           '📡'),
  ('Online & Subscriptions', 'Online Purchases',        '🛍️'),
  ('Family & Personal',      'Pocket Money',            '💰'),
  ('Family & Personal',      'Gifts & Celebrations',    '🎁')
) as sub(parent_name, name, icon)
  on c.name = sub.parent_name
 and c.parent_id is null
 and c.is_default = true
 and c.group_id is null;
