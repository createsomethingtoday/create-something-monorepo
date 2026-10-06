import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createHash } from 'node:crypto';

import { prepareAdminTemplateFill, prepareAdminTemplateFillBatch } from './admin-template-fill.js';
import {
  MRP_VISIBILITY_VALUES,
  createMrpTemplate,
  readMrp,
  setMrpVisibility,
  updateMrpTemplate,
  type MrpTemplateUpdateFields,
  type MarketplaceAdminConfig,
  type MrpTemplateCreatePayload,
} from './admin-mrp.js';
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
import { renderCreatorFacingHtml, ZENDESK_WRITABLE_STATUSES, ZendeskClientError, type ZendeskClient } from './zendesk.js';
import { observeTemplateHandoff, templateHandoffRequestSchema } from './handoff-observation.js';
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
import {
  MAX_SEGMENTS_LIMIT,
  normalizePublishedSiteScreenshotInput,
  PublishedSiteScreenshotError,
  SCREENSHOT_VIEWPORT_NAMES,
  type ScreenshotCaptureConfig,
} from './published-site-screenshots.js';
import {
  fetchPublishedSiteStylesheet,
  MAX_SEARCH_TERMS,
  MAX_STYLESHEET_BYTES,
  MAX_STYLESHEET_MAX_CHARS,
  MIN_STYLESHEET_MAX_CHARS,
  PublishedSiteStylesheetError,
} from './published-site-stylesheet.js';
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
  if (error instanceof AirtableClientError || error instanceof ZendeskClientError) {
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

/**
 * Free-text search syntax that would widen or negate the group scope the tool promises:
 * a `group:` / `-group:` term, or a standalone Boolean `OR` (its right-hand branch is not
 * constrained by the leading group clause).
 */
const ZENDESK_SCOPE_OVERRIDE_TERM = /(^|\s)(-?group:|OR(?=\s|$))/i;

/** Zendesk tag values: letters, digits, underscore, hyphen, dot. Anything else (spaces, colons, OR) is search syntax, not a tag. */
const ZENDESK_TAG_VALUE = /^[A-Za-z0-9_.-]+$/;

function rejectScopeOverride(params: { query?: string; tags?: string[] }, scope: 'marketplace_review' | 'all'): void {
  if (scope === 'all') return;
  if (params.query && ZENDESK_SCOPE_OVERRIDE_TERM.test(params.query)) {
    throw new ZendeskClientError(
      'ZENDESK_SCOPE_OVERRIDE_REJECTED',
      'query must not contain a group: term or a Boolean OR; the Marketplace Review group scope is applied by the tool. Pass scope="all" to search outside it.',
      400,
      { query: params.query },
    );
  }
  const badTag = (params.tags ?? []).find((tag) => !ZENDESK_TAG_VALUE.test(tag));
  if (badTag !== undefined) {
    throw new ZendeskClientError(
      'ZENDESK_SCOPE_OVERRIDE_REJECTED',
      'tags must be plain Zendesk tag values (letters, digits, underscore, hyphen, dot); search syntax is not accepted inside a tag filter.',
      400,
      { tag: badTag },
    );
  }
}

function requireZendesk(runtimeConfig: ToolRuntimeConfig, verb: 'reads' | 'writes'): ZendeskClient {
  const zendesk = runtimeConfig.getZendeskClient?.() ?? null;
  if (!zendesk) {
    throw new ZendeskClientError(
      'ZENDESK_NOT_CONFIGURED',
      `Zendesk ${verb} are not configured on this deployment (ZENDESK_API_TOKEN / ZENDESK_API_EMAIL missing).`,
      503,
    );
  }
  return zendesk;
}

/** Idempotency key for an outbound ticket: same asset + requester + subject + message → same ticket. */
export const OUTBOUND_EXTERNAL_ID_PREFIX = 'template-review-mcp:';
function outboundTicketExternalId(assetId: string, requesterEmail: string, subject: string, message: string): string {
  const digest = createHash('sha256').update(`${requesterEmail.toLowerCase()}\n${subject}\n${message}`).digest('hex').slice(0, 24);
  return `${OUTBOUND_EXTERNAL_ID_PREFIX}${assetId}:${digest}`;
}

function requireLinkedTicket(version: { versionId: string; zendeskTicketId?: string }): string {
  if (!version.zendeskTicketId) {
    throw new ZendeskClientError('NO_ZENDESK_TICKET', 'This template version has no linked Zendesk ticket (🧘ZD ID is empty).', 404, {
      version_id: version.versionId,
    });
  }
  return version.zendeskTicketId;
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
  screenshotCapture?: ScreenshotCaptureConfig;
  /** Timeout for published-site stylesheet fetches (defaults to 20s). */
  stylesheetTimeoutMs?: number;
  /**
   * Zendesk client for the ticket leg (thread read, search, status, follow-up).
   * Returns null when ZENDESK_API_TOKEN / ZENDESK_API_EMAIL are not provisioned;
   * the tools then fail closed with ZENDESK_NOT_CONFIGURED.
   */
  getZendeskClient?: () => ZendeskClient | null;
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
  // Zendesk writes: a public follow-up reaches the creator; a status change can
  // fire Zendesk's solved-notification email. Read-only sessions never see them.
  'template_review_send_ticket_followup',
  'template_review_update_ticket_status',
  'template_review_create_ticket',
  'template_review_link_version_ticket',
  // Featured-batch curation writes: pick star + reason, votes, and the batch
  // finalization flag that arms the creator-notification worker.
  'template_review_set_featured_pick',
  'template_review_cast_featured_vote',
  'template_review_set_featured_flag',
  // Execute-script generators write nothing server-side, but the scripts they
  // hand out submit to Webflow Admin when the reviewer runs them. Read-only
  // sessions must not receive them.
  'template_review_prepare_admin_template_create_execute',
  'template_review_prepare_admin_template_update_execute',
  'template_review_prepare_admin_template_thumbnail_execute',
  // Server-side Webflow writes: create the MRP + Template, flip MRP visibility.
  'template_review_create_admin_template',
  'template_review_complete_admin_template',
  'template_review_set_mrp_visibility',
]);

