# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions before 1.0.0 represent planning and pre-development stages.

---

## [Unreleased]

### Planned
- Project scaffold (Next.js + Tailwind + shadcn/ui)
- Supabase project setup and schema migration
- Vercel deployment pipeline

---

## [0.8.0] — 2025-06-25 — Development Plan

### Added
- Full 7-stage development plan with time estimates
- Stage 7+ iterative extension roadmap

---

## [0.7.0] — 2025-06-25 — Database Schema

### Added
- Full PostgreSQL / Supabase schema: enums, tables, indexes, RLS policies
- Seed data for bank presets and default categories
- Key schema design decisions documented (amount always positive, wallet balance trigger, transfer constraint)

---

## [0.6.0] — 2025-06-25 — Tech Stack Finalized

### Added
- Next.js (App Router) confirmed as main framework
- shadcn/ui confirmed as primary UI component library
- Tailwind CSS v4 as styling layer
- Rationale documented for UI library choice (vs HeroUI, Mantine)

---

## [0.5.0] — 2025-06-25 — Future Extension Features

### Added
- Multilanguage support (DE, EN, UA)
- Multicurrency analytics with live FX rates
- UX analytics / usage data gathering

---

## [0.4.0] — 2025-06-25 — Bank Presets Trimmed

### Changed
- Bank preset list reduced to currently used banks only: Sparkasse, Revolut, Wise, Monobank, PrivatBank, PayPal, Klarna
- Remaining banks deferred to open banking API integration (Nordigen / GoCardless)

### Added
- PayPal and Klarna added to preset list

---

## [0.3.0] — 2025-06-25 — Bank List & Document Format

### Changed
- Removed Vivid Money and Trade Republic from bank presets
- Project notes format changed from .docx to Markdown

### Added
- Monobank (UA fintech) added to bank presets
- PrivatBank (UA traditional/online) added to bank presets

---

## [0.2.0] — 2025-06-25 — Data Model Extended

### Added
- Group entity — family/household model with shared wallets and transactions
- BankPreset seed data: German traditional banks + international fintech (Revolut, Wise, N26)
- `wallet_id` as explicit transaction source field
- `transfer_to_wallet_id` for wallet-to-wallet transfers

---

## [0.1.0] — 2025-06-25 — Initial Planning

### Added
- Project goals and scope defined
- Tech stack selected: React (PWA), Supabase, Vercel
- Initial data model: User, Wallet, Transaction, Category
- MVP screens outlined: Dashboard, Add Transaction, Wallets, History, Analytics, Settings
- Build phases 1–4 defined
