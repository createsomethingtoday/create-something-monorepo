import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from './airtable.js';
import { APP_REVIEW_FIELD_MAP } from './schema.js';

type ClientFactory = () => AirtableClient;

function asJsonResource(uri: URL, value: unknown) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

export function registerResources(server: McpServer, getClient: ClientFactory): void {
  server.resource(
    'app-review-field-map',
    'app-review://field-map',
    {
      description: 'Airtable table/field mapping and writability contract for app review MCP.',
      mimeType: 'application/json',
    },
    async (uri: URL) => asJsonResource(uri, APP_REVIEW_FIELD_MAP),
  );

  server.resource(
    'app-review-status-options',
    'app-review://status-options',
    {
      description: 'Allowed status/type/reason values for write operations.',
      mimeType: 'application/json',
    },
    async (uri: URL) => asJsonResource(uri, APP_REVIEW_FIELD_MAP.statusOptions),
  );

  server.resource(
    'app-review-queue-snapshot',
    'app-review://queue-snapshot',
    {
      description: 'Current app-review queue snapshot (apps-only scoped).',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const queue = await getClient().listAssetQueue(100);
      return asJsonResource(uri, {
        count: queue.length,
        generatedAt: new Date().toISOString(),
        records: queue,
      });
    },
  );
}

