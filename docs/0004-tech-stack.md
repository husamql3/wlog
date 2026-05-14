# ADR 0004: Tech Stack

## Status
Accepted

## Context
wlog needs a consistent, maintainable stack across three packages: backend API, web dashboard, and CLI. The CLI must be distributable via Homebrew as a self-contained binary.

## Decision

### Monorepo structure
A single GitHub repository managed with **Turborepo** and **Bun workspaces**.

```
wlog/
├── packages/
│   ├── api/          ← Backend API server, Prisma schema + migrations
│   ├── web/          ← Dashboard (web UI)
│   ├── cli/          ← Terminal client
│   └── types/        ← Shared TypeScript types (Digest, Connection, Plan, etc.)
├── turbo.json
└── package.json
```

### Database
**Neon Postgres** — one project, one database. **Prisma** as the ORM. Schema and migrations live in `packages/api`. Trigger.dev workers import the Prisma client from `packages/api`.

### Job queue
**Trigger.dev** — runs Scheduled Pulls and Manual Pulls as background jobs. Each Pull is a Trigger.dev task. Scheduled Pulls are registered per-User at their configured time.

### Auth
**Better Auth** — handles User signup, login, and session management for the wlog product itself. Separate from OAuth Connections to GitHub and Linear, which are managed independently per Integration.

### Language
**TypeScript throughout** — backend, dashboard, and CLI share the same language and import from `packages/types`.

### Runtime
**Bun** — used as the runtime, package manager, and test runner across all packages.

### CLI distribution
The CLI is compiled to a self-contained binary using `bun build --compile`. Two binaries are produced per release:
- `wlog-macos-arm64` (Apple Silicon)
- `wlog-macos-x64` (Intel)

Binaries are attached to GitHub releases. A Homebrew tap (`homebrew-wlog`) hosts the formula that fetches the correct binary for the User's architecture.

### Shared types
`packages/types` exports the canonical TypeScript interfaces for all domain concepts: `Digest`, `Connection`, `Plan`, `Activity`, `ActivitySummary`, `Pull`. Both `api` and `cli` import from here — no type drift between server responses and CLI parsing.

## Alternatives considered
- **Go or Rust for CLI**: Rejected. TypeScript monorepo means shared types and a single language. Bun compile produces an equally clean binary.
- **Separate repos**: Rejected. Shared types between API and CLI are a first-class concern. Monorepo keeps them in sync without a publishing step.
- **npm global install for CLI**: Rejected. Requires Node/npm on User's machine. Bun compile produces a self-contained binary with no runtime dependency.

## Consequences
- `packages/types` must be the single source of truth for all domain interfaces. No inline type definitions in `api` or `cli` for shared concepts.
- CI must build and cross-compile CLI binaries for both architectures on every release tag.
- The Homebrew formula SHA256 checksums must be updated on every release — this should be automated in CI.
