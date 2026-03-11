import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from './airtable.js';
import { HOTSPOT_GROUPS, TEMPLATE_REVIEW_FIELD_MAP } from './schema.js';
import type { ReviewerProfile } from './reviewer-directory.js';

type ClientFactory = () => AirtableClient;
type ReviewerFactory = () => ReviewerProfile | null;

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

export function registerResources(server: McpServer, getClient: ClientFactory, getReviewer: ReviewerFactory = () => null): void {
  server.resource(
    'template-review-field-map',
    'template-review://field-map',
    {
      description: 'Confirmed and pending Airtable mappings for template review MCP.',
      mimeType: 'application/json',
    },
    async (uri: URL) => asJsonResource(uri, TEMPLATE_REVIEW_FIELD_MAP),
  );

  server.resource(
    'template-review-status-options',
    'template-review://status-options',
    {
      description: 'Allowed status and quality rating values for current template review writes.',
      mimeType: 'application/json',
    },
    async (uri: URL) => asJsonResource(uri, TEMPLATE_REVIEW_FIELD_MAP.statusOptions),
  );

  server.resource(
    'template-review-queue-snapshot',
    'template-review://queue-snapshot',
    {
      description: 'Current template review queue snapshot.',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const queue = await getClient().listAssetQueueDetailed({
        limit: 100,
        currentReviewer: getReviewer()
          ? {
              id: getReviewer()!.airtableCollaboratorId,
              email: getReviewer()!.email,
              name: getReviewer()!.name,
            }
          : null,
      });
      return asJsonResource(uri, {
        count: queue.items.length,
        generatedAt: new Date().toISOString(),
        sortApplied: queue.sortApplied,
        records: queue.items,
      });
    },
  );

  server.resource(
    'template-review-hotspot-groups',
    'template-review://hotspot-groups',
    {
      description: 'Blue/orange/red hotspot groups for template review UI semantics.',
      mimeType: 'application/json',
    },
    async (uri: URL) => asJsonResource(uri, HOTSPOT_GROUPS),
  );

  server.resource(
    'template-review-reviewer-me',
    'template-review://reviewer-me',
    {
      description: 'Current reviewer identity as resolved by the MCP runtime.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        reviewer: getReviewer(),
      }),
  );

  server.resource(
    'template-review-reviewer-workflow',
    'template-review://reviewer-workflow',
    {
      description: 'Recommended reviewer workflow for locating and self-assigning a reviewable template version.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        steps: [
          'Call template_review_list_queue with status=ready_to_review and assigned=unassigned.',
          'Pick a queue row and use assignableVersionId as the assignment target.',
          'Call template_review_assign_self with that version_id.',
          'Call template_review_get_review_context with the same version_id.',
        ],
        notes: {
          assignmentTarget: 'Asset Version',
          queuePrimaryAction: 'assign_self',
        },
      }),
  );
}
