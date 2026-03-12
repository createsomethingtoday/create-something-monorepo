import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';

import type { AirtableClient } from './airtable.js';
import type { ReviewerProfile } from './reviewer-directory.js';
import { registerTools } from './tools.js';

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }>; isError?: boolean }>;

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

function parsePayload(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0]?.text ?? '{}') as { ok: boolean; data?: Record<string, unknown> };
}

const reviewer: ReviewerProfile = {
  accountId: 'acct_wf_pablo',
  airtableCollaboratorId: 'usr_pablo',
  email: 'pablo.miranda@webflow.com',
  name: 'Pablo Miranda',
  lane: 'wf-app-review-pablo',
};

describe('registerTools', () => {
  it('preserves the first six Phase A read tools and places narrow reviewer workflow tools before broad writes', () => {
    const { server, names } = createServerHarness();
    const client = {} as AirtableClient;

    registerTools(server, () => client, () => reviewer);

    expect(names.slice(0, 6)).toEqual([
      'app_review_health',
      'app_review_list_queue',
      'app_review_get_asset',
      'app_review_list_versions',
      'app_review_get_version',
      'app_review_get_field_map',
    ]);
    expect(names.indexOf('app_review_my_queue')).toBeGreaterThan(5);
    expect(names.indexOf('app_review_get_review_context')).toBeGreaterThan(5);
    expect(names.indexOf('app_review_update_version_review')).toBeGreaterThan(names.indexOf('app_review_reject_version'));
  });

  it('routes my_queue through reviewer-scoped queue filters', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      listAssetQueueDetailed: vi.fn().mockResolvedValue({
        sortApplied: 'submissionDatetime_desc',
        items: [{ assetId: 'recAsset', appName: 'Example App' }],
      }),
    } as unknown as AirtableClient;

    registerTools(server, () => client, () => reviewer);

    const result = await handlers.get('app_review_my_queue')?.({
      limit: 25,
      status: 'in_review',
      sort: 'submissionDatetime_desc',
    });

    expect(client.listAssetQueueDetailed).toHaveBeenCalledWith({
      limit: 25,
      status: 'in_review',
      assigned: 'assigned',
      sort: 'submissionDatetime_desc',
      currentReviewer: {
        id: 'usr_pablo',
        email: 'pablo.miranda@webflow.com',
        name: 'Pablo Miranda',
      },
      onlyAssignedToCurrentReviewer: true,
    });
    expect(parsePayload(result!).data?.count).toBe(1);
  });

  it('requires reviewer ownership before request_changes mutates a version', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      requireAssignedVersion: vi.fn().mockResolvedValue({ versionId: 'recVersion' }),
      updateVersionReview: vi.fn().mockResolvedValue({ versionId: 'recVersion', reviewStatus: '📤Changes Requested' }),
    } as unknown as AirtableClient;

    registerTools(server, () => client, () => reviewer);

    const result = await handlers.get('app_review_request_changes')?.({
      version_id: 'recVersion',
      review_feedback: 'Please address the install flow issues.',
    });

    expect(client.requireAssignedVersion).toHaveBeenCalledWith('recVersion', {
      id: 'usr_pablo',
      email: 'pablo.miranda@webflow.com',
      name: 'Pablo Miranda',
    });
    expect(client.updateVersionReview).toHaveBeenCalledWith('recVersion', {
      review_status: '📤Changes Requested',
      reviewer: { id: 'usr_pablo' },
      rejection_reason: undefined,
      review_feedback: 'Please address the install flow issues.',
    });
    expect(parsePayload(result!).data?.updated_version).toMatchObject({
      versionId: 'recVersion',
      reviewStatus: '📤Changes Requested',
    });
  });
});
