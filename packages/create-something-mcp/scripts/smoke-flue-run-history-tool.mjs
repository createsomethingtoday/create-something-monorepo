import { registerFlueRunHistoryTools } from '../dist/flue-run-history-tools.js';

function createRecord(overrides = {}) {
  return {
    schemaVersion: 'flue.run_history.v1',
    resourceUri: 'flue://run-history/%40create-something%2Fflue-service-agent/tool-smoke-run',
    runId: 'tool-smoke-run',
    issue: 'CRE-357',
    packageName: '@create-something/flue-service-agent',
    checkedAt: '2026-05-14T21:45:00.000Z',
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
      webhookAgents: ['service-delivery', 'delivery-readiness', 'mcp-access-review', 'cloudflare-readiness'],
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
        kind: 'cloudflare_manifest',
        path: 'packages/agents/flue-service-agent/dist/flue-cloudflare/manifest.json',
      },
    ],
    guardrails: {
      operatorReviewRequired: true,
      deployable: true,
      secretsLocation: 'Cloudflare secrets or Infisical',
      rollbackNote:
        'Disable the Flue Worker route or roll back to the previous Worker version; Pi/OpenClaw relay remains independent.',
    },
    governance: {
      tier: 'automation',
      evidence: [
        { kind: 'linear_issue', path: 'CRE-357' },
        {
          kind: 'cloudflare_manifest',
          path: 'packages/agents/flue-service-agent/dist/flue-cloudflare/manifest.json',
        },
      ],
      validation: {
        command: 'pnpm --dir packages/agents/flue-service-agent flue:history:cloudflare',
        status: 'passed',
        checkedAt: '2026-05-14T21:45:00.000Z',
      },
      rollback:
        'Disable the Flue Worker route or roll back to the previous Worker version; Pi/OpenClaw relay remains independent.',
    },
    ...overrides,
  };
}

function fakeD1() {
  const calls = [];

  return {
    calls,
    db: {
      prepare(query) {
        return {
          values: [],
          bind(...values) {
            this.values = values;
            return this;
          },
          async run() {
            calls.push({ query, values: this.values });
            return { success: true };
          },
        };
      },
    },
  };
}

const { db, calls } = fakeD1();
const tools = new Map();

registerFlueRunHistoryTools(
  {
    registerTool(name, config, handler) {
      tools.set(name, { config, handler });
    },
  },
  { db, storageLabel: 'd1://test/flue_run_history' },
);

const tool = tools.get('record_flue_run');
if (!tool) throw new Error('record_flue_run tool was not registered');
if (tool.config.annotations?.idempotentHint !== true) {
  throw new Error('record_flue_run must be annotated as idempotent');
}

const dryRun = await tool.handler({
  recordJson: JSON.stringify(createRecord()),
  operatorIntent: 'record_flue_run',
  dryRun: true,
});

if (dryRun.structuredContent?.action !== 'validated') {
  throw new Error(`Expected dry-run validation action; got ${dryRun.structuredContent?.action}`);
}
if (calls.length !== 0) {
  throw new Error(`Dry-run should not call D1; got ${calls.length} calls`);
}

const write = await tool.handler({
  recordJson: JSON.stringify(createRecord()),
  operatorIntent: 'record_flue_run',
  dryRun: false,
});

if (write.structuredContent?.action !== 'upserted') {
  throw new Error(`Expected upsert action; got ${write.structuredContent?.action}`);
}
if (calls.length !== 1) {
  throw new Error(`Expected one D1 call; got ${calls.length}`);
}

const recordJson = String(calls[0]?.values?.[8] ?? '{}');
if (JSON.parse(recordJson).governance?.tier !== 'automation') {
  throw new Error('Expected D1 record_json to preserve governance metadata');
}

try {
  await tool.handler({
    recordJson: JSON.stringify(createRecord({ issue: 'not-linear' })),
    operatorIntent: 'record_flue_run',
    dryRun: true,
  });
  throw new Error('Expected invalid issue to be rejected');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/Expected a Linear issue ID/.test(message)) throw error;
}

console.log(JSON.stringify({
  ok: true,
  tool: 'record_flue_run',
  dryRunAction: dryRun.structuredContent.action,
  writeAction: write.structuredContent.action,
  d1Calls: calls.length,
}, null, 2));
