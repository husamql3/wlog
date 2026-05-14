# wlog — Domain Glossary

## Terms

### wlog
A hosted SaaS product that watches a user's engineering activity across integrations (commits, PRs, tickets) and generates daily summaries for standups, EODs, and brag docs. Accessed via a web dashboard or CLI client.

### User
A single authenticated person who has signed up for wlog, connected their integrations, and receives their own activity digests. wlog is not a team product — each User sees only their own activity. Every User has a Plan (Free or Pro) that determines which features they can access.

### Plan
The subscription tier of a User. Either **Free** or **Pro**. Plan is a first-class attribute of the User and gates access to integrations, Digest types, history depth, and CLI access. See ADR 0002 for the full feature boundary.

### Integration
An external service that wlog pulls Activity from on the User's behalf. Credentials are stored server-side as OAuth tokens. The server — not the User's machine — performs all Pulls.

**V1 integrations**: GitHub (commits, PRs) and Linear (issues, status transitions). Jira, GitLab, and others are explicitly out of scope for v1.

### Connection
A User's authenticated link to a specific Integration, established via OAuth. A User has one Connection per Integration. The Connection stores the OAuth token server-side and the User's identity within that Integration (e.g. their GitHub username, Jira account ID). A Pull for a User only runs against their active Connections.

### Pull
The server-side operation that fetches raw Activity from a User's connected Integrations. A Pull is either Scheduled or Manual.

- **Scheduled Pull**: Runs daily at the User's configured time (e.g. 8:00am). Runs server-side regardless of whether the User is online. Users with no active Connections or inactive for N days have their Scheduled Pulls paused.
- **Manual Pull**: Triggered explicitly by the User from the dashboard or CLI at any time to fetch fresh Activity on demand.

The time window of a Pull always spans from the completion timestamp of the last successful Pull to the current time. This ensures no Activity is missed and no Activity is double-counted across Pulls.

Every successful Pull automatically triggers generation of a Standup and EOD Digest. Brag Doc generation is on-demand only.

### Activity
Raw data fetched from an Integration during a Pull. Examples: a commit, a PR open/merge/close event, a Jira ticket status change, a Linear issue update.

### ActivitySummary
A structured, deduplicated, and filtered representation of a User's raw Activity for a given time window, produced before LLM generation. The ActivitySummary is the direct input to the LLM when generating a Digest.

**GitHub signals kept**: commits pushed to a branch, PR opened/merged/closed, PR review submitted, commits to others' PRs, repository created.
**GitHub signals dropped**: PR comments, issue events (Linear owns tickets in v1), stars/forks/watches, dependency bump commits, and other low-signal noise.

**Linear signals kept**: issue assigned to User, issue status transitions (e.g. In Progress → Done), issue created by User, issue completed, issue cancelled, issue moved to a different cycle or project.
**Linear signals dropped**: comments, priority changes, label changes, sub-issue creation.

### Digest
The LLM-generated summary of a User's Activity over a time window. The core output of wlog. Has three subtypes with different generation triggers:

- **Standup** and **EOD**: Generated automatically after every successful Pull (Scheduled or Manual). Ready and waiting when the User opens the dashboard.
- **Brag Doc**: Generated on demand. The User explicitly requests it, choosing a time range (week, month, quarter).

If a Pull produces no Activity, no Digest is generated. The date simply has no entry in the dashboard timeline.

A Digest can be edited directly in the dashboard (for small wording fixes) or regenerated with User-provided instructions (for structural changes). An edited Digest is marked as edited; a regenerated Digest replaces the previous version.

### Standup
A Digest subtype. A short, present-tense summary of what the User worked on yesterday and is working on today. Optimised for verbal delivery in a team standup.

### EOD (End of Day)
A Digest subtype. A slightly longer written summary of what the User completed and left in-progress during a workday. Optimised for async team updates.

### Brag Doc
A Digest subtype. A cumulative, achievement-framed summary of the User's work over a longer period (week, month, quarter). Optimised for performance reviews and self-promotion. Generated on demand: the User chooses a time range and the LLM composes the Brag Doc from the existing EOD Digests within that range — no re-pulling or re-processing of raw Activity.

### Dashboard
The web UI of wlog, accessible at the product's domain after login. Displays the User's Digests, Integration status, and settings.

### CLI
A terminal client distributed as a Homebrew formula, installed on the User's machine as a native command (e.g. `wlog`). Authenticates against the wlog backend using the User's credentials. The CLI does not pull from Integrations directly — the server owns all Pulls. Provides power-user access to Digests, manual Pull triggering, and sync status. Pro plan only.

### OAuth Token
A per-user credential issued when a User connects an Integration via OAuth. Stored server-side and scoped to the User's own GitHub or Linear account. Each Pull consumes the User's personal API rate limit quota — not a shared wlog quota — because the token is tied to their account.

### Export
A way for the User to receive a Digest outside the dashboard. Two export types exist:

- **Markdown Export**: The CLI saves a Digest as a `.md` file to the current directory. Pro only. Available via `--export` flag on `wlog eod`, `wlog today`, and `wlog brag`.
- **Email Delivery**: wlog sends the Digest to the User's configured email address via a transactional email provider. Configured in dashboard settings. Fires automatically after each Pull. Free tier: EOD only. Pro tier: EOD + Brag Doc.
