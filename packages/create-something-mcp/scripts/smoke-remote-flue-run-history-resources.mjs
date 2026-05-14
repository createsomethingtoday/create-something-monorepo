import {
  readRemoteFlueRunHistoryRecords,
  registerRemoteFlueRunHistoryResources,
} from '../dist/remote-flue-run-history.js';

const record = {
  schemaVersion: 'flue.run_history.v1',
  resourceUri: 'flue://run-history/%40create-something%2Fflue-service-agent/remote-smoke-run',
  runId: 'remote-smoke-run',
  issue: 'CRE-340',
  packageName: '@create-something/flue-service-agent',
  checkedAt: '2026-05-14T17:30:00.000Z',
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
};

function fakeD1(rows, options = {}) {
  return {
    prepare(query) {
      if (!query.includes('FROM flue_run_history')) {
        throw new Error(`Unexpected D1 query: ${query}`);
      }

      let boundValues = [];
      return {
        bind(...values) {
          boundValues = values;
          return this;
        },
        async all() {
          if (options.missingTable) {
            throw new Error('D1_ERROR: no such table: flue_run_history');
          }

          const limit = Number(boundValues[0] ?? rows.length);
          return { results: rows.slice(0, limit) };
        },
      };
    },
  };
}

const missingRecords = await readRemoteFlueRunHistoryRecords(fakeD1([], { missingTable: true }));
if (missingRecords.length !== 0) {
  throw new Error(`Expected missing D1 table to produce zero records; got ${missingRecords.length}`);
}

const handlers = new Map();
registerRemoteFlueRunHistoryResources(
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
  fakeD1([{ record_json: JSON.stringify(record) }]),
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

  if (uri.endsWith('/status') && payload.latest?.issue !== 'CRE-340') {
    throw new Error(`Unexpected latest issue for status resource: ${payload.latest?.issue}`);
  }

  if (uri.endsWith('/latest') && payload.record?.runId !== 'remote-smoke-run') {
    throw new Error(`Unexpected latest record for latest resource: ${payload.record?.runId}`);
  }

  if (uri.endsWith('/list') && payload.records?.[0]?.runId !== 'remote-smoke-run') {
    throw new Error(`Unexpected first list record: ${payload.records?.[0]?.runId}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  resources: [...handlers.keys()],
  source: 'd1://TELEMETRY_DB/flue_run_history',
}, null, 2));
