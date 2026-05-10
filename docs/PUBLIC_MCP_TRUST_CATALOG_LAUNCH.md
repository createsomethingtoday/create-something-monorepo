# Public MCP Trust Catalog Launch

Verified: 2026-05-10

## Public URLs

- Trust catalog: `https://createsomething.agency/mcp-trust-catalog`
- Guide agent listing anchor: `https://createsomething.agency/mcp-trust-catalog#create-something-guide-agent`

The Dify WebApp/embed token is intentionally not derived from the Service API key. If a direct Dify iframe or chat URL is needed, copy the app token from Dify Studio `Publish -> Embed` and store only non-secret public embed metadata in the repo.

## External Listing Copy

**Headline:** Public MCP trust catalog for CREATE SOMETHING

**Short description:** Three no-auth public MCP endpoints plus a read-only Dify guide agent, all mapped to Database, Automation, and Judgment.

**Long description:** CREATE SOMETHING publishes a small, inspectable public trust catalog so builders can see which MCP surfaces are public, what each surface is allowed to expose, and which evidence checks back the catalog. The guide agent explains the same model without private runtime access or enabled tools.

**Bullets:**

- Public endpoints are verified through no-auth MCP initialize and tools/list probes.
- Registry metadata marks included trust cards as direct public catalog entries.
- The guide agent is read-only and refuses credentials, bearer tokens, internal URLs, and private customer data.
- Private Hub, Exa, Notion, Linear, and telemetry surfaces are intentionally outside this public launch surface.

## Public Trust Cards

| Trust card               | Endpoint                                           | Boundary                                                                     |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| CREATE SOMETHING Content | `https://mcp.createsomething.ltd/mcp`              | Public methodology, content, and CREATE SOMETHING source material.           |
| Three-Tier Framework     | `https://framework.mcp.createsomething.agency/mcp` | Database, Automation, and Judgment review language as an MCP surface.        |
| Playbook                 | `https://playbook.mcp.createsomething.ltd/mcp`     | Workflow playbooks, setup guidance, host playbooks, and MCP catalog support. |

## Guide Agent

- Inventory ID: `create-something-guide-agent`
- Runtime: Dify
- Audience: public
- Policy pack: `public-create-something-guide.v1`
- Eval suite: `braintrust:eval:dify:guide`
- Public listing URL: `https://createsomething.agency/mcp-trust-catalog#create-something-guide-agent`
- Boundary: no MCP tools are enabled; the agent does not claim live access to private registries, Dify Studio, Linear, Notion, Cloudflare, or Infisical.

## Verification Commands

```bash
pnpm mcp:registry:check
pnpm dify:inventory:check
pnpm braintrust:eval:mcp:public-trust --no-progress-bars --jsonl
infisical run --env=prod --path=/dify/create-something-guide-agent --include-imports=true -- pnpm dify:guide:smoke
pnpm --filter @create-something/agency check
pnpm --filter @create-something/agency build
```

Local route verification:

- `http://localhost:5173/mcp-trust-catalog` returned HTTP 200.
- Desktop Playwright render confirmed page title, guide-agent text, and public MCP endpoint text.
- Mobile Playwright render confirmed page title, guide-agent text, public MCP endpoint text, and a safe gutter for the site-level floating search control.

## Braintrust Provenance

Upload the public MCP provenance run when `BRAINTRUST_API_KEY` is available. The launch evidence should not include raw Braintrust or Langfuse trace payloads, private Hub traces, Exa results, customer data, or credential-bearing URLs.

Uploaded 2026-05-10:

- Project: `create-something-mcp-fleet`
- Experiment: `public_mcp_trust_cards`
- URL: `https://www.braintrust.dev/app/CREATE%20SOMETHING/p/create-something-mcp-fleet/experiments/public_mcp_trust_cards`
- Scores: `1` for `registry_public_metadata`, `mcp_initialize_ok`, `mcp_tools_list_ok`, `no_auth_required`, `no_secret_markers`, and `latency_budget`.
