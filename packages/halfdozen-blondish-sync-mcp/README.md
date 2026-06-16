# Half Dozen Client Ticket Sync MCP

Operator-invoked MCP for reconciling client `Support Tickets [OS]` data sources
with Half Dozen `Tickets [HD]`.

This is intentionally narrower than generic database replication. The client
workspace is the source of ticket page data, and Half Dozen is the source of
mapped status.
The tools are direct-write tools for a Notion agent, with audit/preflight tools
for diagnosis.

Current Worker configs:

| Worker | Client | Tool prefix |
| --- | --- | --- |
| `wrangler.toml` | BLOND:ISH | `blondish_sync` |
| `wrangler.c3-management.toml` | C3 Management | `c3_management_sync` |
| `wrangler.lightswitch.toml` | Lightswitch | `lightswitch_sync` |

## Tools

- `<prefix>_preflight` checks tokens, data source visibility, and schemas.
- `<prefix>_audit` reports missing rows, duplicate matches, contract-field
  drift, body drift, attachment drift, and reverse-status drift.
- `<prefix>_plan_source_to_hd_repairs` turns a fresh audit into a scoped
  no-write repair plan.
- `<prefix>_repair_missing_hd_rows` creates only HD rows that are currently
  missing from the source-to-HD match.
- `<prefix>_repair_external_url_drift` repairs only `External URL` drift on
  matched HD rows.
- `<prefix>_source_to_hd` creates or repairs HD rows from client source
  rows. It never overwrites HD `Status`.
- `<prefix>_hd_status_to_source` writes mapped HD statuses back to the client.
  Unmapped statuses are skipped.
- `<prefix>_full` runs source-to-HD, then HD-status-to-source.

## Contract

Forward sync matches source `Page ID` to target `External Page ID` or
`Ext Page ID`. It governs `Ticket`, `Source`, `Owner`, optional `Client`,
external page ID, external URL, external files/media, and synced page body.

Reverse sync updates only the client status property:

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
pnpm deploy:halfdozen-c3-management-sync-mcp
pnpm deploy:halfdozen-lightswitch-sync-mcp
```

Set secrets with Wrangler or Infisical-backed deployment:

```bash
cd packages/halfdozen-blondish-sync-mcp
pnpm exec wrangler secret put MCP_API_KEY
pnpm exec wrangler secret put CLIENT_NOTION_API_KEY
pnpm exec wrangler secret put HALFDOZEN_NOTION_API_KEY
pnpm exec wrangler secret put HALFDOZEN_TICKETS_DATA_SOURCE_ID
pnpm exec wrangler secret put BRAINTRUST_API_KEY
pnpm exec wrangler secret put BRAINTRUST_PROJECT_ID # optional
```
