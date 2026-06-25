# MCP Scaffold — Creating a New MCP Server

> Standard pattern for adding a new MCP server to the CREATE SOMETHING monorepo.
> Every MCP follows the Three-Tier Framework: Resources (Database), Tools (Automation), Prompts (Judgment).

## Quick Start

1. Copy the scaffold
2. Let `create-mcp` infer a profile from the package name, or pass `--profile` to override
3. Fill an endpoint construction contract for each agent-callable capability
4. Replace placeholders
5. Add legibility contract + README
6. Add to workspace + install
7. Apply telemetry migration (if new D1)
8. Deploy

## Scaffold Profiles

`create-mcp` supports three documentation profiles:

- `generic` — default for general-purpose MCPs
- `content` — for content/indexing/search MCPs
- `operational` — for live-state, workflow, or data-plane MCPs

Example:

```bash
pnpm create-mcp create-something-mcp --profile content
pnpm create-mcp substrate-mcp --profile operational
pnpm create-mcp playbook-mcp --dry-run
```

If `--profile` is omitted, `create-mcp` infers a conservative default from the package name:

- names like `content`, `playbook`, `atlas`, or `framework` lean `content`
- names like `substrate`, `sync`, `schedule`, `preview`, `review`, `webflow`, `notion`, or other live-system integrations lean `operational`
- everything else stays `generic`

Use `--dry-run` to preview the inferred profile, target directory, and generated file list without writing anything to `packages/`.

## Endpoint construction contract

Before implementing resources, tools, prompts, routes, or worker handlers, fill
the endpoint construction template:

- [examples/endpoint-construction-contract.template.yaml](./examples/endpoint-construction-contract.template.yaml)

Use one contract per meaningful capability boundary. The goal is to decide the
product surface before code makes the boundary implicit:

- intent: what capability this endpoint gives an agent or operator
- schema: what inputs are accepted and what is forbidden
- authority: whether the endpoint can read, propose, approve, apply, rollback, or must block
- state: what is persisted, how idempotency works, and where audit events land
- limits: rate, scope, cost, time, and autonomy ceilings
- errors: known failure codes and the next safe action for the model
- evidence: success, refusal, and partial-success receipts
- fallback: deterministic recovery, manual handoff, and rollback path

This keeps the MCP-First thesis concrete: the value is not merely connecting an
API. The value is constructing the capability boundary the model can safely
inhabit.

## 1. Directory Structure

```
packages/{name}-mcp/
├── README.md              # Scaffolded entry point + starter Agent Legibility Contract
├── UNDERSTANDING.md       # Scaffolded dependency/context map for agents
├── src/
│   ├── resources.ts        # Database tier — MCP Resources
│   ├── tools.ts            # Automation tier — MCP Tools
│   └── prompts.ts          # Judgment tier — MCP Prompts
└── worker/
    ├── index.ts            # McpAgent DO + Worker entry point
    ├── package.json        # Worker-specific dependencies
    └── wrangler.toml       # Cloudflare config
```

## 2. `worker/package.json`

```json
{
  "name": "{name}-mcp-worker",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "tail": "wrangler tail"
  },
  "dependencies": {
    "@create-something/mcp-core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.25.3",
    "agents": "^0.3.10",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "wrangler": "^4.0.0",
    "typescript": "^5.3.0"
  }
}
```

## 3. Package metadata + README contract

The package-level `package.json` should opt into agent legibility enforcement:

```json
{
  "createSomething": {
    "agentLegibilityContract": true
  }
}
```

The package `README.md` should include a concrete `Agent Legibility Contract` section covering:

- entry point
- boot command
- smoke command
- validation surfaces
- UI validation path
- escalation rule

Use [guides/AGENT_LEGIBILITY_CONTRACT.md](./guides/AGENT_LEGIBILITY_CONTRACT.md) and [guides/UNDERSTANDING_TEMPLATE.md](./guides/UNDERSTANDING_TEMPLATE.md) as the canonical shape.

