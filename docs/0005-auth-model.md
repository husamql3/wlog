# ADR 0005: Authentication Model

## Status
Accepted

## Context
wlog has two distinct authentication concerns that must not be conflated: logging into wlog itself, and authorizing access to external Integrations (GitHub, Linear).

## Decision

### wlog Auth — Better Auth
User signup and login to wlog is handled entirely by **Better Auth**. Supports email/password and optional social login providers. Issues a wlog session cookie. Better Auth has no knowledge of GitHub or Linear OAuth.

### Integration OAuth — Connections
Connecting GitHub or Linear is a separate, explicit OAuth flow initiated from the dashboard after the User is already logged into wlog. The resulting OAuth token is stored server-side in the `Connection` table, scoped to the User and Integration. This is an authorization step, not a login.

### Separation of concerns
| Concern | Owner |
|---|---|
| wlog session (who you are) | Better Auth |
| GitHub access token | Connection table (Prisma) |
| Linear access token | Connection table (Prisma) |

The two flows never share tokens or state. A User can have a valid wlog session with zero Connections, or disconnect an Integration without affecting their wlog session.

## Alternatives considered
- **Sign in with GitHub as wlog auth (Option C)**: Rejected. Conflating login with Integration setup creates coupling — revoking GitHub access would break wlog login. Keeping them separate is more robust and supports non-GitHub users.
- **Sign in with GitHub + separate Linear (Option B)**: Rejected for the same reason.

## Consequences
- The onboarding flow has two explicit steps: (1) create wlog account, (2) connect Integrations.
- Disconnecting an Integration never affects the User's wlog session.
- Better Auth manages password reset, session expiry, and account deletion independently of Integration state.
- The `Connection` table must store OAuth tokens securely, handle token refresh, and track Connection status per Integration per User.
