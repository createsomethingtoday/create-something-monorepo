# Scaffold an MCP Server

## Outcome

Create a minimal TypeScript MCP server using the stable SDK and stdio transport.

This course uses a local stdio server because that is the fastest way to create a Codex capability while you are engineering in a repo. Remote MCP servers are useful later, but they add auth, deployment, and network concerns before the core tool contract is clear.

## 1) Create the Package

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

## 2) Add the Server Entry Point

Create `src/index.ts`:

```ts
#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'codex-demo-mcp',
  version: '0.1.0',
  instructions:
    'Use these tools for the Codex MCP course demo. Keep calls narrow and report errors clearly.'
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

Stdio MCP servers reserve stdout for protocol messages. Send diagnostics to stderr with `console.error`, or Codex may see corrupted protocol output.

## 3) Install and Build

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
