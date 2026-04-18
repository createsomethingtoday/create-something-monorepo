import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from '../src/airtable.js';
import type { TemplateReviewAnalyzerClient } from '../src/analyzer.js';
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
  assert.notEqual(names.indexOf('template_review_get_analyzer_review'), -1);
  assert.notEqual(names.indexOf('template_review_list_analyzer_reviews'), -1);
  assert.notEqual(names.indexOf('template_review_assign_self'), -1);
  assert.notEqual(names.indexOf('template_review_request_changes'), -1);
  assert.notEqual(names.indexOf('template_review_set_review_status'), -1);
  assert.notEqual(names.indexOf('template_review_save_draft_feedback'), -1);
  assert.ok(names.indexOf('template_review_enqueue_analyzer_review') < names.indexOf('template_review_assign_self'));
  assert.ok(names.indexOf('template_review_get_analyzer_review') < names.indexOf('template_review_assign_reviewer'));
  assert.ok(names.indexOf('template_review_list_analyzer_reviews') < names.indexOf('template_review_complete_publishing'));
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

test('enqueue_analyzer_review resolves Airtable URLs and forwards the version correlation id', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    getReviewContext: async () => ({
      versionId: 'rec_version_1',
      templateName: 'Alpha Template',
      asset: {
        assetId: 'rec_asset_1',
        templateName: 'Alpha Template',
        previewSiteUrl: 'https://preview.example.com/alpha',
        websiteUrl: 'https://alpha.example.com',
      },
      version: {
        versionId: 'rec_version_1',
      },
      canAssign: true,
      canReview: true,
      canPublish: false,
      isAssignedToCurrentReviewer: false,
    }),
  } as unknown as AirtableClient;
  const calls: Array<Record<string, unknown>> = [];
  const analyzer = {
    enqueueReview: async (input) => {
      calls.push(input);
      return {
        jobId: 'template-review-job-1',
        status: 'queued',
        input,
      };
    },
  } as unknown as TemplateReviewAnalyzerClient;

  registerTools(server, () => client, () => reviewer, () => analyzer);

  const result = await handlers.get('template_review_enqueue_analyzer_review')?.({
    version_id: 'rec_version_1',
  });

  assert.ok(result);
  assert.deepEqual(calls, [
    {
      templateVersionId: 'rec_version_1',
      previewUrl: 'https://preview.example.com/alpha',
      publishedUrl: 'https://alpha.example.com',
      timeout: undefined,
      includeManual: undefined,
      crawlMaxPages: undefined,
      crawlMaxDepth: undefined,
    },
  ]);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.equal(payload.data?.version_id, 'rec_version_1');
  assert.equal((payload.data?.job as { jobId?: string } | undefined)?.jobId, 'template-review-job-1');
});

test('get_analyzer_review proxies the requested job id to the analyzer client', async () => {
  const { server, handlers } = createServerHarness();
  const client = {} as AirtableClient;
  const calls: string[] = [];
  const analyzer = {
    getReview: async (jobId: string) => {
      calls.push(jobId);
      return {
        jobId,
        status: 'running',
        input: {
          previewUrl: 'https://preview.example.com/alpha',
          publishedUrl: 'https://alpha.example.com',
        },
      };
    },
  } as unknown as TemplateReviewAnalyzerClient;

  registerTools(server, () => client, () => reviewer, () => analyzer);

  const result = await handlers.get('template_review_get_analyzer_review')?.({
    job_id: 'template-review-job-2',
  });

  assert.ok(result);
  assert.deepEqual(calls, ['template-review-job-2']);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.equal((payload.data?.job as { status?: string } | undefined)?.status, 'running');
});

test('list_analyzer_reviews scopes the analyzer queue to a specific version id', async () => {
  const { server, handlers } = createServerHarness();
  const client = {} as AirtableClient;
  const calls: Array<Record<string, unknown>> = [];
  const analyzer = {
    listReviews: async (input) => {
      calls.push(input ?? {});
      return [
        {
          jobId: 'template-review-job-3',
          status: 'succeeded',
          input: {
            templateVersionId: 'rec_version_2',
            previewUrl: 'https://preview.example.com/beta',
            publishedUrl: 'https://beta.example.com',
          },
        },
      ];
    },
  } as unknown as TemplateReviewAnalyzerClient;

  registerTools(server, () => client, () => reviewer, () => analyzer);

  const result = await handlers.get('template_review_list_analyzer_reviews')?.({
    version_id: 'rec_version_2',
    status: 'succeeded',
    limit: 10,
  });

  assert.ok(result);
  assert.deepEqual(calls, [
    {
      templateVersionId: 'rec_version_2',
      status: 'succeeded',
      limit: 10,
    },
  ]);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.equal(payload.data?.count, 1);
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
