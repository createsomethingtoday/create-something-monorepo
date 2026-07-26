import { McpAgent } from 'agents/mcp';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTicketSyncWorker, type RequestProps } from './http.js';
import { createBlondishSyncMcpServer } from './mcp.js';
import { SCOPE_WRITE } from './oauth-access.js';
import type { Env } from './types.js';

export class BlondishSyncMcp extends McpAgent<Env, unknown, RequestProps> {
  server!: McpServer;

  async init() {
    this.server = createBlondishSyncMcpServer(this.env, {
      allowWrites: this.props?.authMode !== 'oauth' || Boolean(this.props.scopes?.includes(SCOPE_WRITE)),
    });
  }
}

export default createTicketSyncWorker(async (request, env, ctx, props) => {
  Object.assign(ctx, { props });
  return BlondishSyncMcp.serve('/mcp').fetch(request, env, ctx);
});
