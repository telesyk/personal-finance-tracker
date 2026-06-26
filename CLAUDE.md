@AGENTS.md

# Finance Tracker — Development Conventions

## Project Snapshot

Family finance tracker PWA, self-hosted, **€0 running cost** (free tiers only).
- **Users:** 2–4 family members sharing a single household budget
- **Platform:** web browser + PWA (installable on mobile home screen)
- **Goal:** split incomes/expenses by wallet, record spending, monthly analytics, family group support

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | `src/` directory layout; SSR, routing, API routes built-in |
| UI | shadcn/ui | Components copied into `src/components/ui/` — edit freely |
| Styling | Tailwind CSS v4 | Bundled with shadcn/ui; utility-first |
| Backend / Auth / DB | Supabase (free tier) | Postgres, Auth, RLS, REST API |
| Hosting | Vercel (free tier) | Auto-deploy from `main`; zero-config for Next.js |

Mantine is allowed only for complex data components not covered by shadcn/ui (e.g. advanced data tables, date range pickers). Do not use it as a general UI layer.

---

## Folder Conventions

```
src/
  app/              # App Router pages and layouts
  components/
    ui/             # shadcn/ui components — do not move or restructure
  lib/
    supabase/
      client.ts     # browser Supabase client
      server.ts     # server Supabase client (Server Components / Route Handlers)
      middleware.ts # session refresh middleware
```

---

## Data Model Rules

These invariants must never be broken:

- **`amount` is always positive** — direction is carried by `type` enum (`income` / `expense` / `transfer`), never by sign
- **`wallet.balance` is a DB trigger** — maintain it in the database trigger, never in application code
- **Transfers always have `transfer_to_wallet_id`** — enforced by a DB `CHECK` constraint; never create orphaned transfer records
- **Data belongs to the group, not the user** — wallets, transactions, and custom categories all reference `group_id`; `created_by` only tracks who entered the record
- **`bank_presets` is seed-only** — never expose create/edit/delete for bank presets to users

---

## Supabase / RLS Conventions

- RLS must be enabled on **every table** before any data policy is written
- All data-access queries must be scoped by `group_id`
- Use the `my_group_id()` DB helper function in RLS policies — do not write raw `auth.uid()` joins
- **Server-side fetching** (Server Components, Route Handlers): use `src/lib/supabase/server.ts`
- **Client-side fetching** (Client Components): use `src/lib/supabase/client.ts`

---

## Versioning Rules

Follow Semantic Versioning. Update `CHANGELOG.md` on every version bump.

| Bump | When |
|---|---|
| **PATCH** `0.x.+1` | Bug fix, typo, styling tweak, config change, refactor with no user-visible change |
| **MINOR** `0.+1.0` | Completed working feature, new screen end-to-end, meaningful structural change. Resets patch to 0. |
| **MAJOR** `+1.0.0` | Reserved for first MVP launch (`1.0.0`) and post-MVP breaking changes. Do not touch during Stages 0–5. |

Rule of thumb: if a family member wouldn't notice it in the UI → PATCH. If they could use a new thing today → MINOR.

---

## Documentation Update Rules

**`CHANGELOG.md`** — do **not** write entries until the project has its first rendered visual page (e.g. a working homepage). Once that milestone is reached, add an entry under `[Unreleased]` in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format after every meaningful change.

**`docs/DevImplementationLog.md`** — update always: check off completed tasks and add a Notes block for any gotchas or decisions made during implementation.

Do **not** update `docs/FinanceTracker_ProjectNotes.md` unless the data model, schema, or high-level architecture actually changes. That file is the source of truth for architecture decisions, not a dev log.

---

## Current Development Stage

**Stage 0 — Project Setup** is the active stage. All tasks are listed in `docs/DevImplementationLog.md`.

- Next version target: `0.9.0` (Stage 0 complete — scaffold live on Vercel)
- Do not build feature code until all Stage 0 tasks are checked off
- Stage sequence: 0 Setup → 1 Auth & Groups → 2 Wallets → 3 Transactions → 4 Analytics → 5 PWA Polish → 6 Quality & Launch
