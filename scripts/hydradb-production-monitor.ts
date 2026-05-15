#!/usr/bin/env tsx

import {
  HydraRecallClient,
  resolveHydraConfig
} from '../packages/hydradb-context-mcp/src/client.js';
import type { RecallMode } from '../packages/hydradb-context-mcp/src/types.js';

type Lane = {
  id: string;
  minResults: number;
  query: string;
  subTenantId: string;
};

type LaneResult = Lane & {
  empty: boolean;
  latencyMs: number;
  ok: boolean;
  resultCount: number;
};

type Options = {
  allowEmpty: boolean;
  json: boolean;
  lanes: string[];
  maxLatencyMs: number;
  maxResults: number;
  mode: RecallMode;
};

const DEFAULT_MAX_LATENCY_MS = 15_000;
const DEFAULT_MAX_RESULTS = 5;

const LANES: Lane[] = [
  {
    id: 'policy',
    minResults: 1,
    query: 'Which policy governs bearer token rotation?',
    subTenantId: 'cs-internal-context'
  },
  {
    id: 'linear-evidence',
    minResults: 1,
    query: 'What evidence exists for the Hydra DB wrapper promotion gate?',
    subTenantId: 'cs-linear-evidence'
  },
  {
    id: 'mcp-catalog',
    minResults: 1,
    query: 'Which MCP servers provide Hydra DB context memory or recall?',
    subTenantId: 'cs-mcp-catalog'
  }
];

async function main(options: Options): Promise<void> {
  const config = resolveHydraConfig();
  const client = new HydraRecallClient(config);
  const lanes = selectedLanes(options);
  const startedAt = new Date().toISOString();
  const results: LaneResult[] = [];

  for (const lane of lanes) {
    const start = performance.now();
    const recall = await client.recall({
      graphContext: true,
      maxResults: options.maxResults,
      mode: options.mode,
      query: lane.query,
      subTenantId: lane.subTenantId
    });
    const latencyMs = Math.round(performance.now() - start);
    const empty = recall.resultCount < lane.minResults;
    const slow = latencyMs > options.maxLatencyMs;
    results.push({
      ...lane,
      empty,
      latencyMs,
      ok: (!empty || options.allowEmpty) && !slow,
      resultCount: recall.resultCount
    });
  }

  const disallowedSubTenantRejected = await rejectsDisallowedSubTenant(client);
  const ok = results.every((result) => result.ok) && disallowedSubTenantRejected;
  const payload = {
    status: ok ? 'pass' : 'fail',
    startedAt,
    maxLatencyMs: options.maxLatencyMs,
    mode: options.mode,
    disallowedSubTenantRejected,
    results
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`Hydra DB production recall monitor: ${payload.status}`);
    for (const result of results) {
      console.log(
        `${result.ok ? 'PASS' : 'FAIL'} ${result.id} sub_tenant=${result.subTenantId} results=${result.resultCount} latency_ms=${result.latencyMs}`
      );
    }
    console.log(`${disallowedSubTenantRejected ? 'PASS' : 'FAIL'} disallowed_sub_tenant_rejected`);
  }

  if (!ok) process.exit(1);
}

function selectedLanes(options: Options): Lane[] {
  if (options.lanes.length === 0) return LANES;
  const known = new Map(LANES.map((lane) => [lane.id, lane]));
  return options.lanes.map((laneId) => {
    const lane = known.get(laneId);
    if (!lane)
      throw new Error(`Unknown lane: ${laneId}. Known lanes: ${[...known.keys()].join(', ')}`);
    return lane;
  });
}

async function rejectsDisallowedSubTenant(client: HydraRecallClient): Promise<boolean> {
  try {
    await client.recall({
      graphContext: false,
      maxResults: 1,
      mode: 'fast',
      query: 'This should be rejected before a network request.',
      subTenantId: 'client-not-allowlisted-context'
    });
    return false;
  } catch (error) {
    return error instanceof Error && error.message.includes('not allowed');
  }
}

function parseArgs(argv: string[]): Options {
  const cleanArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const options: Options = {
    allowEmpty: false,
    json: false,
    lanes: [],
    maxLatencyMs: DEFAULT_MAX_LATENCY_MS,
    maxResults: DEFAULT_MAX_RESULTS,
    mode: 'thinking'
  };

  for (let i = 0; i < cleanArgv.length; i += 1) {
    const arg = cleanArgv[i];
    const next = cleanArgv[i + 1];
    switch (arg) {
      case '--allow-empty':
        options.allowEmpty = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--lane':
        if (!next) throw new Error('Missing value for --lane.');
        options.lanes.push(next);
        i += 1;
        break;
      case '--max-latency-ms':
        options.maxLatencyMs = parsePositiveInteger(next, '--max-latency-ms');
        i += 1;
        break;
      case '--max-results':
        options.maxResults = parsePositiveInteger(next, '--max-results');
        i += 1;
        break;
      case '--mode':
        if (next !== 'fast' && next !== 'thinking') {
          throw new Error('Missing or invalid value for --mode. Expected fast or thinking.');
        }
        options.mode = next;
        i += 1;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }

  return options;
}

function parsePositiveInteger(value: string | undefined, flag: string): number {
  if (!value) throw new Error(`Missing value for ${flag}.`);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0)
    throw new Error(`Invalid value for ${flag}: ${value}`);
  return parsed;
}

function printUsage(): void {
  console.log(`Usage:
  pnpm hydradb:production-monitor:infisical -- [options]

Options:
  --lane <id>              Lane to check. Repeatable. Known: ${LANES.map((lane) => lane.id).join(', ')}
  --max-latency-ms <n>     Failing latency threshold. Default: ${DEFAULT_MAX_LATENCY_MS}
  --max-results <n>        Recall result limit. Default: ${DEFAULT_MAX_RESULTS}
  --mode <fast|thinking>   Hydra recall mode. Default: thinking.
  --allow-empty            Do not fail on empty recalls.
  --json                   Print machine-readable JSON.
  --help                   Show this help.
`);
}

const options = parseArgs(process.argv.slice(2));

try {
  await main(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
