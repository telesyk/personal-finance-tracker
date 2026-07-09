# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: PATCH only (`0.0.x`) until a release is explicitly approved.

---

## [Unreleased]

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
