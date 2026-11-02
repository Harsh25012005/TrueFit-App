# TrueFit — Product Requirements Document

| | |
|---|---|
| Product | TrueFit — tailor shop manager (Android app, React Native / Expo) |
| Owner | Harsh Vaghela (HARSH® — Design & Build) |
| Status | Draft v1.0 · 1 Nov 2026 |
| Source prototype | Single-file HTML app "TrueFit v15" (validated with a real tailor shop) |
| Source of truth | This file. DESIGN, ARCHITECTURE, DATABASE and API docs must follow it. |

### Decisions locked with the owner (1 Nov 2026)
1. **Platform:** native Android app built with React Native (Expo). iOS later.
2. **Data:** Supabase (serverless Postgres, Auth, Storage, Edge Functions) **plus full offline mode** — the app works with no internet and syncs when online.
3. **Who logs in:** the **shop owner only** (one login per shop). Staff are records, not users. TrueFit is sold to many tailor shops on **paid plans**.
4. **Sign-in:** email (+password), mobile number OTP, and Google — all three.

---

## 1. Problem statement

Small tailor shops in Gujarat and North India run on paper: a measurement register ("book"), a receipt pad and memory. This causes:

- **Lost or wrong measurements** — paper books get torn, wet or misplaced; old sizes are overwritten.
- **Missed and late deliveries** — no single view of what is due today, what is late, what is ready.
- **Money leakage** — advances and balances live in a notebook; owners forget who still owes money.
- **Too much time on calls** — customers phone to ask "is it ready?" and the owner searches the pile.
- **Existing apps don't fit** — they are English-only, built for boutiques or retail POS, need constant internet, or are too complex for a busy owner who is not tech-savvy.

**TrueFit** gives one owner, on one Android phone, a simple tool in **Gujarati, Hindi or English** to save measurements once, take orders in under a minute, see today's work, collect balances and tell customers on WhatsApp when clothes are ready — even with patchy internet.

## 2. Target users (personas)

### Persona A — Rameshbhai, small shop owner (primary)
- 48, runs a 1-room tailoring shop in Ahmedabad with 2–3 karigars. Shirts and pants mostly.
- Android phone (₹10–15k), uses WhatsApp and UPI daily; types slowly, prefers Gujarati, likes voice typing.
- **Needs:** find a customer's measurements in seconds, know today's deliveries, know who owes money.
- **Frustrations:** small text, English menus, apps that need login every time, losing data when the phone changes.

### Persona B — Neha, boutique owner (secondary)
- 32, ladies' boutique with 5 karigars, takes 15–25 orders a day, festival and wedding rush.
- Comfortable with apps, uses Instagram/WhatsApp Business, wants professional receipts with UPI QR.
- **Needs:** fast order entry, delivery-date load per day, payment tracking, karigar piece-rate wages.
- **Frustrations:** double-booking delivery days, karigar wage disputes, customers not paying the balance.

### Persona C — Imran, next-generation helper (influencer / secondary user of the owner's phone)
- 22, son of a tailor, sets up the app for his father, adds cloth types and old customers in bulk.
- **Needs:** easy setup, CSV import, backup, clear guide so his father can use it alone.
- **Frustrations:** having to teach the same steps repeatedly; data locked in one phone.

## 3. Goals and non-goals

### Goals (first 6 months after launch)
1. A new owner creates their **first order within 10 minutes** of installing.
2. Owners use TrueFit for **all orders**, not just some: ≥ 70 % of active shops create orders on ≥ 4 days/week.
3. **Zero data loss**: every order and measurement is backed up to the cloud within minutes of internet being available.
4. **Simple enough for Persona A**: full app in Gujarati and Hindi; every core task ≤ 3 taps from Home.
5. **Sustainable business**: ≥ 8 % trial-to-paid conversion by month 6.

