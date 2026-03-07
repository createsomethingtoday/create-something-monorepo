# MCP Implementation Comparison (2026-03-07)

This memo compares current public MCP implementation patterns against CREATE SOMETHING practices and the repo's present implementation state.

## Verdict

CREATE SOMETHING is:

- **Ahead** on architectural framing: house MCP ownership, three-tier separation, and wrapper discipline.
- **Aligned** on remote auth posture and Cloudflare-native remote MCP deployment.
- **Behind** on one execution gap that now matters more in the market: moving from eager large-catalog tool exposure to a fully governed gateway with brokered discovery, centralized quota/retry/authz, and runtime catalog control.

## Comparison Summary

### 1. Tool catalog shape at scale

**Current public pattern**

- Public MCP implementations are moving away from unbounded tool exposure.
- GitHub's official MCP server uses configurable `toolsets` to constrain capability exposure.
- Docker's MCP Gateway centralizes routing and profile-based server availability.

**CREATE SOMETHING practice**

- Prefer brokered discovery for scale: `search` -> `describe` -> `invoke`.
- Avoid eager registration of large connector catalogs to end-user clients.

**Current repo state**

- The stated architecture is correct.
- The implemented bridge still eagerly fetches and registers tool catalogs per configured toolkit.
- The repo's own architecture review already identifies this as Gap A.

**Assessment**: **Behind practice, aligned in direction**

Internal evidence:

- [docs/MCP_GATEWAY_ARCH_REVIEW_2026-02-20.md](./MCP_GATEWAY_ARCH_REVIEW_2026-02-20.md)
- [packages/composio-bridge/src/tool-factory.ts](../packages/composio-bridge/src/tool-factory.ts)
- [packages/cs-mcp-hub/README.md](../packages/cs-mcp-hub/README.md)

External sources:

