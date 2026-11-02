# TrueFit — Architecture

> Reads from **PRD.md** and **DESIGN.md**. Keep it simple: one Expo app, one Supabase project, a few Edge Functions. No custom servers.

## 1. Tech stack

| Layer | Choice | Why (one line) |
|---|---|---|
| Mobile app | **React Native 0.88 + Expo SDK 58** (TypeScript 6) | One codebase, native Android build today and iOS later; Expo handles builds, updates and native modules. |
| Navigation | **Expo Router 58** | File-based routes = the folder tree is the screen map in DESIGN.md. |
| Styling | **NativeWind 4** (Tailwind 3.4 classes) + `src/theme/tokens.ts` | Tailwind is the team's existing skill; tokens enforce DESIGN.md colours/sizes. |
| Local database | **expo-sqlite** + **Drizzle ORM** | Offline-first: every screen reads from SQLite instantly; Drizzle gives typed queries and live queries. |
| Sync | Custom **outbox + pull-cursor** sync over Supabase REST | Owner-only data and one main phone make last-write-wins sync small and predictable without another vendor. |
| Icons | **Tabler Icons** (`@tabler/icons-react-native`, per-icon imports) over `react-native-svg` | DESIGN.md §5 icon set; per-icon imports keep the bundle small. |
| UI state | **Zustand 5** | Tiny store for session, UI flags and sync status; no boilerplate. |
| Forms & validation | **react-hook-form + zod 4** | Fast forms; one zod schema reused for UI, local DB writes and API payloads. |
| i18n | **i18next + react-i18next + expo-localization** | Mature, supports Gujarati/Hindi plurals and runtime language switch. |
| Backend platform | **Supabase** (Postgres 17, Auth, Storage, Edge Functions) | Serverless: auto REST API, row-level security, auth providers and storage in one service. |
| Auth | **Supabase Auth** — email+password (6-digit email codes), Google (ID token) | Covers both PRD sign-in methods with secure JWT sessions. |
| Server logic | **Supabase Edge Functions** (Deno, TypeScript) | Only for things the client must not do: billing webhooks, account deletion, AI proxy. |
| Subscriptions | **Google Play Billing via RevenueCat** (`react-native-purchases`) | Play policy requires Play Billing; RevenueCat removes receipt-validation work. |
| File storage (V2) | **Supabase Storage** (private bucket) | Same auth/RLS as the database; signed URLs for photos. |
| AI (V2) | **Anthropic Claude** via an Edge Function | Strong multilingual (GU/HI) answers and tool use; key stays on the server. |
| Error monitoring | **Sentry** (`@sentry/react-native`) | Crash and error reporting with release tracking. |
| Builds & releases | **EAS Build / Submit / Update** | Cloud Android builds, Play Store upload and over-the-air JS fixes. |
| Testing | **Jest + jest-expo + React Native Testing Library**, **pgTAP** (`supabase test db`), **Maestro** E2E | Standard, well-documented tools for each layer. |
| Hosting | **Supabase Cloud, region ap-south-1 (Mumbai)**; Play Store for the app | Low latency for Indian users; managed backups. |

**Not used on purpose:** no custom Node server, no Redux, no GraphQL, no WatermelonDB/PowerSync, no Firebase.

## 2. Folder and file structure

