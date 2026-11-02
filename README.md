# TrueFit

**Tailor shop manager for Android — customers, measurements, orders and payments in one simple app that works offline.**

> **Status: planning.** This repository currently holds the product and engineering docs, `package.json` / `package-lock.json`, `.env.example` and `.gitignore`. App source code (`app/`, `src/`, `supabase/migrations/`, config files) is added phase by phase as described in [PLAN.md](PLAN.md). Commands below are the scripts defined in `package.json`; the ones that need source files will work once Phase 0 is done.

## Screenshots
| Home | Orders | New order | Customer |
|---|---|---|---|
| _screenshot: docs/screenshots/home.png_ | _screenshot: docs/screenshots/orders.png_ | _screenshot: docs/screenshots/new-order.png_ | _screenshot: docs/screenshots/customer.png_ |

## Features (MVP — see [PRD.md](PRD.md) §4.1)
- Sign in with email + password, mobile OTP or Google; optional app PIN / fingerprint.
- Shop setup in English, ગુજરાતી or हिन्दी, with optional sample data.
- Cloth types (Shirt, Pant, your own) with their own measurement fields.
- Customers with book number, search and dues filter.
- Measurements per customer per cloth, with history.
- Orders: clothes, quantity and rate (no default rate), extras, discount, GST, advance; blocked until measurements exist.
- Status Received → Ready → Delivered, payments, cancel/restore, repeat order.
- Home "Today" with today's work and money collected.
- WhatsApp messages for receipt, pickup and payment reminders.
- Works fully offline; syncs to the cloud and restores on a new phone.
- 30-day free trial, then TrueFit Pro (monthly / yearly) via Google Play.

## Tech stack
React Native 0.88 + Expo SDK 58 · TypeScript 6 · Expo Router · NativeWind 4 · expo-sqlite + Drizzle ORM · Zustand · react-hook-form + zod · i18next · Supabase (Postgres, Auth, Edge Functions) · RevenueCat (Google Play Billing) · Sentry · EAS Build · Jest + React Native Testing Library · pgTAP · Maestro. Details and reasons: [ARCHITECTURE.md](ARCHITECTURE.md).

## Quick start
Prerequisites (Node ≥ 22.13, JDK 17, Android SDK, Docker) are in [SETUP.md](SETUP.md).
1. `git clone <repo-url> truefit && cd truefit`
2. `npm ci`
3. `cp .env.example .env` and fill in the values (table below)
4. `npm run db:start` then `npm run db:reset` (local Supabase + migrations + seed)
5. `npm run android` (first native build), later `npm run dev`

## Environment variables
| Name | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (local: `http://127.0.0.1:54321`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | For Google sign-in | Google OAuth web client ID |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | For purchases | RevenueCat public Android SDK key |
| `EXPO_PUBLIC_SENTRY_DSN` | No | Sentry DSN; empty disables reporting |
| `EXPO_PUBLIC_APP_ENV` | Yes | `development`, `preview` or `production` |
| `REVENUECAT_WEBHOOK_SECRET` | Server only | Edge Function secret (`supabase/.env.local` locally) |
| `ANTHROPIC_API_KEY` | Server only, V2 | Edge Function secret for the AI assistant |
| `SENTRY_AUTH_TOKEN` | Build only | EAS secret for source-map upload |

## Folder structure
```
app/            Screens (Expo Router, one file per screen)
src/components/ UI primitives (ui/) and feature components
src/features/   Business logic per feature (repo, schema, hooks)
src/db/         Drizzle SQLite schema and migrations
src/sync/       Outbox + pull sync with Supabase
src/lib/        Supabase client, errors, money/date helpers, service wrappers
src/i18n/       en / gu / hi strings
supabase/       SQL migrations, seed, pgTAP tests, Edge Functions
e2e/            Maestro flows
```
Full tree: [ARCHITECTURE.md §2](ARCHITECTURE.md).

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Start Metro for the development build (`expo start --dev-client`) |
| `npm run android` | Build and install the native Android dev app (`expo run:android`) |
| `npm run build:dev` / `build:preview` / `build` | EAS cloud build: development / preview / production profile |
| `npm test` | Unit and component tests (Jest) |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:db` | Database tests (pgTAP via `supabase test db`) |
| `npm run test:e2e` | Maestro end-to-end flows in `e2e/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run format` | Prettier write |
| `npm run db:start` / `db:stop` | Start / stop local Supabase (Docker) |
| `npm run db:reset` | Recreate the local database from migrations + `seed.sql` |
| `npm run db:types` | Generate `src/types/supabase.ts` from the local database |
| `npm run db:local:generate` | Generate device SQLite migrations with drizzle-kit |
| `npm run functions:serve` | Serve Edge Functions locally with `supabase/.env.local` |

## Documentation
[PRD](PRD.md) · [Design](DESIGN.md) · [Architecture](ARCHITECTURE.md) · [Database](DATABASE.md) · [API](API.md) · [Plan](PLAN.md) · [Setup](SETUP.md) · [Features](FEATURES.md) · [Auth & security](AUTH_SECURITY.md) · [Integrations](INTEGRATIONS.md) · [Testing](TESTING.md) · [MCP](MCP.md) · [Agent rules](AGENTS.md) · [Debug prompt](DEBUG_PROMPT.md)

## Contributing
1. Pick the next unchecked task in PLAN.md and read [AGENTS.md](AGENTS.md).
2. Branch from `main` (`feat/…`, `fix/…`), keep changes small.
3. Run `npm run typecheck && npm run lint && npm test` (and `npm run test:db` for SQL changes) before opening a pull request.
4. Never commit `.env` files or keys.

## License
Proprietary — © 2026 TrueFit. All rights reserved. (Change this section if you choose an open-source license.)
