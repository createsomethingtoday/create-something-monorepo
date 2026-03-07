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

## Recommended Plan

### Priority order

1. **Make brokered discovery the default for broad connector surfaces**
2. **Add real gateway execution governance**
3. **Standardize auth and tenant context end-to-end**
4. **Codify when eager registration is still allowed**
5. **Harden async and long-running execution paths**

### Phase 1: Fix the biggest scaling mismatch

**Recommendation**

Shift broad Composio-backed surfaces away from direct end-user catalog registration and behind the Hub broker path by default.

**Why**

- This is the clearest mismatch between repo practice and current market direction.
- It reduces tool sprawl, improves model selection quality, and creates a clean place for policy enforcement.
- It matches the existing Hub shape instead of requiring a new architecture.

**Concrete repo direction**

- Treat `hub_search_proxy_tools` + `hub_describe_proxy_tool` + `hub_execute_proxy_tool` as the canonical flow for large catalogs.
- Keep direct eager registration only for small bounded surfaces such as focused client MCPs or narrow product-specific toolsets.
- Add an explicit threshold rule for when a package must use the broker path.

**Suggested policy**

- `0-25 tools`: direct registration acceptable
- `26-75 tools`: direct registration only with documented justification
- `75+ tools`: brokered discovery required

### Phase 2: Put governance in the execution path, not just the docs

**Recommendation**

Add centralized execution middleware at the Hub layer for:

- retry/backoff
- quota and rate-limit enforcement
- standardized auth and permission failures
- trace correlation
- write/destructive action review hooks

**Why**

- The Hub already has policy surface area, but the docs still describe quota/retry/rate-limit as incomplete.
- Market expectations are converging on gateways as governance planes, not only routing layers.
- This closes the gap between architectural intent and production readiness.

**Concrete repo direction**

- Extend Hub execution so downstream calls pass through a uniform policy runtime before invocation.
- Reuse the route classification already present in [packages/mcp-authz/src/hub.ts](../packages/mcp-authz/src/hub.ts).
- Make rate-limit and quota controls first-class operational settings, not passive metadata.

**Suggested enforcement order**

1. classify route
2. resolve tenant/account/user context
3. evaluate authz
4. enforce quota/rate-limit
5. apply retry/backoff policy
6. execute downstream call
7. emit trace + usage event

### Phase 3: Normalize remote identity as a platform primitive

**Recommendation**

Standardize one remote identity story across Hub, agency bearer tokens, and remote MCP deployments:

- bearer token for client access
- OAuth for delegated third-party/tool access
- tenant-aware actor context on every request

**Why**

- The external ecosystem is stabilizing around OAuth/bearer expectations for HTTP MCP.
- Your docs already support this direction.
- Fragmented auth stories are where multi-tenant MCP stacks become brittle.

**Concrete repo direction**

- Make `accountId`, `tenantId`, `userId`, and access mode part of the required context shape for remote Hub execution.
- Ensure all remote MCPs use the same interpretation of bearer subject and tenant scoping.
- Keep OAuth handling at the resource/tool boundary, not embedded inconsistently inside individual MCPs.

### Phase 4: Formalize the wrap rule

**Recommendation**

Write and enforce a simple decision rule for connector packaging:

- commodity app connectivity -> Composio behind house MCP
- deep workflow or client-specific domain integration -> custom MCP
- direct provider-branded MCP exposure -> exception path only

**Why**

- This is one of the repo's strongest differentiators.
- Public MCP distribution patterns increasingly optimize for convenience; your moat depends on not collapsing into that default.
- The recommendation needs to be explicit enough that future packages do not drift.

**Concrete repo direction**

- Add a short normative rule to the relevant architecture docs.
- Require new MCP proposals to state why they are `wrapped`, `custom`, or `direct`.
- Treat `direct` as a GTM or operator exception, not an implementation default.

### Phase 5: Separate interactive and async planes more sharply

**Recommendation**

Keep interactive Hub calls fast and policy-heavy, and push long-running sync, export, and fan-out workflows into explicit async control planes.

**Why**

- This matches the repo's own Cloudflare guidance.
- It reduces coupling between gateway latency and connector complexity.
- It creates a better fit for quotas, retries, and durability guarantees.

**Concrete repo direction**

- Interactive Worker path for brokered discovery and short tool calls
- Durable Objects for locks, idempotency keys, and session/coordination state
- Queues or Workflows for sync jobs, retries, exports, and bulk writes

## What I Recommend You Do Next

If the goal is to improve competitive positioning and production readiness quickly, the next three moves should be:

1. **Set a catalog exposure rule now**
   - Declare that broad connector MCPs must use the Hub broker path above a fixed tool-count threshold.
2. **Implement Hub execution middleware next**
   - Close the quota/retry/rate-limit gap before adding more broad connector surfaces.
3. **Unify remote identity semantics**
   - Make bearer subject and tenant scoping consistent across Hub, agency, and remote Worker MCPs.

## What Not To Do

- Do not keep adding broad eager-registered connector MCPs while the Hub governance layer is still partial.
- Do not expose provider-branded commodity MCPs directly just because the ecosystem now makes that easy.
- Do not treat auth, quota, and retry as per-package concerns once a gateway exists.
- Do not collapse the three-tier model into a tools-only production shape unless a client surface explicitly requires that simplification.

## Suggested Decision Rule

Use this default rule when deciding how to ship a new MCP surface:

| Condition | Recommendation |
|-----------|----------------|
| Narrow domain MCP, bounded toolset, clear operator/user audience | Direct MCP surface acceptable |
| Commodity SaaS integration needed for many customers | Wrap with Composio behind house MCP |
| Broad multi-provider catalog or large toolkit surface | Route through Hub broker by default |
| Client-specific workflow, schema, or auth | Build custom MCP |

## Recommended Follow-Up Docs

To turn this into an operating rule set, the highest-value follow-up documents would be:

1. `docs/MCP_CATALOG_EXPOSURE_POLICY.md`
2. `docs/HUB_EXECUTION_GOVERNANCE_PLAN.md`
3. `docs/REMOTE_MCP_IDENTITY_STANDARD.md`

These should convert the recommendation from strategy into build constraints.

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
