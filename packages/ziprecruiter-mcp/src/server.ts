import { ConsoleInsight, createScopedServer } from '@create-something/mcp-core';
import type { ScopedMcpServer } from '@create-something/mcp-core';

import { ZipRecruiterAuthProvider } from './auth.js';
import { registerPrompts } from './prompts/index.js';
import { registerResources } from './resources/index.js';
import { registerTools } from './tools/index.js';
import type { ZipRecruiterEnv } from './types.js';

export function createServer(): ScopedMcpServer<ZipRecruiterEnv> {
  const server = createScopedServer<ZipRecruiterEnv>({
    name: 'ziprecruiter-mcp',
    version: '0.1.0',
    authProvider: new ZipRecruiterAuthProvider(),
    insight: new ConsoleInsight(),
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