### Non-goals (explicitly out of scope for MVP)
- Staff logins, roles or multi-user access (owner only).
- iOS app and web dashboard.
- Inventory / fabric stock, purchase orders, supplier management.
- Full accounting, GST e-invoicing, tally export.
- Online store, customer-facing app or customer login.
- Automated WhatsApp/SMS sending through paid APIs (MVP uses WhatsApp share links).
- Alterations as a separate order type, cutting/stitching sub-stages, trial dates, quality checklists (removed in prototype after owner feedback).

## 4. Features

Status values for orders across the product: **Received → Ready → Delivered** (plus **Cancelled**).

### 4.1 MVP — must-have (ship first, Android)
| # | Feature | Notes |
|---|---|---|
| M1 | **Sign-in & account** | Email + password, mobile OTP, Google. Password reset by email. Sign out. Delete account. |
| M2 | **Onboarding & shop setup** | 3 welcome slides, language choice (EN/ગુજરાતી/हिन्दी), shop name, owner name, phone. Start empty or with sample data. |
| M3 | **App PIN lock** | Optional 4-digit PIN (and fingerprint) to open the app on this phone. |
| M4 | **Cloth types & measurement fields** | Shirt and Pant pre-loaded with their own fields. Add/rename/reorder/delete fields per cloth; add new cloth types. Renaming updates everywhere. |
| M5 | **Customers** | Add/edit/delete (soft) with name, mobile, book no. (auto next number), area. Search by name, phone or book no. Filters: All, Has dues. |
| M6 | **Measurements** | One current measurement per customer per cloth; edit keeps previous versions (history). Units: inches or cm. Enter-to-next-field entry. |
| M7 | **Orders** | Create order: customer → clothes (qty + rate, **no default rate**) → delivery date, advance, urgent, note. **Blocked until measurements exist** for each cloth (with "Take measurement" shortcut). Order number auto. Extra charges and discount. Optional GST %. |
| M8 | **Order status & payments** | Received → Ready → Delivered (balance prompt on delivery: collect cash/UPI or deliver unpaid). Add/remove payments. Cancel/restore order. Repeat order. |
| M9 | **Home "Today"** | Today's collected / new orders / delivered; **Today's work** list (late + due today) with one-tap Ready/Deliver; links: Coming up this week, Ready to give, To collect. |
| M10 | **Orders list** | Search; filter chips (Active, Due today, Overdue, Unpaid, Received, Ready, Delivered, Cancelled, All); sort (delivery date, order date new/old, amount, balance); grouped Late/Today/Tomorrow/This week/Later. |
| M11 | **WhatsApp sharing** | Receipt text, "ready for pickup" and payment-reminder messages via WhatsApp share link (no API). |
| M12 | **Offline mode + cloud sync** | Everything works offline; background sync to Supabase; sync status indicator; restore on new phone after sign-in. |
| M13 | **Languages** | English, Gujarati, Hindi for all UI text; Indian number/currency formatting (₹, lakh grouping). |
| M14 | **Subscription** | 30-day free trial, then **TrueFit Pro** (monthly / yearly) via Google Play Billing. Expired = read-only (view, deliver, collect payments; no new orders/customers). |

### 4.2 V2 — should-have (next 2–3 months after MVP)
| # | Feature |
|---|---|
| V1 | **Karigar work & wages** — staff list (records only), per-cloth piece rates, daily work entries (date + pieces per cloth), monthly earned / paid / to pay, staff payouts. Assign orders to a karigar, job card share on WhatsApp. |
| V2 | **TrueFit AI assistant** — chat in EN/GU/HI with quick buttons; answers from shop data (today, late, dues, wages, measurements); guided one-card order wizard; never saves without a tap to confirm. Online only. |
| V3 | **Cloth photos** — up to 4 photos per order item (fabric, design), shown on order and job card. |
| V4 | **Receipts with UPI QR** — shop UPI ID → QR on receipt; shareable image/PDF receipt. |
| V5 | **Reports** — collections, orders, top customers, cloth mix by month; simple profit (collections − expenses − wages). |
| V6 | **Reminders** — list of pickup, payment-due and delay messages to send today, with "sent" tracking. |
| V7 | **Calendar** — deliveries per day with per-day load warning and weekly holiday. |
| V8 | **Customer families** — link family members under one book number. |
| V9 | **CSV import/export** — import customers; export customers/orders. |
| V10 | **Voice search** — mic in search boxes (Android speech-to-text) for EN/GU/HI. |
| V11 | **Shop to-do** list. |

