import { describe, expect, it } from 'vitest';
import {
  assertLinearEvidenceIsSafe,
  createLinearEvidenceMarkdown,
} from './linear-evidence.js';
import type { SmokeEvidence } from './smoke.js';

const readyEvidence = {
  ok: true,
  packageName: '@create-something/flue-service-agent',
  checkedAt: '2026-05-14T14:00:00.000Z',
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
    disposition: 'needs_operator_review',
    evidence: {
      runtimeChoice: {
        channelGateway: 'pi_openclaw',
        endpointPattern: '/agents/service-delivery/:id',
      },
    },
  },
  deliveryReadiness: {
    readiness: 'ready',
    score: 1,
    checks: [{ id: 'agent-contract-loaded', result: 'pass', notes: 'Loaded contract.' }],
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
    allowedServers: ['create-something', 'playbook'],
    requiredHubTools: ['hub_list_services', 'hub_execute_proxy_tool'],
    evidence: {
      endpointPattern: '/agents/mcp-access-review/:id',
    },
  },
  cloudflareReadiness: {
    readiness: 'ready',
    score: 1,
    checks: [{ id: 'durable-object-bindings-present', result: 'pass', notes: 'Present.' }],
    evidence: {
      endpointPattern: '/agents/cloudflare-readiness/:id',
      target: 'cloudflare',
      workerName: 'flue-service-agent',
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

describe('Linear evidence formatter', () => {
  it('creates a compact Linear-ready promotion report from smoke evidence', () => {
    const markdown = createLinearEvidenceMarkdown(readyEvidence, {
      issue: 'CRE-326',
    });

    expect(markdown).toContain('Linear issue: CRE-326');
    expect(markdown).toContain('@create-something/flue-service-agent');
    expect(markdown).toContain('/agents/service-delivery/:id');
    expect(markdown).toContain('/agents/cloudflare-readiness/:id');
    expect(markdown).toContain('Brokered MCP access: ready (1; 1 pass, 0 review, 0 block)');
    expect(markdown).toContain('Durable Object bindings: CloudflareReadiness');
    expect(markdown).toContain('Pi/OpenClaw relay remains independent');
    expect(markdown).toContain('flue:evidence:cloudflare');
  });

  it('marks evidence as non-deployable when Cloudflare readiness is omitted', () => {
    const markdown = createLinearEvidenceMarkdown({
      ...readyEvidence,
      cloudflareReadiness: null,
    } as unknown as SmokeEvidence);

    expect(markdown).toContain('Cloudflare readiness: not included');
    expect(markdown).toContain('Do not deploy from this evidence alone');
  });

  it('rejects likely credential values before writing Linear evidence', () => {
    expect(() => assertLinearEvidenceIsSafe('token=sk-test-super-secret-value')).toThrow(
      /possible OpenAI-style API key/,
    );
    expect(() => assertLinearEvidenceIsSafe('Authorization: Bearer secret-token-value')).toThrow(
      /possible bearer token/,
    );
  });
});
