# AGENTS.md — rules for AI coding agents working on TrueFit

## Project summary
1. TrueFit is an Android app (React Native + Expo) for small Indian tailor shops: customers, measurements, orders, payments.
2. One owner per shop, on a paid plan after a 30-day trial; read-only when the plan expires.
3. Offline-first: the app reads and writes local SQLite (Drizzle) and syncs to Supabase in the background.
4. Backend is Supabase only (Postgres + RLS, Auth, Edge Functions); there is no custom server.
5. UI is minimal: one emerald color, 2–4 px radius, no shadows, no gradients (except V2 AI accent), EN/GU/HI.

## Source of truth (highest first)
1. `PRD.md` — what to build and what not to build
2. `DESIGN.md` — every color, font, size, radius, component state
3. `ARCHITECTURE.md` — stack, folders, data flow, conventions
4. `DATABASE.md` — tables, columns, RLS, RPCs, migrations
5. `API.md` — endpoints, errors, roles
Supporting: `PLAN.md` (order of work), `FEATURES.md`, `AUTH_SECURITY.md`, `INTEGRATIONS.md`, `TESTING.md`, `SETUP.md`.
If two files disagree, the higher one wins — but **stop and ask** before coding around the conflict.

## DO
- Work one PLAN.md task at a time; tick its checkbox only when its "Verify" step passes.
- Build one feature at a time (FEATURES.md order); wait for the user to confirm before starting the next.
- Use only the tokens in `src/theme/tokens.ts` (copied from DESIGN.md). Use components from `src/components/ui`.
- Read data from SQLite through `src/features/<feature>/<feature>.repo.ts`; write through the outbox (`src/sync/outbox.ts`).
- Validate every form with zod schemas in `src/features/<feature>/<feature>.schema.ts`; the same limits as DATABASE.md checks.
- Put all user-facing text in `src/i18n/{en,gu,hi}.json`; add all three keys together.
- Store money as integer rupees; format with `src/lib/money.ts`.
- Write tests with each change (TESTING.md) and run `npm run typecheck && npm run lint && npm test` before saying a task is done.
- Add a new SQL migration for every schema change, then update DATABASE.md, the Drizzle schema and `npm run db:types`.
- Call third-party services only through `src/lib/*` wrappers or Edge Functions (INTEGRATIONS.md).
- Keep diffs small and focused; explain what changed and how it was verified.

## DO NOT
- Do not add features, screens, colors, fonts, icons sets, shadows or gradients that are not in PRD.md / DESIGN.md.
- Do not add libraries that are not in ARCHITECTURE.md without asking first.
- Do not put secrets in code or commits. Only `EXPO_PUBLIC_*` values may reach the app; the service role key never does.
- Do not disable RLS, use the service role from the app, or hard-delete rows (soft delete with `deleted_at`).
- Do not edit an applied migration; write a new one.
- Do not call Supabase directly from screens/components; use feature hooks.
- Do not make orders editable after creation (PRD M7/M8).
- Do not run destructive commands (`db:reset` on a shared DB, `rm -rf`, force push, deleting cloud data) without asking.
- Do not invent commands; use only scripts that exist in `package.json`.
- Do not rewrite large working areas to fix a small bug.

## Workflow
1. Read the PLAN.md task and the linked FEATURES.md section.
2. Check the relevant parts of PRD, DESIGN, DATABASE and API.
3. If anything is missing, unclear or conflicting → stop and ask (see below).
4. Write or update tests first where practical, then the code.
5. Run `npm run typecheck`, `npm run lint`, `npm test` (and `npm run test:db` for SQL changes).
6. Manually check the screen in the dev build (light + dark, EN + GU, offline).
7. Tick the PLAN.md checkbox, summarise the change, and wait for confirmation at the end of a feature.

## Stop and ask when
- Two source files disagree, or a needed table/endpoint/token/string is missing.
- A task needs a new dependency, environment variable, permission or paid service.
- A change touches auth, RLS, billing, account deletion or data migration.
- Tests fail for reasons outside the current task.
Ask one short, specific question, say what you would do by default, and do not continue that part until answered.
