# Finance Tracker — Project Notes
*Living document · Updated as the project evolves*

---

## 1. Project Overview

A self-hosted family finance tracker built for web and mobile (PWA). Designed to be free to run, easy to extend, and usable by 2–4 family members sharing a single household budget.

### Goals
- Split incomes and expenses by wallet (bank / finance account)
- Record everyday spending with categories
- Monthly analytics: income vs outcome per category and wallet
- Yearly analytics after 12 months of data
- Family group support — shared wallets and transactions

### Users & Platform
- **Users:** family / couple (2–4 people)
- **Platform:** web browser + mobile (PWA — installable on home screen)
- **Hosting cost:** €0 — free tiers only

---

## 2. Tech Stack

| Layer | Choice | Cost | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | Free | Main development framework; SSR, routing, API routes built-in |
| UI Library | shadcn/ui | Free | Copy-paste components built on Radix UI + Tailwind CSS |
| Styling | Tailwind CSS v4 | Free | Bundled with shadcn/ui; utility-first, zero runtime |
| Backend / Auth | Supabase (free tier) | Free | Postgres, Auth, REST API |
| Hosting | Vercel (free tier) | Free | Zero-config deploy; native Next.js support |
| Database | Supabase Postgres | Free | Included in Supabase free tier |

**Total monthly cost: €0**

Supabase free tier provides 500 MB DB storage, 50k monthly active users, and built-in auth — more than enough for a family app.

