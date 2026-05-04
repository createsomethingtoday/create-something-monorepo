# Abundance Paylocity Staff Data Recommendation

Date: 2026-05-04

## Current Finding

The current Paylocity file is `/Users/micahjohnson/Downloads/Active Headcount-3.csv`.

Local inspection found:

- 199 active headcount rows.
- 52 columns.
- 189 home emails, 190 home mobile phones, 97 home phones, and 126 work emails.
- 192 rows have at least one direct contact value.
- All rows have `Employee Status Code = A`.
- The dominant role bucket remains Nurse Practitioner.

This is staff/headcount reference data, not applicant data and not job demand data.

## Existing Abundance Data Surfaces

- `create-something-db`: contains jobs/staffing demand tables such as `inbound_jobs`, `indeed_staffing_jobs`, and `indeed_staffing_applications`.
- `abundance-concierge-chat-db`: contains nurse-facing intake/access workflow data such as chat threads, profile snapshots, profile field events, verification challenges, and candidate intake claims.
- No canonical nurse/staff/headcount master DB was found in the visible Abundance surfaces.

## Recommendation

Use the three surfaces separately:

1. Jobs DB for roles, openings, job posts, and applicant/application events.
2. Concierge chat DB for nurse-facing access/intake conversations and extracted profile fields.
3. New client-scoped staff DB for Paylocity active headcount and enrichment workflow.

The Paylocity CSV should go to the new staff DB, not into the jobs DB and not directly into the chat DB. The chat DB can reference a staff profile later if the product needs a verified-staff access path, but it should not become the staff master.

## Dify MCP Shape

The Dify agent should connect to a dedicated remote MCP worker backed by the new staff D1 database. The worker should expose bounded tools rather than free-form SQL:

- Summarize headcount by role, department, location, and freshness.
- Search staff profiles without contact/address values by default.
- Fetch one profile with contact/address values only when PII access is explicitly enabled.
- Queue enrichment tasks.
- Record enrichment task results without mutating canonical staff fields.

Initial scaffold:

- `packages/abundance-staff-mcp/worker`
- D1 database name: `abundance-npg-staff`
- Dify server ID: `abundance-staff-mcp`

Deployed MCP values:

- Dify MCP URL: `prod:/dify/abundance-staff-mcp/DIFY_ABUNDANCE_STAFF_MCP_BASE_URL`
- Base MCP URL: `https://abundance-staff-mcp.createsomething.workers.dev/mcp`
- Health URL: `https://abundance-staff-mcp.createsomething.workers.dev/health`
- Infisical token reference: `prod:/dify/abundance-staff-mcp/DIFY_ABUNDANCE_STAFF_MCP_API_KEY`
- Dify Service API key reference: `prod:/dify/abundance-staff-mcp/DIFY_ABUNDANCE_STAFF_AGENT_API_KEY`
- Dify agent YAML: `config/dify/abundance-staff-agent.yml`
- Dify registry entry: `config/dify/inventory.json`
- Dify import file: `/Users/micahjohnson/Downloads/Abundance Staff Headcount Agent.yml`

Register the Dify MCP card with the base `/mcp` URL and bearer-token authentication, matching the working Abundance Jobs card. If Dify shows an `Authorize` button or reports failed OAuth metadata discovery, the card was registered as OAuth or without bearer credentials. The worker also accepts `X-API-Key` and tokenized query URLs for non-Dify smoke tests, but Dify should use bearer auth.

## Implementation Status

The Paylocity snapshot was imported to `abundance-npg-staff` on 2026-05-04.

- Import batch ID: `paylocity_batch_8196dd8e2a261342b784`
- Source rows: 199
- Unique Paylocity employee IDs: 199
- Normalized profiles: 199
- Current employment records: 199
- Contact points: 1,657
- Addresses: 323
- Supervisor relationships: 199

MCP validation returned 199 active profiles through `abundance_staff_summarize_headcount`. Search validation returned staff profile matches with `contact_values_included=false`, which is the intended default PII posture.

## Import Guidance

Preserve the raw Paylocity rows in an import batch table with file hash, row hash, and source row JSON. Normalize only the fields needed for MCP reads into:

- `staff_profiles`
- `staff_employment_records`
- `staff_contact_points`
- `staff_addresses`
- `staff_supervisor_relationships`
- `staff_enrichment_tasks`
- `staff_mcp_audit_events`

Keep contact values in a separate table and keep default MCP reads metadata-only. This allows Dify to enrich the data while maintaining a clean boundary between staff reference data, nurse intake, and job matching.
