# ADR 0009: LLM Provider

## Status
Accepted

## Context
Phase 1 requires an LLM call to generate two Digest types (Standup and EOD) from a structured ActivitySummary. We need to pin a provider, model, and SDK before writing the generation code.

## Decision
**Provider:** Google Gemini
**Model:** `gemini-2.5-flash`
**SDK:** Vercel AI SDK (`ai` package with `@ai-sdk/google` provider)
**Call shape:** Single `generateObject` call per Pull, returning `{ standup: string, eod: string }` validated by a Zod schema.

The ActivitySummary is serialised to JSON and injected into the user prompt. A system prompt defines the wlog persona, output constraints (Standup: short, present-tense, verbal delivery; EOD: longer, written, reflective), and signal prioritisation per `CONTEXT.md`.

API key is stored in `GEMINI_API_KEY`.

## Alternatives considered
- **gemini-2.5-pro**: Rejected for Phase 1. Standup and EOD generation does not require pro-level reasoning; the cost and latency premium is not justified.
- **Anthropic Claude**: The original default in the roadmap. Replaced by Gemini at project owner's direction.
- **Two separate LLM calls (one per Digest type)**: Rejected. Both types derive from the same ActivitySummary; a single call with structured output halves token cost and latency with no quality loss.
- **Google's own SDK (`@google/generative-ai`)**: Rejected. Vercel AI SDK keeps the provider swappable (relevant for Phase 6 Pro features or future fallback strategy) and is already part of the deployment stack.

## Consequences
- `generateObject` returns a typed, Zod-validated object — no JSON parsing required.
- Swapping to a different model or provider requires only changing the provider import and model string; the call site is unchanged.
- No fallback provider is configured for Phase 1. If Gemini is unavailable, the Pull task fails and Trigger.dev retries. A fallback strategy can be added in Phase 4 alongside error tracking.
- ActivitySummary must be serialisable to JSON before the LLM call — the schema design must avoid circular references.
