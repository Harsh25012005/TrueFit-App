# TrueFit — Implementation Plan (MVP)

> Follows PRD.md (M1–M14), ARCHITECTURE.md, DATABASE.md, API.md. Each task is ≤ 1–2 hours. Each phase is a **vertical slice**: UI + local DB + sync/server + tests, and the app must build and run (`npm run android`) at the end of every phase. Tick a box only when its **Verify** step passes. One feature at a time (FEATURES.md); wait for confirmation between features.

Legend: **Files** = main files touched · **Verify** = how to prove it works · **Deps** = tasks that must be done first.

---

## Phase 0 — Foundation (runnable empty app)
- [ ] **0.1 Scaffold Expo app config** — Files: `app.config.ts`, `babel.config.js`, `metro.config.js`, `tsconfig.json`, `app/_layout.tsx`, `app/index.tsx`. Verify: `npm run android` opens a blank screen. Deps: —
- [ ] **0.2 Lint/format/typecheck** — Files: `eslint.config.js`, `.prettierrc`. Verify: `npm run lint && npm run typecheck` pass. Deps: 0.1
- [ ] **0.3 Theme tokens + NativeWind** — Files: `tailwind.config.js`, `global.css`, `src/theme/*`. Verify: test screen shows light/dark colors exactly as DESIGN.md §2. Deps: 0.1
- [ ] **0.4 Fonts + icons** — Files: `app/_layout.tsx`, `src/components/ui/Icon.tsx`. Verify: Plus Jakarta Sans and Gujarati text render; Tabler icon shows. Deps: 0.3
- [ ] **0.5 i18n** — Files: `src/i18n/*`. Verify: switching language changes a test string in EN/GU/HI; unit test for missing keys. Deps: 0.1
- [ ] **0.6 UI primitives batch 1** (Button, Input, Card, ListRow, Chip, Toast, EmptyState, Skeleton) — Files: `src/components/ui/*`. Verify: component tests for each state; visual check on a dev "Kitchen sink" screen (dev only). Deps: 0.3
- [ ] **0.7 UI primitives batch 2** (Sheet, Dialog, Segmented, Stepper, Switch, StatusPill, TopBar, TabBar, PinPad, MoneyInput, PhoneInput) — Verify: as 0.6. Deps: 0.6
- [ ] **0.8 Errors, logger, Sentry** — Files: `src/lib/errors.ts`, `logger.ts`, `sentry.ts`. Verify: unit tests map sample Supabase errors to `AppError`; test crash appears in Sentry (dev project). Deps: 0.1
- [ ] **0.9 Jest + RNTL setup, CI** — Files: `jest` config in package.json, `.github/workflows/ci.yml`. Verify: CI runs typecheck, lint, test green. Deps: 0.2
- [ ] **0.10 EAS profiles** — Files: `eas.json`. Verify: `npm run build:dev` produces an installable APK. Deps: 0.1

**DoD:** app installs and opens with tokens, fonts, 3 languages and the component set; CI green; no secrets in repo.

## Phase 1 — Database + local DB foundation
- [ ] **1.1 Local Supabase** — Files: `supabase/config.toml`. Verify: `npm run db:start` prints URLs. Deps: 0.1
- [ ] **1.2 Migrations 0001–0003** (enums, helpers, profiles/shops/subscriptions) — Verify: `npm run db:reset` succeeds. Deps: 1.1
- [ ] **1.3 Migrations 0004–0007** (garments, customers, measurements, orders, payments) — Verify: `npm run db:reset`. Deps: 1.2
- [ ] **1.4 Migration 0008 RPCs + 0009 RLS** — Verify: pgTAP tests: owner A cannot read/write owner B rows; expired plan blocks inserts. `npm run test:db`. Deps: 1.3
- [ ] **1.5 Seed** — Files: `supabase/seed.sql`. Verify: seed rows visible in Studio. Deps: 1.4
- [ ] **1.6 Generated types** — Files: `src/types/supabase.ts`. Verify: `npm run db:types && npm run typecheck`. Deps: 1.4
- [ ] **1.7 Drizzle SQLite schema + migrations** — Files: `src/db/schema.ts`, `src/db/client.ts`, `drizzle.config.ts`, `src/db/migrations/*`. Verify: `npm run db:local:generate`; app starts and creates tables (log). Deps: 0.1

**DoD:** server schema matches DATABASE.md, RLS tests pass, device DB created on launch.

