# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: PATCH only (`0.0.x`) until a release is explicitly approved.

---

## [Unreleased]

---

## [0.6.3] — 2026-08-10

### Changed
- **Computed `overallBudget`** — the Analytics Budget KPI tile now shows automatically as the sum of all category budgets for the active scope; no longer requires a manually created "Overall" budget row; tile appears as soon as any category budget exists
- **Budget total summary bar** on `/budget` — new summary row at the top of the list showing the total planned amount vs. available wallet balance; colour-coded green (within balance) or red (exceeds balance)
- **Budget month navigation** — prev/next month arrows in the `/budget` header; list and actuals re-fetched for the selected month; same `?month=yyyy-mm` URL param pattern as Analytics and Transactions; "next" arrow disabled on current month
- **"Manage →" link** in Analytics "vs. budget" section header — links directly to `/budget`
- **Budget currency symbol** — hardcoded `€` replaced with the scope's primary wallet currency symbol throughout `/budget`

### Fixed
- Removed "Overall (no category)" option from the budget form — category selection is now required; category validation error shown when none is selected

### Added
- `supabase/migrations/20260810000000_budgets_remove_overall.sql` — deletes existing `category_id = null` budget rows
- `supabase/migrations/20260810010000_budgets_add_month.sql` — adds `month char(7)` column to `budgets`; updates unique constraint to `(group_id, owner_id, category_id, month)`; applied to dev and prod

---

## [0.6.2] — 2026-08-09

### Fixed
- **Analytics "Budget" KPI missing on production** — root cause: Stage 10 / 10.1 (`dev` branch) was never merged to `main`; production was still at `0.5.2`; no code change required — resolved by merging `dev → main`

### Changed
- **Analytics page section order** — new order: KPI cards → Wallets → vs. Budget → Category bar chart; previously the category chart appeared before the wallet summary and vs-budget section

---

## [0.6.1] — 2026-08-09

### Changed
- **Expense category tree v2** — comprehensive restructure of the default expense
  categories; existing category row ids preserved wherever possible so foreign keys
  in `transactions` and `budgets` remain valid with minimal reassignment
  - **Housing**: added "Housing Other" subcategory
  - **Insurance**: promoted from leaf to parent; 5 new children — Health Insurance,
    Car Insurance, Liability Insurance, Home & Contents Insurance, Insurance Other;
    existing transactions on the Insurance parent reassigned to Insurance Other
  - **Transport**: added Car Repairs 🔧, Parking & Tolls 🅿️, Transport Other
  - **Health**: renamed → "Health & Personal Care"; "Personal Care" child renamed →
    "Personal Care & Beauty"
  - **Shopping** (was "Clothing & Goods" 👕): renamed + new icon 🛍️; added children
    Clothing, Shopping Other; "Online Purchases" moved here from Online & Subscriptions;
    existing transactions on the old parent reassigned to Clothing child
  - **Online & Subscriptions**: "Subscriptions" renamed → "Other Subscriptions";
    "Online Purchases" moved to Shopping; 3 new children — Streaming & Media 📺,
    Software & Tools 🖥️, News & Books 📰
  - **Leisure & Personal** (was "Leisure" 🎮): renamed + new icon 🎭; "Sports" child
    renamed → "Sports & Fitness"; absorbed Pocket Money and Gifts & Celebrations
    from Family & Personal; 3 new children — Travel ✈️, Hobbies 🎨, Leisure Other 🎪
  - **Family & Personal**: removed — children merged into Leisure & Personal; any
    transactions on the parent reassigned to Leisure Other before deletion
  - **Savings & Debt** 💰: new top-level category with children Savings 🏦 and
    Debt Repayment 💳
  - Migration: `supabase/migrations/20260808000000_category_tree_v2.sql` applied to
    both dev and prod

---

## [0.6.0] — 2026-08-08

### Added
- **Budget Planning — Stage 10 complete**
- `supabase/migrations/20260807000000_budgets.sql` — new `budgets` table with
  `group_id`, nullable `owner_id` (null = group budget, uid = personal), nullable
  `category_id` (null = overall budget), positive `amount`; `UNIQUE NULLS NOT DISTINCT`
  constraint; RLS policy scoped by `my_group_id()` + `owner_id`; applied to dev and prod
- Bottom nav "Profile" slot replaced with **Budget** (`PiggyBank` icon → `/budget`)
- Budget link added to desktop header nav after Analytics
- `/budget` page — Personal / Group tab switcher (reuses `useTabState` + `TabSwitcher`);
  budget list with progress bars (green < 80%, amber 80–99%, red ≥ 100%); Add / Edit
  dialog (grouped category `<select>` + amount input; category + scope locked on edit);
  Delete `AlertDialog`; `23505` unique-violation surfaced as friendly duplicate message
