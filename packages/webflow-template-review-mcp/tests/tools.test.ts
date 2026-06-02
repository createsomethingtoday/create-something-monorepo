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
  return JSON.parse(result.content[0]?.text ?? '{}') as {
    ok: boolean;
    data?: Record<string, unknown>;
    error?: Record<string, unknown>;
  };
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

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  assert.notEqual(names.indexOf('template_review_assign_self'), -1);
  assert.notEqual(names.indexOf('template_review_request_changes'), -1);
  assert.notEqual(names.indexOf('template_review_set_review_status'), -1);
  assert.notEqual(names.indexOf('template_review_save_draft_feedback'), -1);
  assert.notEqual(names.indexOf('template_review_run_published_site_validation'), -1);
  assert.ok(names.indexOf('template_review_run_published_site_validation') < names.indexOf('template_review_assign_self'));
  assert.ok(names.indexOf('template_review_assign_self') < names.indexOf('template_review_assign_reviewer'));
  assert.ok(names.indexOf('template_review_request_changes') < names.indexOf('template_review_complete_publishing'));
  assert.ok(names.indexOf('template_review_set_review_status') < names.indexOf('template_review_update_version_review'));
  assert.ok(names.indexOf('template_review_save_draft_feedback') < names.indexOf('template_review_approve_version'));
});

