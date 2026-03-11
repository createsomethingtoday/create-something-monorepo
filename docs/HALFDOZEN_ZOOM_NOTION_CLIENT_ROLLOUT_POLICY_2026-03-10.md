# Half Dozen Zoom -> Client Notion Rollout Policy Memo

Date: `2026-03-10`

## Decision

This rollout should ship as an operator-managed Cloudflare async job, not as a generic interactive Hub workflow.

Recommended runtime shape:

1. a scheduled Worker scans the `meetings` source for newly completed records
2. a Queue buffers candidate meeting IDs
3. a per-meeting Workflow performs mapping, Notion writes, retry-safe chunked transcript append, and ledger updates
4. a D1 sync ledger records idempotency, page IDs, hashes, attempts, and errors

This matches the repo guidance that long-running sync, export, and fan-out work belongs in explicit async control planes rather than interactive MCP execution.

## Policy Alignment

### Aligned if we use a dedicated Cloudflare job

- `policy.integration-selection.v1`
  - This is a client-specific sync with schema-specific write behavior, so it belongs in a custom implementation rather than broad commodity provider exposure.
- `policy.service-tier-entitlement.v1`
  - A recurring autonomous transcript sync is a paid governed capability, not a free `mcp_only` wedge.
- `policy.mcp-credential-delivery.v1`
  - The runtime should use operator-managed secrets or pinned toolkit accounts. It should not expose Notion secrets or hub runtime tokens to the client.
- `policy.partner-auth-governance.v1`
  - Client Notion auth and any future Zoom auth need active consent, actor traceability, and pinned account control.

### Misaligned if we use raw interactive provider tools

- `policy.tenant-tool-exposure.v1`
  - Exposing broad `notion_*` and `zoom_*` write tools to support one transcript sync would widen the client surface unnecessarily.
- `policy.hub-route-authorization.v1`
  - Generic write routes are the wrong boundary for a scheduled projection job. The governed boundary should be a dedicated trigger or replay surface and the job runtime itself.

## Required Policy Updates

### 1. Add explicit governance for cross-workspace sync jobs

Current policies talk about credentials, route auth, and tool exposure, but they do not directly govern a background job that projects internal meeting content into a client-owned writable system.

Added draft policy:

- `policy.cross-workspace-sync-governance.v1`

This covers:

- dedicated job surfaces
- approved source and destination scopes
- operator-managed runtime credentials
- idempotent sync ledgers
- review gates for mapping changes
- replay and dead-letter expectations

### 2. Tighten integration-selection policy

The existing integration-selection policy already points toward custom implementations for deep client workflows. It now needs explicit language that scheduled cross-workspace syncs belong in Worker, Queue, or Workflow control planes.

### 3. Tighten service-tier policy

The existing tier policy needs an explicit statement that autonomous cross-workspace write sync is `policy_os_trial` or `policy_os_core`, not `mcp_only`.

### 4. Tighten partner-auth policy for unattended execution

The existing partner-auth policy governs connect links and pinned accounts, but it did not explicitly say that unattended jobs cannot reuse personal bearer tokens. That rule is now required.

### 5. Narrow tenant exposure for rollout

The client-facing surface should expose only:

- sync status
- replay or backfill request
- error inspection

It should not expose raw mutable Notion or Zoom catalogs just to support this one workflow.

## Runtime Notes

### Recommended Cloudflare shape

- Worker `scheduled` trigger for discovery
- Queue for buffering and backpressure
- Workflow for per-meeting orchestration and retry-safe steps

This is the right fit because transcript sync is long-running, stateful enough to need a ledger, and write-capable against a client system.

### Notion implementation constraint

The full transcript should live in the page body, not in a Notion property.

Current Notion API limits require:

- max `2000` characters per rich text object
- max `100` block elements in an array payload
- payloads kept under the documented request-size constraints

Operationally that means:

- chunk transcript text to about `1900` characters per paragraph block
- append in batches of at most `100` blocks
- keep page property metadata small and stable

The existing pattern in `packages/halfdozen-zoom-sync/src/lib/notion.ts` already follows this model and should be reused rather than reinvented.

## Live Validation

Live terminal review succeeded through the operator-managed Notion Hub account.

Verified target database:

- workspace: `halfdozen`
- title: `Internal LLM [HD]`
- database_id: `27a01918-7ac5-80b7-97fe-c563c98afbbc`

Verified schema fields used by the rollout:

- `Item` — title
- `Source URL` — url
- `Date` — date
- `Status` — select
- `Source` — select
- `Type` — select
- `Attendees` — rich text
- `Notes` — rich text
- `Area` — select
- `Owner` — people
- `Weight` — number
- `Page ID` — unique id

Verified page-body pattern from live meeting pages:

- example page `JP x DM` (`2ec01918-7ac5-8157-9c1b-c6580a418280`) stores the transcript directly in the page body
- transcript content is not in a property
- the current body pattern uses section headings plus repeated timestamp `heading_3` blocks followed by transcript `paragraph` blocks
- some pages also include summary and action-item sections before the transcript

This means the rollout should write:

- stable metadata into page properties
- full transcript into the page body
- optional summary/action-item sections ahead of the transcript when those artifacts exist

## Dedup Findings

Live query of the database returned `1979` rows total, including `1201` rows with `Type = Meeting`.

Important dedup facts from the live data:

- `Source URL` is not sufficient as the only idempotency key for Zoom meeting transcript sync
- `73` meeting rows have no `Source URL`
- `130` meeting rows use stable Zoom recording-management URLs of the form `zoom.us/recording/management/detail?meeting_id=...`
- `13` meeting rows use ephemeral Zoom download URLs of the form `zoom.us/rec/download/...`
- `976` meeting rows use Fireflies URLs
- duplicate meeting pages already exist with the same title and date but different `Source URL` values
- at least one exact duplicate already exists on the same stable Zoom `meeting_id` URL

Required dedup order for the Worker:

1. D1 ledger key on canonical Zoom meeting identity plus transcript file identity
2. Notion lookup on canonical stable source URL when available
3. fallback Notion lookup on normalized title + recorded date
4. transcript hash guard before append/update of page-body content

Canonicalization rule for Zoom source URLs:

- prefer a stable recording-management URL keyed by Zoom `meeting_id`
- do not use `zoom.us/rec/download/...` as the primary dedup key
- if only a download URL is present, derive and persist a canonical meeting key separately in D1
