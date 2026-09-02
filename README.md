# Finance Tracker

A self-hosted family finance tracker built as a Progressive Web App (PWA). Designed for 2–4 people sharing a household budget, with zero hosting cost using free tiers only.

**Live:** [lesyk-finance-tracker.click](https://lesyk-finance-tracker.click) · **Version:** 0.6.8

---

## Features

- **Family group** — one group per household; any member can view and add transactions
- **Wallets** — personal and shared accounts with optional bank presets (Revolut, Wise, Sparkasse, Monobank, PrivatBank, PayPal, Cash, …)
- **Transactions** — income, expense, and wallet-to-wallet transfers; amounts always stored positive, direction carried by type
- **Categories** — default spending categories with hierarchical parent/child structure; custom categories per group
- **Monthly analytics** — income, expenses, net savings, and savings rate (%) per month; expense breakdown by category with vs-budget bars; wallet balance snapshot; month navigation
- **Budget** — monthly spending limits per category; overall and per-category progress bars; days remaining in the current month shown in the summary
- **Invite flow** — share a link to let family members join the group
- **Multilanguage** — English, Ukrainian, German; language switcher in the navigation bar; locale-prefixed URLs (`/en/`, `/uk/`, `/de/`)
- **Dark / light theme** — persisted via `next-themes`
- **PWA** — installable on iOS and Android home screens; works offline via service worker

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Backend / Auth / DB | Supabase (Postgres, Auth, RLS) |
| i18n | next-intl v4 |
| PWA | @ducanh2912/next-pwa |
| Hosting | Vercel (free tier) |
| Package manager | pnpm |

**Total monthly cost: €0** — all services run on free tiers.

---

## Local Development

### Prerequisites

- Node.js ≥ 20.9.0
- pnpm (`npm install -g pnpm`)
- A Supabase project (free at [supabase.com](https://supabase.com))

### Setup

```bash
git clone https://github.com/telesyk/personal-finance-tracker.git
cd personal-finance-tracker
pnpm install
```

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

The full schema (tables, enums, indexes, RLS policies, triggers, seed data) lives in `supabase/migrations/`. Apply it to your Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

---

## Project Structure

```
src/
  app/
    [locale]/         # All app pages under locale prefix (/en/, /uk/, /de/)
      (auth)/         # Sign-in and sign-up screens
      dashboard/
      wallets/
      transactions/
      analytics/
      settings/
      onboarding/
    auth/callback/    # OAuth callback route handler
    sign-out/         # Sign-out route handler
  components/
    ui/               # shadcn/ui components — edit freely
    header.tsx        # Top nav bar (logo, links, language switcher, theme toggle, profile menu)
    bottom-nav.tsx    # Mobile bottom navigation
    ...
  i18n/
    routing.ts        # Supported locales and default locale
    request.ts        # next-intl request config (message loading)
    navigation.ts     # Locale-aware Link, redirect, useRouter
  messages/
    en.json           # English translations
    uk.json           # Ukrainian translations
    de.json           # German translations
  lib/
    supabase/
      client.ts       # Browser Supabase client
      server.ts       # Server Supabase client (Server Components / Route Handlers)
      middleware.ts   # Session refresh helper
    auth.ts           # requireUser / requireProfile server helpers
  proxy.ts            # Next.js 16 middleware — auth guard + intl locale detection
```

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `dev` | Active development — all feature work goes here |
| `main` | Production — receives merges from `dev` on release; auto-deploys to Vercel |

Never commit directly to `main` during development.

---

## Data Model Invariants

These rules are enforced at the database level and must never be broken in application code:

- **`amount` is always positive** — direction is carried by `type` (`income` / `expense` / `transfer`), never by sign
- **`wallet.balance` is a DB trigger** — maintained by `trg_wallet_balance`; never update it in application code
- **Transfers always have `transfer_to_wallet_id`** — enforced by a `CHECK` constraint; orphaned transfer records are impossible
- **All data belongs to the group** — wallets, transactions, and custom categories all reference `group_id`; `created_by` only tracks who entered the record
- **`bank_presets` is seed-only** — never expose create/edit/delete for bank presets to users

---

## Versioning

Follows [Semantic Versioning](https://semver.org). Changes are recorded in [CHANGELOG.md](./CHANGELOG.md).

| Bump | When |
|---|---|
| `PATCH 0.x.+1` | Bug fix, styling tweak, config change, refactor with no user-visible change |
| `MINOR 0.+1.0` | Completed working feature, new screen end-to-end |
| `MAJOR +1.0.0` | Reserved for `1.0.0` MVP launch and post-MVP breaking changes |