test('published-site validation tool calls working validators without Airtable writes', async () => {
  const { server, handlers } = createServerHarness();
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const client = {} as AirtableClient;
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    requests.push({ url, body });

    if (url.includes('webflow-way.local')) {
      return new Response(
        JSON.stringify({
          siteUrl: body.siteUrl,
          timestamp: '2026-05-19T00:00:00.000Z',
          analysis: {
            assets: { issues: [], stats: { totalAssets: 0 }, assets: [] },
            content: {
              issues: [{ id: 'seo-title-repeated', category: 'Content', severity: 'warning', message: 'Repeated title detected' }],
              stats: { totalPages: 1 },
              pages: [{ url: body.siteUrl }],
            },
            accessibility: { issues: [], stats: { missingAltText: 0 }, audit: {} },
            interactions: {
              issues: [{ id: 'legacy-ix2-interactions-detected', category: 'Interactions and GSAP', severity: 'error', message: 'Legacy IX2 detected' }],
              stats: { legacyIx2Detected: true, legacyIx2Count: 2, pagesRequested: 1, pagesAnalyzed: 1, pagesFailed: 0, pagesWithLegacyIx2: 1, analysisComplete: true, analysisStatus: 'completed' },
              pages: [{ url: body.siteUrl, legacyIx2Detected: true, legacyIx2Count: 2, matches: [] }],
            },
          },
          summary: { totalIssues: 2, criticalErrors: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        passed: false,
        totalPagesFound: 1,
        validatedPages: 1,
        passedPages: 0,
        failedPages: 1,
        pageResults: [
          {
            url: body.url,
            success: true,
            passed: false,
            summary: {
              scriptCount: 2,
              validGsapCount: 1,
              flaggedCodeCount: 1,
              legacyIx2Detected: true,
              legacyIx2Count: 1,
            },
            details: {
              flaggedCode: [{ message: 'Legacy Webflow IX2 interactions detected.', policy: 'ix2-rejected' }],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  registerTools(
    server,
    () => client,
    () => reviewer,
    {
      webflowValidationWorkerUrl: 'https://webflow-way.local/validate',
      gsapValidationWorkerUrl: 'https://gsap.local/validateGsap',
      fetcher,
    },
  );

  const result = await handlers.get('template_review_run_published_site_validation')?.({
    published_url: 'https://example-template.webflow.io/',
    max_pages: 5,
    page_slugs: ['/about'],
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);

  const validation = payload.data?.validation as {
    publishedUrl: string;
    rubricCoverage: string;
    caveats: string[];
    results: {
      webflow_way: { ok: boolean; categories: Array<{ key: string; issueCount: number }> };
      gsap_custom_code: { ok: boolean; detections: { legacyIx2Detected: boolean; flaggedCodeCount: number } };
    };
  };

  assert.equal(validation.publishedUrl, 'https://example-template.webflow.io/');
  assert.equal(validation.rubricCoverage, 'partial_published_site_validation');
  assert.ok(validation.caveats.some((caveat) => caveat.includes('Lorem/placeholder findings are review evidence')));
  assert.ok(validation.caveats.some((caveat) => caveat.includes('generated Webflow video fallback/poster assets')));
  assert.equal(validation.results.webflow_way.ok, true);
  assert.deepEqual(
    validation.results.webflow_way.categories.map((category) => [category.key, category.issueCount]),
    [
      ['assets', 0],
      ['content', 1],
      ['accessibility', 0],
      ['interactions', 1],
    ],
  );
  assert.equal(validation.results.gsap_custom_code.ok, true);
  assert.equal(validation.results.gsap_custom_code.detections.legacyIx2Detected, true);
  assert.equal(validation.results.gsap_custom_code.detections.flaggedCodeCount, 1);
  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.body.siteUrl, 'https://example-template.webflow.io/');
  assert.deepEqual(requests[0]?.body.designerData, { components: [], styles: [], pages: [], assets: [] });
  assert.equal(requests[1]?.body.url, 'https://example-template.webflow.io/');
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

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

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

test('my_queue defaults to compact active assigned work', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<Record<string, unknown>> = [];
  const client = {
    listMyQueueDetailed: async (query: Record<string, unknown>) => {
      calls.push(query);
      return {
        sortApplied: query.sort,
        items: [
          {
            assetId: 'rec_asset_1',
            templateName: 'Finoraa',
            assignableVersionId: 'rec_version_1',
            normalizedStatus: 'in_review',
            latestReviewFeedback: 'Long feedback '.repeat(100),
          },
        ],
      };
    },
  } as unknown as AirtableClient;

  registerTools(server, () => client, () => reviewer);

  const result = await handlers.get('template_review_my_queue')?.({});

  assert.ok(result);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.limit, 25);
  assert.equal(calls[0]?.sort, 'submittedDate_desc');
  assert.equal(calls[0]?.includeCompleted, false);

  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.equal(payload.data?.statusApplied, 'active');
  assert.equal(payload.data?.limitApplied, 25);
  assert.equal(payload.data?.feedbackApplied, 'omitted');

  const items = payload.data?.items as Array<Record<string, unknown>>;
  assert.equal(items.length, 1);
  assert.equal(items[0]?.templateName, 'Finoraa');
  assert.equal(items[0]?.latestReviewFeedback, undefined);
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

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

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

test('approve_version requires reviewer ownership before mutation', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewStatus: '✅Approved' };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_approve_version')?.({
    version_id: 'rec_version_1',
    release_record_id: 'rec_release_1',
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
        review_status: '✅Approved',
        release_record_id: 'rec_release_1',
        publishing_checklist: undefined,
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('complete_publishing requires reviewer ownership before workflow mutation', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    completePublishing: async (...args: unknown[]) => {
      calls.push({ method: 'completePublishing', args });
      return {
        updatedVersion: { versionId: 'rec_version_1' },
        updatedAsset: { assetId: 'rec_asset_1' },
        resolvedRelease: { releaseId: 'rec_release_1' },
        resolvedLocalDate: '2026-03-18',
      };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_complete_publishing')?.({
    version_id: 'rec_version_1',
    release_record_id: 'rec_release_1',
    approve_version: true,
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
    method: 'completePublishing',
    args: [
      'rec_version_1',
      {
        release_record_id: 'rec_release_1',
        release_date_local: undefined,
        time_zone: undefined,
        approve_version: true,
        mrp_id_overwrite: undefined,
        review_owner: { id: 'usr_eric' },
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('update_version_review rejects reviewer-scoped owner changes before mutation', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    requireAssignedVersion: async () => {
      throw new Error('should not run');
    },
    updateVersionReview: async () => {
      throw new Error('should not run');
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_update_version_review')?.({
    version_id: 'rec_version_1',
    review_owner: { id: 'usr_other' },
    review_feedback: 'Draft feedback',
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal(payload.error?.code, 'REVIEWER_WRITE_SCOPE_VIOLATION');
});

test('update_version_review writes supplemental agent review feedback through reviewer scope', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return {
        versionId: 'rec_version_1',
        agentReviewFeedback: 'AI supplemental draft',
      };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_update_version_review')?.({
    version_id: 'rec_version_1',
    agent_review_feedback: 'AI supplemental draft',
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
        review_status: undefined,
        quality_rating: undefined,
        improvement_areas: undefined,
        review_feedback: undefined,
        review_checklist: undefined,
        publishing_checklist: undefined,
        release_record_id: undefined,
        reject_reason: undefined,
        rejection_feedback: undefined,
        agent_review_feedback: 'AI supplemental draft',
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

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

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

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

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

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

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

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_get_field_map')?.({});

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.data?.tables, TABLE_IDS);
  assert.deepEqual(payload.data?.metricsFieldIds, {
    assets: METRICS_ASSET_FIELD_IDS,
  });
});
