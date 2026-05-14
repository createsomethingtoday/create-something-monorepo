import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createPilotResult,
  parseDeliveryTaskPayload,
  validateServiceDeliveryResult,
} from './contract.js';
import {
  createCloudflareReadinessReport,
  parseCloudflareReadinessPayload,
  validateCloudflareReadinessReport,
} from './cloudflare-readiness.js';
import {
  createDeliveryReadinessReport,
  parseDeliveryReadinessPayload,
  validateDeliveryReadinessReport,
} from './readiness.js';
import {
  createMcpAccessReport,
  parseMcpAccessPayload,
  validateMcpAccessReport,
} from './mcp-access.js';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

function getPackagePath(...parts: string[]): string {
  return resolve(process.cwd(), ...parts);
}

function getRepoPath(...parts: string[]): string {
  return resolve(process.cwd(), '../../..', ...parts);
}

const runtimeFixturePath = getPackagePath('fixtures/runtime-routing-pi-flue.json');
const mcpAccessFixturePath = getPackagePath('fixtures/mcp-access-runtime-routing.json');
const cloudflareReadinessFixturePath = getPackagePath('fixtures/cloudflare-readiness-runtime-routing.json');
const manifestPath = getPackagePath('dist/flue/manifest.json');
const cloudflareManifestPath = getPackagePath('dist/flue-cloudflare/manifest.json');
const cloudflareWranglerPath = getPackagePath('dist/flue-cloudflare/wrangler.jsonc');
const cloudflareEntryPath = getPackagePath('dist/flue-cloudflare/_entry.ts');
const agentContractPath = 'templates/agent_contract.yaml';
const goldenTasksPath = 'templates/golden_tasks.yaml';
const mcpRegistryPath = 'config/mcp-hub/registry.json';

const expectedWebhookAgents = [
  'service-delivery',
  'delivery-readiness',
  'mcp-access-review',
  'cloudflare-readiness',
];

export interface SmokeEvidenceOptions {
  includeCloudflare?: boolean;
  checkedAt?: string;
}

export function createSmokeEvidence(options: SmokeEvidenceOptions = {}) {
  const runtimeFixture = readJson(runtimeFixturePath);
  const mcpAccessFixture = readJson(mcpAccessFixturePath) as Record<string, unknown>;
  const cloudflareReadinessFixture = readJson(cloudflareReadinessFixturePath) as Record<string, unknown>;
  const serviceDeliveryInput = parseDeliveryTaskPayload(runtimeFixture);
  const serviceDeliveryResult = validateServiceDeliveryResult(createPilotResult(serviceDeliveryInput));

  const readinessInput = parseDeliveryReadinessPayload({
    taskId: 'delivery-readiness-runtime-routing',
    clientName: serviceDeliveryInput.clientName,
    workflowName: serviceDeliveryInput.workflowName,
    request: 'Evaluate the contract bundle and runtime-routing golden task for Flue pilot promotion.',
    contractBundle: {
      agentContractPath,
      goldenTasksPath,
      goldenTaskId: 'runtime-routing-pi-flue',
      agentContractText: readText(getRepoPath(agentContractPath)),
      goldenTasksText: readText(getRepoPath(goldenTasksPath)),
    },
    goldenTaskPayload: runtimeFixture,
    goldenTaskPayloadPath: 'packages/agents/flue-service-agent/fixtures/runtime-routing-pi-flue.json',
  });
  const readinessReport = validateDeliveryReadinessReport(createDeliveryReadinessReport(readinessInput));
  const mcpAccessInput = parseMcpAccessPayload({
    ...mcpAccessFixture,
    contract: {
      ...(mcpAccessFixture.contract as Record<string, unknown> | undefined),
      agentContractPath,
      agentContractText: readText(getRepoPath(agentContractPath)),
    },
    hubRegistry: {
      ...(mcpAccessFixture.hubRegistry as Record<string, unknown> | undefined),
      registryPath: mcpRegistryPath,
      registryJson: readJson(getRepoPath(mcpRegistryPath)),
    },
  });
  const mcpAccessReport = validateMcpAccessReport(createMcpAccessReport(mcpAccessInput));
  const manifest = readJson(manifestPath) as {
    agents?: Array<{ name?: string; triggers?: { webhook?: boolean } }>;
  };

  const manifestAgents = manifest.agents ?? [];
  const missingWebhookAgents = expectedWebhookAgents.filter(
    (agentName) =>
      !manifestAgents.some((agent) => agent.name === agentName && agent.triggers?.webhook === true),
  );

  if (missingWebhookAgents.length > 0) {
    throw new Error(`Flue manifest is missing webhook agents: ${missingWebhookAgents.join(', ')}`);
  }

  let cloudflareReadinessReport = null;
  if (options.includeCloudflare) {
    const cloudflareReadinessInput = parseCloudflareReadinessPayload({
      ...cloudflareReadinessFixture,
      generatedArtifacts: {
        ...(cloudflareReadinessFixture.generatedArtifacts as Record<string, unknown> | undefined),
        manifestJson: readJson(cloudflareManifestPath),
        wranglerConfigJson: readJson(cloudflareWranglerPath),
        entryText: readText(cloudflareEntryPath),
      },
    });
    cloudflareReadinessReport = validateCloudflareReadinessReport(
      createCloudflareReadinessReport(cloudflareReadinessInput),
    );
  }

  const evidence = {
    ok:
      readinessReport.readiness === 'ready' &&
      mcpAccessReport.readiness === 'ready' &&
      (!cloudflareReadinessReport || cloudflareReadinessReport.readiness === 'ready'),
    packageName: '@create-something/flue-service-agent',
    checkedAt: options.checkedAt ?? new Date().toISOString(),
    flueManifest: {
      path: 'packages/agents/flue-service-agent/dist/flue/manifest.json',
      webhookAgents: expectedWebhookAgents,
    },
    serviceDelivery: serviceDeliveryResult,
    deliveryReadiness: readinessReport,
    mcpAccess: mcpAccessReport,
    cloudflareReadiness: cloudflareReadinessReport,
  };

  if (!evidence.ok) {
    throw new Error(JSON.stringify(evidence, null, 2));
  }

  return evidence;
}

export type SmokeEvidence = ReturnType<typeof createSmokeEvidence>;

export function runSmokeCli(args = process.argv.slice(2)): void {
  const evidence = createSmokeEvidence({
    includeCloudflare: args.includes('--cloudflare'),
  });
  console.log(JSON.stringify(evidence, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSmokeCli();
}
