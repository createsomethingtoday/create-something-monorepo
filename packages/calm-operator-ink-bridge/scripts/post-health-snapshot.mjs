#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { bridgeUrl, postHealthSnapshot } from '../src/producers.ts';

const DEFAULT_ORIGIN = 'https://ink.createsomething.agency';

function usage() {
  return [
    'Usage:',
    `  node ${basename(process.argv[1])} --snapshot ./health.json`,
    '',
    'Options:',
    '  --origin <url>       Defaults to https://ink.createsomething.agency',
    '  --url <url>          Full POST /ink/health-snapshot URL',
    '  --token <token>      Defaults to INK_SOURCE_TOKEN or CALM_OPERATOR_BRIDGE_TOKEN',
    '  --snapshot <path>    Health snapshot JSON',
    '  --component <name>   Component name for one-off health snapshot',
    '  --status <status>    Status for one-off health snapshot',
    '  --summary <text>     Summary for one-off health snapshot',
    '  --severity <0-100>   Optional severity'
  ].join('\n');
}

function parseArgs(argv) {
  const args = {
    origin: DEFAULT_ORIGIN,
    token: process.env.INK_SOURCE_TOKEN ?? process.env.CALM_OPERATOR_BRIDGE_TOKEN
  };

  for (let index = 2; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--') continue;
    if (item === '--help' || item === '-h') {
      args.help = true;
    } else if (item === '--origin') {
      args.origin = argv[++index];
    } else if (item === '--url') {
      args.url = argv[++index];
    } else if (item === '--token') {
      args.token = argv[++index];
    } else if (item === '--snapshot') {
      args.snapshot = argv[++index];
    } else if (item === '--component') {
      args.component = argv[++index];
    } else if (item === '--status') {
      args.status = argv[++index];
    } else if (item === '--summary') {
      args.summary = argv[++index];
    } else if (item === '--severity') {
      args.severity = Number(argv[++index]);
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }

  return args;
}

const args = parseArgs(process.argv);
if (args.help) {
  console.log(usage());
  process.exit(0);
}

const snapshot = args.snapshot
  ? JSON.parse(readFileSync(args.snapshot, 'utf8'))
  : {
      source: 'manual-health-check',
      component: args.component,
      status: args.status,
      summary: args.summary,
      severity: args.severity
    };

if (!snapshot.component && !snapshot.source) throw new Error('--snapshot or --component is required');
if (!snapshot.status) throw new Error('--snapshot or --status is required');

const url = args.url ?? bridgeUrl(args.origin, '/ink/health-snapshot');
const response = await postHealthSnapshot({
  url,
  token: args.token,
  snapshot
});

console.log(JSON.stringify(response, null, 2));
