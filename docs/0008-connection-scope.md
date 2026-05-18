# ADR 0008: Connection Scope

## Status
Accepted

## Context
A User connects an Integration (GitHub) via OAuth and may have access to many repos. Pulling activity from all of them would be noisy and wasteful. We need a model for how a User selects which repos to track.

## Decision
Each Connection has a Scope: an explicit, per-repo opt-in list. No repos are selected by default — a User with a connected GitHub account but no Scope produces no Activity on a Pull.

Scope is stored as a `ConnectionScope` join table: one row per (Connection, repo). Repo identity is stored as `externalId` (GitHub repo ID) + `repoFullName` (owner/repo) for display.

The User selects repos via `POST /integrations/github/scope`, which replaces the current Scope atomically (delete existing + insert new in one transaction).

GitHub OAuth is requested with the `repo` scope to support private repos. wlog only reads activity — it never writes to repos.

## Alternatives considered
- **Opt-out (track everything, let users exclude)**: Rejected. Engineers often have access to dozens of repos. Opt-out creates noise on first use and requires active configuration to silence unwanted signals.
- **Single repo per Connection**: Rejected. Engineers commonly work across multiple repos per day; a single-repo model would force multiple Connections for the same GitHub account.
- **Store scope as a JSON array on Connection**: Rejected. A join table supports indexed queries (e.g. "which users have scoped this repo?") and clean foreign-key constraints.

## Consequences
- A User must complete the scope-selection step before a Pull produces any Activity. The onboarding flow must make this explicit.
- `POST /integrations/github/scope` is idempotent: callers always send the full desired set, never a diff.
- Deleting a Connection cascades to its ConnectionScope rows and all Activity fetched under that Connection.
- Phase 6 (Linear) follows the same pattern: one Connection per Integration, one Scope table for project selection.
