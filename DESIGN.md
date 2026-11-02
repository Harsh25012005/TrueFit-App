# TrueFit — Design System

> Source of truth for every screen. Reads from **PRD.md**. Every UI built later must use only the tokens, fonts and components in this file. If something is missing, add it here first.

## 1. Brand feel
**Calm, trustworthy, made for the shop counter.** TrueFit should feel like a clean measurement register that never loses anything: quiet neutrals, one confident emerald green, generous touch targets, and words in the owner's own language. No decoration that doesn't help a busy owner finish a task.

**Logo:** the "TF" mark (rounded T and F letterforms) in white on an emerald square. Wordmark: "True" in Text colour + "Fit" in Primary, Plus Jakarta Sans 800.

### Design principles
1. **One glance, one tap.** The next action is always obvious: one primary button per screen, today's work first, every core task ≤ 3 taps from Home.
2. **Flat and quiet.** One brand colour, neutrals for everything else, 1 px borders instead of shadows, 2–4 px radius. Colour is used only to mean something (primary action, status, error).
3. **Speaks the owner's language.** Gujarati, Hindi and English are first-class: layouts survive 40 % longer words, numbers use Indian grouping (₹1,25,000), and nothing relies on English abbreviations.

## 2. Colour palette

Rules: **no gradients and no shadows anywhere**, with one exception: the AI gradient, used only on TrueFit AI elements (V2). Do not invent colours; use these tokens.

| Token | Use | Light | Dark |
|---|---|---|---|
| `primary` | Main buttons, active tab, links, key numbers | `#047D55` | `#3CCB94` |
| `primary-pressed` | Pressed/hover primary | `#03664A` | `#62D9AA` |
| `primary-subtle` | Selected chip bg, info banners, focus halo | `#E6F3ED` | `#112A20` |
| `on-primary` | Text/icons on primary | `#FFFFFF` | `#06150F` |
| `secondary` | Ink: selected chips/segments, user chat bubble, strong text buttons | `#18181B` | `#EDEDF0` |
| `on-secondary` | Text on secondary | `#FAFAFA` | `#0E0E10` |
| `background` | App background | `#FAFAFA` | `#0E0E10` |
| `surface` | Cards, sheets, inputs, nav bars | `#FFFFFF` | `#151518` |
| `surface-muted` | Inset fields, rate boxes, table stripes | `#F5F5F6` | `#1B1B1F` |
| `border` | Card and input borders | `#E7E7EA` | `#26262B` |
| `border-subtle` | Row dividers inside cards | `#F0F0F2` | `#1E1E22` |
| `text` | Main text | `#18181B` | `#EDEDF0` |
| `text-muted` | Secondary text, labels, placeholders | `#6B6B73` | `#9B9BA4` |
| `text-faint` | Disabled text, decorative icons only (never body text) | `#A1A1AA` | `#62626B` |
| `success` | Paid, delivered, saved (same as primary by design) | `#047D55` | `#3CCB94` |
| `warning` | Due today, trial ending, low-priority alerts | `#B45309` | `#F2B25C` |
| `warning-subtle` | Warning banner background | `#FEF3E2` | `#2E2414` |
| `error` | Errors, late, destructive actions | `#C0392B` | `#EF7D70` |
| `error-subtle` | Error banner background | `#FBEDEB` | `#2E1A18` |
| `overlay` | Behind sheets and dialogs | `rgba(10,12,18,0.50)` | `rgba(0,0,0,0.60)` |
| `ai-gradient` (V2 only) | AI button, AI icon tile, AI send button | `#047D55 → #14A87A → #3B82F6 → #8B5CF6` (135°) | `#2FC98F → #38BDF8 → #A78BFA` |

**Order status colours** (always shown with a text label, never colour alone):
| Status | Pill style |
|---|---|
| Received | border `border`, text `text` |
| Ready | fill `primary`, text `on-primary` |
| Delivered | border `border`, text `text-muted` |
| Cancelled | border `error-subtle`, text `error` |
| Late (due label) | text `error`, weight 600 |
| Due today / tomorrow | text `warning`, weight 600 |

