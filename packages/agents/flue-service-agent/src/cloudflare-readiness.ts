import * as v from 'valibot';

export const CLOUDFLARE_READINESS_RUNTIME = {
  runtime: 'flue',
  role: 'service_agent',
  agentName: 'cloudflare-readiness',
  endpointPattern: '/agents/cloudflare-readiness/:id',
  target: 'cloudflare',
  outputPath: 'dist/flue-cloudflare',
} as const;

export const DEFAULT_EXPECTED_WEBHOOK_AGENTS = [
  'service-delivery',
  'delivery-readiness',
  'mcp-access-review',
  'cloudflare-readiness',
] as const;

const deploymentCheckSchema = v.object({
  id: v.string(),
  result: v.picklist(['pass', 'review', 'block']),
  notes: v.string(),
});

export const cloudflareReadinessPayloadSchema = v.object({
  taskId: v.string(),
  clientName: v.string(),
  workflowName: v.string(),
  request: v.optional(v.string()),
  expectedWebhookAgents: v.optional(v.array(v.string())),
  generatedArtifacts: v.object({
    manifestPath: v.string(),
    wranglerConfigPath: v.string(),
    entryPath: v.optional(v.string()),
    manifestJson: v.optional(v.unknown()),
    wranglerConfigJson: v.optional(v.unknown()),
    entryText: v.optional(v.string()),
  }),
  deploymentPolicy: v.optional(
    v.object({
      deployFromCurrentWorkspace: v.optional(v.boolean()),
      requireLinearEvidence: v.optional(v.boolean()),
      requireSecretManager: v.optional(v.boolean()),
      allowedSecretsLocation: v.optional(v.string()),
      rollbackNote: v.optional(v.string()),
    }),
  ),
});

export type CloudflareReadinessPayload = v.InferOutput<typeof cloudflareReadinessPayloadSchema>;

type FlueManifest = {
  agents?: Array<{ name?: string; triggers?: { webhook?: boolean } }>;
};

type WranglerConfig = {
  main?: string;
  name?: string;
  compatibility_date?: string;
  compatibility_flags?: string[];
  durable_objects?: {
    bindings?: Array<{ name?: string; class_name?: string }>;
  };
  migrations?: Array<{ tag?: string; new_sqlite_classes?: string[] }>;
};

export interface NormalizedCloudflareReadinessPayload extends CloudflareReadinessPayload {
  request: string;
  expectedWebhookAgents: string[];
  generatedArtifacts: CloudflareReadinessPayload['generatedArtifacts'] & {
    manifestJson: FlueManifest;
    wranglerConfigJson: WranglerConfig;
    entryText: string;
  };
  deploymentPolicy: {
    deployFromCurrentWorkspace: boolean;
    requireLinearEvidence: boolean;
    requireSecretManager: boolean;
    allowedSecretsLocation: string;
    rollbackNote: string;
  };
}

export const cloudflareReadinessReportSchema = v.object({
  taskId: v.string(),
  clientName: v.string(),
  workflowName: v.string(),
  runtime: v.literal('flue'),
  route: v.literal('cloudflare_readiness'),
  readiness: v.picklist(['ready', 'review_required', 'blocked']),
  score: v.number(),
  summary: v.string(),
  checks: v.array(deploymentCheckSchema),
  missingEvidence: v.array(v.string()),
  generatedArtifacts: v.object({
    manifestPath: v.string(),
    wranglerConfigPath: v.string(),
    entryPath: v.string(),
  }),
  recommendedNextActions: v.array(v.string()),
  evidence: v.object({
    endpointPattern: v.literal('/agents/cloudflare-readiness/:id'),
    target: v.literal('cloudflare'),
    workerName: v.string(),
    expectedWebhookAgents: v.array(v.string()),
    durableObjectBindings: v.array(v.string()),
    deploymentPolicy: v.object({
      deployFromCurrentWorkspace: v.boolean(),
      requireLinearEvidence: v.boolean(),
      requireSecretManager: v.boolean(),
      allowedSecretsLocation: v.string(),
      rollbackNote: v.string(),
    }),
  }),
});

export type CloudflareReadinessReport = v.InferOutput<typeof cloudflareReadinessReportSchema>;