/**
 * Next steps after the server-side create. All run through the MCP; nobody
 * needs to open /admin/templates/<id>.
 */
const NEXT_STEPS_AFTER_CREATE = [
  'Run template_review_complete_admin_template to push the thumbnail, Category, Primary Tag, Type, Cost and Detail Page Path and read them back.',
  'Work the 🚀Publishing Checklist with template_review_set_checklist_items.',
  'Approve the version with template_review_approve_version.',
] as const;

/**
 * Fields the route accepts but stores only on the legacy Template, which the
 * key-authenticated route cannot read back. webflow/webflow#123284 makes the
 * route store them; until it ships they are sent but unverified.
 */
const LEGACY_TEMPLATE_ONLY_FIELDS = ['templateMetadata.extCategory', 'templateMetadata.extMainTag'] as const;

type AdminFieldCheck = { field: string; sent: unknown; stored: unknown; status: 'stored' | 'mismatch' | 'unverifiable' };

function readPath(doc: Record<string, unknown> | null, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined), doc);
}

function compareAdminFields(sent: MrpTemplateUpdateFields, stored: Record<string, unknown> | null): AdminFieldCheck[] {
  const paths: Array<[string, unknown]> = [
    ['name', sent.name],
    ['description', sent.description],
    ['price.value', sent.price?.value],
    ['templateMetadata.type', sent.templateMetadata?.type],
    ['templateMetadata.extDetailPageUrl', sent.templateMetadata?.extDetailPageUrl],
    ['templateMetadata.extCategory', sent.templateMetadata?.extCategory],
    ['templateMetadata.extMainTag', sent.templateMetadata?.extMainTag],
    ['thumbnailImage.url', sent.thumbnailImage?.url],
  ];
  return paths
    .filter(([, value]) => value !== undefined)
    .map(([field, value]) => {
      const storedValue = readPath(stored, field);
      if (stored === null || ((LEGACY_TEMPLATE_ONLY_FIELDS as readonly string[]).includes(field) && storedValue === undefined)) {
        return { field, sent: value, stored: storedValue ?? null, status: 'unverifiable' as const };
      }
      if (field === 'thumbnailImage.url') {
        // The route copies the image to the template's CDN path once #123284 ships; any stored URL there counts.
        const ok = storedValue === value || (typeof storedValue === 'string' && /\/template-assets\/[0-9a-f]{24}\/thumbnails\//.test(storedValue));
        return { field, sent: value, stored: storedValue ?? null, status: ok ? ('stored' as const) : ('mismatch' as const) };
      }
      return { field, sent: value, stored: storedValue ?? null, status: storedValue === value ? ('stored' as const) : ('mismatch' as const) };
    });
}

export function registerTools(
  mcpServer: McpServer,
  getClient: ClientFactory,
  getReviewer: ReviewerFactory = () => null,
  runtimeConfig: ToolRuntimeConfig = {},
  access: ToolAccess = { allowWrites: true },
): void {
  const registerOnServer = mcpServer.tool.bind(mcpServer) as (...args: unknown[]) => unknown;
  const server = {
    registerTool: ((name: string, ...rest: unknown[]) => {
      if (access.allowedToolNames && !access.allowedToolNames.has(name)) return undefined;
      if (!access.allowWrites && WRITE_TOOL_NAMES.has(name)) return undefined;
      return (mcpServer.registerTool.bind(mcpServer) as (...args: unknown[]) => unknown)(name, ...rest);
    }) as McpServer['registerTool'],
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
    'template_review_capture_published_site_screenshots',
    'Read-only: capture desktop/mobile screenshots of a published *.webflow.io template site with Cloudflare Browser Rendering (real Chromium). This is the sanctioned screenshot path — NEVER capture published sites with a code-execution/sandbox browser: sandbox egress proxies block cdn.prod.website-files.com, so pages render as unstyled bare HTML and are invalid review evidence. Waits for fonts and IX2 intro animations to settle. With full_page, scrolls through the page first (firing IX2 scroll reveals and lazy loads), then captures the ENTIRE page as viewport-height segments (up to 24 per viewport; truncated=true only when the page continues past that). max_segments (1-24, default 5) does NOT limit coverage — it only caps how many segments per viewport are returned inline to the model; every captured segment appears in the gallery. When YOU need to visually review the whole page yourself, request max_segments: 24 to receive every captured segment inline (heavy — use only for a deliberate visual review). IMPORTANT: the human reviewer cannot see the inline images — the result includes a gallery_url (one page rendering every captured segment, valid ~1 hour); always share that link in your reply. Each screenshot entry also has a per-segment view_url; include those only when the reviewer wants individual frames. Performs no Airtable write and makes no review decision.',
    {
      published_url: z.string().url(),
      viewports: z.array(z.enum(SCREENSHOT_VIEWPORT_NAMES)).min(1).max(3).optional(),
      full_page: z.boolean().optional(),
      settle_ms: z.number().int().min(0).max(10_000).optional(),
      max_segments: z.number().int().min(1).max(MAX_SEGMENTS_LIMIT).optional(),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async (input) => {
      try {
        const executor = runtimeConfig.screenshotCapture?.executor;
        if (!executor) {
          return jsonContent(
            {
              ok: false,
              error: {
                code: 'SCREENSHOTS_NOT_CONFIGURED',
                message: 'Screenshot capture is not configured on this deployment (missing Browser Rendering binding).',
              },
            },
            true,
          );
        }
        const request = normalizePublishedSiteScreenshotInput(input);
        const result = await executor(request);
        const publish = runtimeConfig.screenshotCapture?.publishScreenshot;
        const published = publish
          ? await Promise.all(result.screenshots.map((screenshot) => publish(screenshot).catch(() => null)))
          : result.screenshots.map(() => null);
        const publishGallery = runtimeConfig.screenshotCapture?.publishGallery;
        let galleryUrl: string | null = null;
        if (publishGallery && published.some(Boolean)) {
          galleryUrl = await publishGallery({
            final_url: result.final_url,
            page_title: result.page_title,
            captured_at: new Date().toISOString(),
            screenshots: result.screenshots.flatMap((screenshot, index) => {
              const ref = published[index];
              if (!ref) return [];
              return [
                {
                  id: ref.id,
                  viewport: screenshot.viewport,
                  width: screenshot.width,
                  height: screenshot.height,
                  segment: screenshot.segment,
                  scroll_y: screenshot.scroll_y,
                  page_height_px: screenshot.page_height_px,
                  truncated: screenshot.truncated,
                },
              ];
            }),
          }).catch(() => null);
        }
        // Coverage is decoupled from context cost: every captured segment is
        // stored and shown in the gallery, but only the first max_segments per
        // viewport come back inline as images.
        const inlineBudget = new Map<string, number>();
        const inlineFlags = result.screenshots.map((screenshot) => {
          const used = inlineBudget.get(screenshot.viewport) ?? 0;
          if (used >= request.maxSegments) return false;
          inlineBudget.set(screenshot.viewport, used + 1);
          return true;
        });
        const summary = {
          ...result,
          ...(galleryUrl ? { gallery_url: galleryUrl } : {}),
          screenshots: result.screenshots.map(({ data: _data, ...screenshot }, index) => ({
            ...screenshot,
            inline: inlineFlags[index],
            ...(published[index] ? { view_url: published[index].view_url } : {}),
          })),
          ...(galleryUrl || published.some(Boolean)
            ? {
                view_note: galleryUrl
                  ? 'The human reviewer cannot see the inline images. Share the gallery_url (one page with every captured segment, valid ~1 hour) in your reply; add per-segment view_url links only if the reviewer wants individual frames. Segments with inline=false were captured and appear in the gallery but were not returned as inline images.'
                  : 'The human reviewer cannot see the inline images. Share the view_url links (valid ~1 hour) in your reply so they can open the captures in a browser.',
              }
            : {}),
        };
        return {
          structuredContent: { ok: true, data: summary },
          content: [
            { type: 'text' as const, text: JSON.stringify({ ok: true, data: summary }, null, 2) },
            ...result.screenshots
              .filter((_, index) => inlineFlags[index])
              .map((screenshot) => ({
                type: 'image' as const,
                data: screenshot.data,
                mimeType: screenshot.mime_type,
              })),
          ],
        };
      } catch (error) {
        if (error instanceof PublishedSiteScreenshotError) {
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
    'template_review_fetch_published_site_stylesheet',
    'Read-only: fetch the compiled CSS of a published *.webflow.io template site. Fetches the published page server-side, resolves its <link rel="stylesheet"> hrefs, and returns each Webflow-hosted stylesheet as text (bounded by max_chars, pageable with offset/next_offset) plus a structural summary (approx rule count, @media queries, font families, @font-face count, !important count, custom properties) and any inline <style> blocks from the page HTML (where Webflow custom-code CSS lives). Use this whenever you need to read a template\'s compiled CSS — the claude.ai code-execution sandbox CANNOT fetch cdn.prod.website-files.com itself (host_not_allowed), so never try to curl or fetch the stylesheet from a sandbox. Prefer search (case-insensitive substrings, up to 10 terms) over paging when you are checking for specific selectors, properties, or fonts; matches return the enclosing rule block. Third-party stylesheets are listed but only fetched with include_third_party=true. Performs no Airtable write and makes no review decision.',
    {
      published_url: z.string().url(),
      include_css: z.boolean().optional(),
      include_third_party: z.boolean().optional(),
      max_chars: z.number().int().min(MIN_STYLESHEET_MAX_CHARS).max(MAX_STYLESHEET_MAX_CHARS).optional(),
      offset: z.number().int().min(0).max(MAX_STYLESHEET_BYTES).optional(),
      search: z.array(z.string().min(2).max(120)).min(1).max(MAX_SEARCH_TERMS).optional(),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async (input) => {
      try {
        const result = await fetchPublishedSiteStylesheet(input, {
          fetcher: runtimeConfig.fetcher,
          ...(runtimeConfig.stylesheetTimeoutMs !== undefined ? { timeoutMs: runtimeConfig.stylesheetTimeoutMs } : {}),
        });
        return asSuccess(result);
      } catch (error) {
        if (error instanceof PublishedSiteStylesheetError) {
          return jsonContent(
            { ok: false, error: { code: error.code, message: error.message, status: error.status, details: error.details } },
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
    'template_review_featured_candidates',
    'List templates eligible for the upcoming monthly Featured batch: Exceptional quality, not already featured, submitted within the current month (months_back=0) or up to months_back months earlier (default 1). Mirrors the "Remaining templates eligible" definition on the ⭐Featured templates review Airtable interface. Each candidate includes template categories and creator featured-counts, and the summary includes per-category counts — reviewers balance the batch across category trends and creator repetition. Companion writes: template_review_set_featured_pick (star + reason), template_review_cast_featured_vote, template_review_set_featured_flag (batch finalization).',
    {
      months_back: z.number().int().min(0).max(3).optional(),
      include_already_featured: z.boolean().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ months_back, include_already_featured, limit }) => {
      try {
        const result = await getClient().listFeaturedCandidates({
          monthsBack: months_back,
          includeAlreadyFeatured: include_already_featured,
          limit,
        });
        return asSuccess(result);
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_set_featured_pick',
    'Star/unstar a template as a ⭐Reviewer pick for the upcoming Featured batch and write its Pick Reason. Agent-authored copy MUST go to pick_reason_draft (the AI-draft staging field). pick_reason writes the LIVE field — quoted verbatim in the creator\'s featured email and rendered publicly on the listing — and requires confirm_creator_safe: true after a human has read the exact text.',
    {
      asset_id: z.string().min(1),
      reviewer_pick: z.boolean().optional(),
      pick_reason_draft: z.string().optional(),
      pick_reason: z.string().optional(),
      confirm_creator_safe: z.boolean().optional(),
    },
    async ({ asset_id, reviewer_pick, pick_reason_draft, pick_reason, confirm_creator_safe }) => {
      try {
        if (pick_reason !== undefined && confirm_creator_safe !== true) {
          throw new AirtableClientError(
            'CREATOR_SAFE_CONFIRMATION_REQUIRED',
            'pick_reason writes the live ⭐Reviewer Pick Reason, which is quoted verbatim in the creator\'s featured email and rendered publicly on the marketplace listing. Stage the text via pick_reason_draft, have the reviewer read it, then resubmit with confirm_creator_safe: true.',
            400,
            { asset_id },
          );
        }
        const result = await getClient().setFeaturedPick(asset_id, {
          reviewer_pick,
          pick_reason_draft,
          pick_reason,
        });
        return asSuccess({
          ...result,
          support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.featuredPick,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_cast_featured_vote',
    'Cast or update the authenticated reviewer\'s vote (up/down/comment) on a featured-batch candidate. One vote per reviewer per asset — recasting updates the existing vote so tallies never double-count. The note is candid INTERNAL rationale (encouraged for down/contested votes) and must never be shown to creators or reused in public copy.',
    {
      asset_id: z.string().min(1),
      vote: z.enum(['up', 'down', 'comment']),
      note: z.string().optional(),
    },
    async ({ asset_id, vote, note }) => {
      try {
        const currentReviewer = currentReviewerAsCollaborator(getReviewer);
        const result = await getClient().castFeaturedVote(asset_id, { vote, note }, currentReviewer);
        return asSuccess({
          ...result,
          support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.featuredVote,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_set_featured_flag',
    'Finalize (or revert) one template\'s membership in the upcoming Featured batch by setting ℹ️Is Featured?. CONSEQUENTIAL: checking it resolves the featured period to the first of next month and arms the creator-notification worker (hourly cron) for that period — the creator receives a congratulations email quoting the live Pick Reason. Restricted to reviewers whose directory entry grants featuredCoordinator (403 otherwise). Requires confirm_creator_notification: true AND a non-empty live ⭐Reviewer Pick Reason (never overridable). Selection-state checks (⭐Reviewer pick starred, eligibility formula, qualified votes) also run before the write and reject with SELECTION_CHECKS_UNMET; pass override_selection_checks: true only when the coordinator confirms featuring the asset is a deliberate decision. Unchecking before the worker fires is the abort path. The marketplace-CMS backfill remains a separate manual step.',
    {
      asset_id: z.string().min(1),
      is_featured: z.boolean(),
      confirm_creator_notification: z.boolean(),
      override_selection_checks: z.boolean().optional(),
    },
    async ({ asset_id, is_featured, confirm_creator_notification, override_selection_checks }) => {
      try {
        const reviewer = getReviewer();
        if (!reviewer?.featuredCoordinator) {
          throw new AirtableClientError(
            'FEATURED_COORDINATOR_REQUIRED',
            'Batch finalization is restricted to featured-batch coordinators: this write arms the external creator-notification path. Reviewers star picks (template_review_set_featured_pick) and vote (template_review_cast_featured_vote); ask the coordinator to finalize, or have your reviewer-directory entry granted featuredCoordinator.',
            403,
            { asset_id },
          );
        }
        if (is_featured && confirm_creator_notification !== true) {
          throw new AirtableClientError(
            'CREATOR_NOTIFICATION_CONFIRMATION_REQUIRED',
            'Checking ℹ️Is Featured? arms the creator-notification worker for the upcoming period. Confirm with the reviewer that this asset is a finalized batch member, then resubmit with confirm_creator_notification: true.',
            400,
            { asset_id },
          );
        }
        const result = await getClient().setFeaturedFlag(asset_id, is_featured, {
          overrideSelectionChecks: override_selection_checks,
        });
        return asSuccess({
          ...result,
          support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.featuredFlag,
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
    'template_review_create_admin_template',
    'Server-side Webflow write: create the marketplace template (MRP + Admin record) for a version via the key-authenticated POST /admin/api/mrp/airtable route — no browser session, no console script. Uses the same Airtable-derived fields as prepare_admin_template_fill, records the new Template ID in 👀ℹ️MRP ID (Override), and returns the Admin URL with the items still to finish on that page. Requires the marketplace admin key and an explicit reviewer request; refuses when required fields are missing or the asset already has a Template ID.',
    {
      version_id: z.string().min(1),
      visibility: z.enum(MRP_VISIBILITY_VALUES).optional().describe('MRP visibility at creation. Defaults to PRIVATE.'),
      support_email: z.string().email().optional().describe('Support contact; defaults to the creator email on the asset.'),
      support_url: z.string().url().optional(),
      record_mrp_id: z.boolean().optional().describe('Write the new Template ID to 👀ℹ️MRP ID (Override). Defaults to true.'),
    },
    async ({ version_id, visibility, support_email, support_url, record_mrp_id }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const context = await getClient().getReviewContext(version_id, currentReviewerAsCollaborator(getReviewer));
        const fillBundle = prepareAdminTemplateFill(context, { includeScript: false, includeBookmarklet: false });
        if (fillBundle.missing_fields.length > 0) {
          throw new AirtableClientError(
            'ADMIN_FORM_INCOMPLETE',
            'Cannot create the template while required Admin form fields are missing.',
            422,
            { missing_fields: fillBundle.missing_fields },
          );
        }

        const existingTemplateId = context.asset?.mrpIdOverride ?? context.asset?.mrpId;
        if (existingTemplateId && /^[0-9a-f]{24}$/i.test(existingTemplateId)) {
          throw new AirtableClientError(
            'TEMPLATE_ID_ALREADY_RECORDED',
            'The asset already has a Template ID recorded; creating again would duplicate it. Use the Admin page or clear the override first.',
            409,
            { template_id: existingTemplateId, admin_url: `https://webflow.com/admin/templates/${existingTemplateId}` },
          );
        }

        const supportEmail = support_email ?? context.asset?.creatorEmail;
        if (!supportEmail && !support_url) {
          throw new AirtableClientError(
            'SUPPORT_CONTACT_MISSING',
            'The route requires a support email or URL for templates and the asset has no creator email. Pass support_email or support_url.',
            422,
          );
        }

        const warnings: string[] = [...(fillBundle.form_data.admin_form_warnings ?? [])];
        if (!fillBundle.readiness.can_publish) {
          warnings.push('This version is not currently publish-ready according to MCP capability flags. Confirm approval state before relying on the created template.');
        }

        const form = fillBundle.form_data.admin_form;
        const thumbnailUrl = fillBundle.form_data.thumbnail_image_url;
        const payload: MrpTemplateCreatePayload = {
          name: form.name ?? '',
          displayName: form.name ?? '',
          description: form.description ?? '',
          resourceType: 'TEMPLATE',
          siteSlug: form.shortName ?? '',
          visibility: visibility ?? 'PRIVATE',
          // Admin's cost field and the route's price.value are both cents.
          price: { value: Number(form.cost), unit: 'USD' },
          support: {
            ...(supportEmail ? { email: supportEmail } : {}),
            ...(support_url ? { url: support_url } : {}),
          },
          templateMetadata: {
            type: form.type ?? 'basic',
            ...(form.extDetailPageUrl ? { extDetailPageUrl: form.extDetailPageUrl } : {}),
            ...(form.extCategory ? { extCategory: form.extCategory } : {}),
            ...(form.extMainTag ? { extMainTag: form.extMainTag } : {}),
          },
          ...(thumbnailUrl ? { thumbnailImage: { url: thumbnailUrl, altText: form.name ?? 'Template thumbnail' } } : {}),
        };

        const result = await createMrpTemplate(runtimeConfig.marketplaceAdmin ?? {}, payload);

        let mrpIdRecorded = false;
        if (record_mrp_id !== false && context.assetId) {
          try {
            await getClient().updateAssetPublishing(context.assetId, { mrp_id_overwrite: result.templateId });
            mrpIdRecorded = true;
          } catch (error) {
            warnings.push(
              `The template was created but writing the MRP ID override failed (${error instanceof Error ? error.message : String(error)}). Record ${result.templateId} via template_review_update_asset_publishing.`,
            );
          }
        }

        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          template_id: result.templateId,
          admin_url: result.adminUrl,
          mrp_id_recorded: mrpIdRecorded,
          visibility: payload.visibility,
          source: fillBundle.source,
          payload,
          next_steps: NEXT_STEPS_AFTER_CREATE,
          warnings,
          note: 'Next, run template_review_complete_admin_template for this version. The Admin URL is for reference only.',
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_complete_admin_template',
    'Server-side Webflow write: finish a created template\'s Admin fields without opening Admin. Sends the Airtable-derived thumbnail (fresh link), Category, Primary Tag, Type, Cost, Description and Detail Page Path through the key-authenticated PUT /admin/api/mrp/airtable route, then reads the record back and reports each field as stored, mismatch or unverifiable. Uses the Template ID in 👀ℹ️MRP ID (Override) unless mrp_id is passed. Requires the marketplace admin key and an explicit reviewer request.',
    {
      version_id: z.string().min(1),
      mrp_id: MONGO_TEMPLATE_ID.optional().describe('Template ID; defaults to the one recorded on the asset.'),
    },
    async ({ version_id, mrp_id }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const context = await getClient().getReviewContext(version_id, currentReviewerAsCollaborator(getReviewer));
        const recorded = context.asset?.mrpIdOverride ?? context.asset?.mrpId;
        const templateId = mrp_id ?? (recorded && /^[0-9a-f]{24}$/i.test(recorded) ? recorded : undefined);
        if (!templateId) {
          throw new AirtableClientError(
            'TEMPLATE_ID_MISSING',
            'No Template ID is recorded on the asset. Run template_review_create_admin_template first, or pass mrp_id.',
            422,
          );
        }

        const fillBundle = prepareAdminTemplateFill(context, { includeScript: false, includeBookmarklet: false });
        const form = fillBundle.form_data.admin_form;
        const thumbnailUrl = fillBundle.form_data.thumbnail_image_url;
        const cost = Number(form.cost);
        const fields: MrpTemplateUpdateFields = {
          ...(form.name ? { name: form.name, displayName: form.name } : {}),
          ...(form.description ? { description: form.description } : {}),
          ...(Number.isFinite(cost) && form.cost !== undefined && form.cost !== '' ? { price: { value: cost, unit: 'USD' as const } } : {}),
          templateMetadata: {
            ...(form.type ? { type: form.type } : {}),
            ...(form.extDetailPageUrl ? { extDetailPageUrl: form.extDetailPageUrl } : {}),
            ...(form.extCategory ? { extCategory: form.extCategory } : {}),
            ...(form.extMainTag ? { extMainTag: form.extMainTag } : {}),
          },
          ...(thumbnailUrl ? { thumbnailImage: { url: thumbnailUrl, altText: form.name ?? 'Template thumbnail' } } : {}),
        };

        const adminConfig = runtimeConfig.marketplaceAdmin ?? {};
        await updateMrpTemplate(adminConfig, templateId, fields);
        const stored = await readMrp(adminConfig, templateId);
        const checks = compareAdminFields(fields, stored);

        const warnings: string[] = [...(fillBundle.form_data.admin_form_warnings ?? [])];
        if (fillBundle.missing_fields.length > 0) {
          warnings.push(`Not sent because Airtable has no value: ${fillBundle.missing_fields.join(', ')}.`);
        }
        const storedThumb = readPath(stored, 'thumbnailImage.url');
        if (typeof storedThumb === 'string' && /airtable/i.test(storedThumb)) {
          warnings.push('The stored thumbnail is an Airtable link. It expires and Admin cannot display it. The route copies it to the CDN once webflow/webflow#123284 ships; rerun this tool then.');
        }
        if (checks.some((check) => check.status === 'unverifiable')) {
          warnings.push('Category and Primary Tag live on the legacy Template, which this route cannot read back. They are stored only after webflow/webflow#123284 ships.');
        }

        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          template_id: templateId,
          admin_url: `https://webflow.com/admin/templates/${templateId}`,
          fields: checks,
          all_stored: checks.every((check) => check.status === 'stored'),
          warnings,
          next_steps: NEXT_STEPS_AFTER_CREATE.slice(1),
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
    'template_review_get_ticket_thread',
    'Read-only: the Zendesk ticket linked to a template version — subject, status, requester, and the conversation (creator replies and review-team messages), oldest to newest. Resolves the ticket from the version record (🧘ZD ID), never from an arbitrary ticket ID, and only for versions whose asset is a template. Public comments only by default; set include_internal_notes=true to also return private agent notes (requires a resolved reviewer identity). Call this before drafting any creator-facing message to see what the creator said and what was already sent.',
    {
      version_id: z.string().min(1),
      include_internal_notes: z.boolean().default(false),
      limit: z.number().int().min(1).max(100).default(20),
    },
    async ({ version_id, include_internal_notes, limit }) => {
      try {
        const zendesk = requireZendesk(runtimeConfig, 'reads');
        // Private agent notes are reviewer-only: admitted-but-unmapped read sessions get public comments.
        if (include_internal_notes) requireResolvedReviewer(getReviewer);
        const { version } = await getClient().getScopedVersion(version_id);
        const ticketId = requireLinkedTicket(version);
        const thread = await zendesk.getTicketThread(ticketId, { includeInternalNotes: include_internal_notes, limit });
        return asSuccess({
          version_id,
          asset_id: version.assetId,
          version_number: version.versionNumber,
          ticket_url: zendesk.agentTicketUrl(ticketId),
          thread,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_search_tickets',
    'Read-only Zendesk ticket search. Scoped by default to the Marketplace Review Team group (template and app submission tickets); pass scope="all" only when the reviewer explicitly asks to look outside review tickets (requires a resolved reviewer identity). Combine free text with status, tags, requester email, assignee, and created-date filters. Returns ticket IDs and agent URLs; use template_review_get_ticket_thread (via the version) to read a conversation.',
    {
      query: z.string().optional().describe('Free text or Zendesk search syntax, e.g. a template name or subject:"Template submission".'),
      status: z.enum(['new', 'open', 'pending', 'hold', 'solved', 'closed']).optional(),
      tags: z.array(z.string().regex(ZENDESK_TAG_VALUE)).optional().describe('Plain tag values only, e.g. template_review.'),
      requester_email: z.string().email().optional(),
      assignee_id: z.number().int().positive().optional(),
      created_after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('YYYY-MM-DD'),
      created_before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('YYYY-MM-DD'),
      sort_by: z.enum(['updated_at', 'created_at', 'priority', 'status']).optional(),
      sort_order: z.enum(['asc', 'desc']).optional(),
      limit: z.number().int().min(1).max(100).default(25),
      scope: z.enum(['marketplace_review', 'all']).default('marketplace_review'),
    },
    async (params) => {
      try {
        const zendesk = requireZendesk(runtimeConfig, 'reads');
        const scope = params.scope ?? 'marketplace_review';
        // Account-wide search is reviewer-only; admitted-but-unmapped read sessions stay in the review group.
        if (scope === 'all') requireResolvedReviewer(getReviewer);
        rejectScopeOverride(params, scope);
        const result = await zendesk.searchTickets({
          query: params.query,
          status: params.status,
          tags: params.tags,
          requesterEmail: params.requester_email,
          assigneeId: params.assignee_id,
          createdAfter: params.created_after,
          createdBefore: params.created_before,
          sortBy: params.sort_by,
          sortOrder: params.sort_order,
          limit: params.limit ?? 25,
          scope,
        });
        return asSuccess({
          ...result,
          tickets: result.tickets.map((ticket) => ({ ...ticket, ticketUrl: zendesk.agentTicketUrl(ticket.ticketId) })),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_send_ticket_followup',
    'Reviewer-safe write: post a follow-up comment on the Zendesk ticket linked to a template version. CREATOR-FACING when visibility is "public" — use only when the reviewer explicitly asks to send it (correcting a truncated review email, answering a creator question), and pass confirm_public_reply=true to acknowledge that. Requires the reviewer to own the version (assign_self first). The message is delivered verbatim, rendered from Markdown with HTML escaping; the Airtable composer wrapper does NOT apply on this path, so include a greeting and sign-off. Decisions still go through request_changes / approve_version / reject_version, which send the composed review email.',
    {
      version_id: z.string().min(1),
      message: z.string().min(1),
      visibility: z.enum(['public', 'internal']).default('public'),
      confirm_public_reply: z
        .boolean()
        .default(false)
        .describe('Must be true for visibility="public". Set it only after the reviewer has explicitly approved sending this exact message to the creator.'),
    },
    async ({ version_id, message, visibility, confirm_public_reply }) => {
      try {
        if (visibility === 'public' && confirm_public_reply !== true) {
          throw new ZendeskClientError(
            'PUBLIC_REPLY_CONFIRMATION_REQUIRED',
            'A public follow-up reaches the creator. Pass confirm_public_reply=true only after the reviewer has explicitly approved sending this exact message, or use visibility="internal" for a private note.',
            400,
            { version_id, visibility },
          );
        }
        const zendesk = requireZendesk(runtimeConfig, 'writes');
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        const version = await getClient().requireAssignedVersion(version_id, actingReviewer);
        const ticketId = requireLinkedTicket(version);
        const htmlBody = renderCreatorFacingHtml(message);
        const result = await zendesk.addTicketComment(ticketId, { htmlBody, isPublic: visibility === 'public' });
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          version_id,
          ticket_id: ticketId,
          ticket_url: zendesk.agentTicketUrl(ticketId),
          ticket_subject: version.zendeskSubject,
          visibility,
          audit_id: result.auditId,
          ticket_status: result.ticketStatus,
          html_body: htmlBody,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_create_ticket',
    'Reviewer-safe write: open a NEW Zendesk ticket to a template creator (outreach not tied to an existing submission thread — policy notices, relist/delist questions, clarifications). CREATOR-FACING: the message is emailed to the creator, so use only when the reviewer explicitly asks to send it and pass confirm_send=true. The requester is resolved from the template asset\'s creator email (Override, else rollup); requester_email may override it. Ticket lands in the Marketplace Review Team group with a private audit note first, then the public message as an agent update (that is what fires the email); the response reports whether Zendesk recorded the creator notification. This does NOT touch the submission ticket linked on the version — use template_review_send_ticket_followup for that.',
    {
      asset_id: z.string().min(1).optional().describe('Template asset record id. Provide this or version_id.'),
      version_id: z.string().min(1).optional().describe('Template version record id; its asset is used. Provide this or asset_id.'),
      subject: z.string().min(1).max(150),
      message: z.string().min(1).describe('Creator-facing Markdown, delivered verbatim (include greeting and sign-off).'),
      internal_note: z.string().min(1).optional().describe('Private first comment for the team; defaults to a provenance note.'),
      tags: z.array(z.string().regex(ZENDESK_TAG_VALUE)).optional(),
      requester_email: z.string().email().optional().describe('Override the creator email resolved from Airtable.'),
      confirm_send: z
        .boolean()
        .default(false)
        .describe('Must be true. Set it only after the reviewer has explicitly approved sending this exact message to this creator.'),
    },
    async ({ asset_id, version_id, subject, message, internal_note, tags, requester_email, confirm_send }) => {
      try {
        if (confirm_send !== true) {
          throw new ZendeskClientError(
            'SEND_CONFIRMATION_REQUIRED',
            'Creating a ticket emails the creator. Pass confirm_send=true only after the reviewer has explicitly approved sending this exact message to this creator.',
            400,
            { asset_id, version_id },
          );
        }
        if ((asset_id ? 1 : 0) + (version_id ? 1 : 0) !== 1) {
          throw new ZendeskClientError('ASSET_REFERENCE_REQUIRED', 'Provide exactly one of asset_id or version_id.', 400, { asset_id, version_id });
        }
        const zendesk = requireZendesk(runtimeConfig, 'writes');
        const reviewer = requireResolvedReviewer(getReviewer);
        let linkedTicketForHint: string | undefined;
        let asset: Awaited<ReturnType<AirtableClient['getAssetById']>>;
        if (version_id) {
          const scoped = await getClient().getScopedVersion(version_id);
          asset = scoped.asset;
          linkedTicketForHint = scoped.version.zendeskTicketId;
        } else {
          asset = await getClient().getAssetById(asset_id!);
        }
        if (!asset) {
          throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Template asset not found in template-review scope.', 404, { asset_id });
        }
        const requesterEmail = requester_email ?? asset.creatorEmail;
        if (!requesterEmail) {
          throw new ZendeskClientError(
            'NO_CREATOR_EMAIL',
            'The template asset has no creator email in Airtable (🎨📧 Creator Email / Override). Pass requester_email explicitly.',
            404,
            { asset_id: asset.assetId },
          );
        }
        const provenance =
          internal_note ??
          `Outbound ticket opened via Template Review MCP by ${reviewer.name ?? reviewer.email ?? reviewer.accountId} for template "${asset.templateName}" (${asset.assetId}).`;
        const publicHtml = renderCreatorFacingHtml(message);
        const externalId = outboundTicketExternalId(asset.assetId, requesterEmail, subject, message);
        const result = await zendesk.createOutboundTicket({
          requesterEmail,
          requesterName: asset.creatorName,
          subject,
          publicHtml,
          internalNoteHtml: renderCreatorFacingHtml(provenance),
          tags: ['template_review_mcp_outbound', ...(tags ?? [])],
          externalId,
        });
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          asset_id: asset.assetId,
          template_name: asset.templateName,
          requester_email: requesterEmail,
          requester_email_source: requester_email ? 'override' : 'airtable',
          ticket_id: result.ticketId,
          ticket_url: zendesk.agentTicketUrl(result.ticketId),
          external_id: externalId,
          status: result.status,
          group_id: result.groupId,
          brand_id: result.brandId,
          requester_notified: result.requesterNotified,
          steps: result.steps,
          html_body: publicHtml,
          next_step: version_id
            ? `Ask the reviewer whether this new ticket should become the version's linked review ticket (🧘ZD ID), replacing ${linkedTicketForHint ?? 'the current empty link'}. If yes, call template_review_link_version_ticket with version_id, ticket_id=${result.ticketId}, expected_current_ticket_id=${linkedTicketForHint ? `"${linkedTicketForHint}"` : 'null'}, confirm_replace=true. Decision emails for this version will then go to the new ticket.`
            : 'This ticket is not linked to any version. To make it a version\'s review ticket, call template_review_link_version_ticket after the reviewer confirms.',
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_link_version_ticket',
    'Reviewer-safe write: make a Zendesk ticket the linked review ticket (🧘ZD ID) of a template version — typically after template_review_create_ticket, when the reviewer wants the new outbound ticket to replace the submission ticket. Decision emails (request changes / approve / reject) for the version are sent to the linked ticket, so this changes where the creator hears from us. Requires the reviewer to own the version, a fresh-read precondition (expected_current_ticket_id from template_review_get_version; null when empty), and confirm_replace=true after the reviewer has explicitly agreed to the replacement.',
    {
      version_id: z.string().min(1),
      ticket_id: z.string().regex(/^\d+$/),
      expected_current_ticket_id: z.string().regex(/^\d+$/).nullable().describe('The 🧘ZD ID currently on the version from a fresh read; null if empty. Mismatch fails with VERSION_TICKET_CONFLICT.'),
      confirm_replace: z.boolean().default(false),
    },
    async ({ version_id, ticket_id, expected_current_ticket_id, confirm_replace }) => {
      try {
        if (confirm_replace !== true) {
          throw new ZendeskClientError(
            'REPLACE_CONFIRMATION_REQUIRED',
            'Relinking changes which Zendesk ticket receives this version\'s decision emails. Pass confirm_replace=true only after the reviewer has explicitly agreed.',
            400,
            { version_id, ticket_id },
          );
        }
        const zendesk = requireZendesk(runtimeConfig, 'reads');
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        await getClient().requireAssignedVersion(version_id, actingReviewer);
        const { asset } = await getClient().getScopedVersion(version_id);
        // Never repoint decision emails at a ticket we cannot tie to this creator: it must sit in
        // the Marketplace Review group AND either carry this asset's outbound idempotency key or
        // have the asset's creator as requester.
        const summary = await zendesk.getTicketSummary(ticket_id);
        if (summary.groupId !== zendesk.marketplaceGroupId) {
          throw new ZendeskClientError('ZENDESK_TICKET_OUT_OF_SCOPE', `Ticket ${ticket_id} is not in the Marketplace Review group.`, 403, {
            ticket_id, group_id: summary.groupId, marketplace_group_id: zendesk.marketplaceGroupId,
          });
        }
        const createdForAsset = summary.externalId?.startsWith(`${OUTBOUND_EXTERNAL_ID_PREFIX}${asset.assetId}:`) === true;
        const requesterMatches =
          Boolean(summary.requesterEmail && asset.creatorEmail) && summary.requesterEmail!.toLowerCase() === asset.creatorEmail!.toLowerCase();
        if (!createdForAsset && !requesterMatches) {
          throw new ZendeskClientError(
            'TICKET_CREATOR_MISMATCH',
            `Ticket ${ticket_id} was not created for this asset and its requester does not match the asset's creator email; refusing to relink.`,
            409,
            { ticket_id, asset_id: asset.assetId, ticket_requester_email: summary.requesterEmail, asset_creator_email: asset.creatorEmail ?? null, ticket_external_id: summary.externalId },
          );
        }
        const result = await getClient().setVersionZendeskTicket(version_id, ticket_id, expected_current_ticket_id);
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          version_id,
          asset_id: asset.assetId,
          ticket_id,
          ticket_url: zendesk.agentTicketUrl(ticket_id),
          ticket_verified_by: createdForAsset ? 'external_id' : 'requester_email',
          previous_ticket_id: result.previousTicketId,
          changed: result.previousTicketId !== ticket_id,
          version: result.version,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_update_ticket_status',
    'Reviewer-safe write: change the status and tags of the Zendesk ticket linked to a template version, optionally with a PRIVATE internal note. Only on explicit reviewer request. The ticket is resolved from the version record (never an arbitrary ticket ID) and the reviewer must own the version (assign_self first). Requires status_change: { confirmed: true, expected_status: "<status from a fresh template_review_get_ticket_thread read>" }; a changed status fails with ZENDESK_STATUS_CONFLICT. Never posts a public reply — use template_review_send_ticket_followup for creator-facing messages. Setting "solved" triggers Zendesk\'s solved-notification email to the creator.',
    {
      version_id: z.string().min(1),
      status: z.enum(ZENDESK_WRITABLE_STATUSES),
      private_note: z.string().min(1).optional(),
      additional_tags: z.array(z.string().min(1)).optional(),
      remove_tags: z.array(z.string().min(1)).optional(),
      status_change: z.object({ confirmed: z.boolean(), expected_status: z.string().min(1) }).optional(),
    },
    async ({ version_id, status, private_note, additional_tags, remove_tags, status_change }) => {
      try {
        if (!status_change || status_change.confirmed !== true) {
          throw new ZendeskClientError(
            'TICKET_STATUS_CONFIRMATION_REQUIRED',
            'Supply status_change.confirmed=true and status_change.expected_status from a fresh template_review_get_ticket_thread read after an explicit reviewer request to change the ticket status.',
            400,
            { version_id },
          );
        }
        const zendesk = requireZendesk(runtimeConfig, 'writes');
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);
        const version = await getClient().requireAssignedVersion(version_id, actingReviewer);
        const ticketId = requireLinkedTicket(version);
        const result = await zendesk.updateTicketStatus(ticketId, {
          status,
          expectedStatus: status_change.expected_status,
          privateNote: private_note,
          additionalTags: additional_tags,
          removeTags: remove_tags,
        });
        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          version_id,
          ticket_id: result.ticketId,
          ticket_url: zendesk.agentTicketUrl(result.ticketId),
          previous_status: result.previousStatus,
          status: result.status,
          tags: result.tags,
          audit_id: result.auditId,
          private_note_added: Boolean(private_note?.trim()),
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

  server.registerTool(
    'template_review_observe_handoff',
    { description: 'Read one exact linked template asset/version and return minimized status evidence and the next inspection action. Does not prove a webhook, infer a processing deadline, send messages, or change review status. Missing evidence is never permission to resubmit.',
    inputSchema: templateHandoffRequestSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } },
    async (input) => {
      try {
        return asSuccess(await observeTemplateHandoff(getClient(), input, { observedAt: new Date().toISOString() }));
      } catch {
        // Never expose source error details, raw IDs, or authentication material.
        return jsonContent({ ok: false, error: { code: 'HANDOFF_OBSERVATION_UNAVAILABLE' } }, true);
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
