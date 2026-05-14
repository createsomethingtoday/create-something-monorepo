import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import * as v from 'valibot';
import { assertLinearEvidenceIsSafe } from './linear-evidence.js';
import { createSmokeEvidence, type SmokeEvidence } from './smoke.js';

export const DEFAULT_RUN_HISTORY_PATH = '.artifacts/flue-service-agent/run-history.jsonl';

const checkSummarySchema = v.object({
  pass: v.number(),
  review: v.number(),
  block: v.number(),
});

const readinessSummarySchema = v.object({
  readiness: v.picklist(['ready', 'review_required', 'blocked']),
  score: v.number(),
  checks: checkSummarySchema,
});

export const runHistoryRecordSchema = v.object({
  schemaVersion: v.literal('flue.run_history.v1'),
  resourceUri: v.string(),
  runId: v.string(),
  issue: v.optional(v.string()),
  packageName: v.literal('@create-something/flue-service-agent'),
  checkedAt: v.string(),
  status: v.picklist(['ready', 'review_required', 'blocked']),
  validationCommand: v.string(),
  workflow: v.object({
    taskId: v.string(),
    clientName: v.string(),
    workflowName: v.string(),
    goldenTaskId: v.string(),
  }),
  runtime: v.object({
    channelGateway: v.literal('pi_openclaw'),
    serviceAgent: v.literal('flue'),
    deploymentTarget: v.picklist(['node', 'cloudflare']),
  }),
  endpoints: v.object({
    serviceDelivery: v.literal('/agents/service-delivery/:id'),
    deliveryReadiness: v.literal('/agents/delivery-readiness/:id'),
    mcpAccess: v.literal('/agents/mcp-access-review/:id'),
    cloudflareReadiness: v.literal('/agents/cloudflare-readiness/:id'),
  }),
  readiness: v.object({
    serviceDeliveryDisposition: v.string(),
    delivery: readinessSummarySchema,
    mcpAccess: readinessSummarySchema,
    cloudflare: v.optional(readinessSummarySchema),
  }),
  observations: v.object({
    webhookAgents: v.array(v.string()),
    allowedMcpServers: v.array(v.string()),
    requiredHubTools: v.array(v.string()),
    durableObjectBindings: v.array(v.string()),
  }),
  artifacts: v.array(
    v.object({
      kind: v.string(),
      path: v.string(),
    }),
  ),
  guardrails: v.object({
    operatorReviewRequired: v.boolean(),
    deployable: v.boolean(),
    secretsLocation: v.string(),
    rollbackNote: v.string(),
  }),
});

export type RunHistoryRecord = v.InferOutput<typeof runHistoryRecordSchema>;

export interface RunHistoryOptions {
  issue?: string;
  runId?: string;
  validationCommand?: string;
}

function checkCounts(checks: Array<{ result: 'pass' | 'review' | 'block' }>): RunHistoryRecord['readiness']['delivery']['checks'] {
  return {
    pass: checks.filter((check) => check.result === 'pass').length,
    review: checks.filter((check) => check.result === 'review').length,
    block: checks.filter((check) => check.result === 'block').length,
  };
}

function defaultValidationCommand(evidence: SmokeEvidence): string {
  return evidence.cloudflareReadiness
    ? 'pnpm --dir packages/agents/flue-service-agent flue:history:cloudflare'
    : 'pnpm --dir packages/agents/flue-service-agent flue:history';
}

function createRunId(evidence: SmokeEvidence): string {
  const digest = createHash('sha256')
    .update(
      [
        evidence.packageName,
        evidence.checkedAt,
        evidence.serviceDelivery.taskId,
        evidence.deliveryReadiness.readiness,
        evidence.mcpAccess.readiness,
        evidence.cloudflareReadiness?.readiness ?? 'no-cloudflare',
      ].join('|'),
    )
    .digest('hex')
    .slice(0, 12);
  return `${evidence.serviceDelivery.taskId}-${digest}`;
}

function readinessStatus(evidence: SmokeEvidence): RunHistoryRecord['status'] {
  if (!evidence.ok) return 'blocked';
  return evidence.cloudflareReadiness ? 'ready' : 'review_required';
}

function cloudflareArtifacts(evidence: SmokeEvidence): RunHistoryRecord['artifacts'] {
  const cloudflare = evidence.cloudflareReadiness;
  if (!cloudflare) return [];
  return [
    { kind: 'cloudflare_manifest', path: cloudflare.generatedArtifacts.manifestPath },
    { kind: 'cloudflare_wrangler_config', path: cloudflare.generatedArtifacts.wranglerConfigPath },
    { kind: 'cloudflare_entry', path: cloudflare.generatedArtifacts.entryPath },
  ];
}

