import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { AirtableClient, TemplateReviewQueueItem } from './airtable.js';
import { AirtableClientError } from './airtable.js';
import { TEMPLATE_REVIEW_FIELD_MAP } from './schema.js';
import { REVIEW_WORKFLOW } from './prompts.js';
import type { ReviewerProfile } from './reviewer-directory.js';

type ClientFactory = () => AirtableClient;
type ReviewerFactory = () => ReviewerProfile | null;

const REVIEWER_CONTROLLED_STATUS_OPTIONS = [
  '🏃🏾In Review',
  '👀Admin Feedback Review',
  '🔁Response to Review',
] as const;

const DEFAULT_QUEUE_LIMIT = 10;
const MAX_QUEUE_LIMIT = 100;
const FEEDBACK_PREVIEW_LENGTH = 240;

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

function queueLimit(limit: number | undefined): number {
  return limit ?? DEFAULT_QUEUE_LIMIT;
}

function truncateText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.length > FEEDBACK_PREVIEW_LENGTH ? `${value.slice(0, FEEDBACK_PREVIEW_LENGTH)}...` : value;
}

function compactQueueItem(item: TemplateReviewQueueItem) {
  return {
    assetId: item.assetId,
    templateName: item.templateName,
    websiteUrl: item.websiteUrl,
    previewSiteUrl: item.previewSiteUrl,
    submittedDate: item.submittedDate,
    decisionDate: item.decisionDate,
    marketplaceStatus: item.marketplaceStatus,
    latestReviewStatus: item.latestReviewStatus,
    latestReviewDate: item.latestReviewDate,
    qualityRating: item.qualityRating,
    priceString: item.priceString,
    assignableVersionId: item.assignableVersionId,
    reviewOwner: item.reviewOwner,
    normalizedStatus: item.normalizedStatus,
    isReadyToReview: item.isReadyToReview,
    isUnassigned: item.isUnassigned,
    canAssign: item.canAssign,
    canReview: item.canReview,
    canPublish: item.canPublish,
    isAssignedToCurrentReviewer: item.isAssignedToCurrentReviewer,
    isBlockedByOtherReviewer: item.isBlockedByOtherReviewer,
    ...(item.latestReviewFeedback ? { latestReviewFeedbackPreview: truncateText(item.latestReviewFeedback) } : {}),
  };
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
    throw new AirtableClientError(
      'REVIEWER_IDENTITY_UNAVAILABLE',
      'Current reviewer identity is not configured for this MCP runtime.',
      503,
    );
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
  throw new AirtableClientError(
    'REVIEWER_WRITE_SCOPE_VIOLATION',
    'Reviewer-scoped writes may not assign or clear another reviewer. Use assign_self or unassign_self.',
    403,
    {
      requested_review_owner: ownerId,
      current_reviewer_id: reviewer.airtableCollaboratorId,
    },
  );
}