```
truefit/
├── app/                              # Expo Router — one file per screen (DESIGN.md §7)
│   ├── _layout.tsx                   # Providers: fonts, i18n, theme, Sentry, DB, session gate
│   ├── index.tsx                     # S1 Splash → redirect (welcome | sign-in | lock | home)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx               # S2
│   │   ├── sign-in.tsx               # S3
│   │   ├── verify-otp.tsx            # S5 email code (sign-up + password reset)
│   │   ├── email.tsx                 # S6
│   │   ├── forgot-password.tsx       # S7
│   │   └── reset-password.tsx        # S8 (after the reset code is verified)
│   ├── (onboarding)/
│   │   ├── shop-setup.tsx            # S9 (+ Start fresh / sample data choice)
│   │   └── set-pin.tsx               # S10
│   ├── lock.tsx                      # S11 PIN unlock
│   ├── (dev)/                        # __DEV__ only: tokens.tsx (colour check), kitchen-sink.tsx
│   └── (app)/
│       ├── _layout.tsx               # Requires session + shop; starts sync; paywall gate
│       ├── (tabs)/
│       │   ├── _layout.tsx           # Floating tab bar / sidebar
│       │   ├── home.tsx              # S12 Home (not index.tsx: that would clash with app/index.tsx at "/")
│       │   ├── orders.tsx            # S13
│       │   ├── customers.tsx         # S14
│       │   └── more.tsx              # S15
│       ├── orders/
│       │   ├── new.tsx               # S16 New order wizard
│       │   └── [id].tsx              # S17 Order detail (S18–S20 are sheets)
│       ├── customers/
│       │   └── [id].tsx              # S21 (S22–S24 are sheets)
│       ├── cloth-types/
│       │   ├── index.tsx             # S25
│       │   └── [id].tsx              # S26
│       ├── settings/
│       │   ├── index.tsx             # S27
│       │   ├── subscription.tsx      # S28
│       │   └── account.tsx           # S29
│       ├── help.tsx                  # S30
│       └── search.tsx                # Global search
├── src/
│   ├── components/
│   │   ├── ui/                       # Design-system primitives (DESIGN.md §6)
│   │   │   ├── Button.tsx  Input.tsx  MoneyInput.tsx  PhoneInput.tsx  SearchInput.tsx
│   │   │   ├── Card.tsx  ListRow.tsx  Chip.tsx  Segmented.tsx  Stepper.tsx  Switch.tsx
│   │   │   ├── Sheet.tsx  Dialog.tsx  Toast.tsx  Banner.tsx  EmptyState.tsx  Skeleton.tsx
│   │   │   ├── StatusPill.tsx  Avatar.tsx  TopBar.tsx  TabBar.tsx  PinPad.tsx  Icon.tsx
│   │   │   ├── Text.tsx (fonts per script)  FocusRing.tsx  useInteraction.ts  motion.ts
│   │   │   └── index.ts
│   │   ├── orders/                   # OrderRow, OrderWizard/*, PaymentSheet, DeliverDialog, ShareSheet
│   │   ├── customers/                # CustomerRow, CustomerSheet, CustomerPicker
│   │   ├── measurements/             # MeasurementCard, MeasurementSheet, HistorySheet
│   │   ├── home/                     # TodaySummary, TodayWork, QuickLinks
│   │   └── garments/                 # FieldRow, GarmentSheet
│   ├── features/                     # Business logic per feature (no JSX)
│   │   ├── auth/        (auth.service.ts, useSession.ts)
│   │   ├── shop/        (shop.repo.ts, shop.schema.ts)
│   │   ├── customers/   (customers.repo.ts, customers.schema.ts, useCustomers.ts)
│   │   ├── garments/    (garments.repo.ts, garments.schema.ts)
│   │   ├── measurements/(measurements.repo.ts, measurements.schema.ts)
│   │   ├── orders/      (orders.repo.ts, orders.schema.ts, orderTotals.ts, orderNumber.ts, status.ts)
│   │   ├── payments/    (payments.repo.ts, payments.schema.ts)
│   │   ├── home/        (today.ts)
│   │   ├── messages/    (whatsapp.ts, templates.ts)
│   │   ├── subscription/(entitlement.ts, purchases.service.ts)
│   │   └── ai/          (ai.service.ts — V2)
│   ├── db/
│   │   ├── schema.ts                 # Drizzle SQLite schema (mirrors DATABASE.md)
│   │   ├── client.ts                 # openDatabaseSync + drizzle()
│   │   ├── migrations/               # drizzle-kit output (local SQLite)
│   │   └── seed-sample.ts            # "Try with sample data"
│   ├── sync/
│   │   ├── engine.ts                 # runSync(): push → pull, scheduling, backoff
│   │   ├── outbox.ts                 # enqueue(change), list, markDone
│   │   ├── push.ts                   # upsert batches per table (FK order)
│   │   ├── pull.ts                   # fetch rows updated since cursor
│   │   └── tables.ts                 # sync order + column maps
│   ├── lib/
│   │   ├── supabase.ts               # createClient with SecureStore session storage
│   │   ├── secureStorage.ts
│   │   ├── errors.ts                 # AppError, toAppError(), error codes
│   │   ├── money.ts  dates.ts  phone.ts  ids.ts (uuid v4)  logger.ts  preferences.ts (device prefs)
│   │   ├── google.ts                 # Google Sign-In wrapper (ID token)
│   │   └── sentry.ts
│   ├── i18n/  (index.ts, en.json, gu.json, hi.json)
│   ├── theme/ (tokens.ts, colors.ts, typography.ts)
│   ├── stores/ (session.store.ts, ui.store.ts, sync.store.ts)
│   └── types/ (supabase.ts — generated, domain.ts, tabler-icons.d.ts)
├── supabase/
│   ├── config.toml
│   ├── migrations/                   # SQL migrations (DATABASE.md §9 order)
│   ├── seed.sql                      # Local dev seed
│   ├── tests/                        # pgTAP RLS + constraint tests (*.test.sql)
│   └── functions/
│       ├── _shared/ (cors.ts, errors.ts, auth.ts, supabaseAdmin.ts, llm.ts — V2)
│       ├── revenuecat-webhook/index.ts
│       ├── delete-account/index.ts
│       └── ai-chat/index.ts          # V2
├── e2e/                              # Maestro flows (*.yaml)
├── assets/ (logo/, icons/, splash/)
├── app.config.ts  eas.json  babel.config.js  metro.config.js
├── tailwind.config.js  global.css  drizzle.config.ts  tsconfig.json
├── eslint.config.js  .prettierrc  .env.example  package.json
└── PRD.md DESIGN.md ARCHITECTURE.md DATABASE.md API.md AGENTS.md PLAN.md ...
```