Verified contrast (WCAG 2.1): primary on white 5.16:1 · white on primary 5.16:1 · text-muted on white 5.28:1 · error on white 5.44:1 · warning on white 5.02:1 · dark primary on dark background 9.33:1 · dark text-muted on dark surface 6.61:1.

## 3. Typography

| Script | Family | Source |
|---|---|---|
| Latin | **Plus Jakarta Sans** | `@expo-google-fonts/plus-jakarta-sans` |
| Gujarati | **Noto Sans Gujarati** | `@expo-google-fonts/noto-sans-gujarati` |
| Devanagari (Hindi) | **Noto Sans Devanagari** | `@expo-google-fonts/noto-sans-devanagari` |
| Numbers | Plus Jakarta Sans with tabular figures (`fontVariant: ['tabular-nums']`) | — |

Weights used: **400** Regular, **500** Medium, **600** SemiBold, **700** Bold, **800** ExtraBold (logo and hero numbers only).

Size scale (dp; scales with the OS font size and the in-app **Large text** setting, ×1.15):

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `display` | 30 | 36 | 700 | Splash/onboarding titles |
| `title-1` | 24 | 30 | 700 | Screen titles (root tabs), customer name |
| `title-2` | 20 | 26 | 700 | Sheet titles, big amounts |
| `title-3` | 17 | 24 | 600 | Card titles, list primary text |
| `body` | 16 | 24 | 400 | Default text, inputs |
| `body-strong` | 16 | 24 | 600 | Buttons, emphasised values |
| `label` | 14 | 20 | 500 | Field labels, secondary lines |
| `caption` | 13 | 18 | 400 | Hints, timestamps |
| `overline` | 12 | 16 | 600 | Section headers, UPPERCASE, letter-spacing 0.08em (Latin only; no uppercase for GU/HI) |

Rules: minimum body size 16; never below 12. Gujarati/Hindi line height +2 dp. Truncate names with ellipsis, never wrap buttons.

## 4. Spacing, radius, elevation, breakpoints

