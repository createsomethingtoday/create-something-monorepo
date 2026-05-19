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
