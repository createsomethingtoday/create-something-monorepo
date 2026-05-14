import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SmokeEvidence } from './smoke.js';
import {
  appendRunHistoryRecord,
  assertRunHistoryRecordIsSafe,
  createRunHistoryRecord,
  runHistoryRecordSchema,
} from './run-history.js';
import * as v from 'valibot';

const readyEvidence = {
  ok: true,
  packageName: '@create-something/flue-service-agent',
  checkedAt: '2026-05-14T15:00:00.000Z',
  flueManifest: {
    path: 'packages/agents/flue-service-agent/dist/flue/manifest.json',
    webhookAgents: [
      'service-delivery',
      'delivery-readiness',
      'mcp-access-review',
      'cloudflare-readiness',
    ],
  },
  serviceDelivery: {
    taskId: 'runtime-routing-pi-flue',
    clientName: 'ExampleCo',
    workflowName: 'delivery-evidence-summary',
    disposition: 'needs_operator_review',
    evidence: {
      runtimeChoice: {
        channelGateway: 'pi_openclaw',
        serviceAgentRuntime: 'flue',
        endpointPattern: '/agents/service-delivery/:id',
      },
    },
  },
  deliveryReadiness: {
    readiness: 'ready',
    score: 1,
    checks: [
      { id: 'agent-contract-loaded', result: 'pass', notes: 'Loaded contract.' },
      { id: 'fixture-runtime-aligned', result: 'pass', notes: 'Aligned.' },
    ],
    evidence: {
      endpointPattern: '/agents/delivery-readiness/:id',
      contractRefs: {
        agentContract: 'templates/agent_contract.yaml',
        goldenTasks: 'templates/golden_tasks.yaml',
        goldenTaskId: 'runtime-routing-pi-flue',
      },
    },
  },
  mcpAccess: {
    readiness: 'ready',
    score: 1,
    checks: [{ id: 'brokered-discovery-mode', result: 'pass', notes: 'Brokered.' }],
    allowedServers: ['create-something', 'playbook', 'three-tier-framework'],
    requiredHubTools: ['hub_list_services', 'hub_execute_proxy_tool'],
    evidence: {
      endpointPattern: '/agents/mcp-access-review/:id',
    },
  },
  cloudflareReadiness: {
    readiness: 'ready',
    score: 1,
    checks: [{ id: 'durable-object-bindings-present', result: 'pass', notes: 'Present.' }],
    generatedArtifacts: {
      manifestPath: 'packages/agents/flue-service-agent/dist/flue-cloudflare/manifest.json',
      wranglerConfigPath: 'packages/agents/flue-service-agent/dist/flue-cloudflare/wrangler.jsonc',
      entryPath: 'packages/agents/flue-service-agent/dist/flue-cloudflare/_entry.ts',
    },
    evidence: {
      endpointPattern: '/agents/cloudflare-readiness/:id',
      durableObjectBindings: [
        'CloudflareReadiness',
        'DeliveryReadiness',
        'McpAccessReview',
        'ServiceDelivery',
        'FLUE_REGISTRY',
      ],
      deploymentPolicy: {
        allowedSecretsLocation: 'Cloudflare secrets or Infisical',
        rollbackNote: 'Disable the Flue Worker route; Pi/OpenClaw relay remains independent.',
      },
    },
  },
} as unknown as SmokeEvidence;

describe('Flue run-history resource', () => {
  it('creates a schema-valid run-history record from smoke evidence', () => {
    const record = createRunHistoryRecord(readyEvidence, {
      issue: 'CRE-328',
      runId: 'test-run',
    });

    expect(v.parse(runHistoryRecordSchema, record)).toEqual(record);
    expect(record.schemaVersion).toBe('flue.run_history.v1');
    expect(record.resourceUri).toBe(
      'flue://run-history/%40create-something%2Fflue-service-agent/test-run',
    );
    expect(record.issue).toBe('CRE-328');
    expect(record.status).toBe('ready');
    expect(record.runtime).toEqual({
      channelGateway: 'pi_openclaw',
      serviceAgent: 'flue',
      deploymentTarget: 'cloudflare',
    });
    expect(record.readiness.delivery.checks).toEqual({ pass: 2, review: 0, block: 0 });
    expect(record.guardrails.deployable).toBe(true);
  });

  it('keeps node-only history in review until Cloudflare readiness is attached', () => {
    const record = createRunHistoryRecord({
      ...readyEvidence,
      cloudflareReadiness: null,
    } as unknown as SmokeEvidence);

    expect(record.status).toBe('review_required');
    expect(record.runtime.deploymentTarget).toBe('node');
    expect(record.guardrails.deployable).toBe(false);
  });

  it('appends newline-delimited records for local run history', () => {
    const dir = mkdtempSync(join(tmpdir(), 'flue-run-history-'));
    const path = join(dir, 'run-history.jsonl');
    const record = createRunHistoryRecord(readyEvidence, { runId: 'test-run' });

    appendRunHistoryRecord(record, path);
    appendRunHistoryRecord(record, path);

    const lines = readFileSync(path, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0] ?? '{}')).toEqual(record);
  });

  it('rejects likely credential values in structured records', () => {
    const record = createRunHistoryRecord(readyEvidence, { runId: 'test-run' });

    expect(() =>
      assertRunHistoryRecordIsSafe({
        ...record,
        guardrails: {
          ...record.guardrails,
          secretsLocation: 'token=sk-test-super-secret-value',
        },
      }),
    ).toThrow(/possible OpenAI-style API key/);
  });
});