## Phase 2 — Auth & onboarding (M1, M2, M3, M13)
- [ ] **2.1 Supabase client + SecureStore session** — Files: `src/lib/supabase.ts`, `secureStorage.ts`, `src/stores/session.store.ts`. Verify: session survives app restart (unit test with mocked storage). Deps: 1.6
- [ ] **2.2 Welcome + sign-in choice (S2, S3)** — Verify: screens match DESIGN.md §7. Deps: 0.7
- [ ] **2.3 Email sign-up/sign-in + verify code (S6, S5)** — Files: `src/features/auth/*`, `app/(auth)/*`. Verify: sign up with local Inbucket email code, sign in. Deps: 2.1
- [ ] **2.4 Forgot/reset password (S7, S8)** — Verify: reset via code; old password fails. Deps: 2.3
- [ ] **2.5 Phone OTP (S4, S5)** — Verify: local test OTP (`config.toml` test numbers) signs in. Deps: 2.1
- [ ] **2.6 Google sign-in** — Files: `src/lib/google.ts`. Verify: dev build signs in with a test Google account. Deps: 2.1
- [ ] **2.7 Shop setup (S9) + `create_shop`** — Verify: new user lands on Home after setup; shop, trial, Shirt/Pant rows exist. Deps: 2.3, 1.4
- [ ] **2.8 Language choice persisted** — Verify: language survives restart and is saved to `profiles.language`. Deps: 0.5, 2.7
- [ ] **2.9 PIN set/unlock + fingerprint (S10, S11)** — Files: `src/features/auth/pin.ts`. Verify: PIN hashed (SHA-256 + salt) in SecureStore; 5 wrong tries → 30 s lock. Deps: 2.7
- [ ] **2.10 Route gate** — Files: `app/index.tsx`, `app/(app)/_layout.tsx`. Verify: Maestro flow `e2e/auth.yaml`: fresh install → sign up → setup → Home; relaunch → PIN → Home. Deps: 2.7, 2.9
- [ ] **2.11 Sign out + delete account (S29) + `delete-account` function** — Verify: sign out clears local DB; delete schedules purge. Deps: 2.10

**DoD:** all three sign-in methods work on a dev build; tab shell with empty Home; e2e auth flow green.

## Phase 3 — Cloth types & fields (M4)
- [ ] **3.1 Repo + schema** — Files: `src/features/garments/*`. Verify: unit tests for add/rename/reorder/soft-delete. Deps: 1.7
- [ ] **3.2 Outbox enqueue on write** — Files: `src/sync/outbox.ts`. Verify: writes create outbox rows (unit test). Deps: 1.7
- [ ] **3.3 Cloth types list + detail (S25, S26)** — Verify: add Kurta with fields; reorder; delete field. Deps: 3.1
- [ ] **3.4 Pull on first sign-in for garments** — Files: `src/sync/pull.ts`. Verify: rows from `create_shop` appear on device. Deps: 2.7

**DoD:** owner manages cloth types offline; changes are queued.

## Phase 4 — Customers & measurements (M5, M6)
- [ ] **4.1 Customer repo/schema + next book no.** — Verify: unit tests (phone format, duplicate warning). Deps: 3.2
- [ ] **4.2 Customers tab (S14) with search + "Has dues"** — Verify: search by name/phone/book no. on 1,000 seeded rows < 100 ms. Deps: 4.1
- [ ] **4.3 Add/edit customer sheet (S22)** — Verify: validation messages in 3 languages. Deps: 4.1
- [ ] **4.4 Customer detail (S21)** — Verify: tabs Measurements / Orders (empty state). Deps: 4.3
- [ ] **4.5 Measurement sheet (S23)** with enter-to-next and in/cm — Verify: values saved in inches; cm shown correctly. Deps: 4.4
- [ ] **4.6 History (S24)** — Verify: editing creates a version; max 10 kept. Deps: 4.5

**DoD:** customers and measurements fully usable offline.

## Phase 5 — Sync engine (M12)
- [ ] **5.1 Push** (FK order, batches of 200, upsert) — Files: `src/sync/push.ts`, `tables.ts`. Verify: integration test against local Supabase. Deps: 4.6
- [ ] **5.2 Pull with cursor + tombstones** — Verify: row deleted on server disappears on device. Deps: 5.1
- [ ] **5.3 Engine scheduling + backoff + NetInfo** — Files: `src/sync/engine.ts`, `src/stores/sync.store.ts`. Verify: airplane mode → changes queue; reconnect → synced within 10 s. Deps: 5.2
- [ ] **5.4 Sync status indicator** — Verify: "Saved on phone / Synced / Sync error" states per DESIGN.md. Deps: 5.3
- [ ] **5.5 Restore on new phone** — Verify: sign in on second emulator → all data appears. Deps: 5.3

