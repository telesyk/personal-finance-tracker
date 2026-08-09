-- Stage 10.1 — Expense category tree v2
-- Source: docs/updates1.md → # UPDATES section
--
-- Existing row ids are preserved wherever possible — renames are UPDATEs, not
-- delete + re-insert. This keeps foreign keys from transactions and budgets valid
-- across the migration with minimal reassignment work.
--
-- Operation order:
--   1. Renames (UPDATE existing rows)
--   2. New children (INSERT)
--   3. Cross-parent moves (UPDATE parent_id)
--   4. Transaction reassignments (before any DELETE)
--   5. Delete merged parent
--   6. New top-level Savings & Debt
--
-- Note: migrations run inside a transaction on Supabase; no explicit BEGIN/COMMIT needed.

-- ── 1. RENAMES ────────────────────────────────────────────────────────────────

-- Health parent and Personal Care child
update categories set name = 'Health & Personal Care'
  where name = 'Health' and parent_id is null and is_default = true and group_id is null;

update categories set name = 'Personal Care & Beauty'
  where name = 'Personal Care' and is_default = true and group_id is null;

-- Online & Subscriptions: Subscriptions → Other Subscriptions
update categories set name = 'Other Subscriptions'
  where name = 'Subscriptions' and is_default = true and group_id is null;

-- Clothing & Goods → Shopping (icon changes too)
update categories set name = 'Shopping', icon = '🛍️'
  where name = 'Clothing & Goods' and parent_id is null and is_default = true and group_id is null;

-- Leisure → Leisure & Personal (icon changes too)
update categories set name = 'Leisure & Personal', icon = '🎭'
  where name = 'Leisure' and parent_id is null and is_default = true and group_id is null;

-- Sports → Sports & Fitness (child of the now-renamed Leisure & Personal)
update categories set name = 'Sports & Fitness'
  where name = 'Sports'
    and is_default = true and group_id is null
    and parent_id = (
      select id from categories
       where name = 'Leisure & Personal' and parent_id is null
         and is_default = true and group_id is null
    );

-- ── 2. NEW CHILDREN ───────────────────────────────────────────────────────────

-- Housing → Housing Other
-- (The old "Other" child was removed in 20260805020000, so this is a fresh insert.)
insert into categories (name, icon, type, is_default, group_id, parent_id)
select 'Housing Other', '🏠', 'expense', true, null, id
  from categories
 where name = 'Housing' and parent_id is null and is_default = true and group_id is null;

-- Insurance → 5 new children
insert into categories (name, icon, type, is_default, group_id, parent_id)
select sub.name, sub.icon, 'expense', true, null, c.id
from categories c
cross join (values
  ('Health Insurance',          '🏥'),
  ('Car Insurance',             '🚙'),
  ('Liability Insurance',       '📋'),
  ('Home & Contents Insurance', '🏡'),
  ('Insurance Other',           '📄')
) as sub(name, icon)
where c.name = 'Insurance' and c.parent_id is null and c.is_default = true and c.group_id is null;

-- Transport → 3 new children
-- (The old "Other" was removed in 20260805020000, so all three are fresh inserts.)
insert into categories (name, icon, type, is_default, group_id, parent_id)
select sub.name, sub.icon, 'expense', true, null, c.id
from categories c
cross join (values
  ('Car Repairs',      '🔧'),
  ('Parking & Tolls',  '🅿️'),
  ('Transport Other',  '🚗')
) as sub(name, icon)
where c.name = 'Transport' and c.parent_id is null and c.is_default = true and c.group_id is null;

-- Online & Subscriptions → 3 new children
-- "Subscriptions" was renamed "Other Subscriptions" in step 1;
-- "Online Purchases" will be re-parented to Shopping in step 3.
insert into categories (name, icon, type, is_default, group_id, parent_id)
select sub.name, sub.icon, 'expense', true, null, c.id
from categories c
cross join (values
  ('Streaming & Media', '📺'),
  ('Software & Tools',  '🖥️'),
  ('News & Books',      '📰')
) as sub(name, icon)
where c.name = 'Online & Subscriptions' and c.parent_id is null and c.is_default = true and c.group_id is null;

