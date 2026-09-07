# Half Dozen Zoom Transcript Sync

Scheduled Cloudflare Worker that discovers Zoom meeting transcript files, deduplicates them against a D1 ledger, and writes the full transcript into the Half Dozen `Internal LLM` Notion database.

## Why this exists

The existing `halfdozen-zoom-sync` package is clip-oriented and deduplicates on raw clip URLs. That is not safe for meeting transcript sync because the live `Internal LLM [HD]` workspace already contains duplicate meetings created from different Zoom download URLs.

This package uses:

- scheduled discovery
- Queue-backed transcript processing
- D1 meeting ledger keyed by canonical Zoom meeting identity
- account-level recording discovery for Server-to-Server Zoom apps
- Notion page-body transcript writes aligned to the live `Internal LLM [HD]` format

## Runtime modes

Notion writes support two transport modes:

- `api` — direct Notion API via `NOTION_API_KEY`
- `hub` — Hub-backed writes via `NOTION_HUB_URL`, `NOTION_HUB_API_TOKEN`, and `NOTION_HUB_PROXY_TOOL`

`hub` is the practical default for current Half Dozen operator-managed access. `NOTION_RUNTIME_CONNECTION_REF` can be carried as an approved runtime handle for rollout governance, but this package does not yet resolve raw `ntn_...` refs directly.

## Zoom scopes

For the default Server-to-Server account discovery path, the Zoom app needs these scopes:

- `cloud_recording:read:list_account_recordings:admin`
- `cloud_recording:read:list_recording_files:admin`
- `cloud_recording:read:meeting_transcript:admin`

If you intentionally switch to a per-user discovery path via `ZOOM_USER_ID`, the app instead needs the corresponding user-recordings listing scope.

## HTTP surface

- `GET /health` — public health/config summary
- `GET /status` — recent runs and recent ledger rows, requires `SYNC_API_KEY`
- `GET /recordings/:meetingId?from=YYYY-MM-DD&to=YYYY-MM-DD` — read-only inspection of the same Zoom recording-list GET used by discovery; returns sanitized recording metadata without download URLs or tokens, requires `SYNC_API_KEY`
- `POST /scan` — manual discovery trigger, requires `SYNC_API_KEY`
- `POST /replay/:dedupKey` — replay a failed or stale transcript job, requires `SYNC_API_KEY`

## Notion write shape

The sync follows the live `Internal LLM [HD]` schema:

- `Item`
- `Source URL`
- `Date`
- `Status`
- `Source`
- `Type`
- `Attendees`

The full transcript is written into the page body as:

1. `heading_3`: `📝 FULL TRANSCRIPT`
2. repeated timestamp `heading_3` blocks
3. transcript `paragraph` blocks

This matches the current meeting-page pattern already present in the workspace.
