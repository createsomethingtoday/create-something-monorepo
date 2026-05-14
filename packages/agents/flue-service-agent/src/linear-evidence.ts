import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createSmokeEvidence, type SmokeEvidence } from './smoke.js';

export interface LinearEvidenceOptions {
  issue?: string;
  validationCommand?: string;
}

const SECRET_PATTERNS = [
  {
    name: 'OpenAI-style API key',
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}\b/i,
  },
  {
    name: 'bearer token',
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/i,
  },
  {
    name: 'credential assignment',
    pattern: /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|password)\s*[:=]\s*["']?[A-Za-z0-9._-]{12,}/i,
  },
] as const;

function countChecks(checks: Array<{ result: 'pass' | 'review' | 'block' }>): string {
  const pass = checks.filter((check) => check.result === 'pass').length;
  const review = checks.filter((check) => check.result === 'review').length;
  const block = checks.filter((check) => check.result === 'block').length;
  return `${pass} pass, ${review} review, ${block} block`;
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'none';
}

function defaultValidationCommand(evidence: SmokeEvidence): string {
  return evidence.cloudflareReadiness
    ? 'pnpm --dir packages/agents/flue-service-agent flue:evidence:cloudflare'
    : 'pnpm --dir packages/agents/flue-service-agent flue:evidence';
}

export function createLinearEvidenceMarkdown(
  evidence: SmokeEvidence,
  options: LinearEvidenceOptions = {},
): string {
  const cloudflare = evidence.cloudflareReadiness;
  const issueLine = options.issue ? `Linear issue: ${options.issue}` : 'Linear issue: <attach to tracked issue>';
  const validationCommand = options.validationCommand ?? defaultValidationCommand(evidence);
  const cloudflareLine = cloudflare
    ? `${cloudflare.readiness} (${cloudflare.score}; ${countChecks(cloudflare.checks)})`
    : 'not included; run flue:evidence:cloudflare before deploy';
  const rollbackNote =
    cloudflare?.evidence.deploymentPolicy.rollbackNote ??
    'Pi/OpenClaw relay remains independent; keep Flue deployment disabled until Cloudflare readiness is attached.';

  const lines = [
    '# Flue Service-Agent Promotion Evidence',
    '',
    issueLine,
    `Package: ${evidence.packageName}`,
    `Checked at: ${evidence.checkedAt}`,
    `Overall result: ${evidence.ok ? 'ready' : 'blocked'}`,
    '',
    '## Runtime Surfaces',
    '',
    `- Pi/OpenClaw channel gateway: ${evidence.serviceDelivery.evidence.runtimeChoice.channelGateway}`,
    `- Flue service endpoint: ${evidence.serviceDelivery.evidence.runtimeChoice.endpointPattern}`,
    `- Delivery readiness endpoint: ${evidence.deliveryReadiness.evidence.endpointPattern}`,
    `- MCP access endpoint: ${evidence.mcpAccess.evidence.endpointPattern}`,
    `- Cloudflare readiness endpoint: ${cloudflare?.evidence.endpointPattern ?? '/agents/cloudflare-readiness/:id'}`,
    `- Webhook agents: ${formatList(evidence.flueManifest.webhookAgents)}`,
    '',
    '## Readiness',
    '',
    `- Service delivery disposition: ${evidence.serviceDelivery.disposition}`,
    `- Delivery readiness: ${evidence.deliveryReadiness.readiness} (${evidence.deliveryReadiness.score}; ${countChecks(evidence.deliveryReadiness.checks)})`,
    `- Brokered MCP access: ${evidence.mcpAccess.readiness} (${evidence.mcpAccess.score}; ${countChecks(evidence.mcpAccess.checks)})`,
    `- Cloudflare readiness: ${cloudflareLine}`,
    '',
    '## Evidence References',
    '',
    `- Agent contract: ${evidence.deliveryReadiness.evidence.contractRefs.agentContract}`,
    `- Golden tasks: ${evidence.deliveryReadiness.evidence.contractRefs.goldenTasks}`,
    `- Golden task id: ${evidence.deliveryReadiness.evidence.contractRefs.goldenTaskId}`,
    `- Flue manifest: ${evidence.flueManifest.path}`,
    `- Allowed MCP servers: ${formatList(evidence.mcpAccess.allowedServers)}`,
    `- Required hub tools: ${formatList(evidence.mcpAccess.requiredHubTools)}`,
    '',
    '## Deployment Guardrails',
    '',
    `- Target: ${cloudflare?.evidence.target ?? 'cloudflare'}`,
    `- Worker: ${cloudflare?.evidence.workerName ?? '<not built in this evidence run>'}`,
    `- Durable Object bindings: ${formatList(cloudflare?.evidence.durableObjectBindings ?? [])}`,
    `- Secrets location: ${cloudflare?.evidence.deploymentPolicy.allowedSecretsLocation ?? 'Cloudflare secrets or Infisical'}`,
    `- Rollback: ${rollbackNote}`,
    '',
    '## Validation Command',
    '',
    `\`${validationCommand}\``,
    '',
    '## Promotion Decision',
    '',
    evidence.ok && cloudflare
      ? 'Ready for reviewed Flue Worker promotion after operator confirms route, credentials, and rollback window.'
      : 'Do not deploy from this evidence alone; attach Cloudflare readiness before promotion.',
  ];

  const markdown = `${lines.join('\n')}\n`;
  assertLinearEvidenceIsSafe(markdown);
  return markdown;
}

export function assertLinearEvidenceIsSafe(markdown: string): void {
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(markdown)) {
      throw new Error(`Linear evidence includes a possible ${name}.`);
    }
  }
}

function readArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

export function runLinearEvidenceCli(args = process.argv.slice(2)): void {
  const includeCloudflare = args.includes('--cloudflare');
  const issue = readArg(args, '--issue') ?? process.env.LINEAR_ISSUE;
  const outPath = readArg(args, '--out');
  const evidence = createSmokeEvidence({ includeCloudflare });
  const markdown = createLinearEvidenceMarkdown(evidence, { issue });

  if (outPath) {
    const resolvedPath = resolve(process.cwd(), outPath);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, markdown, 'utf8');
    console.log(`Wrote Linear evidence to ${outPath}`);
    return;
  }

  console.log(markdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLinearEvidenceCli();
}
