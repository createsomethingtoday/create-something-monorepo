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
| `canon://registry`, `canon://registry/list`, `canon://registry/{id}` | .ltd | Machine-readable Canon registry for components, tokens, templates, adapters, policies, and modalities |
| `canon://overlays/candidates/...` | .ltd | Canon overlay candidate queue, handoffs, promotion plans, readiness reports, approval records, and approval target templates |
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
| `docs://list`, `docs://list/{property}` | all | Full markdown document index across `.io`, `.ltd`, `.space`, `.agency` |
| `docs://{property}/{slug}` | all | Individual markdown documents from property repositories |
| `playbooks://list`, `playbooks://hosts/{slug}` | playbook | Host workflow playbooks (via @create-something/playbook-mcp) |
| `playbooks://comparison` | playbook | Host comparison matrix by task type |
| `playbooks://graduation-path` | playbook | Graduation path: Claude Desktop -> Cursor -> Codex |

## Tools (Automation Tier)

| Tool | Purpose |
|------|---------|
| `search` | Cross-property full-text search across all content types, including full property markdown documents. Supports type and property filtering. |
| `relate` | Knowledge graph traversal. Find related concepts with configurable depth. |
| `classify_component` | Classify a component into Three-Tier Framework tier(s) with confidence and rationale. |
| `apply_triad` | Apply the Subtractive Triad (DRY, Rams, Heidegger) to an artifact. |
| `audit_design` | Audit a design against the Canon Design System. |
| `canon_registry_search` | Search Canon components, tokens, templates, adapters, and policies by query, modality, kind, and maturity. |
| `canon_registry_get` | Get one Canon registry item with source path, import path, docs path, dependencies, modalities, and contract notes. |
| `canon_template_get` | Get a Canon template by id or modality for web/chat/app/voice/glasses surfaces, including overlay template packs. |
| `canon_extension_route` | Route a project/client Canon extension intake packet to project-local, candidate, stable-reuse, or deprecation guidance. |
| `canon_overlay_review` | Review a project/client Canon overlay manifest for theme, tokens, templates, copy rules, surface policy, registry metadata, and extension-intake gaps. |
| `canon_overlay_instantiate_preview` | Preview a Canon project/client overlay instantiation plan, generated manifest, and optional eight-file contents without writing files. |

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

## Telemetry

Worker deploys include telemetry via `@create-something/mcp-core` and the `TELEMETRY_DB` D1 binding (`cs-telemetry`). Tool invocations and run counts are written to fleet telemetry tables (`mcp_tool_invocations`, `mcp_run_counts`).

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/index.ts`, `worker/index.ts` |
| Boot command | `pnpm --filter=@create-something/mcp build && node packages/create-something-mcp/dist/index.js` for local stdio, or `cd packages/create-something-mcp/worker && npm run dev` for the Worker runtime |
| Smoke command | `pnpm --filter=@create-something/mcp typecheck && pnpm --filter=@create-something/mcp test && pnpm --filter=@create-something/mcp build` |
| Validation surfaces | typecheck output, Canon overlay preview parity check, content build artifacts in `src/content/generated/`, stdio startup, Worker logs via `npm run tail`, telemetry rows in `mcp_tool_invocations` and `mcp_run_counts` |
| UI validation path | none |
| Escalation rule | Stop if the remote Worker behavior, telemetry, or embedded content output disagrees with local stdio behavior and the mismatch cannot be reproduced from the checked-in content pipeline. |

## Content Pipeline

Content and the Canon registry are extracted from the monorepo's source files and compiled into JSON:

```bash
pnpm --filter=@create-something/mcp build:content
```

This generates files in `src/content/generated/` (papers, canon, canon-registry, patterns, graph, property-docs). Other content (masters, praxis, products, framework) is hand-authored in `src/content/`.

Playbook data is imported from `@create-something/playbook-mcp` (canonical source) — not duplicated.

## Architecture

| Transport | URL | Use Case |
|-----------|-----|----------|
| **Streamable HTTP** | `.../mcp` | Claude Code, Codex, remote clients |
| **SSE** | `.../sse` | Legacy clients (deprecated in MCP spec 2025-03-26) |
| **stdio** | `dist/index.js` | Local development |

Zero external runtime dependencies. All content embedded in source. Knowledge graph edges lazy-loaded on request.
