import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import runtimeFixture from '../fixtures/runtime-routing-pi-flue.json';
import {
  DELIVERY_READINESS_RUNTIME,
  createDeliveryReadinessPrompt,
  createDeliveryReadinessReport,
  parseDeliveryReadinessPayload,
  validateDeliveryReadinessReport,
} from './readiness.js';

function repoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), '../../..', path), 'utf8');
}

describe('delivery readiness adapter', () => {
  it('blocks when contract bundle text is missing', () => {
    const input = parseDeliveryReadinessPayload({
      taskId: 'readiness-1',
      clientName: 'ExampleCo',
      workflowName: 'delivery-evidence-summary',
      contractBundle: {
        agentContractPath: 'templates/agent_contract.yaml',
        goldenTasksPath: 'templates/golden_tasks.yaml',
        goldenTaskId: 'runtime-routing-pi-flue',
      },
    });

    const report = createDeliveryReadinessReport(input);

    expect(report.readiness).toBe('blocked');
    expect(report.missingEvidence).toContain('templates/agent_contract.yaml');
    expect(report.missingEvidence).toContain('templates/golden_tasks.yaml');
  });

  it('returns ready when contract, golden task, and fixture evidence align', () => {
    const input = parseDeliveryReadinessPayload({
      taskId: 'delivery-readiness-runtime-routing',
      clientName: 'ExampleCo',
      workflowName: 'delivery-evidence-summary',
      contractBundle: {
        agentContractPath: 'templates/agent_contract.yaml',
        goldenTasksPath: 'templates/golden_tasks.yaml',
        goldenTaskId: 'runtime-routing-pi-flue',
        agentContractText: repoFile('templates/agent_contract.yaml'),
        goldenTasksText: repoFile('templates/golden_tasks.yaml'),
      },
      goldenTaskPayload: runtimeFixture,
    });

    const report = validateDeliveryReadinessReport(createDeliveryReadinessReport(input));

    expect(report.readiness).toBe('ready');
    expect(report.score).toBe(1);
    expect(report.evidence.endpointPattern).toBe(DELIVERY_READINESS_RUNTIME.endpointPattern);
    expect(report.evidence.serviceAgentEndpoint).toBe('/agents/service-delivery/:id');
    expect(report.checks.every((check) => check.result === 'pass')).toBe(true);
  });

  it('marks mismatched runtime fixture evidence for review', () => {
    const input = parseDeliveryReadinessPayload({
      taskId: 'delivery-readiness-runtime-routing',
      clientName: 'ExampleCo',
      workflowName: 'delivery-evidence-summary',
      contractBundle: {
        agentContractPath: 'templates/agent_contract.yaml',
        goldenTasksPath: 'templates/golden_tasks.yaml',
        goldenTaskId: 'runtime-routing-pi-flue',
        agentContractText: repoFile('templates/agent_contract.yaml'),
        goldenTasksText: repoFile('templates/golden_tasks.yaml'),
      },
      goldenTaskPayload: {
        ...runtimeFixture,
        expectedRuntime: 'codex_harness',
      },
    });

    const report = createDeliveryReadinessReport(input);

    expect(report.readiness).toBe('review_required');
    expect(report.checks).toContainEqual({
      id: 'fixture-runtime-aligned',
      result: 'review',
      notes: 'Golden task fixture should expect the Flue service-agent runtime.',
    });
  });

  it('creates a schema-oriented prompt with no raw credential values', () => {
    const input = parseDeliveryReadinessPayload({
      taskId: 'delivery-readiness-runtime-routing',
      clientName: 'ExampleCo',
      workflowName: 'delivery-evidence-summary',
      contractBundle: {
        agentContractPath: 'templates/agent_contract.yaml',
        goldenTasksPath: 'templates/golden_tasks.yaml',
        goldenTaskId: 'runtime-routing-pi-flue',
        agentContractText: repoFile('templates/agent_contract.yaml'),
        goldenTasksText: repoFile('templates/golden_tasks.yaml'),
      },
      goldenTaskPayload: runtimeFixture,
    });

    const prompt = createDeliveryReadinessPrompt(input);

    expect(prompt).toContain('Baseline readiness report');
    expect(prompt).toContain('/agents/delivery-readiness/:id');
    expect(prompt).toContain('/agents/service-delivery/:id');
    expect(prompt).not.toContain('sk-test');
    expect(prompt).not.toContain('gateway-secret');
  });
});
