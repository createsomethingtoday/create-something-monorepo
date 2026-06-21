import { ConsoleInsight, createScopedServer } from '@create-something/mcp-core';
import type { ScopedMcpServer } from '@create-something/mcp-core';

import { ZendeskAuthProvider, type ZendeskEnv } from './auth.js';
import { registerPrompts } from './prompts/index.js';
import { registerResources } from './resources/index.js';
import { registerTools } from './tools/index.js';

export const SERVER_NAME = 'zendesk-mcp';
export const SERVER_VERSION = '0.1.0';

export function createServer(): ScopedMcpServer<ZendeskEnv> {
  const server = createScopedServer<ZendeskEnv>({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    authProvider: new ZendeskAuthProvider(),
    insight: new ConsoleInsight(),
  });

  registerResources(server);
  registerTools(server);
  registerPrompts(server);

  return server;
}
