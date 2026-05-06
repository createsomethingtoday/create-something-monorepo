# Abundance Nurse Staffing System Project Update

**Client:** The NP Group
**Client shorthand:** NPG
**Audience:** client_summary
**Generated:** 2026-05-06

Abundance now has a repo-backed database, API/MCP-facing contract surface, Staff Headcount Agent, and matching-agent boundary that can be delivered as a visible client update instead of a loose status note.

## Client Context

This delivery is tied to The NP Group — Abundance AI-native staffing pipeline in CREATE SOMETHING Notion / Agency Ops. The Notion context was reviewed from the CREATE SOMETHING root and its Agency Ops records. The public artifact names the client context, but does not expose private Notion URLs, contacts, or raw workspace data.

## Client Summary

The project has moved from concept into a concrete operating system shape: a live concierge app, profile data, matching data, intake history, API routes, MCP endpoints, a Staff Headcount Agent, walkthrough artifacts, and a client-facing explanation layer.

The current delivery shows the relationship between the created database, the staff/jobs MCP surfaces, and the agent behavior: what the system stores, what tools can be called, what the Dify chat can safely answer, and where human review still belongs.

A private Paylocity active-headcount export has been received for staff/operator context. Employee-level rows and token-bearing MCP access remain private and are not included in the public delivery.

The client-ready message should avoid internal tool sprawl. It should say: the nurse intake and matching workflow now has durable data, callable actions, explainable recommendations, and received source artifacts for the next integration pass.

## DB, MCP, and Agent Map

| Layer | Status | What changed | Evidence |
| --- | --- | --- | --- |
| Created DB | created | The Abundance database model captures seekers/open demand, talent/nurse-side supply, matches, and intake history. The schema is intentionally small so the workflow can be explained and audited. The received Paylocity export is treated as private source data for the next staff/operator integration pass. | [migrations/0001_abundance_network.sql](../../../packages/agency/migrations/0001_abundance_network.sql)<br>[src/app.d.ts](../../../packages/agency/src/app.d.ts) |
| MCP/API surface | deployed-mcp-ready | The Abundance API has route handlers and an OpenAPI contract, plus tokenless references for Staff MCP and Jobs MCP endpoints. Credentials and token-bearing URLs remain outside public delivery artifacts. | [static/openapi-abundance.yaml](../../../packages/agency/static/openapi-abundance.yaml)<br>[api/abundance](../../../packages/agency/src/routes/api/abundance) |
| Matching agent | ready-for-review | The matching logic can produce an explainable shortlist using skills, budget, and availability. The Dify-side Staff Headcount Agent is now a client-safe chat surface over the Abundance Staff MCP, and the client-facing rule remains recommendation support, not autonomous staffing decisions. | [abundance/matching.ts](../../../packages/agency/src/lib/abundance/matching.ts)<br>[match/+server.ts](../../../packages/agency/src/routes/api/abundance/match/+server.ts) |

## Delivery Artifacts

