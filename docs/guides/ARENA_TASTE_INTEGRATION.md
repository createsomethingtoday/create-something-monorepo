# Are.na Taste Integration Runbook

Are.na is the human curation surface for CREATE SOMETHING taste references. The
business value is not bulk collection. The value is a human-selected corpus that
can be reused as agent context, client proof, and design judgment evidence.

## Tier Mapping

| Tier | Role |
| --- | --- |
| Database | Are.na channels, synced D1 examples/resources, cached image/reference metadata |
| Automation | Read-only sync into `.ltd`, `llm.txt`, taste context APIs, proposal-only discovery logs |
| Judgment | Human channel curation, design standards, client taste packets, agent design context |

## Production Posture

- Keep `/taste`, `/llm.txt`, and read/sync flows active.
- Curate new references directly in Are.na.
- Do not expose public write-back from `.ltd` to Are.na.
- Do not store Are.na OAuth tokens through the public app.
- Treat programmatic discovery as proposals only. Humans decide what enters a
  channel before sync imports it.

The paused write surfaces are:

- `POST /api/arena/blocks`
- `POST /api/arena/connect`
- `PUT /api/arena/channels`
- `GET /api/arena/authorize`
- `GET /api/arena/callback`

## 30-Day Subscription Gate

Keep the paid Are.na subscription for one cycle only if it creates one of these
business outcomes:

- A paid client audit or design-context deliverable.
- A sales/demo artifact that improves a CREATE SOMETHING offer.
- A reusable taste pack that measurably improves agent output.

If none of those happen in the review window, export/freeze the current corpus
into repo/D1, cancel the paid plan, and keep Are.na as optional manual research
instead of a recurring operating dependency.

## Offer Paths

Use the corpus to produce sellable artifacts:

- Client design-context packets.
- Taste pattern audits.
- Agent-readable brand/design standards.
- Image-language foundation packets for generated, designed, and rendered assets.
- Before/after reference boards for `.agency` sales.
- Project-specific `llm.txt` or MCP resources for client agents.

## Image Language Foundation Loop

Use TASTE as the judgment layer for CREATE SOMETHING image generation. The
canonical image-language foundation lives in
`docs/IMAGE_LANGUAGE_FOUNDATION.md`.

For production image work:

1. Pull a small TASTE packet from approved references.
2. State what each reference contributes and what must not be copied.
3. Attach the TASTE packet to the image prompt or asset metadata.
4. Generate or edit only after the proof requirement is clear.
5. Review the result against the TASTE packet, Canon image guideline, and
   operational proof requirement.
6. Feed approved patterns back into `/llm.txt`, `/api/taste/context`, and the
   relevant asset template or guide.

TASTE references are judgment inputs, not source assets. Do not copy third-party
images, fonts, brand marks, page layouts, campaign language, or generated CSS.

## Performance Lab Taste Loop

TASTE should continuously improve CREATE SOMETHING implementation against the
Performance Lab standard.

Use approved public references as pattern inputs, then translate the useful
qualities into owned Canon primitives and CREATE SOMETHING language. Do not copy
generated CSS, font files, images, source assets, campaign language, or identity
from any reference.

The recurring loop is:

1. Observe the current Performance Lab gap: literal offer, short outcome
   sentence, direct actions, compact navigation, nearby proof, readiness state,
   and visible governance.
2. Compare CREATE SOMETHING pages, product surfaces, and agent outputs against
   that standard.
3. Convert gaps into Canon-level improvements: clearer page hierarchy, lighter
   operational surfaces, stable spacing, visible proof artifacts, and direct
   language.
4. Present the human-in-the-loop decision surface as agent-first and
   mobile-first. The agent should carry context, evidence, and proposed next
   moves; the operator should be able to approve, reject, redirect, or request
   evidence from a phone.
5. Ship only reviewed corrections through normal checks and promotion gates.
6. Feed the updated standard back into `/llm.txt`, `/api/taste/context`, and the
   relevant page or delivery runbook.

The Are.na integration can also find Performance Lab taste candidates inside the
wider feed. Use `ArenaClient.searchBlocks()` or the proposal-only curator worker with
queries such as `background agents interface`, `minimal developer tool
interface`, `mission control software agents`, `clear product UI`, and `agent
workflow proof`.

The operator-facing lane is:

- `GET /api/taste/ona-candidates`
- `GET /api/taste/ona-candidates?q=background%20agents%20interface&limit=12`

It returns scored, mobile-sized decision cards with `approve`, `reject`,
`redirect`, and `need_evidence` actions. The endpoint is read-only and
proposal-only; it never writes to Are.na, D1, `/taste`, `/llm.txt`, or
`/api/taste/context`. If Are.na global block search is blocked, the endpoint
falls back to the managed CREATE SOMETHING channels and marks the response
`status: "fallback"`.

Score candidates for:

- literal offer language
- light operational surfaces
- compact navigation or task lists
- visible proof objects, receipts, metrics, or system boundaries
- direct calls to action
- restrained motion and limited color

Reject candidates for:

- decorative gradients, spectacle, or abstract mood boards
- unclear audience or outcome
- heavy marketing language without operational proof
- copied source assets, generated CSS, font files, or brand marks

Discovery remains proposal-only. A human decides what belongs in Are.na before
sync imports it into D1 and exposes it through `/taste`, `/llm.txt`, or
`/api/taste/context`.

This is not complete self-healing yet. The system can refresh references and
expose context, but implementation changes remain operator-gated until a drift
report and approved write-back workflow exist.

## Validation

Before production promotion:

1. Confirm `/taste` renders without a public contribution control.
2. Confirm paused write routes return HTTP 410.
3. Confirm `/llm.txt` still returns taste context.
4. Confirm `/api/arena/sync?channel=canon-minimalism` still syncs without
   Are.na write access.
5. Confirm `/api/taste/ona-candidates` returns `mode: "proposal-only"` and a
   no-write policy, even when Are.na search degrades.
