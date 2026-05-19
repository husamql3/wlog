# wlog — Development Roadmap

A phased, vertical-slice plan for building wlog. Free-tier MVP ships first; Pro tier (CLI, Linear, Brag Doc, regeneration, billing) lands in later phases. See `docs/CONTEXT.md` for domain terms and `docs/000X-*.md` for accepted ADRs.

**Strategy decisions baked into this plan:**
- Vertical slice over horizontal — get one end-to-end flow working early, then widen.
- Free-only MVP first — defer Stripe, CLI, and all Pro features until after first user ship.
- Stack: Bun + Turborepo monorepo; Elysia server deployed on Vercel; Neon Postgres + Prisma; Trigger.dev for jobs; Better Auth; CLI compiled with `bun build --compile`; web framework deferred to Phase 2.
- CLI client typing via Elysia's Eden Treaty (replaces tRPC and partly replaces `packages/types`).

---

## Phase 0 — Foundation
**Goal:** Repo scaffolded, CI green, a "hello world" Elysia route deployed on Vercel.

- [x] Init Bun + Turborepo monorepo at repo root
- [x] Create current app/package scaffold: `apps/server` (Elysia), `apps/web`, `apps/tui`, `packages/auth`, `packages/config`, `packages/env`, `packages/ui`
- [x] Add Phase 1 data package: `db` (Prisma + Trigger.dev tasks)
- [x] Decide package direction: use `apps/tui` as the CLI package; skip `types` for now and add a future shared package only when shared domain types exist
- [x] Strict TypeScript config shared through `@wlog/config`
- [x] Biome for lint + format (one tool, no ESLint/Prettier split)
- [x] Bun test runner configured per implemented package
- [x] GitHub Actions CI: Biome + typecheck + build + test on PR
- [x] Neon project created; pooled + direct connection strings in `.env`
- [x] Vercel project linked to repo
- [x] Elysia "hello world" deployed on Vercel
- [x] `.env.example` checked in at `packages/env/.env.example`
- [x] Decide LLM provider (Google Gemini 2.5-flash via Vercel AI SDK) — ADR 0009

## Phase 1 — Vertical slice: GitHub → EOD Digest
**Goal:** End-to-end happy path with no web UI. A user signs up via API, connects GitHub, picks one repo, triggers a manual pull, reads back an EOD Digest. Verified by `curl` / a small test harness.

- [x] Prisma schema: `User`, `Plan` enum (default `FREE`), `Connection`, `ConnectionScope`, `Pull`, `Activity`, `ActivitySummary`, `Digest`, `DigestType` enum
- [x] First Prisma migration (`20260517183036_init`)
- [x] Dev seed script (`packages/db/src/seed.ts`, run with `bun db:seed`)
- [x] Better Auth wired into Elysia: Google OAuth + magic link + Polar init + session middleware
- [x] Eden Treaty client exported from `apps/server` for downstream packages (`App` type + `@elysiajs/eden`)
- [x] GitHub OAuth flow: redirect, callback, token exchange, store in `Connection`
- [x] `GET /integrations/github/repos` — list repos visible to user's GitHub token
- [x] `POST /integrations/github/scope` — save selected repo IDs to `ConnectionScope`
- [x] Trigger.dev project set up; `manual-pull` task scaffolded
- [x] `manual-pull` fetches GitHub Activity for the Connection's Scope only
- [x] ActivitySummary builder: filter to kept signals per `CONTEXT.md`, dedup, structure
- [x] LLM call: generate Standup + EOD from ActivitySummary (Gemini 2.5-flash via AI SDK)
- [x] Persist Digests with reference to source ActivitySummary (needed for regeneration later)
- [x] `POST /pulls/manual` API → triggers `manual-pull`
- [x] `GET /digests?date=...&type=eod` API
- [ ] Manual e2e: signup → connect → scope → pull → digest passes

## Phase 2 — CLI (`apps/tui`)
**Goal:** Power users can drive the full flow from the terminal.

- [ ] `wlog login` — device-code flow (CLI polls server; user approves in browser via Google OAuth)
- [ ] Token stored in `~/.config/wlog/config.json`; Eden Treaty client injects `Authorization: Bearer`
- [ ] `wlog status` — GitHub connection status + last Pull
- [ ] `wlog sync` — trigger manual Pull, poll until complete
- [ ] `wlog today` — print today's Standup
- [ ] `wlog eod` — print today's EOD; `--export` saves `eod-YYYY-MM-DD.md`
- [ ] `wlog repos list` — list repos with scope indicators
- [ ] `wlog repos add <name>` / `wlog repos remove <name>` — manage GitHub Scope
- [ ] `bun build --compile` → `wlog` binary

## Phase 3 — Free-tier web dashboard
**Goal:** Free users can do the whole flow in a browser.