**Spacing (4-pt grid):** `0` 0 · `1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `12` 48.
Screen side padding 16. Card padding 16 (compact rows 12/16). Gap between sections 28. Gap between cards 8.

**Radius:** `radius-sm` **2** (pills, badges, small chips) · `radius-md` **4** (buttons, inputs, cards, sheets' top corners, tab pill). Nothing rounder (no circles except radio dots and the PIN dots).

**Shadows / elevation:** **none.** `elevation: 0` on Android everywhere. Separate layers with `border` (1 px) and surface steps (`background` → `surface` → `surface-muted`). Sheets and dialogs sit on `overlay`.

**Touch targets:** minimum 48 × 48 dp; list rows ≥ 56 dp.

**Breakpoints (window width):**
| Name | Width | Layout |
|---|---|---|
| `phone` | < 600 | Single column, floating bottom tab bar |
| `tablet` | 600–959 | Single column, max content width 560, centred |
| `wide` | ≥ 960 | Left sidebar navigation (240), content max 760 |

**Motion:** 150–250 ms, ease-out `cubic-bezier(0.2,0.8,0.2,1)`. Allowed: screen fade (180 ms), sheet slide-up (280 ms), button press scale 0.97, toast slide (250 ms). Respect OS "Reduce motion" (disable all except opacity).

## 5. Iconography
**Tabler Icons** (outline, stroke 1.8) via `react-native-svg`. Sizes 16 / 20 / 24. Icons always paired with a label in navigation and primary actions.

## 6. Components (all states)

State tokens used below: **hover** applies to pointer devices (tablets with mouse, wide layout); on touch, **pressed** replaces hover. **Focus** = keyboard/switch-access focus ring: 2 dp `primary` outline with 2 dp gap. **Loading** never changes component size.

### 6.1 Button
Height 48 (sm 40), padding 0/20, radius 4, `body-strong`, icon 20 left of label, gap 8.

| Variant | Default | Hover/Pressed | Focus | Disabled | Loading | Error |
|---|---|---|---|---|---|---|
| Primary | bg `primary`, text `on-primary` | bg `primary-pressed`, scale 0.97 | ring | bg `primary` 40 % opacity, no press | spinner 18 (on-primary) replaces icon, label kept, not pressable | n/a (errors shown near the form) |
| Secondary | bg `surface`, 1 px `border`, text `text` | border `text-faint`, bg `surface-muted` | ring | text `text-faint`, border `border-subtle` | spinner `text` | — |
| Ghost / link | no bg, text `primary` | underline | ring | `text-faint` | spinner | — |
| Destructive | bg `surface`, 1 px `error-subtle`, text `error` | bg `error-subtle` | ring (error colour) | 40 % opacity | spinner `error` | — |
| Icon button | 48×48, icon `text` | bg `surface-muted` | ring | icon `text-faint` | spinner | — |

One primary button per screen/sheet. Destructive actions always confirm in a Dialog.

### 6.2 Input (text, number, phone, date, search, textarea)
Height 48 (textarea min 96), radius 4, 1 px `border`, bg `surface`, padding 0/14, text `body`, label above (`label`, `text-muted`), hint below (`caption`).

| State | Style |
|---|---|
| Default | border `border`, placeholder `text-muted` |
| Hover (pointer) | border `text-faint` |
| Focus | border `primary` 1 px + 3 dp `primary-subtle` halo outline (no shadow) |
| Filled | same as default; value `text` |
| Disabled / read-only | bg `surface-muted`, text `text-muted`, no halo |
| Loading (async check, e.g. OTP send) | trailing 16 dp spinner |
| Error | border `error` + 3 dp `error-subtle` halo; message below in `error` `caption`, starts with an icon; field shakes 4 dp once (reduced-motion: no shake) |

Variants: **Phone** (fixed "+91" prefix, numeric keyboard, 10 digits); **Money** ("₹" prefix, numeric, no spinners); **Measurement** (decimal keypad, unit suffix "in/cm", `returnKeyType="next"`, Enter moves to next field); **Search** (leading search icon, trailing mic button 40×40); **Rate box** (compact 88 wide, bg `surface-muted`, no border until focus).

### 6.3 Selection controls
- **Chip** (filter): height 36, radius 4, 1 px `border`, text `text-muted` + count. Selected: bg `secondary`, text `on-secondary`. Disabled: `text-faint`.
- **Segmented control**: container `surface-muted` 3 dp padding, radius 4; selected segment `surface` + 1 px `border`, text `primary` 600.
- **Stepper (− n +)**: one 1 px `border` outline, radius 4, height 40; buttons 40 wide without inner borders; value 600 tabular. Disabled minus at 0 (`border` colour icon).
- **Switch**: track 44×26, radius 2; off `border`, on `primary`; thumb `surface`.
- **Checkbox**: 20, radius 2, checked `primary`.

### 6.4 Card
bg `surface`, 1 px `border`, radius 4, padding 16. Variants: **List card** (rows separated by `border-subtle`, no inner padding on rows' sides beyond 16), **Summary card** (3 equal columns split by `border-subtle`), **Inset** (bg `surface-muted`, no border).
States: pressable cards — pressed bg `surface-muted` + scale 0.99; focus ring; disabled 50 % opacity; loading = skeleton blocks (`surface-muted`, 4 radius, no shimmer when reduce-motion); error = card body replaced with error message + "Try again" link.

### 6.5 Modal family
- **Bottom sheet** (default for forms): bg `surface`, top radius 4, top border 1 px `border`, drag handle 36×4 `border`, header 56 (title `title-2` + close icon), body scroll, **sticky footer** with actions separated by `border-subtle`. Max height 92 %. Drag down > 110 dp closes (asks to discard if the form is dirty).
- **Dialog** (confirmations): centred, width min(400, 100 % − 48), padding 20, title `title-3`, message `body` muted, stacked full-width buttons (primary first, cancel last).
- States: opening slide/fade; **loading** — footer primary shows spinner and the sheet blocks dismiss; **error** — inline banner at top of body (`error-subtle` bg, `error` text); disabled actions per Button.

### 6.6 Navigation
- **Top app bar**: height 56 (root tabs 64 with `title-1`), bg `background`, bottom border appears after scrolling. Left: back (non-root). Right: max 2 icon buttons. **Home** header: logo mark (32) + greeting `title-3` + "Shop · date" `caption`; right: search, notifications. No search icon on other screens.
- **Bottom tab bar (floating)**: 12 dp from screen edges and bottom (+ safe area). Left group (bg `surface`, 1 px `border`, radius 4, padding 4) with 4 tabs: **Home, Orders, Customers, More** (icon 22 + label `caption`). Active tab: bg `primary-subtle`, icon + label `primary`, weight 600. Inactive: `text-faint`. Badge (late orders): 18 dp, radius 2, bg `error`, white 11 dp text. Right: separate **Add** button 64×64, bg `primary`, icon `on-primary` 28, radius 4. Pressed: scale 0.94. Focus ring on each.
- **Sidebar (wide)**: 240 wide, `surface`, right border; logo + "TrueFit" top, **Create** primary button, then tabs as rows (active = `primary-subtle`).

### 6.7 Lists & tables
Mobile uses **list rows**, not tables. Row: min height 56, padding 12/16, primary text `title-3`, secondary `label` muted, trailing value right-aligned tabular + chevron. Group headers: `overline` muted, 8 top / 6 bottom.
**Table** (wide layout and reports, V2): header row bg `surface-muted`, `label` 600; rows 48, dividers `border-subtle`; numbers right-aligned tabular; zebra off; sortable header shows arrow icon; hover row `surface-muted`; focus row ring; empty → Empty state inside table body; loading → 5 skeleton rows; error → one row with message + retry.

### 6.8 Toast
Bottom, above the tab bar (bottom 96), max width 480, bg `secondary`, text `on-secondary`, radius 4, padding 12/16, icon 18 left (success `primary`, error `error`, info `on-secondary`), optional action text button (**Undo**) in `primary-subtle`. Auto-hide 2.5 s (5 s with action). One at a time; newest replaces. Announced via accessibility live region.

### 6.9 Other components
- **Status pill**: height 22, radius 2, `caption` 600 (see status table).
- **Badge/count**: radius 2, `surface-muted`, `caption`.
- **Banner**: full-width inside content, radius 4, icon + text + optional action; variants info (`primary-subtle`), warning (`warning-subtle`), error (`error-subtle`).
- **Empty state**: 48 icon tile (`surface-muted`), title `title-3`, one-line text muted, one button.
- **Skeleton**: `surface-muted` blocks matching final layout.
- **Avatar**: 40 square, radius 4, initials `label` 600 on `surface-muted`, text `text-muted`.
- **Sync indicator**: 20 icon in More/Home header menu: cloud-check (synced), cloud-up spinner (syncing), cloud-off (offline, with "changes saved on phone").
- **PIN pad**: 3×4 keys 72×64, radius 4, 1 px `border`; dots 14 squares radius 2 (filled `primary`).

## 7. Page layouts (every PRD screen)
All screens: background `background`, side padding 16, content max widths per breakpoint, bottom space 112 for the floating tab bar on tab screens.

| # | Screen | Layout |
|---|---|---|
| S1 | Splash | Centred logo mark 64 + wordmark `display` + tagline `body` muted. 900 ms, fades. |
| S2 | Welcome slides | Top: logo + "TrueFit" + language segmented (EN/ગુ/हि). Middle: 104 icon tile (`primary-subtle`), title `display`, text `body` muted. Bottom: dots (active = 22 wide bar), buttons **Skip** (secondary) + **Next/Get started** (primary). |
| S3 | Sign in | Logo, title "Sign in to TrueFit", three full-width buttons: Continue with phone (primary), Continue with Google (secondary with G icon), Continue with email (secondary). Terms/privacy links `caption`. |
| S4 | Phone number | Back, title, Phone input (+91), primary **Send OTP** (loading while sending). Error: invalid number / too many attempts. |
| S5 | OTP verify | 6 boxes (48×56, radius 4), auto-advance, paste support, resend timer "Resend in 0:45", primary **Verify**. |
| S6 | Email | Tabs Sign in / Create account (segmented); email, password (show/hide), primary button, "Forgot password?" link. |
| S7 | Forgot password | Email input, primary **Send reset link**, success banner "Check your email". |
| S8 | Reset password | New password + confirm, strength hint, primary **Save password** (opened from email deep link). |
| S9 | Shop setup | Title "Your shop", fields: Your name, Shop name, Shop phone, Language; primary **Continue**; step indicator 1/2. |
| S10 | Set PIN | PIN pad, "Create a 4-digit PIN", then confirm; **Skip for now** ghost. Fingerprint toggle if available. |
| S11 | PIN unlock | Logo 64, "Welcome back, {name}", shop name muted, dots, PIN pad, "Forgot?" (signs out and requires full sign-in). |
| S12 | Home | Header (logo, greeting, shop · date, search, bell). **Today** summary card (3 columns: Collected in `primary`, New orders, Delivered). Two buttons: **New order** (primary, 1.4 fr) + **Measure** (secondary). Section "Today's work" (list card: name #no, items · due label, trailing action button Ready/Deliver). Empty: "All caught up". Quick links list card: Coming up this week, Ready to give, Reminders (V2), To collect. Trial banner (last 5 days). |
| S13 | Orders | Title "Orders" + Add icon. Search with mic + Sort icon. Filter chips (horizontal scroll). Result line "11 orders · Due date" + Select. Grouped list cards (LATE, TODAY, TOMORROW, THIS WEEK, LATER): row = name + #no, items · due label; trailing status pill + "₹950 due"/"Paid". Load more button. |
| S14 | Customers | Title + Add icon. Search + mic. Chips All / Has dues. One list card: avatar initials, name, "Book no. 101 · 98240 12345", trailing due amount. |
| S15 | More | Shop card (logo, shop, owner · phone, Settings button). Language segmented. Groups (list cards with `overline` headers): Shop (Cloth types, Calendar V2, Reports V2), Team (Staff V2, Reminders V2), Setup (Settings, Subscription, Help), Preferences (Dark mode, Large text, App PIN, Sync status, Sign out). Version caption. |
| S16 | New order | Full-screen sheet with step bar (1 Customer · 2 Clothes · 3 Details; done steps ✓). Recap rows for finished steps with **Change**. Step 1: search, **New customer** inline form, recent 3, all A–Z. Step 2: rows per cloth (name + measurement status link, rate box when qty>0, stepper); footer Total + **Next**. Step 3: measurements check list (View/change or Take now), delivery chips + date (+ "n orders already due"), advance + Cash/UPI, urgent checkbox, note, bill summary (total, advance, balance); footer **Full form** (V2 extras) + **Create order** (disabled until measurements exist). Success: order page + toast. |
| S17 | Order detail | Header: status pill, urgent tag, customer name (link), "items · total", meta (ordered, due label), Call / WhatsApp buttons. Status segmented (Received/Ready/Delivered) + primary next-step button + "Tell customer it's ready" (Ready only). Section Payment (balance big number, progress bar 4 dp primary on `border-subtle`, line items, payments with remove, **Add payment**, **Receipt**). Section Clothes (cards per item, style chips, note). Section Measurements (cards per cloth or "Take" banner). Footer list: Repeat order, Cancel order, Delete order (destructive). |
| S18 | Add payment | Sheet: total/paid/balance summary inset, amount (balance prefilled), mode segmented (Cash/UPI/Card), date, note; **Save payment**. |
| S19 | Deliver with balance | Dialog: "₹950 still due on #1234" → Collect cash & deliver · Collect UPI & deliver · Deliver without payment · Cancel. |
| S20 | Share message | Sheet: preview text (receipt / ready / payment reminder) in inset card, language follows app, buttons **Copy** + **Send on WhatsApp**. |
| S21 | Customer detail | Name `title-1`, "Book no. · phone · area", stats line (orders, active, due in `primary`), actions: **New order** (primary), **Measure**, Call, WhatsApp (icon buttons). Sticky tabs: Measurements · Orders. Measurement cards (cloth, date, 3-column value grid, Update / History / Share / Delete). Orders tab = order rows. Delete customer (destructive) at bottom. |
| S22 | Add/edit customer | Sheet: Full name, Mobile (+91), Book no. (next number prefilled, uniqueness check), Area (optional); sticky footer Cancel / Save. |
| S23 | Measurement form | Sheet: customer picker (search + mic; locked when opened from a customer), cloth segmented, info hint ("Updating saved measurement…"), 3-column grid of measurement inputs, notes + quick chips; footer Cancel / **Save measurement**. |
| S24 | Measurement history | Sheet: version cards newest first, changed values highlighted (`primary-subtle` cell + "was 38"), **Use this version** on old ones. |
| S25 | Cloth types | Hint line, list card rows (initial tile, name, "7 fields · 8 customers", chevron), **Add cloth type** secondary button. |
| S26 | Cloth type detail | Header tile + name + counts; hint about rename everywhere; list card of fields (number, name, "8 measurements", ↑↓ stepper, edit icon); add-field row (input + Add); **Rename, styles & more** button (sheet with name, style options, fabric/piece). |
| S27 | Settings | Shop details form (name, phone, UPI ID, GSTIN) + Save; Appearance (theme segmented, text size); Work (unit in/cm, default GST, weekly holiday); Data (backup export V2, restore). |
| S28 | Subscription / paywall | Current plan card (Trial · 12 days left / Pro · renews 1 Dec). Plan options (Monthly, Yearly with "save 16 %"), feature list with checks, primary **Upgrade**, Restore purchases link, terms. Read-only banner text when expired. |
| S29 | Account | Signed-in method + email/phone, Sign out, **Delete account** (destructive, typed confirmation "DELETE"). |
| S30 | Help guide | Numbered list card (8 steps) + "Show welcome screens again". |
| S31 | Sync status | Sheet: state icon + text, last synced time, pending changes count, **Sync now**; error detail + "Try again". |
| — | Create menu | Bottom sheet list: New order (primary tile), Measurement, Customer; V2: "Create with TrueFit AI" gradient-bordered row. |
| — | Search | Full-screen: search input (autofocus, mic), grouped results Customers / Orders, empty "No results". |

V2 screens follow the same patterns: **Staff list** (list card + "+ Work" row action), **Staff detail** (name, stats line, Add work/Pay, rate tiles, work entry list, payments card), **Work entry** (sheet: date chips, stepper per cloth, total, Save), **AI assistant** (full screen chat; header with AI gradient tile; 8 quick-chip grid; user bubbles `secondary`, AI bubbles `surface` bordered; confirm cards with 1 px gradient border; input + mic + gradient send), **Reports** (period segmented, KPI summary cards, bar chart in `primary`/`text-faint`, tables).

## 8. Accessibility rules
1. **Contrast:** text ≥ 4.5:1, large text (≥ 20 dp or 16 dp bold) and icons/UI boundaries ≥ 3:1. `text-faint` only for disabled/decorative content.
2. **Never colour alone:** every status has a text label; errors have an icon + message.
3. **Focus:** visible 2 dp `primary` focus ring with 2 dp offset on every interactive element when using keyboard, D-pad or switch access; logical focus order top→bottom, left→right; focus moves to the sheet title when a sheet opens and returns to the trigger when it closes; Esc/back closes sheets and dialogs.
4. **Screen readers (TalkBack):** every icon button has `accessibilityLabel` in the current language; rows read as one sentence ("Karan Trivedi, order 1234, 3 shirts, 2 days late, 950 rupees due"); toasts use a live region; headings marked with `accessibilityRole="header"`.
5. **Touch:** targets ≥ 48 dp, 8 dp apart; no gestures without a button alternative (drag-to-close sheet also has close button).
6. **Text size:** supports OS font scale up to 200 % and in-app Large text; layouts wrap, never clip; no fixed-height text containers.
7. **Motion:** honour Reduce motion; no auto-playing animation longer than 1 s except loading spinners.
8. **Language:** set `lang`/locale per screen so TalkBack uses the right voice; dates/numbers formatted with `en-IN`, `gu-IN`, `hi-IN` locales with Latin digits.
9. **Forms:** labels always visible (not placeholder-only); errors announced and linked to fields; numeric keyboards for numbers.
10. **Time limits:** OTP resend timer is informational; no screen times out except the PIN lock after 5 minutes in background (configurable).
