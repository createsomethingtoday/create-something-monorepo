import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/runtime-routing-pi-flue.json';
import {
  DEFAULT_CONTRACT_REFS,
  FLUE_SERVICE_AGENT_RUNTIME,
  createPilotResult,
  createServiceDeliveryPrompt,
  parseDeliveryTaskPayload,
  validateServiceDeliveryResult,
} from './contract.js';

describe('Flue service-agent contract adapter', () => {
  it('normalizes payload defaults to the Flue pilot contract', () => {
    const input = parseDeliveryTaskPayload({
      taskId: 'task-1',
      clientName: 'ExampleCo',
      workflowName: 'intake-triage',
      request: 'Triage this intake.',
    });

    expect(input.source).toBe('webhook');
    expect(input.risk).toBe('medium');
    expect(input.expectedRuntime).toBe('flue');
    expect(input.requiresOperatorReview).toBe(true);
    expect(input.contractRefs).toEqual(DEFAULT_CONTRACT_REFS);
  });

  it('creates schema-valid runtime evidence for the golden Pi/Flue routing task', () => {
    const input = parseDeliveryTaskPayload(fixture);
    const result = validateServiceDeliveryResult(createPilotResult(input));

    expect(result.taskId).toBe('runtime-routing-pi-flue');
    expect(result.runtime).toBe('flue');
    expect(result.route).toBe('service_agent');
    expect(result.disposition).toBe('needs_operator_review');
    expect(result.evidence.runtimeChoice).toEqual({
      primaryRuntime: 'flue',
      channelGateway: 'pi_openclaw',
      serviceAgentRuntime: 'flue',
      endpointPattern: '/agents/service-delivery/:id',
      reason: expect.stringContaining('repeatable typed service task'),
    });
    expect(result.evidence.contractRefs).toEqual({
      agentContract: 'templates/agent_contract.yaml',
      goldenTasks: 'templates/golden_tasks.yaml',
      goldenTaskId: 'runtime-routing-pi-flue',
    });
  });

  it('keeps channel-originated work routed through Pi/OpenClaw before Flue follow-up', () => {
    const input = parseDeliveryTaskPayload({
      ...fixture,
      source: 'channel',
    });
    const result = createPilotResult(input);

    expect(result.evidence.runtimeChoice.channelGateway).toBe('pi_openclaw');
    expect(result.evidence.runtimeChoice.reason).toContain('operator-visible gateway');
  });

  it('builds a prompt with contract evidence and no leaked credential values', () => {
    const input = parseDeliveryTaskPayload(fixture);
    const prompt = createServiceDeliveryPrompt(input);

    expect(prompt).toContain('templates/agent_contract.yaml');
    expect(prompt).toContain('templates/golden_tasks.yaml');
    expect(prompt).toContain(FLUE_SERVICE_AGENT_RUNTIME.endpointPattern);
    expect(prompt).not.toContain('sk-test');
    expect(prompt).not.toContain('gateway-secret');
  });
});
