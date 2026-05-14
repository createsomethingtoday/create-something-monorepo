# Webflow Template Review Hub Eval Suite

Runtime strategy context: [Webflow Template Review Runtime Strategy Brief](./WEBFLOW_TEMPLATE_REVIEW_RUNTIME_STRATEGY_BRIEF_2026-05-14.md).

This Braintrust suite verifies the reviewer-specific Webflow Template Review Hubs:

- Eric: `https://wf-template-review-eric.mcp.createsomething.agency/mcp`
- Natalia: `https://wf-template-review-natalia.mcp.createsomething.agency/mcp`
- Mariana: `https://wf-template-review-mariana.mcp.createsomething.agency/mcp`
- Vicki: `https://wf-template-review-vicki.mcp.createsomething.agency/mcp`

## Command

Local validation without uploading results:

```bash
pnpm braintrust:eval:mcp:webflow-template-hubs:local
```

Braintrust run:

```bash
pnpm braintrust:eval:mcp:webflow-template-hubs
```

The suite uses Infisical when secrets are not exported locally. Required secret locations:

- `prod:/mcp-hub/hubs:CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN`
- `prod:/mcp-hub/hubs:CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN`
- `prod:/mcp-hub/hubs:CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN`
- `prod:/mcp-hub/hubs:CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN`
- `prod:/dify/eric-hub:DIFY_ERIC_HUB_API_KEY`
- `prod:/dify/natalia-hub:DIFY_NATALIA_HUB_API_KEY`
- `prod:/dify/mariana-hub:DIFY_MARIANA_HUB_API_KEY`
- `prod:/dify/vicki-hub:DIFY_VICKI_HUB_API_KEY`

## Coverage

There are 80 cases total: 20 for each reviewer lane.

The checks cover:

- Dify inventory declares the reviewer agent and its Dify API key secret.
- Dify inventory allows only the reviewer-specific Hub MCP server.
- Dify live Service API can call `hub_list_services` without using write-capable Hub tools.
- Reviewer Hub health and `tools/list` are reachable.
- Hub state has `webflow-marketplace-review-phase-a` and `webflow-template-review-mcp` enabled.
- Hub service discovery exposes only `webflow-template-review-mcp`; `webflow-site-analyzer-mcp` and `webflow-local` fail the suite if they appear.
- Hub discovery exposes the expected Phase A reviewer proxy tools and blocks broader admin write tools.
- Airtable-backed reads work through `template_review_health`, `template_review_get_field_map`, `template_review_get_metrics`, `template_review_list_queue`, `template_review_my_queue`, and `template_review_get_review_context`.
- Airtable-backed write access works through a bounded `template_review_assign_self` then `template_review_unassign_self` roundtrip.

## Write Safety

The write probe selects an unassigned `ready_to_review` Asset Version, assigns it to the current reviewer identity, verifies the assignment through `get_review_context`, and unassigns it in cleanup. It does not approve, reject, request changes, publish, update feedback, or mutate template metadata.

For dry-run environments only:

```bash
WEBFLOW_TEMPLATE_REVIEW_EVAL_SKIP_WRITES=true pnpm braintrust:eval:mcp:webflow-template-hubs:local
```
