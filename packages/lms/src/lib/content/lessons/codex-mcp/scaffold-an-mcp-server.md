# Scaffold an MCP Server

## Outcome

Create a minimal TypeScript MCP server that starts over stdio.

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
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.9.0"
  }
}
```

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
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'codex-demo-mcp',
    version: '0.1.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: []
}));

server.setRequestHandler(CallToolRequestSchema, async () => {
  throw new Error('No tools registered yet');
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## 3) Install and Build

From repo root:

```bash
pnpm install
pnpm --filter @create-something/codex-demo-mcp build
```

If build passes, your skeleton is ready.

## Next

Continue to **Add Your First Tool**.