export function registerTools(server: McpServer, getClient: ClientFactory, getReviewer: ReviewerFactory = () => null): void {
  server.tool(
    'template_review_workflow',
    'Reviewer onboarding guide — call this FIRST to learn the complete review workflow, tool sequence, evidence requirements, and decision criteria. No parameters needed.',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: REVIEW_WORKFLOW }],
    }),
  );

  server.tool(
    'template_review_health',
    'Runtime health check for Webflow Template Review MCP and Airtable connectivity.',
    {},
    async () => {
      try {
        const health = await getClient().healthCheck();
        return asSuccess({ ...health, auth: 'Bearer token required at worker boundary.' });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_list_queue',
    'List one compact page of template review queue summaries using confirmed template Airtable fields. Defaults to 10 items; pass page_token from pagination.nextPageToken for the next page.',
    {
      status: z.enum(['ready_to_review', 'in_review', 'changes_requested', 'approved', 'published']).optional(),
      assigned: z.enum(['any', 'assigned', 'unassigned']).optional(),
      sort: z.enum(['submittedDate_desc', 'submittedDate_asc', 'decisionDate_desc', 'decisionDate_asc']).optional(),
      limit: z.number().int().min(1).max(MAX_QUEUE_LIMIT).optional(),
      page_token: z.string().min(1).optional(),
    },
    async ({ limit, page_token, status, assigned, sort }) => {
      try {
        const pageLimit = queueLimit(limit);
        const queue = await getClient().listAssetQueueDetailed({
          limit: pageLimit,
          pageToken: page_token,
          status: status ?? 'ready_to_review',
          assigned: assigned ?? 'unassigned',
          sort: sort ?? 'submittedDate_desc',
          currentReviewer: currentReviewerAsCollaborator(getReviewer),
        });
        return asSuccess({
          count: queue.items.length,
          returned: queue.items.length,
          sortApplied: queue.sortApplied,
          statusApplied: status ?? 'ready_to_review',
          assignedApplied: assigned ?? 'unassigned',
          pagination: {
            limit: pageLimit,
            hasMore: queue.pagination.hasMore,
            nextPageToken: queue.pagination.nextPageToken ?? null,
            source: queue.pagination.source,
          },
          items: queue.items.map(compactQueueItem),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_my_queue',
    'List one compact page of template review queue summaries currently assigned to the authenticated reviewer. Defaults to 10 items; pass page_token from pagination.nextPageToken for the next page.',
    {
      status: z.enum(['ready_to_review', 'in_review', 'changes_requested', 'approved', 'published']).optional(),
      sort: z.enum(['submittedDate_desc', 'submittedDate_asc', 'decisionDate_desc', 'decisionDate_asc']).optional(),
      limit: z.number().int().min(1).max(MAX_QUEUE_LIMIT).optional(),
      page_token: z.string().min(1).optional(),
    },
    async ({ limit, page_token, status, sort }) => {
      try {
        const currentReviewer = currentReviewerAsCollaborator(getReviewer);
        if (!currentReviewer?.id) {
          throw new AirtableClientError(
            'REVIEWER_IDENTITY_UNAVAILABLE',
            'Current reviewer identity is not configured for this MCP runtime.',
            503,
          );
        }
        const pageLimit = queueLimit(limit);
        const queue = await getClient().listMyQueueDetailed({
          status,
          sort: sort ?? 'submittedDate_desc',
          limit: pageLimit,
          pageToken: page_token,
          currentReviewer,
        });
        return asSuccess({
          count: queue.items.length,
          returned: queue.items.length,
          sortApplied: queue.sortApplied,
          statusApplied: status ?? null,
          assignedApplied: 'assigned_to_current_reviewer',
          pagination: {
            limit: pageLimit,
            hasMore: queue.pagination.hasMore,
            nextPageToken: queue.pagination.nextPageToken ?? null,
            source: queue.pagination.source,
          },
          items: queue.items.map(compactQueueItem),
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
          throw new AirtableClientError(
            'NO_MUTATION_FIELDS',
            'Provide review_feedback, improvement_areas, or both.',
            400,
          );
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
          throw new AirtableClientError('VERSION_NOT_FOUND', 'Template version not found.', 404, { version_id });
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

  server.tool(
    'template_review_get_field_map',
    'Return the template review Airtable field map with confirmed and pending mappings.',
    {},
    async () => asSuccess(TEMPLATE_REVIEW_FIELD_MAP),
  );

  server.tool(
    'template_review_get_metrics',
    'Return compact marketplace template review metrics for a recent date window.',
    {
      days: z.number().int().min(1).max(90).optional(),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
      review_owner: z.union([
        z.string().min(1).describe('Airtable collaborator id for the reviewer.'),
        z.object({ id: z.string().min(1) }),
        z.null(),
      ]),
    },
    async ({ version_id, review_owner }) => {
      try {
        const reviewer = getReviewer();
        if (reviewer) {
          assertReviewerScopedReviewOwner(review_owner, reviewer);
          const actingReviewer = currentReviewerAsCollaborator(getReviewer);
          const updated =
            review_owner === null
              ? await getClient().unassignVersionReviewer(version_id, actingReviewer)
              : await getClient().assignSelfToVersion(version_id, actingReviewer);
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
      release_date_local: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      time_zone: z.string().optional(),
      approve_version: z.boolean().optional(),
      mrp_id_overwrite: z.string().optional(),
    },
    async ({ version_id, release_record_id, release_date_local, time_zone, approve_version, mrp_id_overwrite }) => {
      try {
        if (!release_record_id && !release_date_local && !time_zone) {
          throw new AirtableClientError(
            'MISSING_RELEASE_SELECTOR',
            'Provide release_record_id, release_date_local, or time_zone so the publishing workflow can resolve a release.',
            400,
          );
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
        return asSuccess({ updated_asset: updated, support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.assetMetadata });
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
        return asSuccess({ updated_asset: updated, support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.assetPublishing });
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
    },
    async ({
      version_id,
      review_owner,
      review_status,
      quality_rating,
      improvement_areas,
      review_feedback,
      review_checklist,
      publishing_checklist,
      release_record_id,
      reject_reason,
      rejection_feedback,
    }) => {
      try {
        const reviewer = getReviewer();
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        if (reviewer) {
          assertReviewerScopedReviewOwner(review_owner, reviewer);
          await getClient().requireAssignedVersion(version_id, actingReviewer);
        }

        return asSuccess({
          ...(reviewer
            ? {
                reviewer: reviewerPayload(reviewer),
                acting_reviewer: actingReviewer,
              }
            : {}),
          updated_version: await getClient().updateVersionReview(version_id, {
            review_owner,
            review_status,
            quality_rating,
            improvement_areas,
            review_feedback,
            review_checklist,
            publishing_checklist,
            release_record_id,
            reject_reason,
            rejection_feedback,
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