- `budget` translation namespace in `en.json`, `uk.json`, `de.json`
- `/analytics` page — **vs. budget** section: per-category actual vs. limit progress bars
  with the same colour thresholds; "set one →" inline CTA for categories with spend but
  no budget; Overall budget KPI tile replaces the Net tile when an overall budget is set
  (shows `€spent / €limit`, mini progress bar, `{pct}% of monthly budget` subtitle)
- `analytics.budgetKpi`, `analytics.budgetPct`, `analytics.budgetTracking`,
  `analytics.noBudget`, `analytics.setBudget` translation keys (all three locales)

---

## [0.5.2] — 2026-08-05

### Changed
- `README.md` fully rewritten — replaced Next.js boilerplate with a real project
  description covering features, tech stack, local setup, project structure, branch
  strategy, data model invariants, and versioning rules

---

## [0.5.1] — 2026-08-05

### Fixed
- `/en/undefinedundefined` redirect loop on homepage — next-intl v4 `redirect()` expects
  `{ href, locale }`, not a bare string; passing a string caused `getPathname` to destructure
  it as an object, yielding `href = undefined` and `locale = undefined`, which produced
  `'/undefined' + undefined = '/undefinedundefined'` as the redirect target
  (`src/app/[locale]/page.tsx`, `src/app/[locale]/onboarding/page.tsx`)
- `WalletCard` crash — `useTranslations` hook called from inside the component's closure
  but declared only in `WalletList`; added own `const t = useTranslations('wallets')`
  inside `WalletCard` (`src/app/[locale]/wallets/wallet-list.tsx`)
- Locale-stripping "Go to dashboard" links in error and 404 pages — swapped `next/link`
  for `@/i18n/navigation` `Link` so the locale prefix is preserved on navigation
  (`src/components/error-page.tsx`, `src/app/[locale]/not-found.tsx`)

### Added
- `src/app/[locale]/not-found.tsx` — locale-aware 404 page shown for unknown routes
  (e.g. `/en/undefinedundefined`); static Server Component with a "Go to dashboard" link

### Changed
- Language switcher moved from the Settings page to the top navigation bar; redesigned
  as a globe icon-button (`🌐 EN`) that opens a `DropdownMenuRadioGroup` — always
  accessible regardless of which page the user is on
  (`src/components/language-switcher.tsx`, `src/components/header.tsx`,
  `src/app/[locale]/settings/page.tsx`)

---

## [0.5.0] — 2026-08-05

### Added
- Multilanguage support (Stage 9): English, Ukrainian, and German via next-intl v4
- Locale-prefixed URL routing — all app pages served under `/en/`, `/uk/`, `/de/`
- Language switcher in Settings — switches locale in-place without page reload (moved to header in 0.5.1)
- `src/messages/en.json`, `uk.json`, `de.json` — ~130 translation keys across 10 namespaces (common, nav, auth, onboarding, dashboard, wallets, transactions, analytics, settings, errors)
- `src/i18n/routing.ts`, `request.ts`, `navigation.ts` — next-intl configuration and locale-aware navigation helpers

### Changed
- Combined Supabase session middleware + next-intl locale middleware in `src/proxy.ts`; auth guard and locale detection both work in a single middleware pass
- All UI strings replaced with `useTranslations()` / `getTranslations()` across every page and component
- Header, bottom nav, and profile menu use locale-aware `Link`, `usePathname`, `useRouter` from `@/i18n/navigation`
- `src/app/[locale]/layout.tsx` wraps all app pages with `NextIntlClientProvider`; root `layout.tsx` retains only the HTML shell

### Fixed
- Turbopack incompatibility with dynamic template-literal imports in `request.ts` — replaced with explicit `messageLoaders` map
- Invalid JSON in `de.json` — ASCII `"` used as German closing quotation mark in `wallets.delete.title`; replaced with U+201D

---

## [0.4.4] — 2026-08-05

### Added
- Two-level expense category hierarchy: 13 parent groups + 18 subcategories replacing the original 9 flat categories
- `parent_id` column on `categories` table (self-referencing FK)
- Transaction form category select uses native `<optgroup>` grouping — parent groups with children render as non-selectable headers; leaf parents (Groceries, Insurance, etc.) remain directly selectable

### Changed
- Existing transactions linked to old expense categories become uncategorised (expected — old categories deleted)

---

## [0.4.3] — 2026-08-05

### Fixed
- Restored src/ files from last known-good dev commit after broken automated conflict resolution left duplicate code in analytics-dashboard, wallet-list, and settings pages

---

## [0.4.2] — 2026-08-05

### Fixed
- Resolved Git merge conflict markers accidentally committed in 8 source files (`auth.ts`, `wallet-list.tsx`, `wallets/page.tsx`, `transaction-list.tsx`, `transactions/page.tsx`, `analytics-dashboard.tsx`, `analytics/page.tsx`, `CHANGELOG.md`); kept dev (HEAD) version in all cases