- [GitHub MCP toolsets](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/provide-context/use-mcp/configure-toolsets)
- [GitHub MCP README](https://github.com/github/github-mcp-server/blob/main/README.md)
- [Docker MCP Gateway](https://docs.docker.com/ai/mcp-catalog-and-toolkit/mcp-gateway/)

### 2. Remote auth and identity

**Current public pattern**

- OAuth 2.1 and bearer-token flows are now the standard baseline for HTTP-based remote MCP.
- The MCP spec and ecosystem docs consistently point to OAuth-based auth for remote servers.
- Clients and platforms increasingly expect public remote servers to support standard auth discovery and token handling.

**CREATE SOMETHING practice**

- Bearer-token governance and managed identity boundaries for remote MCP access.
- Multi-tenant scoping and account-aware routing.

**Current repo state**

- This is aligned with the spec and current platform docs.
- Hub auth classification and bearer-governance direction are consistent with where the market is going.

**Assessment**: **Aligned**

Internal evidence:

- [docs/STRATEGIC_MCP_SECURITY_POLICY_2026-02-27.md](./STRATEGIC_MCP_SECURITY_POLICY_2026-02-27.md)
- [docs/policies/v1/policy.user-bearer-token-governance.v1.md](./policies/v1/policy.user-bearer-token-governance.v1.md)
- [packages/mcp-authz/src/hub.ts](../packages/mcp-authz/src/hub.ts)

External sources:

- [MCP authorization spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)
- [MCP authorization tutorial](https://modelcontextprotocol.io/docs/tutorials/security/authorization)
- [OpenAI MCP guide](https://developers.openai.com/api/docs/mcp/)
- [Anthropic MCP connector](https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector)
- [Cloudflare remote MCP auth guidance](https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/saas-mcp/)

### 3. Resources, tools, and prompts/policy separation

**Current public pattern**

- Most production-facing integrations still skew tool-first.
- Official MCP references demonstrate all three primitives, but commercial platform connectors frequently expose tools only.
- Anthropic's MCP connector currently supports tool calls, not the full MCP primitive surface.

**CREATE SOMETHING practice**

- Treat Resources, Tools, and Prompts as distinct control layers.
- Use the three-tier model as a structural design rule, not just documentation language.

**Current repo state**

- `ScopedMcpServer` operationalizes the separation directly.
- Several MCPs in the repo expose resources and prompts alongside tools.

**Assessment**: **Ahead**

Internal evidence:

- [docs/THREE_TIER_FRAMEWORK.md](./THREE_TIER_FRAMEWORK.md)
- [packages/mcp-core/src/server.ts](../packages/mcp-core/src/server.ts)
- [packages/gmail-notion-mcp/worker/index.ts](../packages/gmail-notion-mcp/worker/index.ts)

External sources:

- [MCP reference servers repo](https://github.com/modelcontextprotocol/servers)
- [Anthropic MCP connector](https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector)

### 4. Commodity SaaS integrations: wrap or expose directly

**Current public pattern**

- Many vendors expose direct, provider-branded MCP servers.
- Public examples often optimize for fastest install, not ownership of the integration layer.

**CREATE SOMETHING practice**

- Use Composio for commodity connectivity when appropriate.
- Keep Composio invisible behind CREATE SOMETHING MCP servers.
- Reserve custom MCPs for deep or client-specific integrations.

**Current repo state**

- This wrap pattern is explicit and consistently documented.
- The bridge package is already structured to preserve house ownership of the MCP surface.

**Assessment**: **Ahead strategically**

Internal evidence:

- [docs/COMPOSIO_PATTERNS.md](./COMPOSIO_PATTERNS.md)
- [docs/MCP_FIRST_THESIS.md](./MCP_FIRST_THESIS.md)
- [packages/composio-bridge/src/client.ts](../packages/composio-bridge/src/client.ts)
- [packages/composio-bridge/src/tool-factory.ts](../packages/composio-bridge/src/tool-factory.ts)

### 5. Gateway governance: quotas, retries, authz, tracing

**Current public pattern**

- Gateway products are increasingly framed as governance layers, not just multiplexers.
- Docker's gateway emphasizes centralized lifecycle, credentials, access control, logging, and tracing.
- The market is converging on a control plane around MCP, not just raw server aggregation.

**CREATE SOMETHING practice**

- One house gateway.
- Centralized authz, quota, retry, rate-limit, and routing policy.

**Current repo state**

- Hub has the right surface area: registry, state, search, discovery, routing, policy status.
- The repo's own readiness docs still mark centralized quota/retry/rate-limit governance as incomplete.
- Dynamic refresh and fully closed operational loops are still partial.

**Assessment**: **Mixed**

Internal evidence:

- [docs/HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md](./HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md)
- [packages/cs-mcp-hub/README.md](../packages/cs-mcp-hub/README.md)
- [packages/mcp-authz/src/hub.ts](../packages/mcp-authz/src/hub.ts)

External sources:

- [Docker MCP Gateway](https://docs.docker.com/ai/mcp-catalog-and-toolkit/mcp-gateway/)

### 6. Deployment and runtime model

**Current public pattern**

- Remote MCP over HTTP is the production baseline.
- Cloudflare now explicitly supports both stateless and stateful remote MCP patterns on Workers.
- Stateful session-bound servers commonly use a coordination layer such as Durable Objects or equivalent.

**CREATE SOMETHING practice**

- Cloudflare Worker-friendly remote MCP deployments.
- Durable Objects where statefulness or coordination is required.

**Current repo state**

- This is aligned with current Cloudflare guidance.
- Existing Worker MCPs already use the right runtime shape for account-aware remote operation.

**Assessment**: **Aligned**

Internal evidence:

- [packages/gmail-notion-mcp/worker/index.ts](../packages/gmail-notion-mcp/worker/index.ts)
- [docs/MCP_HUB_REMOTE_DEPLOY.md](./MCP_HUB_REMOTE_DEPLOY.md)

External sources:

- [Cloudflare remote MCP server guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)

## Scorecard

| Topic | Assessment |
|--------|------------|
| Large-catalog brokered discovery | Behind in implementation, aligned in direction |
| Remote auth and bearer/OAuth posture | Aligned |
| Three-tier primitive separation | Ahead |
| Commodity integration wrap pattern | Ahead strategically |
| Centralized gateway governance | Mixed |
| Cloudflare-native remote runtime | Aligned |

## What This Means

The repo's thesis still holds:

- MCP ownership is more strategic than raw MCP consumption.
- House MCP surfaces are a defensible product choice.
- Policy and primitive separation are stronger here than in many public implementations.

But the next implementation threshold is no longer optional if the goal is a true fleet-scale gateway:

1. Replace eager public tool registration with brokered catalog access for broad connector surfaces.
2. Close the gateway governance gap with centralized retry, quota, rate-limit, and authz enforcement.
3. Keep bearer-token and OAuth patterns first-class for remote multi-tenant access.

## Recommended Next Actions

1. Promote the Hub broker flow from documented direction to default runtime path for large connector catalogs.
2. Add gateway-enforced retry/backoff, quota, and rate-limit middleware around downstream execution.
3. Treat direct eager catalog registration as acceptable only for small, bounded MCP surfaces.
4. Keep the Composio wrap pattern and resist exposing provider-branded commodity MCPs directly to clients unless there is a deliberate GTM reason.
5. Continue using the three-tier framework as a real implementation constraint, not just a messaging layer.

## Source Notes

Research date: **March 7, 2026**

Primary external sources used:

- [Model Context Protocol authorization spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)
- [Model Context Protocol auth tutorial](https://modelcontextprotocol.io/docs/tutorials/security/authorization)
- [OpenAI MCP server guide](https://developers.openai.com/api/docs/mcp/)
- [OpenAI MCP and connectors guide](https://developers.openai.com/api/docs/guides/tools-connectors-mcp/)
- [Anthropic MCP connector](https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector)
- [Cloudflare remote MCP server guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [Cloudflare Access for SaaS MCP auth guide](https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/saas-mcp/)
- [GitHub MCP server README](https://github.com/github/github-mcp-server/blob/main/README.md)
- [GitHub MCP toolset configuration docs](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/provide-context/use-mcp/configure-toolsets)
- [Docker MCP Gateway docs](https://docs.docker.com/ai/mcp-catalog-and-toolkit/mcp-gateway/)