The `create-mcp` scaffold now emits:

- a starter `README.md` with this contract
- a starter `UNDERSTANDING.md` with dependency and structure placeholders

Replace the placeholder wording in both files before treating the package as complete. If the selected scaffold profile does not match the package you are building, regenerate with a closer profile or rewrite both docs before landing the package.

## 4. `worker/wrangler.toml`

```toml
name = "{name}-mcp"
main = "index.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

# Choose the right account:
#   WORKWAY:          5c3e9cf4d55ce171b844fad0931607f9
#   CREATE SOMETHING: 9645bd52e640b8a4f40a3a55ff1dd75a
account_id = "{account_id}"

[observability]
enabled = true

# Durable Object for MCP sessions
[[durable_objects.bindings]]
name = "MCP_OBJECT"
class_name = "{ClassName}MCP"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["{ClassName}MCP"]

# Shared telemetry — pick the right DB for your account:
#   WORKWAY:          halfdozen-feedback / 4eb35a0f-6ee2-4d0c-8c0a-9a2ab4049b97
#   CREATE SOMETHING: cs-telemetry / f710641a-0c85-4a7b-bb73-2c16f8d024c3
[[d1_databases]]
binding = "TELEMETRY_DB"
database_name = "{telemetry_db_name}"
database_id = "{telemetry_db_id}"

# Add your own D1/KV/R2 bindings below as needed
```

## 5. `worker/index.ts`

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';
import { registerPrompts } from '../src/prompts.js';

const SERVER_NAME = '{name}-mcp';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  // Add your own bindings here
}

export class {ClassName}MCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: '1.0.0',
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(this.server, this.env.TELEMETRY_DB as any, SERVER_NAME);
    }

    // Three-Tier Framework primitives
    registerResources(this.server);
    registerTools(this.server);
    registerPrompts(this.server);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/'))
      return {ClassName}MCP.serve('/mcp').fetch(request, env, ctx);
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/'))
      return {ClassName}MCP.serve('/sse').fetch(request, env, ctx);

    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: SERVER_NAME,
        version: '1.0.0',
        endpoints: { mcp: '/mcp', sse: '/sse' },
      }, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not found', { status: 404 });
  },
};
```

## 6. Workspace Registration

Add to `pnpm-workspace.yaml`:

```yaml
  - 'packages/{name}-mcp/worker'
```

Then install:

```bash
pnpm install --no-frozen-lockfile
```

## 7. Telemetry Migration

If this is the first MCP on a new account/D1, apply the telemetry migration:

```bash
CLOUDFLARE_ACCOUNT_ID={account_id} npx wrangler d1 execute {telemetry_db_name} \
  --remote --file=migrations/cs-telemetry/0001_telemetry_tables.sql
```

## 8. Deploy

```bash
cd packages/{name}-mcp/worker
CLOUDFLARE_ACCOUNT_ID={account_id} npx wrangler deploy
```

## 9. Add to Cursor MCP Config

```json
// ~/.cursor/mcp.json
"{name}-mcp": {
  "type": "http",
  "url": "https://{name}-mcp.{subdomain}.workers.dev/mcp"
}
```

## 10. Update Fleet Registry

Add the new MCP to `docs/MCP_FLEET_REGISTRY.md`.

## Checklist

- [ ] `worker/wrangler.toml` — correct account, DO class, telemetry D1
- [ ] `package.json` — `createSomething.agentLegibilityContract` set to `true`
- [ ] `README.md` — includes `Agent Legibility Contract`
- [ ] `UNDERSTANDING.md` — explains dependencies, structure, and critical entry points
- [ ] `worker/package.json` — includes `@create-something/mcp-core`
- [ ] `worker/index.ts` — `enableTelemetry` called before tool registration
- [ ] `pnpm-workspace.yaml` — worker directory added
- [ ] `docs/MCP_FLEET_REGISTRY.md` — new entry added
- [ ] `~/.cursor/mcp.json` — MCP connected
- [ ] Deployed and health endpoint returns JSON
