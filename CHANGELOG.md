# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: PATCH only (`0.0.x`) until a release is explicitly approved.

---

## [Unreleased]

---

<<<<<<< HEAD
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

=======
>>>>>>> origin/main
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
