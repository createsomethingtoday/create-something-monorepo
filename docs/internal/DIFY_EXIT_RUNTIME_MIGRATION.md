# Dify Exit Runtime Migration

**Linear:** CRE-1233

**Runtime:** `packages/owned-agent-runtime`

**Cloudflare Worker:** `https://create-something-agent-runtime.createsomething.workers.dev`

**Rollback:** Keep each Dify app and credential intact until that agent's owned-runtime parity gates pass.

## Decision

CREATE SOMETHING owns the agent control layer: provider-neutral HTTP/SSE contracts, agent definitions, MCP allowlists, conversation continuation, policy, and run receipts. OpenAI supplies model execution and Cloudflare supplies compute and D1. Dify Studio and its chat front end are not being reproduced.

Template-reviewer migration to Claude Cowork is a separate operator-owned lane and is not implemented by CRE-1233.

## Runtime acceptance

- Database: D1 stores owned conversation IDs, OpenAI continuation IDs, and normalized completed/failed receipts.
- Automation: the OpenAI Agents SDK streams responses and connects only the MCP servers declared by the selected agent; production reaches repo-owned MCP Workers through Cloudflare service bindings.
- Judgment: each repo-owned agent definition is a policy artifact with an explicit access class and per-server tool allowlist.
- Rollback: no Dify app, key, or route is removed during shadow validation.

The shadow Worker currently receives its OpenAI credential from Infisical `prod:/:WEBFLOW_OPENAI_API_KEY`. This restored live parity after the dedicated pilot key returned `insufficient_quota`; migrate to a funded runtime-specific project key before expanding beyond the Guide Agent.

The OpenAI Agents SDK requires tool names to be unique across all MCP servers attached to one agent. The Guide Agent therefore keeps `three-tier-framework.classify_component` and omits the duplicate `create-something.classify_component`; all other read-only Guide tools remain available.

## Inventory disposition

| Agent                                                                                   | Current state | Disposition                                                                                                       |
| --------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `create-something-guide-agent`                                                          | Published     | First owned-runtime shadow slice; deployed; cutover only after all three parity smokes pass.                      |
| `youtube-transcript-notion-agent`                                                       | Published     | Next owned-runtime candidate after Guide parity; requires an explicit-confirmation write policy before shadowing. |
| `abundance-hub`                                                                         | Published     | Migrate after Guide parity; retain its explicit-confirmation write policy and existing app fallback.              |
| `template-review-hub`                                                                   | Imported      | Claude Cowork lane; do not reproduce the Dify UI in the owned runtime.                                            |
| `eric-hub`, `natalia-hub`, `mariana-hub`, `vicki-hub`                                   | Imported      | Template-reviewer Claude Cowork lane; archive only after operator migration evidence.                             |
| `blondish-hub`, `morgan-hub`, `viv-hub`, `c3-hub`, `aaron-hub`, `shea-hub`, `pablo-hub` | Imported      | Hold in Dify; assess usage and owner before choosing owned-runtime migration or archive.                          |

## Promotion gates

Run from `packages/owned-agent-runtime`:

```bash
pnpm test
pnpm check
pnpm smoke
```

`pnpm smoke` ports the Guide Agent's `public-purpose`, `framework-classification`, and `secret-refusal` cases to the owned Cloudflare route. A failed case leaves Dify as the production path. After green parity, update the owning public route, retain the Dify rollback path for an observation window, then remove the Dify app/key in a separately approved cleanup.
