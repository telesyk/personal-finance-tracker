-- Stage 10 — Budget table
--
-- Scope model (mirrors wallet owner_id pattern):
--   owner_id = NULL    → group budget   — visible to all group members
--   owner_id = uid     → personal budget — visible only to that user (RLS)
--
-- Category scope:
--   category_id = NULL  → overall budget (shown in Analytics KPI strip)
--   category_id = <id>  → per-category budget (shown in /budget list + Analytics rows)
--
-- Uniqueness: NULLS NOT DISTINCT so that two group budgets for the same category
-- are correctly rejected (NULL = NULL for uniqueness purposes, PostgreSQL 15+).

-- ── 1. Table ─────────────────────────────────────────────────────────────────

create table budgets (
  id           uuid        primary key default gen_random_uuid(),
  group_id     uuid        not null references groups(id)     on delete cascade,
  owner_id     uuid                    references profiles(id) on delete cascade,
  category_id  uuid                    references categories(id) on delete cascade,
  amount       numeric(14, 2) not null check (amount > 0),
  created_at   timestamptz not null default now(),

  -- One budget per (group, scope, category) — group and personal can coexist for the same category
  constraint budgets_unique_scope
    unique nulls not distinct (group_id, owner_id, category_id)
);

-- ── 2. Indexes ───────────────────────────────────────────────────────────────

-- /budget page: fetch all budgets for a group filtered by scope (owner_id null/uid)
create index budgets_group_owner_idx on budgets (group_id, owner_id);

-- Analytics: join budgets to category aggregation rows
create index budgets_group_category_idx on budgets (group_id, category_id);

-- ── 3. Row-Level Security ────────────────────────────────────────────────────

alter table budgets enable row level security;

-- Outer gate:   budget must belong to the user's group
-- Personal gate: personal rows (owner_id != null) are restricted to the owner;
--                group rows (owner_id = null) are visible/editable by all members
create policy "budgets: group gate + personal scope"
  on budgets
  for all
  using (
    group_id = my_group_id()
    and (owner_id is null or owner_id = auth.uid())
  )
  with check (
    group_id = my_group_id()
    and (owner_id is null or owner_id = auth.uid())
  );
