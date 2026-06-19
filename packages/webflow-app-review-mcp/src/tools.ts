import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { AirtableClient, AppReviewVersion, CollaboratorRef } from './airtable.js';
import { AirtableClientError } from './airtable.js';
import type { ReviewerProfile } from './reviewer-directory.js';
import {
  APP_REVIEW_FIELD_MAP,
  CAPABILITIES_OPTIONS,
  GOVERNANCE_FINDING_CATEGORY_OPTIONS,
  GOVERNANCE_FINDING_PRIORITY_OPTIONS,
  GOVERNANCE_FINDING_STATUS_OPTIONS,
  MARKETPLACE_STATUS_OPTIONS,
  REJECTION_REASON_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  REVIEW_TYPE_OPTIONS,
  VISIBILITY_OPTIONS,
  getReadOnlyAssetWriteHint,
} from './schema.js';

type ClientFactory = () => AirtableClient;
type ReviewerFactory = () => ReviewerProfile | null;

const collaboratorRefSchema = z.object({
  id: z.string().min(1),
});

const APP_REVIEW_QUEUE_STATUS_OPTIONS = [
  'ready_to_review',
  'in_review',
  'changes_requested',
  'approved',
  'rejected',
  'on_hold',
  'archived',
] as const;

const APP_REVIEW_QUEUE_SORT_OPTIONS = [
  'submissionDatetime_desc',
  'submissionDatetime_asc',
  'versionNumber_desc',
  'versionNumber_asc',
] as const;

const REVIEWER_CONTROLLED_STATUS_OPTIONS = [
  '🏃🏾In Review',
  'Training Check',
  '👀Admin Feedback Review',
  '👀Managed Feedback Review',
  '🔁Response to Review',
  '👀Admin Approval Review',
  '👀Admin Rejection Review',
  '⏸️On Hold',
] as const;

const REQUEST_CHANGES_STATUS_OPTIONS = [
  '📤Changes Requested',
  '📤Changes Requested (No Notification)',
] as const;

function jsonContent(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

function asSuccess(data: unknown) {
  return jsonContent({ ok: true, data });
}

function asError(error: unknown) {
  if (error instanceof AirtableClientError) {
    return jsonContent({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        status: error.status ?? 500,
        details: error.details,
      },
    });
  }
  if (error instanceof Error) {
    return jsonContent({
      ok: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: error.message,
        status: 500,
      },
    });
  }
  return jsonContent({
    ok: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: String(error),
      status: 500,
    },
  });
}

async function requireAppAsset(client: AirtableClient, assetId: string) {
  const asset = await client.getAssetById(assetId);
  if (!asset) {
    throw new AirtableClientError(
      'ASSET_NOT_FOUND_OR_OUT_OF_SCOPE',
      'Asset not found or outside app-review scope.',
      404,
      { assetId },
    );
  }
  return asset;
}

async function requireAppVersion(client: AirtableClient, versionId: string): Promise<AppReviewVersion> {
  const version = await client.getVersionById(versionId);
  if (!version) {
    throw new AirtableClientError('VERSION_NOT_FOUND', 'Version not found.', 404, { versionId });
  }
  if (!version.assetId) {
    throw new AirtableClientError('VERSION_SCOPE_ERROR', 'Version is missing linked asset ID.', 400, { versionId });
  }
  await requireAppAsset(client, version.assetId);
  return version;
}

