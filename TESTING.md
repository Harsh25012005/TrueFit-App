# TrueFit — Testing Strategy

> Covers PRD MVP features via FEATURES.md. Tests are **written per feature, in PLAN.md order**, and must pass before the next feature starts. No app code exists yet, so the test cases below are the plan; files are created alongside each feature.

## 1. Tools per layer
| Layer | Tool | Location | Command |
|---|---|---|---|
| Unit (pure logic: totals, formatters, zod schemas, sync mapping) | Jest 30 + jest-expo | `src/**/*.test.ts` | `npm test` |
| Component (screens, UI primitives) | React Native Testing Library 14 | `src/**/*.test.tsx`, `app/**/*.test.tsx` | `npm test` |
| Local DB (Drizzle repos on SQLite) | Jest + in-memory SQLite mock (`better-sqlite3` adapter — add as devDependency when Phase 1 starts) | `src/features/**/*.repo.test.ts` | `npm test` |
| Database (constraints, RLS, RPCs) | pgTAP via Supabase CLI | `supabase/tests/*.test.sql` | `npm run test:db` |
| Edge Functions | Deno test (`deno test`) with mocked fetch | `supabase/functions/**/*.test.ts` | `npx supabase functions serve` + `deno test` (add a script when the first function lands) |
| Integration (sync against local Supabase) | Jest, tagged `@integration` | `src/sync/*.int.test.ts` | `npm test -- sync` with `npm run db:start` running |
| End-to-end (real app on emulator) | Maestro | `e2e/*.yaml` | `npm run test:e2e` |
| Static | TypeScript, ESLint | — | `npm run typecheck`, `npm run lint` |

## 2. What to test first (priority)
1. **Money & order totals** (wrong totals = lost trust) — unit.
2. **RLS & plan gating** (data leaks between shops) — pgTAP.
3. **Sync** (lost or duplicated data) — integration.
4. **Auth flows** — component + e2e.
5. **Order creation with measurement check** — component + e2e.
6. Status/payments, lists, Home counts — unit + component.
7. i18n completeness, WhatsApp templates — unit.
8. Visual details — manual QA.

## 3. Test cases per feature
### M13 Languages
| ID | Case | Type | Expected |
|---|---|---|---|
| L1 | en/gu/hi have identical key sets | unit | No missing/extra keys |
| L2 | `formatMoney(125000)` | unit | `₹1,25,000` |
| L3 | Switch to Gujarati | component | Visible labels change without restart |
| L4 | Missing key in gu | unit | Falls back to English, warns in dev |

### M1 Sign-in & account
| ID | Case | Type | Expected |
|---|---|---|---|
| A1 | Valid email sign-up → code → session | component (mock service) + e2e | Lands on shop setup |
| A2 | Wrong password | component | Error under password, no toast |
| A3 | Phone `12345` | unit (zod) | "Enter 10-digit mobile number" |
| A4 | OTP resend before 60 s | component | Button disabled with timer |
| A5 | Expired OTP | component | "Code expired — resend" |
| A6 | Google cancelled | component | No error shown |
| A7 | Session persists after restart | unit (mock SecureStore) | Session restored |
| A8 | Offline sign-in attempt | component | Offline message |
| A9 | Delete account without typing DELETE | component | Button disabled |
| A10 | Forgot password unknown email | component | Same success message (no enumeration) |

### M2 Onboarding
| O1 | Shop name 1 char | unit | Validation error |
| O2 | `create_shop` creates shop+trial+Shirt/Pant | pgTAP | Rows exist, trial_ends_at ≈ now()+30d |
| O3 | `create_shop` twice | pgTAP | Second call returns 409/existing |
| O4 | Sample data | integration | Demo customers & orders present |

### M3 PIN
| P1 | PIN stored hashed | unit | SecureStore value ≠ PIN, has salt |
| P2 | 5 wrong PINs | component | 30 s lockout |
| P3 | Background > 2 min | unit (fake timers) | Lock screen required |

### M4 Cloth types
| G1 | Duplicate cloth name (case-insensitive) | unit + pgTAP | Rejected |
| G2 | Reorder fields | repo test | sort_order updated, outbox entry |
| G3 | Delete cloth used by active order | repo test | Blocked |

### M5 Customers
| C1 | Phone validation | unit | `^[6-9]\d{9}$` |
| C2 | Duplicate phone | component | Warning with "Open" action, save still allowed |
| C3 | Search by book no. / phone / name (Gujarati) | repo test | Correct rows |
| C4 | Next book no. with gaps/non-numeric | unit | max numeric + 1 |
| C5 | Soft delete + Undo | component | Row hidden then restored |

### M6 Measurements
| ME1 | Value 0 or 1000 | unit | Rejected |
| ME2 | cm input 101.6 | unit | Stored 40.00 in |
| ME3 | Edit creates version; 11th edit drops oldest | repo test | 10 versions |
| ME4 | Unique current measurement per cloth | pgTAP | Second insert → 23505 |

### M12 Sync
| S1 | Push order with items (FK order) | integration | All rows on server |
| S2 | Retry same batch | integration | No duplicates |
| S3 | Server tombstone | integration | Row removed locally |
| S4 | Older client update (LWW) | integration | Server row kept |
| S5 | Order number clash | integration | Second order renumbered, user notified |
| S6 | Expired plan insert | integration | 402 → item marked, paywall flag |
| S7 | Token expired during push | unit (mock) | Refresh then retry once |

