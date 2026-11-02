# TrueFit — MCP servers for AI-assisted development

> Model Context Protocol servers let a coding agent (Claude Code, Cursor, etc.) read docs, the database and the repo safely. **Least privilege:** read-only by default, scoped to this project, development data only. **Never put real keys in this file** — use `${ENV_VAR}` placeholders and set the values in your shell or the tool's secret store.

## 1. Servers to use
| Server | Why for TrueFit | Access level |
|---|---|---|
| **Supabase** (`@supabase/mcp-server-supabase`) | Inspect tables, RLS, logs, advisors; generate types; read docs | **Read-only**, scoped to the **dev** project only |
| **Filesystem** (`@modelcontextprotocol/server-filesystem`) | Read/write project files when the agent has no built-in file tools | Only the repo folder |
| **GitHub** (official GitHub MCP server) | Read issues/PRs, open PRs for PLAN.md tasks | Fine-grained token: this repo only, Issues + PR read/write, Contents read |
| **Context7** (`@upstash/context7-mcp`) | Up-to-date docs for Expo 58, Drizzle, NativeWind, supabase-js | Read-only, no account data |
| **Playwright** (`@playwright/mcp`) | Check web pages (Supabase Studio local, docs) — optional | Local browser, no saved logins |
| **Sentry** (remote MCP) — optional, after launch | Read issues and stack traces to debug | Read-only, TrueFit org/project |
Not recommended: any MCP with production DB write access, shell-execution servers without approval, or servers from unknown publishers.

## 2. Configuration (`.mcp.json` in the repo root — placeholders only)
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest",
               "--read-only",
               "--project-ref=${SUPABASE_DEV_PROJECT_REF}",
               "--features=database,docs,debugging,development"],
      "env": { "SUPABASE_ACCESS_TOKEN": "${SUPABASE_MCP_ACCESS_TOKEN}" }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${TRUEFIT_REPO_PATH}"]
    },
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer ${GITHUB_MCP_PAT}" }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--isolated"]
    }
  }
}
```
Set the variables in your shell profile or OS keychain, e.g. `export SUPABASE_MCP_ACCESS_TOKEN=…` (PowerShell: `$env:SUPABASE_MCP_ACCESS_TOKEN="…"`). Commit `.mcp.json` only with `${…}` placeholders. Windows: if `npx` fails to start, use `"command": "cmd", "args": ["/c", "npx", …]`.

## 3. Allowed and blocked tools
| Server | Allowed | Blocked / ask every time |
|---|---|---|
| Supabase | `list_tables`, `list_extensions`, `list_migrations`, `execute_sql` (SELECT only, read-only mode), `get_advisors`, `get_logs`, `generate_typescript_types`, `search_docs`, `get_project_url` | `apply_migration`, `deploy_edge_function`, `create_project`, `pause_project`, `create_branch`/`merge_branch`/`delete_branch`, `get_publishable_keys` on prod; anything on the **production** project |
| Filesystem | read/list/search inside repo; write inside `app/`, `src/`, `supabase/`, `e2e/`, docs | Writes to `.env*`, `supabase/.env.local`, `android/`, `node_modules/`; any path outside the repo |
| GitHub | read issues/PRs/files, create branch, open PR, comment | merge PR, push to `main`, delete branch/repo, change settings or secrets |
| Context7 | all | — |
| Playwright | navigate local URLs and docs, screenshot | entering real credentials, payments, form submits on live sites |
Schema changes go through migration files + `npm run db:reset` locally, reviewed in a PR — never applied by an agent directly to a cloud project.

## 4. Permission rules (Claude Code `.claude/settings.json` example)
```json
{
  "permissions": {
    "allow": [
      "mcp__supabase__list_tables", "mcp__supabase__execute_sql",
      "mcp__supabase__get_advisors", "mcp__supabase__search_docs",
      "mcp__context7__*",
      "Bash(npm run typecheck)", "Bash(npm run lint)", "Bash(npm test)", "Bash(npm run test:db)"
    ],
    "ask": [
      "mcp__github__create_pull_request", "Bash(npm run db:reset)", "Bash(npm install:*)"
    ],
    "deny": [
      "mcp__supabase__apply_migration", "mcp__supabase__deploy_edge_function",
      "mcp__github__merge_pull_request",
      "Read(./.env)", "Read(./supabase/.env.local)", "Bash(rm -rf:*)", "Bash(git push --force:*)"
    ]
  }
}
```
Tokens: Supabase personal access token from a **dev-only** account/org where possible; GitHub fine-grained PAT expiring in ≤ 90 days.

## 5. Testing each server
| Server | Test prompt / command | Expected |
|---|---|---|
| Supabase | "List tables in the public schema" | Tables from DATABASE.md; a `create table` request is refused (read-only) |
| Supabase | "Run security advisors" | No "RLS disabled" findings |
| Filesystem | "List files in src/features" | Only repo paths |
| GitHub | "List open issues in this repo" | Issues returned; merge attempt is blocked |
| Context7 | "Docs for expo-sqlite openDatabaseSync in SDK 58" | Current API docs |
| Playwright | "Open http://127.0.0.1:54323 and screenshot" | Supabase Studio screenshot |
Most clients also offer a server list (e.g. `/mcp` in Claude Code) showing connected/failed status.

## 6. Troubleshooting
| Problem | Fix |
|---|---|
| Server shows "failed" / not connected | Run the `npx …` command by hand to see the error; check Node ≥ 22. |
| `401 Unauthorized` (Supabase/GitHub) | Variable not set in the environment that launches the client; restart the client after `export`. Check token not expired. |
| Supabase MCP sees no tables | Wrong `--project-ref` (prod vs dev) or migrations not pushed to that project. |
| Write tool refused | Expected in `--read-only`; use migrations + PR instead. |
| Windows `spawn npx ENOENT` | Use `cmd /c npx …` form. |
| Slow first start | `npx -y` downloads packages; pin versions after the first run if needed. |
| Filesystem "access denied" | Path outside `${TRUEFIT_REPO_PATH}`; use an absolute repo path. |
| Too many tools / context use | Limit Supabase `--features`, disable unused servers per session. |
