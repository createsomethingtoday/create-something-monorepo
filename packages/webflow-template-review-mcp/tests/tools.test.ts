import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from '../src/airtable.js';
import type { ReviewerProfile } from '../src/reviewer-directory.js';
import { METRICS_ASSET_FIELD_IDS, TABLE_IDS } from '../src/schema.js';
import { registerTools } from '../src/tools.js';

type ToolResult = { content: Array<{ text: string }>; isError?: boolean };
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

function createServerHarness() {
  const names: string[] = [];
  const handlers = new Map<string, ToolHandler>();

  const server = {
    tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
      names.push(name);
      handlers.set(name, handler);
    },
  } as unknown as McpServer;

  return { server, names, handlers };
}

function parsePayload(result: ToolResult) {
  return JSON.parse(result.content[0]?.text ?? '{}') as { ok: boolean; data?: Record<string, unknown>; error?: Record<string, unknown> };
}

const reviewer: ReviewerProfile = {
  accountId: 'acct_wf_eric',
  airtableCollaboratorId: 'usr_eric',
  email: 'eric.unger@webflow.com',
  name: 'Eric Unger',
  lane: 'wf-template-review-eric',
};

test('registerTools places reviewer-safe write tools before admin and broad mutation routes', () => {
  const { server, names } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(server, () => client, () => reviewer);

  assert.notEqual(names.indexOf('template_review_enqueue_analyzer_review'), -1);
  assert.notEqual(names.indexOf('template_review_get_reviewer_packet'), -1);
  assert.notEqual(names.indexOf('template_review_assign_self'), -1);
  assert.notEqual(names.indexOf('template_review_request_changes'), -1);
  assert.notEqual(names.indexOf('template_review_set_review_status'), -1);
  assert.notEqual(names.indexOf('template_review_save_draft_feedback'), -1);
  assert.ok(names.indexOf('template_review_assign_self') < names.indexOf('template_review_assign_reviewer'));
  assert.ok(names.indexOf('template_review_request_changes') < names.indexOf('template_review_complete_publishing'));
  assert.ok(names.indexOf('template_review_set_review_status') < names.indexOf('template_review_update_version_review'));
  assert.ok(names.indexOf('template_review_save_draft_feedback') < names.indexOf('template_review_approve_version'));
});

test('assign_self routes through reviewer-safe self-assignment', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ versionId: string; reviewer: Record<string, unknown> | null }> = [];
  const client = {
    assignSelfToVersion: async (versionId: string, actingReviewer: Record<string, unknown> | null) => {
      calls.push({ versionId, reviewer: actingReviewer });
      return { versionId, reviewOwner: actingReviewer };
    },
  } as unknown as AirtableClient;

  registerTools(server, () => client, () => reviewer);

  const result = await handlers.get('template_review_assign_self')?.({
    version_id: 'rec_version_1',
  });

  assert.ok(result);
  assert.deepEqual(calls, [
    {
      versionId: 'rec_version_1',
      reviewer: {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger',
      },
    },
  ]);
  assert.equal(parsePayload(result).ok, true);
});

test('request_changes requires reviewer ownership before mutation', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewStatus: '📤Changes Requested' };
    },
  } as unknown as AirtableClient;

  registerTools(server, () => client, () => reviewer);

  const result = await handlers.get('template_review_request_changes')?.({
    version_id: 'rec_version_1',
    review_feedback: 'Please tighten the responsive layout.',
    improvement_areas: ['Template: Typography'],
  });

  assert.ok(result);
  assert.deepEqual(calls[0], {
    method: 'requireAssignedVersion',
    args: [
      'rec_version_1',
      {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger',
      },
    ],
  });
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_status: '📤Changes Requested',
        review_feedback: 'Please tighten the responsive layout.',
        improvement_areas: ['Template: Typography'],
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('save_draft_feedback writes validated improvement areas through to the client', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewFeedback: 'Draft feedback' };
    },
  } as unknown as AirtableClient;

  registerTools(server, () => client, () => reviewer);

  const result = await handlers.get('template_review_save_draft_feedback')?.({
    version_id: 'rec_version_1',
    review_feedback: 'Draft feedback',
    improvement_areas: ['Template: Accessibility'],
  });

  assert.ok(result);
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_feedback: 'Draft feedback',
        improvement_areas: ['Template: Accessibility'],
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('save_draft_feedback rejects empty payloads before any mutation runs', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    requireAssignedVersion: async () => {
      throw new Error('should not run');
    },
    updateVersionReview: async () => {
      throw new Error('should not run');
    },
  } as unknown as AirtableClient;

  registerTools(server, () => client, () => reviewer);

  const result = await handlers.get('template_review_save_draft_feedback')?.({
    version_id: 'rec_version_1',
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal(payload.error?.code, 'NO_MUTATION_FIELDS');
});

test('save_draft_feedback writes review feedback without mutating improvement areas', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewFeedback: 'Draft feedback' };
    },
  } as unknown as AirtableClient;

  registerTools(server, () => client, () => reviewer);

  const result = await handlers.get('template_review_save_draft_feedback')?.({
    version_id: 'rec_version_1',
    review_feedback: 'Draft feedback',
  });

  assert.ok(result);
  assert.deepEqual(calls[0], {
    method: 'requireAssignedVersion',
    args: [
      'rec_version_1',
      {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger',
      },
    ],
  });
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_feedback: 'Draft feedback',
        improvement_areas: undefined,
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('get_field_map exposes stable table ids and metrics field ids', async () => {
  const { server, handlers } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(server, () => client, () => reviewer);

  const result = await handlers.get('template_review_get_field_map')?.({});

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.data?.tables, TABLE_IDS);
  assert.deepEqual(payload.data?.metricsFieldIds, {
    assets: METRICS_ASSET_FIELD_IDS,
  });
});

