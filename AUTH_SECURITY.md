# TrueFit — Authentication & Security

> Applies to PRD M1 (sign-in), M3 (PIN), M14 (plans) and the whole backend. Follows OWASP ASVS L1 / MASVS-L1 and the OWASP Top 10. Each choice has a one-line reason.

## 1. Sign-in flows (all through Supabase Auth)

### 1.1 Email + password
1. Sign up `POST /auth/v1/signup` → 6-digit code sent by email. *Reason: codes are easier than links on a phone and avoid deep-link setup issues.*
2. Verify `POST /auth/v1/verify {type:"signup"}` → session.
3. Sign in `POST /auth/v1/token?grant_type=password`.
4. Forgot password: `POST /auth/v1/recover` (always 200 — *no account enumeration*) → code → `verify {type:"recovery"}` → `PUT /auth/v1/user {password}`.
- Password rules: min 8 chars, letters + digits, Supabase "leaked password protection" on. *Reason: length beats complexity rules; breached-password check blocks the most common attacks.*

### 1.2 Magic link / email code (passwordless)
`POST /auth/v1/otp {email}` → 6-digit code (template shows code, link only as a fallback with `truefit://auth/callback`). Code valid 10 min, single use. *Reason: same flow as signup verification, no password to forget.*

### 1.3 Phone OTP
`POST /auth/v1/otp {phone:"+91…"}` → SMS via **Twilio Verify** → `verify {type:"sms"}`. Code 6 digits, 10 min, max 5 attempts. Resend after 60 s, max 5/hour per number. Android SMS Retriever / autofill supported via the `<#> … app hash` format. *Reason: most tailors prefer mobile; Verify handles DLT routes and fraud guard in India.*

### 1.4 Google (OAuth / OIDC)
Native Google Sign-In (`@react-native-google-signin/google-signin`) returns an **ID token**; the app sends it with a SHA-256-hashed nonce to `POST /auth/v1/token?grant_type=id_token`. *Reason: native account picker, no browser redirect, nonce blocks token replay.* Supabase checks issuer, audience (our web client ID) and nonce.

### 1.5 Linking & duplicates
One Supabase user per person; same verified email across email + Google is linked automatically. Adding a phone later uses `PUT /auth/v1/user {phone}` + `verify {type:"phone_change"}`. *Reason: avoids two shops for one owner.*

### 1.6 App PIN (device lock, not server auth)
4-digit PIN → `SHA-256(salt + pin)` with a random 16-byte salt via `expo-crypto`, stored in `expo-secure-store` (Android Keystore-backed). 5 wrong tries → 30 s wait, doubling; "Forgot PIN" = full sign-in. Fingerprint via `expo-local-authentication`. *Reason: a 4-digit PIN only guards the unlocked phone; the real secret (refresh token) stays in the Keystore.*

## 2. Session / JWT design
| Item | Value | Reason |
|---|---|---|
| Access token | Supabase JWT (asymmetric signing keys, ES256), **1 hour** expiry, claims `sub`, `role=authenticated`, `aal`, `session_id` | Short life limits damage if leaked; asymmetric keys let functions verify without the secret |
| Refresh token | Opaque, **single-use with rotation**, reuse interval 10 s; reuse after that revokes the session | Detects stolen refresh tokens |
| Session lifetime | Inactivity timeout 30 days; no fixed max | Shop phones stay signed in; idle phones re-auth |
| Storage | `expo-secure-store` (Keystore) via a custom supabase-js storage adapter; never AsyncStorage | Encrypted at rest, not readable by other apps or backups |
| Refresh | supabase-js `autoRefreshToken`, paused in background (`AppState`) | Avoids failed refreshes while asleep |
| Sign out | `scope=local` default, `scope=global` option; local SQLite wiped on sign-out | Shared phones should not keep shop data |
| Backups | `android:allowBackup="false"` | Tokens and DB never land in cloud backups |

## 3. Roles and permissions
Postgres roles: `anon`, `authenticated` (owner), `service_role` (server only). App-level states come from `subscriptions`.

| Action | anon | owner – trial/active/grace | owner – expired/cancelled after period | service_role |
|---|---|---|---|---|
| Sign up / sign in / OTP | ✅ | — | — | — |
| Read own shop data | ❌ | ✅ | ✅ | ✅ |
| Create customer / order | ❌ | ✅ | ❌ (paywall) | ✅ |
| Edit customer, measurements, cloth types | ❌ | ✅ | ✅ | ✅ |
| Change order status, add payment | ❌ | ✅ | ✅ | ✅ |
| Read other shops | ❌ | ❌ | ❌ | ✅ |
| Write `subscriptions` | ❌ | ❌ | ❌ | ✅ (webhook) |
| Delete account | ❌ | ✅ (own) | ✅ (own) | ✅ |
| AI assistant (V2) | ❌ | ✅ | ❌ | ✅ |
Enforced by RLS policies and `shop_can_write()` (DATABASE.md §7) — **never** only in the UI.

