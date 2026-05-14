import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerLocalFlueRunHistoryResources } from '../dist/local-flue-run-history.js';

const record = {
  schemaVersion: 'flue.run_history.v1',
  resourceUri: 'flue://run-history/%40create-something%2Fflue-service-agent/smoke-run',
  runId: 'smoke-run',
  issue: 'CRE-333',
  packageName: '@create-something/flue-service-agent',
  checkedAt: '2026-05-14T16:00:00.000Z',
  status: 'ready',
  validationCommand: 'pnpm --dir packages/agents/flue-service-agent flue:history:cloudflare',
  workflow: {
    taskId: 'runtime-routing-pi-flue',
    clientName: 'ExampleCo',
    workflowName: 'delivery-evidence-summary',
    goldenTaskId: 'runtime-routing-pi-flue',
  },
  runtime: {
    channelGateway: 'pi_openclaw',
    serviceAgent: 'flue',
    deploymentTarget: 'cloudflare',
  },
  endpoints: {
    serviceDelivery: '/agents/service-delivery/:id',
    deliveryReadiness: '/agents/delivery-readiness/:id',
    mcpAccess: '/agents/mcp-access-review/:id',
    cloudflareReadiness: '/agents/cloudflare-readiness/:id',
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
  },
  artifacts: [
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
  },
};

const dir = mkdtempSync(join(tmpdir(), 'create-something-flue-resources-'));
const historyPath = join(dir, 'run-history.jsonl');
writeFileSync(historyPath, `${JSON.stringify(record)}\n`, 'utf8');

const handlers = new Map();
registerLocalFlueRunHistoryResources(
  {
    resource(name, uri, metadata, handler) {
      if (!name.startsWith('flue-run-history-')) {
        throw new Error(`Unexpected Flue resource name: ${name}`);
      }
      if (metadata.mimeType !== 'application/json') {
        throw new Error(`Unexpected MIME type for ${name}: ${metadata.mimeType}`);
      }
      handlers.set(uri, handler);
    },
  },
  historyPath,
);

for (const uri of [
  'flue://run-history/status',
  'flue://run-history/latest',
  'flue://run-history/list',
]) {
  const handler = handlers.get(uri);
  if (!handler) throw new Error(`Missing MCP resource handler for ${uri}`);

  const result = await handler(new URL(uri));
  const text = result?.contents?.[0]?.text;
  const payload = JSON.parse(text ?? '{}');

  if (!payload.schemaVersion?.startsWith('flue.run_history_')) {
    throw new Error(`Unexpected schema for ${uri}: ${payload.schemaVersion}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  resources: [...handlers.keys()],
  historyPath,
}, null, 2));
