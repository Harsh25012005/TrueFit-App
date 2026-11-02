# TrueFit — MVP Feature Build Guide

> One section per PRD MVP feature (M1–M14). Screens/components come from DESIGN.md and ARCHITECTURE.md, tables from DATABASE.md, endpoints from API.md.
> **Rule:** build one feature at a time in the order below (matches PLAN.md). After a feature: tick its PLAN.md boxes, run all checks, and **wait for confirmation before starting the next one.**

Build order: **M13 → M1 → M2 → M3 → M4 → M5 → M6 → M12 → M7 → M8 → M10 → M9 → M11 → M14**
(i18n first because every screen needs strings; sync after the first data features so it is tested on real tables.)

Common states for every screen: **loading** = Skeleton rows (never spinners on lists), **empty** = EmptyState with one action, **error** = inline message + Retry; **offline** = works normally, sync badge shows "Saved on phone".

---

## M13 — Languages
- **What:** All UI text in English, Gujarati, Hindi; Indian number/₹ formatting.
- **Story:** As an owner who reads Gujarati, I want the app in Gujarati so I can use it without help.
- **Screens/components:** S2 language chips, S27 Settings → Language; `src/i18n/*`, `src/lib/money.ts`.
- **Data:** `profiles.language` · API 2.2.
- **Steps:** 1) i18next init with device locale fallback 2) en.json keys 3) gu/hi files 4) money/date formatters 5) language switcher.
- **Edge cases:** missing key → English fallback + dev warning; long Gujarati words wrap (no truncation on buttons); numerals stay Western (0–9).
- **Acceptance:** [ ] all three files have identical keys (unit test) [ ] ₹1,25,000 lakh grouping [ ] switch applies without restart [ ] Noto fonts render GU/HI.

## M1 — Sign-in & account
- **What:** Email+password, mobile OTP, Google; reset password; sign out; delete account.
- **Story:** As an owner I want to sign in with my mobile number so I don't need to remember a password.
- **Screens:** S2–S8, S29; components PhoneInput, Input, Button, OTP boxes.
- **Data:** `auth.users`, `profiles` · API §1, 2.6.
- **Steps:** client + session storage → email flow → reset → phone OTP → Google → sign out → delete account.
- **Validation:** email format; password ≥ 8 chars with a letter and a number; phone `^[6-9]\d{9}$`; OTP 6 digits.
- **Edge cases:** OTP resend after 60 s timer; wrong OTP 5× → wait message; expired code; email not confirmed → resend; Google cancelled → stay silent; offline → "Connect to internet to sign in"; account exists with another method → show which.
- **Loading/error:** button spinner + disabled; errors under the field, not toasts.
- **Acceptance:** [ ] each method signs in on a dev build [ ] session persists after restart [ ] refresh works after 1 h [ ] reset password works [ ] delete account requires typing DELETE and signs out.

## M2 — Onboarding & shop setup
- **What:** Welcome slides, language, shop name, owner name, phone; empty or sample data.
- **Story:** As a new owner I want to set up my shop in under a minute.
- **Screens:** S2, S9; `create_shop` RPC (API 2.3).
- **Data:** shops, subscriptions, garment_types, measurement_fields.
- **Validation:** shop name 2–40; owner name 2–60; phone optional but valid.
- **Edge cases:** setup interrupted → resume at S9 (shop missing); `create_shop` called twice → returns existing shop (409 handled); offline at setup → "Connect to finish setup".
- **Acceptance:** [ ] new user reaches Home in ≤ 4 screens [ ] Shirt and Pant with default fields exist [ ] trial ends in 30 days [ ] sample data option creates demo customers/orders.

## M3 — App PIN lock
- **What:** Optional 4-digit PIN + fingerprint when opening the app.
- **Screens:** S10, S11; PinPad; `expo-local-authentication`, `expo-secure-store`, `expo-crypto`.
- **Data:** device only (no table, no endpoint).
- **Edge cases:** 5 wrong tries → 30 s wait, doubling; "Forgot PIN" → sign in again (clears PIN); app backgrounded > 2 min → lock; fingerprint not enrolled → hide option.
- **Acceptance:** [ ] PIN never stored in plain text [ ] lock after background timeout [ ] fingerprint unlock [ ] forgot PIN path.

## M4 — Cloth types & measurement fields
- **What:** Manage cloth types and their fields.
- **Screens:** S25, S26; GarmentSheet, FieldRow (drag to reorder).
- **Data:** garment_types, measurement_fields · API §7.
- **Validation:** cloth name 2–30 unique per shop; field name 1–30 unique per cloth; max 30 fields.
- **Edge cases:** delete cloth used in active orders → blocked with message; delete field with values → confirm ("old values hidden"); rename shows everywhere.
- **Acceptance:** [ ] add/rename/reorder/delete cloth and field offline [ ] duplicate name error [ ] changes sync.

