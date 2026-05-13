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
  '🔁Response to Review'
] as const;

const DEFAULT_QUEUE_LIMIT = 10;
const MAX_QUEUE_LIMIT = 100;
const FEEDBACK_PREVIEW_LENGTH = 240;
const DEFAULT_CAPTURE_START_PATHS = [
  '/',
  '/style-guide',
  '/licenses',
  '/changelog',
  '/instructions',
  '/404'
] as const;
const DEFAULT_CAPTURE_CONTINUE_PATHS = [
  '/about',
  '/work',
  '/contact',
  '/news',
  '/template-info/licensing'
] as const;
const MAX_CAPTURE_PATHS_PER_CALL = 20;
const FETCH_TIMEOUT_MS = 12_000;

type CaptureFinding = {
  severity: 'blocker' | 'warning' | 'info';
  check: string;
  path: string;
  evidence: string;
};

type CapturePage = {
  path: string;
  url: string;
  status: number | null;
  finalUrl?: string;
  title?: string;
  h1Count: number;
  h1Text: string[];
  meta: {
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
  scripts: string[];
  counts: {
    links: number;
    hashLinks: number;
    forms: number;
    inputs: number;
    labels: number;
    images: number;
  };
  error?: string;
};

type CaptureState = {
  session_id: string;
  published_url: string;
  phase: string;
  created_at: string;
  updated_at: string;
  pages_checked: CapturePage[];
  findings: CaptureFinding[];
  assets_discovered_count: number;
  assets_discovered_sample: string[];
  next_suggested_paths: string[];
  capture_limitations: string[];
};

function jsonContent(value: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {})
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
          details: error.details
        }
      },
      true
    );
  }
  if (error instanceof Error) {
    return jsonContent(
      {
        ok: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error.message,
          status: 500
        }
      },
      true
    );
  }
  return jsonContent(
    {
      ok: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: String(error),
        status: 500
      }
    },
    true
  );
}

function queueLimit(limit: number | undefined): number {
  return limit ?? DEFAULT_QUEUE_LIMIT;
}

function truncateText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.length > FEEDBACK_PREVIEW_LENGTH
    ? `${value.slice(0, FEEDBACK_PREVIEW_LENGTH)}...`
    : value;
}

function createCaptureSessionId(): string {
  const random =
    globalThis.crypto?.randomUUID?.().replaceAll('-', '').slice(0, 8) ??
    Math.random().toString(36).slice(2, 10);
  return `template-capture-${Date.now()}-${random}`;
}

function normalizePublishedUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new AirtableClientError(
      'INVALID_PUBLISHED_URL',
      'published_url must be an http or https URL.',
      400,
      { published_url: value }
    );
  }
  parsed.hash = '';
  return parsed.toString();
}

function normalizeCapturePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  if (/^https?:\/\//i.test(trimmed)) {
    const parsed = new URL(trimmed);
    return `${parsed.pathname || '/'}${parsed.search}`;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function uniqueCapturePaths(paths: readonly string[]): string[] {
  return Array.from(new Set(paths.map(normalizeCapturePath))).slice(0, MAX_CAPTURE_PATHS_PER_CALL);
}

function compactText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/\s+/g, ' ').trim().slice(0, 240) || undefined;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(value: string): string {
  return decodeHtml(
    value
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function attrValue(tag: string, attr: string): string | undefined {
  const pattern = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i');
  return decodeHtml(tag.match(pattern)?.[1] ?? '') || undefined;
}

function metaContent(html: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const metaPattern = new RegExp(`<meta\\b[^>]*(?:property|name)=["']${escaped}["'][^>]*>`, 'i');
  const tag = html.match(metaPattern)?.[0];
  return tag ? compactText(attrValue(tag, 'content')) : undefined;
}

function collectMatches(html: string, pattern: RegExp, limit = 50): string[] {
  const values: string[] = [];
  for (const match of html.matchAll(pattern)) {
    const value = match[1];
    if (!value) continue;
    values.push(decodeHtml(value));
    if (values.length >= limit) break;
  }
  return Array.from(new Set(values));
}

function resolvePublicUrl(baseUrl: string, path: string): string {
  return new URL(normalizeCapturePath(path).replace(/^\//, ''), baseUrl).toString();
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'CREATE-SOMETHING-TemplateReviewCapture/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function capturePublicPage(
  baseUrl: string,
  path: string
): Promise<{ page: CapturePage; assets: string[] }> {
  const normalizedPath = normalizeCapturePath(path);
  const url = resolvePublicUrl(baseUrl, normalizedPath);

  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const title = compactText(
      stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    );
    const h1Text = collectMatches(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, 20)
      .map(stripTags)
      .filter(Boolean);
    const scripts = collectMatches(html, /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, 80);
    const hrefs = collectMatches(html, /<a\b[^>]*\bhref=["']([^"']*)["'][^>]*>/gi, 300);
    const images = [
      ...collectMatches(html, /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, 300),
      ...collectMatches(html, /<source\b[^>]*\bsrcset=["']([^"']+)["'][^>]*>/gi, 300),
      ...collectMatches(html, /url\(["']?([^"')]+)["']?\)/gi, 300)
    ];
    const assets = Array.from(new Set([...scripts, ...images])).slice(0, 500);
    const inputCount = (html.match(/<(input|textarea|select)\b/gi) ?? []).length;
    const labelCount = (html.match(/<label\b/gi) ?? []).length;

    return {
      assets,
      page: {
        path: normalizedPath,
        url,
        status: response.status,
        finalUrl: response.url,
        title,
        h1Count: h1Text.length,
        h1Text,
        meta: {
          description: metaContent(html, 'description'),
          ogTitle: metaContent(html, 'og:title'),
          ogDescription: metaContent(html, 'og:description'),
          ogImage: metaContent(html, 'og:image')
        },
        scripts,
        counts: {
          links: hrefs.length,
          hashLinks: hrefs.filter((href) => href === '#').length,
          forms: (html.match(/<form\b/gi) ?? []).length,
          inputs: inputCount,
          labels: labelCount,
          images: images.length
        }
      }
    };
  } catch (error) {
    return {
      assets: [],
      page: {
        path: normalizedPath,
        url,
        status: null,
        h1Count: 0,
        h1Text: [],
        meta: {},
        scripts: [],
        counts: {
          links: 0,
          hashLinks: 0,
          forms: 0,
          inputs: 0,
          labels: 0,
          images: 0
        },
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

function findingKey(finding: CaptureFinding): string {
  return `${finding.check}:${finding.path}:${finding.evidence}`;
}

function deriveFindings(page: CapturePage): CaptureFinding[] {
  const findings: CaptureFinding[] = [];
  const requiredRootPages = new Set(['/style-guide', '/licenses', '/changelog', '/instructions']);

  if (page.error) {
    findings.push({
      severity: 'warning',
      check: 'public_page_fetch_failed',
      path: page.path,
      evidence: page.error
    });
    return findings;
  }

  if (requiredRootPages.has(page.path) && page.status !== 200) {
    findings.push({
      severity: 'blocker',
      check: 'required_utility_page_unavailable_at_root_slug',
      path: page.path,
      evidence: `HTTP ${page.status}`
    });
  }

  if (!requiredRootPages.has(page.path) && page.status != null && page.status >= 400) {
    findings.push({
      severity: 'warning',
      check: 'public_page_unavailable',
      path: page.path,
      evidence: `HTTP ${page.status}`
    });
  }

  if (page.status === 200 && page.h1Count !== 1) {
    findings.push({
      severity: page.path === '/404' || page.path.includes('licens') ? 'warning' : 'blocker',
      check: 'h1_count_not_one',
      path: page.path,
      evidence: `${page.h1Count} H1 tags detected`
    });
  }

  if (page.counts.hashLinks > 0) {
    findings.push({
      severity: 'warning',
      check: 'visible_or_static_hash_links_present',
      path: page.path,
      evidence: `${page.counts.hashLinks} href="#" links detected in static HTML`
    });
  }

  if (page.counts.inputs > page.counts.labels) {
    findings.push({
      severity: 'warning',
      check: 'form_controls_may_need_labels',
      path: page.path,
      evidence: `${page.counts.inputs} controls and ${page.counts.labels} labels detected`
    });
  }

  if (page.path === '/' && !page.meta.ogImage) {
    findings.push({
      severity: 'warning',
      check: 'homepage_og_image_missing',
      path: page.path,
      evidence: 'No og:image meta tag detected'
    });
  }

  const scriptHaystack = page.scripts.join('\n').toLowerCase();
  if (scriptHaystack.includes('splittext')) {
    findings.push({
      severity: 'blocker',
      check: 'paid_animation_plugin_reference_detected',
      path: page.path,
      evidence: 'SplitText reference detected in script URLs'
    });
  }

  if (scriptHaystack.includes('gsap')) {
    findings.push({
      severity: 'info',
      check: 'gsap_reference_detected',
      path: page.path,
      evidence: 'GSAP reference detected in script URLs'
    });
  }

  return findings;
}

function mergeCaptureState(
  previousState: CaptureState | null,
  publishedUrl: string,
  phase: string,
  captured: Array<{ page: CapturePage; assets: string[] }>
): CaptureState {
  const now = new Date().toISOString();
  const previousPages = previousState?.pages_checked ?? [];
  const pageMap = new Map<string, CapturePage>();
  for (const page of previousPages) pageMap.set(page.path, page);
  for (const { page } of captured) pageMap.set(page.path, page);

  const findings = new Map<string, CaptureFinding>();
  for (const finding of previousState?.findings ?? []) findings.set(findingKey(finding), finding);
  for (const { page } of captured) {
    for (const finding of deriveFindings(page)) findings.set(findingKey(finding), finding);
  }

  const assets = new Set<string>(previousState?.assets_discovered_sample ?? []);
  for (const { assets: pageAssets } of captured) {
    for (const asset of pageAssets) assets.add(asset);
  }

  const pagesChecked = Array.from(pageMap.values()).sort((a, b) => a.path.localeCompare(b.path));
  const checkedPaths = new Set(pagesChecked.map((page) => page.path));
  const nextSuggestedPaths = DEFAULT_CAPTURE_CONTINUE_PATHS.filter(
    (path) => !checkedPaths.has(path)
  );

  return {
    session_id: previousState?.session_id ?? createCaptureSessionId(),
    published_url: publishedUrl,
    phase,
    created_at: previousState?.created_at ?? now,
    updated_at: now,
    pages_checked: pagesChecked,
    findings: Array.from(findings.values()),
    assets_discovered_count: Math.max(previousState?.assets_discovered_count ?? 0, assets.size),
    assets_discovered_sample: Array.from(assets).slice(0, 40),
    next_suggested_paths: nextSuggestedPaths,
    capture_limitations: [
      'Public static HTTP/HTML capture only.',
      'No Webflow Designer/API evidence.',
      'No authenticated browser session or human visual review.',
      'Runtime console and interaction quality require a separate browser/runtime pass.'
    ]
  };
}

function parseCaptureState(value: unknown): CaptureState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as Partial<CaptureState>;
  if (!state.session_id || !state.published_url || !Array.isArray(state.pages_checked)) return null;
  return {
    session_id: String(state.session_id),
    published_url: normalizePublishedUrl(String(state.published_url)),
    phase: String(state.phase ?? 'unknown'),
    created_at: String(state.created_at ?? new Date().toISOString()),
    updated_at: String(state.updated_at ?? new Date().toISOString()),
    pages_checked: Array.isArray(state.pages_checked) ? (state.pages_checked as CapturePage[]) : [],
    findings: Array.isArray(state.findings) ? (state.findings as CaptureFinding[]) : [],
    assets_discovered_count: Number.isFinite(state.assets_discovered_count)
      ? Number(state.assets_discovered_count)
      : 0,
    assets_discovered_sample: Array.isArray(state.assets_discovered_sample)
      ? state.assets_discovered_sample.map(String)
      : [],
    next_suggested_paths: Array.isArray(state.next_suggested_paths)
      ? state.next_suggested_paths.map(String)
      : [],
    capture_limitations: Array.isArray(state.capture_limitations)
      ? state.capture_limitations.map(String)
      : []
  };
}

async function runPublicCapture(
  publishedUrl: string,
  paths: readonly string[],
  previousState: CaptureState | null,
  phase: string
): Promise<CaptureState> {
  const normalizedUrl = normalizePublishedUrl(publishedUrl);
  const uniquePaths = uniqueCapturePaths(paths);
  const captured = await Promise.all(
    uniquePaths.map((path) => capturePublicPage(normalizedUrl, path))
  );
  return mergeCaptureState(previousState, normalizedUrl, phase, captured);
}

function captureSummary(state: CaptureState) {
  return {
    session_id: state.session_id,
    phase: state.phase,
    published_url: state.published_url,
    pages_checked_count: state.pages_checked.length,
    pages_checked: state.pages_checked.map((page) => ({
      path: page.path,
      status: page.status,
      title: page.title,
      h1_count: page.h1Count,
      hash_links: page.counts.hashLinks,
      forms: page.counts.forms,
      inputs: page.counts.inputs,
      labels: page.counts.labels
    })),
    findings_count: state.findings.length,
    blocker_count: state.findings.filter((finding) => finding.severity === 'blocker').length,
    warning_count: state.findings.filter((finding) => finding.severity === 'warning').length,
    findings: state.findings.slice(0, 30),
    assets_discovered_count: state.assets_discovered_count,
    next_suggested_paths: state.next_suggested_paths,
    capture_limitations: state.capture_limitations
  };
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
    ...(item.latestReviewFeedback
      ? { latestReviewFeedbackPreview: truncateText(item.latestReviewFeedback) }
      : {})
  };
}

function currentReviewerAsCollaborator(getReviewer: ReviewerFactory) {
  const reviewer = getReviewer();
  if (!reviewer) return null;
  return {
    id: reviewer.airtableCollaboratorId,
    ...(reviewer.email ? { email: reviewer.email } : {}),
    ...(reviewer.name ? { name: reviewer.name } : {})
  };
}

function requireResolvedReviewer(getReviewer: ReviewerFactory) {
  const reviewer = getReviewer();
  if (!reviewer) {
    throw new AirtableClientError(
      'REVIEWER_IDENTITY_UNAVAILABLE',
      'Current reviewer identity is not configured for this MCP runtime.',
      503
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
    lane: reviewer.lane
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
      current_reviewer_id: reviewer.airtableCollaboratorId
    }
  );
}

export function registerTools(
  server: McpServer,
  getClient: ClientFactory,
  getReviewer: ReviewerFactory = () => null
): void {
  server.tool(
    'template_review_workflow',
    'Reviewer onboarding guide — call this FIRST to learn the complete review workflow, tool sequence, evidence requirements, and decision criteria. No parameters needed.',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: REVIEW_WORKFLOW }]
    })
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
    }
  );

  server.tool(
    'template_review_start_capture_session',
    'Read-only public-site capture session starter for longer reviewer-visible template reviews. Fetches a bounded set of public pages and returns capture_state for continuation; does not read or write Airtable.',
    {
      published_url: z.string().url(),
      paths: z.array(z.string().min(1)).max(MAX_CAPTURE_PATHS_PER_CALL).optional()
    },
    async ({ published_url, paths }) => {
      try {
        const state = await runPublicCapture(
          published_url,
          paths?.length ? paths : DEFAULT_CAPTURE_START_PATHS,
          null,
          'public_site_capture_started'
        );
        return asSuccess({
          status: 'started',
          summary: captureSummary(state),
          capture_state: state,
          reviewer_note:
            'Use template_review_continue_capture_session with capture_state to continue visibly in a later Dify turn.'
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_continue_capture_session',
    'Read-only continuation for a public-site capture session. Pass capture_state from start/previous continuation plus optional paths; returns updated capture_state; does not read or write Airtable.',
    {
      capture_state: z.unknown(),
      paths: z.array(z.string().min(1)).max(MAX_CAPTURE_PATHS_PER_CALL).optional()
    },
    async ({ capture_state, paths }) => {
      try {
        const previousState = parseCaptureState(capture_state);
        if (!previousState) {
          throw new AirtableClientError(
            'INVALID_CAPTURE_STATE',
            'Pass the capture_state object returned by template_review_start_capture_session or template_review_continue_capture_session.',
            400
          );
        }

        const nextPaths = paths?.length
          ? paths
          : previousState.next_suggested_paths.length
            ? previousState.next_suggested_paths
            : DEFAULT_CAPTURE_CONTINUE_PATHS;
        const state = await runPublicCapture(
          previousState.published_url,
          nextPaths,
          previousState,
          'public_site_capture_continued'
        );
        return asSuccess({
          status: 'continued',
          summary: captureSummary(state),
          capture_state: state,
          reviewer_note:
            'Use template_review_draft_from_capture_session when the public capture is sufficient, or continue with more paths.'
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_get_capture_session_artifact',
    'Read-only formatter for a capture_state object. Returns compact evidence without fetching new pages or writing Airtable.',
    {
      capture_state: z.unknown()
    },
    async ({ capture_state }) => {
      try {
        const state = parseCaptureState(capture_state);
        if (!state) {
          throw new AirtableClientError(
            'INVALID_CAPTURE_STATE',
            'Pass the capture_state object returned by the capture session tools.',
            400
          );
        }
        return asSuccess({
          summary: captureSummary(state),
          capture_state: state
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_draft_from_capture_session',
    'Read-only draft helper that turns capture_state into confirmed summary, caveats, and draft feedback. This does not write Airtable or set review status.',
    {
      capture_state: z.unknown()
    },
    async ({ capture_state }) => {
      try {
        const state = parseCaptureState(capture_state);
        if (!state) {
          throw new AirtableClientError(
            'INVALID_CAPTURE_STATE',
            'Pass the capture_state object returned by the capture session tools.',
            400
          );
        }

        const summary = captureSummary(state);
        const blockers = state.findings.filter((finding) => finding.severity === 'blocker');
        const warnings = state.findings.filter((finding) => finding.severity === 'warning');
        const markdown = [
          '## Confirmed Summary',
          '',
          `Public-site capture checked ${summary.pages_checked_count} page(s) for ${state.published_url}.`,
          `Blockers detected: ${blockers.length}. Warnings detected: ${warnings.length}.`,
          '',
          '## Caveats',
          '',
          ...state.capture_limitations.map((limitation) => `- ${limitation}`),
          '',
          '## Draft Feedback',
          '',
          blockers.length > 0 || warnings.length > 0
            ? [...blockers, ...warnings]
                .slice(0, 12)
                .map((finding) => `- ${finding.path}: ${finding.check} — ${finding.evidence}`)
                .join('\n')
            : '- No blocker or warning findings were detected in the public capture scope.',
          '',
          'Designer-only checks, visual quality, runtime interaction quality, and PageSpeed remain separate review steps.'
        ].join('\n');

        return asSuccess({
          summary,
          draft: {
            confirmed_summary: {
              published_url: state.published_url,
              pages_checked_count: summary.pages_checked_count,
              blocker_count: summary.blocker_count,
              warning_count: summary.warning_count
            },
            caveats: state.capture_limitations,
            draft_feedback_markdown: markdown
          }
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_list_queue',
    'List one compact page of template review queue summaries using confirmed template Airtable fields. Defaults to 10 items; pass page_token from pagination.nextPageToken for the next page.',
    {
      status: z
        .enum(['ready_to_review', 'in_review', 'changes_requested', 'approved', 'published'])
        .optional(),
      assigned: z.enum(['any', 'assigned', 'unassigned']).optional(),
      sort: z
        .enum(['submittedDate_desc', 'submittedDate_asc', 'decisionDate_desc', 'decisionDate_asc'])
        .optional(),
      limit: z.number().int().min(1).max(MAX_QUEUE_LIMIT).optional(),
      page_token: z.string().min(1).optional()
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
          currentReviewer: currentReviewerAsCollaborator(getReviewer)
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
            source: queue.pagination.source
          },
          items: queue.items.map(compactQueueItem)
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_my_queue',
    'List one compact page of template review queue summaries currently assigned to the authenticated reviewer. Defaults to 10 items; pass page_token from pagination.nextPageToken for the next page.',
    {
      status: z
        .enum(['ready_to_review', 'in_review', 'changes_requested', 'approved', 'published'])
        .optional(),
      sort: z
        .enum(['submittedDate_desc', 'submittedDate_asc', 'decisionDate_desc', 'decisionDate_asc'])
        .optional(),
      limit: z.number().int().min(1).max(MAX_QUEUE_LIMIT).optional(),
      page_token: z.string().min(1).optional()
    },
    async ({ limit, page_token, status, sort }) => {
      try {
        const currentReviewer = currentReviewerAsCollaborator(getReviewer);
        if (!currentReviewer?.id) {
          throw new AirtableClientError(
            'REVIEWER_IDENTITY_UNAVAILABLE',
            'Current reviewer identity is not configured for this MCP runtime.',
            503
          );
        }
        const pageLimit = queueLimit(limit);
        const queue = await getClient().listMyQueueDetailed({
          status,
          sort: sort ?? 'submittedDate_desc',
          limit: pageLimit,
          pageToken: page_token,
          currentReviewer
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
            source: queue.pagination.source
          },
          items: queue.items.map(compactQueueItem)
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_get_review_context',
    'Get the normalized review context for one template version, including reviewer-facing fields and capability flags.',
    {
      version_id: z.string().min(1)
    },
    async ({ version_id }) => {
      try {
        return asSuccess({
          context: await getClient().getReviewContext(
            version_id,
            currentReviewerAsCollaborator(getReviewer)
          )
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_assign_self',
    'Reviewer-safe write: assign the current reviewer to a template Asset Version using runtime reviewer identity mapped from the hub account.',
    {
      version_id: z.string().min(1)
    },
    async ({ version_id }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);

        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: await getClient().assignSelfToVersion(version_id, actingReviewer)
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_unassign_self',
    'Reviewer-safe write: clear the 📝Reviewer field only when the selected template Asset Version is currently assigned to the authenticated reviewer.',
    {
      version_id: z.string().min(1)
    },
    async ({ version_id }) => {
      try {
        const reviewer = requireResolvedReviewer(getReviewer);
        const actingReviewer = currentReviewerAsCollaborator(getReviewer);

        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: await getClient().unassignVersionReviewer(version_id, actingReviewer)
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_request_changes',
    'Reviewer-safe write: set a template version to changes-requested and attach reviewer feedback using the authenticated reviewer identity.',
    {
      version_id: z.string().min(1),
      review_feedback: z.string().min(1),
      improvement_areas: z.array(z.string()).optional()
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
            improvement_areas
          })
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_set_review_status',
    'Reviewer-safe write: set a reviewer-controlled template review status after ownership has been established through self-assignment.',
    {
      version_id: z.string().min(1),
      review_status: z.enum(REVIEWER_CONTROLLED_STATUS_OPTIONS)
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
            review_status
          })
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_save_draft_feedback',
    'Reviewer-safe write: save draft reviewer feedback for a template version without changing the official decision state.',
    {
      version_id: z.string().min(1),
      review_feedback: z.string().min(1).optional(),
      improvement_areas: z.array(z.string()).optional()
    },
    async ({ version_id, review_feedback, improvement_areas }) => {
      try {
        if (review_feedback === undefined && improvement_areas === undefined) {
          throw new AirtableClientError(
            'NO_MUTATION_FIELDS',
            'Provide review_feedback, improvement_areas, or both.',
            400
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
            improvement_areas
          })
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_search_assets',
    'Search template assets by name so reviewers can find a specific submission without reading a broad queue slice.',
    {
      query: z.string().min(1),
      mode: z.enum(['contains', 'exact']).optional(),
      limit: z.number().int().min(1).max(100).optional()
    },
    async ({ query, mode, limit }) => {
      try {
        const records = await getClient().searchAssetsByName(query, {
          mode,
          limit: limit ?? 25
        });
        return asSuccess({
          query,
          mode: mode ?? 'contains',
          count: records.length,
          records
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_search_versions',
    'Search template Asset Versions by asset name so reviewers can locate review cycles for a specific submission directly.',
    {
      query: z.string().min(1),
      mode: z.enum(['contains', 'exact']).optional(),
      asset_limit: z.number().int().min(1).max(50).optional(),
      versions_per_asset_limit: z.number().int().min(1).max(100).optional()
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
              versionsPerAssetLimit: versions_per_asset_limit ?? 25
            });
            return {
              asset_count: matches.length,
              version_count: matches.reduce((total, match) => total + match.versions.length, 0),
              matches
            };
          })())
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_get_asset',
    'Get one template review payload by asset_id, including version history.',
    {
      asset_id: z.string().min(1),
      versions_limit: z.number().int().min(1).max(500).optional()
    },
    async ({ asset_id, versions_limit }) => {
      try {
        const client = getClient();
        const asset = await client.getAssetById(asset_id);
        if (!asset) {
          throw new AirtableClientError(
            'ASSET_NOT_FOUND_OR_OUT_OF_SCOPE',
            'Template asset not found in template-review scope.',
            404,
            {
              asset_id
            }
          );
        }
        const versions = await client.listVersionsForAsset(asset_id, versions_limit ?? 100);
        return asSuccess({ asset, versions });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_list_versions',
    'List all versions for a template asset.',
    {
      asset_id: z.string().min(1),
      limit: z.number().int().min(1).max(500).optional()
    },
    async ({ asset_id, limit }) => {
      try {
        const versions = await getClient().listVersionsForAsset(asset_id, limit ?? 100);
        return asSuccess({ asset_id, count: versions.length, versions });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_get_version',
    'Get one template version record by version_id.',
    {
      version_id: z.string().min(1)
    },
    async ({ version_id }) => {
      try {
        const version = await getClient().getVersionById(version_id);
        if (!version) {
          throw new AirtableClientError('VERSION_NOT_FOUND', 'Template version not found.', 404, {
            version_id
          });
        }
        return asSuccess({ version });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_list_releases',
    'List available Asset Release records reviewers can link to approved template versions.',
    {
      limit: z.number().int().min(1).max(500).optional()
    },
    async ({ limit }) => {
      try {
        const releases = await getClient().listReleases(limit ?? 100);
        return asSuccess({
          count: releases.length,
          releases
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_get_field_map',
    'Return the template review Airtable field map with confirmed and pending mappings.',
    {},
    async () => asSuccess(TEMPLATE_REVIEW_FIELD_MAP)
  );

  server.tool(
    'template_review_get_metrics',
    'Return compact marketplace template review metrics for a recent date window.',
    {
      days: z.number().int().min(1).max(90).optional(),
      end_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
    },
    async ({ days, end_date }) => {
      try {
        return asSuccess({
          metrics: await getClient().getMarketplaceMetrics({
            days,
            end_date
          })
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_assign_reviewer',
    'Admin/operator write: assign or clear the 📝Reviewer collaborator on a template Asset Version without changing any other review fields.',
    {
      version_id: z.string().min(1),
      review_owner: z.union([
        z.string().min(1).describe('Airtable collaborator id for the reviewer.'),
        z.object({ id: z.string().min(1) }),
        z.null()
      ])
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
            updated_version: updated
          });
        }

        return asSuccess({
          updated_version: await getClient().assignVersionReviewer(version_id, {
            review_owner
          })
        });
      } catch (error) {
        return asError(error);
      }
    }
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
      mrp_id_overwrite: z.string().optional()
    },
    async ({
      version_id,
      release_record_id,
      release_date_local,
      time_zone,
      approve_version,
      mrp_id_overwrite
    }) => {
      try {
        if (!release_record_id && !release_date_local && !time_zone) {
          throw new AirtableClientError(
            'MISSING_RELEASE_SELECTOR',
            'Provide release_record_id, release_date_local, or time_zone so the publishing workflow can resolve a release.',
            400
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
          mrp_id_overwrite
        });

        return asSuccess({
          reviewer: reviewerPayload(reviewer),
          acting_reviewer: actingReviewer,
          updated_version: result.updatedVersion,
          updated_asset: result.updatedAsset,
          resolved_release: result.resolvedRelease,
          resolved_local_date: result.resolvedLocalDate,
          support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.publishingCompletion
        });
      } catch (error) {
        return asError(error);
      }
    }
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
      carousel_image_urls: z.array(z.string().url()).optional()
    },
    async ({ asset_id, ...input }) => {
      try {
        const updated = await getClient().updateAssetMetadata(asset_id, input);
        return asSuccess({
          updated_asset: updated,
          support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.assetMetadata
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_update_asset_publishing',
    'Update confirmed asset-side publishing override fields for a template.',
    {
      asset_id: z.string().min(1),
      mrp_id_overwrite: z.string().optional()
    },
    async ({ asset_id, mrp_id_overwrite }) => {
      try {
        const updated = await getClient().updateAssetPublishing(asset_id, {
          mrp_id_overwrite
        });
        return asSuccess({
          updated_asset: updated,
          support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.assetPublishing
        });
      } catch (error) {
        return asError(error);
      }
    }
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
      rejection_feedback: z.string().optional()
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
      rejection_feedback
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
                acting_reviewer: actingReviewer
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
            rejection_feedback
          })
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_approve_version',
    'Approve a template version and optionally update confirmed publishing checklist metadata.',
    {
      version_id: z.string().min(1),
      release_record_id: z.string().optional(),
      publishing_checklist: z.unknown().optional()
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
            publishing_checklist
          })
        });
      } catch (error) {
        return asError(error);
      }
    }
  );

  server.tool(
    'template_review_reject_version',
    'Reject a template version with reason and reviewer feedback.',
    {
      version_id: z.string().min(1),
      reject_reason: z.string().min(1),
      rejection_feedback: z.string().min(1)
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
            rejection_feedback
          })
        });
      } catch (error) {
        return asError(error);
      }
    }
  );
}
