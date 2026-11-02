# TrueFit — Debug Prompt Template

Copy everything below the line, replace the bracketed parts, and paste it to your coding agent. Leave a placeholder as-is if you don't have that information — the agent will ask.

---

You are debugging the TrueFit app (React Native + Expo SDK 58, TypeScript, Expo Router, expo-sqlite + Drizzle, Supabase). Follow AGENTS.md. Source of truth: PRD.md, DESIGN.md, ARCHITECTURE.md, DATABASE.md, API.md.

**Error / problem**
```
[PASTE FULL ERROR HERE — complete message and stack trace, not a summary]
```

**What I was doing when it happened**
[DESCRIBE THE STEPS — screen, button tapped, online/offline, which account]

**Expected vs actual**
- Expected: [WHAT SHOULD HAPPEN]
- Actual: [WHAT HAPPENED]

**Where**
- File(s) / screen: [PATH OR SCREEN NAME, e.g. app/(app)/orders/new.tsx]
- PLAN.md task: [TASK ID, e.g. 6.5]
- Platform: [Android emulator / real phone model + Android version]
- Build: [dev client / preview / production], branch/commit: [COMMIT HASH]

**Recent changes**
[WHAT CHANGED SINCE IT LAST WORKED — files, packages, migrations, env vars]

**Logs and output**
```
[PASTE RELEVANT LOGS — Metro, adb logcat, Supabase logs, test output]
```

**Already tried**
[WHAT YOU TRIED AND WHAT HAPPENED]

### Rules
- Do NOT guess. If the information above is not enough to be sure of the cause, ask me for exactly what you need (a file, a log, a command output) before changing code.
- Do NOT rewrite large parts of the code. Make the smallest change that fixes the cause.
- Do NOT add new libraries, change the database schema, touch auth/RLS/billing, or change design tokens without asking first.
- Do NOT hide the error (no empty catch blocks, no disabling tests or lint rules, no `any` to silence types).
- Never print or commit secrets from `.env` files.

### Process (follow all 5 steps, and show each one)
1. **Understand** — restate the error in one or two sentences and point to the exact file and line where it starts.
2. **Find the root cause** — list up to 3 possible causes, check each against the code/logs, and say which one is confirmed and why. If none can be confirmed, stop and ask.
3. **Fix** — show the minimal diff and explain why it fixes the root cause, not just the symptom.
4. **Verify** — give the exact commands to run (`npm run typecheck`, `npm run lint`, `npm test -- <pattern>`, `npm run test:db` if SQL changed) and the manual steps to confirm, and add a test that fails before the fix and passes after.
5. **Prevent** — say in one line whether a test, validation or doc update (which file) would stop this from coming back.

If you are unsure at any step, stop and ask me instead of continuing.

Continue from where you left off.
