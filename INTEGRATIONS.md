# TrueFit — Third-party Integrations

> Every service sits behind **one small wrapper** so it can be swapped later. Server-side services (Twilio, SMTP, Anthropic, RevenueCat webhooks) are only reached from Supabase Auth or Edge Functions. Client SDKs that must run on the phone (Google Sign-In, RevenueCat purchases, Sentry) are only imported inside their wrapper file in `src/lib/` or `src/features/*/…service.ts` — **screens and components never import an SDK or call a third-party URL directly.** Lint rule: `no-restricted-imports` blocks these packages outside the wrapper files.

## Summary
| Service | Purpose | Phase | Runs where | Wrapper |
|---|---|---|---|---|
| Supabase | DB, Auth, functions, storage | MVP | Cloud | `src/lib/supabase.ts`, `src/features/auth/auth.service.ts`, `src/sync/*` |
| Twilio Verify | Phone OTP SMS | MVP | Called by Supabase Auth | Supabase Auth config (no app code) |
| Google Sign-In | Google login | MVP | Phone SDK → Supabase | `src/lib/google.ts` |
| Resend (SMTP) | Auth emails | MVP | Called by Supabase Auth | Supabase Auth SMTP settings |
| RevenueCat + Google Play Billing | Subscriptions | MVP | Phone SDK + webhook | `src/features/subscription/purchases.service.ts`, `supabase/functions/revenuecat-webhook` |
| WhatsApp (share links) | Messages to customers | MVP | Phone (deep link) | `src/features/messages/whatsapp.ts` |
| Sentry | Crash/error reports | MVP | Phone SDK | `src/lib/sentry.ts` |
| EAS (Expo) | Builds, submit, OTA updates | MVP | Cloud CI | `eas.json` |
| Anthropic Claude | AI assistant | V2 | Edge Function | `supabase/functions/ai-chat`, `supabase/functions/_shared/llm.ts`, app `src/features/ai/ai.service.ts` |

---

