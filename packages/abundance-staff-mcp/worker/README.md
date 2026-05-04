# Abundance Staff MCP

Dify-facing remote MCP worker for Abundance Paylocity staff/headcount data.

This package is intentionally separate from:

- `create-something-db`: jobs and staffing demand tables.
- `abundance-concierge-chat-db`: nurse-facing chat/intake/access workflow tables.

## Data Boundary

The Paylocity `Active Headcount-3.csv` export is a staff reference snapshot. It includes direct PII such as home email, home/mobile phone, work email, home address, work address, and supervisor/reviewer emails. It should not be imported into the shared jobs DB.

Use a client-scoped D1 database named `abundance-npg-staff` for this data. The Worker exposes a narrow MCP contract to Dify so the agent can summarize headcount, find staff profiles, and queue enrichment work without free-form SQL access.

## Dify MCP Setup

1. Create and migrate the D1 database.
2. Set `MCP_API_KEY` on the Worker.
3. Deploy this Worker.
4. Import the Paylocity headcount CSV into `abundance-npg-staff`.
5. In Dify, add the Worker `/mcp` URL under Tools -> MCP with the stable server ID `abundance-staff-mcp`.
   Configure authentication as a bearer token, matching the working Abundance Jobs MCP card.
6. Keep `ALLOW_PII_LOOKUP` unset by default. Enable it only for approved Dify agents that need contact/address values.

Production values:

- Dify MCP URL: `prod:/dify/abundance-staff-mcp/DIFY_ABUNDANCE_STAFF_MCP_BASE_URL`
- Base MCP URL: `https://abundance-staff-mcp.createsomething.workers.dev/mcp`
- Health URL: `https://abundance-staff-mcp.createsomething.workers.dev/health`
- Infisical token reference: `prod:/dify/abundance-staff-mcp/DIFY_ABUNDANCE_STAFF_MCP_API_KEY`
- Dify agent config: `config/dify/abundance-staff-agent.yml`

Dify should use the base MCP URL plus bearer-token authentication. If the Staff card shows an `Authorize` button or reports failed OAuth metadata discovery, it was registered as OAuth or without bearer credentials. Update or recreate the card as:

- URL: base MCP URL
- Auth type: bearer token
- Token: `DIFY_ABUNDANCE_STAFF_MCP_API_KEY` from Infisical

The worker also accepts `X-API-Key` and tokenized query URLs for non-Dify smoke tests, but the Dify card should use bearer auth so it matches Abundance Jobs.

## Tools

- `abundance_staff_summarize_headcount`: aggregate counts by role, department, and location.
- `abundance_staff_search_profiles`: search profile and current employment metadata. It does not return contact/address values.
- `abundance_staff_get_profile`: fetch one profile; contact/address values require `include_contact=true` and `ALLOW_PII_LOOKUP=true`.
- `abundance_staff_queue_enrichment_task`: create a task for Dify or a human to enrich/verify data.
- `abundance_staff_list_enrichment_tasks`: list enrichment work.
- `abundance_staff_record_enrichment_result`: record task result. This does not mutate canonical staff fields.

## Resources

- `abundance-staff://stats`: total/freshness/role/department counts.
- `abundance-staff://role-taxonomy`: role buckets and Paylocity position summaries.

## Local Commands

```bash
pnpm --dir packages/abundance-staff-mcp/worker run typecheck
pnpm --dir packages/abundance-staff-mcp/worker run dev
pnpm --dir packages/abundance-staff-mcp/worker run import:paylocity -- "/Users/micahjohnson/Downloads/Active Headcount-3.csv" --out /tmp/abundance-paylocity-import.sql --imported-by codex
```

Apply a generated import SQL file to production with:

```bash
pnpm --dir packages/abundance-staff-mcp/worker exec wrangler d1 execute abundance-npg-staff --remote --file /tmp/abundance-paylocity-import.sql
```

## Production Notes

The first migration defines both the raw Paylocity import tables and normalized staff tables. Keep raw import rows for auditability, but route Dify through normalized views/tools. If Dify enrichment discovers corrections, record them as enrichment task results first; promote them to canonical staff fields only after a human approval step or a separate controlled importer.