Tests live next to the code they test: `orderTotals.test.ts` beside `orderTotals.ts`.

## 3. Data flow

```
┌────────────── Android app ──────────────┐            ┌──────────── Supabase ────────────┐
│ Screen (app/*)                           │            │ Auth (JWT)                        │
│   │ calls hook / repo (src/features)     │  HTTPS     │ PostgREST  /rest/v1/*  ← RLS      │
│   ▼                                      │  + JWT     │ Postgres (tables, triggers, RPC)  │
│ Repo → SQLite (Drizzle)  ──writes──► Outbox ── push ─►│ Storage    /storage/v1 (V2)       │
│   ▲                          ▲           │            │ Edge Fns   /functions/v1/*        │
│   └── live queries re-render │ pull ◄────┼── rows updated since cursor                    │
│ Zustand (session, ui, sync status)       │            └──────┬──────────────┬─────────────┘
└──────────┬─────────────────┬─────────────┘                   │              │
           │                 │                         RevenueCat webhook   Anthropic API (V2)
     Google Sign-In     RevenueCat SDK ── Play Billing          ▲              ▲
     (ID token → Supabase)                                       └── Edge Functions only
```

1. **Reads:** screens never call the network. They read SQLite through repos/live queries → instant, offline.
2. **Writes:** repo validates with zod → writes the row in SQLite (with client UUID, `updated_at = now`) → adds an outbox entry `{table, row_id, op}` in the same SQLite transaction.
3. **Push:** sync engine (on app foreground, connectivity regained, every 60 s while online, pull-to-refresh) sends outbox rows in FK order (shops → garment_types → measurement_fields → customers → measurements → measurement_values → orders → order_items → order_extras → payments) using `POST /rest/v1/{table}` with `Prefer: resolution=merge-duplicates` (upsert by id). Server triggers set server `updated_at`.
4. **Pull:** for each table `GET /rest/v1/{table}?updated_at=gt.{cursor}&order=updated_at.asc&limit=500`, upsert locally, store new cursor. Soft-deleted rows (`deleted_at`) are pulled as tombstones.
5. **Conflicts:** last write wins by server `updated_at`. Order-number clash (`unique(shop_id, order_no)`) → push calls `rpc/claim_order_no` to get the next free number, updates local row, shows a toast.
6. **Auth:** Supabase JS client holds the session in SecureStore; every REST call carries the access JWT; RLS limits rows to the owner's shop.
7. **Third parties:** Google Sign-In returns an ID token → `supabase.auth.signInWithIdToken`. RevenueCat purchase → RevenueCat server → webhook Edge Function → `subscriptions` table → pulled like other data. AI (V2) → `functions/v1/ai-chat` → Anthropic; the function reads shop data with the user's JWT (RLS still applies).

## 4. State management
| Kind of state | Where | Example |
|---|---|---|
| Business data | **SQLite** (source of truth on device) via Drizzle live queries | customers, orders, measurements |
| Server data | Supabase Postgres (source of truth across devices) | same tables + subscriptions |
| Session/auth | Zustand `session.store` + SecureStore | user id, shop id, PIN locked? |
| UI state | Component state; Zustand `ui.store` for cross-screen UI | active filter, toast queue, theme |
| Sync status | Zustand `sync.store` | idle/syncing/offline/error, pending count, last synced |
| Forms | react-hook-form (local) | order wizard steps (kept in one form state) |

No global cache library is needed because SQLite is the cache.

