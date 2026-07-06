#!/usr/bin/env tsx

const DEFAULT_QUERY =
  'Langfuse production smoke check: route should execute a minimal scenario and return a structured result.';
const DEFAULT_PLAYBOOK_MCP_URL = 'https://playbook.mcp.createsomething.ltd';
const ALLOWED_SCENARIOS = ['inbox-triage', 'fleet-watchdog', 'dedup'] as const;

type Scenario = (typeof ALLOWED_SCENARIOS)[number];

type ParsedArgs = {
  scenario: Scenario;
  baseUrl: string;
  query: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for the production smoke check.`);
  }
  return value;
}

function parseScenario(value: string | undefined): Scenario {
  const normalized = value?.trim().toLowerCase();
  if (normalized && (ALLOWED_SCENARIOS as readonly string[]).includes(normalized)) {
    return normalized as Scenario;
  }

  throw new Error(`Invalid scenario "${value}". Expected one of: ${ALLOWED_SCENARIOS.join(', ')}`);
}

function parseArgs(argv: string[]): ParsedArgs {
  let scenario = parseScenario(process.env.PLAYBOOK_MCP_SCENARIO ?? 'inbox-triage');
  let baseUrl = process.env.PLAYBOOK_MCP_BASE_URL ?? DEFAULT_PLAYBOOK_MCP_URL;
  let query = process.env.PLAYBOOK_MCP_QUERY ?? DEFAULT_QUERY;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--scenario') {
      scenario = parseScenario(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--base-url') {
      const next = argv[i + 1];
      if (!next) throw new Error('Missing value for --base-url.');
      baseUrl = next;
      i += 1;
      continue;
    }

    if (arg === '--query') {
      const next = argv[i + 1];
      if (!next) throw new Error('Missing value for --query.');
      query = next;
      i += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown flag: ${arg}`);
  }

  return { scenario, baseUrl, query };
}

function printUsage(): void {
  console.log(`Usage:
  pnpm langfuse:playbook-smoke [options]

Options:
  --scenario <name>   Scenario to execute: inbox-triage, fleet-watchdog, dedup
  --base-url <url>    Base URL for playbook MCP (default: ${DEFAULT_PLAYBOOK_MCP_URL})
  --query "<text>"    Scenario query text
  --help              Show this help
`);
}

function sanitizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '');
}

function buildEndpoint(baseUrl: string, scenario: Scenario): string {
  return `${sanitizeBaseUrl(baseUrl)}/clients/halfdozen/agents/${scenario}/run`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const routeToken = requireEnv('HALFDOZEN_AGENT_ROUTE_TOKEN');

  const endpoint = buildEndpoint(args.baseUrl, args.scenario);

  const start = Date.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${routeToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: args.query })
  });

  const elapsedMs = Date.now() - start;
  const bodyText = await response.text();
  let body: unknown = bodyText;

  try {
    body = JSON.parse(bodyText);
  } catch {
    // Keep text body as-is for non-JSON responses.
  }

  console.log(`Status: ${response.status} ${response.statusText} (${elapsedMs}ms)`);
  console.log(JSON.stringify(body, null, 2));

  const maybeBody = body as { success?: boolean; error?: unknown };
  const isSuccessResponse = response.ok && maybeBody.success !== false;
  if (!isSuccessResponse) {
    process.exitCode = 1;
    return;
  }

  const projectName = process.env.LANGFUSE_PROJECT_NAME ?? 'Playbook MCP';
  const hasKey = Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);

  console.log(
    `\nIf no authorization errors occurred, verify trace ingestion in Langfuse project: ${projectName}.`
  );
  if (!hasKey) {
    console.log(
      'Note: LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY are not set in your local shell.\n       Production traces still require them in Worker secrets.'
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[31mError:[0m ${message}`);
  process.exitCode = 1;
});
