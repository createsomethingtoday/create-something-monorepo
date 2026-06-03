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

## Deploy

```bash
pnpm --filter @create-something/halfdozen-blondish-sync-mcp typecheck
pnpm --filter @create-something/halfdozen-blondish-sync-mcp test
pnpm deploy:halfdozen-blondish-sync-mcp
```

Set secrets with Wrangler or Infisical-backed deployment:

```bash
cd packages/halfdozen-blondish-sync-mcp
pnpm exec wrangler secret put MCP_API_KEY
pnpm exec wrangler secret put BLONDISH_NOTION_API_KEY
pnpm exec wrangler secret put HALFDOZEN_NOTION_API_KEY
pnpm exec wrangler secret put HALFDOZEN_TICKETS_DATA_SOURCE_ID
```
