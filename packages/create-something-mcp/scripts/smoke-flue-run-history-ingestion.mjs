import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { createFlueRunHistoryUpsertSql } from '../dist/flue-run-history-ingestion.js';

const record = {
  schemaVersion: 'flue.run_history.v1',
  resourceUri: 'flue://run-history/%40create-something%2Fflue-service-agent/ingestion-smoke',
  runId: 'ingestion-smoke',
  issue: 'CRE-349',
  packageName: '@create-something/flue-service-agent',
  checkedAt: '2026-05-14T18:00:00.000Z',
  status: 'ready',
  validationCommand: 'pnpm --dir packages/agents/flue-service-agent flue:history:cloudflare',
  workflow: {
    taskId: 'runtime-routing-pi-flue',
    clientName: 'ExampleCo',
    workflowName: "delivery-evidence-summary's check",
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
    durableObjectBindings: ['CloudflareReadiness', 'DeliveryReadiness', 'McpAccessReview', 'ServiceDelivery'],
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

const updatedRecord = {
  ...record,
  checkedAt: '2026-05-14T18:05:00.000Z',
  status: 'blocked',
  guardrails: {
    ...record.guardrails,
    deployable: false,
  },
};

const migrationSql = readFileSync(
  join(process.cwd(), 'worker/migrations/0001_flue_run_history.sql'),
  'utf8',
);
const input = [
  migrationSql,
  createFlueRunHistoryUpsertSql([record]),
  createFlueRunHistoryUpsertSql([updatedRecord]),
  "SELECT run_id || '|' || status || '|' || deployable || '|' || issue || '|' || workflow_name FROM flue_run_history WHERE run_id = 'ingestion-smoke';",
].join('\n');

const sqlite = spawnSync('sqlite3', [':memory:'], {
  input,
  encoding: 'utf8',
});

if (sqlite.error) throw sqlite.error;
if (sqlite.status !== 0) {
  throw new Error(`sqlite3 smoke failed:\n${sqlite.stderr}`);
}

const expected = "ingestion-smoke|blocked|0|CRE-349|delivery-evidence-summary's check";
const actual = sqlite.stdout.trim();
if (actual !== expected) {
  throw new Error(`Unexpected ingestion smoke output:\nexpected ${expected}\nactual   ${actual}`);
}

console.log(JSON.stringify({
  ok: true,
  runId: 'ingestion-smoke',
  upsertedStatus: 'blocked',
  escapedSqlLiterals: true,
}, null, 2));
