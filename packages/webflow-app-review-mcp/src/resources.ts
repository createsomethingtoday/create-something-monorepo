import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  CANONICAL_FIELD_MAP,
  COMPUTED_FIELD_KEYS,
  TABLE_IDS,
  getStatusOptions,
} from './schema.js';
import { getQueueSnapshot, type ToolContext } from './tools.js';

export function registerResources(server: McpServer, ctx: ToolContext): void {
  server.resource(
    'app-review-field-map',
    'app-review://field-map',
    {
      description: 'Canonical field map for App Review MCP with table IDs and write flags',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const payload = {
        base_id: ctx.baseId,
        tables: TABLE_IDS,
        fields: CANONICAL_FIELD_MAP,
        computed_fields: [...COMPUTED_FIELD_KEYS],
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    'app-review-status-options',
    'app-review://status-options',
    {
      description: 'Allowed select values for review and marketplace status fields',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const payload = {
        enums: getStatusOptions(),
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    'app-review-queue-snapshot',
    'app-review://queue-snapshot',
    {
      description: 'Current app review queue snapshot (apps-only)',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const queue = await getQueueSnapshot(ctx, 100);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(queue, null, 2),
          },
        ],
      };
    },
  );
}
