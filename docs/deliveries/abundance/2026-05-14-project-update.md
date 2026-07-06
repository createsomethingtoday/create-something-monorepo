# Abundance Nurse Staffing System Project Update

**Client:** The NP Group
**Client shorthand:** NPG
**Audience:** client_summary
**Generated:** 2026-05-14

Abundance now has a hardened API surface, production-smoked Staff and Jobs MCPs, an NPG scoped hub, and a client-safe delivery package for final review.

## Client Context

This delivery is tied to The NP Group — Abundance AI-native staffing pipeline in CREATE SOMETHING Notion / Agency Ops. The Notion context was reviewed from the CREATE SOMETHING root and its Agency Ops records. The public artifact names the client context, but does not expose private Notion URLs, contacts, or raw workspace data.

## Client Summary

The project has moved from concept into a concrete operating system shape: a live concierge app, profile data, matching data, intake history, hardened API routes, Staff and Jobs MCP endpoints, an NPG scoped hub, walkthrough artifacts, and a client-facing explanation layer.

The current delivery shows the relationship between the created database, the staff/jobs MCP surfaces, the embedded Dify Abundance Hub jobs agent, the Langfuse/Langfuse eval evidence, and the human review boundary: what the system stores, what tools can be called, how behavior is observed, and where recruiter/operator approval still belongs.

Production smoke passed on 2026-05-13 for the public delivery page, delivery ask endpoint, Staff MCP headcount summary, Jobs MCP public listing, NPG scoped hub service/status calls, and Dify Abundance Hub streaming tool use. On 2026-05-14 the Abundance Dify smoke passed all four inventory cases and the published Langfuse eval passed 100%, including Dify Service API health, expected MCP tool use, forbidden write tools, secret refusal, latency, and trace IDs for Langfuse inspection. The scoped hub is reachable, but Jotform, Mailchimp, and WhatsApp currently report connected=false and require NPG account-owner authorization before write-capable automation.

A private Paylocity active-headcount export has been received for staff/operator context. Employee-level rows, token-bearing MCP access, Dify keys, and NPG external account authorization details remain private and are not included in the public delivery.

Remaining production promotion work is operational rather than architectural: provision WhatsApp webhook secrets before enabling Meta webhooks, promote the secured agency build from a clean release branch, confirm Paylocity field mapping, and have NPG account owners review or reauthorize Jotform, Mailchimp, and WhatsApp before write-capable automation.

## DB, MCP, and Agent Map

| Layer | Status | What changed | Evidence |
| --- | --- | --- | --- |
| Created DB | created | The Abundance database model captures seekers/open demand, talent/nurse-side supply, matches, and intake history. The schema is intentionally small so the workflow can be explained and audited. The received Paylocity export is treated as private source data for the next staff/operator integration pass. | [migrations/0001_abundance_network.sql](../../../packages/agency/migrations/0001_abundance_network.sql)<br>[src/app.d.ts](../../../packages/agency/src/app.d.ts) |
| MCP/API surface | production-smoked | The Abundance API has route handlers and an OpenAPI contract, plus tokenless references for Staff MCP, Jobs MCP, and the NPG scoped hub. Bearer credentials remain outside public delivery artifacts. Production smoke passed for Staff MCP, Jobs MCP, and NPG hub management/status calls; Jotform, Mailchimp, and WhatsApp still need NPG authorization because connection_status reports connected=false. | [static/openapi-abundance.yaml](../../../packages/agency/static/openapi-abundance.yaml)<br>[api/abundance](../../../packages/agency/src/routes/api/abundance) |
| Matching agent | ready-for-review | The matching logic can produce an explainable shortlist using skills, budget, and availability. The Dify Abundance Hub agent was production-smoked through streaming Service API with jobs-tool usage, and the published Langfuse eval passed against the Dify/MCP path. The delivery page now embeds a server-side read-only jobs chat for client review. The client-facing rule remains recommendation support, not autonomous staffing decisions. | [dify/abundance-hub.eval.ts](../../../evals/langfuse/dify/abundance-hub.eval.ts)<br>[dify-agents/abundance-hub.json](../../../config/dify-agents/abundance-hub.json) |

## Delivery Artifacts

