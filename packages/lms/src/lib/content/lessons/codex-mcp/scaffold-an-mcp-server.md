# Scaffold an MCP Server

## Outcome

Use the Codex app's MCP-building skill to plan a minimal TypeScript MCP server, then create the local package with the stable SDK and stdio transport.

This course uses the Codex app plus a local stdio server because that is the fastest way for business operators to learn Codex by creating a capability for it. Remote MCP servers are useful later, but they add auth, deployment, and network concerns before the core tool contract is clear.

<figure class="learning-figure">
  <img src="/learning/codex-mcp/mcp-server-skeleton.svg" alt="Minimal local MCP server skeleton showing package files, McpServer, stdio transport, and Codex discovery." />
  <figcaption>The scaffold proves the server can start cleanly before any business workflow is added.</figcaption>
</figure>

## 1) Start with the Codex MCP-building skill

In the Codex app, start the build with a prompt like this:

```text
Use the MCP-building skill to help me create a local TypeScript stdio MCP server named codex-demo-mcp.

The first workflow is read-only: search RapidAPI Local Business Data for businesses and return structured records for operator review.

Keep the server narrow, use the TypeScript MCP SDK, use Zod schemas, return structuredContent, include read-only annotations, and give actionable error messages.
```

Use the skill output as a build plan and review checklist. The learner should still create the files below and understand the tool contract.

## 2) Create the Package

```bash
mkdir -p packages/codex-demo-mcp/src
cd packages/codex-demo-mcp
```

Create `package.json`:

```json
{
  "name": "@create-something/codex-demo-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "codex-demo-mcp": "./dist/index.js"
  },
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.9.0"
  }
}
```

If this is a new workspace package, add `dist/` to the nearest `.gitignore`.

Create `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

## 3) Add the Server Entry Point

Create `src/index.ts`:

```ts
#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'codex-demo-mcp',
  version: '0.1.0'
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

Stdio MCP servers reserve stdout for protocol messages. Send diagnostics to stderr with `console.error`, or Codex may see corrupted protocol output.

Keep operating guidance in tool names, descriptions, schemas, and error messages. Those are the surfaces Codex will inspect when deciding how to use the server.

## 4) Install and Build

From repo root:

```bash
pnpm install
pnpm --filter @create-something/codex-demo-mcp build
```

If build passes, your skeleton is ready.

## Checkpoint

You have not built a useful MCP yet. You have built the smallest stable shell:

- one package;
- one executable entry point;
- one stdio transport;
- no side effects;
- no hidden credentials.

## Next

Continue to **Add Your First Tool**.
