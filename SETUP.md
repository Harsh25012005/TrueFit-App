# TrueFit — Developer Setup

> Commands match the scripts in `package.json` and the files in this repo. They were checked against `package.json` / `package-lock.json` (dependency tree resolves cleanly with `npm ci`), but the app source is built phase by phase (PLAN.md), so commands that need source files (`dev`, `android`, `test`, `db:*`) work after **Phase 0/1** are done.

## 1. Prerequisites
| Tool | Version | Check | Notes |
|---|---|---|---|
| Node.js | **22.13+ LTS** (or 24.x) | `node -v` | Required by Expo SDK 58 (`^22.13.0 \|\| ^24.3.0`) |
| npm | 10+ (comes with Node) | `npm -v` | Use npm, not yarn/pnpm (lockfile is npm) |
| Git | 2.40+ | `git --version` | |
| JDK | **17** | `java -version` | Android Gradle build; also needed by Maestro |
| Android Studio | Latest stable, SDK Platform 36, Build-Tools, an emulator (API 34+) | `adb version` | Or a real Android phone with USB debugging |
| Docker | Docker Desktop 4.x / Docker Engine 26+ | `docker info` | Local Supabase runs in containers |
| Supabase CLI | from devDependencies (`supabase` ^2.122) | `npx supabase --version` | No global install needed |
| EAS CLI | latest | `npx eas-cli --version` | Only for cloud builds |
| Maestro | 2.x | `maestro --version` | Only for E2E tests |

### OS notes
- **macOS:** `brew install node@22 openjdk@17` and install Docker Desktop + Android Studio. Add to `~/.zshrc`:
  ```bash
  export JAVA_HOME=$(/usr/libexec/java_home -v 17)
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
  ```
- **Linux (Ubuntu/Debian):** install Node 22 via nvm (`nvm install 22`), `sudo apt install openjdk-17-jdk`, Docker Engine, Android Studio. Add to `~/.bashrc`:
  ```bash
  export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
  export ANDROID_HOME=$HOME/Android/Sdk
  export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
  ```
  Enable KVM for a fast emulator (`sudo adduser $USER kvm`, then log out/in).
- **Windows 10/11:** install Node 22 LTS (nodejs.org installer or `winget install OpenJS.NodeJS.LTS`), `winget install Microsoft.OpenJDK.17`, Docker Desktop (WSL 2 backend) and Android Studio. Set in *System → Environment Variables*: `JAVA_HOME` = JDK 17 folder, `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`, add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to `Path`. Use PowerShell; where a command differs it is shown below. Keep the project in a short path (e.g. `C:\dev\truefit`) to avoid long-path build errors. Maestro on Windows: run it inside WSL 2 or follow Maestro's Windows install guide.

## 2. Clone and install
```bash
git clone <repo-url> truefit
cd truefit
npm ci
```

## 3. Environment variables
macOS / Linux:
```bash
cp .env.example .env
cp supabase/.env.example supabase/.env.local
```
Windows (PowerShell):
```powershell
Copy-Item .env.example .env
Copy-Item supabase/.env.example supabase/.env.local
```
Fill in `.env` (see README.md table). For local development only `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` and `EXPO_PUBLIC_APP_ENV` are required; get the anon key from step 4. Never commit `.env` or `supabase/.env.local` (both are git-ignored).

## 4. Database (local Supabase)
```bash
npm run db:start      # starts Postgres, Auth, Studio, Inbucket in Docker; prints API URL and anon key
npm run db:reset      # applies supabase/migrations in order and runs supabase/seed.sql
npm run db:types      # writes src/types/supabase.ts
npm run db:local:generate   # device SQLite migrations from src/db/schema.ts (only after schema changes)
```
- Studio: http://127.0.0.1:54323 · API: http://127.0.0.1:54321 · Email inbox (Inbucket/Mailpit): http://127.0.0.1:54324
- Seed login: `owner@truefit.test` / `Test@1234`.
- Stop with `npm run db:stop`.
- **Android emulator → local Supabase:** the emulator cannot reach your computer's `127.0.0.1`. Either set `EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321`, or keep `127.0.0.1` and run `adb reverse tcp:54321 tcp:54321` (also works for a USB phone).
- Edge Functions locally: `npm run functions:serve`.

## 5. Run the app
```bash
npm run android    # first time: builds and installs the dev client on the emulator/phone (5–15 min)
npm run dev        # afterwards: starts Metro; the installed dev app connects to it
```
Metro runs at http://localhost:8081. Press `a` in the terminal to open on Android, `r` to reload. A cloud dev build instead of a local one: `npm run build:dev` (needs `npx eas-cli login`).

## 6. Tests and checks
```bash
npm run typecheck
npm run lint
npm test               # Jest unit + component tests
npm run test:db        # pgTAP tests (local Supabase must be running)
npm run test:e2e       # Maestro flows (app installed + emulator running)
```

## 7. Common errors and fixes
| # | Error | Fix |
|---|---|---|
| 1 | `npm ERR! code EBADENGINE` / Expo says Node is too old | Install Node 22.13+ (`nvm install 22 && nvm use 22`), delete `node_modules`, run `npm ci`. |
| 2 | `npm ci` fails: lockfile out of sync | Someone edited package.json without the lock. Run `npm install`, commit both files. Never mix yarn/pnpm. |
| 3 | `Cannot connect to the Docker daemon` on `npm run db:start` | Start Docker Desktop (Windows/macOS) or `sudo systemctl start docker` (Linux); Linux: add user to `docker` group. |
| 4 | `port 54321/54322 already in use` | Another Supabase project is running: `npx supabase stop --all`, or change ports in `supabase/config.toml`. |
| 5 | App shows "Network request failed" against local Supabase | Use `10.0.2.2` or `adb reverse tcp:54321 tcp:54321` (see §4); check `.env` and restart Metro with `npx expo start --dev-client --clear`. |
| 6 | `SDK location not found` / `ANDROID_HOME is not set` | Set `ANDROID_HOME` (see OS notes) or create `android/local.properties` with `sdk.dir=<path to Sdk>`; restart terminal. |
| 7 | Gradle: `Unsupported class file major version` / wrong Java | Use JDK 17: check `java -version` and `JAVA_HOME`. |
| 8 | Changes to `.env` not picked up | `EXPO_PUBLIC_*` vars are inlined at bundle time: stop Metro and run `npx expo start --dev-client --clear`. |
| 9 | Google sign-in `DEVELOPER_ERROR` (code 10) | The SHA-1 of your debug keystore is not registered on the Android OAuth client, or the web client ID is wrong. Get SHA-1 with `cd android && ./gradlew signingReport` (Windows: `gradlew signingReport`). |
| 10 | `No development build installed` when running `npm run dev` | Run `npm run android` once (or install the APK from `npm run build:dev`). Expo Go is not supported (native modules). |
| 11 | Windows: `Filename longer than 260 characters` during build | Move the project to a short path like `C:\dev\truefit`, enable long paths: `git config --system core.longpaths true`. |
| 12 | `supabase test db` → `extension "pgtap" does not exist` | Start each test file with `create extension if not exists pgtap with schema extensions;` (template in TESTING.md) and make sure `npm run db:start` is running. |
| 13 | Phone OTP never arrives locally | Use the test numbers/OTPs set under `[auth.sms.test_otp]` in `supabase/config.toml`; real SMS needs Twilio credentials. |
| 14 | Emulator very slow / won't start on Linux | Enable KVM (`ls /dev/kvm`), use an x86_64 system image, give it 4 GB RAM. |
