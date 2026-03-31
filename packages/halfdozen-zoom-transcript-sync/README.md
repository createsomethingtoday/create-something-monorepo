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

`NOTION_WRITE_MODE` is intentionally optional. If it is unset, runtime mode is inferred in this order:

- `hub` when `NOTION_HUB_URL`, `NOTION_HUB_API_TOKEN`, and `NOTION_HUB_PROXY_TOOL` are all configured
- `api` when `NOTION_API_KEY` is configured

Set `NOTION_WRITE_MODE=api` or `NOTION_WRITE_MODE=hub` only when you need to force a rollout posture.

When `hub` mode is active, the worker now emits deterministic hub trace headers per transcript sync:

- `X-Correlation-ID` ties all Notion writes for one transcript job together
- `X-Request-ID` is unique per hub request and action
- `X-Experiment-ID`, `X-Candidate-ID`, `X-Baseline-ID`, `X-Experiment-Cohort`, and `X-Experiment-Phase` can be populated from:
  - `NOTION_HUB_EXPERIMENT_ID`
  - `NOTION_HUB_CANDIDATE_ID`
  - `NOTION_HUB_BASELINE_ID`
  - `NOTION_HUB_COHORT`
  - `NOTION_HUB_PHASE`

Defaults are opinionated for live traces:

- `experiment_id`: `halfdozen-zoom-transcript-sync`
- `candidate_id`: `production`
- `cohort`: `scheduled`, `replay`, or `manual`, derived from the sync trigger
- `phase`: `production`

## Deploying with Infisical

The worker now has a dedicated vault sync path:

```bash
INFISICAL_ENV=prod pnpm halfdozen:zoom-transcript:vault:sync
```

or from the package directory:

```bash
pnpm vault:sync
```

The sync script can pull from Infisical or the current shell environment:

- `VAULT_PROVIDER=infisical|env` defaults to `infisical`
- `LOAD_FROM_VAULT=true|false` defaults to `true`
- `INFISICAL_PROJECT_ID` is optional
- `INFISICAL_ENV` defaults to `prod`
- `INFISICAL_PATH` defaults to `/`
- `DRY_RUN=true` shows the `wrangler secret put` commands without changing Cloudflare

It validates and syncs:

- `SYNC_API_KEY`
- one supported Zoom credential set
- direct Notion credentials for `api` mode, or hub credentials for `hub` mode
- optional hub experiment fields and `NOTION_RUNTIME_CONNECTION_REF`

The sync script treats hub routing fields like `NOTION_HUB_URL` and `NOTION_HUB_PROXY_TOOL` as runtime secrets so the worker can switch into hub mode without requiring per-environment `wrangler.toml` edits.

## Zoom scopes

For the default Server-to-Server account discovery path, the Zoom app needs these scopes:

- `cloud_recording:read:list_account_recordings:admin`
- `cloud_recording:read:list_recording_files:admin`
- `cloud_recording:read:meeting_transcript:admin`

If you intentionally switch to a per-user discovery path via `ZOOM_USER_ID`, the app instead needs the corresponding user-recordings listing scope.

## HTTP surface

- `GET /health` — public health/config summary
- `GET /status` — recent runs and recent ledger rows, requires `SYNC_API_KEY`
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