## 4. Protection measures
- **Passwords:** hashed by Supabase Auth with **bcrypt** (cost 10); we never see or store them. *Reason: proven, salted, slow hash.*
- **Rate limits:** see API.md §0 (auth email 1/60 s, SMS 5/h/number, verify 30/5 min/IP, AI 30/h/shop) plus Twilio Verify fraud guard and **CAPTCHA (hCaptcha/Turnstile) on sign-up** if abuse appears. *Reason: stops SMS pumping and brute force.*
- **CORS:** mobile app is not a browser; Edge Functions return `Access-Control-Allow-Origin` only for `https://truefit.app` (future web) and reject others; webhook has no CORS. *Reason: least exposure.*
- **CSRF:** not applicable to bearer-token APIs (no cookies). Edge Functions only accept `Authorization: Bearer`. *Reason: CSRF needs ambient cookies.*
- **XSS / injection:** React Native renders text, no WebView with user HTML; WhatsApp text is URL-encoded; SQL only via PostgREST/parameterised RPCs; no dynamic SQL in functions (`format('%I')` if ever needed). *Reason: removes the injection paths.*
- **Deep links:** only `truefit://auth/callback` and `truefit://reset-password` are handled; params validated; Android App Links verified for `https://truefit.app/*`. *Reason: blocks link hijacking.*
- **Transport:** HTTPS only (`usesCleartextTraffic=false` in production builds), TLS 1.2+. *Reason: no plain-text traffic.*
- **Logging:** never log tokens, OTPs, phone numbers or measurements; Sentry `beforeSend` scrubs `Authorization`, emails, phones. *Reason: logs leak.*
- **Account deletion:** in-app (Play policy), 7-day grace then hard delete of auth user + all shop rows + storage objects.
- **Data minimisation:** no customer address, ID or location collected.

## 5. Input validation
- **Client:** zod schema per form (`src/features/*/<feature>.schema.ts`) with the same limits as DB checks; trimmed strings; Unicode-normalised (NFC) names; phone `^[6-9]\d{9}$`; money integers 0–10,00,000; measurement 0.25–999.99.
- **Server:** Postgres `CHECK` constraints, enums, FKs, `assert_same_shop` trigger; RPCs re-validate (never trust the client); Edge Functions validate bodies with zod and reject unknown fields. *Reason: the client can be modified, so the server is the real gate.*

## 6. Secrets management
| Secret | Where it lives | Never |
|---|---|---|
| Supabase anon key, Google web client ID, RevenueCat public key, Sentry DSN | `.env` → `EXPO_PUBLIC_*` (public by design) | — |
| Supabase **service role key** | Auto-injected into Edge Functions only | In the app, `.env`, git, CI logs |
| `REVENUECAT_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY` | `npx supabase secrets set …`; locally `supabase/.env.local` | In git |
| Twilio, SMTP, Google OAuth secret | Supabase dashboard → Auth settings | In git |
| `SENTRY_AUTH_TOKEN`, Play upload key | EAS secrets / EAS-managed credentials | On developer laptops long-term |
- `.env*` git-ignored (except `.env.example` with placeholders). Add a secret scanner (gitleaks) to CI. Rotate keys on staff change or suspected leak.

## 7. Pre-launch security checklist
- [ ] RLS enabled on **every** table (`supabase db lint` + Security Advisor shows no warnings)
- [ ] pgTAP tests: cross-shop read/write denied; expired plan insert denied; anon denied
- [ ] Service role key not present in the app bundle (search the built JS for `service_role`)
- [ ] Email confirmation ON, leaked-password protection ON, OTP expiry 600 s
- [ ] Refresh token rotation ON, reuse interval 10 s; JWT expiry 3600 s
- [ ] Auth rate limits configured; Twilio Verify fraud guard ON; DLT template registered
- [ ] Custom SMTP (Resend) with SPF/DKIM; email templates show codes
- [ ] Google OAuth: production SHA-1 (Play App Signing) added; nonce check in place
- [ ] Redirect URL allow-list only contains `truefit://*` and `https://truefit.app/*`
- [ ] `allowBackup=false`, cleartext traffic disabled, ProGuard/R8 on, debuggable=false
- [ ] Sentry scrubbing verified with a test event
- [ ] RevenueCat webhook secret set and verified; webhook idempotent
- [ ] Delete-account flow tested end-to-end (data gone after grace)
- [ ] Point-in-time recovery / daily backups enabled on production
- [ ] Dependency audit (`npm audit --omit=dev`) has no high/critical issues
- [ ] Privacy policy + Play Data safety form match what is collected
