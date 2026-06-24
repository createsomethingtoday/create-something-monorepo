import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from './airtable.js';
import { REVIEWER_EXCEPTION_FIELD_MAP } from './schema.js';

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
    'reviewer-exceptions-field-map',
    'reviewer-exceptions://field-map',
    {
      description: 'Airtable field map, writable fields, allowed values, and Dify retrieval gate for reviewer exceptions.',
      mimeType: 'application/json',
    },
    async (uri: URL) => asJsonResource(uri, REVIEWER_EXCEPTION_FIELD_MAP),
  );

  server.resource(
    'reviewer-exceptions-workflow',
    'reviewer-exceptions://workflow',
    {
      description: 'Read/write workflow for AI-native reviewer exception memory.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        steps: [
          'Use reviewer_exceptions_list to find existing guidance before creating new records.',
          'Use reviewer_exceptions_create for new reviewer corrections, exceptions, or temporary policy updates.',
          'Set include_in_dify_retrieval true with Knowledge Status Active or Approved when the exception should be immediately available to Dify external knowledge.',
          'Use reviewer_exceptions_update to revise, publish, unpublish, expire, or promote existing records.',
          'Use reviewer_exceptions_preview_knowledge to confirm the Dify retrieval payload before relying on it in review guidance.',
        ],
        retrievalGate: REVIEWER_EXCEPTION_FIELD_MAP.retrievalGate,
        writeTools: ['reviewer_exceptions_create', 'reviewer_exceptions_update'],
        readTools: ['reviewer_exceptions_list', 'reviewer_exceptions_get_field_map', 'reviewer_exceptions_preview_knowledge'],
      }),
  );

  server.resource(
    'reviewer-exceptions-snapshot',
    'reviewer-exceptions://snapshot',
    {
      description: 'Current reviewer exceptions snapshot, including draft/proposed/non-retrievable records.',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const exceptions = await getClient().listReviewerExceptions({ limit: 100 });
      return asJsonResource(uri, {
        count: exceptions.length,
        generatedAt: new Date().toISOString(),
        exceptions,
      });
    },
  );
}