- [ ] **Web framework: TanStack Start** (SPA mode, pure static deploy)
- [ ] `apps/web` deploys to Vercel as static site
- [ ] Signup + login screens via Better Auth (@efferd/auth-3 block)
- [ ] Onboarding flow: connect GitHub → repo picker → first manual pull
- [ ] Dashboard home: today's Standup + EOD
- [ ] Timeline view: last 7 days of Digests (Free history cap)
- [ ] Direct editing of Digest text (marks Digest as `edited`)
- [ ] Settings page: pull time picker, Connection status, Scope editing
- [ ] Empty / loading / error states; toasts

## Phase 4 — Scheduled pulls + email delivery
**Goal:** A user can sign up, walk away, and get their EOD in their inbox daily.

- [ ] Trigger.dev `scheduled-pull-{userId}` task (deterministic name per ADR 0006)
- [ ] `registerScheduledPull(userId, time)` + `deregisterScheduledPull(userId)` server ops
- [ ] Dashboard pull-time setting updates the Trigger.dev schedule
- [ ] Inactivity detection (N days no activity) → deregister
- [ ] **Decide email provider** (default: Resend); wire transactional sending
- [ ] EOD email template (Markdown → HTML); plaintext fallback
- [ ] Post-pull hook: send EOD email if enabled
- [ ] Email preferences in settings (on/off, address override)

## Phase 5 — Free-tier launch readiness
**Goal:** Ship to real users.

- [ ] 7-day history cap enforced in all Digest queries
- [ ] Cross-Pull dedup verified (no double-counting across Pull windows)
- [ ] Trigger.dev retry/backoff verified for transient GitHub failures
- [ ] OAuth token refresh path tested for GitHub Connections
- [ ] Error tracking wired into server + web (default: Sentry)
- [ ] Privacy policy + Terms of Service pages
- [ ] Marketing/landing page
- [ ] Production env: Vercel prod, Neon prod branch, Trigger.dev prod
- [ ] Beta access flow (invite codes or allowlist)
- [ ] Welcome email + "connect GitHub" nudge

— 🚀 **Free-only MVP ships here** —

## Phase 6 — Billing + plan gating
**Goal:** Pro tier becomes purchasable; Free vs Pro enforced everywhere.

- [ ] Polar checkout flow from dashboard (init done in Phase 1)
- [ ] Webhook handler: subscription created/updated/canceled → mutate `User.plan`
- [ ] `requirePro()` Elysia route guard
- [ ] Audit every route + Trigger.dev task; mark Free or Pro
- [ ] Upgrade nudges in dashboard for gated features
- [ ] Plan downgrade behavior: keep history, block Pro-only re-pulls

## Phase 7 — Pro features
**Goal:** Pro tier feels worth paying for.

- [ ] Linear OAuth Connection flow + Linear project Scope picker
- [ ] Linear Activity fetcher in `manual-pull` and `scheduled-pull`
- [ ] Linear signal filtering per `CONTEXT.md`
- [ ] Brag Doc generation endpoint: compose from EOD Digests in a time range
- [ ] Brag Doc dashboard view with date-range picker
- [ ] Regenerate-with-instructions: endpoint + UI (uses stored ActivitySummary)
- [ ] Surface `original / edited / regenerated` state honestly in UI
- [ ] Brag Doc email delivery (Pro only)
- [ ] `wlog brag --since 30d [--export]` (extends Phase 2 CLI)
- [ ] `wlog projects` (list/add/remove) — Linear Scope mgmt
- [ ] Homebrew release: `bun build --compile` → `wlog-macos-arm64` + `wlog-macos-x64`
- [ ] Release workflow: tag → cross-compile → attach binaries → update `homebrew-wlog` formula SHA256
- [ ] `homebrew-wlog` tap repo created with formula
- [ ] Install docs: `brew tap …/wlog && brew install wlog`

## Phase 8 — Public launch
**Goal:** Doors open.

- [ ] Onboarding email sequence (day 0 / 3 / 7)
- [ ] Product analytics (PostHog or similar) on key funnel events
- [ ] Rate limit + abuse protection on signup + Manual Pull
- [ ] Performance pass: dashboard cold load, Pull p95 duration
- [ ] Uptime / status monitor
- [ ] Launch posts (Show HN / Product Hunt / personal channels)

---

## Decisions still open
These surfaced during planning and need ADRs (or amendments) before the phase they gate:

- **ADR 0007 — Stack revision.** Elysia + Vercel deploy + Eden Treaty for client typing. Supersedes parts of ADR 0004 (drops separate API server, drops tRPC, defers web framework). Needed before Phase 0 work begins.
- ~~**ADR 0008 — Connection Scope.**~~ Written and accepted.
- ~~**ADR 0009 — LLM provider.**~~ Written and accepted (Google Gemini 2.5-flash, Vercel AI SDK).
- **ADR 0003 amendment.** Add `wlog repos` and `wlog projects` commands to the CLI surface. Needed before Phase 7.
- ~~**Web framework pick.**~~ Settled: TanStack Start, SPA mode. Decide at start of Phase 3.
- **Email provider** (Resend vs Postmark vs Loops) — decide at start of Phase 4.
- **Error tracking tool** — decide at start of Phase 5.