function cleanObject<T extends Record<string, unknown>>(value: T): T {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as T;
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

function reviewerAttribution(getReviewer: ReviewerFactory): string {
  const reviewer = getReviewer();
  if (!reviewer) return 'Dify App Review Hub';
  return reviewer.name ?? reviewer.email ?? reviewer.accountId;
}

function ensureRequestChangesStatus(value: string | undefined) {
  if (value === undefined) return;
  if ((REQUEST_CHANGES_STATUS_OPTIONS as readonly string[]).includes(value)) return;
  throw new AirtableClientError(
    'INVALID_REQUEST_CHANGES_STATUS',
    'request_changes only supports the changes-requested statuses.',
    400,
    {
      value,
      allowed: REQUEST_CHANGES_STATUS_OPTIONS,
    },
  );
}

export function registerTools(server: McpServer, getClient: ClientFactory, getReviewer: ReviewerFactory = () => null): void {
  server.tool(
    'app_review_health',
    'Runtime health check for Webflow App Review MCP and Airtable connectivity.',
    {},
    async () => {
      try {
        const health = await getClient().healthCheck();
        return asSuccess({
          ...health,
          auth: 'Bearer token required at worker boundary.',
          reviewerIdentity: getReviewer(),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_list_queue',
    'List apps-only review queue with key status fields from Assets.',
    {
      limit: z.number().int().min(1).max(500).optional(),
    },
    async (params) => {
      try {
        const queue = await getClient().listAssetQueue(params.limit ?? 100);
        return asSuccess({ count: queue.length, records: queue });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_get_asset',
    'Get one app review payload by asset_id or app_id, including version history.',
    {
      asset_id: z.string().min(1).optional(),
      app_id: z.string().min(1).optional(),
      versions_limit: z.number().int().min(1).max(500).optional(),
    },
    async (params) => {
      try {
        if (!params.asset_id && !params.app_id) {
          throw new AirtableClientError('INVALID_INPUT', 'Provide either asset_id or app_id.', 400);
        }

        const client = getClient();
        const asset = params.asset_id
          ? await client.getAssetById(params.asset_id)
          : await client.getAssetByAppId(params.app_id as string);

        if (!asset) {
          throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Asset not found in apps scope.', 404, {
            asset_id: params.asset_id,
            app_id: params.app_id,
          });
        }

        const versions = await client.listVersionsForAsset(asset.assetId, params.versions_limit ?? 100);
        return asSuccess({ asset, versions });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_list_versions',
    'List all submission versions for an app asset.',
    {
      asset_id: z.string().min(1),
      limit: z.number().int().min(1).max(500).optional(),
    },
    async (params) => {
      try {
        const client = getClient();
        await requireAppAsset(client, params.asset_id);
        const versions = await client.listVersionsForAsset(params.asset_id, params.limit ?? 100);
        return asSuccess({ asset_id: params.asset_id, count: versions.length, versions });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_get_version',
    'Get one version record by version_id (apps-only scoped).',
    {
      version_id: z.string().min(1),
    },
    async (params) => {
      try {
        const version = await requireAppVersion(getClient(), params.version_id);
        return asSuccess({ version });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_get_field_map',
    'Return canonical Airtable field mappings, writability, and allowed status options.',
    {},
    async () => asSuccess(APP_REVIEW_FIELD_MAP),
  );

  server.tool(
    'app_review_list_governance_findings',
    'List Airtable governance/transparency findings captured from app-review threads.',
    {
      limit: z.number().int().min(1).max(500).optional(),
      status: z.enum(GOVERNANCE_FINDING_STATUS_OPTIONS).optional(),
      category: z.enum(GOVERNANCE_FINDING_CATEGORY_OPTIONS).optional(),
      priority: z.enum(GOVERNANCE_FINDING_PRIORITY_OPTIONS).optional(),
      decision_needed: z.boolean().optional(),
      search: z.string().min(1).optional(),
    },
    async ({ limit, status, category, priority, decision_needed, search }) => {
      try {
        const findings = await getClient().listGovernanceFindings({
          limit: limit ?? 100,
          status,
          category,
          priority,
          decisionNeeded: decision_needed,
          search,
        });
        return asSuccess({ count: findings.length, findings });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_get_governance_finding',
    'Get one governance/transparency finding by Airtable record ID.',
    {
      finding_id: z.string().min(1),
    },
    async ({ finding_id }) => {
      try {
        const finding = await getClient().getGovernanceFinding(finding_id);
        if (!finding) {
          throw new AirtableClientError('GOVERNANCE_FINDING_NOT_FOUND', 'Governance finding not found.', 404, {
            finding_id,
          });
        }
        return asSuccess({ finding });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_create_governance_finding',
    'Create an Airtable governance/transparency finding from a Slack thread, Zendesk ticket, app review, or docs gap.',
    {
      title: z.string().min(1).max(160),
      category: z.enum(GOVERNANCE_FINDING_CATEGORY_OPTIONS),
      summary: z.string().min(1),
      status: z.enum(GOVERNANCE_FINDING_STATUS_OPTIONS).optional(),
      priority: z.enum(GOVERNANCE_FINDING_PRIORITY_OPTIONS).optional(),
      evidence: z.string().optional(),
      recommendation: z.string().optional(),
      decision_needed: z.boolean().optional(),
      next_action: z.string().optional(),
      owner: z.string().optional(),
      app_name: z.string().optional(),
      app_id: z.string().optional(),
      asset_id: z.string().optional(),
      version_id: z.string().optional(),
      source_url: z.string().url().optional(),
      linked_urls: z.array(z.string().url()).optional(),
      reporter: z.string().optional(),
    },
    async (params) => {
      try {
        const finding = await getClient().createGovernanceFinding({
          ...params,
          reporter: params.reporter ?? reviewerAttribution(getReviewer),
          created_by_agent: 'webflow-app-review-mcp',
        });
        return asSuccess({
          reviewer: getReviewer(),
          finding,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_update_governance_finding',
    'Update allowed fields on an Airtable governance/transparency finding.',
    {
      finding_id: z.string().min(1),
      title: z.string().min(1).max(160).optional(),
      category: z.enum(GOVERNANCE_FINDING_CATEGORY_OPTIONS).optional(),
      summary: z.string().optional(),
      status: z.enum(GOVERNANCE_FINDING_STATUS_OPTIONS).optional(),
      priority: z.enum(GOVERNANCE_FINDING_PRIORITY_OPTIONS).optional(),
      evidence: z.string().optional(),
      recommendation: z.string().optional(),
      decision_needed: z.boolean().optional(),
      next_action: z.string().optional(),
      owner: z.string().optional(),
      app_name: z.string().optional(),
      app_id: z.string().optional(),
      asset_id: z.string().optional(),
      version_id: z.string().optional(),
      source_url: z.string().url().optional(),
      linked_urls: z.array(z.string().url()).optional(),
      reporter: z.string().optional(),
    },
    async ({ finding_id, ...params }) => {
      try {
        const finding = await getClient().updateGovernanceFinding(finding_id, params);
        return asSuccess({
          reviewer: getReviewer(),
          finding,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_my_queue',
    'List app review queue items currently assigned to the authenticated reviewer.',
    {
      status: z.enum(APP_REVIEW_QUEUE_STATUS_OPTIONS).optional(),
      sort: z.enum(APP_REVIEW_QUEUE_SORT_OPTIONS).optional(),
      limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ limit, status, sort }) => {
      try {
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        if (!actingReviewer?.id) {
          throw new AirtableClientError(
            'REVIEWER_IDENTITY_UNAVAILABLE',
            'Current reviewer identity is not configured for this MCP runtime.',
            503,
          );
        }
        const queue = await getClient().listAssetQueueDetailed({
          limit: limit ?? 100,
          status,
          assigned: 'assigned',
          sort: sort ?? 'submissionDatetime_desc',
          currentReviewer: actingReviewer,
          onlyAssignedToCurrentReviewer: true,
        });
        return asSuccess({
          count: queue.items.length,
          sortApplied: queue.sortApplied,
          statusApplied: status ?? null,
          assignedApplied: 'assigned_to_current_reviewer',
          items: queue.items,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_get_review_context',
    'Get normalized review context for one app version, including reviewer ownership flags.',
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
    'app_review_assign_self',
    'Assign the authenticated reviewer to an app version when it is unassigned or already owned by the same reviewer.',
    {
      version_id: z.string().min(1),
    },
    async ({ version_id }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const updated = await getClient().assignSelfToVersion(version_id, currentReviewerAsCollaborator(getReviewer));
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: currentReviewerAsCollaborator(getReviewer),
          updated_version: updated,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_unassign_self',
    'Clear the reviewer field only when the selected app version is currently assigned to the authenticated reviewer.',
    {
      version_id: z.string().min(1),
    },
    async ({ version_id }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const updated = await getClient().unassignVersionReviewer(version_id, currentReviewerAsCollaborator(getReviewer));
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: currentReviewerAsCollaborator(getReviewer),
          updated_version: updated,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_save_draft_feedback',
    'Save draft review feedback for an app version without changing the official decision state.',
    {
      version_id: z.string().min(1),
      review_feedback: z.string().min(1),
    },
    async ({ version_id, review_feedback }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        const updated = await getClient().updateVersionReview(version_id, {
          reviewer: { id: reviewer.airtableCollaboratorId },
          review_feedback,
        });
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: updated,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_set_review_status',
    'Set a reviewer-controlled app review status after ownership has been established through self-assignment.',
    {
      version_id: z.string().min(1),
      review_status: z.enum(REVIEWER_CONTROLLED_STATUS_OPTIONS),
    },
    async ({ version_id, review_status }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        const updated = await getClient().updateVersionReview(version_id, {
          review_status,
          reviewer: { id: reviewer.airtableCollaboratorId },
        });
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: updated,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_request_changes',
    'Set an app version to changes-requested and attach reviewer feedback using the authenticated reviewer identity.',
    {
      version_id: z.string().min(1),
      review_feedback: z.string().min(1),
      rejection_reason: z.enum(REJECTION_REASON_OPTIONS).optional(),
      review_status: z.enum(REQUEST_CHANGES_STATUS_OPTIONS).optional(),
    },
    async ({ version_id, review_feedback, rejection_reason, review_status }) => {
      try {
        ensureRequestChangesStatus(review_status);
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        const updated = await getClient().updateVersionReview(version_id, {
          review_status: review_status ?? '📤Changes Requested',
          reviewer: { id: reviewer.airtableCollaboratorId },
          rejection_reason,
          review_feedback,
        });
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: updated,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_approve_version',
    'Approve an app version using the authenticated reviewer identity.',
    {
      version_id: z.string().min(1),
      review_feedback: z.string().optional(),
      review_type: z.enum(REVIEW_TYPE_OPTIONS).optional(),
    },
    async ({ version_id, review_feedback, review_type }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        const updated = await getClient().updateVersionReview(version_id, {
          review_status: '✅Approved',
          reviewer: { id: reviewer.airtableCollaboratorId },
          review_type,
          review_feedback,
        });
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: updated,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_reject_version',
    'Reject an app version with reason and reviewer feedback using the authenticated reviewer identity.',
    {
      version_id: z.string().min(1),
      rejection_reason: z.enum(REJECTION_REASON_OPTIONS),
      review_feedback: z.string().min(1),
      review_type: z.enum(REVIEW_TYPE_OPTIONS).optional(),
    },
    async ({ version_id, rejection_reason, review_feedback, review_type }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        const updated = await getClient().updateVersionReview(version_id, {
          review_status: '❌Rejected',
          reviewer: { id: reviewer.airtableCollaboratorId },
          review_type,
          rejection_reason,
          review_feedback,
        });
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: updated,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_update_version_review',
    'Update review fields on an Asset Version record.',
    {
      version_id: z.string().min(1),
      review_status: z.enum(REVIEW_STATUS_OPTIONS).optional(),
      review_type: z.enum(REVIEW_TYPE_OPTIONS).optional(),
      reviewer: z.union([collaboratorRefSchema, z.null()]).optional(),
      rejection_reason: z.enum(REJECTION_REASON_OPTIONS).optional(),
      review_feedback: z.string().optional(),
      submission_datetime_override: z.union([z.string().datetime(), z.null()]).optional(),
    },
    async (params) => {
      try {
        const client = getClient();
        await requireAppVersion(client, params.version_id);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);

        const mutation = cleanObject({
          review_status: params.review_status,
          review_type: params.review_type,
          reviewer: params.reviewer as CollaboratorRef | null | undefined,
          rejection_reason: params.rejection_reason,
          review_feedback: params.review_feedback,
          submission_datetime_override: params.submission_datetime_override,
        });

        if (Object.keys(mutation).length === 0) {
          throw new AirtableClientError(
            'NO_MUTATION_FIELDS',
            'No version review fields were provided.',
            400,
          );
        }

        const updated = await client.updateVersionReview(params.version_id, mutation);
        return asSuccess({
          reviewer: getReviewer(),
          acting_reviewer: actingReviewer,
          updated_version: updated,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_update_asset_metadata',
    'Update writable app metadata fields on Assets. Read-only/computed fields are rejected or routed.',
    {
      asset_id: z.string().min(1),
      app_name: z.string().optional(),
      app_capabilities: z.enum(CAPABILITIES_OPTIONS).optional(),
      client_id: z.string().optional(),
      visibility_status: z.enum(VISIBILITY_OPTIONS).optional(),
      relationships_status: z.union([collaboratorRefSchema, z.null()]).optional(),
      features_text: z.string().optional(),
      notes: z.string().optional(),
      credentials: z.string().optional(),
      description_short: z.string().optional(),
      description_long_html: z.string().optional(),
      install_url: z.string().optional(),
      categories_record_ids: z.array(z.string()).optional(),
      icon_image_url: z.union([z.string().url(), z.null()]).optional(),
      icon_image_alt_text: z.string().optional(),
      carousel_image_urls: z.array(z.string().url()).optional(),
      carousel_image_alt_text: z.string().optional(),
      payment_times: z.array(z.string()).optional(),
      demo_video_url: z.string().url().optional(),
      privacy_policy_url: z.string().url().optional(),
      terms_and_conditions_url: z.string().url().optional(),
      website_url: z.string().url().optional(),
      support_email_or_url: z.string().optional(),
      preview_site_url: z.string().url().optional(),
      promo_video_url: z.string().url().optional(),
      marketplace_status: z.enum(MARKETPLACE_STATUS_OPTIONS).optional(),
      latest_review_status: z.enum(REVIEW_STATUS_OPTIONS).optional(),
      days_in_current_review_stage: z.number().optional(),
      workspace_dashboard_url: z.string().optional(),
      app_id: z.string().optional(),
    },
    async (params) => {
      try {
        const client = getClient();
        await requireAppAsset(client, params.asset_id);

        if (params.days_in_current_review_stage !== undefined) {
          throw new AirtableClientError(
            'READ_ONLY_FIELD',
            'days_in_current_review_stage is read-only.',
            400,
            getReadOnlyAssetWriteHint('days_in_current_review_stage'),
          );
        }
        if (params.workspace_dashboard_url !== undefined) {
          throw new AirtableClientError(
            'READ_ONLY_FIELD',
            'workspace_dashboard_url is read-only.',
            400,
            getReadOnlyAssetWriteHint('workspace_dashboard_url'),
          );
        }
        if (params.app_id !== undefined) {
          throw new AirtableClientError(
            'READ_ONLY_FIELD',
            'app_id is read-only.',
            400,
            getReadOnlyAssetWriteHint('app_id'),
          );
        }

        const metadataPayload = cleanObject({
          app_name: params.app_name,
          app_capabilities: params.app_capabilities,
          client_id: params.client_id,
          visibility_status: params.visibility_status,
          relationships_status: params.relationships_status as CollaboratorRef | null | undefined,
          features_text: params.features_text,
          notes: params.notes,
          credentials: params.credentials,
          description_short: params.description_short,
          description_long_html: params.description_long_html,
          install_url: params.install_url,
          categories_record_ids: params.categories_record_ids,
          icon_image_url: params.icon_image_url,
          icon_image_alt_text: params.icon_image_alt_text,
          carousel_image_urls: params.carousel_image_urls,
          carousel_image_alt_text: params.carousel_image_alt_text,
          payment_times: params.payment_times,
          demo_video_url: params.demo_video_url,
          privacy_policy_url: params.privacy_policy_url,
          terms_and_conditions_url: params.terms_and_conditions_url,
          website_url: params.website_url,
          support_email_or_url: params.support_email_or_url,
          preview_site_url: params.preview_site_url,
          promo_video_url: params.promo_video_url,
          marketplace_status: params.marketplace_status,
        });

        if (params.latest_review_status !== undefined && Object.keys(metadataPayload).length > 0) {
          throw new AirtableClientError(
            'COMBINED_ROUTED_WRITE_UNSUPPORTED',
            'latest_review_status cannot be combined with asset metadata writes in one request.',
            400,
            {
              routeTo: 'Use app_review_set_review_status or app_review_update_version_review separately from asset metadata edits.',
            },
          );
        }

        const routedUpdates: Record<string, unknown> = {};
        if (params.latest_review_status !== undefined) {
          const versions = await client.listVersionsForAsset(params.asset_id, 1);
          const latestVersion = versions[0];
          if (!latestVersion) {
            throw new AirtableClientError(
              'ROUTING_FAILED',
              'Unable to route latest_review_status: no versions found for this asset.',
              400,
              getReadOnlyAssetWriteHint('latest_review_status'),
            );
          }

          const routed = await client.updateVersionReview(latestVersion.versionId, {
            review_status: params.latest_review_status,
          });
          routedUpdates.latest_review_status = {
            routedToVersionId: latestVersion.versionId,
            updatedVersion: routed,
          };
        }

        let updatedAsset = null;
        if (Object.keys(metadataPayload).length > 0) {
          updatedAsset = await client.updateAssetMetadata(params.asset_id, metadataPayload);
        } else {
          updatedAsset = await client.getAssetById(params.asset_id);
        }

        if (!updatedAsset) {
          throw new AirtableClientError(
            'ASSET_NOT_FOUND_OR_OUT_OF_SCOPE',
            'Asset not found after update or outside app-review scope.',
            404,
            { asset_id: params.asset_id },
          );
        }

        if (Object.keys(metadataPayload).length === 0 && Object.keys(routedUpdates).length === 0) {
          throw new AirtableClientError(
            'NO_MUTATION_FIELDS',
            'No writable fields were provided for update.',
            400,
          );
        }

        return asSuccess({
          reviewer: getReviewer(),
          acting_reviewer: currentReviewerAsCollaborator(getReviewer),
          updated_asset: updatedAsset,
          routed_updates: routedUpdates,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'app_review_set_marketplace_status',
    'Set the Marketplace Status on an app asset.',
    {
      asset_id: z.string().min(1),
      marketplace_status: z.enum(MARKETPLACE_STATUS_OPTIONS),
    },
    async (params) => {
      try {
        const client = getClient();
        await requireAppAsset(client, params.asset_id);
        const updated = await client.setMarketplaceStatus(params.asset_id, params.marketplace_status);
        return asSuccess({
          reviewer: getReviewer(),
          acting_reviewer: currentReviewerAsCollaborator(getReviewer),
          updated_asset: updated,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );
}