## M5 — Customers
- **Screens:** S14, S21, S22; CustomerRow, CustomerSheet, SearchInput, Chip filters.
- **Data:** customers · API §5.1–5.4.
- **Validation:** name 2–50; phone required 10 digits; book no. ≤ 12 chars (auto next number); area ≤ 100.
- **Edge cases:** duplicate phone → warning "Already saved as Amit Shah — open?" (still allow, families); delete with active orders → blocked; search with Gujarati text; 5,000 customers scroll smoothly (virtualized FlatList).
- **Empty state:** "No customers yet" + Add customer.
- **Acceptance:** [ ] search name/phone/book no. [ ] "Has dues" filter correct [ ] soft delete + Undo toast [ ] call/WhatsApp buttons.

## M6 — Measurements
- **Screens:** S21 Measurements tab, S23 sheet, S24 history; MeasurementCard.
- **Data:** measurements, measurement_values, measurement_versions · API 5.5–5.7.
- **Validation:** values 0.25–999.99, step 0.25; at least one field filled; notes ≤ 300.
- **Edge cases:** unit cm → convert on input/display, store inches; field added later → empty slot; history max 10; leaving sheet with unsaved changes → confirm.
- **Acceptance:** [ ] enter-to-next field works [ ] edit creates history version [ ] in/cm shows same value converted [ ] works offline.

## M12 — Offline mode + cloud sync
- **Screens:** sync badge in TopBar, S27 "Sync now / last synced".
- **Data:** all synced tables + local `outbox`, `sync_cursors` (device-only tables) · API §3.
- **Steps:** outbox → push (FK order) → pull cursor → scheduler + backoff → status UI → restore on new phone.
- **Edge cases:** app killed mid-push (idempotent upsert by id); token expired (refresh then retry); 402 plan required (mark item failed, show paywall); conflict on order_no (claim new number, notify); server newer row (keep server, LWW); 10,000 queued changes (batch 200).
- **Acceptance:** [ ] airplane-mode day of work syncs on reconnect [ ] second phone restores all data [ ] no duplicate rows after retries [ ] status shows pending count.

## M7 — Orders (create)
- **Screens:** S16 wizard (Customer → Clothes → Details), CustomerPicker, Stepper, MoneyInput.
- **Data:** orders, order_items, order_extras, payments · API 4.3, 4.4.
- **Validation:** ≥ 1 item; qty 1–50; rate required (no default) 0–2,00,000; due date ≥ today; discount ≤ subtotal + extras; advance ≤ total; note ≤ 500.
- **Edge cases:** cloth without measurement → item shows "Take measurement" (opens S23, returns to wizard with state kept); new customer inside wizard; back button keeps entered data; plan expired → paywall before step 1; offline → provisional number, renumber on clash.
- **Acceptance:** [ ] order saved offline with number [ ] blocked without measurement [ ] totals match unit tests [ ] receipt share offered after save.

## M8 — Order status & payments
- **Screens:** S17 detail, S18 payment sheet, S19 deliver dialog, S20 cancel sheet.
- **Data:** orders, payments · API 4.5–4.7, §6.
- **Validation:** payment ≠ 0, ≤ balance; refund ≤ paid.
- **Edge cases:** deliver with balance → "Collect ₹400 / Deliver unpaid"; Undo status within toast; cancelled order with payments → offer refund; repeat order prefills wizard with current rates.
- **Acceptance:** [ ] status moves and Undo [ ] payments update balance everywhere [ ] cancel/restore [ ] repeat order.

## M10 — Orders list
- **Screens:** S13; OrderRow, Chip filters, sort sheet, group headers.
- **Data:** local orders/payments (no network).
- **Edge cases:** empty filter result → "No orders here" + Clear filter; 5,000 orders smooth; search by order no., name, phone.
- **Acceptance:** [ ] each filter count correct [ ] each sort correct [ ] groups Late/Today/Tomorrow/This week/Later.

## M9 — Home "Today"
- **Screens:** S12; TodaySummary, TodayWork, QuickLinks.
- **Data:** local orders/payments.
- **Edge cases:** weekly off day message; nothing due → friendly empty state; numbers refresh live after any change.
- **Acceptance:** [ ] collected/new/delivered correct for today [ ] one-tap Ready/Deliver with Undo [ ] links open filtered Orders.

## M11 — WhatsApp sharing
- **Screens:** ShareSheet from S17, S21; templates in 3 languages.
- **Data:** none (client `wa.me` link).
- **Edge cases:** WhatsApp not installed → system share; phone missing → ask to add; message length ≤ 1,000 chars.
- **Acceptance:** [ ] receipt, ready, reminder texts correct in EN/GU/HI [ ] opens chat with the customer's number.

## M14 — Subscription
- **Screens:** S28, paywall sheet, trial banner (last 5 days).
- **Data:** subscriptions · API 2.4, §9; RevenueCat SDK.
- **Edge cases:** purchase pending (UPI on Play) → "Activating…"; restore purchases; offline → cached entitlement for 7 days; expired → read-only; refund/chargeback via webhook → expired.
- **Acceptance:** [ ] license-tester monthly + yearly purchases [ ] webhook updates plan [ ] read-only blocks only new customers/orders [ ] restore on new phone.
