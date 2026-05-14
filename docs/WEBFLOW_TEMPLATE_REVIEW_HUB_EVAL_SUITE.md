# Webflow Template Review Hub And Dify Eval Suites

Runtime strategy context: [Webflow Template Review Runtime Strategy Brief](./WEBFLOW_TEMPLATE_REVIEW_RUNTIME_STRATEGY_BRIEF_2026-05-14.md).

These Braintrust suites verify the reviewer-specific Webflow Template Review Hubs, the Dify reviewer agents, and the capture-session workflow that replaced analyzer-only dependency.

Central connector context: [Webflow Template Review Central MCP Connector](./WEBFLOW_TEMPLATE_REVIEW_CENTRAL_MCP_CONNECTOR.md).

## Reviewer Lanes

- Central Claude/Gumloop connector: `https://wf-template-review.mcp.createsomething.agency/mcp`
- Eric: `https://wf-template-review-eric.mcp.createsomething.agency/mcp`
- Natalia: `https://wf-template-review-natalia.mcp.createsomething.agency/mcp`
- Mariana: `https://wf-template-review-mariana.mcp.createsomething.agency/mcp`
- Vicki: `https://wf-template-review-vicki.mcp.createsomething.agency/mcp`

## Commands

MCP Hub/Airtable validation:

```bash
pnpm braintrust:eval:mcp:webflow-template-hubs:local
```

Braintrust run:

```bash
pnpm braintrust:eval:mcp:webflow-template-hubs
```

Dify comprehensive reviewer validation:

```bash
pnpm braintrust:eval:dify:webflow-template-review:local
pnpm braintrust:eval:dify:webflow-template-review
```

Dify trust workflow validation:

```bash
pnpm braintrust:eval:dify:webflow-template-review:trust:local
pnpm braintrust:eval:dify:webflow-template-review:trust
```

Focused Eric E2B public-site validation:

```bash
pnpm braintrust:eval:dify:webflow-template-review-e2b:local
pnpm braintrust:eval:dify:webflow-template-review-e2b
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

## MCP Hub/Airtable Coverage

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

## Dify Comprehensive Coverage

The comprehensive Dify suite covers the reviewer agents across three surfaces:

- E2B-backed public-site review prompts.
- Hub/Airtable read-only prompts for queue, context, metrics, and field-map access.
- No-write guardrail prompts that should not mutate Airtable without explicit approval.

The suite expects the Dify agents to use the Webflow Template Review Hub proxy tools, avoid forbidden direct tools, avoid analyzer fallback, and keep public-site findings caveated as public evidence rather than Designer/API evidence.

## Dify Trust Workflow Coverage

The trust workflow suite covers the behavior that PMM and reviewer enablement care about most:

- Multi-turn capture continuity across `template_review_start_capture_session`, `template_review_continue_capture_session`, and `template_review_draft_from_capture_session`.
- Evidence-bound natural review prompts.
- Live Hub/Dify drift checks, including expected capture tools and analyzer absence.
- Prompt-injection boundaries for public page text, designer-entered copy, scripts, metadata, and captured content.
- Approval-gated write roundtrip behavior. This is skipped by default unless `WEBFLOW_TEMPLATE_REVIEW_EVAL_ENABLE_DIFY_WRITES=true` is explicitly set.

## Write Safety

The write probe selects an unassigned `ready_to_review` Asset Version, assigns it to the current reviewer identity, verifies the assignment through `get_review_context`, and unassigns it in cleanup. It does not approve, reject, request changes, publish, update feedback, or mutate template metadata.

For dry-run environments only:

```bash
WEBFLOW_TEMPLATE_REVIEW_EVAL_SKIP_WRITES=true pnpm braintrust:eval:mcp:webflow-template-hubs:local
```

## Remaining Eval Gaps

These gaps should be tracked before expanding beyond the Dify baseline:

- Structural `capture_state` validation, not only tool sequence validation.
- Adversarial reviewer identity isolation, including prompt-spoofed identity and cross-reviewer mutation attempts.
- Central endpoint live identity evals using two reviewer tokens against `wf-template-review`.
- Live reversible write roundtrips for `request_changes`, `save_draft_feedback`, and status updates.
- Prompt-injection fixtures where the malicious instruction is captured from an actual public page.
- Mechanical Claude proper and Gumloop runtime evals after those surfaces are connected through the Hub.
