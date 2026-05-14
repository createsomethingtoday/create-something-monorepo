import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { RunHistoryRecord } from './run-history.js';
import {
  FLUE_RUN_HISTORY_RESOURCE_URIS,
  createRunHistoryLatestResource,
  createRunHistoryListResource,
  createRunHistoryStatusResource,
  readRunHistoryRecords,
  registerFlueRunHistoryResources,
  type McpResourceResult,
} from './mcp-resources.js';

function record(overrides: Partial<RunHistoryRecord> = {}): RunHistoryRecord {
  return {
    schemaVersion: 'flue.run_history.v1',
    resourceUri:
      overrides.resourceUri ??
      'flue://run-history/%40create-something%2Fflue-service-agent/test-run',
    runId: overrides.runId ?? 'test-run',
    issue: overrides.issue ?? 'CRE-330',
    packageName: '@create-something/flue-service-agent',
    checkedAt: overrides.checkedAt ?? '2026-05-14T15:30:00.000Z',
    status: overrides.status ?? 'ready',
    validationCommand:
      overrides.validationCommand ??
      'pnpm --dir packages/agents/flue-service-agent flue:history:cloudflare',
    workflow: {
      taskId: 'runtime-routing-pi-flue',
      clientName: 'ExampleCo',
      workflowName: 'delivery-evidence-summary',
      goldenTaskId: 'runtime-routing-pi-flue',
      ...overrides.workflow,
    },
    runtime: {
      channelGateway: 'pi_openclaw',
      serviceAgent: 'flue',
      deploymentTarget: 'cloudflare',
      ...overrides.runtime,
    },
    endpoints: {
      serviceDelivery: '/agents/service-delivery/:id',
      deliveryReadiness: '/agents/delivery-readiness/:id',
      mcpAccess: '/agents/mcp-access-review/:id',
      cloudflareReadiness: '/agents/cloudflare-readiness/:id',
      ...overrides.endpoints,
    },
    readiness: {
      serviceDeliveryDisposition: 'needs_operator_review',
      delivery: {
        readiness: 'ready',
        score: 1,
        checks: { pass: 7, review: 0, block: 0 },
      },
      mcpAccess: {
        readiness: 'ready',
        score: 1,
        checks: { pass: 9, review: 0, block: 0 },
      },
      cloudflare: {
        readiness: 'ready',
        score: 1,
        checks: { pass: 8, review: 0, block: 0 },
      },
      ...overrides.readiness,
    },
    observations: {
      webhookAgents: [
        'service-delivery',
        'delivery-readiness',
        'mcp-access-review',
        'cloudflare-readiness',
      ],
      allowedMcpServers: ['create-something', 'playbook', 'three-tier-framework'],
      requiredHubTools: ['hub_list_services', 'hub_execute_proxy_tool'],
      durableObjectBindings: [
        'CloudflareReadiness',
        'DeliveryReadiness',
        'McpAccessReview',
        'ServiceDelivery',
        'FLUE_REGISTRY',
      ],
      ...overrides.observations,
    },
    artifacts: overrides.artifacts ?? [
      {
        kind: 'node_manifest',
        path: 'packages/agents/flue-service-agent/dist/flue/manifest.json',
      },
    ],
    guardrails: {
      operatorReviewRequired: true,
      deployable: true,
      secretsLocation: 'Cloudflare secrets or Infisical',
      rollbackNote:
        'Disable the Flue Worker route or roll back to the previous Worker version; Pi/OpenClaw relay remains independent.',
      ...overrides.guardrails,
    },
  };
}

function writeJsonl(records: RunHistoryRecord[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'flue-mcp-resources-'));
  const path = join(dir, 'run-history.jsonl');
  writeFileSync(path, records.map((entry) => JSON.stringify(entry)).join('\n'), 'utf8');
  return path;
}

describe('Flue run-history MCP resources', () => {
  it('reads schema-valid JSONL records and handles missing history as empty', () => {
    expect(readRunHistoryRecords('/tmp/does-not-exist-flue-run-history.jsonl')).toEqual([]);

    const entries = [
      record({ runId: 'older', checkedAt: '2026-05-14T15:00:00.000Z' }),
      record({ runId: 'newer', checkedAt: '2026-05-14T16:00:00.000Z' }),
    ];
    const path = writeJsonl(entries);

    expect(readRunHistoryRecords(path).map((entry) => entry.runId)).toEqual(['older', 'newer']);
  });

  it('creates status, latest, and list resource payloads', () => {
    const records = [
      record({ runId: 'ready-run', checkedAt: '2026-05-14T16:00:00.000Z' }),
      record({
        runId: 'review-run',
        checkedAt: '2026-05-14T15:00:00.000Z',
        status: 'review_required',
        guardrails: { deployable: false },
      } as Partial<RunHistoryRecord>),
    ];

    const status = createRunHistoryStatusResource(records, { historyPath: 'history.jsonl' });
    const latest = createRunHistoryLatestResource(records);
    const list = createRunHistoryListResource(records, { listLimit: 1 });

    expect(status.recordCount).toBe(2);
    expect(status.statusCounts).toEqual({ ready: 1, review_required: 1, blocked: 0 });
    expect(status.deployableCount).toBe(1);
    expect(status.latest?.runId).toBe('ready-run');
    expect(latest.record?.runId).toBe('ready-run');
    expect(list.records).toHaveLength(1);
    expect(list.records[0]?.resourceUri).toContain('flue://run-history/');
  });

  it('registers read-only MCP resources using the repo server.resource pattern', async () => {
    const path = writeJsonl([record({ runId: 'registered-run' })]);
    const handlers = new Map<string, (uri: URL) => McpResourceResult | Promise<McpResourceResult>>();

    registerFlueRunHistoryResources(
      {
        resource(name, uri, metadata, handler) {
          expect(name).toMatch(/^flue-run-history-/);
          expect(metadata.mimeType).toBe('application/json');
          handlers.set(uri, handler);
        },
      },
      { historyPath: path },
    );

    expect([...handlers.keys()]).toEqual([
      FLUE_RUN_HISTORY_RESOURCE_URIS.status,
      FLUE_RUN_HISTORY_RESOURCE_URIS.latest,
      FLUE_RUN_HISTORY_RESOURCE_URIS.list,
    ]);

    const statusResult = await handlers.get(FLUE_RUN_HISTORY_RESOURCE_URIS.status)?.(
      new URL(FLUE_RUN_HISTORY_RESOURCE_URIS.status),
    );
    const status = JSON.parse(statusResult?.contents[0]?.text ?? '{}');

    expect(status.schemaVersion).toBe('flue.run_history_status.v1');
    expect(status.latest.runId).toBe('registered-run');
  });

  it('throws actionable errors for malformed JSONL records', () => {
    const path = writeJsonl([record()]);
    writeFileSync(path, `${JSON.stringify(record())}\n{"not":"a run history record"}`, 'utf8');

    expect(() => readRunHistoryRecords(path)).toThrow(/Invalid Flue run-history JSONL/);
    expect(() => readRunHistoryRecords(path)).toThrow(/:2:/);
  });
});