| Artifact | Visibility | Kind | Link / Status |
| --- | --- | --- | --- |
| Abundance Concierge live app | client_summary | cloudflare_pages_app | [Abundance Concierge live app](https://abundance-concierge-chat.pages.dev/) |
| Nurse Staffing Concierge Progress Walkthrough | client_summary | descript_walkthrough | [Nurse Staffing Concierge Progress Walkthrough](https://share.descript.com/view/RWYv3CqKbEC) |
| Abundance Concierge Pilot Overview | client_summary | descript_walkthrough | [Abundance Concierge Pilot Overview](https://share.descript.com/view/0wxPcYQzl8G) |
| Abundance Staff Headcount Agent | client_summary | dify_chat_app | [Abundance Staff Headcount Agent](https://udify.app/chat/N0MmKYaAQAzgmZhy) |
| Abundance Staff MCP | private_internal | remote_mcp_server | [Abundance Staff MCP](https://abundance-staff-mcp.createsomething.workers.dev/mcp) |
| Abundance Jobs MCP | private_internal | remote_mcp_server | [Abundance Jobs MCP](https://abundance-jobs-mcp.createsomething.workers.dev/mcp) |
| Paylocity Active Headcount export | private_internal | private_csv_export | Received private Paylocity export with 198 employee rows and 20 columns. Raw rows, local file path, and employee-level data are intentionally excluded from the public delivery. |
| Abundance staff agent config | private_internal | external_agent_config | Dify staff-agent configuration name for operational alignment. Secret values remain in Infisical or equivalent secret storage. |

## Delivery Images

![Abundance Delivery Graph](assets/abundance-delivery-graph-2026-05-06.png)

![Abundance Evidence Map](assets/abundance-evidence-map-2026-05-06.png)

### Image 2 Prompt Sources

These image prompts target gpt-image-2 and are stored with the delivery assets.

- [abundance-image2-delivery-graph-2026-05-06.txt](assets/prompts/abundance-image2-delivery-graph-2026-05-06.txt)
- [abundance-image2-evidence-map-2026-05-06.txt](assets/prompts/abundance-image2-evidence-map-2026-05-06.txt)

## Client-Ready Update

We have the first durable Abundance system shape in place: a live nurse-facing concierge app, a database for nurse/candidate-side profile history and matching state, callable workflow routes for intake and match creation, deployed MCP endpoint references, a Staff Headcount Agent, and a matching layer that returns visible reasons rather than black-box decisions.

The current implementation supports the core operating path: capture profile context, preserve intake history, create or update demand/supply records, inspect staff/headcount context through chat, generate suggested matches, and keep the recruiter/human review boundary visible.

We also received the Paylocity active-headcount export as private source data for the next staff/operator integration pass. That data is acknowledged here as an artifact, but employee-level records are not included in the public delivery.

The next useful review is a walkthrough of the live app, Staff Headcount Agent, DB, callable actions, staff/jobs MCP boundaries, and agent recommendation boundary using the generated delivery page and walkthrough artifacts.

## Repo Evidence

| Component | Path | Type | Details |
| --- | --- | --- | --- |
| Created DB | [packages/agency/migrations/0001_abundance_network.sql](../../../packages/agency/migrations/0001_abundance_network.sql) | file | 155 lines |
| Created DB | [packages/agency/src/app.d.ts](../../../packages/agency/src/app.d.ts) | file | 98 lines |
| Created DB | [packages/agency/docs/ABUNDANCE_NETWORK_SYSTEM_DOCUMENTATION.md](../../../packages/agency/docs/ABUNDANCE_NETWORK_SYSTEM_DOCUMENTATION.md) | file | 552 lines |
| MCP/API surface | [packages/agency/static/openapi-abundance.yaml](../../../packages/agency/static/openapi-abundance.yaml) | file | 839 lines |
| MCP/API surface | [packages/agency/src/routes/api/abundance](../../../packages/agency/src/routes/api/abundance) | directory | 8 files |
| MCP/API surface | [config/mcp-hub/registry.json](../../../config/mcp-hub/registry.json) | file | 12031 lines |
| MCP/API surface | [config/mcp-hub/fleet.json](../../../config/mcp-hub/fleet.json) | file | 430 lines |
| Matching agent | [packages/agency/src/lib/abundance/matching.ts](../../../packages/agency/src/lib/abundance/matching.ts) | file | 176 lines |
| Matching agent | [packages/agency/src/routes/api/abundance/match/+server.ts](../../../packages/agency/src/routes/api/abundance/match/+server.ts) | file | 212 lines |
| Matching agent | [packages/agency/src/routes/api/abundance/whatsapp/+server.ts](../../../packages/agency/src/routes/api/abundance/whatsapp/+server.ts) | file | 286 lines |
| Matching agent | [packages/ltd/src/routes/presentations/abundance-system/+page.svelte](../../../packages/ltd/src/routes/presentations/abundance-system/+page.svelte) | file | 303 lines |

## Recent Related Commits

- 92c5bcb00 2026-04-30 Move LTD presentation components into Canon
- 4d42f2f44 2026-03-12 Update nurse acquisition media plan
- ce6127736 2026-03-12 Locate meeting 2026-03-10 2pm CT
- 59d6191fb 2026-03-12 feat: add abundance staffing budget benchmarks
- 2842b0051 2026-03-10 Review and deploy MCP Hub deck
- 3cb80ab9f 2025-12-30 fix(agency): add safeJsonParse utility for abundance endpoints
- bf9132473 2025-12-29 docs(agency): enrich docs with Canon philosophical concepts
- 610ed5f7d 2025-12-13 feat(agency): add abundance assessment and service delivery

## Next Review

- Confirm whether the client-facing vocabulary should stay nurse staffing-specific or preserve the generic Seeker/Talent/Match API names underneath.
- Verify the Staff MCP and Jobs MCP credentials from Infisical before any live agent smoke test, and rotate any token that was shared in chat if it remains active.
- Confirm how Paylocity active-headcount fields should map into staff/operator records before importing or enriching production data.
- Capture real screenshots from the live Abundance app and walkthrough once the client-visible route is promoted.
- Attach Braintrust/eval summaries for the Staff Headcount Agent and MCP surfaces once run artifacts are safe to share.

## Regenerate

```bash
pnpm delivery:abundance
```
