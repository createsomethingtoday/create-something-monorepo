import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { AirtableClient, TemplateReviewQueueItem } from './airtable.js';
import { AirtableClientError } from './airtable.js';
import { COMPREHENSIVE_REVIEW_LANE_IDS, EVIDENCE_LABELS, formatComprehensiveAgentReviewFeedback } from './comprehensive-review-feedback.js';
import { COMPREHENSIVE_REVIEW_CONTRACT } from './comprehensive-review-contract.js';
import { RUBRIC_DIMENSIONS } from './comprehensive-review-contract.js';
import { buildPublishedSiteSandboxBundle } from './published-site-sandbox-bundle.js';
import { TEMPLATE_REVIEW_FIELD_MAP } from './schema.js';
import { REVIEW_WORKFLOW } from './prompts.js';
import type { ReviewerProfile } from './reviewer-directory.js';
import { PUBLISHED_SITE_VALIDATION_CHECKS, runPublishedSiteValidation, type ValidationToolConfig } from './validation.js';

type ClientFactory = () => AirtableClient;
type ReviewerFactory = () => ReviewerProfile | null;

const REVIEWER_CONTROLLED_STATUS_OPTIONS = ['🏃🏾In Review', '👀Admin Feedback Review', '🔁Response to Review'] as const;

const MY_QUEUE_DEFAULT_LIMIT = 25;
const MY_QUEUE_FEEDBACK_PREVIEW_CHARS = 320;
const comprehensiveEvidenceLabelSchema = z.enum(EVIDENCE_LABELS);
const comprehensiveLaneIdSchema = z.enum(COMPREHENSIVE_REVIEW_LANE_IDS);
const rubricDimensionSchema = z.enum(RUBRIC_DIMENSIONS);
const sandboxViewportSchema = z.object({
  name: z.string().min(1),
  width: z.number().int().min(240).max(3840),
  height: z.number().int().min(240).max(3840),
});

function jsonContent(value: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

function asSuccess(data: unknown) {
  return jsonContent({ ok: true, data });
}

function asError(error: unknown) {
  if (error instanceof AirtableClientError) {
    return jsonContent(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          status: error.status ?? 500,
          details: error.details,
        },
      },
      true,
    );
  }
  if (error instanceof Error) {
    return jsonContent(
      {
        ok: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error.message,
          status: 500,
        },
      },
      true,
    );
  }
  return jsonContent(
    {
      ok: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: String(error),
        status: 500,
      },
    },
    true,
  );
}

function currentReviewerAsCollaborator(getReviewer: ReviewerFactory) {
  const reviewer = getReviewer();
  if (!reviewer) return null;
  return {
    id: reviewer.airtableCollaboratorId,
    ...(reviewer.email ? { email: reviewer.email } : {}),
    ...(reviewer.name ? { name: reviewer.name } : {}),
  };
}

function requireResolvedReviewer(getReviewer: ReviewerFactory) {
  const reviewer = getReviewer();
  if (!reviewer) {
    throw new AirtableClientError('REVIEWER_IDENTITY_UNAVAILABLE', 'Current reviewer identity is not configured for this MCP runtime.', 503);
  }
  return reviewer;
}

function reviewerPayload(reviewer: ReviewerProfile) {
  return {
    accountId: reviewer.accountId,
    airtableCollaboratorId: reviewer.airtableCollaboratorId,
    email: reviewer.email,
    name: reviewer.name,
    lane: reviewer.lane,
  };
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function compactQueueItem(item: TemplateReviewQueueItem, includeFeedback: boolean): Omit<TemplateReviewQueueItem, 'latestReviewFeedback'> & {
  latestReviewFeedback?: string;
} {
  const { latestReviewFeedback, ...compactItem } = item;
  if (!includeFeedback || !latestReviewFeedback) return compactItem;
  return {
    ...compactItem,
    latestReviewFeedback: truncateText(latestReviewFeedback, MY_QUEUE_FEEDBACK_PREVIEW_CHARS),
  };
}

function reviewOwnerInputId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') {
    return (value as { id: string }).id;
  }
  return undefined;
}