### 4.3 Later — nice-to-have
- Staff logins with roles (manager, karigar view of assigned jobs).
- iOS app and web dashboard for larger boutiques.
- Automated WhatsApp Business API / SMS notifications.
- GST tax invoices and accounting export.
- Multi-branch shops.
- Customer self-service (order status link).
- Fabric/stock tracking and expenses module (expenses existed in prototype; deferred).
- Style templates with sketches per cloth.

## 5. User stories

**Account & setup**
- As a shop owner, I want to sign in with my mobile number OTP, so that I don't need to remember a password.
- As a shop owner, I want to sign in with Google or email, so that I can use the account I already have.
- As a shop owner, I want to reset my password by email, so that I can get back in if I forget it.
- As a shop owner, I want to choose Gujarati or Hindi on the first screen, so that I understand everything from the start.
- As a shop owner, I want to set a 4-digit PIN, so that my staff or children cannot open my shop data.
- As a helper (Persona C), I want to start with sample data, so that I can learn the app before entering real customers.

**Cloth types & measurements**
- As a shop owner, I want Shirt and Pant ready with their usual fields, so that I can start measuring immediately.
- As a shop owner, I want to add, rename and reorder measurement fields per cloth, so that the form matches how I measure.
- As a shop owner, I want to add a new cloth type like Kurta with its own fields, so that I can take any kind of order.
- As a shop owner, I want to find a customer by name, phone or book number, so that I reach their sizes in seconds.
- As a shop owner, I want to update a measurement while keeping the old one, so that I can check what changed if the fit is wrong.
- As a shop owner, I want to press Enter to jump to the next measurement box, so that I can type sizes quickly.

**Orders & money**
- As a shop owner, I want to create an order by picking the customer, clothes, rate and delivery date, so that I record the job in under a minute.
- As a shop owner, I want the app to stop me creating an order when a measurement is missing, so that a karigar never starts without sizes.
- As a shop owner, I want to type the rate myself each time, so that I never charge a wrong default price.
- As a shop owner, I want to record the advance and see the balance, so that I know exactly what to collect on delivery.
- As a shop owner, I want to mark an order Ready and Delivered with one tap, so that my list stays current without effort.
- As a shop owner, I want the app to ask me to collect the balance when I deliver, so that I don't forget money.
- As a shop owner, I want to send a "ready for pickup" message on WhatsApp, so that customers stop calling to ask.
- As a shop owner, I want to see what is late and due today on the Home screen, so that I plan my day in one glance.
- As a shop owner, I want to see how much money is still to collect, so that I can follow up with customers.

**Reliability & business**
- As a shop owner, I want the app to work without internet, so that I can take orders when the network is down.
- As a shop owner, I want my data to come back on a new phone after I sign in, so that I never lose my customer book.
- As a shop owner, I want a free trial before paying, so that I can decide if TrueFit is worth it.
- As a shop owner whose plan expired, I want to still see my data and deliver pending orders, so that my customers are not affected.

**V2 (for planning)**
- As a shop owner, I want to note pieces finished by each karigar per day, so that wages are calculated without arguments.
- As a shop owner, I want to ask "who owes money?" in Gujarati and get the list, so that I don't have to search screens.
- As a shop owner, I want to attach a fabric photo to each cloth in an order, so that the karigar stitches the right design.

## 6. Key user flows

### F1 — First-time setup (target: under 3 minutes)
1. Open app → splash (logo, 1 s).
2. Welcome slides (3) with language switch at top → **Skip** or **Get started**.
3. Sign in screen: **Continue with phone** / **Continue with Google** / **Continue with email**.
   - Phone: enter 10-digit number → receive OTP → enter 6 digits → verified.
   - Email: enter email + password → (new) confirm email link → signed in.
