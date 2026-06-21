import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';

import type { AirtableClient } from './airtable.js';
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

describe('registerTools', () => {
  it('exposes neutral app review and governance tools without reviewer-assignment tools', () => {
    const { server, names } = createServerHarness();
    const client = {} as AirtableClient;

    registerTools(server, () => client);

    expect(names.slice(0, 6)).toEqual([
      'app_review_health',
      'app_review_list_queue',
      'app_review_get_asset',
      'app_review_list_versions',
      'app_review_get_version',
      'app_review_get_field_map',
    ]);
    expect(names).toContain('app_review_get_review_context');
    expect(names).toContain('app_review_request_changes');
    expect(names).toContain('governance_database_list_findings');
    expect(names).toContain('governance_database_create_finding');
    expect(names).not.toContain('app_review_my_queue');
    expect(names).not.toContain('app_review_assign_self');
    expect(names).not.toContain('app_review_unassign_self');
  });

  it('lists app review queue records through neutral filters', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      listAssetQueueDetailed: vi.fn().mockResolvedValue({
        sortApplied: 'submissionDatetime_desc',
        items: [{ assetId: 'recAsset', appName: 'Example App' }],
      }),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_list_queue')?.({
      limit: 25,
      status: 'in_review',
      assigned: 'assigned',
      sort: 'submissionDatetime_desc',
    });

    expect(client.listAssetQueueDetailed).toHaveBeenCalledWith({
      limit: 25,
      status: 'in_review',
      assigned: 'assigned',
      sort: 'submissionDatetime_desc',
    });
    expect(parsePayload(result!).data?.count).toBe(1);
  });

  it('lists governance findings through policy-relevant filters', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      listGovernanceFindings: vi.fn().mockResolvedValue([
        { findingId: 'recFinding', title: 'Runtime loader bypass' },
      ]),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_list_governance_findings')?.({
      limit: 10,
      status: 'Needs Decision',
      category: 'Runtime Integrity & Custom Code Governance',
      decision_needed: true,
    });

    expect(client.listGovernanceFindings).toHaveBeenCalledWith({
      limit: 10,
      status: 'Needs Decision',
      category: 'Runtime Integrity & Custom Code Governance',
      priority: undefined,
      decisionNeeded: true,
      search: undefined,
    });
    expect(parsePayload(result!).data?.count).toBe(1);
  });

  it('creates governance findings without reviewer attribution', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      createGovernanceFinding: vi.fn().mockResolvedValue({
        findingId: 'recFinding',
        title: 'Private beta loophole',
      }),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_create_governance_finding')?.({
      title: 'Private beta loophole',
      category: 'Private App & Beta-Testing Governance',
      summary: 'Private app docs conflict with production-readiness review posture.',
      decision_needed: true,
    });

    expect(client.createGovernanceFinding).toHaveBeenCalledWith({
      title: 'Private beta loophole',
      category: 'Private App & Beta-Testing Governance',
      summary: 'Private app docs conflict with production-readiness review posture.',
      decision_needed: true,
      reporter: 'Dify Governance Database',
      created_by_agent: 'webflow-app-review-mcp',
    });
    expect(parsePayload(result!).data?.finding).toMatchObject({
      findingId: 'recFinding',
    });
  });

  it('creates governance database findings through the neutral alias', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      createGovernanceFinding: vi.fn().mockResolvedValue({
        findingId: 'recFinding',
        title: 'Docs governance gap',
      }),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('governance_database_create_finding')?.({
      title: 'Docs governance gap',
      category: 'Docs & Tracking Hub Governance',
      summary: 'Distribution terminology needs canonical tracking.',
      decision_needed: true,
    });

    expect(client.createGovernanceFinding).toHaveBeenCalledWith({
      title: 'Docs governance gap',
      category: 'Docs & Tracking Hub Governance',
      summary: 'Distribution terminology needs canonical tracking.',
      decision_needed: true,
      reporter: 'Dify Governance Database',
      created_by_agent: 'webflow-governance-database',
    });
    expect(parsePayload(result!).data).toEqual({
      finding: {
        findingId: 'recFinding',
        title: 'Docs governance gap',
      },
    });
  });

  it('request_changes mutates explicit version fields without assignment ownership', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({ versionId: 'recVersion', assetId: 'recAsset' }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Example App' }),
      requireAssignedVersion: vi.fn(),
      updateVersionReview: vi.fn().mockResolvedValue({ versionId: 'recVersion', reviewStatus: '📤Changes Requested' }),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_request_changes')?.({
      version_id: 'recVersion',
      review_feedback: 'Please address the install flow issues.',
    });

    expect(client.requireAssignedVersion).not.toHaveBeenCalled();
    expect(client.updateVersionReview).toHaveBeenCalledWith('recVersion', {
      review_status: '📤Changes Requested',
      rejection_reason: undefined,
      review_feedback: 'Please address the install flow issues.',
    });
    expect(parsePayload(result!).data?.updated_version).toMatchObject({
      versionId: 'recVersion',
      reviewStatus: '📤Changes Requested',
    });
  });

  it('rejects request_changes status overrides outside the changes-requested allowlist', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn(),
      updateVersionReview: vi.fn(),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_request_changes')?.({
      version_id: 'recVersion',
      review_feedback: 'feedback',
      review_status: '✅Approved',
    });

    const payload = parsePayload(result!);
    expect(payload.ok).toBe(false);
    expect(client.getVersionById).not.toHaveBeenCalled();
    expect(client.updateVersionReview).not.toHaveBeenCalled();
  });

  it('does not implicitly assign a reviewer in update_version_review', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({ versionId: 'recVersion', assetId: 'recAsset' }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Example App' }),
      updateVersionReview: vi.fn().mockResolvedValue({ versionId: 'recVersion', reviewFeedback: 'draft' }),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    await handlers.get('app_review_update_version_review')?.({
      version_id: 'recVersion',
      review_feedback: 'draft',
    });

    expect(client.updateVersionReview).toHaveBeenCalledWith('recVersion', {
      review_feedback: 'draft',
    });
  });

  it('rejects combined routed latest_review_status and asset metadata writes before any mutation runs', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Example App' }),
      listVersionsForAsset: vi.fn(),
      updateVersionReview: vi.fn(),
      updateAssetMetadata: vi.fn(),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_update_asset_metadata')?.({
      asset_id: 'recAsset',
      latest_review_status: '🏃🏾In Review',
      notes: 'new note',
    });

    const payload = parsePayload(result!);
    expect(payload.ok).toBe(false);
    expect(client.listVersionsForAsset).not.toHaveBeenCalled();
    expect(client.updateVersionReview).not.toHaveBeenCalled();
    expect(client.updateAssetMetadata).not.toHaveBeenCalled();
  });
});