export function createRunHistoryRecord(
  evidence: SmokeEvidence,
  options: RunHistoryOptions = {},
): RunHistoryRecord {
  const cloudflare = evidence.cloudflareReadiness;
  const runId = options.runId ?? createRunId(evidence);
  const record = v.parse(runHistoryRecordSchema, {
    schemaVersion: 'flue.run_history.v1',
    resourceUri: `flue://run-history/${encodeURIComponent(evidence.packageName)}/${runId}`,
    runId,
    issue: options.issue,
    packageName: evidence.packageName,
    checkedAt: evidence.checkedAt,
    status: readinessStatus(evidence),
    validationCommand: options.validationCommand ?? defaultValidationCommand(evidence),
    workflow: {
      taskId: evidence.serviceDelivery.taskId,
      clientName: evidence.serviceDelivery.clientName,
      workflowName: evidence.serviceDelivery.workflowName,
      goldenTaskId: evidence.deliveryReadiness.evidence.contractRefs.goldenTaskId,
    },
    runtime: {
      channelGateway: evidence.serviceDelivery.evidence.runtimeChoice.channelGateway,
      serviceAgent: evidence.serviceDelivery.evidence.runtimeChoice.serviceAgentRuntime,
      deploymentTarget: cloudflare ? 'cloudflare' : 'node',
    },
    endpoints: {
      serviceDelivery: evidence.serviceDelivery.evidence.runtimeChoice.endpointPattern,
      deliveryReadiness: evidence.deliveryReadiness.evidence.endpointPattern,
      mcpAccess: evidence.mcpAccess.evidence.endpointPattern,
      cloudflareReadiness: cloudflare?.evidence.endpointPattern ?? '/agents/cloudflare-readiness/:id',
    },
    readiness: {
      serviceDeliveryDisposition: evidence.serviceDelivery.disposition,
      delivery: {
        readiness: evidence.deliveryReadiness.readiness,
        score: evidence.deliveryReadiness.score,
        checks: checkCounts(evidence.deliveryReadiness.checks),
      },
      mcpAccess: {
        readiness: evidence.mcpAccess.readiness,
        score: evidence.mcpAccess.score,
        checks: checkCounts(evidence.mcpAccess.checks),
      },
      cloudflare: cloudflare
        ? {
            readiness: cloudflare.readiness,
            score: cloudflare.score,
            checks: checkCounts(cloudflare.checks),
          }
        : undefined,
    },
    observations: {
      webhookAgents: evidence.flueManifest.webhookAgents,
      allowedMcpServers: evidence.mcpAccess.allowedServers,
      requiredHubTools: evidence.mcpAccess.requiredHubTools,
      durableObjectBindings: cloudflare?.evidence.durableObjectBindings ?? [],
    },
    artifacts: [
      { kind: 'node_manifest', path: evidence.flueManifest.path },
      { kind: 'agent_contract', path: evidence.deliveryReadiness.evidence.contractRefs.agentContract },
      { kind: 'golden_tasks', path: evidence.deliveryReadiness.evidence.contractRefs.goldenTasks },
      ...cloudflareArtifacts(evidence),
    ],
    guardrails: {
      operatorReviewRequired: evidence.serviceDelivery.disposition === 'needs_operator_review',
      deployable: evidence.ok && cloudflare?.readiness === 'ready',
      secretsLocation: cloudflare?.evidence.deploymentPolicy.allowedSecretsLocation ?? 'Cloudflare secrets or Infisical',
      rollbackNote:
        cloudflare?.evidence.deploymentPolicy.rollbackNote ??
        'Pi/OpenClaw relay remains independent; attach Cloudflare readiness before deploying Flue.',
    },
  });

  assertRunHistoryRecordIsSafe(record);
  return record;
}

export function assertRunHistoryRecordIsSafe(record: RunHistoryRecord): void {
  assertLinearEvidenceIsSafe(JSON.stringify(record));
}

export function appendRunHistoryRecord(
  record: RunHistoryRecord,
  path = DEFAULT_RUN_HISTORY_PATH,
): string {
  const resolvedPath = resolve(process.cwd(), path);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  appendFileSync(resolvedPath, `${JSON.stringify(record)}\n`, 'utf8');
  return resolvedPath;
}

export function writeRunHistoryRecord(record: RunHistoryRecord, path: string): string {
  const resolvedPath = resolve(process.cwd(), path);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return resolvedPath;
}

function readArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

export function runHistoryCli(args = process.argv.slice(2)): void {
  const includeCloudflare = args.includes('--cloudflare');
  const shouldAppend = args.includes('--append');
  const issue = readArg(args, '--issue') ?? process.env.LINEAR_ISSUE;
  const outPath = readArg(args, '--out');
  const evidence = createSmokeEvidence({ includeCloudflare });
  const record = createRunHistoryRecord(evidence, { issue });

  if (shouldAppend) {
    const path = appendRunHistoryRecord(record, outPath ?? DEFAULT_RUN_HISTORY_PATH);
    console.log(
      JSON.stringify(
        {
          ok: true,
          path,
          resourceUri: record.resourceUri,
          runId: record.runId,
          status: record.status,
          deployable: record.guardrails.deployable,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (outPath) {
    const path = writeRunHistoryRecord(record, outPath);
    console.log(`Wrote Flue run-history record to ${path}`);
    return;
  }

  console.log(JSON.stringify(record, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runHistoryCli();
}