## 1. Supabase
- **Why:** serverless Postgres + RLS + Auth + Edge Functions in one place (ARCHITECTURE.md).
- **Env:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (app); `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auto in functions).
- **SDK:** `@supabase/supabase-js` ^2.118; CLI `supabase` (devDependency).
- **Setup:** create project in **ap-south-1**; enable email, phone, Google providers; run migrations with `npx supabase link --project-ref <ref>` then `npx supabase db push`; deploy functions `npx supabase functions deploy <name>`.
- **Wrapper:** `src/lib/supabase.ts` exports one client (SecureStore storage); `toAppError()` maps errors. Only `auth.service.ts`, `src/sync/*` and feature repos' remote calls use it.
- **Retries/idempotency:** sync upserts by client UUID (safe to retry); backoff 5 s → 15 min.
- **Cost/limits:** Free tier for dev; **Pro ($25/month)** for production (8 GB DB, daily backups, no pausing). ~1 MB per shop/year → thousands of shops fit.
- **Fallback:** app works offline; outbox waits. Status page alert to on-call.
- **Testing:** local stack (`npm run db:start`), pgTAP, a separate **dev** cloud project; never test on prod.

## 2. Twilio Verify (phone OTP)
- **Why:** reliable Indian SMS delivery with DLT-registered routes and fraud guard; native Supabase provider.
- **Env:** none in the app. In Supabase → Auth → Phone: Account SID, Auth Token, Verify Service SID (dashboard secrets).
- **SDK:** none (Supabase Auth calls Twilio).
- **Setup:** create Verify service, enable SMS channel + Fraud Guard, set code length 6, register DLT entity/template for India, enter credentials in Supabase.
- **Webhooks/retries:** none; user taps "Resend" after 60 s (rate-limited).
- **Cost/limits:** about ₹4–5 (~$0.05) per verification in India — check current Twilio pricing; budget alert in Twilio console.
- **Fallback:** if SMS fails, the sign-in screen suggests email code or Google. Swap option: MSG91 via Supabase "Send SMS" auth hook (`supabase/functions/send-sms-hook`), no app change.
- **Testing:** `[auth.sms.test_otp]` test numbers in `supabase/config.toml` locally; Twilio test credentials in dev project.

## 3. Google Sign-In
- **Why:** one-tap login most owners already have.
- **Env:** `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (app); Google client ID/secret in Supabase → Auth → Google.
- **SDK:** `@react-native-google-signin/google-signin` ^17 (config plugin in `app.config.ts`).
- **Setup:** Google Cloud project → OAuth consent screen → Web client (for Supabase + ID token audience) + Android client per SHA-1 (debug, upload, Play App Signing); add web client ID to Supabase "Authorized Client IDs".
- **Wrapper:** `src/lib/google.ts` → `getGoogleIdToken(nonce)`; `auth.service.ts` exchanges it with Supabase.
- **Cost:** free.
- **Fallback:** on `DEVELOPER_ERROR`/Play Services missing, hide Google button and show other methods.
- **Testing:** dev build with a test Google account; unit tests mock `google.ts`.

## 4. Resend (SMTP for auth emails)
- **Why:** Supabase's built-in email is rate-limited (testing only); Resend has simple SMTP + good deliverability.
- **Env:** none in app; SMTP host/user/password in Supabase → Auth → SMTP settings.
- **Setup:** verify domain `truefit.app` (SPF, DKIM, DMARC), create SMTP key, set sender `no-reply@truefit.app`, edit templates (code-first, EN/GU/HI text).
- **Cost/limits:** free tier ~3,000 emails/month (check current plan); then paid.
- **Fallback:** swap to any SMTP (SES, Postmark) in dashboard — no code change.
- **Testing:** local Inbucket/Mailpit at http://127.0.0.1:54324.

## 5. RevenueCat + Google Play Billing
- **Why:** Play policy requires Play Billing for digital subscriptions; RevenueCat handles receipts, renewals, grace periods and webhooks.
- **Env:** `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (public SDK key); `REVENUECAT_WEBHOOK_SECRET` (function secret).
- **SDK:** `react-native-purchases` ^11.
- **Setup:** Play Console → subscription `truefit_pro` with base plans monthly (₹199) and yearly (₹1,999) (prices pending PRD open question); RevenueCat project → Play service-account credentials → entitlement `pro` → offering `default`. Set `appUserID` = Supabase user id on sign-in (`Purchases.logIn`).
- **Wrapper:** `purchases.service.ts` → `getOfferings()`, `purchase(pkg)`, `restore()`, `getEntitlement()`; `entitlement.ts` combines it with `subscriptions` row.
- **Webhook:** `POST /functions/v1/revenuecat-webhook` with `Authorization: Bearer ${REVENUECAT_WEBHOOK_SECRET}`; maps events to `subscriptions.status`; **idempotent** on `event.id` (`last_event_id`); returns 200 quickly; RevenueCat retries failed deliveries with backoff.
- **Cost/limits:** RevenueCat free up to $2.5k monthly tracked revenue, then 1%; Google Play fee 15% on subscriptions.
- **Fallback:** if RevenueCat is down, use last known `subscriptions` row (cached 7 days on device); never lock out a paying user because of an outage.
- **Testing:** Play **license testers** + internal testing track (renewals accelerated), RevenueCat sandbox; webhook unit tests with sample payloads.

## 6. WhatsApp (share links, no API)
- **Why:** customers already use WhatsApp; no Business API cost or template approvals for MVP.
- **Env/SDK:** none — `Linking.openURL('https://wa.me/91XXXXXXXXXX?text=<encoded>')`.
- **Wrapper:** `whatsapp.ts` → `openWhatsApp(phone, text)`; falls back to `Share.share({message})`.
- **Cost:** free. **Testing:** unit tests for encoding; manual check on a phone with and without WhatsApp. Swap later to WhatsApp Business API behind the same function.

## 7. Sentry
- **Why:** crash reports with source maps and release health.
- **Env:** `EXPO_PUBLIC_SENTRY_DSN` (app), `SENTRY_AUTH_TOKEN` (EAS secret for source maps).
- **SDK:** `@sentry/react-native` ~8.28 with Expo config plugin.
- **Wrapper:** `src/lib/sentry.ts` → `initSentry()`, `captureError(appError)`; `beforeSend` scrubs tokens, phones, emails.
- **Cost:** free developer plan (5k errors/month); upgrade after launch if needed.
- **Fallback:** if DSN empty, wrapper no-ops. **Testing:** "Send test error" button in dev builds only.

## 8. EAS (Expo Application Services)
- **Why:** cloud Android builds, Play submit, OTA JS updates.
- **Env:** EAS secrets (`SENTRY_AUTH_TOKEN`), `EXPO_TOKEN` in CI.
- **Setup:** `npx eas-cli login`, `npx eas-cli build:configure`, profiles in `eas.json` (development/preview/production), `npx eas-cli submit -p android`.
- **Cost:** free tier has limited monthly builds; Starter plan if more are needed.
- **Fallback:** local builds with `npm run android` / Gradle.

## 9. Anthropic Claude (V2 — AI assistant)
- **Why:** strong Gujarati/Hindi understanding and tool use for "ask your shop data".
- **Env:** `ANTHROPIC_API_KEY` (function secret only).
- **SDK:** `@anthropic-ai/sdk` imported in the Edge Function (npm specifier), never in the app.
- **Wrapper:** `_shared/llm.ts` → `chat(messages, tools)` so the provider can be swapped; `ai-chat/index.ts` adds tools that read the user's data with **their JWT** (RLS applies) and never write.
- **Retries:** 1 retry on 429/529 with jitter; timeout 20 s; per-shop limits in `ai_usage`.
- **Cost:** per-token; log `input_tokens`/`output_tokens` per shop; monthly budget alert; small/fast model by default.
- **Fallback:** app shows local quick answers (today, late, dues) computed from SQLite when offline or on 503.
- **Testing:** mocked `llm.ts` in function tests; a dev API key with low spend limit.

## Swapping a provider (checklist)
1. Write the new implementation behind the same wrapper function signatures.
2. Add new env vars to `.env.example` / function secrets and ARCHITECTURE.md §7.
3. Run wrapper unit tests + one manual sandbox test.
4. Release behind `EXPO_PUBLIC_APP_ENV` or a remote flag; keep the old one for one release.
