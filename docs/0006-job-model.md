# ADR 0006: Job Model (Trigger.dev)

## Status
Accepted

## Context
wlog needs reliable server-side execution of Scheduled and Manual Pulls for every User, independent of whether they are online.

## Decision
All Pull execution is handled by **Trigger.dev** background tasks.

### Scheduled Pull
- Registered as a Trigger.dev scheduled task with a per-User cron expression (e.g. `0 8 * * *` for 8:00am).
- Task name is deterministic: `scheduled-pull-{userId}` — idempotent registration, re-registering overwrites the existing schedule.
- Registered or updated when the User sets or changes their Pull time.
- Deregistered when the User disconnects all Integrations or becomes inactive.

### Manual Pull
- A separate one-off Trigger.dev task (`manual-pull`) triggered on demand via the API.
- No scheduling involved — fires immediately when called.

### API operations
Three job-related operations on the API:
- `registerScheduledPull(userId, time)` — register or update a User's scheduled task
- `deregisterScheduledPull(userId)` — remove a User's scheduled task
- `triggerManualPull(userId)` — fire a one-off Pull immediately

### Pull execution flow
1. Trigger.dev fires the task for a User
2. Task fetches the User's active Connections from the database
3. For each Connection, fetch raw Activity from the Integration API using the stored OAuth token
4. Build ActivitySummary (filter, deduplicate, structure)
5. If ActivitySummary is non-empty, call LLM to generate Standup and EOD Digests
6. Store Digests in the database
7. If email delivery is enabled, send via transactional email provider
8. Update last Pull timestamp on the User record

## Consequences
- Pull time is stored per-User in the database and kept in sync with the Trigger.dev schedule.
- If a Pull fails, Trigger.dev handles retries with backoff — the User sees "sync pending" status until resolved.
- The `triggerManualPull` API endpoint is Pro-only gated (CLI access).
