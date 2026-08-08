import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { prepareAdminTemplateFill, prepareAdminTemplateFillBatch } from './admin-template-fill.js';
import { MRP_VISIBILITY_VALUES, setMrpVisibility, type MarketplaceAdminConfig } from './admin-mrp.js';
import {
  buildAdminExecuteBundle,
  buildAdminTemplateCreateExecuteScript,
  buildAdminTemplateUpdateExecuteScript,
  buildAdminTemplateVerifyScript,
  buildAdminThumbnailUploadExecuteScript,
  type AdminTemplateExpectedFields,
  type AdminThumbnailSource,
} from './admin-template-execute.js';
import {
  buildThumbnailProxyUrl,
  pickThumbnailAttachment,
  THUMBNAIL_PROXY_KINDS,
  type ThumbnailProxyKind,
} from './thumbnail-proxy.js';
import type { AirtableClient, TemplateReviewAssetThumbnails, TemplateReviewQueueItem } from './airtable.js';
import { AirtableClientError } from './airtable.js';
import { CHECKLIST_KIND_VALUES, parseChecklist } from './checklist.js';
import { COMPREHENSIVE_REVIEW_LANE_IDS, EVIDENCE_LABELS, formatComprehensiveAgentReviewFeedback } from './comprehensive-review-feedback.js';
import { COMPREHENSIVE_REVIEW_CONTRACT } from './comprehensive-review-contract.js';
import { RUBRIC_DIMENSIONS } from './comprehensive-review-contract.js';
import { buildPublishedSiteSandboxBundle } from './published-site-sandbox-bundle.js';
import {
  PublishedSiteSandboxExecutionError,
  runPublishedSiteSandbox,
  type PublishedSiteSandboxExecutionConfig,
} from './published-site-sandbox-execution.js';
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

/**
 * Advisory warning when a version is approved with 📝Review Checklist items
 * still unchecked. Never blocks: the checklist's own express-review branch says
 * reviewers may intentionally skip items.
 */
function reviewChecklistWarnings(version: { rawFields?: Record<string, unknown> } | null | undefined): string[] {
  const raw = version?.rawFields?.[TEMPLATE_REVIEW_FIELD_MAP.confirmed.versions.reviewChecklist];
  const { summary } = parseChecklist(typeof raw === 'string' ? raw : undefined);
  if (summary.total === 0 || summary.unchecked === 0) return [];
  return [
    `Review checklist has ${summary.unchecked} of ${summary.total} items unchecked. This is advisory: express reviews intentionally skip items. Use template_review_set_checklist_items to record what was actually completed.`,
  ];
}

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
  allowedToolNames?: ReadonlySet<string>;
}

export interface AdminExecuteConfig {
  /** Public origin of this worker, used to mint signed thumbnail-proxy URLs. */
  publicOrigin?: string;
  /** HMAC secret for thumbnail-proxy URL signing (worker-side only). */
  thumbnailProxySecret?: string;
}

export interface ToolRuntimeConfig extends ValidationToolConfig {
  sandboxExecution?: PublishedSiteSandboxExecutionConfig;
  adminExecute?: AdminExecuteConfig;
  marketplaceAdmin?: MarketplaceAdminConfig;
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
  'template_review_set_checklist_items',
  'template_review_complete_publishing',
  'template_review_update_asset_metadata',
  'template_review_update_asset_publishing',
  'template_review_update_version_review',
  'template_review_approve_version',
  'template_review_reject_version',
  // Execute-script generators write nothing server-side, but the scripts they
  // hand out submit to Webflow Admin when the reviewer runs them. Read-only
  // sessions must not receive them.
  'template_review_prepare_admin_template_create_execute',
  'template_review_prepare_admin_template_update_execute',
  'template_review_prepare_admin_template_thumbnail_execute',
  // Server-side Webflow write: flips MarketplaceResourceProfile visibility.
  'template_review_set_mrp_visibility',
]);

