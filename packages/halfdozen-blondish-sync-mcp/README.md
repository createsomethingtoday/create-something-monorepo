# Half Dozen BLOND:ISH Sync MCP

Operator-invoked MCP for reconciling BLOND:ISH `Support Tickets [OS]` with
Half Dozen `Tickets [HD]`.

This is intentionally narrower than generic database replication. BLOND:ISH is
the source of ticket page data, and Half Dozen is the source of mapped status.
The tools are direct-write tools for a Notion agent, with audit/preflight tools
for diagnosis.

## Tools

- `blondish_sync_preflight` checks tokens, data source visibility, and schemas.
- `blondish_sync_audit` reports missing rows, duplicate matches, contract-field
  drift, body drift, attachment drift, and reverse-status drift.
- `blondish_sync_plan_source_to_hd_repairs` turns a fresh audit into a scoped
  no-write repair plan.
- `blondish_sync_repair_missing_hd_rows` creates only HD rows that are currently
  missing from the source-to-HD match.
- `blondish_sync_repair_external_url_drift` repairs only `External URL` drift on
  matched HD rows.
- `blondish_sync_source_to_hd` creates or repairs HD rows from BLOND:ISH source
  rows. It never overwrites HD `Status`.
- `blondish_sync_hd_status_to_source` writes mapped HD statuses back to
  BLOND:ISH. Unmapped statuses are skipped.
- `blondish_sync_full` runs source-to-HD, then HD-status-to-source.

## Contract

Forward sync matches source `Page ID` to target `External Page ID` or
`Ext Page ID`. It governs `Ticket`, `Source`, `Owner`, optional `Client`,
external page ID, external URL, external files/media, and synced page body.

Reverse sync updates only the BLOND:ISH status property:

- `Assigned` -> `Under Review`
- `In Progress` -> `In Progress`
- `Client Action` -> `Action Required`
- `Complete` -> `Complete`
- `Archive` -> `Archive`
- `Roadblock` -> `Roadblock`

## Scale path

The current MCP is an operator control plane. For hundreds of rows per client,
manual audit and scoped repair tools are acceptable. Before frequent large
database polling or multi-client rollout, add an event-driven layer:

- Notion Developer webhook subscriptions for source and target page events.
- A persisted sync index keyed by client, source `Page ID`, source page ID, and
  HD page ID.
- Chunked background jobs for full audits and backfills.
- Per-client or per-token Notion rate queues with `429`/`Retry-After` handling.

In that future shape, webhooks do the normal incremental sync work and this MCP
remains the agent/operator surface for audit, repair, backfill, and exceptions.

## Braintrust

Braintrust is included for runtime observability and MCP contract evaluation.
When `BRAINTRUST_API_KEY` is configured, each tool call emits a sanitized trace
with tool name, action, duration, success state, write counts, error scopes, row
counts, drift counts, field drift categories, and repair scope.

Traces intentionally do not include raw Notion page payloads, page body text,
attachment URLs, bearer tokens, or full row lists. The MCP response remains the
source of row-level operator evidence.

Run the local no-log contract eval with:

```bash
pnpm braintrust:eval:mcp:halfdozen-blondish-sync:local
```

## Deploy

```bash
pnpm --filter @create-something/halfdozen-blondish-sync-mcp typecheck
pnpm --filter @create-something/halfdozen-blondish-sync-mcp test
pnpm braintrust:eval:mcp:halfdozen-blondish-sync:local
pnpm deploy:halfdozen-blondish-sync-mcp
```

Set secrets with Wrangler or Infisical-backed deployment:

```bash
cd packages/halfdozen-blondish-sync-mcp
pnpm exec wrangler secret put MCP_API_KEY
pnpm exec wrangler secret put BLONDISH_NOTION_API_KEY
pnpm exec wrangler secret put HALFDOZEN_NOTION_API_KEY
pnpm exec wrangler secret put HALFDOZEN_TICKETS_DATA_SOURCE_ID
pnpm exec wrangler secret put BRAINTRUST_API_KEY
pnpm exec wrangler secret put BRAINTRUST_PROJECT_ID # optional
```
