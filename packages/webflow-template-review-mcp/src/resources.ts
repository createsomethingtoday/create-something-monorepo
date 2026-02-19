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
    'template-review-field-map',
    'template-review://field-map',
    {
      description: 'Canonical field map for Template Review MCP with table IDs and write flags',
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
    'template-review-status-options',
    'template-review://status-options',
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
    'template-review-queue-snapshot',
    'template-review://queue-snapshot',
    {
      description: 'Current template review queue snapshot (templates-only)',
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