4. Shop setup: owner name, shop name, shop phone (prefilled), language.
5. Optional: set 4-digit PIN (can skip).
6. Choose **Start fresh** or **Try with sample data** → Home. Trial starts (30 days).

### F2 — Add customer and take measurement
1. Home → **Measure** (or + → Measurement).
2. Search customer (name/phone/book no.) → pick, or **New customer** → name, mobile, book no. (next number prefilled) → Save.
3. Choose cloth (Shirt/Pant/…) → fields for that cloth appear in order.
4. Type value → Enter jumps to next field → Enter on last field saves.
5. Toast "Shirt measurement saved" → customer page shows the card.

### F3 — Create order (target: under 60 seconds)
1. Home → **New order** (or + → New order, or customer page → New order).
2. **Customer**: search/pick (recent 3 on top) or add new inline.
3. **Clothes & rate**: tap + on each cloth → enter rate (empty by default) → total updates.
4. If a chosen cloth has no measurement → banner "Measurement needed for Shirt" + **Take measurement** → measurement form → back to the same order with data kept.
5. **Details**: delivery date chips (+3/+5/+7/+10/+15 days) or date picker (shows orders already due that day), advance + Cash/UPI, urgent toggle, note.
6. **Create order** → order page opens; toast with order number; **Send receipt** on WhatsApp.

### F4 — Daily delivery
1. Home → **Today's work** shows late and due-today orders.
2. Stitching finished → tap **Ready** on the row → optional **Tell customer** (WhatsApp ready message).
3. Customer arrives → tap **Deliver** → if balance due: **Collect cash & deliver** / **Collect UPI & deliver** / **Deliver without payment**.
4. Order moves to Delivered; Home numbers update.

### F5 — Collect a balance later
1. Home → **To collect** (or Orders → Unpaid).
2. Open order → **Add payment** → amount (balance prefilled), mode, date → Save.
3. Optional: **Send payment reminder** on WhatsApp.

### F6 — Offline and sync
1. No internet: banner-free; small cloud icon shows "Offline · changes saved on phone".
2. Owner works normally; changes are queued.
3. Internet returns → sync runs automatically (and on app open / pull-to-refresh) → icon shows "Synced just now".
4. Sync conflict (same record changed on two phones): latest change wins; order-number clash is renumbered and the owner sees a toast.

### F7 — New phone / restore
1. Install → sign in with the same phone/email/Google.
2. App downloads shop data ("Restoring your shop… 1,240 records") → Home.

### F8 — Subscription
1. Trial days left shown in More → Subscription (and a gentle banner in the last 5 days).
2. Tap **Upgrade** → plan choice (monthly/yearly) → Google Play purchase sheet → success → Pro badge.
3. Trial/plan expired → read-only mode: creating orders/customers shows the paywall; viewing, delivering and taking payments still work.

### F9 — Manage cloth types and fields
1. More → **Cloth types** → tap Shirt.
2. Field list with ↑↓ reorder, tap to rename/delete, "New field" input at the bottom.
3. Rename "Chest" → "Chest round" → updates all saved measurements and forms.

## 7. Screens (canonical list — DESIGN.md must define every one)
**Auth & onboarding:** S1 Splash · S2 Welcome slides · S3 Sign in (method choice) · S4 Phone number · S5 OTP verify · S6 Email sign in / sign up · S7 Forgot password · S8 Reset password · S9 Shop setup · S10 Set PIN · S11 PIN unlock
**Main (tab bar):** S12 Home · S13 Orders · S14 Customers · S15 More
**Orders:** S16 New order (3-step) · S17 Order detail · S18 Add payment (sheet) · S19 Deliver/balance (dialog) · S20 Share message (sheet)
**Customers & measurements:** S21 Customer detail (tabs: Measurements, Orders) · S22 Add/edit customer (sheet) · S23 Measurement form (sheet) · S24 Measurement history (sheet)
**Settings:** S25 Cloth types list · S26 Cloth type detail (fields) · S27 Settings · S28 Subscription / paywall · S29 Account (sign out, delete) · S30 Help guide · S31 Sync status (sheet)
**Global:** Create menu (sheet) · Search · Toasts · Empty, loading and error states
**V2 screens:** Staff list, Staff detail, Add work entry, Pay staff, AI assistant, Reports, Reminders, Calendar, To-do

