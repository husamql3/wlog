# Repository Guidelines

## Project Structure & Module Organization

This is a Bun + Turborepo monorepo. Runtime apps live in `apps/`: `apps/server` is the Elysia HTTP backend, `apps/web` is the TanStack Start web app, and `apps/tui` is the terminal UI. Shared packages live in `packages/`: `auth`, `db`, `env`, `ui`, and `config`. Package names should use the `@wlog/*` scope, for example `@wlog/server` and `@wlog/web`.

Source code is under each package's `src/`. Tests sit beside source as `*.test.ts` or `*.test.tsx`. Web static assets live in `apps/web/public`; shared UI components live in `packages/ui/src/components`.

## Build, Test, and Development Commands

Use Bun from the repository root.

- `bun install --frozen-lockfile` verifies dependencies match `bun.lock`.
- `bun dev` runs all persistent dev tasks through Turbo.
- `bun dev:server`, `bun dev:web`, `bun dev:tui` run one app by scoped filter.
- `bun build` runs `turbo build`.
- `bun test` runs package tests through Turbo.
- `bun check-types` runs TypeScript checks through Turbo.
- `bun check` runs Biome with safe writes.
- `bun run vercel:dev` starts local Vercel dev with `packages/env/.env`.

For focused work, prefer scoped filters such as `bun --filter @wlog/server test` or `bun --filter @wlog/web build`.

## Coding Style & Naming Conventions

Biome is the default formatter and linter. It uses tabs and double quotes. Keep imports organized and avoid parameter reassignment. TypeScript package and app names must be scoped as `@wlog/<name>`. Prefer existing shared modules over duplication, especially `@wlog/env` for configuration and `@wlog/ui` for reusable components.

## Testing Guidelines

Backend and shared packages use Bun test. The web app uses Vitest. Add tests next to the code they cover using `*.test.ts` or `*.test.tsx`. Keep tests focused on observable behavior; add at least a sanity or regression test when changing package wiring, env validation, routing, or shared exports.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries, for example `fix server deployments bug` or `Enhance server and package configurations`. Keep commits focused and mention the affected area when useful.

Pull requests should include a concise description, linked issue or roadmap item when applicable, test results, and screenshots for UI changes. Call out env, migration, deployment, or package-name changes explicitly.

## Security & Configuration

Do not commit real secrets. Local env values belong in `packages/env/.env`, using `packages/env/.env.example` as the template. Production env vars are managed in Vercel. Avoid changes that trace `.env` files into deploy output.
