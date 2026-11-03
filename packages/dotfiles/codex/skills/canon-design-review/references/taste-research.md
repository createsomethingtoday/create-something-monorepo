# TASTE Research Protocol

TASTE is CREATE SOMETHING's existing human-curated reference library, fed by Are.na. Use it first for substantial frontend work. Canon, Performance Lab, the owning product, accessibility, and policy remain the implementation authorities.

## Retrieve A Bounded Packet

1. State the user, task, surface mode, meaningful states, and unresolved design decision. Sketch an initial approach from the domain before browsing references.
2. Review the relevant house contract and `/llm.txt` vocabulary. Plain `https://createsomething.ltd/llm.txt` is predefined principles and token context; it is not a packet of inspected visual examples.
3. Request reference data explicitly, for example:
   `https://createsomething.ltd/api/taste/context?intent=layout&include=references&limit=7`.
   Supported intents are `color`, `typography`, `spacing`, `motion`, `layout`, `minimalism`, and `brutalism`. Use `https://createsomething.ltd/taste` or the source channels when direct visual browsing is more useful. Check current retrieval behavior and source attribution rather than assuming an intent label proves relevance.
4. Select 3–7 relevant approved references when available. Do not pad the packet with unrelated results to reach the range. Preserve the actual block/source URL and channel attribution; mark unknown provenance explicitly.
5. Open and inspect the actual images linked by `imageUrl` using the available image or browser tools. For motion claims, inspect playable motion or an adequate sequence, not a thumbnail alone. Metadata summaries and channel-derived descriptions do not establish what an image shows. If media cannot be inspected, record it as unverified and do not make visual claims from it.

Keep the packet small enough to compare deliberately. Prefer approved material already in TASTE or human-curated source channels. Newly discovered references remain proposals until a person accepts them into the curation workflow.

## Translate Into A Design Decision

Record the useful observation and its limitation for each reference:

| Reference | Why it helps this task | Adopt or adapt | Avoid or do not copy | Source |
| --- | --- | --- | --- | --- |
| Inspected reference | Specific hierarchy, proportion, rhythm, disclosure, or state lesson | CREATE SOMETHING translation | Product-specific treatment or tradeoff | TASTE/Are.na/source URL |

Conclude with `adopt`, `adapt`, `test`, or `reject`, and name the downstream change. A source can teach composition without serving as evidence for an interaction it does not show. Keep reference media as research inputs; do not copy third-party images, layouts, copy, fonts, assets, marks, or trade dress into the implementation.

If the packet leaves a material interaction question unresolved, choose additional evidence that addresses it: permitted direct product inspection, user research, analytics, prototypes, or optional Mobbin research using [mobbin-research.md](./mobbin-research.md). For consequential choices, compare an independently derived alternative or an outside-corpus reference. The library is evidence, not a ceiling on the product's capabilities.

## Validate The Result

Review the rendered Canon implementation against the packet and the initial task. Check hierarchy, brand fit, responsive composition, keyboard access, reduced motion, and the relevant loading, empty, error, approval, recovery, and completed states. Record what improved and any unresolved tradeoff. Corpus size, token compliance, and successful retrieval alone do not establish taste or usability.

## Access And Curation Boundaries

Read `docs/guides/ARENA_TASTE_INTEGRATION.md` when diagnosing access, refresh, or subscription needs. Existing TASTE/D1 content can remain useful even when external discovery is unavailable. A stale creation date, empty result, or provider error does not establish that a subscription expired.

Curate in Are.na directly; preserve paused public write-back and OAuth routes. Sync imports into D1 and is a write operation even when triggered by GET. Do not call sync as a read-only health check. Diagnose with read-only channel/context requests first. Skill use does not authorize purchasing, renewing, cancelling, publishing, or changing account permissions.