---

## [0.4.1] — 2026-08-05

### Added
- Profile dropdown menu in the nav bar — Settings and Sign out moved from standalone links into a popover triggered by an initials avatar button (`ProfileMenu` component, `shadcn/ui` DropdownMenu)
- Bottom nav: "Profile" icon button replaces separate Settings link
- `useTabState` hook — persists the selected Personal / Group tab in `localStorage` (`ft-active-tab` key); shared across Wallets, Transactions, and Analytics pages
- Group tab label shows actual group name (truncated to 50 chars) instead of generic "Group"
- Transactions page: wallet summary bar moved below tab switcher; Personal tab shows primary wallet + all-personal total; Group tab shows per-wallet balance badges + group total
- Transactions page: per-day net total (income − expenses) shown in each date header; green for net positive, red for net negative, hidden when zero
- Wallets page (Group tab): wallet owner's display name shown below the wallet title in secondary color
- Wallet deletion guards — blocks deletion if balance ≠ 0 (with message to transfer out first) or if wallet is shared with a group (with message to unshare first); error shown inline in the confirmation dialog
- Supabase real-time subscription on `wallets` table — wallet balances stay in sync across group members without a manual page refresh (`useWalletRealtime` hook used on Wallets and Transactions pages)
- Google OAuth `prompt: 'select_account'` — always shows Google account picker instead of auto-selecting the last account
- `requireProfile()` auto-creates a missing profile row for users who registered before the `handle_new_user` trigger was applied

### Changed
- `useTabState` replaces inline `useState` for tab selection on all three tabbed pages

### Fixed
- Google OAuth account auto-selection bypassed — now forces account picker on every sign-in and sign-up flow

---

## [0.4.0] — 2026-08-02

### Added
- Transfer ownership action in Settings — group owner can pass admin rights to another member before leaving
- Settings page no-group state — shows "Create a group" link instead of redirecting to `/onboarding`
- Dashboard shows group name below welcome text when user belongs to a group
- Dashboard: "Group wallets" summary block (indigo accent) showing total of all group-shared wallets
- Wallets page: Personal / Group tab view — Personal tab shows primary wallet summary + all-personal total; Group tab shows all wallets shared with the group and group total
- Transactions page: Personal / Group tab view filters transactions by wallet ownership
- Analytics page: Personal / Group tab view — all KPIs, chart, and wallet list respond to the active tab
- `TabSwitcher` shared component (`src/components/tab-switcher.tsx`)
- `parseAmount` / `formatAmount` helpers in `src/lib/currency.ts`
- `monthLabel` / `prevMonth` / `nextMonth` helpers in `src/lib/date.ts`

### Changed
- Leave group blocked for group owner until ownership is transferred
- "All wallets" on dashboard is now a link to `/wallets`
- `/onboarding` is opt-in only — no longer auto-redirected from Settings
- Dashboard: removed "not in a family group" nudge (now in Settings) and duplicate bottom nav links
- Group tab across all pages shows wallets/transactions with `group_id ≠ null` (all members' shared data, not only current user's)

### Fixed
- Removed unused `members` query from wallets page

---

## [0.3.1] — 2026-08-01

### Added
- `/settings` — group rename (inline form), invite link generation, Danger zone section
- Leave group action — visible to non-sole members; clears `group_id` and redirects to `/onboarding`
- Delete group action — visible to sole member only; `delete_my_group()` SECURITY DEFINER RPC cascades through transactions, wallets, categories, and the group record
- Invite link moved from `/dashboard` to `/settings`

---

## [0.3.0] — 2026-07-31

### Added
- PWA manifest (`/manifest.webmanifest`), SVG app icon, 180×180 PNG Apple touch icon via ImageResponse
- Apple web app meta tags and `theme-color` for installability
- Service worker with offline fallback page (`/~offline`) via `@ducanh2912/next-pwa`
- Dark mode toggle in header (sun/moon icon, `next-themes`); `ThemeProvider` wired in root layout
- Bottom navigation bar (mobile only): Dashboard, Wallets, Transactions, Analytics, Settings
- `/settings` page — read-only group name and member list; "You" badge on current user's row
- Settings link in desktop header nav and mobile bottom nav
- `loading.tsx` skeleton screens for dashboard, wallets, transactions, analytics, settings
- `error.tsx` error boundaries with retry button for dashboard, wallets, transactions, analytics, settings
- Shared `<ErrorPage>` component reused across all error boundaries