## 5. Error-handling strategy
- **One error type** `AppError { code, message, details?, status?, retryable }` in `src/lib/errors.ts`; `toAppError()` converts zod, SQLite, PostgREST, Auth and network errors into it. Codes follow API.md §2 (e.g. `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`, `PLAN_REQUIRED`, `NETWORK_OFFLINE`).
- **Forms:** zod errors map to field messages (translated keys) before anything is saved.
- **Local writes** fail only on bugs/constraints → toast "Couldn't save" + Sentry report; nothing is half-written (SQLite transaction).
- **Sync:** retry with exponential backoff (5 s → 15 min, jitter); `retryable=false` errors (RLS/validation) move the outbox item to `failed` and show in Sync status with "Try again"/"Discard my change"; data is never silently dropped.
- **Auth:** expired refresh token → sign-in screen, local data kept.
- **Edge Functions** always return the standard error JSON (API.md §2); webhook handlers are idempotent.
- **UI:** every async screen has loading (skeleton), empty and error states (DESIGN.md §6); an error boundary per route shows "Something went wrong · Try again" and reports to Sentry.
- **Never** show raw error text or stack traces to users; log `request_id` for support.

## 6. Conventions
**Naming**
- Files: React components `PascalCase.tsx`; everything else `camelCase.ts`; routes follow Expo Router (`kebab-case.tsx`, `[id].tsx`).
- Components `PascalCase`; hooks `useThing`; functions/variables `camelCase`; constants `UPPER_SNAKE_CASE`; types/interfaces `PascalCase` (no `I` prefix); zod schemas `thingSchema`.
- Database: `snake_case` tables (plural) and columns; FKs `<singular>_id`; booleans `is_*`; timestamps `*_at`; dates `*_on`/`*_date`.
- i18n keys: `feature.screen.key` (e.g. `orders.new.createButton`).
- Edge Functions: `kebab-case` folder names.

**Code style**
- TypeScript `strict: true`; no `any` (use `unknown` + zod).
- Prettier (2 spaces, single quotes, semicolons, width 100) + `eslint-config-expo`.
- Functions ≤ 40 lines where practical; one component per file; business logic in `src/features`, not in screens.
- Money stored as **integer rupees** (no paise in MVP); measurements as decimals with 2 places.
- Dates stored ISO (`YYYY-MM-DD` for dates, UTC ISO for timestamps); displayed in `Asia/Kolkata`.
- All user-facing strings through `t()`; no hard-coded text.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).

## 7. Environment variables
| Name | Where | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | app (.env) | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | app (.env) | Public anon key (safe; RLS protects data) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | app (.env) | Google OAuth web client ID used for ID tokens |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | app (.env) | RevenueCat public SDK key (Android) |
| `EXPO_PUBLIC_SENTRY_DSN` | app (.env) | Sentry DSN |
| `EXPO_PUBLIC_APP_ENV` | app (.env) | `development` / `preview` / `production` |
| `SENTRY_AUTH_TOKEN` | EAS secret | Upload source maps at build time |
| `REVENUECAT_WEBHOOK_SECRET` | Supabase function secret | Verifies RevenueCat webhook `Authorization` header |
| `ANTHROPIC_API_KEY` | Supabase function secret (V2) | Claude API for ai-chat |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Provided automatically to Edge Functions | Server access (service role only inside functions) |

Configured in the Supabase dashboard (not env files): Google OAuth client, SMTP (email) + email templates showing the 6-digit code, redirect URLs.

## 8. Scalability and performance
- **Expected load:** ≤ 10,000 shops in year 1; ≤ 100 orders/shop/day → ~1 M orders/year; fits a single Supabase Postgres (Pro) comfortably with the indexes in DATABASE.md.
- **App performance:** all lists use `FlatList`/`FlashList`-style virtualization with fixed row heights; SQLite queries indexed on `shop_id`, `customer_id`, `due_date`, `status`; first screen render < 1 s on a 3 GB RAM phone; app size target < 40 MB.
- **Sync cost:** delta pulls by `updated_at` (indexed), batches of 500, gzip; initial restore streams tables in FK order with progress.
- **Images (V2):** compress to max 1280 px JPEG q0.7 (~150 KB) before upload; thumbnails via Supabase image transformations.
- **Edge Functions:** stateless; AI calls rate-limited per shop (API.md); webhook work < 1 s.
- **Database:** RLS uses an indexed `shop_id` and a cached `current_shop_id()` (STABLE, SECURITY DEFINER); avoid joins in policies.
- **Growth path (only if needed):** read replicas for reports, materialized daily summaries for V2 reports, move photos to a CDN; none required for MVP.
