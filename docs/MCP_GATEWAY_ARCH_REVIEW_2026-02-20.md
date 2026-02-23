# MCP Gateway Architecture Review (2026-02-20)

## Scope

Evaluate whether the current CREATE SOMETHING MCP organization is ready for a **"one MCP fronting hundreds of tools across dozens of SaaS products"** model, and what should change.

## Update (2026-02-23)

`packages/cs-mcp-hub-remote` now ships brokered gateway primitives (`hub_tools_search`, `hub_tools_describe`, `hub_tools_invoke`, `hub_refresh_catalog`) plus centralized policy enforcement (JWT claims auth, scope/capability checks, rate limits, quotas, retry profiles). Legacy `<server>__<tool>` proxies remain enabled by default for backward compatibility.

## Executive verdict

**Short answer:** the current shape is a strong foundation for connector modularity, but it is **not yet shaped as a scalable gateway** for hundreds of tools.

- We already have a clear multi-MCP fleet model and repeatable worker structure.
- We already have a Composio bridge that cleanly isolates connector plumbing.
- But current Composio-backed MCPs still register toolsets eagerly, without brokered discovery/pagination control, and without first-class provider quota/retry governance.

## What the codebase already does well

### 1) Modular connector runtime exists (good)

The project’s official integration direction is to use Composio for commodity app connectivity via `@create-something/composio-bridge`, while keeping custom MCPs for deep/client-specific integrations. This aligns with the proposed **gateway + modular connectors** split. 【F:docs/COMPOSIO_PATTERNS.md†L5-L13】【F:docs/COMPOSIO_PATTERNS.md†L27-L35】

The bridge package explicitly implements the wrap pattern (client sees a CREATE SOMETHING MCP, Composio stays internal). 【F:docs/COMPOSIO_PATTERNS.md†L27-L35】

### 2) Fleet-level organization is explicit (good)

The repo maintains a documented MCP fleet registry, including active cloud deployments and architectural conventions for Worker-based MCPs. This gives operational clarity and repeatability, which is useful when moving toward a gateway pattern. 【F:docs/MCP_FLEET_REGISTRY.md†L1-L13】【F:docs/MCP_FLEET_REGISTRY.md†L92-L101】

### 3) Multi-tenant identity/metering primitives exist (partial)

`gmail-notion-mcp` supports per-request account identity via headers and meters calls to D1. That is a base for tenant-aware policy/quotas. 【F:packages/gmail-notion-mcp/worker/index.ts†L5-L10】【F:packages/gmail-notion-mcp/worker/index.ts†L51-L64】【F:packages/gmail-notion-mcp/worker/index.ts†L85-L97】

## Gaps vs the proposed “one large MCP gateway” target

### Gap A: Tool explosion controls are incomplete

Current Composio tool registration fetches all tools for configured apps and registers them directly as MCP tools. There is no built-in broker flow (`search` → `describe` → execute) in this package, and no cursor-based discovery policy at the gateway layer. 【F:packages/composio-bridge/src/tool-factory.ts†L357-L365】【F:packages/composio-bridge/src/tool-factory.ts†L304-L343】

`ComposioClient.getTools()` pulls tool definitions and maps them eagerly; current usage does not expose a gateway-level pagination/routing interface for large catalogs. 【F:packages/composio-bridge/src/client.ts†L89-L117】

### Gap B: Naming strategy is not yet gateway-grade for multi-provider scale

Tool names are normalized to snake-case and optional underscore prefixes (e.g. `gmail_*`), which works for smaller bundles but is less expressive than fully namespaced dotted capability names for very large catalogs. 【F:packages/composio-bridge/src/tool-factory.ts†L108-L133】【F:packages/gmail-notion-mcp/worker/index.ts†L75-L80】

### Gap C: AuthZ/rate-limit/retry policy is underpowered

`gmail-notion-mcp` documents that identity is client-supplied unless protected by an upstream gateway, and rate limiting is not implemented in the worker. This is explicitly called out as a production concern. 【F:packages/gmail-notion-mcp/docs/SECURITY_AND_SCALE.md†L7-L15】【F:packages/gmail-notion-mcp/docs/SECURITY_AND_SCALE.md†L46-L47】

Composio execution currently delegates directly to SDK calls; there is no shared retry/backoff or provider-specific circuit policy layer in `ComposioClient.executeTool()`. 【F:packages/composio-bridge/src/client.ts†L133-L154】

Metering is best-effort and non-blocking; usage enforcement/hard caps are deferred to an external gateway or future extension. 【F:packages/gmail-notion-mcp/README.md†L52-L59】【F:packages/gmail-notion-mcp/docs/SECURITY_AND_SCALE.md†L24-L27】

### Gap D: Cloudflare state/async planes are not yet first-class in this pattern

The current worker binds D1 + Durable Object for MCP transport, but does not define Queue/Workflow bindings for long-running multi-step jobs in this package. 【F:packages/gmail-notion-mcp/worker/wrangler.toml†L14-L28】

## Recommended target shape (incremental, repo-aligned)

### Phase 1 — Add Gateway Discovery Layer (highest ROI)

Build a dedicated **gateway MCP** package (or evolve an existing top-level MCP) that exposes:

1. `tools.search(query, connector, intent, read_write, tenant)`
2. `tools.describe(tool_names[])`
3. `tools.invoke(name, args)` (or direct invoke by selected tool)

Back this with a **tool registry index** (D1/KV) populated from connector metadata (Composio + custom). Keep `tools/list` thin and paginated; move rich discovery to explicit broker tools.

### Phase 2 — Introduce connector policy runtime

Add connector middleware contracts for:

- auth context resolution (tenant/user/workspace)
- provider-specific retry/backoff profiles
- standardized error translation (429/auth/permission)
- per-provider/per-tool quotas

This can live in `@create-something/composio-bridge` as composable wrappers around `getTools` and `executeTool`.

### Phase 3 — Capability policy engine

Implement capability checks before connector invocation:

- allowed connectors per tenant
- allowed scopes (read/write)
- allowed workspaces/objects
- redaction/PII policy templates

This should run in the gateway, not per connector package.

### Phase 4 — Cloudflare control planes

- **Durable Objects**: only for lock/coordination cases (token refresh lock, idempotency keys, quota buckets)
- **Queues/Workflows**: for bulk syncs, exports, fan-out writes, long retries
- Keep interactive calls on Worker fast path unless durability is required

## Practical cut lines for this repo

Given current structure, the least disruptive path is:

1. Keep existing product/client MCPs (fleet remains useful for domain packages).
2. Add one **"integration gateway MCP"** for broad SaaS connectivity use cases.
3. Reuse `composio-bridge` as connector adapter surface, but stop auto-registering large tool catalogs directly to public clients.
4. Introduce a registry-backed broker so models only inspect a small shortlist per task.

## Answers to the three decision questions (assumptions + impact)

Because this review is codebase-only, not deployment-ops interviews, treat these as defaults:

1. **Multi-tenant vs internal?**
   - Current code already assumes multi-tenant account IDs and per-account metering, so design for multi-tenant as baseline.
2. **Latency target?**
   - Current interactive pattern implies low-latency tool calls; long jobs should be offloaded to async plane.
3. **Read vs write mix?**
   - Current tools include write flows (Notion create/update, send email patterns), so capability/scoping controls are mandatory.

## Final assessment

The current organization is **directionally compatible** with the architecture you described, especially on connector modularity. But to survive true “hundreds of tools / dozens of SaaS” scale, the next step is a **real gateway layer with brokered discovery, registry-backed routing, and centralized policy/quota/retry controls**.
