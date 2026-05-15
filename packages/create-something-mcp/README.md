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
| `docs://list`, `docs://list/{property}` | all | Full markdown document index across `.io`, `.ltd`, `.space`, `.agency` |
| `docs://{property}/{slug}` | all | Individual markdown documents from property repositories |
| `playbooks://list`, `playbooks://hosts/{slug}` | playbook | Host workflow playbooks (via @create-something/playbook-mcp) |
| `playbooks://comparison` | playbook | Host comparison matrix by task type |
| `playbooks://graduation-path` | playbook | Graduation path: Claude Desktop -> Cursor -> Codex |
| `flue://run-history/status`, `flue://run-history/latest`, `flue://run-history/list` | stdio + Worker | Flue service-agent run-history resources from local JSONL or `TELEMETRY_DB.flue_run_history` |

## Tools (Automation Tier)

| Tool | Purpose |
|------|---------|
| `search` | Cross-property full-text search across all content types, including full property markdown documents. Supports type and property filtering. |
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

Local stdio also registers Flue service-agent run-history resources. By default it reads `packages/agents/flue-service-agent/.artifacts/flue-service-agent/run-history.jsonl`; set `FLUE_RUN_HISTORY_PATH` to override that location.

The Worker registers the same resources when `TELEMETRY_DB` is bound. Remote records are read from the `flue_run_history` D1 table as schema-valid `flue.run_history.v1` JSON in `record_json`. Apply the D1 migration from the Worker package before relying on remote history:

```bash
cd packages/create-something-mcp/worker
pnpm exec wrangler d1 migrations apply cs-telemetry --remote
```

Upload validated local Flue history into remote D1 with the package-owned operator command:

```bash
pnpm --dir packages/create-something-mcp flue:history:upload
```

The upload path validates JSONL with the Flue run-history schema and a stricter governance gate before performing idempotent D1 upserts by `run_id`. Promoted records must carry:

- `issue`: a Linear issue ID such as `CRE-123`
- `governance.tier`: `database`, `automation`, or `judgment`
- `governance.evidence`: at least one evidence reference
- `governance.validation`: command, status, and timestamp
- `governance.rollback`: rollback guidance

The hosted Worker also exposes a governed MCP write tool when `TELEMETRY_DB` is bound:

```json
{
  "tool": "record_flue_run",
  "arguments": {
    "operatorIntent": "record_flue_run",
    "dryRun": true,
    "recordJson": "{\"schemaVersion\":\"flue.run_history.v1\",...}"
  }
}
```

Use `dryRun: true` to validate governance without writing. With `dryRun: false`, the tool performs the same idempotent D1 upsert as the operator upload path.

For promotion, prefer the single command that generates a Cloudflare-ready Flue history record and then uploads it:

```bash
pnpm --dir packages/create-something-mcp flue:history:promote -- --issue CRE-123
```

Use `pnpm --dir packages/create-something-mcp smoke:flue-promotion` to exercise the same path with a temp JSONL and no remote D1 write.

CI ownership lives in `.github/workflows/flue-run-history-promotion.yml`:

- pull requests and `main` pushes touching Flue/MCP promotion surfaces run dry-run validation.
- manual `workflow_dispatch` with `target=remote` runs the same promotion against remote D1 under the `production` environment and Cloudflare credentials.

## Worker Development

```bash
cd packages/create-something-mcp/worker

npm install
npm run dev      # Local dev server
npm run deploy   # Deploy to production
npm run tail     # Tail production logs
```

## Telemetry

Worker deploys include telemetry via `@create-something/mcp-core` and the `TELEMETRY_DB` D1 binding (`cs-telemetry`). Tool invocations and run counts are written to fleet telemetry tables (`mcp_tool_invocations`, `mcp_run_counts`). Flue service-agent run history is read from `flue_run_history` in the same binding; writes happen through the controlled operator upload script or the governed `record_flue_run` MCP tool.

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/index.ts`, `worker/index.ts` |
| Boot command | `pnpm --filter=@create-something/mcp build && node packages/create-something-mcp/dist/index.js` for local stdio, or `cd packages/create-something-mcp/worker && npm run dev` for the Worker runtime |
| Smoke command | `pnpm --filter=@create-something/mcp typecheck && pnpm --filter=@create-something/mcp build` |
| Validation surfaces | typecheck output, content build artifacts in `src/content/generated/`, local and remote Flue run-history resource smokes, stdio startup, Worker logs via `npm run tail`, telemetry rows in `mcp_tool_invocations`, `mcp_run_counts`, and `flue_run_history` |
| UI validation path | none |
| Escalation rule | Stop if the remote Worker behavior, telemetry, or embedded content output disagrees with local stdio behavior and the mismatch cannot be reproduced from the checked-in content pipeline. |

## Content Pipeline

Content is extracted from the monorepo's source files and compiled into JSON:

```bash
pnpm --filter=@create-something/mcp build:content
```

This generates files in `src/content/generated/` (papers, canon, patterns, graph, property-docs). Other content (masters, praxis, products, framework) is hand-authored in `src/content/`.

Playbook data is imported from `@create-something/playbook-mcp` (canonical source) — not duplicated.

## Architecture

| Transport | URL | Use Case |
|-----------|-----|----------|
| **Streamable HTTP** | `.../mcp` | Claude Code, Codex, remote clients |
| **SSE** | `.../sse` | Legacy clients (deprecated in MCP spec 2025-03-26) |
| **stdio** | `dist/index.js` | Local development |

Zero external runtime dependencies. All content embedded in source. Knowledge graph edges lazy-loaded on request.
