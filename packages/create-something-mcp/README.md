# CREATE SOMETHING Content MCP

The single entry point to all CREATE SOMETHING content: philosophy, research, design system, patterns, practices, and workflow playbooks. Demonstrates the Three-Tier Framework by using all three MCP primitives.

## Framework Tier

| Tier | MCP Primitive | Role in This Server |
|------|---------------|---------------------|
| **Database** | Resources | Papers, Canon design system, patterns, masters, framework, graph, praxis, products, playbooks |
| **Automation** | Tools | Cross-property search, knowledge graph traversal, component classification, triad analysis, design audit |
| **Judgment** | Prompts | Architecture review, design review, triad analysis, MCP design, research dive, workflow setup, host comparison, project structure |

## Resources (Database Tier)

Content from all CREATE SOMETHING properties.

| URI Pattern | Property | Description |
|-------------|----------|-------------|
| `papers://list`, `papers://{slug}` | .io | Research papers on methodology, architecture, philosophy |
| `canon://list`, `canon://{slug}` | .ltd | Canon Design System pages (foundations, concepts, guidelines) |
| `patterns://list`, `patterns://{slug}` | .ltd | Design patterns from the CREATE SOMETHING philosophy |
| `masters://list`, `masters://{slug}` | .ltd | Philosophical and design masters (Rams, Heidegger, etc.) |
| `framework://definitions`, `framework://definitions/{tier}` | framework | Three-Tier Framework definitions |
| `framework://crosscutting` | framework | Four cross-cutting concerns |
| `framework://mappings/{type}` | framework | MCP, Cloudflare, Automotive mappings |
| `framework://sampling` | framework | Recursive sampling property |
| `framework://policy-as-artifact` | framework | Policy-as-artifact concept |
| `graph://nodes`, `graph://edges` | .io | Knowledge graph (edges lazy-loaded) |
| `praxis://exercises` | .space | Interactive coding exercises |
| `products://list` | .agency | Products and services |
| `playbooks://list`, `playbooks://hosts/{slug}` | playbook | Host workflow playbooks (via @create-something/playbook-mcp) |
| `playbooks://comparison` | playbook | Host comparison matrix by task type |
| `playbooks://graduation-path` | playbook | Graduation path: Claude Desktop -> Cursor -> Codex |

## Tools (Automation Tier)

| Tool | Purpose |
|------|---------|
| `search` | Cross-property full-text search across all content types. Supports type and property filtering. |
| `relate` | Knowledge graph traversal. Find related concepts with configurable depth. |
| `classify_component` | Classify a component into Three-Tier Framework tier(s) with confidence and rationale. |
| `apply_triad` | Apply the Subtractive Triad (DRY, Rams, Heidegger) to an artifact. |
| `audit_design` | Audit a design against the Canon Design System. |

## Prompts (Judgment Tier)

| Prompt | Purpose |
|--------|---------|
| `architecture_review` | Review a system against the Three-Tier Framework |
| `design_review` | Review a design against Canon principles |
| `triad_analysis` | Apply the Subtractive Triad to any artifact or decision |
| `mcp_design` | Design an MCP server using the framework as guide |
| `research_dive` | Deep-dive into a research topic using papers and graph |
| `workflow_setup` | Personalized workflow guide for MCP host onboarding |
| `host_comparison` | Opinionated host recommendation for a task type |
| `project_structure` | Generate recommended project structure for AI-assisted work |

## Remote Server (Production)

**URL**: `https://mcp.createsomething.ltd`

### Claude Code

```bash
claude mcp add create-something --transport http https://mcp.createsomething.ltd/mcp
```

### Claude Desktop

```json
{
  "mcpServers": {
    "create-something": {
      "url": "https://mcp.createsomething.ltd/mcp"
    }
  }
}
```

### Codex

```toml
[mcp_servers."create-something"]
url = "https://mcp.createsomething.ltd/mcp"
```

### Cursor

```json
{
  "mcpServers": {
    "create-something": {
      "url": "https://mcp.createsomething.ltd/mcp"
    }
  }
}
```

## Local Development (stdio)

```bash
# Build content + TypeScript
pnpm --filter=@create-something/mcp build

# Run locally
node packages/create-something-mcp/dist/index.js
```

## Worker Development

```bash
cd packages/create-something-mcp/worker

npm install
npm run dev      # Local dev server
npm run deploy   # Deploy to production
npm run tail     # Tail production logs
```

## Content Pipeline

Content is extracted from the monorepo's source files and compiled into JSON:

```bash
pnpm --filter=@create-something/mcp build:content
```

This generates files in `src/content/generated/` (papers, canon, patterns, graph). Other content (masters, praxis, products, framework) is hand-authored in `src/content/`.

Playbook data is imported from `@create-something/playbook-mcp` (canonical source) — not duplicated.

## Architecture

| Transport | URL | Use Case |
|-----------|-----|----------|
| **Streamable HTTP** | `.../mcp` | Claude Code, Codex, remote clients |
| **SSE** | `.../sse` | Legacy clients (deprecated in MCP spec 2025-03-26) |
| **stdio** | `dist/index.js` | Local development |

Zero external runtime dependencies. All content embedded in source. Knowledge graph edges lazy-loaded on request.
