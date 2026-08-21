#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import { bridgeUrl, postHealthSnapshot } from '../src/producers.ts';

const DEFAULT_ORIGIN = 'https://ink.createsomething.agency';

function usage() {
  return [
    'Usage:',
    `  pnpm run:health-command --name "MCP review agent" --registry-id agent.mcp-review -- npm run mcp:review`,
    '',
    'Options:',
    '  --origin <url>          Defaults to https://ink.createsomething.agency',
    '  --url <url>             Full POST /operator/health-snapshot URL',
    '  --token <token>         Defaults to INK_SOURCE_TOKEN or CALM_OPERATOR_BRIDGE_TOKEN',
    '  --type <agent|mcp|job>  Health subject type. Defaults to agent',
    '  --source <name>         Health source. Defaults to command-health-wrapper',
    '  --name <name>           Component name',
    '  --registry-id <id>      Registry id for agent/MCP/job',
    '  --artifact <path>       Report artifact created by the command',
    '  --action <text>         Operator action when the command fails',
    '  --success-status <s>    Defaults to healthy',
    '  --failure-status <s>    Defaults to failed',
    '  --success-reason <txt>  Summary when the command succeeds',
    '  --failure-reason <txt>  Summary when the command fails',
    '  --dry-run              Do not post to Ink',
    '  --json                 Print the wrapper result',
    '  --help                 Show this help',
    '',
    'Command arguments after -- are executed without a shell.'
  ].join('\n');
}

export function parseArgs(argv, env = process.env) {
  const args = {
    origin: DEFAULT_ORIGIN,
    token: env.INK_SOURCE_TOKEN ?? env.CALM_OPERATOR_BRIDGE_TOKEN,
    type: 'agent',
    source: 'command-health-wrapper',
    successStatus: 'healthy',
    failureStatus: 'failed'
  };

  for (let index = 2; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--') {
      args.command = argv.slice(index + 1);
      break;
    }
    if (item === '--help' || item === '-h') {
      args.help = true;
    } else if (item === '--origin') {
      args.origin = argv[++index];
    } else if (item === '--url') {
      args.url = argv[++index];
    } else if (item === '--token') {
      args.token = argv[++index];
    } else if (item === '--type') {
      args.type = argv[++index];
    } else if (item === '--source') {
      args.source = argv[++index];
    } else if (item === '--name') {
      args.name = argv[++index];
    } else if (item === '--registry-id') {
      args.registryId = argv[++index];
    } else if (item === '--artifact') {
      args.artifact = argv[++index];
    } else if (item === '--action') {
      args.action = argv[++index];
    } else if (item === '--success-status') {
      args.successStatus = argv[++index];
    } else if (item === '--failure-status') {
      args.failureStatus = argv[++index];
    } else if (item === '--success-reason') {
      args.successReason = argv[++index];
    } else if (item === '--failure-reason') {
      args.failureReason = argv[++index];
    } else if (item === '--dry-run') {
      args.dryRun = true;
    } else if (item === '--json') {
      args.json = true;
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }

  return args;
}

function commandName(command = []) {
  const executable = command[0] ?? 'unknown-command';
  return basename(executable);
}

function exitCodeFor(result) {
  if (typeof result.status === 'number') return result.status;
  if (result.error) return 1;
  if (result.signal) return 1;
  return 0;
}

export function buildCommandHealthPayload(args, result, durationMs, now = Date.now()) {
  const exitCode = exitCodeFor(result);
  const failed = exitCode !== 0;
  const name = args.name?.trim();
  if (!name) throw new Error('--name is required');

  return {
    source: args.source,
    component: name,
    status: failed ? args.failureStatus : args.successStatus,
    summary: failed
      ? (args.failureReason ?? `${name} failed with exit code ${exitCode}.`)
      : (args.successReason ?? `${name} completed successfully.`),
    detail: failed
      ? `${commandName(args.command)} exited with code ${exitCode}.`
      : `${commandName(args.command)} completed in ${durationMs} ms.`,
    severity: failed ? 80 : 0,
    observed_at: new Date(now).toISOString(),
    payload: {
      kind: 'command_health',
      type: args.type,
      registry_id: args.registryId ?? '',
      artifact: args.artifact ?? '',
      action: args.action ?? '',
      command_name: commandName(args.command),
      duration_ms: durationMs,
      exit_code: exitCode,
      signal: result.signal ?? null
    }
  };
}

export async function runHealthCheckedCommand(args, options = {}) {
  if (!Array.isArray(args.command) || args.command.length === 0) {
    throw new Error('Command after -- is required');
  }

  const startedAt = options.now ?? Date.now();
  const spawn = options.spawnSync ?? spawnSync;
  const result = spawn(args.command[0], args.command.slice(1), {
    stdio: options.stdio ?? 'inherit',
    env: options.env ?? process.env,
    cwd: options.cwd ?? process.cwd()
  });
  const endedAt = options.nowAfter ?? Date.now();
  const durationMs = Math.max(0, endedAt - startedAt);
  const snapshot = buildCommandHealthPayload(args, result, durationMs, endedAt);
  const commandExitCode = exitCodeFor(result);
  const url = args.url ?? bridgeUrl(args.origin, '/operator/health-snapshot');

  if (args.dryRun) {
    return { ok: true, dry_run: true, command_exit_code: commandExitCode, snapshot };
  }

  const post = options.postHealthSnapshot ?? postHealthSnapshot;
  const response = await post({
    url,
    token: args.token,
    snapshot
  });

  return { ok: true, command_exit_code: commandExitCode, snapshot, response };
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return 0;
  }

  const result = await runHealthCheckedCommand(args);
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  }

  return result.command_exit_code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