## 8. Success metrics
| Metric | Target (month 6) | How measured |
|---|---|---|
| Activation: first order within 24 h of install | ≥ 60 % of sign-ups | event `order_created` with `is_first=true` |
| Time to first order | median ≤ 10 min | install → first `order_created` |
| Weekly active shops (≥ 1 order or status change) | ≥ 65 % of paying shops | events per shop per week |
| Order entry time | median ≤ 60 s | `order_form_opened` → `order_created` |
| Delivered-on-time rate | +15 pts vs owner's baseline after 2 months | delivered_on ≤ due_date |
| Balance collected at delivery | ≥ 85 % of delivered orders fully paid | payments vs total at delivery |
| Sync health | ≥ 99.5 % of outbox items synced within 10 min of connectivity | sync telemetry |
| Crash-free sessions | ≥ 99.5 % | Sentry |
| Trial → paid conversion | ≥ 8 % | Play Billing / RevenueCat |
| Monthly churn (paid) | ≤ 5 % | RevenueCat |
| Language mix | ≥ 50 % non-English UI usage | app setting |

## 9. Risks, assumptions and open questions

### Risks
| Risk | Impact | Mitigation |
|---|---|---|
| **Google Play policy** requires Play Billing for in-app digital subscriptions | Can't use Razorpay inside the app for the plan | Use Play Billing via RevenueCat (MVP); Razorpay only for a future web checkout |
| **SMS OTP in India needs DLT** registration (sender ID, template) | Phone sign-in blocked at launch | Start DLT registration in week 1; Google/email sign-in still work |
| **Offline sync conflicts / duplicate order numbers** across two phones | Confusing numbers, lost edits | Owner-only (usually one phone); last-write-wins; server renumbers clashes and notifies |
| **Low-end phones** (2–3 GB RAM) | Slow app, crashes | SQLite local reads, lists virtualised, images compressed, test on a ₹8k device |
| **Low digital literacy** | Owners abandon after day 1 | Gujarati/Hindi first, big touch targets, sample data, guide, in-person onboarding for first 20 shops |
| **Data privacy** (customer phone numbers) | Trust, DPDP Act 2023 compliance | RLS per shop, encryption in transit, delete-account flow, privacy policy, no selling of data |
| **Price sensitivity** | Low conversion | 30-day trial, low monthly price, yearly discount; validate price with 20 shops |
| **Supabase free-tier limits / costs** at scale | Unexpected bills | Pro plan budget from paying users; monitor DB size and egress; photo compression |

### Assumptions
- One owner uses one Android phone most of the time; a second phone is occasional.
- Owners already use WhatsApp; deep links to WhatsApp are acceptable instead of API messaging.
- Shops take ≤ 100 orders/day and have ≤ 20,000 customers.
- Measurement values fit in numeric(6,2) (max 9999.99) in inches or cm.
- Internet is available at least once a day for sync.
- Prices in INR only; India only at launch.

### Open questions (owner to answer before V1 launch)
1. **Pricing:** monthly and yearly price for TrueFit Pro (working assumption: ₹199/month, ₹1,999/year)? Any free-forever tier with limits?
2. **Trial length:** 30 days, or 14 days + extension after first 10 orders?
3. **SMS provider** for OTP: Twilio Verify (simple, pricier) or MSG91 (cheaper, DLT help)?
4. **Expenses:** the prototype had shop expenses; do owners need them in MVP for profit, or is V2 reports enough?
5. **Data residency:** is a Supabase region in Mumbai (ap-south-1) required by any customer?
6. **Brand/legal:** registered business name for the Play Store listing and invoices; license is proprietary (confirm).