export function parseCloudflareReadinessPayload(
  payload: unknown,
): NormalizedCloudflareReadinessPayload {
  const parsed = v.parse(cloudflareReadinessPayloadSchema, payload);

  return {
    ...parsed,
    request: parsed.request ?? 'Evaluate Cloudflare deployment readiness for the Flue service-agent pilot.',
    expectedWebhookAgents: parsed.expectedWebhookAgents ?? [...DEFAULT_EXPECTED_WEBHOOK_AGENTS],
    generatedArtifacts: {
      ...parsed.generatedArtifacts,
      manifestJson: normalizeManifest(parsed.generatedArtifacts.manifestJson),
      wranglerConfigJson: normalizeWranglerConfig(parsed.generatedArtifacts.wranglerConfigJson),
      entryText: parsed.generatedArtifacts.entryText ?? '',
    },
    deploymentPolicy: {
      deployFromCurrentWorkspace: parsed.deploymentPolicy?.deployFromCurrentWorkspace ?? true,
      requireLinearEvidence: parsed.deploymentPolicy?.requireLinearEvidence ?? true,
      requireSecretManager: parsed.deploymentPolicy?.requireSecretManager ?? true,
      allowedSecretsLocation: parsed.deploymentPolicy?.allowedSecretsLocation ?? 'Cloudflare secrets or Infisical',
      rollbackNote:
        parsed.deploymentPolicy?.rollbackNote ??
        'Disable the Flue Worker route or roll back to the previous Worker version; Pi/OpenClaw relay remains independent.',
    },
  };
}

function normalizeManifest(value: unknown): FlueManifest {
  if (typeof value === 'object' && value !== null && 'agents' in value) {
    return value as FlueManifest;
  }
  return { agents: [] };
}

function normalizeWranglerConfig(value: unknown): WranglerConfig {
  if (typeof value === 'object' && value !== null) {
    return value as WranglerConfig;
  }
  return {};
}

