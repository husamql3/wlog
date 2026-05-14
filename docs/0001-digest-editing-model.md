# ADR 0001: Digest Editing Model

## Status
Accepted

## Context
After a Digest is generated, Users need to be able to correct or improve it before use. Two distinct needs exist: small wording fixes (fast, in-place) and structural changes (requires LLM involvement).

## Decision
Digests support two editing paths:

1. **Direct editing**: The User edits the Digest text in the dashboard. The edited version is saved as the canonical version and marked as edited.
2. **Instruction-guided regeneration**: The User provides a natural language instruction (e.g. "focus more on the auth refactor") and the LLM regenerates the Digest using the original ActivitySummary plus the instruction. The regenerated version replaces the previous one.

## Alternatives considered
- **Read-only Digests**: Rejected. LLM output is imperfect; Users need correction paths or they stop trusting the tool.
- **Instruction-guided regeneration only**: Rejected. For small wording fixes, forcing a full LLM regeneration is slow and wasteful.

## Consequences
- The data model must track whether a Digest is in its original generated state, edited, or regenerated — to surface this honestly in the UI.
- Regeneration requires storing the original ActivitySummary alongside the Digest so it can be reused as LLM input.
- The Brag Doc, which is composed from EOD Digests, will reflect whatever edited/regenerated versions the User has saved — which is the correct behaviour.
