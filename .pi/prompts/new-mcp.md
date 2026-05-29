---
description: Scaffold a new MCP server following the Three-Tier Framework
argument-hint: "<name> [--profile generic|content|operational]"
---

# New MCP: $1

Create a new MCP server in the monorepo.

## Before Starting

Read the full scaffold guide: `docs/MCP_SCAFFOLD.md`
Load the skill: `/skill:mcp-fleet`

## Quick Path

```bash
pnpm create-mcp $@ --dry-run    # Preview first
pnpm create-mcp $@              # Create
```

## If Manual

### 1. Required Structure

```
packages/$1/
├── src/
│   ├── resources.ts        # Database tier (MCP Resources)
│   ├── tools.ts            # Automation tier (MCP Tools)
│   └── prompts.ts          # Judgment tier (MCP Prompts)
└── worker/
    ├── index.ts            # McpAgent DO + Worker entry point
    ├── package.json
    └── wrangler.toml       # CF config
```

### 2. Telemetry Binding (wrangler.toml)

```toml
[[d1_databases]]
binding = "TELEMETRY_DB"
database_name = "cs-telemetry"
database_id = "f710641a-0c85-4a7b-bb73-2c16f8d024c3"
```

### 3. Add to pnpm-workspace.yaml

### 4. Agent Legibility Contract (README.md)

Document: entry point, boot command, smoke path, evidence surface, escalation rule.

### 5. Deploy

```bash
cd packages/$1/worker && wrangler deploy
```

### 6. Register in `docs/MCP_FLEET_REGISTRY.md`

## Three-Tier Checklist

- [ ] **Resources** defined (Database tier)
- [ ] **Tools** defined (Automation tier)
- [ ] **Prompts** defined (Judgment tier)
- [ ] Telemetry binding configured
- [ ] Agent legibility contract written
- [ ] Fleet registry updated
