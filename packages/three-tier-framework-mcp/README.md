# Three-Tier Framework MCP Server

The Three-Tier Framework (Database, Automation, Judgment) exposed as an MCP server. This is the first server in the CREATE SOMETHING monorepo to use all three MCP primitives — Resources, Tools, and Prompts.

## Framework Tier

This MCP server is the Three-Tier Framework itself, exposed through MCP. It demonstrates its own thesis by using all three MCP primitives in exactly the mapping the framework describes.

| Tier | MCP Primitive | Role in This Server |
|------|---------------|---------------------|
| **Database** | Resources | Framework definitions, mappings, reference data as structured content |
| **Automation** | Tools | Classification, debugging heuristic, architecture analysis |
| **Judgment** | Prompts | Architecture review templates, tier analysis, design guidance |

**The recursive property**: This server demonstrates its own thesis — the framework that describes how MCP primitives map to tiers is itself an MCP server using those primitives in exactly that mapping.

## Resources (Database Tier)

Application-controlled data that agents can read and reference.

| URI | Description |
|-----|-------------|
| `framework://definitions` | All three tier definitions as structured JSON |
| `framework://definitions/{tier}` | Individual tier definition (database, automation, judgment) |
| `framework://crosscutting` | Four cross-cutting concerns: Touchpoints, Artifacts, Orchestration, Insight |
| `framework://mappings/mcp` | MCP primitive-to-tier convergence table |
| `framework://mappings/cloudflare` | Cloudflare service-to-tier mapping |
| `framework://mappings/automotive` | Automotive metaphor-to-tier mapping |
| `framework://sampling` | Recursive sampling property explanation |
| `framework://policy-as-artifact` | Policy-as-artifact concept with implications |
| `framework://full` | Complete framework document as markdown |

## Tools (Automation Tier)

Model-controlled functions agents invoke during reasoning.

| Tool | Purpose |
|------|---------|
| `classify_component` | Classify a component/service into tier(s) with confidence and rationale |
| `debug_system` | Apply the causality heuristic (Database -> Automation -> Judgment) to a failure |
| `analyze_mcp_server` | Map an MCP server's primitives to framework tiers, find gaps |
| `identify_policy_artifacts` | Find constraints that should be treated as artifacts flowing through tiers |
| `map_to_automotive` | Map components to the Automotive Framework vocabulary |

## Prompts (Judgment Tier)

User-controlled templates that shape how agents reason.

| Prompt | Purpose |
|--------|---------|
| `architecture_review` | Review a system against the three-tier model |
| `tier_analysis` | Analyze which tier(s) a new feature should target |
| `policy_audit` | Audit policy artifacts — versioned? contextual? reflexive? |
| `mcp_design` | Design an MCP server using the framework as guide |
| `debugging_session` | Structured debugging session via causality heuristic |

## Remote Server (Production)

The framework is deployed as a Cloudflare Worker with Streamable HTTP transport:

**URL**: `https://framework.mcp.createsomething.agency`

No installation, no API keys, no setup. Point any MCP client at the URL.

### Claude Code

```bash
claude mcp add three-tier-framework --transport http https://framework.mcp.createsomething.agency/mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "three-tier-framework": {
      "url": "https://framework.mcp.createsomething.agency/mcp"
    }
  }
}
```

### OpenAI Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers."three-tier-framework"]
url = "https://framework.mcp.createsomething.agency/mcp"
```

### Cursor

Add as SSE MCP server with URL:

```
https://framework.mcp.createsomething.agency/sse
```

## Local Development (stdio)

For local development, the stdio transport server is also available:

```bash
# Build
pnpm --filter=@create-something/three-tier-framework-mcp build

# Run locally
node packages/three-tier-framework-mcp/dist/index.js

# Add to Claude Code (local)
claude mcp add three-tier-framework-local -- node "$(pwd)/packages/three-tier-framework-mcp/dist/index.js"
```

## Worker Development

```bash
cd packages/three-tier-framework-mcp/worker

# Local dev server
npm run dev

# Deploy to production
npm run deploy

# Tail production logs
npm run tail
```

## Sampling Feedback Loop (Recursive Property)

Tools accept an optional `validate` parameter. When `true`, the tool asks the LLM to validate its heuristic output via MCP sampling -- the recursive property in action (Automation requesting Judgment).

```
classify_component({ description: "Redis cache", validate: true })
```

Returns:
```json
{
  "primary": "database",
  "tiers": [{ "tier": "database", "confidence": 0.95, "signals": ["cache"] }],
  "rationale": "Classified as Database tier...",
  "validation": {
    "validated": true,
    "refinement": "VALID. Redis is a Database tier component..."
  }
}
```

Graceful degradation: if the client doesn't support sampling, the raw heuristic result is returned without validation. No breakage.

## Verification

After configuring, verify the server is working by asking your agent:

- "Read the framework://definitions resource" (tests Resources / Database tier)
- "Use the classify_component tool to classify a Redis cache" (tests Tools / Automation tier)
- "Use the architecture_review prompt for my system" (tests Prompts / Judgment tier)

## Architecture

Two transports, one codebase:

| Transport | URL | Use Case |
|-----------|-----|----------|
| **Streamable HTTP** | `.../mcp` | Claude Code, Codex, remote clients |
| **SSE** | `.../sse` | Cursor, legacy clients |
| **stdio** | `dist/index.js` | Local development |

Zero external dependencies. The framework data is embedded in source. The Worker runs on Cloudflare's edge network (globally distributed, zero cold start). Pure knowledge served through protocol.

See [docs/THREE_TIER_FRAMEWORK.md](../../docs/THREE_TIER_FRAMEWORK.md) for the full framework document.
