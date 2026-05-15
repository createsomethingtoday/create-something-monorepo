#!/usr/bin/env tsx

import { spawn } from 'node:child_process';

type Lane = 'policy' | 'linear-evidence' | 'mcp-catalog';

type Options = {
  dryRun: boolean;
  json: boolean;
  lanes: Lane[];
  linearLabels: string[];
  linearLimit: number;
  monitor: boolean;
  seedEval: boolean;
  waitMs?: number;
};

const DEFAULT_LINEAR_LIMIT = 20;
const ALL_LANES: Lane[] = ['policy', 'linear-evidence', 'mcp-catalog'];

async function main(options: Options): Promise<void> {
  const startedAt = new Date().toISOString();
  const commands = buildCommands(options);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          startedAt,
          dryRun: options.dryRun,
          commands: commands.map((command) => command.join(' '))
        },
        null,
        2
      )
    );
    if (options.dryRun) return;
  }

  for (const command of commands) {
    console.log(`$ ${command.join(' ')}`);
    await run(command);
  }
}

function buildCommands(options: Options): string[][] {
  const commandMode = options.seedEval ? 'seed-eval' : 'seed';
  const baseFlags = options.dryRun ? ['--dry-run'] : [];
  const waitFlags = typeof options.waitMs === 'number' ? ['--wait-ms', String(options.waitMs)] : [];
  const commands: string[][] = [];

  for (const lane of options.lanes) {
    if (lane === 'policy') {
      commands.push([
        'pnpm',
        'hydradb:pilot',
        '--',
        commandMode,
        '--all-policies',
        '--mcp-creation',
        ...waitFlags,
        ...baseFlags
      ]);
    }

    if (lane === 'linear-evidence') {
      commands.push([
        'pnpm',
        'hydradb:linear-evidence',
        '--',
        commandMode,
        '--limit',
        String(options.linearLimit),
        ...options.linearLabels.flatMap((label) => ['--label', label]),
        ...waitFlags,
        ...baseFlags
      ]);
    }

    if (lane === 'mcp-catalog') {
      commands.push([
        'pnpm',
        'hydradb:mcp-catalog',
        '--',
        commandMode,
        '--include-dormant',
        '--include-local',
        ...waitFlags,
        ...baseFlags
      ]);
    }
  }

  if (options.monitor && !options.dryRun) {
    commands.push(['pnpm', 'hydradb:production-monitor', '--', '--json']);
  }

  return commands;
}

function run(command: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const [bin, ...args] = command;
    const child = spawn(bin, args, {
      env: process.env,
      stdio: 'inherit'
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command.join(' ')} exited with ${code ?? 'unknown'}`));
      }
    });
    child.on('error', reject);
  });
}

function parseArgs(argv: string[]): Options {
  const cleanArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const options: Options = {
    dryRun: false,
    json: false,
    lanes: [],
    linearLabels: ['code-quality'],
    linearLimit: DEFAULT_LINEAR_LIMIT,
    monitor: true,
    seedEval: true
  };
  let linearLabelOverride = false;

  for (let i = 0; i < cleanArgv.length; i += 1) {
    const arg = cleanArgv[i];
    const next = cleanArgv[i + 1];
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--lane':
        if (!isLane(next)) {
          throw new Error(`Missing or invalid value for --lane. Expected ${ALL_LANES.join(', ')}.`);
        }
        options.lanes.push(next);
        i += 1;
        break;
      case '--linear-label':
        if (!next) throw new Error('Missing value for --linear-label.');
        if (!linearLabelOverride) {
          options.linearLabels = [];
          linearLabelOverride = true;
        }
        options.linearLabels.push(next);
        i += 1;
        break;
      case '--linear-limit':
        options.linearLimit = parsePositiveInteger(next, '--linear-limit');
        i += 1;
        break;
      case '--no-eval':
        options.seedEval = false;
        break;
      case '--skip-monitor':
        options.monitor = false;
        break;
      case '--wait-ms':
        options.waitMs = parseNonNegativeInteger(next, '--wait-ms');
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

  if (options.lanes.length === 0) options.lanes = [...ALL_LANES];
  return options;
}

function isLane(value: string | undefined): value is Lane {
  return value === 'policy' || value === 'linear-evidence' || value === 'mcp-catalog';
}

function parsePositiveInteger(value: string | undefined, flag: string): number {
  const parsed = parseNonNegativeInteger(value, flag);
  if (parsed <= 0) throw new Error(`${flag} must be greater than 0.`);
  return parsed;
}

function parseNonNegativeInteger(value: string | undefined, flag: string): number {
  if (!value) throw new Error(`Missing value for ${flag}.`);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new Error(`Invalid value for ${flag}: ${value}`);
  return parsed;
}

function printUsage(): void {
  console.log(`Usage:
  pnpm hydradb:sync:infisical -- [options]

Runs the approved Hydra DB sync lanes in order:
  1. policy docs and MCP creation context -> cs-internal-context
  2. completed Linear evidence -> cs-linear-evidence
  3. sanitized MCP registry catalog -> cs-mcp-catalog
  4. production recall monitor

Options:
  --lane <lane>              Select a lane. Repeatable. Known: ${ALL_LANES.join(', ')}
  --linear-label <label>     Completed Linear evidence label. Repeatable. Default: code-quality.
  --linear-limit <n>         Linear issue limit. Default: ${DEFAULT_LINEAR_LIMIT}
  --wait-ms <n>              Override downstream seed-eval indexing wait.
  --no-eval                  Seed only; skip lane evals.
  --skip-monitor             Do not run production monitor after sync.
  --dry-run                  Print the selected command plan without writing.
  --json                     Print the command plan as JSON. With --dry-run, does not execute.
  --help                     Show this help.
`);
}

const options = parseArgs(process.argv.slice(2));

try {
  await main(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