| Artifact | Visibility | Kind | Link / Status |
| --- | --- | --- | --- |
| Abundance Concierge live app | client_summary | cloudflare_pages_app | [Abundance Concierge live app](https://abundance-concierge-chat.pages.dev/) |
| Abundance Jobs Agent | client_summary | delivery_page_embedded_agent | [Abundance Jobs Agent](https://createsomething.agency/delivery/abundance#job-agent) |
| Nurse Staffing Concierge Progress Walkthrough | client_summary | descript_walkthrough | [Nurse Staffing Concierge Progress Walkthrough](https://share.descript.com/view/RWYv3CqKbEC) |
| Abundance Concierge Pilot Overview | client_summary | descript_walkthrough | [Abundance Concierge Pilot Overview](https://share.descript.com/view/0wxPcYQzl8G) |
| Abundance Staff MCP | private_internal | remote_mcp_server | [Abundance Staff MCP](https://abundance-staff-mcp.createsomething.workers.dev/mcp) |
| Abundance Jobs MCP | private_internal | remote_mcp_server | [Abundance Jobs MCP](https://abundance-jobs-mcp.createsomething.workers.dev/mcp) |
| Paylocity Active Headcount export | private_internal | private_csv_export | Received private Paylocity export with 198 employee rows and 20 columns. Raw rows, local file path, and employee-level data are intentionally excluded from the public delivery. |
| Abundance Hub Dify agent config | private_internal | external_agent_config | Dify Abundance Hub agent configuration for public nursing job discovery. The delivery page now embeds the agent through a server-side read-only chat panel. The Service API key remains in Infisical, and Dify smoke plus the published Langfuse eval passed without exposing secret values. |

## Delivery Images

![Abundance Delivery Graph](assets/abundance-delivery-graph-2026-05-14.png)

![Abundance Evidence Map](assets/abundance-evidence-map-2026-05-14.png)

### Image 2 Prompt Sources

These image prompts target gpt-image-2 and are stored with the delivery assets.

- [abundance-image2-delivery-graph-2026-05-14.txt](assets/prompts/abundance-image2-delivery-graph-2026-05-14.txt)
- [abundance-image2-evidence-map-2026-05-14.txt](assets/prompts/abundance-image2-evidence-map-2026-05-14.txt)

## Client-Ready Update

We have the first durable Abundance system shape in place: a live nurse-facing concierge app, a database for nurse/candidate-side profile history and matching state, hardened callable workflow routes, deployed Staff and Jobs MCP endpoints, an NPG scoped hub, and a matching layer that returns visible reasons rather than black-box decisions.

The current implementation supports the core operating path: capture profile context, preserve intake history, create or update demand/supply records, generate suggested matches idempotently, and keep the recruiter/human review boundary visible.

The production smoke on 2026-05-13 passed for the public delivery surface, Staff MCP headcount summary, Jobs MCP public listing, NPG scoped hub service/status calls, and Dify Abundance Hub streaming job-tool use. On 2026-05-14 the Dify smoke and published Langfuse eval passed for the Abundance agent/MCP path, with Dify message and conversation IDs available for Langfuse trace inspection. The delivery page now includes a server-side embedded jobs chat panel constrained to read-only public job discovery. The scoped hub is reachable, but Jotform, Mailchimp, and WhatsApp still need account-owner authorization before write-capable automation.

We also received the Paylocity active-headcount export as private source data for the next staff/operator integration pass. That data is acknowledged here as an artifact, but employee-level records are not included in the public delivery.

The next useful review is a walkthrough of the live app, DB, callable actions, Staff/Jobs MCP boundaries, NPG hub boundaries, and agent recommendation boundary using the generated delivery page and walkthrough artifacts.

## Repo Evidence

| Component | Path | Type | Details |
| --- | --- | --- | --- |
| Created DB | [packages/agency/migrations/0001_abundance_network.sql](../../../packages/agency/migrations/0001_abundance_network.sql) | file | 155 lines |
| Created DB | [packages/agency/src/app.d.ts](../../../packages/agency/src/app.d.ts) | file | 102 lines |
| Created DB | [packages/agency/docs/ABUNDANCE_NETWORK_SYSTEM_DOCUMENTATION.md](../../../packages/agency/docs/ABUNDANCE_NETWORK_SYSTEM_DOCUMENTATION.md) | file | 552 lines |
| MCP/API surface | [packages/agency/static/openapi-abundance.yaml](../../../packages/agency/static/openapi-abundance.yaml) | file | 839 lines |
| MCP/API surface | [packages/agency/src/routes/api/abundance](../../../packages/agency/src/routes/api/abundance) | directory | 8 files |
| MCP/API surface | [config/mcp-hub/registry.json](../../../config/mcp-hub/registry.json) | file | 16508 lines |
| MCP/API surface | [config/mcp-hub/fleet.json](../../../config/mcp-hub/fleet.json) | file | 497 lines |
| Matching agent | [evals/langfuse/dify/abundance-hub.eval.ts](../../../evals/langfuse/dify/abundance-hub.eval.ts) | file | 431 lines |
| Matching agent | [config/dify-agents/abundance-hub.json](../../../config/dify-agents/abundance-hub.json) | file | 131 lines |
| Matching agent | [config/dify/inventory.json](../../../config/dify/inventory.json) | file | 2834 lines |
| Matching agent | [packages/agency/src/lib/abundance/matching.ts](../../../packages/agency/src/lib/abundance/matching.ts) | file | 176 lines |
| Matching agent | [packages/agency/src/routes/api/abundance/match/+server.ts](../../../packages/agency/src/routes/api/abundance/match/+server.ts) | file | 237 lines |
| Matching agent | [packages/agency/src/routes/api/abundance/whatsapp/+server.ts](../../../packages/agency/src/routes/api/abundance/whatsapp/+server.ts) | file | 352 lines |
| Matching agent | [packages/ltd/src/routes/presentations/abundance-system/+page.svelte](../../../packages/ltd/src/routes/presentations/abundance-system/+page.svelte) | file | 303 lines |

## Recent Related Commits

- 8bcf02fc2 2026-05-09 Add public MCP and agent trust catalog
- 7a26bc36d 2026-04-30 Codify Vicki Dify Hub agent
- 06e3cec37 2026-04-30 Codify Mariana Dify Hub agent
- c5da1af92 2026-04-30 Codify Natalia Dify Hub agent
- 7f617ffdf 2026-04-30 Codify Eric Dify Hub agent
- 534c65ad4 2026-04-30 Codify Pablo Dify Hub agent
- c4a19bfcf 2026-04-30 Codify Shea Dify Hub agent
- 73aee1e49 2026-04-30 Codify Abundance Dify Hub agent

## Next Review

- Provision WHATSAPP_VERIFY_TOKEN and WHATSAPP_APP_SECRET in the Cloudflare Pages production environment before enabling the Meta webhook route.
- Promote the secured Abundance API build from a clean release branch or clean deployment workspace after the Abundance hardening tests and agency check pass.
- Have NPG account owners review or reauthorize Jotform, Mailchimp, and WhatsApp before allowing write-capable automation through the scoped hub.
- Confirm how Paylocity active-headcount fields should map into staff/operator records before importing or enriching production data.
- Confirm the operator roster and access owner for MCP/database access.

## Regenerate

```bash
pnpm delivery:abundance
```