**DoD:** data round-trips between two devices; offline edits survive app kill.

## Phase 6 — Orders (M7)
- [ ] **6.1 Totals + order number logic** — Files: `orderTotals.ts`, `orderNumber.ts`. Verify: unit tests (extras, discount, GST rounding, provisional numbers). Deps: 1.7
- [ ] **6.2 Wizard step 1: customer pick/create** — Files: `app/(app)/orders/new.tsx`, `components/orders/OrderWizard/*`. Deps: 4.3
- [ ] **6.3 Step 2: clothes, qty, rate (no default), styles; measurement check + "Take measurement"** — Verify: cannot continue without measurement; shortcut returns to wizard. Deps: 6.2, 4.5
- [ ] **6.4 Step 3: due date, urgent, extras, discount, GST, advance, note** — Verify: advance ≤ total. Deps: 6.3
- [ ] **6.5 Save offline + `create_order` online + clash handling** — Verify: two offline phones → second order renumbered with toast. Deps: 6.4, 5.3
- [ ] **6.6 Order detail (S17)** — Verify: items, totals, payments, status shown. Deps: 6.5

**DoD:** order created end-to-end offline and online; e2e `e2e/new-order.yaml` green.

## Phase 7 — Status, payments, lists, Home (M8, M9, M10)
- [ ] **7.1 Status change + Undo + deliver dialog with balance** — Verify: Received→Ready→Delivered; deliver unpaid allowed. Deps: 6.6
- [ ] **7.2 Payments add/remove/refund (S18)** — Verify: balance updates; cannot exceed balance. Deps: 6.6
- [ ] **7.3 Cancel / restore / repeat order** — Deps: 7.1
- [ ] **7.4 Orders tab (S13)** filters, sort, grouping, search — Verify: counts match seeded data. Deps: 6.6
- [ ] **7.5 Home Today (S12)** — Verify: collected/new/delivered numbers; one-tap Ready/Deliver. Deps: 7.1, 7.2
- [ ] **7.6 Customer orders tab + dues filter** — Deps: 7.2

**DoD:** daily shop loop (take order → ready → deliver → collect) works offline.

## Phase 8 — WhatsApp messages (M11)
- [ ] **8.1 Templates in 3 languages** — Files: `src/features/messages/*`. Verify: unit tests for each template and number formatting. Deps: 7.2
- [ ] **8.2 Share sheet → `wa.me` link, fallback to system share** — Verify: opens WhatsApp with text on a device. Deps: 8.1

## Phase 9 — Subscription (M14)
- [ ] **9.1 RevenueCat setup + products** — Files: `src/features/subscription/*`. Verify: sandbox offering loads. Deps: 2.10
- [ ] **9.2 Paywall/subscription screen (S28)** — Verify: license-tester purchase activates Pro. Deps: 9.1
- [ ] **9.3 `revenuecat-webhook` function** — Verify: test events update `subscriptions` (idempotent). Deps: 9.1
- [ ] **9.4 Read-only mode** — Verify: expired plan blocks new customers/orders with paywall; delivery and payments still work. Deps: 9.3, 7.2

## Phase 10 — Polish & settings
- [ ] **10.1 Settings (S27)**: shop details, GSTIN, UPI, unit, weekly off — Deps: 2.7
- [ ] **10.2 Global search + Help (S30)** — Deps: 7.4
- [ ] **10.3 Sample data option** — Deps: 7.5
- [ ] **10.4 Accessibility pass** (DESIGN.md §8: labels, 48 dp targets, font scale 200%) — Deps: all screens
- [ ] **10.5 Performance pass** (cold start < 2.5 s on mid phone, lists 60 fps with 5,000 orders) — Deps: all

## Phase 11 — Launch
- [ ] **11.1 Production Supabase project (ap-south-1), secrets, SMTP, Twilio, Google, backups** — Verify: AUTH_SECURITY.md checklist.
- [ ] **11.2 Privacy policy, terms, Data safety form, store listing (EN/GU/HI)**
- [ ] **11.3 Internal testing track → closed test with 5–10 tailors**
- [ ] **11.4 Fix top issues, production release**

**DoD (MVP):** all PRD M1–M14 acceptance checklists in FEATURES.md ticked; TESTING.md manual QA list passed; no open P1 bugs.
