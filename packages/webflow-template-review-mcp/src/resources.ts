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
      description: 'Recommended reviewer workflow for locating, analyzing, and self-assigning a reviewable template version.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        steps: [
          'Call template_review_list_queue with no filters for the default ready_to_review + unassigned + submittedDate_desc queue.',
          'Pick a queue row and use assignableVersionId as the assignment target.',
          'Call template_review_get_review_context with the same version_id.',
          'If automated analysis is needed through a Hub, call hub_execute_proxy_tool with proxyToolName="webflow-site-analyzer-mcp__enqueue_template_review" and put previewUrl + publishedUrl inside the nested args object.',
          'Map previewSiteUrl -> previewUrl and websiteUrl -> publishedUrl when enqueueing analyzer jobs from a queue row.',
          'Poll hub_execute_proxy_tool with proxyToolName="webflow-site-analyzer-mcp__get_template_review_job" until the analyzer job reaches a terminal status.',
          'Call template_review_assign_self with that version_id.',
          'Use template_review_set_review_status, template_review_save_draft_feedback, and template_review_request_changes for narrow reviewer-safe writes while the version remains assigned to the current reviewer.',
          'Call template_review_my_queue to resume work already assigned to the current reviewer.',
          'Call template_review_unassign_self if the reviewer intentionally wants to release the version back to the shared queue.',
        ],
        notes: {
          assignmentTarget: 'Asset Version',
          queuePrimaryAction: 'assign_self',
          analyzerBrokerEnvelope: 'hub_execute_proxy_tool.arguments.args',
          analyzerFieldMapping: {
            previewSiteUrl: 'previewUrl',
            websiteUrl: 'publishedUrl',
          },
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
          failureModes: [
            'If reviewer identity is unavailable, self-assignment and my_queue should fail closed.',
            'If a version is assigned to another reviewer, hosts should not offer unassign_self.',
            'If a host flattens analyzer inputs beside proxyToolName, the Hub should reject the call and the host should retry with nested args.',
          ],
        },
      }),
  );

  server.resource(
    'template-review-host-playbook',
    'template-review://host-playbook',
    {
      description: 'Host-neutral playbook for driving the reviewer and analyzer workflow without Airtable-specific prompt logic.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        intent: 'Enable any MCP host to drive the reviewer workflow with minimal prompt logic, including the handoff to the analyzer service.',
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
            step: 'analyze',
            tool: 'hub_execute_proxy_tool',
            args: {
              proxyToolName: 'webflow-site-analyzer-mcp__run_template_review',
              args: {
                previewUrl: '<previewSiteUrl>',
                publishedUrl: '<websiteUrl>',
              },
            },
            expectation:
              'On Cloudflare Worker analyzer deployments, prefer the synchronous run_template_review. Analyzer inputs must be nested under the inner args object. Use previewSiteUrl + websiteUrl from the queue row or review context. Expect ~90–180s for the call to return a full report.',
          },
          {
            step: 'analyze_async_fallback',
            tool: 'hub_execute_proxy_tool',
            args: {
              proxyToolName: 'webflow-site-analyzer-mcp__enqueue_template_review',
              args: {
                previewUrl: '<previewSiteUrl>',
                publishedUrl: '<websiteUrl>',
              },
            },
            expectation:
              'Only use async enqueue when run_template_review is not available or the host cannot hold the request open. On Cloudflare Worker deployments, async job state is not persisted across isolates yet — poll may return "job not found" even after a successful enqueue.',
          },
          {
            step: 'poll_analysis',
            tool: 'hub_execute_proxy_tool',
            args: {
              proxyToolName: 'webflow-site-analyzer-mcp__get_template_review_job',
              args: { jobId: '<jobId>' },
            },
            expectation: 'Only meaningful when the analyzer deployment persists job state across requests. On the current Cloudflare Worker deployment, expect "job not found" — fall back to run_template_review.',
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
        toolResponseNotes: {
          listQueue: 'Queue rows include assignableVersionId and normalized booleans such as canAssign, canReview, canPublish, isAssignedToCurrentReviewer, and isBlockedByOtherReviewer.',
          reviewContext: 'Reviewer context is nested under data.context, not top-level data.',
          myQueue: 'Returns only versions assigned to the current reviewer.',
          analyzerInputs:
            'Use previewSiteUrl as previewUrl and websiteUrl as publishedUrl when enqueueing analyzer runs from a queue row.',
          analyzerBrokerShape:
            'For hub_execute_proxy_tool, downstream analyzer inputs belong inside arguments.args, not beside proxyToolName.',
          analyzerPreferSync:
            'On Cloudflare Worker analyzer deployments, prefer run_template_review over enqueue_template_review. The async job state is held in-memory and does not survive Worker isolate boundaries, so poll requests often return "job not found". Sync runs return the full report in ~90–180s.',
        },
        promptTemplate: [
          'When helping a reviewer, start with template_review_list_queue unless they explicitly ask for their assigned work.',
          'If they want their current workload, use template_review_my_queue.',
          'When a queue row is chosen, use assignableVersionId rather than assetId for write actions.',
          'For analyzer work on a Hub, search or describe the visible webflow-site-analyzer-mcp proxy tool first, then call hub_execute_proxy_tool with proxyToolName plus nested args.',
          'Use previewSiteUrl and websiteUrl from queue rows as previewUrl and publishedUrl for analyzer jobs.',
          'Treat template_review_assign_self, template_review_unassign_self, template_review_set_review_status, template_review_save_draft_feedback, and template_review_request_changes as the primary reviewer-safe write lane.',
          'Never ask the reviewer for an Airtable collaborator id.',
          'Do not offer broad mutation tools that are not visible in reviewer discovery.',
        ],
        antiPatterns: [
          'Do not treat assetId as the write target for assignment tools.',
          'Do not read currentReviewer from top-level data when using template_review_get_review_context.',
          'Do not infer assignment ownership from raw Airtable fields when normalized booleans are available.',
          'Do not pass display labels like "Ready for Review" when a tool schema expects the normalized enum "ready_to_review".',
          'Do not flatten previewUrl or publishedUrl beside proxyToolName when calling hub_execute_proxy_tool.',
          'Do not default to enqueue_template_review on Cloudflare Worker analyzer deployments — the async job map does not persist across isolates, so get_template_review_job will return "job not found". Use run_template_review instead.',
        ],
      }),
  );
}
