# Composio Vendor Evaluation

**Status**: Decision Recorded — **CONDITIONAL ADOPT** (Phase 1 complete; Phase 2 pilot pending)  
**Date**: February 2026  
**Package**: `packages/composio-bridge/`

## Executive Summary

Evaluating [Composio](https://composio.dev) as invisible infrastructure for commodity MCP integrations via the **wrap pattern**: clients see CREATE SOMETHING MCP servers, Composio is plumbing underneath.

**Thesis**: MCP consumption is commoditized. MCP creation is not. Composio addresses commodity integrations (Slack, HubSpot, Jira) so .agency can focus on deep domain MCPs (QuickBooks, scheduling, substrate) and the Intelligence Layer.

## Decision Criteria

| Criterion | Weight | Threshold | Notes |
|-----------|--------|-----------|-------|
| **Workers Compatibility** | Hard gate | Must work in CF Workers | SDK lists Workers support; needs verification |
| **Tool Definition Quality** | High | 80%+ schemas typed | Determines if LLM function calling is reliable |
| **Latency** | Medium | < 2s health, < 5s discovery | Composio adds a network hop |
| **Auth Flow** | Medium | OAuth works for 3+ apps | Slack, HubSpot, Salesforce minimum |
| **Cost** | Low | < $100/mo at eval scale | Free tier (20K calls) covers evaluation |
| **SDK Stability** | Medium | No breaking changes monthly | Recently renamed `composio-core` → `@composio/core` |

## The Wrap Pattern

```
Client Request: "Connect my HubSpot to AI"
    ↓
CREATE SOMETHING MCP Server (client-facing)
    ├── Intelligence Layer (Skills, Agents) ← The margin
    ├── Three-Tier alignment ← The framework
    └── Composio SDK (internal) ← The plumbing
        └── HubSpot OAuth + CRUD ← Commodity
```

**Key invariant**: The client never knows Composio exists. `mcp-core` is always the server framework. Composio is swappable.

## Integration Architecture

### Bridge Package

`@create-something/composio-bridge` provides:

- **ComposioToolFactory** — fetches tool definitions from Composio, registers them as standard MCP tools on a `ScopedMcpServer`
- **ComposioAuthProvider** — implements mcp-core's `AuthProvider`, delegating OAuth to Composio's managed auth
- **ComposioClient** — thin, Workers-safe wrapper over `@composio/client`

### Three-Tier Alignment

| Tier | Bridge Component | What It Does |
|------|-----------------|--------------|
| **Database** | `ComposioAccount`, `ComposioTokenProvider` | Connected account state, token delegation |
| **Automation** | `ComposioToolFactory`, `ComposioClient` | Tool registration and execution |
| **Judgment** | `ComposioAuthProvider`, policy resolution | Account-scoped policy enforcement |

### Usage Example

```typescript
import { createScopedServer } from '@create-something/mcp-core';
import { ComposioToolFactory, ComposioAuthProvider } from '@create-something/composio-bridge';

const server = createScopedServer({
  name: 'client-mcp',
  version: '1.0.0',
  authProvider: new ComposioAuthProvider({
    apiKey: env.COMPOSIO_API_KEY,
  }),
});

// Register commodity tools via Composio
const factory = new ComposioToolFactory({
  apiKey: env.COMPOSIO_API_KEY,
  apps: ['SLACK', 'HUBSPOT'],
});
await factory.registerTools(server);

// Register deep/custom tools directly
server.tool('quickbooks_sync', 'Sync QuickBooks GL to Notion', schema, handler);

await server.serveStdio();
```

## Decision Matrix: When to Use What

| Client Ask | Build | Rationale |
|-----------|-------|-----------|
| "Connect QuickBooks with Notion sync" | **Custom** | Deep domain logic (GL mapping, reconciliation) |
| "Connect HubSpot for lead notifications" | **Composio** | CRUD, no domain logic |
| "Build scheduling MCP with conflict detection" | **Custom** | Complex orchestration, backfill |
| "Connect Slack for daily standup summaries" | **Composio** | CRUD read + Intelligence Layer |
| "Integrate Salesforce for pipeline reporting" | **Hybrid** | Composio for CRUD, custom for reporting logic |
| "Keep Notion in sync with HubSpot contacts" | **Nango** | Two-way data sync (different platform) |
| "Build the Procore MCP for construction" | **Custom** | Deep vertical, the creation moat |

### Classification Heuristic

1. Does it need **domain-specific logic** beyond CRUD? → **Custom**
2. Does it need **Three-Tier alignment** (Resources + Prompts)? → **Custom**
3. Does it need **two-way data sync**? → **Nango** ($500/mo)
4. Is it standard CRUD with managed OAuth? → **Composio** ($29/mo)

## Evaluation Tests

Run the evaluation suite:

```bash
# Workers compatibility (no API key needed)
pnpm --filter=composio-bridge eval:workers

# Full evaluation (needs API key)
COMPOSIO_API_KEY=... pnpm --filter=composio-bridge eval:all
```

### Test Categories

| Category | Script | What It Tests |
|----------|--------|---------------|
| **Workers Compat** | `eval/workers-compat.ts` | SDK import, instantiation, fetch, Node.js builtins |
| **Latency** | `eval/latency-bench.ts` | Health check, tool discovery, tool listing |
| **Tool Quality** | `eval/tool-quality.ts` | Schema completeness, descriptions, naming, CRUD coverage |
| **Auth Flow** | `eval/auth-flow.ts` | Provider resolution, token provider, connected accounts |

### Results (from `packages/composio-bridge/eval-report.json`, run on 2026-02-10)

| Test | Result | Details |
|------|--------|---------|
| SDK Import | Pass | `@composio/core` imported successfully with `Composio` class |
| Client Instantiation | Pass | Composio client instantiated successfully |
| Fetch Compatibility | Pass | SDK uses standard fetch (Workers-compatible) |
| No Node.js Builtins | Pass | No Node.js built-in dependencies detected |
| Health Check Latency | Pass | 305-390ms average (threshold <2s) |
| Tool Discovery Latency | Pass | 192-214ms, 20 tools discovered (threshold <5s) |
| Single App Tools | Pass | 20 `GITHUB` tools discovered |
| Schema Completeness | Pass | 100% typed, 100% described, 100% schema coverage (20 tools / 165 params) |
| Description Quality | Pass | 100% substantive descriptions |
| Naming Conventions | Pass | 100% UPPER_SNAKE_CASE with app prefix |
| CRUD Coverage | Pass | CRUD coverage present in tested toolkit set |
| Auth Provider Resolve | Pass | AccountContext resolved correctly |
| Token Provider | Pass | Returns Composio API key; app OAuth handled by Composio |
| Connected Accounts | Pass | API path works; 0 accounts expected for fresh test entity |
| HTTP Request Auth | Pass | Header-based account resolution verified |

## Risk Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Vendor dependency | Medium | MIT-licensed SDK, can fork. Wrapper pattern = internal swap. |
| Moat erosion | High | Only use for commodity. Never for core value. |
| Edge incompatibility | Medium | Gated on Workers eval. Fallback: own auth. |
| Cost at scale | Low | $29-229/mo negligible vs client billing. |
| Client perception | Low | Composio invisible — client sees CREATE SOMETHING. |
| Composio downtime | Medium | Critical integrations stay custom. Composio for nice-to-haves. |
| Composio pivots/dies | Medium | MIT license = fork. Wrapper pattern = contained blast radius. |

## Red Lines

| Do | Don't |
|----|-------|
| Use Composio as invisible infrastructure | List Composio as a partner on .agency site |
| Wrap their tools in your MCPs | Expose Composio directly to clients |
| Fork their MIT code if needed | Depend on their uptime for client SLAs |
| Learn from their integration patterns | Copy their positioning |
| Use for commodity CRUD integrations | Use for deep domain MCPs |

## Pricing Context

### Composio (Feb 2026)

| Tier | Price | Tool Calls/mo | Connected Accounts |
|------|-------|--------------|-------------------|
| Free | $0 | 20K | 1K |
| Paid | $29 | 200K | 30K |
| Business | $229 | 2M | 100K |

### Nango (alternative for data sync)

| Tier | Price | Key Feature |
|------|-------|-------------|
| Starter | $50/mo | 20 connections, basic sync |
| Growth | $500/mo | 100 connections, SOC2, custom branding, HIPAA add-on |

### .agency Client Billing

| Service Tier | What Client Gets | Internal Implementation | Client Price | COGS |
|-------------|------------------|----------------------|-------------|------|
| Custom MCP | Deep domain workflow | In-house build | $5,000-15,000 | Dev time |
| Standard Integration | Connect tool X to AI | Composio-wrapped MCP | $1,500-3,000 | $29/mo + 3 hrs |
| Intelligence Layer | Skills + Agents on top | Custom code | $3,000-10,000/mo | Dev time |

## Phase Plan

### Phase 1: Technical Evaluation (1 week) — COMPLETE

- [x] Create `composio-bridge` package with wrap pattern architecture
- [x] Install Composio SDK, run Workers compatibility tests
- [x] Run full evaluation suite with API key
- [x] Document results in this file

### Phase 2: Client Pilot (2 weeks) — NEXT

- [ ] Pick next .agency client request needing a long-tail integration
- [ ] Build it with Composio-wrapped MCP using the bridge
- [ ] Compare: time to build, client experience, depth limitations
- [ ] Test Intelligence Layer on top of Composio tools

### Phase 3: Decision Gate

- **Adopt if**: Workers-compatible, tool depth sufficient for CRUD, cost < $100/mo
- **Reject if**: Not Workers-compatible, tools too shallow, auth UX poor
- **Conditional if**: Mostly works but needs workarounds (document them)
- **Decision (2026-02-21)**: **Conditional adopt** based on 29/29 passing technical evals and wrap-pattern fit, with pilot closure required before marking full program completion.

## Go/No-Go Decision

**Recommendation**: **CONDITIONAL ADOPT**  
**Date**: **2026-02-21**  
**Decided by**: **CREATE SOMETHING engineering documentation review**

**Scope of this recommendation**

- **GO** for commodity CRUD integrations where Composio remains invisible behind CREATE SOMETHING MCP servers.
- **NO-GO** for deep domain or client-SLA-critical integrations where custom MCP remains the primary path.
- **Required to reach full completion**: finish one client pilot (Phase 2) and keep canonical decision docs synchronized with eval artifacts.
