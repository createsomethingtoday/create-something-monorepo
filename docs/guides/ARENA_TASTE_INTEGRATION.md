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
- Before/after reference boards for `.agency` sales.
- Project-specific `llm.txt` or MCP resources for client agents.

## Validation

Before production promotion:

1. Confirm `/taste` renders without a public contribution control.
2. Confirm paused write routes return HTTP 410.
3. Confirm `/llm.txt` still returns taste context.
4. Confirm `/api/arena/sync?channel=canon-minimalism` still syncs without
   Are.na write access.