### Framework — Next.js
Next.js with the App Router is the core of the project. It handles routing, server-side rendering, and API routes out of the box, which means no separate backend server is needed for lightweight API calls. Vercel (Next.js's creator) hosts it for free with zero configuration, and the App Router model pairs naturally with Supabase's server-side client for secure data fetching.

### UI Library — shadcn/ui
shadcn/ui was chosen over alternatives (HeroUI, Mantine, MUI) for the following reasons:

- **Code ownership** — components are copied directly into the project (`/components/ui`), not installed as a black-box dependency. They can be edited freely.
- **AI tooling** — all major AI coding tools (v0.dev, Claude Code, Cursor, Copilot) generate shadcn/ui by default, which accelerates development significantly.
- **Tailwind-native** — no extra styling layer; the same Tailwind classes used throughout the app apply inside components.
- **Accessibility** — built on Radix UI primitives, which handle ARIA, keyboard navigation, and focus management automatically.
- **Community** — 109k+ GitHub stars, the largest component ecosystem of any React UI library in 2025–2026.

For complex data components not covered by shadcn/ui (e.g. advanced data tables, date range pickers), **Mantine** can be added as a targeted complement without conflict.

---

## 3. Data Model

### Group
- `id`
- `name` (e.g. "Müller Family")
- `members` → [ User, User, … ]

### User
- `id`
- `email`
- `display_name`
- `group_id` → Group

### Wallet
- `id`
- `group_id` → Group
- `owner_id` → User (who manages it)
- `name` (custom label, e.g. "Jonas – Sparkasse")
- `bank_preset` → BankPreset (optional)
- `currency` (EUR, GBP, USD …)
- `balance` (running total, updated on each transaction)

### BankPreset ← lookup / seed table, not user-editable
- `id`
- `name`
- `type`: `traditional` | `fintech`
- `logo_url`
- `country_code`

### Transaction
- `id`
- `group_id` → Group
- `wallet_id` → Wallet ← **source of transaction**
- `created_by` → User
- `amount` (positive = income, negative = expense)
- `type`: `income` | `expense` | `transfer`
- `category_id` → Category
- `date`
- `note` (optional)
- `transfer_to_wallet_id` → Wallet (only when type = transfer)

### Category
- `id`
- `name` (e.g. Food, Rent, Transport …)
- `icon`
- `group_id` → Group (null = system default, set = user-created)
- `is_default`: bool

### Key Design Decisions

**Group model** — all wallets, transactions, and custom categories belong to the group, not the individual. Any family member can add transactions to any wallet. The `created_by` field tracks who entered it.

**`wallet_id` as source** — every transaction points to a wallet (its source). Transfers between wallets use both `wallet_id` (from) and `transfer_to_wallet_id` (to) and create two linked records so both balances stay correct.

**BankPreset is optional** — a wallet doesn't need a preset. "Cash" or a custom wallet leaves `bank_preset` null.

**Multi-currency** — store `currency` per wallet. Normalize to EUR for analytics. Wise and Revolut users may hold GBP/USD alongside EUR.

---

## 4. Bank Presets (Seed Data)

Initial seed covers only currently used banks. The full list will be extended later by pulling from an open banking API (e.g. Nordigen / GoCardless).

| Bank / Service | Type | Notes |
|---|---|---|
| Sparkasse | Traditional | Most widespread, regional branches |
| Revolut | Fintech | Multi-currency, widely used across DE |
| Wise | Fintech | Best for FX transfers, holds multiple currencies |
| Monobank | Fintech (UA) | Ukrainian online-only bank, widely used |
| PrivatBank | Traditional / Online (UA) | Largest Ukrainian bank, online-first UX |
| PayPal | Fintech | Online payments, widely used for e-commerce |
| Klarna | Fintech | Buy now / pay later + card payments |
| Cash | — | Physical cash wallet |
| Other / Unknown | — | Generic fallback |

---

## 5. Default Spending Categories

- Food & Groceries
- Housing & Utilities
- Transport
- Health & Pharmacy
- Entertainment & Leisure
- Clothing & Personal Care
- Education
- Savings & Investments
- Other

Categories are seeded as system defaults (`group_id = null`). Users can add their own custom categories later.

---

## 6. MVP Screens

- **Dashboard** — current month snapshot: total in/out per wallet, category breakdown
- **Add Transaction** — quick form: wallet, amount, type, category, date, note
- **Wallets** — list of accounts with current balance
- **History** — filterable list of transactions (by month, wallet, category)
- **Analytics** — monthly bar/pie charts; year view after 12 months of data
- **Settings** — manage group members, wallets, custom categories

---

## 7. Build Phases

| Phase | Name | Scope |
|---|---|---|
| 1 | Core | Auth, groups, wallets, add transactions, list view |
| 2 | Analytics | Monthly dashboard with charts |
| 3 | Polish | PWA setup, mobile UX tuning |
| 4 | Later | Custom categories, yearly view, CSV export |

---

## 8. Database Schema (Supabase / PostgreSQL)

> Supabase uses `auth.users` as the built-in user table. The `profiles` table below extends it with app-specific fields.

### Enums

```sql
create type bank_type as enum ('traditional', 'fintech');
create type transaction_type as enum ('income', 'expense', 'transfer');
```

### profiles
Extends Supabase's built-in `auth.users`. Created automatically via trigger on signup.

```sql
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  group_id    uuid references groups(id) on delete set null,
  created_at  timestamptz not null default now()
);
```

### groups

```sql
create table groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
```

> **Note:** `profiles.group_id` and `groups.created_by` create a circular reference. Handle by inserting `groups` first (without `created_by`), then inserting `profiles`, then updating `groups.created_by`.

### bank_presets
Seed-only table, not user-editable.

```sql
create table bank_presets (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         bank_type not null,
  logo_url     text,
  country_code char(2) not null
);
```

### wallets

```sql
create table wallets (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references groups(id) on delete cascade,
  owner_id       uuid references profiles(id) on delete set null,
  name           text not null,
  bank_preset_id uuid references bank_presets(id) on delete set null,
  currency       char(3) not null default 'EUR',
  balance        numeric(14, 2) not null default 0,
  created_at     timestamptz not null default now()
);
```

### categories

```sql
create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text,
  group_id   uuid references groups(id) on delete cascade, -- null = system default
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
```

### transactions

```sql
create table transactions (
  id                     uuid primary key default gen_random_uuid(),
  group_id               uuid not null references groups(id) on delete cascade,
  wallet_id              uuid not null references wallets(id) on delete restrict,
  transfer_to_wallet_id  uuid references wallets(id) on delete restrict,
  created_by             uuid references profiles(id) on delete set null,
  type                   transaction_type not null,
  amount                 numeric(14, 2) not null check (amount > 0),
  category_id            uuid references categories(id) on delete set null,
  date                   date not null,
  note                   text,
  created_at             timestamptz not null default now(),

  constraint transfer_requires_target
    check (type != 'transfer' or transfer_to_wallet_id is not null)
);
```

---

### Indexes

```sql
-- Most queries filter by group + date range
create index on transactions (group_id, date desc);

-- Wallet-level filtering
create index on transactions (wallet_id, date desc);

-- Category analytics
create index on transactions (category_id, date desc);

-- Wallet lookup by group
create index on wallets (group_id);
```

---

### Row-Level Security (RLS)

Supabase enforces RLS at the database level — users can only see data belonging to their group.

```sql
-- Enable RLS on all tables
alter table profiles     enable row level security;
alter table groups       enable row level security;
alter table wallets      enable row level security;
alter table transactions enable row level security;
alter table categories   enable row level security;

-- Helper function: returns the current user's group_id
create or replace function my_group_id()
returns uuid language sql stable
as $$ select group_id from profiles where id = auth.uid() $$;

-- profiles: users can only see members of their own group
create policy "group members only" on profiles
  for all using (group_id = my_group_id());

-- groups: user can only access their own group
create policy "own group only" on groups
  for all using (id = my_group_id());

-- wallets, transactions, categories: scoped to group
create policy "group wallets" on wallets
  for all using (group_id = my_group_id());

create policy "group transactions" on transactions
  for all using (group_id = my_group_id());

create policy "group categories" on categories
  for all using (group_id = my_group_id() or group_id is null);
```

---

### Seed Data — Bank Presets

```sql
insert into bank_presets (name, type, logo_url, country_code) values
  ('Sparkasse',    'traditional', null, 'DE'),
  ('Revolut',      'fintech',     null, 'GB'),
  ('Wise',         'fintech',     null, 'GB'),
  ('Monobank',     'fintech',     null, 'UA'),
  ('PrivatBank',   'traditional', null, 'UA'),
  ('PayPal',       'fintech',     null, 'US'),
  ('Klarna',       'fintech',     null, 'SE'),
  ('Cash',         'traditional', null, 'XX'),
  ('Other',        'traditional', null, 'XX');
```

### Seed Data — Default Categories

```sql
insert into categories (name, icon, group_id, is_default) values
  ('Food & Groceries',       '🛒', null, true),
  ('Housing & Utilities',    '🏠', null, true),
  ('Transport',              '🚗', null, true),
  ('Health & Pharmacy',      '💊', null, true),
  ('Entertainment & Leisure','🎬', null, true),
  ('Clothing & Personal Care','👗', null, true),
  ('Education',              '📚', null, true),
  ('Savings & Investments',  '💰', null, true),
  ('Other',                  '📦', null, true);
```

---

### Key Schema Decisions

**`amount` is always positive** — the `type` field (`income` / `expense` / `transfer`) carries the direction. This avoids sign confusion in queries and UI.

**`balance` on wallet** — maintained as a running total, updated on each transaction insert/update/delete via a Supabase database trigger (to be written). Avoids expensive `SUM()` queries on every page load.

**`transfer_to_wallet_id` constraint** — a database-level `CHECK` ensures transfers always have a target wallet. Orphaned transfer records are impossible.

**`on delete restrict` for wallet in transactions** — prevents accidentally deleting a wallet that has transaction history. User must reassign or archive transactions first.

---

## 9. Open Questions / Future Decisions

- Bank sync via API (e.g. Nordigen / GoCardless) — adds complexity, not in MVP
- Receipt photo upload — Supabase Storage can handle this later
- Budget targets per category — useful Phase 4 feature
- CSV / PDF export — planned for Phase 4
- Notifications / reminders — out of scope for now

---

## 10. Development Plan

Rough total for MVP (Stages 0–6): **~2–3 weeks** of focused part-time work, or ~1 week full-time.

### Stage 0 — Project Setup *(~1–2 days)*
- Initialize Next.js project with App Router + TypeScript
- Configure Tailwind CSS + shadcn/ui
- Set up Supabase project, run schema migrations, seed data
- Configure environment variables
- Deploy skeleton to Vercel (CI/CD from day one)

### Stage 1 — Auth & Groups *(~2–3 days)*
- Supabase Auth: sign up, sign in, sign out
- Profile creation trigger (auto-create `profiles` row on signup)
- Group creation flow — first user creates a group
- Invite flow — share a link or code for family members to join the group
- Protected routes middleware in Next.js

### Stage 2 — Wallets *(~2 days)*
- Create / edit / delete wallets
- Assign bank preset (with logo) or leave custom
- Wallet list view with current balance
- Currency selection per wallet

### Stage 3 — Transactions *(~3–4 days)*
- Add transaction form (wallet, type, amount, category, date, note)
- Transfer between wallets (linked records + balance update)
- Transaction list / history view with basic filters (month, wallet, category)
- Edit / delete transaction
- Wallet balance auto-update (DB trigger)

### Stage 4 — Analytics *(~3–4 days)*
- Monthly summary: total income vs expenses
- Breakdown by category (pie / bar chart)
- Breakdown by wallet
- Month navigation (prev / next)
- Yearly overview (after enough data exists)

### Stage 5 — PWA & Mobile Polish *(~2 days)*
- Add PWA manifest + service worker (installable on phone home screen)
- Mobile layout tuning (bottom nav bar, touch-friendly forms)
- Dark mode support (shadcn/ui has this built in)

### Stage 6 — Quality & Launch *(~2–3 days)*
- Basic error handling and loading states throughout
- Form validation (Zod schemas)
- Empty states and onboarding hints
- Final Vercel production deploy
- Share with family, collect feedback

### Stage 7+ — Iterative Extensions *(ongoing)*
- Custom categories
- CSV export
- Multilanguage (i18n)
- Multicurrency analytics with live FX rates
- Bank list extension via open banking API
- UX analytics

---

## 11. Future Extension Features

Features planned beyond MVP. This list will grow over time.

| Feature | Description |
|---|---|
| **Multilanguage support** | UI available in multiple languages (DE, EN, UA as starting point); i18n framework from day one |
| **Multicurrency analytics** | View analytics normalized to any currency, not just EUR; live FX rates via open API |
| **UX analytics gathering** | Collect anonymized usage data (screen flows, feature usage) to guide future product decisions |

---

## 12. Project Logs

Changelog and implementation history are maintained in separate files:

- [`Changelog.md`](./Changelog.md) — version-based record of all project changes (Keep a Changelog format)
- [`DevImplementationLog.md`](./DevImplementationLog.md) — stage-by-stage implementation tasks, decisions, and notes
