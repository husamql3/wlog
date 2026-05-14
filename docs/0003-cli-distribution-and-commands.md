# ADR 0003: CLI Distribution and Command Surface

## Status
Accepted

## Context
wlog needs a terminal interface for power users. The CLI must be easy to install, feel native on macOS, and map cleanly to the domain concepts already defined.

## Decision
The wlog CLI is distributed as a **Homebrew formula** and installed as a native `wlog` command on the User's machine.

The v1 command surface is exactly:

| Command | Description |
|---|---|
| `wlog login` | Authenticate with the wlog backend |
| `wlog status` | Show Connection status for each Integration and last Pull time |
| `wlog sync` | Trigger a Manual Pull |
| `wlog today` | Print today's Standup Digest to the terminal |
| `wlog eod` | Print today's EOD Digest |
| `wlog brag --since 30d` | Generate and print a Brag Doc for the chosen time range |
| `wlog history` | List past Digest entries (last 30 days by default) |
| `wlog history --date 2026-05-13` | Print Standup + EOD for a specific date |
| `wlog history --date 2026-05-13 --type eod` | Print a specific Digest type for a date |
| `wlog history --type brag` | List all Brag Docs |

Export flags available on relevant commands (Pro only):

| Flag | Description |
|---|---|
| `wlog eod --export` | Save EOD as `eod-YYYY-MM-DD.md` in current directory |
| `wlog today --export` | Save Standup as `standup-YYYY-MM-DD.md` |
| `wlog brag --since 30d --export` | Save Brag Doc as `brag-YYYY-MM-DD-to-YYYY-MM-DD.md` |

## Rationale
- Homebrew is the de-facto package manager for macOS developers — the primary wlog audience.
- Six commands map 1:1 to domain concepts (Pull, Digest subtypes, Connection status). No extraneous surface.
- The CLI is a pure client — it calls the wlog backend API. It does not pull from Integrations directly.
- CLI access is Pro-only (see ADR 0002).

## Alternatives considered
- **npm global install**: Rejected. Requires Node.js on the User's machine; adds friction for non-JS engineers.
- **Shell script install**: Rejected. Less discoverable, harder to version and update than a Homebrew formula.

## Consequences
- A Homebrew tap (`homebrew-wlog` or similar) must be maintained alongside the main codebase.
- The CLI binary must be cross-compiled for Apple Silicon and Intel Macs.
- `wlog login` must handle the OAuth token exchange and store credentials securely in the macOS keychain or equivalent.
