# ADR 0002: Freemium Feature Boundary

## Status
Accepted

## Context
wlog needs a monetisation model that lets users experience core value for free while creating meaningful upgrade incentives. LLM and infrastructure costs must be recoverable at scale.

## Decision
wlog operates on a freemium model with two tiers: **Free** and **Pro**.

| Feature | Free | Pro |
|---|---|---|
| Integrations | GitHub only | GitHub + Linear |
| Digest types | Standup + EOD | Standup + EOD + Brag Doc |
| History | 7 days | Unlimited |
| Manual Pull | ✅ | ✅ |
| Scheduled Pull | ✅ | ✅ |
| Direct editing | ✅ | ✅ |
| Regenerate with instructions | ❌ | ✅ |
| CLI access | ❌ | ✅ |
| Markdown export (CLI) | ❌ | ✅ |
| Email delivery | EOD only | EOD + Brag Doc |

## Rationale
- Free tier delivers the daily habit (Standup + EOD) — enough value to build trust.
- Pro tier delivers career tools (Brag Doc, regeneration, CLI) — enough differentiation to justify payment.
- Linear is Pro-only: it signals a power user already invested in structured workflow tooling.
- Regenerate with instructions is Pro-only: it's an LLM call with non-trivial cost and a power-user feature.
- 7-day history cap on Free limits storage costs and makes the "unlimited history" Pro benefit tangible.

## Alternatives considered
- **Paid only**: Rejected. Too much friction for a new product with no brand recognition.
- **Fully free**: Rejected. LLM costs per user are non-trivial; unsustainable without revenue.

## Consequences
- Every feature must be gated behind a plan check. A `Plan` concept (Free vs Pro) must be a first-class attribute of the User.
- The 7-day history cap must be enforced at both the query layer (dashboard display) and the Brag Doc generation layer (which composes from EODs).
- CLI authentication must verify Pro plan before allowing access.