function assertReviewerScopedReviewOwner(value: unknown, reviewer: ReviewerProfile): void {
  const ownerId = reviewOwnerInputId(value);
  if (ownerId === undefined) return;
  if (ownerId === reviewer.airtableCollaboratorId) return;
  throw new AirtableClientError('REVIEWER_WRITE_SCOPE_VIOLATION', 'Reviewer-scoped writes may not assign or clear another reviewer. Use assign_self or unassign_self.', 403, {
    requested_review_owner: ownerId,
    current_reviewer_id: reviewer.airtableCollaboratorId,
  });
}

export interface ToolAccess {
  allowWrites: boolean;
}

/**
 * Tools that mutate Airtable review state. Sessions without the
 * template-review:write scope never see these registered.
 */
export const WRITE_TOOL_NAMES: ReadonlySet<string> = new Set([
  'template_review_assign_self',
  'template_review_unassign_self',
  'template_review_assign_reviewer',
  'template_review_request_changes',
  'template_review_set_review_status',
  'template_review_save_agent_feedback',
  'template_review_save_draft_feedback',
  'template_review_complete_publishing',
  'template_review_update_asset_metadata',
  'template_review_update_asset_publishing',
  'template_review_update_version_review',
  'template_review_approve_version',
  'template_review_reject_version',
]);

