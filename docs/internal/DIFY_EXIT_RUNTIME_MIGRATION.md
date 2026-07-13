# Dify Exit Runtime Migration

**Linear:** CRE-1233

**Runtime:** `packages/owned-agent-runtime`

**Cloudflare Worker:** `https://create-something-agent-runtime.createsomething.workers.dev`

**Rollback:** Keep each provider app and credential intact but unreachable until the approved candidate is deployed and the observation window passes.

## Decision

CREATE SOMETHING owns the agent control layer: provider-neutral HTTP/SSE contracts, agent definitions, MCP allowlists, conversation continuation, policy, and run receipts. OpenAI supplies model execution and Cloudflare supplies compute and D1. Dify Studio and its chat front end are not being reproduced.

Template-reviewer operation remains a separate operator-owned lane. CRE-1233
does not reproduce its former hosted chat UI.

## Runtime acceptance

- Database: D1 stores owned conversation IDs, OpenAI continuation IDs, and normalized completed/failed receipts.
- Automation: the OpenAI Agents SDK streams responses and connects only the MCP servers declared by the selected agent; production reaches repo-owned MCP Workers through Cloudflare service bindings.
- Judgment: each repo-owned agent definition is a policy artifact with an explicit access class and per-server tool allowlist.
- Rollback: provider clients remain in unreachable source and remote credentials
  remain encrypted until an approved deployment proves the route retirement.

The shadow Worker currently receives its OpenAI credential from Infisical `prod:/:WEBFLOW_OPENAI_API_KEY`. This restored live parity after the dedicated pilot key returned `insufficient_quota`; migrate to a funded runtime-specific project key before expanding beyond the Guide Agent.

The OpenAI Agents SDK requires tool names to be unique across all MCP servers attached to one agent. The Guide Agent therefore keeps `three-tier-framework.classify_component` and omits the duplicate `create-something.classify_component`; all other read-only Guide tools remain available.

## Inventory disposition

| Surface | Candidate disposition | Rollback boundary |
| --- | --- | --- |
| `create-something-guide-agent` | Owned Cloudflare/OpenAI runtime with D1 continuation and receipts. | Published provider app stays intact through the observation window. |
| Agency Abundance embedded job agent | Interactive panel removed; endpoint returns `410`; public jobs and the owned delivery-context agent remain. | Restore the prior endpoint and panel commit only if the approved production readback fails. |
| Abundance Concierge operator detail routes | Legacy detail URLs permanently redirect to the public Abundance agent system; no active route imports the provider client. | Unreachable client and registry source remain until observation completes. |
| Ona Agents | Standalone shell becomes a retirement notice; legacy detail URLs permanently redirect to it. | Unreachable client and registry source remain until observation completes. |
| Bettermode creator worker | Direct OpenAI drafting becomes the only agent execution branch. | Unreachable former provider client remains until observation completes. |
| Remaining imported/published provider apps | No CREATE SOMETHING production entrypoint calls them after the candidate is promoted. | Preserve exports and encrypted credentials only until the approved cleanup step. |

## Exact production cleanup manifest

The candidate removes all reads of these bindings. Their remote deletion is a
separate approval-gated operation after deploying and observing the candidate.

| Cloudflare project | Binding names to delete after observation |
| --- | --- |
| `create-something-agency` | `DIFY_ABUNDANCE_HUB_API_KEY` |
| `bettermode-marketplace-creator-agent` | `DIFY_AGENT_API_KEY` |
| `abundance-concierge-chat` | `DIFY_AARON_HUB_API_KEY`, `DIFY_ABUNDANCE_HUB_API_KEY`, `DIFY_BLONDISH_HUB_API_KEY`, `DIFY_C3_HUB_API_KEY`, `DIFY_CREATE_SOMETHING_GUIDE_AGENT_API_KEY`, `DIFY_ERIC_HUB_API_KEY`, `DIFY_MARIANA_HUB_API_KEY`, `DIFY_MORGAN_HUB_API_KEY`, `DIFY_NATALIA_HUB_API_KEY`, `DIFY_PABLO_HUB_API_KEY`, `DIFY_SHEA_HUB_API_KEY`, `DIFY_TEMPLATE_REVIEW_HUB_API_KEY`, `DIFY_VICKI_HUB_API_KEY`, `DIFY_VIV_HUB_API_KEY`, `DIFY_YOUTUBE_TRANSCRIPT_NOTION_AGENT_API_KEY` |
| `ona-agent-chat` | Same 15 provider bindings listed for `abundance-concierge-chat` |

Never print secret values. Read back names only, delete one project at a time,
and attach sanitized Wrangler receipts to `CRE-1233`.

## Promotion gates

Run from `packages/owned-agent-runtime`:

```bash
pnpm test
pnpm check
pnpm smoke
```

`pnpm smoke` ports the Guide Agent's `public-purpose`,
`framework-classification`, and `secret-refusal` cases to the owned Cloudflare
route. A failed case stops promotion. After green parity, deploy the exact
candidate to the four owning Cloudflare projects, verify the retired/redirected
routes and direct OpenAI branch, observe the declared window, and only then
delete the bindings above and archive the remaining provider apps in separately
approved cleanup.
