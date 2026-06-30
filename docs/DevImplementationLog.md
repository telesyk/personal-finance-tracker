# Dev Implementation Log

A running record of implementation stages, tasks, decisions, and notes.
Each stage maps directly to the Development Plan in `FinanceTracker_ProjectNotes.md`.

---

## Versioning Criteria

This project follows [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`

---

### Before MVP (current phase) — only `0.MINOR.PATCH`

The major version stays at **0** until the first public MVP release. During development, only minor and patch versions increment. This signals the product is not yet stable or feature-complete.

---

#### PATCH — `0.x.+1`
A patch is a **small, scoped change that does not add new user-facing functionality**.

Bump patch when:
- Fixing a bug (UI glitch, wrong calculation, broken query)
- Correcting a typo or label in the UI
- Adjusting styling, spacing, or layout without changing behavior
- Fixing a broken migration or seed script
- Updating environment config, `.env.example`, or deploy settings
- Refactoring code internals with no visible change to the user
- Updating a dependency for a security or compatibility fix

> **Rule of thumb:** if a user wouldn't notice it in the UI, it's a patch.

---

#### MINOR — `0.+1.0`
A minor version represents **a completed, working feature or a meaningful group of related changes**.

Bump minor when:
- A full Stage (or a self-contained sub-section of one) is completed and working
- A new screen or page is functional end-to-end
- A new user-facing capability is added (e.g. wallet creation, transaction form, monthly chart)
- A meaningful structural change is made (e.g. RLS policies applied, auth flow complete)
- A group of related patches accumulates into something that feels like a coherent release

> **Rule of thumb:** if a family member could use this new thing today, it's a minor.

> **Reset:** patch resets to 0 on every minor bump. e.g. `0.3.4` → `0.4.0`

---

#### MAJOR — `+1.0.0` *(post-MVP only)*
The major version is **reserved for the first public MVP release and breaking changes thereafter**.

Bump major when:
- `1.0.0` — first MVP is deployed, stable, and shared with the family as the real product
- A breaking change is introduced (e.g. DB schema incompatibility, complete UI redesign, auth system replacement)
- A large feature milestone ships post-1.0 that fundamentally changes how the product works

> **Rule of thumb:** don't touch major until Stage 6 (Quality & Launch) is fully done.

---

### Version Map — Planning Phase (retroactive)

| Version | What it represented |
|---|---|
| `0.1.0` | Initial planning: goals, stack, data model, MVP screens |
| `0.2.0` | Data model extended: Group entity, BankPresets, wallet source |
| `0.3.0` | Bank list revised; Monobank + PrivatBank added; format → Markdown |
| `0.4.0` | Bank presets trimmed to active banks; PayPal + Klarna added |
| `0.5.0` | Future extension features section added |
| `0.6.0` | Tech stack finalized: Next.js + shadcn/ui |
| `0.7.0` | Full DB schema written (SQL, RLS, seed data) |
| `0.8.0` | Development plan written (7 stages) |
| `0.1.0` | *(next)* Stage 0 complete — project scaffold live on Vercel |

---

## Stage 0 — Project Setup

**Goal:** Get a working, deployed skeleton before writing any feature code.
**Estimate:** 1–2 days

### Tasks

#### Next.js Scaffold
- [x] Create new Next.js project with App Router and TypeScript
  ```bash
  npx create-next-app@latest finance-tracker --typescript --tailwind --app --src-dir
  ```
- [x] Verify folder structure: `src/app`, `src/components`, `src/lib`
- [x] Remove boilerplate (default page content, placeholder CSS)

#### Tailwind + shadcn/ui
- [x] Confirm Tailwind CSS v4 is active (ships with Next.js by default now)
- [x] Initialize shadcn/ui
  ```bash
  npx shadcn@latest init
  ```
- [x] Install first components to verify setup: `button`, `card`, `input`
  ```bash
  npx shadcn@latest add button card input
  ```

#### Supabase Setup
- [x] Create new Supabase project at supabase.com
- [x] Copy project URL and anon key into `.env.local`
- [x] Install Supabase client libraries (`@supabase/supabase-js`, `@supabase/ssr`)
- [x] Create `src/lib/supabase/client.ts` — browser client
- [x] Create `src/lib/supabase/server.ts` — server client (for Server Components / Route Handlers)
- [x] Create `src/lib/supabase/middleware.ts` — session refresh helper
- [x] Create `middleware.ts` at project root — wires `updateSession` into Next.js middleware

#### Database Migrations
- [x] Set up Supabase CLI (`brew install supabase/tap/supabase`), `supabase init`, linked to remote project
- [x] Created `supabase/migrations/20260630201938_initial_schema.sql` with full schema
- [x] Run enums (`bank_type`, `transaction_type`)
- [x] Run table creation scripts (profiles, groups, bank_presets, wallets, categories, transactions)
- [x] Run indexes
- [x] Enable RLS and apply all policies + `my_group_id()` helper function
- [x] Wallet balance DB trigger (`trg_wallet_balance`) — handles insert / update / delete
- [x] Run seed data (bank presets + default categories)
- [x] Applied to remote via `supabase db push`

#### Environment & Config
- [x] Add `.env.local` to `.gitignore`
- [x] Create `.env.example` with placeholder keys for reference
- [x] Set up `src/lib/supabase` folder with typed client helpers
- [x] Migrated package manager from npm → pnpm (v10.14.0; `packageManager` field in `package.json`; `pnpm-lock.yaml` committed; `package-lock.json` removed)
- [x] Verified dev server runs locally (`pnpm dev`, HTTP 200 at localhost:3000)

#### Vercel Deployment
- [ ] Push repo to GitHub
- [ ] Connect GitHub repo to Vercel
- [ ] Add environment variables in Vercel dashboard (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] Trigger first deploy — confirm blank app is live at Vercel URL
- [ ] Verify auto-deploy on push to `main` branch works

### Notes

**Package manager — pnpm:** Switched from npm to pnpm for faster installs and disk efficiency. Use `pnpm` for all commands going forward (`pnpm dev`, `pnpm add`, etc.). Vercel auto-detects `pnpm-lock.yaml`.

**Supabase SSR client pattern:** Per `@supabase/ssr` v0.12 docs, always use `getUser()` (makes a network call to Auth server) rather than `getSession()` (reads cookies only, unverified) for any authorization decisions. The middleware calls `getUser()` on every request to keep the session cookie refreshed.

**`.gitignore` — `/docs` exclusion:** The `/docs` line in `.gitignore` is intentional during the early development stage. The docs folder is not tracked in git by design at this point. **Do not remove this line without a direct instruction from the project owner.**

**Version scheme clarification:** The planning retroactive versions (0.1.0–0.8.0) in the Version Map above exist only as documentation milestones. The first real code version deployed to Vercel is `0.1.0` — this is what `package.json` reflects. Future development versions follow from there.

---

## Stage 1 — Auth & Groups
> Tasks to be added when Stage 0 is complete.

---

## Stage 2 — Wallets
> Tasks to be added when Stage 1 is complete.

---

## Stage 3 — Transactions
> Tasks to be added when Stage 2 is complete.

---

## Stage 4 — Analytics
> Tasks to be added when Stage 3 is complete.

---

## Stage 5 — PWA & Mobile Polish
> Tasks to be added when Stage 4 is complete.

---

## Stage 6 — Quality & Launch
> Tasks to be added when Stage 5 is complete.