### Changed
- Transaction list replaced table with flex rows on mobile; edit/delete actions hidden by default, revealed on tap
- All form `<Select>` components replaced with native `<select>` elements — eliminates Radix scroll-lock on mobile iOS/Android
- Amount input: `type="text"` + `inputMode="decimal"` with comma→period normalization for mobile decimal keyboard
- All pages use fluid widths (`w-full sm:max-w-* sm:mx-auto`) — full width on mobile, centered with max-width on `sm+`
- Analytics KPI cards: `text-base sm:text-xl` and reduced padding on mobile to prevent overflow on narrow screens
- Desktop nav links hidden on mobile; header retains app name, theme toggle, and sign-out button only

### Fixed
- `next-themes` hydration mismatch on `<html>` — added `suppressHydrationWarning`
- Service worker build incompatibility with Next.js 16 Turbopack default — `dev` uses `--turbopack`, `build` uses `--webpack`

---

## [0.2.0] — 2026-07-26

### Added
- `/analytics` page — monthly KPI summary cards (income / expenses / net), horizontal bar chart of expenses by category, wallet balance list
- Month navigation via URL search param (`?month=YYYY-MM`) — server-rendered and shareable; next-month button disabled on current month
- Month filter on `/transactions` page — same URL param pattern; empty state adapts message for past months
- Recharts v3 (`recharts@^3.10.1`) for bar chart rendering
- Dashboard upgrade: primary wallet card with accent styling, all-wallets total below, monthly KPI strip, last 3 transactions, navigation links to all sections

### Changed
- Dashboard replaced placeholder screen with live monthly snapshot

---

## [0.1.0] — 2026-07-23

### Added
- `/transactions` page — transactions grouped by date with "Today" / "Yesterday" / formatted date headers
- Add, edit, and delete transactions via dialog form (type, wallet, amount, category, date, note, to-wallet for transfers)
- Category list filtered by transaction type — income categories shown for income, expense for expense; hidden for transfers
- Transfer rows display both wallet names (e.g. "Cash → Monobank")
- `textarea` shadcn/ui component (note field)
- `type` column on `categories` table; 6 income categories seeded (Salary, Freelance & Business, Investments, Rental Income, Social Benefits, Other Income)
- `is_primary` flag on `wallets`; "Set as primary" checkbox in create/edit dialog; Primary badge in wallet list
- Wallet summary bar at top of `/transactions` — primary wallet name + balance, total across all wallets
- Transactions link in header nav and dashboard

### Fixed
- Transaction dialog closing when Radix Select dropdown opened — added `onPointerDownOutside` guard on `<DialogContent>`

---

## [0.0.1] — 2026-07-09

### Added
- Next.js 16 project scaffold (App Router, TypeScript, Tailwind CSS v4, `src/` layout)
- shadcn/ui initialized; `button`, `card`, `input`, `label`, `select`, `dialog`, `separator` components
- Supabase integration: browser + server clients (`src/lib/supabase/`), session middleware
- Full DB schema migration: `groups`, `profiles`, `wallets`, `categories`, `transactions`, `bank_presets` enums, tables, indexes, RLS policies, `my_group_id()` helper
- Wallet balance DB trigger (`trg_wallet_balance`) — auto-maintains balance on transaction insert/update/delete
- Bank preset + default category seed data
- Profiles auto-creation trigger (`handle_new_user`) — fires on `auth.users` INSERT
- `/sign-up` and `/sign-in` pages — email/password + Google OAuth
- `POST /sign-out` route handler
- `GET /auth/callback` route — OAuth code exchange
- `src/proxy.ts` — Next.js 16 protected routes (renamed from `middleware.ts`)
- `/onboarding` page — group creation for new users without a `group_id`
- `create_group_and_join(text)` SECURITY DEFINER function — atomically creates group and links profile
- `/dashboard` — welcome screen with invite link generator
- `group_invites` table and three RPC functions: `get_invite_info`, `generate_group_invite`, `join_group_via_invite`
- `/invite/[token]` page — handles unauthenticated, ungrouped, and already-grouped states
- Invite token preserved through Google OAuth redirect and email confirmation
- `/wallets` page — list all group wallets with bank preset, currency, and balance
- Create / edit wallet dialog (name, bank preset, currency, owner)
- Delete wallet with `AlertDialog` confirmation
- Header nav with Wallets link; Montserrat body + Poppins heading fonts
- Vercel deployment; auto-deploy from `main`

### Fixed
- `GRANT EXECUTE` missing on `create_group_and_join` — PostgREST silently rejected the RPC call, leaving users stuck on `/onboarding`
- Router cache race condition on group creation — replaced `router.push + router.refresh` with `window.location.href`
- `[local_smtp]` key in `supabase/config.toml` commented out — Supabase GitHub App's older CLI rejected it, causing config parse failures on every push
- RLS chicken-and-egg on `profiles` — new groupless users could not read their own row; split policy into `"own profile"` (FOR ALL) + `"group members read"` (SELECT)