export function registerTools(
  mcpServer: McpServer,
  getClient: ClientFactory,
  getReviewer: ReviewerFactory = () => null,
  runtimeConfig: ToolRuntimeConfig = {},
  access: ToolAccess = { allowWrites: true },
): void {
  const registerOnServer = mcpServer.tool.bind(mcpServer) as (...args: unknown[]) => unknown;
  const server = {
    tool: ((name: string, ...rest: unknown[]) => {
      if (access.allowedToolNames && !access.allowedToolNames.has(name)) return undefined;
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
    'template_review_run_published_site_sandbox',
    'Read-only: execute the fixed, bounded E2B published-site evidence runner. Accepts no caller code or credentials, blocks private networks, always attempts sandbox cleanup, performs no Airtable write, and makes no review decision.',
    {
      published_url: z.string().url(),
      run_id: z.string().min(1).optional(),
      policy_snapshot_id: z.string().min(1).optional(),
      max_pages: z.number().int().min(1).max(25).optional(),
      max_network_requests: z.number().int().min(25).max(1000).optional(),
      timeout_ms: z.number().int().min(5_000).max(120_000).optional(),
      viewports: z.array(sandboxViewportSchema).min(1).max(6).optional(),
      allowed_hosts: z.array(z.string().min(1)).max(10).optional(),
      include_screenshots: z.boolean().optional(),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async (input) => {
      try {
        const executor = runtimeConfig.sandboxExecution?.executor ?? runPublishedSiteSandbox;
        const result = await executor(input, runtimeConfig.sandboxExecution ?? {});
        const screenshots = result.screenshots.map(({ data: _data, ...screenshot }) => screenshot);
        const data = { ...result, screenshots };
        return {
          structuredContent: { ok: true, data },
          content: [
            { type: 'text' as const, text: JSON.stringify({ ok: true, data }, null, 2) },
            ...result.screenshots
              .filter((screenshot) => screenshot.included && screenshot.data)
              .map((screenshot) => ({
                type: 'image' as const,
                data: screenshot.data as string,
                mimeType: screenshot.mime_type,
              })),
          ],
        };
      } catch (error) {
        if (error instanceof PublishedSiteSandboxExecutionError) {
          return jsonContent(
            {
              ok: false,
              error: {
                code: error.code,
                message: error.message,
                status: error.status,
                details: error.details,
              },
            },
            true,
          );
        }
        return asError(error);
      }
    },
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
    'template_review_prepare_admin_template_fill',
    'Read-only: generate Webflow Admin template form data plus a fill-only console script/bookmarklet for https://webflow.com/admin/templates. Does not submit the form, create an MRP, or write Airtable.',
    {
      version_id: z.string().min(1),
      include_script: z.boolean().optional(),
      include_bookmarklet: z.boolean().optional(),
    },
    async ({ version_id, include_script, include_bookmarklet }) => {
      try {
        const context = await getClient().getReviewContext(version_id, currentReviewerAsCollaborator(getReviewer));
        return asSuccess(
          prepareAdminTemplateFill(context, {
            includeScript: include_script ?? true,
            includeBookmarklet: include_bookmarklet ?? true,
          }),
        );
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_prepare_admin_template_fill_batch',
    'Read-only: generate compact Webflow Admin template form data for multiple template versions. Omits console scripts by default so bulk MRP handoffs stay readable.',
    {
      version_ids: z.array(z.string().min(1)).min(1).max(25),
      include_scripts: z.boolean().optional(),
      include_bookmarklets: z.boolean().optional(),
    },
    async ({ version_ids, include_scripts, include_bookmarklets }) => {
      try {
        const uniqueVersionIds = Array.from(new Set(version_ids));
        const contexts = await Promise.all(uniqueVersionIds.map((versionId) => getClient().getReviewContext(versionId, currentReviewerAsCollaborator(getReviewer))));
        return asSuccess(
          prepareAdminTemplateFillBatch(contexts, {
            includeScript: include_scripts ?? false,
            includeBookmarklet: include_bookmarklets ?? false,
          }),
        );
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_get_template_thumbnail',
    'Read-only: return fresh download links for the asset\'s 🖼️Thumbnail Image, secondary thumbnails, and carousel images. Use after creating the template in Webflow Admin to upload the thumbnail there. Airtable attachment URLs are time-limited — re-run this tool if a link has expired.',
    {
      asset_id: z.string().min(1).optional(),
      version_id: z.string().min(1).optional(),
    },
    async ({ asset_id, version_id }) => {
      try {
        if (!asset_id && !version_id) {
          throw new AirtableClientError('MISSING_IDENTIFIER', 'Provide asset_id or version_id.', 400);
        }
        const client = getClient();
        let resolvedAssetId = asset_id;
        if (!resolvedAssetId && version_id) {
          const version = await client.getVersionById(version_id);
          if (!version) {
            throw new AirtableClientError('VERSION_NOT_FOUND', 'Template version not found.', 404, { version_id });
          }
          if (!version.assetId) {
            throw new AirtableClientError('VERSION_ASSET_ID_MISSING', 'Template version is missing its asset linkage.', 500, { version_id });
          }
          resolvedAssetId = version.assetId;
        }
        const thumbnails = await client.getAssetThumbnails(resolvedAssetId!);
        if (!thumbnails) {
          throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Template asset not found in template-review scope.', 404, {
            asset_id: resolvedAssetId,
          });
        }
        return asSuccess({
          schema_version: 'webflow_admin_template_thumbnails.v0.1',
          source: {
            asset_id: thumbnails.assetId,
            ...(version_id ? { version_id } : {}),
            template_name: thumbnails.templateName,
          },
          thumbnail: thumbnails.thumbnail,
          secondary_thumbnails: thumbnails.secondaryThumbnails,
          carousel_images: thumbnails.carouselImages,
          url_expiry_note: 'Airtable attachment URLs are time-limited (roughly 2 hours). Re-run this tool for fresh links instead of reusing saved URLs.',
          next_steps: [
            'Download the primary thumbnail and upload it on the template\'s Admin edit page after the initial create at https://webflow.com/admin/templates.',
            'Copy the new Template ID into 👀ℹ️MRP ID (Override) (template_review_update_asset_publishing) before approving the version.',
          ],
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  const resolveAssetIdForThumbnails = async (assetId?: string, versionId?: string): Promise<string> => {
    if (assetId) return assetId;
    if (!versionId) {
      throw new AirtableClientError('MISSING_IDENTIFIER', 'Provide asset_id or version_id.', 400);
    }
    const version = await getClient().getVersionById(versionId);
    if (!version) {
      throw new AirtableClientError('VERSION_NOT_FOUND', 'Template version not found.', 404, { version_id: versionId });
    }
    if (!version.assetId) {
      throw new AirtableClientError('VERSION_ASSET_ID_MISSING', 'Template version is missing its asset linkage.', 500, {
        version_id: versionId,
      });
    }
    return version.assetId;
  };

  const thumbnailSourceFor = async (
    thumbnails: TemplateReviewAssetThumbnails,
    kind: ThumbnailProxyKind,
    index: number,
  ): Promise<AdminThumbnailSource | null> => {
    const attachment = pickThumbnailAttachment(thumbnails, kind, index);
    if (!attachment?.url) return null;
    const adminExecute = runtimeConfig.adminExecute;
    const proxyUrl =
      adminExecute?.publicOrigin && adminExecute.thumbnailProxySecret
        ? await buildThumbnailProxyUrl({
            origin: adminExecute.publicOrigin,
            secret: adminExecute.thumbnailProxySecret,
            assetId: thumbnails.assetId,
            kind,
            index,
          })
        : undefined;
    return {
      label: kind === 'thumbnail' ? 'primary thumbnail' : `${kind} image #${index + 1}`,
      filename: attachment.filename ?? `${thumbnails.templateName || thumbnails.assetId}-tall-thumbnail.png`,
      direct_url: attachment.url,
      ...(proxyUrl ? { proxy_url: proxyUrl } : {}),
      ...(attachment.width ? { width: attachment.width } : {}),
      ...(attachment.height ? { height: attachment.height } : {}),
      ...(attachment.sizeBytes ? { size_bytes: attachment.sizeBytes } : {}),
    };
  };

  const MONGO_TEMPLATE_ID = z
    .string()
    .regex(/^[0-9a-f]{24}$/i, 'Expected a 24-character hex Webflow Template ID (from /admin/templates/<id>).');

  server.tool(
    'template_review_prepare_admin_template_create_execute',
    'Execute-mode: generate a console script that CREATES the marketplace template on https://webflow.com/admin/templates when the reviewer runs it and confirms — POST create, follow-up field sync, and tall-thumbnail upload in one paste. The MCP performs no Webflow writes itself; auth, CSRF, and the final confirmation stay with the signed-in reviewer.',
    {
      version_id: z.string().min(1),
      include_thumbnail_upload: z.boolean().optional(),
      include_bookmarklet: z.boolean().optional(),
    },
    async ({ version_id, include_thumbnail_upload, include_bookmarklet }) => {
      try {
        const context = await getClient().getReviewContext(version_id, currentReviewerAsCollaborator(getReviewer));
        const fillBundle = prepareAdminTemplateFill(context, { includeScript: false, includeBookmarklet: false });
        if (fillBundle.missing_fields.length > 0) {
          throw new AirtableClientError(
            'ADMIN_FORM_INCOMPLETE',
            'Cannot generate a create-execute script while required Admin form fields are missing.',
            422,
            { missing_fields: fillBundle.missing_fields },
          );
        }

        const warnings: string[] = [...(fillBundle.form_data.admin_form_warnings ?? [])];
        if (!fillBundle.readiness.can_publish) {
          warnings.push(
            'This version is not currently publish-ready according to MCP capability flags. Confirm approval state before running the script.',
          );
        }

        let thumbnail: AdminThumbnailSource | undefined;
        if (include_thumbnail_upload !== false && context.assetId) {
          const thumbnails = await getClient().getAssetThumbnails(context.assetId);
          const source = thumbnails ? await thumbnailSourceFor(thumbnails, 'thumbnail', 0) : null;
          if (source) thumbnail = source;
          else warnings.push('No primary thumbnail attachment found; the script will skip the thumbnail upload step.');
        }

        return asSuccess({
          ...buildAdminExecuteBundle({
            action: 'create',
            consoleScript: buildAdminTemplateCreateExecuteScript({ formData: fillBundle.form_data, thumbnail }),
            extraBoundary: [
              'The script chains POST create → PUT field sync → tall-thumbnail upload, each visible in the console.',
              'After it finishes, record the new Template ID in 👀ℹ️MRP ID (Override) via template_review_update_asset_publishing.',
            ],
            warnings,
            includeBookmarklet: include_bookmarklet === true,
          }),
          source: fillBundle.source,
          form_data: fillBundle.form_data,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_prepare_admin_template_update_execute',
    'Execute-mode: generate a console script that UPDATES an existing marketplace template via PUT /admin/api/templates/:id when the reviewer runs it and confirms. The script fetches current state first, shows a diff table, and preserves untouched checkbox booleans (starter/archived/tutorial/standard) — the Admin API silently flips omitted booleans to false. The MCP performs no Webflow writes itself.',
    {
      template_id: MONGO_TEMPLATE_ID,
      changes: z
        .object({
          name: z.string().min(1).optional(),
          description: z.string().min(1).optional(),
          extDetailPageUrl: z.string().min(1).optional(),
          extCategory: z.string().min(1).optional(),
          extMainTag: z.string().min(1).optional(),
          type: z.string().min(1).optional(),
          cost: z.number().int().min(0).optional().describe('Price in cents (Admin stores cost in cents).'),
          featured: z.number().int().optional(),
          usedCount: z.number().int().min(0).optional(),
          category: z.string().optional(),
          features: z.array(z.string()).optional(),
          starter: z.boolean().optional(),
          archived: z.boolean().optional(),
          tutorial: z.boolean().optional(),
          standard: z.boolean().optional(),
        })
        .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one change.' }),
      include_bookmarklet: z.boolean().optional(),
    },
    async ({ template_id, changes, include_bookmarklet }) => {
      try {
        return asSuccess(
          buildAdminExecuteBundle({
            action: 'update',
            consoleScript: buildAdminTemplateUpdateExecuteScript(template_id, changes),
            extraBoundary: [
              'The script GETs current template state, prints a diff table, and only PUTs after the reviewer confirms.',
              'Checkbox booleans not listed in the diff are preserved exactly as they are today.',
            ],
            includeBookmarklet: include_bookmarklet === true,
          }),
        );
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_prepare_admin_template_thumbnail_execute',
    'Execute-mode: generate a console script that uploads the asset\'s Airtable thumbnail as the template\'s tall thumbnail via POST /admin/api/templates/:id/tall-thumbnail when the reviewer runs it and confirms. Bundles a direct Airtable link plus a signed worker proxy link (fresh bytes, CORS-safe) as fallback. The MCP performs no Webflow writes itself.',
    {
      template_id: MONGO_TEMPLATE_ID,
      asset_id: z.string().min(1).optional(),
      version_id: z.string().min(1).optional(),
      image: z.enum(THUMBNAIL_PROXY_KINDS).optional().describe('Which Airtable image to upload (default: thumbnail).'),
      image_index: z.number().int().min(0).optional().describe('Index within secondary/carousel images (default: 0).'),
      include_bookmarklet: z.boolean().optional(),
    },
    async ({ template_id, asset_id, version_id, image, image_index, include_bookmarklet }) => {
      try {
        const resolvedAssetId = await resolveAssetIdForThumbnails(asset_id, version_id);
        const thumbnails = await getClient().getAssetThumbnails(resolvedAssetId);
        if (!thumbnails) {
          throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Template asset not found in template-review scope.', 404, {
            asset_id: resolvedAssetId,
          });
        }
        const kind: ThumbnailProxyKind = image ?? 'thumbnail';
        const index = image_index ?? 0;
        const source = await thumbnailSourceFor(thumbnails, kind, index);
        if (!source) {
          throw new AirtableClientError('IMAGE_NOT_FOUND', `No ${kind} image at index ${index} for this asset.`, 404, {
            asset_id: resolvedAssetId,
            image: kind,
            image_index: index,
          });
        }
        const warnings: string[] = [];
        if (!source.proxy_url) {
          warnings.push(
            'No signed proxy URL available in this runtime; the script only has the direct Airtable link, which expires in roughly 2 hours and may be CORS-blocked. Prefer running this tool against the deployed worker.',
          );
        }
        return asSuccess({
          ...buildAdminExecuteBundle({
            action: 'upload_thumbnail',
            consoleScript: buildAdminThumbnailUploadExecuteScript(template_id, source),
            extraBoundary: ['The script fetches image bytes, shows size, and only uploads after the reviewer confirms.'],
            warnings,
            includeBookmarklet: include_bookmarklet === true,
          }),
          source: { asset_id: thumbnails.assetId, template_name: thumbnails.templateName, image: kind, image_index: index },
          image_details: source,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_prepare_admin_template_verify',
    'Read-only: generate a console script that GETs the Admin template record and compares it field-by-field against the Airtable-derived values (name, slug, description, detail path, category, tag, type, cost). Prints a match table; writes nothing. Resolves the Template ID from the asset\'s MRP ID override when template_id is omitted.',
    {
      version_id: z.string().min(1),
      template_id: MONGO_TEMPLATE_ID.optional(),
      include_bookmarklet: z.boolean().optional(),
    },
    async ({ version_id, template_id, include_bookmarklet }) => {
      try {
        const context = await getClient().getReviewContext(version_id, currentReviewerAsCollaborator(getReviewer));
        const resolvedTemplateId = template_id ?? context.asset?.mrpIdOverride ?? context.asset?.mrpId;
        if (!resolvedTemplateId || !/^[0-9a-f]{24}$/i.test(resolvedTemplateId)) {
          throw new AirtableClientError(
            'TEMPLATE_ID_UNRESOLVED',
            'No template_id was provided and the asset has no 24-hex MRP ID (override) to verify against. Create the template in Admin first, or pass template_id.',
            422,
            { version_id, mrp_id_override: context.asset?.mrpIdOverride ?? null, mrp_id: context.asset?.mrpId ?? null },
          );
        }
        const fillBundle = prepareAdminTemplateFill(context, { includeScript: false, includeBookmarklet: false });
        const adminForm = fillBundle.form_data.admin_form;
        const expected: AdminTemplateExpectedFields = {
          ...(adminForm.name !== undefined ? { name: adminForm.name } : {}),
          ...(adminForm.shortName !== undefined ? { shortName: adminForm.shortName } : {}),
          ...(adminForm.description !== undefined ? { description: adminForm.description } : {}),
          ...(adminForm.extDetailPageUrl !== undefined ? { extDetailPageUrl: adminForm.extDetailPageUrl } : {}),
          ...(adminForm.extCategory !== undefined ? { extCategory: adminForm.extCategory } : {}),
          ...(adminForm.extMainTag !== undefined ? { extMainTag: adminForm.extMainTag } : {}),
          ...(adminForm.type !== undefined ? { type: adminForm.type } : {}),
          ...(adminForm.cost !== undefined ? { cost: Number(adminForm.cost) } : {}),
        };
        const consoleScript = buildAdminTemplateVerifyScript(resolvedTemplateId, expected);
        return asSuccess({
          schema_version: 'webflow_admin_template_verify.v0.1',
          source: fillBundle.source,
          template_id: resolvedTemplateId,
          template_id_source: template_id ? 'input' : context.asset?.mrpIdOverride ? 'mrp_id_override' : 'mrp_id',
          expected,
          ...(fillBundle.missing_fields.length ? { expected_gaps: fillBundle.missing_fields } : {}),
          admin_url: `https://webflow.com/admin/templates/${resolvedTemplateId}`,
          safety_boundary: [
            'Read-only on both sides: this tool writes nothing, and the generated script only GETs Admin state and prints a comparison.',
            'Derived category/tag/type values are heuristic — a MISMATCH row can mean the reviewer intentionally chose a different value in Admin.',
          ],
          console_script: consoleScript,
          ...(include_bookmarklet === true ? { bookmarklet: `javascript:${encodeURIComponent(consoleScript.replace(/\s+/g, ' ').trim())}` } : {}),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_set_mrp_visibility',
    'Server-side Webflow write: set a MarketplaceResourceProfile\'s visibility to PUBLIC or PRIVATE via the key-authenticated PUT /admin/api/mrp/airtable route. For templates the mrp_id equals the Template ID from /admin/templates. Requires the marketplace admin key in this runtime and an explicit reviewer request; sends only the visibility field (partial update).',
    {
      mrp_id: MONGO_TEMPLATE_ID.describe('MarketplaceResourceProfile _id (equals the Template ID for templates).'),
      visibility: z.enum(MRP_VISIBILITY_VALUES),
    },
    async ({ mrp_id, visibility }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const result = await setMrpVisibility(runtimeConfig.marketplaceAdmin ?? {}, mrp_id, visibility);
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          ...result,
          note: 'Partial update: only visibility was sent. Verify the listing state in Admin or on the marketplace before announcing the change.',
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_get_checklists',
    'Read-only: return the 📝Review Checklist and 🚀Publishing Checklist for a version as structured items with 1-based indexes, section headings, checked state, and progress counts. Use the returned indexes with template_review_set_checklist_items.',
    {
      version_id: z.string().min(1),
    },
    async ({ version_id }) => {
      try {
        return asSuccess(await getClient().getVersionChecklists(version_id));
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
            runtimeConfig,
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
    'template_review_set_checklist_items',
    'Reviewer-safe write: check or uncheck individual 📝Review Checklist or 🚀Publishing Checklist items by 1-based index. Only the targeted "[ ]"/"[x]" tokens change; all other checklist text is preserved. Call template_review_get_checklists first, then pass expected_total and each item expected_text from that same read as stale-read guards.',
    {
      version_id: z.string().min(1),
      checklist: z.enum(CHECKLIST_KIND_VALUES),
      items: z
        .array(
          z.object({
            index: z.number().int().min(1),
            checked: z.boolean(),
            expected_text: z.string(),
          }),
        )
        .min(1)
        .max(200),
      expected_total: z.number().int().min(0),
    },
    async ({ version_id, checklist, items, expected_total }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          result: await getClient().setVersionChecklistItems(version_id, {
            checklist,
            items: items.map(({ index, checked, expected_text }) => ({
              index,
              checked,
              expectedText: expected_text,
            })),
            expected_total,
            review_owner: { id: reviewer.airtableCollaboratorId },
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
    'Attach a release to a template version and optionally approve it. By default the 🚀Publishing Checklist is left untouched — set mark_all_publishing_items only when every publishing step really was completed, or use template_review_set_checklist_items for per-item accuracy.',
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
      mark_all_publishing_items: z.boolean().optional(),
    },
    async ({ version_id, release_record_id, release_date_local, time_zone, approve_version, mrp_id_overwrite, mark_all_publishing_items }) => {
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
          mark_all_publishing_items,
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
      release_record_id: z.string().optional(),
      reject_reason: z.string().optional(),
      rejection_feedback: z.string().optional(),
      agent_review_feedback: z.string().optional(),
    },
    async ({ version_id, review_owner, review_status, quality_rating, improvement_areas, review_feedback, release_record_id, reject_reason, rejection_feedback, agent_review_feedback }) => {
      try {
        const reviewer = getReviewer();
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        if (reviewer) {
          assertReviewerScopedReviewOwner(review_owner, reviewer);
          await getClient().requireAssignedVersion(version_id, actingReviewer);
        }
        const hasReviewerScopedMutation = [review_status, quality_rating, improvement_areas, review_feedback, release_record_id, reject_reason, rejection_feedback, agent_review_feedback].some(
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
    'Approve a template version. Reports unchecked 📝Review Checklist items as a non-blocking warning; use template_review_set_checklist_items to record checklist progress.',
    {
      version_id: z.string().min(1),
      release_record_id: z.string().optional(),
    },
    async ({ version_id, release_record_id }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        const assignedVersion = await getClient().requireAssignedVersion(version_id, actingReviewer);
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          // Advisory only. Express reviews intentionally skip items, so "all checked"
          // is not the correct gate and approval must not be blocked on it.
          warnings: reviewChecklistWarnings(assignedVersion),
          updated_version: await getClient().updateVersionReview(version_id, {
            review_owner: { id: reviewer.airtableCollaboratorId },
            review_status: '✅Approved',
            release_record_id,
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
