#!/usr/bin/env tsx

import {
  HydraRecallClient,
  resolveHydraConfig
} from '../packages/hydradb-context-mcp/src/client.js';
import { compileRecallContext } from '../packages/hydradb-context-mcp/src/compiler.js';
import type { RecallMode } from '../packages/hydradb-context-mcp/src/types.js';

type Options = {
  allowEmpty: boolean;
  json: boolean;
  maxExcerptChars: number;
  maxResults: number;
  minScore?: number;
  mode: RecallMode;
  query?: string;
  subTenantId?: string;
  task: string;
};

const DEFAULT_TASK = 'current CREATE SOMETHING implementation work';
const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_MAX_EXCERPT_CHARS = 700;

async function main(options: Options): Promise<void> {
  const config = resolveHydraConfig();
  const client = new HydraRecallClient(config);
  const query = options.query ?? buildPolicyQuery(options.task);
  const recall = await client.recall({
    graphContext: true,
    maxResults: options.maxResults,
    mode: options.mode,
    query,
    subTenantId: options.subTenantId
  });
  const compiled = compileRecallContext(recall, {
    maxExcerptChars: options.maxExcerptChars,
    maxSources: options.maxResults,
    minScore: options.minScore
  });

  if (compiled.resultCount === 0 && !options.allowEmpty) {
    throw new Error(
      `Hydra DB policy preflight returned no usable context for task: ${options.task}`
    );
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          task: options.task,
          ...compiled
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`# Hydra DB Policy Preflight

Task: ${options.task}

${compiled.compiledContext}`);
}

function buildPolicyQuery(task: string): string {
  return [
    `CREATE SOMETHING policy and architecture context for this work: ${task}`,
    'Prioritize credential delivery, bearer token governance, tenant tool exposure, Hub route authorization, integration selection, Git-light delivery, and the Database Automation Judgment framework.',
    'Return source-backed context that would change how an agent scopes, validates, or promotes the work.'
  ].join('\n');
}

function parseArgs(argv: string[]): Options {
  const cleanArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const options: Options = {
    allowEmpty: false,
    json: false,
    maxExcerptChars: DEFAULT_MAX_EXCERPT_CHARS,
    maxResults: DEFAULT_MAX_RESULTS,
    mode: 'thinking',
    task: DEFAULT_TASK
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
      case '--max-excerpt-chars':
        options.maxExcerptChars = parsePositiveInteger(next, '--max-excerpt-chars');
        i += 1;
        break;
      case '--max-results':
        options.maxResults = parsePositiveInteger(next, '--max-results');
        i += 1;
        break;
      case '--min-score':
        if (!next) throw new Error('Missing value for --min-score.');
        options.minScore = Number.parseFloat(next);
        if (!Number.isFinite(options.minScore)) {
          throw new Error(`Invalid --min-score value: ${next}`);
        }
        i += 1;
        break;
      case '--mode':
        if (next !== 'fast' && next !== 'thinking') {
          throw new Error('Missing or invalid value for --mode. Expected fast or thinking.');
        }
        options.mode = next;
        i += 1;
        break;
      case '--query':
        if (!next) throw new Error('Missing value for --query.');
        options.query = next;
        i += 1;
        break;
      case '--sub-tenant-id':
        if (!next) throw new Error('Missing value for --sub-tenant-id.');
        options.subTenantId = next;
        i += 1;
        break;
      case '--task':
        if (!next) throw new Error('Missing value for --task.');
        options.task = next;
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
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flag}: ${value}`);
  }
  return parsed;
}

function printUsage(): void {
  console.log(`Usage:
  pnpm hydradb:policy-preflight:infisical -- --task "..."

Options:
  --task <text>               Work description used to build the recall query.
  --query <text>              Override the generated policy recall query.
  --sub-tenant-id <id>        Optional allowed Hydra DB sub-tenant.
  --max-results <n>           Recall result limit. Default: ${DEFAULT_MAX_RESULTS}
  --max-excerpt-chars <n>     Compiled excerpt length. Default: ${DEFAULT_MAX_EXCERPT_CHARS}
  --min-score <n>             Optional minimum relevancy score.
  --mode <fast|thinking>      Hydra DB recall mode. Default: thinking.
  --allow-empty               Do not fail when recall returns no usable context.
  --json                      Print machine-readable JSON.
  --help                      Show this help.
`);
}

const options = parseArgs(process.argv.slice(2));

try {
  await main(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
