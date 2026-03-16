#!/usr/bin/env tsx

import {
  DEFAULT_MAX_TURNS,
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  formatHalfDozenErrorResult,
  listHalfDozenScenarios,
  listHalfDozenServers,
  parseHalfDozenScenario,
  parseHalfDozenServerList,
  runHalfDozenScenario,
  type ScenarioKey,
  type ServerKey,
} from "../packages/workflows-trigger/src/halfdozen.js";

type ParsedCliArgs = {
  query?: string;
  servers?: ServerKey[];
  model?: string;
  maxTurns?: number;
  scenario?: ScenarioKey;
  timeoutMs: number;
  listServers: boolean;
  listScenarios: boolean;
  connectOnly: boolean;
};

function printUsage(): void {
  console.log(`Usage:
  pnpm exec tsx scripts/openai-agent-sdk-halfdozen-smoke.ts [options]

Options:
  --scenario "<name>"    Scenario preset (dedup,inbox-triage,fleet-watchdog)
  --query "<text>"       Prompt to run through the agent
  --servers "<list>"     Comma-separated server keys (telemetry,youtube,gmail,zoom,notion)
  --model "<name>"       Model name (default: ${DEFAULT_MODEL})
  --max-turns <number>   Max agent turns (default: ${DEFAULT_MAX_TURNS})
  --timeout-ms <number>  MCP request timeout in ms (default: ${DEFAULT_TIMEOUT_MS})
  --connect-only         Validate MCP connectivity + tool discovery only (no OpenAI call)
  --list-servers         Print available server keys and exit
  --list-scenarios       Print available scenarios and linked contract bundles
  --help                 Show this help
`);
}

function parseArgs(argv: string[]): ParsedCliArgs {
  let query: string | undefined;
  let servers: ServerKey[] | undefined;
  let model: string | undefined;
  let maxTurns: number | undefined;
  let scenario: ScenarioKey | undefined;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let listServers = false;
  let listScenarios = false;
  let connectOnly = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--list-servers") {
      listServers = true;
      continue;
    }

    if (arg === "--list-scenarios") {
      listScenarios = true;
      continue;
    }

    if (arg === "--connect-only") {
      connectOnly = true;
      continue;
    }

    if (arg === "--scenario") {
      const raw = argv[i + 1] ?? "";
      scenario = parseHalfDozenScenario(raw);
      i += 1;
      continue;
    }

    if (arg === "--query") {
      query = argv[i + 1] ?? query;
      i += 1;
      continue;
    }

    if (arg === "--servers") {
      const raw = argv[i + 1] ?? "";
      servers = parseHalfDozenServerList(raw);
      i += 1;
      continue;
    }

    if (arg === "--model") {
      model = argv[i + 1] ?? model;
      i += 1;
      continue;
    }

    if (arg === "--max-turns") {
      const parsed = Number(argv[i + 1]);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error(`Invalid --max-turns value: ${argv[i + 1] ?? ""}`);
      }
      maxTurns = parsed;
      i += 1;
      continue;
    }

    if (arg === "--timeout-ms") {
      const parsed = Number(argv[i + 1]);
      if (!Number.isFinite(parsed) || parsed < 1000) {
        throw new Error(`Invalid --timeout-ms value: ${argv[i + 1] ?? ""}`);
      }
      timeoutMs = parsed;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    query,
    servers,
    model,
    maxTurns,
    scenario,
    timeoutMs,
    listServers,
    listScenarios,
    connectOnly,
  };
}

async function main(): Promise<void> {
  const parsedArgs = parseArgs(process.argv.slice(2));

  if (parsedArgs.listServers || parsedArgs.listScenarios) {
    const output: Record<string, unknown> = {};
    if (parsedArgs.listServers) {
      output.servers = listHalfDozenServers();
    }
    if (parsedArgs.listScenarios) {
      output.scenarios = listHalfDozenScenarios();
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const result = await runHalfDozenScenario({
    query: parsedArgs.query,
    servers: parsedArgs.servers,
    model: parsedArgs.model,
    maxTurns: parsedArgs.maxTurns,
    scenario: parsedArgs.scenario,
    timeoutMs: parsedArgs.timeoutMs,
    connectOnly: parsedArgs.connectOnly,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify(formatHalfDozenErrorResult(error), null, 2));
  process.exit(1);
});
