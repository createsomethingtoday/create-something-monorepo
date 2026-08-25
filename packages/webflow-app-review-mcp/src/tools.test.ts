import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';

import { AirtableClientError, type AirtableClient } from './airtable.js';
import { registerTools } from './tools.js';
import type { ZendeskClient } from './zendesk.js';

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

    expect(names.slice(0, 7)).toEqual([
      'app_review_health',
      'app_review_list_queue',
      'app_review_queue_stats',
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

  it('aggregates submission counts through app_review_queue_stats', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getQueueStats: vi.fn().mockResolvedValue({
        total: 5,
        countMode: 'submissions',
        groupBy: ['review_type'],
        window: { submittedAfter: '2026-05-20T00:00:00.000Z', submittedBefore: null },
        groups: [
          { key: 'New Asset', count: 3 },
          { key: 'Meta Update', count: 2 },
        ],
        outOfScopeVersionsExcluded: 1,
      }),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_queue_stats')?.({
      group_by: ['review_type'],
      submitted_after: '2026-05-20',
    });

    expect(client.getQueueStats).toHaveBeenCalledWith({
      groupBy: ['review_type'],
      submittedAfter: '2026-05-20',
      submittedBefore: undefined,
      status: undefined,
      countMode: undefined,
    });
    const payload = parsePayload(result!);
    expect(payload.ok).toBe(true);
    expect(payload.data?.total).toBe(5);
    expect(payload.data?.groups).toEqual([
      { key: 'New Asset', count: 3 },
      { key: 'Meta Update', count: 2 },
    ]);
    expect(payload.data?.out_of_scope_versions_excluded).toBe(1);
  });

  it('surfaces stats input validation errors through the standard error envelope', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getQueueStats: vi.fn().mockRejectedValue(
        new AirtableClientError('INVALID_INPUT', 'submitted_after must be an ISO date.', 400),
      ),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_queue_stats')?.({ submitted_after: 'not-a-date' });
    const payload = JSON.parse(result?.content[0]?.text ?? '{}') as {
      ok: boolean;
      error?: { code: string; status: number };
    };
    expect(payload.ok).toBe(false);
    expect(payload.error?.code).toBe('INVALID_INPUT');
    expect(payload.error?.status).toBe(400);
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

  it('blocks approve_version while ⚖️Exceptions items on the version are undecided', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({
        versionId: 'recVersion',
        assetId: 'recAsset',
        undecidedExceptionItems: 2,
      }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Example App' }),
      updateVersionReview: vi.fn(),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_approve_version')?.({ version_id: 'recVersion' });

    const payload = JSON.parse(result!.content[0]?.text ?? '{}') as { ok: boolean; error?: { code: string; status: number } };
    expect(payload.ok).toBe(false);
    expect(payload.error?.code).toBe('APPROVAL_BLOCKED_UNDECIDED_EXCEPTIONS');
    expect(payload.error?.status).toBe(409);
    expect(client.updateVersionReview).not.toHaveBeenCalled();
  });

  it('blocks approve_version while a prior version carries an undecided exception (asset-level)', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({
        versionId: 'recVersion',
        assetId: 'recAsset',
        assetUndecidedExceptions: 1,
      }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Example App' }),
      updateVersionReview: vi.fn(),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_approve_version')?.({ version_id: 'recVersion' });

    const payload = JSON.parse(result!.content[0]?.text ?? '{}') as { ok: boolean; error?: { code: string } };
    expect(payload.ok).toBe(false);
    expect(payload.error?.code).toBe('APPROVAL_BLOCKED_UNDECIDED_EXCEPTIONS');
    expect(client.updateVersionReview).not.toHaveBeenCalled();
  });

  it('blocks approve_version while the version-level ⚖️Exception Status is undecided', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({
        versionId: 'recVersion',
        assetId: 'recAsset',
        exceptionStatus: '🆕Requested',
      }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Example App' }),
      updateVersionReview: vi.fn(),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_approve_version')?.({ version_id: 'recVersion' });

    const payload = JSON.parse(result!.content[0]?.text ?? '{}') as { ok: boolean; error?: { code: string } };
    expect(payload.ok).toBe(false);
    expect(payload.error?.code).toBe('APPROVAL_BLOCKED_UNDECIDED_EXCEPTIONS');
    expect(client.updateVersionReview).not.toHaveBeenCalled();
  });

  it('approves when exception rollups are empty (no ⚖️Exceptions rows anywhere)', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({
        versionId: 'recVersion',
        assetId: 'recAsset',
        exceptionStatus: '✅Approved',
      }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Example App' }),
      updateVersionReview: vi.fn().mockResolvedValue({ versionId: 'recVersion', reviewStatus: '✅Approved' }),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_approve_version')?.({ version_id: 'recVersion' });

    expect(parsePayload(result!).ok).toBe(true);
    expect(client.updateVersionReview).toHaveBeenCalledWith('recVersion', {
      review_status: '✅Approved',
      review_type: undefined,
      review_feedback: undefined,
    });
  });

  it('blocks update_version_review approved statuses while exceptions are undecided', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({
        versionId: 'recVersion',
        assetId: 'recAsset',
        assetUndecidedExceptions: 3,
      }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Example App' }),
      updateVersionReview: vi.fn(),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_update_version_review')?.({
      version_id: 'recVersion',
      review_status: '✅Approved (No Notification)',
    });

    const payload = JSON.parse(result!.content[0]?.text ?? '{}') as { ok: boolean; error?: { code: string } };
    expect(payload.ok).toBe(false);
    expect(payload.error?.code).toBe('APPROVAL_BLOCKED_UNDECIDED_EXCEPTIONS');
    expect(client.updateVersionReview).not.toHaveBeenCalled();
  });

  it('blocks update_version_review exception_status ❌Denied while items are undecided', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({
        versionId: 'recVersion',
        assetId: 'recAsset',
        undecidedExceptionItems: 1,
      }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Example App' }),
      updateVersionReview: vi.fn(),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_update_version_review')?.({
      version_id: 'recVersion',
      exception_status: '❌Denied',
    });

    const payload = JSON.parse(result!.content[0]?.text ?? '{}') as { ok: boolean; error?: { code: string } };
    expect(payload.ok).toBe(false);
    expect(payload.error?.code).toBe('DENIAL_BLOCKED_UNDECIDED_ITEMS');
    expect(client.updateVersionReview).not.toHaveBeenCalled();
  });

  it('allows update_version_review ❌Denied once every item is decided', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({
        versionId: 'recVersion',
        assetId: 'recAsset',
        undecidedExceptionItems: 0,
      }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Example App' }),
      updateVersionReview: vi.fn().mockResolvedValue({ versionId: 'recVersion', exceptionStatus: '❌Denied' }),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_update_version_review')?.({
      version_id: 'recVersion',
      exception_status: '❌Denied',
    });

    expect(parsePayload(result!).ok).toBe(true);
    expect(client.updateVersionReview).toHaveBeenCalledWith('recVersion', {
      exception_status: '❌Denied',
    });
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

  it('send_ticket_followup posts an escaped public comment on the linked Zendesk ticket', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({
        versionId: 'recVersion',
        assetId: 'recAsset',
        zendeskTicketId: '1170775',
        zendeskSubject: 'Your Webflow Marketplace App submission',
      }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Wistia' }),
    } as unknown as AirtableClient;
    const addTicketComment = vi
      .fn()
      .mockResolvedValue({ ticketId: '1170775', isPublic: true, auditId: 7, ticketStatus: 'open' });
    const zendesk = { addTicketComment } as unknown as ZendeskClient;

    registerTools(server, () => client, () => null, () => zendesk);

    const result = await handlers.get('app_review_send_ticket_followup')?.({
      version_id: 'recVersion',
      message: 'Hi Wistia,\n\nThe `<script>` item was cut off — full text below.\n\nCheers',
      visibility: 'public',
    });

    const payload = parsePayload(result!);
    expect(payload.ok).toBe(true);
    expect(payload.data).toMatchObject({ ticket_id: '1170775', visibility: 'public', audit_id: 7 });
    const htmlBody = addTicketComment.mock.calls[0]?.[1]?.htmlBody as string;
    expect(htmlBody).toContain('<code>&lt;script&gt;</code>');
    expect(htmlBody).not.toMatch(/<script/);
    expect(addTicketComment).toHaveBeenCalledWith('1170775', expect.objectContaining({ isPublic: true }));
  });

  it('send_ticket_followup fails closed when Zendesk is unconfigured or the ticket link is missing', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({
        versionId: 'recVersion',
        assetId: 'recAsset',
      }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Wistia' }),
    } as unknown as AirtableClient;
    const addTicketComment = vi.fn();
    const zendesk = { addTicketComment } as unknown as ZendeskClient;

    registerTools(server, () => client, () => null, () => zendesk);
    const noTicket = await handlers.get('app_review_send_ticket_followup')?.({
      version_id: 'recVersion',
      message: 'Hello',
      visibility: 'public',
    });
    expect(parsePayload(noTicket!)).toMatchObject({ ok: false });
    expect(addTicketComment).not.toHaveBeenCalled();

    const { server: server2, handlers: handlers2 } = createServerHarness();
    registerTools(server2, () => client);
    const unconfigured = await handlers2.get('app_review_send_ticket_followup')?.({
      version_id: 'recVersion',
      message: 'Hello',
      visibility: 'public',
    });
    expect(parsePayload(unconfigured!)).toMatchObject({ ok: false });
  });

  it('lists asset-level exception history across versions with a copy block', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'North Embedded Checkout' }),
      listVersionsForAsset: vi.fn().mockResolvedValue([
        { versionId: 'recV2', versionNumber: 2, exceptionItemIds: ['recItemB'], assetExceptionHistoryIds: ['recItemA', 'recItemB'] },
        { versionId: 'recV1', versionNumber: 1, exceptionItemIds: ['recItemA'], assetExceptionHistoryIds: ['recItemA', 'recItemB'] },
      ]),
      listExceptionItemsByIds: vi.fn().mockResolvedValue([
        {
          exceptionItemId: 'recItemA',
          item: 'Iframe player injection',
          assetVersionId: 'recV1',
          exceptionStatus: '\u2705Approved',
          exceptionType: 'Security',
          decisionNotes: 'Partner-led consideration',
          decisionBy: { id: 'usr1', name: 'Greg Kelly' },
          decisionDatetime: '2026-08-06T19:15:00.000Z',
        },
        {
          exceptionItemId: 'recItemB',
          item: 'Token in URL',
          assetVersionId: 'recV2',
          exceptionStatus: '\ud83c\udd95Requested',
          exceptionType: 'Security',
          requestedDatetime: '2026-08-20T12:00:00.000Z',
        },
      ]),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_list_asset_exceptions')?.({ asset_id: 'recAsset' });
    const payload = parsePayload(result!);

    expect(payload.ok).toBe(true);
    const data = payload.data as {
      app_name: string;
      counts_all_statuses: Record<string, number>;
      exception_items: Array<{ exceptionItemId: string }>;
      copy_block: string;
    };
    expect(data.app_name).toBe('North Embedded Checkout');
    expect(data.exception_items).toHaveLength(2);
    // Deduped union of per-version links + asset history lookup
    const requestedIds = (client.listExceptionItemsByIds as ReturnType<typeof vi.fn>).mock.calls[0][0] as string[];
    expect(new Set(requestedIds)).toEqual(new Set(['recItemA', 'recItemB']));
    expect(data.counts_all_statuses['\u2705Approved']).toBe(1);
    expect(data.copy_block).toContain('North Embedded Checkout');
    expect(data.copy_block).toContain('Iframe player injection');
    expect(data.copy_block).toContain('v1');
    expect(data.copy_block).toContain('Greg Kelly');
    expect(data.copy_block).toContain('Partner-led consideration');
  });

  it('filters asset exception history to one status and resolves version_id to its asset', async () => {
    const { server, handlers } = createServerHarness();
    const client = {
      getVersionById: vi.fn().mockResolvedValue({ versionId: 'recV2', assetId: 'recAsset' }),
      getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'North Embedded Checkout' }),
      listVersionsForAsset: vi.fn().mockResolvedValue([
        { versionId: 'recV1', versionNumber: 1, exceptionItemIds: ['recItemA', 'recItemB'] },
      ]),
      listExceptionItemsByIds: vi.fn().mockResolvedValue([
        { exceptionItemId: 'recItemA', item: 'Approved thing', assetVersionId: 'recV1', exceptionStatus: '\u2705Approved' },
        { exceptionItemId: 'recItemB', item: 'Denied thing', assetVersionId: 'recV1', exceptionStatus: '\u274cDenied' },
      ]),
    } as unknown as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_list_asset_exceptions')?.({
      version_id: 'recV2',
      status: '\u2705Approved',
    });
    const payload = parsePayload(result!);

    expect(payload.ok).toBe(true);
    const data = payload.data as {
      status_filter: string;
      counts_all_statuses: Record<string, number>;
      exception_items: Array<{ item: string }>;
      copy_block: string;
    };
    expect(client.getVersionById).toHaveBeenCalledWith('recV2');
    expect(data.status_filter).toBe('\u2705Approved');
    expect(data.exception_items).toHaveLength(1);
    expect(data.exception_items[0]?.item).toBe('Approved thing');
    // Counts still reflect the full history so the filter is transparent
    expect(data.counts_all_statuses['\u274cDenied']).toBe(1);
    expect(data.copy_block).not.toContain('Denied thing');
  });

  it('rejects list_asset_exceptions without asset_id or version_id', async () => {
    const { server, handlers } = createServerHarness();
    const client = {} as AirtableClient;

    registerTools(server, () => client);

    const result = await handlers.get('app_review_list_asset_exceptions')?.({});
    const payload = JSON.parse(result!.content[0]?.text ?? '{}') as { ok: boolean; error?: { code: string } };
    expect(payload.ok).toBe(false);
    expect(payload.error?.code).toBe('INVALID_INPUT');
  });

});
