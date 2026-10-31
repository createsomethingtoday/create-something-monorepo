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

## TASTE-First Frontend Research

For substantial Canon UI work, use the existing corpus before seeking additional
precedent. Follow the packet procedure in
[`taste-research.md`](../../packages/dotfiles/codex/skills/canon-design-review/references/taste-research.md):

- Start with the task, surface mode, meaningful states, and an initial approach.
- Retrieve 3–7 relevant approved references when available and inspect their
  actual images. Do not pad with unrelated material.
- Record why each reference helps, what to adopt or adapt, what to avoid, and its
  actual source/channel attribution. Mark unknown provenance and unviewed media.
- Translate the observations through Canon and Performance Lab, then assess the
  rendered result, including responsive and consequential states.
- Use Mobbin or other outside evidence for unresolved interaction questions.
  Missing corpus coverage must never remove a required product capability.

Plain `/llm.txt` supplies predefined vocabulary and tokens. It does not query and
visually inspect the full corpus on every request. Request JSON reference data
explicitly with `/api/taste/context?intent=layout&include=references&limit=7`.
Its returned metadata is a retrieval aid; inspect `imageUrl` media before making
visual claims, and inspect motion before claiming a motion pattern.

## Access Diagnosis Before Renewal

A paid subscription is not assumed to be required to use the existing synced
corpus. Check `/taste`, `/llm.txt`, and `/api/taste/context` with references first;
then make bounded read-only requests to the relevant public Are.na channels.
Record the exact status/error and which operation is unavailable. Check current
account/plan permissions only when the failing operation requires them.
Distinguish provider access failure, unsupported API behavior, missing local
provenance, and a sync failure from subscription expiry.

`/api/arena/sync` writes D1, including when invoked by GET. Do not use it as a
read-only health probe. A reference's creation date is not proof of the last
successful sync; rely on a recorded successful-sync checkpoint when available,
otherwise report freshness as unknown.

Renewal, cancellation, plan changes, and payment require the applicable explicit
user authorization. Diagnose access and present the concrete renewal need before
requesting a purchase decision; do not change account access or resume paused
write/OAuth surfaces merely to recover reference reads.

## 30-Day Subscription Gate

Keep the paid Are.na subscription for one cycle only if it creates one of these
business outcomes:

- A paid client audit or design-context deliverable.
- A sales/demo artifact that improves a CREATE SOMETHING offer.
- A reusable taste pack that measurably improves agent output.

If none of those happen in the review window, recommend exporting/freezing the
current corpus into repo/D1 and ending the paid plan. Obtain the applicable
authorization before export, cancellation, or other account changes. Existing
TASTE content can remain an input while Are.na becomes optional manual research.

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

Premium discovery uses the official Are.na v3 search API through
`searchPublicArenaBlocks()`. It retrieves one page per query and projects only
explicitly public Image, Link, Text, and Media references. Private blocks,
unknown visibility, user metadata, nested connections, and embed HTML are omitted.
Known-channel sync continues using its existing client; this migration changes
candidate discovery only.

The operator lane is `GET /api/taste/ona-candidates`, with optional repeated `q`
parameters (1–8 queries, at most 200 characters each), `limit` (1–24, default 12),
and `perQuery` (1–20, default 10). Each query makes one bounded, timed request;
there is no pagination, retry, or legacy channel fallback.

Configure the production Pages environment with:

- `ARENA_API_TOKEN`: a server-side read token for the Premium Are.na account.
- `TASTE_DISCOVERY_ALLOWED_EMAILS`: comma-separated exact operator email addresses.

Every request needs a current CREATE SOMETHING Identity token with exactly the
`ltd` audience, from the normal `cs_access_token` cookie or Bearer header. Only a
cryptographically verified identity whose email is verified and explicitly
allowed can invoke the paid provider. Missing configuration fails closed. Never
send the Are.na token as caller authentication. Responses use
`Cache-Control: private, no-store`, including errors.

The response version is `2.0.0`, with `source: "are.na-v3-search"` and
`mode: "proposal-only"`. Cards carry `approve`, `reject`, `redirect`, and
`need_evidence` choices, but these are proposed decisions, not executable writes.
Ranking uses metadata only; image inspection and human approval are still
required. The endpoint never writes to Are.na, D1, `/taste`, `/llm.txt`, or
`/api/taste/context`. Partial provider failures return `status: "partial"`;
complete failure returns HTTP 502 with `status: "degraded"` and safe error codes.
A successful search with zero matches remains `status: "ok"`.

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
3. Confirm `/llm.txt` still returns taste context and JSON references preserve
   actual channel attribution without relabeling unrelated items by intent.
4. In an authorized test environment, confirm `/api/arena/sync?channel=canon-minimalism`
   imports into D1 without Are.na write access and records successful-sync freshness.
   This is a D1 write test, not a read-only availability check.
5. Confirm anonymous discovery returns 401 and a verified, unlisted identity
   returns 403 before any Are.na request. Confirm an allowed verified LTD identity
   receives v3 proposal-only results, safe partial/degraded failures, and private
   no-store headers. Offline fixtures establish the code boundary; a real signed
   operator session is required for positive live acceptance.
6. Roll back by redeploying the previous immutable LTD artifact. No database
   migration or corpus rewrite is part of Premium discovery. Preserve the
   operator restriction when rolling back; the older artifact exposes the legacy
   public endpoint. Removing the discovery token disables provider access but is
   not equivalent to restoring the access policy.

## Provenance Repair Deployment (CRE-2297)

The TASTE context API version 1.1 preserves observed channel memberships in
`taste_reference_channels` and completed channel imports in `taste_sync_state`.
Legacy rows keep unknown provenance until a complete source-channel sync
observes them. `channel` can therefore be null; `channels` and `sources` retain
all observed memberships. Visual descriptions are explicitly metadata and
require image inspection.

1. Apply `packages/ltd/migrations/0009_taste_provenance.sql` to the owning
   `create-something-db` before deploying the new Pages artifact. The migration
   adds tables; it does not alter or delete existing references.
2. Deploy reviewed code to the `createsomething-ltd` Pages project.
3. Import the already configured channels through the sync route. This writes
   D1, even for GET. A failed channel must report failure and retain its prior
   records, memberships, and completion checkpoint.
4. Read back both motion and layout packets with `include=references`.
   Check actual source membership, block links, image URLs, and the latest
   successful channel checkpoint. A matching intent is a discovery aid; inspect
   the reference before claiming relevance.
5. Verify `/taste` and `/llm.txt`, plus paused public write/OAuth routes.

Pagination uses uncached source metadata before and after fetching every page.
Incomplete, duplicate, changing, or oversized snapshots fail before import.
A checkpoint records the most recent successfully completed channel import,
not complete freshness of every configured channel. Unknown checkpoints display
as **Not recorded**. Source block creation dates are not sync dates.

Rollback: restore the previous-good Pages deployment and retain the additive
tables and reference records. Do not reverse an import by deleting the corpus.
The pre-repair production deployment recorded for this change is
`178df795-44e1-4506-b63d-b35501d194f7` (source `aa45651`); recheck the current
deployment before promotion in case another release has superseded it.

Read-only diagnosis on 2026-10-30 confirmed HTTP 200 for all ten configured
source channels without subscription authentication. Global block search
returned an HTML 403. This does not establish a subscription failure; renewal
is not a prerequisite proven by these checks.
