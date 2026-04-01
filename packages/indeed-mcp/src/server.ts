import { ConsoleInsight, createScopedServer } from '@create-something/mcp-core';
import type { ScopedMcpServer } from '@create-something/mcp-core';

import { IndeedAuthProvider } from './auth.js';
import { registerPrompts } from './prompts/index.js';
import { registerResources } from './resources/index.js';
import { registerTools } from './tools/index.js';
import type { IndeedEnv } from './types.js';

export function createServer(): ScopedMcpServer<IndeedEnv> {
  const server = createScopedServer<IndeedEnv>({
    name: 'indeed-mcp',
    version: '0.1.0',
    authProvider: new IndeedAuthProvider(),
    insight: new ConsoleInsight(),
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}

