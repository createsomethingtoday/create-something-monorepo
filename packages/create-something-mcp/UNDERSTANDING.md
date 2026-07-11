# Understanding: @create-something/mcp

> **The cross-property content MCP that turns CREATE SOMETHING philosophy, research, design, and workflow knowledge into repository-local agent context.**

## Ontological Position

**Mode of Being**: Content-heavy MCP package

This package is the knowledge surface for the CREATE SOMETHING corpus. It makes papers, canon references, framework definitions, graph relationships, and playbooks retrievable through MCP resources and searchable tools so agents can work from repo-visible context instead of scattered docs.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `@modelcontextprotocol/sdk` | MCP resource, tool, and prompt registration |
| `@create-something/playbook-mcp` | Canonical host workflow playbook data |
| `@create-something/auth-platform` | Framework-neutral discovery, OpenAPI, and integration-validation contract |
| `src/content/generated/` | Built artifacts that make repo content searchable and embeddable |
| property source docs | Raw papers, canon pages, patterns, and framework documents that become MCP resources |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| coding agents | Which CREATE SOMETHING documents and concepts are available in-context |
| MCP clients | How to query the knowledge base through one remote or local MCP endpoint |
| framework work | How the Three-Tier Framework, graph, and playbooks connect across properties |

## Internal Structure

```text
src/
├── index.ts                  → stdio entry point
├── content/
│   ├── generated/            → built JSON artifacts from repo content
│   └── ...                   → hand-authored framework and product content
├── resources/                → MCP resources for documents and indexes
├── tools/                    → search, relate, classify, audit utilities
└── prompts/                  → architecture, design, research, and workflow prompts

worker/
├── src/index.ts              → remote MCP Worker entry point
└── ...                       → deploy/runtime configuration
```

## To Understand This Package, Read

1. **`README.md`** — available resources, tools, prompts, and runtime modes
2. **`scripts/build-content.ts`** — how repo-local content is compiled into generated artifacts
3. **`src/index.ts`** — stdio server entry point
4. **`worker/src/index.ts`** — remote Worker runtime and telemetry surface

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `UNDERSTANDING.md`, `src/index.ts`, `worker/src/index.ts` |
| Boot command | `pnpm --filter=@create-something/mcp build && node packages/create-something-mcp/dist/index.js` for stdio, or `cd packages/create-something-mcp/worker && npm run dev` for the Worker runtime |
| Smoke command | `pnpm --filter=@create-something/mcp typecheck && pnpm --filter=@create-something/mcp build` |
| Validation surfaces | typecheck output, generated content artifacts, stdio startup, Worker logs, resource reads, search/tool responses, telemetry rows |
| UI validation path | none |
| Escalation rule | Stop if generated artifacts, resource payloads, or search results disagree between the local build and Worker runtime, or if the source corpus itself is ambiguous or stale. |

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| content build | compilation step that turns repo docs into generated MCP artifacts | `scripts/build-content.ts` |
| graph traversal | relationship lookup across concepts and documents | `graph://...` resources and `relate` tool |
| cross-property search | unified search across `.io`, `.ltd`, `.space`, `.agency`, and playbooks | `search` tool |
| framework resource | MCP resource exposing Three-Tier definitions and mappings | `framework://...` resources |
| auth platform contract | AI-readable auth discovery, OpenAPI, and read-only integration validation | `auth://platform/...`, `auth_config_validate` |

## This Package Helps You Understand

- how repository-local knowledge becomes agent-visible MCP context
- where search and graph capabilities are grounded in generated artifacts
- how content, prompts, and telemetry fit together in a single MCP surface

## Common Tasks

| Task | Start Here |
|------|------------|
| update source content | property docs and `scripts/build-content.ts` |
| inspect the stdio server | `src/index.ts` |
| inspect remote runtime behavior | `worker/src/index.ts` |
| validate available MCP surfaces | `README.md` |

---

*Last validated: 2026-03-09*
