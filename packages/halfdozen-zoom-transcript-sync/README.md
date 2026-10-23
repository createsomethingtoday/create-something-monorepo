# Half Dozen Zoom Transcript Sync

Scheduled Cloudflare Worker that discovers Zoom meeting transcript files, tracks them in a D1 ledger, and writes a verified transcript index into the Half Dozen `Internal LLM` Notion database.

## Why this exists

The existing `halfdozen-zoom-sync` package is clip-oriented and deduplicates on raw clip URLs. That is not safe for meeting transcript sync because the live `Internal LLM [HD]` workspace already contains duplicate meetings created from different Zoom download URLs.

This package uses:

- scheduled discovery
- Queue-backed transcript processing
- D1 meeting ledger keyed by canonical Zoom meeting identity
- account-level recording discovery for Server-to-Server Zoom apps
- versioned Notion page-body parts with read-back verification

## Forward-only release gate

The proposed release requires an approved UTC `INDEXED_INGESTION_NOT_BEFORE` value. No production cutoff is configured. Both the recording start and original ledger first-seen time must meet that cutoff. Legacy queue envelopes and pre-cutoff Notion pages are excluded. See [cutoff semantics and approval status](./ROLLOUT.md). The revised rollout must not be merged or deployed before cutoff approval.

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

The worker preserves existing page content. It appends immutable toggles for the selected original text, numbered canonical parts, and an ordered index. Every artifact carries the same SHA-256 version derived from the original and canonical text plus the format version. The index links to each artifact. It is published only after read-back reconstruction succeeds. There is no opening-excerpt skip.

## Select one rendition

Group files by Zoom occurrence and date. Prefer one `TRANSCRIPT` VTT, then one other VTT, then one remaining transcript file. A tie at the best rank blocks that meeting. Incomplete recording files are excluded. Never concatenate alternate renditions or choose by length. The selected original is retained as standard base64 of its exact UTF-8 bytes, including CRLF and a BOM. Notion normalizes raw text, so the v2 original archive uses ASCII encoding; numbered canonical parts remain readable. Other Zoom files remain untouched at their source.

VTT canonical text uses the existing cue parser: each cue becomes a timestamp at whole-second precision, a newline, and cue text. Voice tags become speaker labels. Formatting tags are removed, `&nbsp;` becomes a space, and cue whitespace is collapsed. Every nonempty cue remains in source order, including repeated cues. The original retains precise timestamps and formatting. Malformed timing lines, empty cues, and orphan speech block readiness. Header metadata and `NOTE`, `STYLE`, and `REGION` blocks are not spoken text. Plain text uses CR removal and outer trimming; a long untimestamped block is rejected rather than split into invented timestamps.

Parts end at timestamp-block boundaries. Each part has a 6,000 UTF-16-code-unit budget. An oversized single block fails without truncation. Original chunks use the same budget, preserve exact text, and may split between cues. Rich-text items are sliced at 1,800 code units without breaking surrogate pairs. Each artifact is one toggle append with its children. Inputs are limited to 4 MiB of UTF-8 and 800 artifacts. The index is limited to 90 child paragraphs. These are conservative application budgets, not Notion limits or a promise about downstream retrieval.

Successful files are rechecked during the configured discovery lookback. A refreshed URL alone does not create a new content version. A source correction creates a new version and keeps the previous original, parts, and index. Readiness always points to the verified current version. Old page text and old index artifacts are historical content, not readiness signals.

Read [the readiness proposal and recovery limits](./READINESS.md) before production use. No new Notion properties, downstream triggers, schedule changes, or credential changes are included.

## Local checks

From the repository root, run `pnpm bootstrap:worktree`, then:

```sh
pnpm --filter @create-something/halfdozen-zoom-transcript-sync check
pnpm --filter @create-something/halfdozen-zoom-transcript-sync test
pnpm --filter @create-something/halfdozen-zoom-transcript-sync test:runtime
```

The synthetic suite covers long transcripts, exact reconstruction, partial failure and retry, uncertain writes, changed transcripts, repeated runs, duplicate blocks, rendition ties, and expired owners. SQLite-backed tests execute the D1 SQL locally. They do not prove provider behavior or successful live ingestion.

Read the [latest local validation matrix](./VALIDATION.md) for the distinction between workerd/D1 execution, deterministic providers, original-head CI, and live acceptance.