### M7 Orders
| OR1 | Totals: 2×650 + 1×700 + extra 150 − 50, GST 5% | unit | base 2100, tax 105, total 2205 |
| OR2 | No rate entered | component | "Enter rate" error (no default) |
| OR3 | Cloth without measurement | component | Blocked + "Take measurement" |
| OR4 | Take measurement then return | component/e2e | Wizard state kept |
| OR5 | Advance > total | unit + pgTAP (`create_order`) | Rejected |
| OR6 | Due date in past | unit | Rejected |
| OR7 | Offline save | integration | Order visible with provisional number |
| OR8 | Expired plan | component | Paywall before wizard |

### M8 Status & payments
| SP1 | Received→Delivered directly | pgTAP (`set_order_status`) | INVALID_TRANSITION |
| SP2 | Deliver with balance → collect | component | Payment created, balance 0 |
| SP3 | Payment > balance | unit | Rejected |
| SP4 | Refund (negative) ≤ paid | unit | Accepted/rejected correctly |
| SP5 | Cancel then restore | repo test | cancelled_at cleared |
| SP6 | Undo status toast | component | Previous status restored |

### M10 Orders list / M9 Home
| H1 | Filter counts on seeded data | repo test | Match expected numbers |
| H2 | Sort by balance desc | repo test | Correct order |
| H3 | Grouping across midnight / time zone IST | unit (fixed clock) | Correct Late/Today/Tomorrow |
| H4 | Home collected today excludes refunds of other days | unit | Correct sum |

### M11 WhatsApp
| W1 | Templates in 3 languages with ₹ and order no. | unit | Snapshot match |
| W2 | URL encoding of Gujarati text | unit | Valid `wa.me` URL |
| W3 | WhatsApp missing | component (mock Linking) | System share used |

### M14 Subscription & RLS
| R1 | Owner A reads owner B customers | pgTAP | 0 rows |
| R2 | Owner A inserts row with B's shop_id | pgTAP | Denied |
| R3 | anon selects any table | pgTAP | Denied |
| R4 | Expired plan: insert order denied, insert payment allowed | pgTAP | As stated |
| R5 | Client updates `subscriptions` | pgTAP | Denied |
| R6 | Webhook same event twice | function test | One update |
| R7 | Webhook wrong secret | function test | 401 |

## 4. Edge and negative cases (apply everywhere)
Empty strings and spaces only · max length + 1 · emoji and Gujarati/Devanagari text · very large numbers · double-tap on Save (only one row) · app killed mid-save · airplane mode toggling · clock set wrong on device (server `updated_at` wins) · font scale 200% · dark mode · 5,000 orders / 1,000 customers performance.

## 5. Mocks
| Dependency | Mock |
|---|---|
| Supabase client | `jest.mock('@/lib/supabase')` returning typed fakes; integration tests use the real local stack |
| expo-secure-store, expo-crypto, expo-local-authentication | jest-expo built-ins + manual mocks in `jest.setup.ts` |
| expo-sqlite | better-sqlite3-backed Drizzle in tests |
| NetInfo | `@react-native-community/netinfo/jest/netinfo-mock.js` |
| Google Sign-In, RevenueCat | mock the wrappers `src/lib/google.ts`, `purchases.service.ts` (never the SDK internals) |
| Time | `jest.useFakeTimers().setSystemTime('2026-11-01T10:00:00+05:30')` |
| Anthropic (V2) | mock `_shared/llm.ts` |

pgTAP file template:
```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);
-- set auth context for owner A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from customers where shop_id <> current_shop_id()), 0::bigint, 'cannot see other shops');
select throws_ok($$ insert into subscriptions(shop_id) values (current_shop_id()) $$, '42501');
select * from finish();
rollback;
```

## 6. Coverage targets
| Area | Target (lines) |
|---|---|
| `src/features/orders`, `payments`, `src/lib/money.ts`, `src/sync` | **90%** |
| Other `src/features/*`, `src/lib/*` | 80% |
| `src/components/ui` | 70% |
| Screens (`app/`) | Covered by e2e flows; no % target |
| SQL | Every table has an RLS test; every RPC has success + failure tests |
Enforce with `coverageThreshold` in the Jest config once Phase 6 starts (not earlier, to avoid blocking scaffolding).

## 7. Commands
```bash
npm test                      # all Jest tests
npm test -- orderTotals       # one file / pattern
npm run test:watch
npm test -- --coverage        # coverage report in coverage/
npm run test:db               # pgTAP (needs npm run db:start)
npm run test:e2e              # Maestro (app installed, emulator running)
npm run typecheck && npm run lint
```

## 8. Manual QA checklist (before each release)
- [ ] Fresh install → each sign-in method → setup → Home (EN, GU, HI)
- [ ] Airplane mode: create customer, measurement, order, payment, deliver → reconnect → data on second phone
- [ ] Order totals match a calculator for 3 sample orders incl. GST
- [ ] Order blocked without measurement; shortcut works
- [ ] WhatsApp receipt / ready / reminder open correctly
- [ ] PIN lock after background; fingerprint
- [ ] Trial banner, purchase (license tester), restore, expired read-only
- [ ] Light/dark, font scale 200%, small phone (360×640) and tablet (≥600 dp)
- [ ] TalkBack reads buttons and status pills
- [ ] No shadows/gradients; only DESIGN.md colors (visual spot check)
- [ ] Delete account flow
- [ ] Sentry receives a test error from the release build

## 9. Working rule
After this plan, generate tests **for one feature at a time** (FEATURES.md order), make them pass with the feature's code, run the full suite, tick PLAN.md, and only then move on.
