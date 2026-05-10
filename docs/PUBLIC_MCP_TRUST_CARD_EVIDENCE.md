# Public MCP Trust Card Evidence

Verified: 2026-05-10

Scope: owned public V1 MCP trust cards only.

The checks below intentionally use direct public MCP endpoints without Authorization
headers. They do not exercise private Hub account isolation, private Exa access,
or operator-only telemetry surfaces.

## Validation Command

```bash
pnpm exec braintrust eval ./evals/braintrust/mcp/public-trust-card.eval.ts --no-send-logs --no-progress-bars --jsonl
```

Result: passed with score `1` for:

- `registry_public_metadata`
- `mcp_initialize_ok`
- `mcp_tools_list_ok`
- `no_auth_required`
- `no_secret_markers`
- `latency_budget`

Uploaded provenance run:

- Project: `create-something-mcp-fleet`
- Experiment: `public_mcp_trust_cards`
- Braintrust URL: `https://www.braintrust.dev/app/CREATE%20SOMETHING/p/create-something-mcp-fleet/experiments/public_mcp_trust_cards`
- Uploaded with `BRAINTRUST_API_KEY` from Infisical on 2026-05-10.

## Live Public MCP Evidence

| Trust card             | Endpoint                                           | Server info                  | Initialize | Initialized notification | Tools list | Tool count |
| ---------------------- | -------------------------------------------------- | ---------------------------- | ---------: | -----------------------: | ---------: | ---------: |
| `create-something`     | `https://mcp.createsomething.ltd/mcp`              | `create-something@1.0.0`     |      `200` |                    `202` |      `200` |        `5` |
| `three-tier-framework` | `https://framework.mcp.createsomething.agency/mcp` | `three-tier-framework@1.0.0` |      `200` |                    `202` |      `200` |        `6` |
| `playbook`             | `https://playbook.mcp.createsomething.ltd/mcp`     | `playbook@1.5.0`             |      `200` |                    `202` |      `200` |       `14` |

## Public Launch Surface

- Public catalog route: `https://createsomething.agency/mcp-trust-catalog`
- Guide agent listing URL: `https://createsomething.agency/mcp-trust-catalog#create-something-guide-agent`
- Launch copy: `docs/PUBLIC_MCP_TRUST_CATALOG_LAUNCH.md`
- Dify inventory: `config/dify/inventory.json` records the guide-agent public URL.

## Public Boundary

- Registry metadata marks all three trust cards as `catalog.include: true`,
  `catalog.requiresAuth: false`, and `catalog_exposure_mode: direct`.
- The eval sends MCP `initialize`, `notifications/initialized`, and `tools/list`
  requests with no Authorization header.
- The Dify guide agent has no enabled MCP tools. Direct Dify WebApp embed tokens
  must be copied from Dify Studio `Publish -> Embed`; do not derive or publish
  anything from the Service API key.
- Evidence excludes raw Braintrust or Langfuse trace payloads.
- Evidence blocks obvious credential markers such as app tokens, OpenAI-style
  `sk-` keys, `secret_` values, and bearer token strings.