-- Shopping → 2 new children (Clothing, Shopping Other)
-- "Online Purchases" moves here from Online & Subscriptions in step 3.
insert into categories (name, icon, type, is_default, group_id, parent_id)
select sub.name, sub.icon, 'expense', true, null, c.id
from categories c
cross join (values
  ('Clothing',       '👕'),
  ('Shopping Other', '🏪')
) as sub(name, icon)
where c.name = 'Shopping' and c.parent_id is null and c.is_default = true and c.group_id is null;

-- Leisure & Personal → 3 new children
-- Recreation and Sports & Fitness already exist.
-- Pocket Money and Gifts & Celebrations will be moved from Family & Personal in step 3.
insert into categories (name, icon, type, is_default, group_id, parent_id)
select sub.name, sub.icon, 'expense', true, null, c.id
from categories c
cross join (values
  ('Travel',        '✈️'),
  ('Hobbies',       '🎨'),
  ('Leisure Other', '🎪')
) as sub(name, icon)
where c.name = 'Leisure & Personal' and c.parent_id is null and c.is_default = true and c.group_id is null;

-- ── 3. CROSS-PARENT MOVES ─────────────────────────────────────────────────────

-- "Online Purchases": Online & Subscriptions → Shopping
update categories
set parent_id = (
  select id from categories
   where name = 'Shopping' and parent_id is null and is_default = true and group_id is null
)
where name = 'Online Purchases' and is_default = true and group_id is null;

-- "Pocket Money" and "Gifts & Celebrations": Family & Personal → Leisure & Personal
update categories
set parent_id = (
  select id from categories
   where name = 'Leisure & Personal' and parent_id is null and is_default = true and group_id is null
)
where name in ('Pocket Money', 'Gifts & Celebrations')
  and is_default = true and group_id is null;

-- ── 4. TRANSACTION REASSIGNMENTS ─────────────────────────────────────────────
-- Any transactions pointing directly at a former leaf parent that now has children
-- must be moved to a sensible child before the parent becomes a non-selectable header.
-- (transactions.category_id has ON DELETE SET NULL — handled automatically on DELETE,
-- but explicit reassignment gives better UX than "uncategorised".)

-- Insurance parent → Insurance Other
update transactions
set category_id = (
  select ch.id from categories ch
    join categories p on ch.parent_id = p.id
   where ch.name = 'Insurance Other'
     and p.name  = 'Insurance'
     and ch.is_default = true and ch.group_id is null
)
where category_id = (
  select id from categories
   where name = 'Insurance' and parent_id is null and is_default = true and group_id is null
);

-- Shopping parent (old "Clothing & Goods") → Clothing child
update transactions
set category_id = (
  select ch.id from categories ch
    join categories p on ch.parent_id = p.id
   where ch.name = 'Clothing'
     and p.name  = 'Shopping'
     and ch.is_default = true and ch.group_id is null
)
where category_id = (
  select id from categories
   where name = 'Shopping' and parent_id is null and is_default = true and group_id is null
);

-- Family & Personal parent → Leisure Other (before the parent row is deleted)
update transactions
set category_id = (
  select ch.id from categories ch
    join categories p on ch.parent_id = p.id
   where ch.name = 'Leisure Other'
     and p.name  = 'Leisure & Personal'
     and ch.is_default = true and ch.group_id is null
)
where category_id = (
  select id from categories
   where name = 'Family & Personal' and parent_id is null and is_default = true and group_id is null
);

-- ── 5. DELETE MERGED PARENT ───────────────────────────────────────────────────
-- Children already re-parented in step 3; parent transactions reassigned in step 4.
-- ON DELETE SET NULL on parent_id means any remaining children safely become roots —
-- but there should be none left at this point.

delete from categories
  where name = 'Family & Personal'
    and parent_id is null
    and is_default = true
    and group_id is null;

-- ── 6. NEW TOP-LEVEL: SAVINGS & DEBT ─────────────────────────────────────────

with new_parent as (
  insert into categories (name, icon, type, is_default, group_id)
  values ('Savings & Debt', '💰', 'expense', true, null)
  returning id
)
insert into categories (name, icon, type, is_default, group_id, parent_id)
select sub.name, sub.icon, 'expense', true, null, new_parent.id
  from new_parent
 cross join (values
   ('Savings',         '🏦'),
   ('Debt Repayment',  '💳')
 ) as sub(name, icon);
