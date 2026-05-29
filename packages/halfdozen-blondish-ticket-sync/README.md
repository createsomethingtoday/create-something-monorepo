# Half Dozen BLOND:ISH Ticket Sync Worker

Standalone Cloudflare Worker for the BLOND:ISH / Abracadabra ticket sync.

This is not an MCP server. It exposes only sync HTTP endpoints plus a scheduled
reconciliation handler.

Production URL:

```text
https://halfdozen-blondish-ticket-sync.createsomething.workers.dev
```

## Sync Contract

Real-time source-to-target sync:

- Source: BLOND:ISH `Support Tickets [OS]`.
- Target: Half Dozen `Tickets [HD]`.
- Trigger: Notion webhook events for BLOND:ISH source data source/page changes.
- Match key: source `Page ID` -> target `External Page ID` or `Ext Page ID`.
- Create missing HD rows with:
  - concise ticket title, six words or fewer
  - `Status = Not Started`
  - `Source = Portal / Tag`
  - `Owner = FG (fillip@halfdozen.co)`
  - `Client = BLOND:ISH / Abracadabra`, when the target schema has a `Client`
    property
  - `External Page ID` or `Ext Page ID`, `External URL`,
    `External Files & Media`
  - page body starting with `Created By`, then source `Details`
- Existing matched rows are not generally updated. The only allowed matched-row
  update is to backfill/correct `External URL` and `External Files & Media`.
  During the May 29 launch repair, the Worker also corrected HD titles that
  exactly matched the old generated three-word truncation so user-edited titles
  were not overwritten.

Real-time target-to-source status sync:

- Source of status truth: Half Dozen `Tickets [HD]`.
- Destination: BLOND:ISH `Support Tickets [OS]`.
- Trigger: Notion webhook events for HD target page changes, plus daily cron
  reconciliation.
- Only the BLOND:ISH status property is updated.
- Status map:
  - `Assigned` -> `Under Review`
  - `In Progress` -> `In Progress`
  - `Client Action` -> `Action Required`
  - `Complete` -> `Complete`
  - `Archive` -> `Archive`
  - `Roadblock` -> `Roadblock`
- Unmapped HD statuses such as `Not Started`, `Responded`, `Needs Review`, and
  `Backburner` are ignored.

## Runtime

Configured in `wrangler.toml`.

Runtime secrets live in Infisical at `/halfdozen-blondish-ticket-sync` and are
pushed to Cloudflare Worker secrets. Do not commit or paste Notion PAT values
into repo files. If a client setup export exposes token values, treat them as
setup-only material, rotate if needed, and store the active runtime values in
Infisical and Worker secrets.

Required Worker secrets:

```bash
cd packages/halfdozen-blondish-ticket-sync
pnpm exec wrangler secret put SYNC_API_KEY
pnpm exec wrangler secret put BLONDISH_NOTION_API_KEY
pnpm exec wrangler secret put HALFDOZEN_NOTION_API_KEY
pnpm exec wrangler secret put NOTION_WEBHOOK_VERIFICATION_TOKEN
pnpm exec wrangler secret put HALFDOZEN_TICKETS_DATA_SOURCE_ID
```

Important vars:

- `BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID`: BLOND:ISH `Support Tickets [OS]`.
- `HALFDOZEN_TICKETS_DATA_SOURCE_ID`: preferred explicit HD `Tickets [HD]`
  data source ID. In production this is set as a Worker secret because it was
  discovered from the live Notion database URL after access was granted.
- `HALFDOZEN_TICKETS_DATABASE_ID`: fallback database ID used to discover the
  first data source.
- `BLONDISH_OS_STATUS_PROPERTY`: defaults to `Status`, with `OS Status` fallback
  if present during schema preflight.
- `FORWARD_SYNC_ON_SCHEDULE`: default `false`; webhooks are the real-time source
  trigger, cron is primarily a reverse-status repair path.
- `WEBHOOK_STATE`: Worker KV binding used to capture Notion webhook
  `verification_token` values automatically for signature validation. A manual
  `NOTION_WEBHOOK_VERIFICATION_TOKEN` secret is still supported as an override
  or fallback.

## Endpoints

`GET /health`

Reports config and secret presence without exposing secret values.

`POST /webhooks/notion`

Public Notion webhook receiver. This endpoint:

- accepts the initial `verification_token` payload and logs that verification
  was received
- stores received verification tokens in `WEBHOOK_STATE` for future signature
  validation
- validates subsequent `X-Notion-Signature` values with
  a stored verification token or `NOTION_WEBHOOK_VERIFICATION_TOKEN`
- routes BLOND:ISH source events to source-to-HD sync
- routes HD target events to HD-status-to-BLOND:ISH sync

`POST /preflight`

Requires `Authorization: Bearer $SYNC_API_KEY`. Checks source/target data source
visibility and required properties.

`POST /sync/source-to-hd`

Requires `Authorization: Bearer $SYNC_API_KEY`.

```bash
curl -sS -X POST "$WORKER_URL/sync/source-to-hd" \
  -H "Authorization: Bearer $SYNC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source_page_id":"ST-ISH-11"}' | jq
```

Omit `source_page_id` to reconcile all source tickets.

`POST /sync/hd-status-to-source`

Requires `Authorization: Bearer $SYNC_API_KEY`.

```bash
curl -sS -X POST "$WORKER_URL/sync/hd-status-to-source" \
  -H "Authorization: Bearer $SYNC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target_page_id":"<notion-page-id>"}' | jq
```

Omit `target_page_id` to reconcile all HD statuses.

`POST /sync/full`

Runs source-to-HD and HD-status-to-source reconciliation. The scheduled handler
calls this daily with forward reconciliation disabled unless
`FORWARD_SYNC_ON_SCHEDULE=true`.

## Notion Webhook Setup

Create webhook subscriptions in the relevant Notion connection settings:

- BLOND:ISH connection: subscribe to source page/data-source updates for
  `Support Tickets [OS]`.
- Half Dozen connection: subscribe to page updates for `Tickets [HD]`.

Webhook URL:

```text
https://<worker-host>/webhooks/notion
```

After creating the subscription, Notion sends a `verification_token` payload to
the endpoint. The Worker stores that token in `WEBHOOK_STATE` automatically and
uses it to validate future `X-Notion-Signature` headers. Paste the same token
into the Notion verification UI when Notion asks for it. If the token was sent
before `WEBHOOK_STATE` was bound, click **Resend token** in the Notion
verification modal.

## Validation

```bash
pnpm --filter @create-something/halfdozen-blondish-ticket-sync typecheck
pnpm --filter @create-something/halfdozen-blondish-ticket-sync test
cd packages/halfdozen-blondish-ticket-sync
pnpm exec wrangler deploy --dry-run
```

Production validation completed on May 29, 2026:

- `POST /preflight`: passed with `ok=true`.
- `POST /sync/source-to-hd`: created all missing source tickets in HD, then a
  follow-up full pass returned `created: 0` and `errors: 0`.
- `POST /sync/hd-status-to-source`: completed with `errors: 0`.
- Notion-hosted source attachments are copied into HD with Notion's File Upload
  API and then attached to `External Files & Media`; external files are written
  as `type=external`.
- The launch repair corrected 12 legacy-generated HD titles, including
  `ST-ISH-1` from `Create Database for` to `Create Database for all Merch data`,
  and backfilled 2 attachment fields.
- A follow-up full pass returned `created: 0`, `updated: 0`, and `errors: 0`
  for both sync directions.
- Notion webhook subscription is active and signed events are validated against
  `WEBHOOK_STATE` / `NOTION_WEBHOOK_VERIFICATION_TOKEN`.
