# ADR 0007: Stack Revision

## Status
Accepted

## Context
ADR 0004 fixed the high-level stack (Bun, Turborepo, Neon, Prisma, Trigger.dev, Better Auth) but predates concrete scaffolding choices. When the repo was bootstrapped with better-t-stack, several details landed differently from ADR 0004's wording, and additional decisions were needed before Phase 0 implementation could start (deployment target, HTTP framework, client typing, package layout). This ADR records those decisions and supersedes the relevant parts of ADR 0004.

## Decision

### HTTP framework: Elysia
The backend uses **Elysia** on Bun, not a generic Node HTTP framework. Elysia is Bun-native, gives end-to-end typed routes, and is the foundation for Eden Treaty (client typing).

### Client typing: Eden Treaty
Server-to-client type sharing is done via **Eden Treaty** exported from the server package, not tRPC. This removes a dependency layer and is the canonical Elysia pattern.

Eden Treaty supplies request/response types directly. `packages/types` from ADR 0004 is **deferred** — domain types that don't flow through the API can live alongside their owners (server, Prisma schema) until a real cross-package consumer needs them. Revisit if drift appears.

### Repo layout: `apps/` + `packages/`
The flat `packages/` layout from ADR 0004 is replaced by:

```
wlog/
├── apps/
│   ├── server/       ← Elysia HTTP server + Trigger.dev tasks
│   ├── web/          ← TanStack Router + Vite dashboard
│   └── tui/          ← experimental terminal UI (out of roadmap; retained)
└── packages/
    ├── auth/         ← Better Auth factory
    ├── config/       ← shared tsconfig base
    ├── env/          ← single env schema (server + client) + dev .env
    └── ui/           ← shadcn-style component library
```

Rationale: deployable units (Vercel projects) live in `apps/`; reusable libraries live in `packages/`. The distinction maps directly to deploy targets and avoids the "is this a publishable lib or an app" ambiguity ADR 0004 left open.

### Prisma's home: deferred to `apps/server`
ADR 0004 placed Prisma in `packages/api`. Updated: Prisma schema, client, and migrations live in `apps/server` when introduced in Phase 1. No `packages/db` for now.

Reasons: Trigger.dev tasks already live in `apps/server/src/trigger/` and need the same DB client; splitting Prisma into a sibling package adds friction without benefit at this scale. Promote to a package if a second consumer (e.g. the CLI) ever needs direct DB access — but the CLI per ADR 0003 goes through the API, so this is unlikely.

### Environment: single schema, centralised dev file
One `packages/env` package owns all env validation. Schema is a single t3-env definition with both `server` and `client` (`VITE_*`) sections; runtime source is `import.meta.env` in the browser and `process.env` on the server, picked at module load. Dev values live in **one** `packages/env/.env`; both apps load it (server via Bun's `--env-file` flag, web via Vite's `envDir`).

### Deployment: Vercel for both apps, two projects
- `apps/server` → Vercel project with `@vercel/bun` runtime. Elysia is exposed as a single catch-all Vercel Function under `api/[...path].ts`, with `vercel.json` rewriting all paths through it.
- `apps/web` → Vercel project, Vite build, standard static + SPA serving.
- Trigger.dev tasks remain on Trigger.dev's own infra (`runtime: "bun"` already in `trigger.config.ts`); Vercel only runs the HTTP layer.

Two Vercel projects in the same repo with `Root Directory` pinned to `apps/server` and `apps/web`. Standard Turborepo-on-Vercel pattern.

### Elysia entrypoint shape
- `apps/server/src/app.ts` — Elysia instance, all routes, no `.listen()`. The thing both dev and prod import.
- `apps/server/src/dev.ts` — calls `app.listen(3000)` for local development.
- `apps/server/api/[...path].ts` — Vercel Function entrypoint; strips the `/api` prefix and delegates to `app.handle(req)`.
- `apps/server/vercel.json` — pins the Bun runtime and rewrites every request to `/api/$1`.

## Alternatives considered

- **tRPC instead of Eden Treaty**: Rejected. Eden Treaty is native to Elysia, has zero runtime overhead, and removes an entire dependency tree. tRPC would only earn its keep if we picked a non-Elysia backend.
- **`packages/db` from day one**: Rejected for now. Single consumer (`apps/server`), and a second consumer is unlikely given the CLI architecture. The promotion path is open.
- **Vercel + Node-compat for Elysia**: Available as the fallback if `@vercel/bun` becomes unworkable, but rejected as the default — losing Bun runtime perf on day one contradicts the stack's central choice.
- **Bun-native host (Fly.io / Railway) for the server**: Considered for first-class Bun support. Rejected to keep both apps on one provider (one billing surface, one preview-deploy story, one env dashboard) until measured cold-start data justifies splitting.
- **Two env files (one per app) with shared schema**: Rejected. Centralising the dev `.env` removes duplication and prevents drift; Bun's `--env-file` and Vite's `envDir` make it ergonomic.

## Consequences

- **`packages/types` is deleted from the plan** until proven necessary. Eden Treaty provides the only cross-package typing currently needed.
- **`@vercel/bun` is experimental.** If it regresses, the documented escape hatch is `@vercel/node` running Elysia's fetch handler under Node-compat — code changes are minimal, perf is the only cost.
- **Prisma engine binary targets** must include the Linux build that `@vercel/bun` ships on (`linux-musl-openssl-3.0.x` or equivalent) when Prisma is introduced in Phase 1.
- **One `.env` file** means anyone running `bun dev:server` or `bun dev:web` needs `packages/env/.env` present. `.env.example` is committed; the real file is created locally.
- **`apps/tui` is unscheduled.** It exists but isn't on the roadmap. Treat as experimental; don't block CI on it failing.
- **ADR 0004 supersession**: the package layout (`packages/api`, `packages/types`), the Prisma location, and the absence of any deployment-target detail are replaced by this ADR. The rest of ADR 0004 (Bun runtime, Turborepo, Neon + Prisma, Trigger.dev, Better Auth, Bun-compiled CLI, Homebrew distribution) stands.
