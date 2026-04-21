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
      description: 'Recommended reviewer workflow for locating and self-assigning a reviewable template version, with clear boundaries for optional analyzer evidence.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        steps: [
          'Call template_review_list_queue with no filters for the default ready_to_review + unassigned + submittedDate_desc queue.',
          'Pick a queue row and use assignableVersionId as the assignment target.',
          'Call template_review_assign_self with that version_id.',
          'Call template_review_get_review_context with the same version_id.',
          'Use template_review_set_review_status, template_review_save_draft_feedback, and template_review_request_changes for narrow reviewer-safe writes while the version remains assigned to the current reviewer.',
          'Call template_review_my_queue to resume work already assigned to the current reviewer.',
          'Call template_review_unassign_self if the reviewer intentionally wants to release the version back to the shared queue.',
        ],
        notes: {
          assignmentTarget: 'Asset Version',
          queuePrimaryAction: 'assign_self',
          reviewerSafeWrites: [
            'template_review_set_review_status',
            'template_review_save_draft_feedback',
            'template_review_request_changes',
          ],
          queueDefaults: {
            status: 'ready_to_review',
            assigned: 'unassigned',
            sort: 'submittedDate_desc',
          },
          currentReviewerFields: [
            'data.context.currentReviewer',
            'data.context.reviewOwner',
            'data.context.isAssignedToCurrentReviewer',
          ],
          crossServerAnalyzerTools: {
            server: 'webflow-site-analyzer-mcp',
            preferredEntry: 'enqueue_template_review',
            poll: 'get_template_review_job',
            optionalList: 'list_template_review_jobs',
            debugOnly: 'run_template_review',
            workflowBoundary:
              'Treat analyzer jobs as optional evidence from a separate Hub server. Keep assignment and Airtable review writes in template_review_* tools.',
          },
          failureModes: [
            'If reviewer identity is unavailable, self-assignment and my_queue should fail closed.',
            'If a version is assigned to another reviewer, hosts should not offer unassign_self.',
          ],
        },
      }),
  );

  server.resource(
    'template-review-host-playbook',
    'template-review://host-playbook',
    {
      description: 'Host-neutral playbook for driving reviewer, publishing, and cross-server analyzer workflows without inventing tool names.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        intent: 'Enable any MCP host to drive the reviewer workflow with minimal prompt logic.',
        recommendedSequence: [
          {
            step: 'queue',
            tool: 'template_review_list_queue',
            args: {},
            expectation: 'Use default filters unless the user explicitly asks for a different queue slice.',
          },
          {
            step: 'assign',
            tool: 'template_review_assign_self',
            args: { version_id: '<assignableVersionId>' },
            expectation: 'Only offer this action when canAssign is true.',
          },
          {
            step: 'context',
            tool: 'template_review_get_review_context',
            args: { version_id: '<assignableVersionId>' },
            expectation: 'Read reviewer-facing fields from data.context.',
          },
          {
            step: 'resume',
            tool: 'template_review_my_queue',
            args: {},
            expectation: 'Use this instead of re-scanning the shared queue when the reviewer asks for their work.',
          },
          {
            step: 'draft',
            tool: 'template_review_save_draft_feedback',
            args: { version_id: '<assignedVersionId>', review_feedback: '<draft notes>' },
            expectation: 'Only offer this when isAssignedToCurrentReviewer is true and the reviewer wants to save work without making an official decision.',
          },
          {
            step: 'status',
            tool: 'template_review_set_review_status',
            args: { version_id: '<assignedVersionId>', review_status: '<allowlisted status>' },
            expectation: 'Only offer this when isAssignedToCurrentReviewer is true.',
          },
          {
            step: 'request_changes',
            tool: 'template_review_request_changes',
            args: { version_id: '<assignedVersionId>', review_feedback: '<final feedback>' },
            expectation: 'Use this for the explicit changes-requested transition once reviewer notes are ready.',
          },
          {
            step: 'release',
            tool: 'template_review_unassign_self',
            args: { version_id: '<assignedVersionId>' },
            expectation: 'Only offer this when isAssignedToCurrentReviewer is true.',
          },
        ],
        operatorSequences: {
          priceUpdate: [
            {
              step: 'read_asset',
              tool: 'template_review_get_asset',
              args: { asset_id: '<assetId>' },
              expectation: 'Read current price, price string, MRP id, and MRP override before changing the Set Price field.',
            },
            {
              step: 'set_price',
              tool: 'template_review_set_price',
              args: { asset_id: '<assetId>', set_price: '<whole-number USD>' },
              expectation: 'Write the asset-side Set Price field and return publishing_context for the Admin handoff.',
            },
            {
              step: 'alternate_write',
              tool: 'template_review_update_asset_publishing',
              args: { asset_id: '<assetId>', set_price: '<whole-number USD>' },
              expectation: 'Use this broader asset-publishing mutation when the flow also needs to carry MRP override data alongside Set Price.',
            },
            {
              step: 'admin_handoff',
              returnFields: [
                'publishing_context.mrp_id',
                'publishing_context.current_price',
                'publishing_context.set_price',
                'publishing_context.price_string',
                'publishing_context.mrp_id_override',
              ],
              expectation: 'Surface publishing_context.mrp_id so the Admin Marketplace price change can be completed against the matching MRP record.',
            },
          ],
        },
        crossServerHubWorkflows: {
          analyzerReview: {
            server: 'webflow-site-analyzer-mcp',
            preferredSequence: [
              {
                tool: 'enqueue_template_review',
                args: { previewUrl: '<previewUrl>', publishedUrl: '<publishedUrl>' },
                expectation: 'Preferred production entrypoint when the Hub exposes the analyzer server.',
              },
              {
                tool: 'get_template_review_job',
                args: { jobId: '<jobId>' },
                expectation: 'Poll until status becomes succeeded, failed, or canceled.',
              },
              {
                tool: 'list_template_review_jobs',
                args: { status: 'running', limit: 20 },
                expectation: 'Optional operator view for recent analyzer jobs.',
              },
            ],
            debugFallback: {
              tool: 'run_template_review',
              args: { previewUrl: '<previewUrl>', publishedUrl: '<publishedUrl>' },
              expectation: 'Use only for debugging or manual use when the synchronous path is explicitly desired.',
            },
            integrationNotes: [
              'Analyzer jobs are a separate Hub server boundary. Do not relabel them as template_review_* tools.',
              'Use analyzer findings as evidence for draft feedback or a final decision, then persist reviewer-safe writes with template_review_save_draft_feedback, template_review_set_review_status, or template_review_request_changes.',
              'If the analyzer server is absent from discovery, skip this lane instead of assuming the tools exist.',
            ],
          },
        },
        toolResponseNotes: {
          listQueue: 'Queue rows include assignableVersionId and normalized booleans such as canAssign, canReview, canPublish, isAssignedToCurrentReviewer, and isBlockedByOtherReviewer.',
          reviewContext: 'Reviewer context is nested under data.context, not top-level data.',
          myQueue: 'Returns only versions assigned to the current reviewer.',
          assetPublishing: 'template_review_set_price and template_review_update_asset_publishing return publishing_context with mrp_id, current_price, set_price, price_string, and mrp_id_override for the Admin handoff.',
        },
        promptTemplate: [
          'When helping a reviewer, start with template_review_list_queue unless they explicitly ask for their assigned work.',
          'If they want their current workload, use template_review_my_queue.',
          'When a queue row is chosen, use assignableVersionId rather than assetId for write actions.',
          'When the user wants automated review evidence and the Hub exposes webflow-site-analyzer-mcp, use enqueue_template_review and get_template_review_job rather than inventing template_review_* analyzer tool names.',
          'Treat template_review_assign_self, template_review_unassign_self, template_review_set_review_status, template_review_save_draft_feedback, and template_review_request_changes as the primary reviewer-safe write lane.',
          'For price changes, use template_review_set_price or template_review_update_asset_publishing and always return publishing_context.mrp_id when available.',
          'Never ask the reviewer for an Airtable collaborator id.',
          'Do not offer broad mutation tools that are not visible in reviewer discovery.',
        ],
        antiPatterns: [
          'Do not treat assetId as the write target for assignment tools.',
          'Do not read currentReviewer from top-level data when using template_review_get_review_context.',
          'Do not infer assignment ownership from raw Airtable fields when normalized booleans are available.',
          'Do not relabel cross-server analyzer tools as template_review_* tool names.',
        ],
      }),
  );
}