test('enqueue_analyzer_review resolves published URL from review context and forces published-only mode', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    getReviewContext: async () => ({
      versionId: 'rec_version_1',
      assetId: 'rec_asset_1',
      templateName: 'Athelas',
      canAssign: true,
      canReview: true,
      canPublish: false,
      isAssignedToCurrentReviewer: false,
      currentReviewer: {
        id: 'usr_eric',
      },
      asset: {
        assetId: 'rec_asset_1',
        templateName: 'Athelas',
        websiteUrl: 'https://athelas-template.webflow.io/',
        previewSiteUrl: 'https://preview.webflow.com/site/athelas',
      },
      version: {
        versionId: 'rec_version_1',
        rawFields: {},
      },
    }),
  } as unknown as AirtableClient;
  const analyzerCalls: Array<Record<string, unknown>> = [];
  const analyzer = {
    isConfigured: () => true,
    enqueueReview: async (input: Record<string, unknown>) => {
      analyzerCalls.push(input);
      return {
        versionId: 'rec_version_1',
        assetId: 'rec_asset_1',
        templateName: 'Athelas',
        jobId: 'job_123',
        status: 'queued',
        queuedAt: '2026-04-24T12:00:00.000Z',
        publishedUrl: 'https://athelas-template.webflow.io/',
        previewUrl: 'https://preview.webflow.com/site/athelas',
        analyzerUrl: 'https://analyzer.example/mcp',
        reviewMode: 'published-only',
      };
    },
  };

  registerTools(server, () => client, () => reviewer, () => analyzer as never);

  const result = await handlers.get('template_review_enqueue_analyzer_review')?.({
    version_id: 'rec_version_1',
    crawl_max_pages: 3,
    crawl_max_depth: 1,
  });

  assert.ok(result);
  assert.deepEqual(analyzerCalls, [
    {
      versionId: 'rec_version_1',
      assetId: 'rec_asset_1',
      templateName: 'Athelas',
      publishedUrl: 'https://athelas-template.webflow.io/',
      previewUrl: 'https://preview.webflow.com/site/athelas',
      timeout: undefined,
      crawlMaxPages: 3,
      crawlMaxDepth: 1,
      includeManual: true,
    },
  ]);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  const data = payload.data as Record<string, unknown>;
  assert.equal((data.review as Record<string, unknown>).jobId, 'job_123');
});

test('get_reviewer_packet combines submission truth, tracked analyzer state, and manual-only gaps', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    getReviewContext: async () => ({
      versionId: 'rec_version_1',
      assetId: 'rec_asset_1',
      templateName: 'Athelas',
      reviewOwner: null,
      reviewStatus: '🆕Ready for Review',
      qualityRating: undefined,
      canAssign: true,
      canReview: true,
      canPublish: false,
      isAssignedToCurrentReviewer: false,
      currentReviewer: {
        id: 'usr_eric',
      },
      asset: {
        assetId: 'rec_asset_1',
        templateName: 'Athelas',
        websiteUrl: 'https://athelas-template.webflow.io/',
        previewSiteUrl: 'https://preview.webflow.com/site/athelas',
        thumbnailImageUrl: 'https://cdn.example/primary.jpg',
        secondaryThumbnailUrls: ['https://cdn.example/secondary.jpg'],
        carouselImageUrls: ['https://cdn.example/carousel-1.jpg', 'https://cdn.example/carousel-2.jpg'],
      },
      version: {
        versionId: 'rec_version_1',
        rawFields: {},
      },
    }),
  } as unknown as AirtableClient;
  const analyzer = {
    isConfigured: () => true,
    listTrackedReviews: async () => [
      {
        versionId: 'rec_version_1',
        assetId: 'rec_asset_1',
        templateName: 'Athelas',
        jobId: 'job_123',
        status: 'succeeded',
        queuedAt: '2026-04-24T12:00:00.000Z',
        completedAt: '2026-04-24T12:00:20.000Z',
        durationMs: 20000,
        publishedUrl: 'https://athelas-template.webflow.io/',
        analyzerUrl: 'https://analyzer.example/mcp',
        reviewMode: 'published-only',
        summary: {
          overallScore: 87,
          grade: 'B',
          coveragePercent: 100,
          passedChecks: 40,
          failedChecks: 1,
          partialChecks: 2,
          manualChecks: 3,
          topFailures: [
            {
              id: 'links.no_broken_internal',
              status: 'fail',
              severity: 'major',
              evidence: ['/broken-link'],
            },
          ],
        },
      },
    ],
  };

  registerTools(server, () => client, () => reviewer, () => analyzer as never);

  const result = await handlers.get('template_review_get_reviewer_packet')?.({
    version_id: 'rec_version_1',
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  const data = payload.data as Record<string, unknown>;
  const packet = data.packet as Record<string, unknown>;
  assert.equal((packet.submission as Record<string, unknown>).source, 'submission-truth');
  assert.equal(
    ((packet.submission as Record<string, unknown>).images as Record<string, unknown>).primaryThumbnailPresent,
    true,
  );
  assert.equal((packet.analyzer as Record<string, unknown>).source, 'published-verified');
  assert.equal(
    ((((packet.analyzer as Record<string, unknown>).latestReview as Record<string, unknown>).summary ??
      {}) as Record<string, unknown>).overallScore,
    87,
  );
  assert.deepEqual(
    (((packet.confidenceGuide as Record<string, unknown>).manualRequired as Record<string, unknown>).checks ??
      []) as unknown[],
    [
    'Designer component grouping, props, and variant labels',
    'Designer variable naming, modes, and cleanup quality',
    'Unused styles and unused interactions cleanup',
    'CMS field schema and help-text authoring inside Designer',
    ],
  );
});