export function registerTools(
  mcpServer: McpServer,
  getClient: ClientFactory,
  getReviewer: ReviewerFactory = () => null,
  validationConfig: ValidationToolConfig = {},
  access: ToolAccess = { allowWrites: true },
): void {
  const registerOnServer = mcpServer.tool.bind(mcpServer) as (...args: unknown[]) => unknown;
  const server = {
    tool: ((name: string, ...rest: unknown[]) => {
      if (!access.allowWrites && WRITE_TOOL_NAMES.has(name)) return undefined;
      return registerOnServer(name, ...rest);
    }) as McpServer['tool'],
  };

  server.tool('template_review_workflow', 'Reviewer onboarding guide — call this FIRST to learn the complete review workflow, tool sequence, analyzer interpretation, and decision criteria. No parameters needed.', {}, async () => ({
    content: [{ type: 'text' as const, text: REVIEW_WORKFLOW }],
  }));

  server.tool('template_review_health', 'Runtime health check for Webflow Template Review MCP and Airtable connectivity.', {}, async () => {
    try {
      const health = await getClient().healthCheck();
      return asSuccess({ ...health, auth: 'Bearer token required at worker boundary.' });
    } catch (error) {
      return asError(error);
    }
  });

  server.tool(
    'template_review_get_comprehensive_review_contract',
    'Read-only: return the comprehensive template-review evidence contract, including coverage matrix, rubric dimensions, manual checks, and Agent Review Feedback format.',
    {},
    async () => asSuccess(COMPREHENSIVE_REVIEW_CONTRACT),
  );

  server.tool(
    'template_review_format_agent_review_feedback',
    'Read-only: validate lane-shaped comprehensive review evidence and format a schema-checked Agent Review Feedback draft. Does not write to Airtable.',
    {
      intake: z.object({
        template_name: z.string().min(1),
        version_id: z.string().min(1),
        asset_id: z.string().min(1).optional(),
        published_url: z.string().url(),
        review_status: z.string().min(1).optional(),
        submitted_date: z.string().min(1).optional(),
        agent_review_feedback_was_blank_before_write: z.boolean().optional(),
      }),
      coverage_matrix: z
        .array(
          z.object({
            lane_id: comprehensiveLaneIdSchema,
            label: comprehensiveEvidenceLabelSchema,
            summary: z.string().min(1),
            evidence: z.array(z.string().min(1)).optional(),
            gaps: z.array(z.string().min(1)).optional(),
          }),
        )
        .min(COMPREHENSIVE_REVIEW_LANE_IDS.length),
      confirmed_findings: z.array(
        z.object({
          title: z.string().min(1),
          label: comprehensiveEvidenceLabelSchema,
          source: z.enum(['review_context', 'published_site_validator', 'e2b_public_site_pass', 'manual_input', 'other']),
          evidence: z.string().min(1),
          url: z.string().url().optional(),
          rubric_dimension: rubricDimensionSchema.optional(),
          severity: z.enum(['critical', 'warning', 'info']).optional(),
        }),
      ),
      rubric_dimension_matrix: z
        .array(
          z.object({
            dimension: rubricDimensionSchema,
            label: comprehensiveEvidenceLabelSchema,
            evidence_or_reason: z.string().min(1),
          }),
        )
        .min(RUBRIC_DIMENSIONS.length),
      e2b_urls_fetched: z.array(z.string().url()).min(1),
      human_follow_up: z.array(z.string().min(1)).min(1),
      manual_checks_remaining: z.array(z.string().min(1)).min(1),
      validator_summary: z
        .object({
          rubric_coverage: z.string().min(1).optional(),
          crawl_coverage: z.string().min(1).optional(),
          pages_analyzed: z.number().int().min(0).optional(),
          critical_errors: z.number().int().min(0).optional(),
          warnings: z.number().int().min(0).optional(),
        })
        .optional(),
      caveats: z.array(z.string().min(1)).optional(),
      generated_by: z.string().min(1).optional(),
    },
    async (input) => {
      try {
        const formatted = formatComprehensiveAgentReviewFeedback(input);
        if (!formatted.validation.passed) {
          throw new AirtableClientError('COMPREHENSIVE_REVIEW_PACKET_INVALID', 'Comprehensive Agent Review Feedback evidence is incomplete.', 400, formatted.validation);
        }
        return asSuccess(formatted);
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_prepare_published_site_sandbox',
    'Read-only: prepare a bounded published-site sandbox job and self-contained E2B Python runner for comprehensive review evidence. Does not execute E2B or write to Airtable.',
    {
      published_url: z.string().url(),
      run_id: z.string().min(1).optional(),
      policy_snapshot_id: z.string().min(1).optional(),
      sandbox_provider: z.enum(['dify_e2b', 'direct_e2b']).optional(),
      max_pages: z.number().int().min(1).max(25).optional(),
      max_network_requests: z.number().int().min(25).max(1000).optional(),
      timeout_ms: z.number().int().min(5_000).max(120_000).optional(),
      viewports: z.array(sandboxViewportSchema).min(1).max(6).optional(),
      allowed_hosts: z.array(z.string().min(1)).max(10).optional(),
    },
    async (input) => {
      try {
        return asSuccess(buildPublishedSiteSandboxBundle(input));
      } catch (error) {
        if (error instanceof Error) {
          return asError(
            new AirtableClientError('PUBLISHED_SITE_SANDBOX_INPUT_INVALID', error.message, 400, {
              published_url: input.published_url,
            }),
          );
        }
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_list_queue',
    'List compact template review queue summaries using confirmed template Airtable fields.',
    {
      status: z.enum(['ready_to_review', 'in_review', 'changes_requested', 'approved', 'published']).optional(),
      assigned: z.enum(['any', 'assigned', 'unassigned']).optional(),
      sort: z.enum(['submittedDate_desc', 'submittedDate_asc', 'decisionDate_desc', 'decisionDate_asc']).optional(),
      limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ limit, status, assigned, sort }) => {
      try {
        const queue = await getClient().listAssetQueueDetailed({
          limit: limit ?? 100,
          status: status ?? 'ready_to_review',
          assigned: assigned ?? 'unassigned',
          sort: sort ?? 'submittedDate_desc',
          currentReviewer: currentReviewerAsCollaborator(getReviewer),
        });
        return asSuccess({
          count: queue.items.length,
          sortApplied: queue.sortApplied,
          statusApplied: status ?? 'ready_to_review',
          assignedApplied: assigned ?? 'unassigned',
          items: queue.items,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_my_queue',
    'List compact active template review queue summaries currently assigned to the authenticated reviewer.',
    {
      status: z.enum(['ready_to_review', 'in_review', 'changes_requested', 'approved', 'published']).optional(),
      sort: z.enum(['submittedDate_desc', 'submittedDate_asc', 'decisionDate_desc', 'decisionDate_asc']).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      include_completed: z.boolean().optional(),
      include_feedback: z.boolean().optional(),
    },
    async ({ limit, status, sort, include_completed, include_feedback }) => {
      try {
        const currentReviewer = currentReviewerAsCollaborator(getReviewer);
        if (!currentReviewer?.id) {
          throw new AirtableClientError('REVIEWER_IDENTITY_UNAVAILABLE', 'Current reviewer identity is not configured for this MCP runtime.', 503);
        }
        const effectiveLimit = limit ?? MY_QUEUE_DEFAULT_LIMIT;
        const includeCompleted = include_completed ?? false;
        const includeFeedback = include_feedback ?? false;
        const queue = await getClient().listMyQueueDetailed({
          status,
          sort: sort ?? 'submittedDate_desc',
          limit: effectiveLimit,
          currentReviewer,
          includeCompleted,
        });
        return asSuccess({
          count: queue.items.length,
          sortApplied: queue.sortApplied,
          statusApplied: status ?? (includeCompleted ? 'all_assigned' : 'active'),
          assignedApplied: 'assigned_to_current_reviewer',
          limitApplied: effectiveLimit,
          feedbackApplied: includeFeedback ? 'preview_truncated' : 'omitted',
          items: queue.items.map((item) => compactQueueItem(item, includeFeedback)),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_get_review_context',
    'Get the normalized review context for one template version, including reviewer-facing fields and capability flags.',
    {
      version_id: z.string().min(1),
    },
    async ({ version_id }) => {
      try {
        return asSuccess({
          context: await getClient().getReviewContext(version_id, currentReviewerAsCollaborator(getReviewer)),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_run_published_site_validation',
    'Read-only: run published-site validators for content, assets, accessibility signals, interactions/IX2, GSAP, and custom-code policy evidence. Uses published_url only; does not use Designer/Preview data or write to Airtable.',
    {
      published_url: z.string().url(),
      page_slugs: z.array(z.string().min(1)).max(100).optional(),
      checks: z.array(z.enum(PUBLISHED_SITE_VALIDATION_CHECKS)).min(1).optional(),
      max_pages: z.number().int().min(1).max(100).optional(),
      include_raw: z.boolean().optional(),
    },
    async ({ published_url, page_slugs, checks, max_pages, include_raw }) => {
      try {
        return asSuccess({
          validation: await runPublishedSiteValidation(
            {
              published_url,
              page_slugs,
              checks,
              max_pages,
              include_raw,
            },
            validationConfig,
          ),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_assign_self',
    'Reviewer-safe write: assign the current reviewer to a template Asset Version using runtime reviewer identity mapped from the hub account.',
    {
      version_id: z.string().min(1),
    },
    async ({ version_id }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);

        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: await getClient().assignSelfToVersion(version_id, actingReviewer),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_unassign_self',
    'Reviewer-safe write: clear the 📝Reviewer field only when the selected template Asset Version is currently assigned to the authenticated reviewer.',
    {
      version_id: z.string().min(1),
    },
    async ({ version_id }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);

        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: await getClient().unassignVersionReviewer(version_id, actingReviewer),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_request_changes',
    'Reviewer-safe write: set a template version to changes-requested and attach reviewer feedback using the authenticated reviewer identity.',
    {
      version_id: z.string().min(1),
      review_feedback: z.string().min(1),
      improvement_areas: z.array(z.string()).optional(),
    },
    async ({ version_id, review_feedback, improvement_areas }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: await getClient().updateVersionReview(version_id, {
            review_owner: { id: reviewer.airtableCollaboratorId },
            review_status: '📤Changes Requested',
            review_feedback,
            improvement_areas,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_set_review_status',
    'Reviewer-safe write: set a reviewer-controlled template review status after ownership has been established through self-assignment.',
    {
      version_id: z.string().min(1),
      review_status: z.enum(REVIEWER_CONTROLLED_STATUS_OPTIONS),
    },
    async ({ version_id, review_status }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: await getClient().updateVersionReview(version_id, {
            review_owner: { id: reviewer.airtableCollaboratorId },
            review_status,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_save_agent_feedback',
    'Write only supplemental internal agent notes to 📝Agent Review Feedback for a template Asset Version.',
    {
      version_id: z.string().min(1),
      agent_review_feedback: z.string().min(1),
    },
    async ({ version_id, agent_review_feedback }) => {
      try {
        const reviewer = getReviewer();
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);

        return asSuccess({
          ...(reviewer
            ? {
                reviewer: reviewerPayload(reviewer),
                acting_reviewer: actingReviewer,
              }
            : {}),
          updated_version: await getClient().updateVersionReview(version_id, {
            agent_review_feedback,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_save_draft_feedback',
    'Reviewer-safe write: save draft reviewer feedback for a template version without changing the official decision state.',
    {
      version_id: z.string().min(1),
      review_feedback: z.string().min(1).optional(),
      improvement_areas: z.array(z.string()).optional(),
    },
    async ({ version_id, review_feedback, improvement_areas }) => {
      try {
        if (review_feedback === undefined && improvement_areas === undefined) {
          throw new AirtableClientError('NO_MUTATION_FIELDS', 'Provide review_feedback, improvement_areas, or both.', 400);
        }
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: await getClient().updateVersionReview(version_id, {
            review_owner: { id: reviewer.airtableCollaboratorId },
            review_feedback,
            improvement_areas,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_search_assets',
    'Search template assets by name so reviewers can find a specific submission without reading a broad queue slice.',
    {
      query: z.string().min(1),
      mode: z.enum(['contains', 'exact']).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ query, mode, limit }) => {
      try {
        const records = await getClient().searchAssetsByName(query, {
          mode,
          limit: limit ?? 25,
        });
        return asSuccess({
          query,
          mode: mode ?? 'contains',
          count: records.length,
          records,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_search_versions',
    'Search template Asset Versions by asset name so reviewers can locate review cycles for a specific submission directly.',
    {
      query: z.string().min(1),
      mode: z.enum(['contains', 'exact']).optional(),
      asset_limit: z.number().int().min(1).max(50).optional(),
      versions_per_asset_limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ query, mode, asset_limit, versions_per_asset_limit }) => {
      try {
        return asSuccess({
          query,
          mode: mode ?? 'contains',
          ...(await (async () => {
            const matches = await getClient().searchVersionsByAssetName(query, {
              mode,
              assetLimit: asset_limit ?? 10,
              versionsPerAssetLimit: versions_per_asset_limit ?? 25,
            });
            return {
              asset_count: matches.length,
              version_count: matches.reduce((total, match) => total + match.versions.length, 0),
              matches,
            };
          })()),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_get_asset',
    'Get one template review payload by asset_id, including version history.',
    {
      asset_id: z.string().min(1),
      versions_limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ asset_id, versions_limit }) => {
      try {
        const client = getClient();
        const asset = await client.getAssetById(asset_id);
        if (!asset) {
          throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Template asset not found in template-review scope.', 404, {
            asset_id,
          });
        }
        const versions = await client.listVersionsForAsset(asset_id, versions_limit ?? 100);
        return asSuccess({ asset, versions });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_list_versions',
    'List all versions for a template asset.',
    {
      asset_id: z.string().min(1),
      limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ asset_id, limit }) => {
      try {
        const versions = await getClient().listVersionsForAsset(asset_id, limit ?? 100);
        return asSuccess({ asset_id, count: versions.length, versions });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_get_version',
    'Get one template version record by version_id.',
    {
      version_id: z.string().min(1),
    },
    async ({ version_id }) => {
      try {
        const version = await getClient().getVersionById(version_id);
        if (!version) {
          throw new AirtableClientError('VERSION_NOT_FOUND', 'Template version not found.', 404, {
            version_id,
          });
        }
        return asSuccess({ version });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_list_releases',
    'List available Asset Release records reviewers can link to approved template versions.',
    {
      limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ limit }) => {
      try {
        const releases = await getClient().listReleases(limit ?? 100);
        return asSuccess({
          count: releases.length,
          releases,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool('template_review_get_field_map', 'Return the template review Airtable field map with confirmed and pending mappings.', {}, async () => asSuccess(TEMPLATE_REVIEW_FIELD_MAP));

  server.tool(
    'template_review_get_metrics',
    'Return compact marketplace template review metrics for a recent date window.',
    {
      days: z.number().int().min(1).max(90).optional(),
      end_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    },
    async ({ days, end_date }) => {
      try {
        return asSuccess({
          metrics: await getClient().getMarketplaceMetrics({
            days,
            end_date,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_assign_reviewer',
    'Admin/operator write: assign or clear the 📝Reviewer collaborator on a template Asset Version without changing any other review fields.',
    {
      version_id: z.string().min(1),
      review_owner: z.union([z.string().min(1).describe('Airtable collaborator id for the reviewer.'), z.object({ id: z.string().min(1) }), z.null()]),
    },
    async ({ version_id, review_owner }) => {
      try {
        const reviewer = getReviewer();
        if (reviewer) {
          assertReviewerScopedReviewOwner(review_owner, reviewer);
          const actingReviewer = currentReviewerAsCollaborator(getReviewer);
          const updated = review_owner === null ? await getClient().unassignVersionReviewer(version_id, actingReviewer) : await getClient().assignSelfToVersion(version_id, actingReviewer);
          return asSuccess({
            reviewer: reviewerPayload(reviewer),
            acting_reviewer: actingReviewer,
            updated_version: updated,
          });
        }

        return asSuccess({
          updated_version: await getClient().assignVersionReviewer(version_id, {
            review_owner,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_complete_publishing',
    'Complete the publishing checklist for a template version and attach a release using either a record id or a local-date lookup.',
    {
      version_id: z.string().min(1),
      release_record_id: z.string().optional(),
      release_date_local: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      time_zone: z.string().optional(),
      approve_version: z.boolean().optional(),
      mrp_id_overwrite: z.string().optional(),
    },
    async ({ version_id, release_record_id, release_date_local, time_zone, approve_version, mrp_id_overwrite }) => {
      try {
        if (!release_record_id && !release_date_local && !time_zone) {
          throw new AirtableClientError('MISSING_RELEASE_SELECTOR', 'Provide release_record_id, release_date_local, or time_zone so the publishing workflow can resolve a release.', 400);
        }

        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        const client = getClient();
        await client.requireAssignedVersion(version_id, actingReviewer);

        const result = await client.completePublishing(version_id, {
          release_record_id,
          release_date_local,
          time_zone,
          approve_version,
          mrp_id_overwrite,
          review_owner: { id: reviewer.airtableCollaboratorId },
        });

        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: result.updatedVersion,
          updated_asset: result.updatedAsset,
          resolved_release: result.resolvedRelease,
          resolved_local_date: result.resolvedLocalDate,
          support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.publishingCompletion,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_update_asset_metadata',
    'Update confirmed writable template asset fields.',
    {
      asset_id: z.string().min(1),
      template_name: z.string().optional(),
      description: z.string().optional(),
      description_short: z.string().optional(),
      description_long_html: z.string().optional(),
      website_url: z.string().optional(),
      preview_site_url: z.string().optional(),
      thumbnail_image_url: z.union([z.string().url(), z.null()]).optional(),
      thumbnail_image_secondary_urls: z.array(z.string().url()).optional(),
      carousel_image_urls: z.array(z.string().url()).optional(),
    },
    async ({ asset_id, ...input }) => {
      try {
        const updated = await getClient().updateAssetMetadata(asset_id, input);
        return asSuccess({
          updated_asset: updated,
          support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.assetMetadata,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_update_asset_publishing',
    'Update confirmed asset-side publishing override fields for a template.',
    {
      asset_id: z.string().min(1),
      mrp_id_overwrite: z.string().optional(),
    },
    async ({ asset_id, mrp_id_overwrite }) => {
      try {
        const updated = await getClient().updateAssetPublishing(asset_id, {
          mrp_id_overwrite,
        });
        return asSuccess({
          updated_asset: updated,
          support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.assetPublishing,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_update_version_review',
    'Update template version review fields that are confirmed writable in Airtable.',
    {
      version_id: z.string().min(1),
      review_owner: z.unknown().optional(),
      review_status: z.string().optional(),
      quality_rating: z.string().optional(),
      improvement_areas: z.array(z.string()).optional(),
      review_feedback: z.string().optional(),
      review_checklist: z.unknown().optional(),
      publishing_checklist: z.unknown().optional(),
      release_record_id: z.string().optional(),
      reject_reason: z.string().optional(),
      rejection_feedback: z.string().optional(),
      agent_review_feedback: z.string().optional(),
    },
    async ({ version_id, review_owner, review_status, quality_rating, improvement_areas, review_feedback, review_checklist, publishing_checklist, release_record_id, reject_reason, rejection_feedback, agent_review_feedback }) => {
      try {
        const reviewer = getReviewer();
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        if (reviewer) {
          assertReviewerScopedReviewOwner(review_owner, reviewer);
          await getClient().requireAssignedVersion(version_id, actingReviewer);
        }
        const hasReviewerScopedMutation = [review_status, quality_rating, improvement_areas, review_feedback, review_checklist, publishing_checklist, release_record_id, reject_reason, rejection_feedback, agent_review_feedback].some(
          (value) => value !== undefined,
        );

        return asSuccess({
          ...(reviewer
            ? {
                reviewer: reviewerPayload(reviewer),
                acting_reviewer: actingReviewer,
              }
            : {}),
          updated_version: await getClient().updateVersionReview(version_id, {
            review_owner: reviewer && hasReviewerScopedMutation ? { id: reviewer.airtableCollaboratorId } : review_owner,
            review_status,
            quality_rating,
            improvement_areas,
            review_feedback,
            review_checklist,
            publishing_checklist,
            release_record_id,
            reject_reason,
            rejection_feedback,
            agent_review_feedback,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_approve_version',
    'Approve a template version and optionally update confirmed publishing checklist metadata.',
    {
      version_id: z.string().min(1),
      release_record_id: z.string().optional(),
      publishing_checklist: z.unknown().optional(),
    },
    async ({ version_id, release_record_id, publishing_checklist }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: await getClient().updateVersionReview(version_id, {
            review_owner: { id: reviewer.airtableCollaboratorId },
            review_status: '✅Approved',
            release_record_id,
            publishing_checklist,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_reject_version',
    'Reject a template version with reason and reviewer feedback.',
    {
      version_id: z.string().min(1),
      reject_reason: z.string().min(1),
      rejection_feedback: z.string().min(1),
    },
    async ({ version_id, reject_reason, rejection_feedback }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: await getClient().updateVersionReview(version_id, {
            review_owner: { id: reviewer.airtableCollaboratorId },
            review_status: '❌Rejected',
            reject_reason,
            rejection_feedback,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );
}