function agentClassName(agentName: string): string {
  return agentName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function pushCheck(
  checks: CloudflareReadinessReport['checks'],
  missingEvidence: string[],
  check: CloudflareReadinessReport['checks'][number],
  missing?: string,
): void {
  checks.push(check);
  if (check.result === 'block' && missing) {
    missingEvidence.push(missing);
  }
}

export function createCloudflareReadinessReport(
  input: NormalizedCloudflareReadinessPayload,
): CloudflareReadinessReport {
  const checks: CloudflareReadinessReport['checks'] = [];
  const missingEvidence: string[] = [];
  const manifestAgents = input.generatedArtifacts.manifestJson.agents ?? [];
  const wranglerConfig = input.generatedArtifacts.wranglerConfigJson;
  const bindings = wranglerConfig.durable_objects?.bindings ?? [];
  const bindingClassNames = bindings.map((binding) => binding.class_name).filter(Boolean) as string[];
  const bindingNames = bindings.map((binding) => binding.name).filter(Boolean) as string[];
  const migrations = wranglerConfig.migrations ?? [];
  const migrationClasses = new Set(
    migrations.flatMap((migration) => migration.new_sqlite_classes ?? []),
  );
  const missingManifestAgents = input.expectedWebhookAgents.filter(
    (agentName) =>
      !manifestAgents.some((agent) => agent.name === agentName && agent.triggers?.webhook === true),
  );
  const expectedAgentClasses = input.expectedWebhookAgents.map(agentClassName);
  const missingBindings = expectedAgentClasses.filter((className) => !bindingClassNames.includes(className));
  const missingMigrations = expectedAgentClasses.filter((className) => !migrationClasses.has(className));

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'cloudflare-manifest-loaded',
      result: manifestAgents.length > 0 ? 'pass' : 'block',
      notes:
        manifestAgents.length > 0
          ? `Loaded ${input.generatedArtifacts.manifestPath}.`
          : `Missing manifest agents in ${input.generatedArtifacts.manifestPath}.`,
    },
    input.generatedArtifacts.manifestPath,
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'cloudflare-webhook-agents-present',
      result: missingManifestAgents.length === 0 ? 'pass' : 'block',
      notes:
        missingManifestAgents.length === 0
          ? `Manifest includes ${input.expectedWebhookAgents.join(', ')}.`
          : `Manifest missing webhook agents: ${missingManifestAgents.join(', ')}.`,
    },
    missingManifestAgents.join(', '),
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'wrangler-config-loaded',
      result: wranglerConfig.main === '_entry.ts' ? 'pass' : 'block',
      notes:
        wranglerConfig.main === '_entry.ts'
          ? `Loaded ${input.generatedArtifacts.wranglerConfigPath} with _entry.ts main.`
          : 'Generated wrangler config must use _entry.ts as main.',
    },
    input.generatedArtifacts.wranglerConfigPath,
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'nodejs-compat-enabled',
      result: wranglerConfig.compatibility_flags?.includes('nodejs_compat') ? 'pass' : 'block',
      notes: 'Cloudflare target must enable nodejs_compat for the generated Flue Worker.',
    },
    'compatibility_flags.nodejs_compat',
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'durable-object-bindings-present',
      result: missingBindings.length === 0 && bindingNames.includes('FLUE_REGISTRY') ? 'pass' : 'block',
      notes:
        missingBindings.length === 0 && bindingNames.includes('FLUE_REGISTRY')
          ? `Durable Object bindings include ${expectedAgentClasses.join(', ')} and FLUE_REGISTRY.`
          : `Missing Durable Object bindings: ${[...missingBindings, !bindingNames.includes('FLUE_REGISTRY') ? 'FLUE_REGISTRY' : ''].filter(Boolean).join(', ')}.`,
    },
    missingBindings.join(', '),
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'durable-object-migrations-present',
      result: missingMigrations.length === 0 && migrationClasses.has('FlueRegistry') ? 'pass' : 'block',
      notes:
        missingMigrations.length === 0 && migrationClasses.has('FlueRegistry')
          ? 'Durable Object SQLite migrations are present for every Flue agent and registry.'
          : `Missing Durable Object migrations: ${[...missingMigrations, !migrationClasses.has('FlueRegistry') ? 'FlueRegistry' : ''].filter(Boolean).join(', ')}.`,
    },
    missingMigrations.join(', '),
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'cloudflare-entry-imports-agents',
      result: input.expectedWebhookAgents.every((agentName) => input.generatedArtifacts.entryText.includes(agentName))
        ? 'pass'
        : 'block',
      notes: 'Generated _entry.ts should import and register every Flue webhook agent.',
    },
    input.generatedArtifacts.entryPath,
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'deployment-policy-recorded',
      result:
        input.deploymentPolicy.deployFromCurrentWorkspace &&
        input.deploymentPolicy.requireLinearEvidence &&
        input.deploymentPolicy.requireSecretManager
          ? 'pass'
          : 'review',
      notes: 'Deployment policy requires workspace build evidence, Linear evidence, and external secret management.',
    },
  );

  const blockCount = checks.filter((check) => check.result === 'block').length;
  const reviewCount = checks.filter((check) => check.result === 'review').length;
  const score = Math.round(((checks.length - blockCount - reviewCount * 0.5) / checks.length) * 100) / 100;
  const readiness = blockCount > 0 ? 'blocked' : reviewCount > 0 ? 'review_required' : 'ready';

  return v.parse(cloudflareReadinessReportSchema, {
    taskId: input.taskId,
    clientName: input.clientName,
    workflowName: input.workflowName,
    runtime: 'flue',
    route: 'cloudflare_readiness',
    readiness,
    score,
    summary:
      readiness === 'ready'
        ? `${input.workflowName} has a Cloudflare-ready Flue build artifact.`
        : `${input.workflowName} needs Cloudflare deployment readiness review before promotion.`,
    checks,
    missingEvidence: missingEvidence.filter(Boolean),
    generatedArtifacts: {
      manifestPath: input.generatedArtifacts.manifestPath,
      wranglerConfigPath: input.generatedArtifacts.wranglerConfigPath,
      entryPath: input.generatedArtifacts.entryPath ?? '_entry.ts',
    },
    recommendedNextActions:
      readiness === 'ready'
        ? [
            'Attach the Cloudflare readiness report to Linear before deployment.',
            'Set provider and hub credentials as Cloudflare secrets or Infisical-managed values.',
            'Deploy only after confirming the Worker route and rollback path.',
          ]
        : [
            'Regenerate the Cloudflare target with the repo-pinned Node wrapper.',
            'Resolve missing Durable Object bindings or migrations before deploy.',
            'Keep the Flue pilot in local smoke mode until readiness is ready.',
          ],
    evidence: {
      endpointPattern: CLOUDFLARE_READINESS_RUNTIME.endpointPattern,
      target: 'cloudflare',
      workerName: wranglerConfig.name ?? 'unknown',
      expectedWebhookAgents: input.expectedWebhookAgents,
      durableObjectBindings: bindingNames,
      deploymentPolicy: input.deploymentPolicy,
    },
  });
}

export function createCloudflareReadinessPrompt(
  input: NormalizedCloudflareReadinessPayload,
): string {
  const deterministicReport = createCloudflareReadinessReport(input);

  return [
    'Evaluate Cloudflare deployment readiness for this CREATE SOMETHING Flue service-agent package.',
    '',
    'Request:',
    input.request,
    '',
    'Baseline Cloudflare readiness report:',
    JSON.stringify(deterministicReport, null, 2),
    '',
    'Generated artifact references:',
    JSON.stringify(
      {
        manifestPath: input.generatedArtifacts.manifestPath,
        wranglerConfigPath: input.generatedArtifacts.wranglerConfigPath,
        entryPath: input.generatedArtifacts.entryPath,
        expectedWebhookAgents: input.expectedWebhookAgents,
      },
      null,
      2,
    ),
    '',
    'Return the final report using the provided schema. Do not include secrets, bearer tokens, API keys, or raw environment values.',
  ].join('\n');
}

export function validateCloudflareReadinessReport(result: unknown): CloudflareReadinessReport {
  return v.parse(cloudflareReadinessReportSchema, result);
}
