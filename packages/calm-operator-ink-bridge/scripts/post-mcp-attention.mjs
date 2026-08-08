#!/usr/bin/env node

import { basename } from 'node:path';

import { bridgeUrl, mcpAttentionAlert, postInkAlert } from '../src/producers.ts';

const DEFAULT_ORIGIN = 'https://ink.createsomething.agency';

function usage() {
  return [
    'Usage:',
    `  node ${basename(process.argv[1])} --mcp "HubSpot MCP" --reason "Review failed"`,
    '',
    'Options:',
    '  --origin <url>       Defaults to https://ink.createsomething.agency',
    '  --url <url>          Full POST /operator/alert URL',
    '  --token <token>      Defaults to INK_SOURCE_TOKEN or CALM_OPERATOR_BRIDGE_TOKEN',
    '  --mcp <name>         MCP display name',
    '  --registry-id <id>   Optional MCP registry id',
    '  --agent <name>       Review agent name',
    '  --reason <text>      Why the MCP requires attention',
    '  --action <text>      Operator next action',
    '  --ttl-ms <number>    Expire alert after this many milliseconds'
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
    } else if (item === '--mcp') {
      args.mcp = argv[++index];
    } else if (item === '--registry-id') {
      args.registryId = argv[++index];
    } else if (item === '--agent') {
      args.agent = argv[++index];
    } else if (item === '--reason') {
      args.reason = argv[++index];
    } else if (item === '--action') {
      args.action = argv[++index];
    } else if (item === '--ttl-ms') {
      args.ttlMs = Number(argv[++index]);
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
if (!args.mcp) throw new Error('--mcp is required');
if (!args.reason) throw new Error('--reason is required');

const url = args.url ?? bridgeUrl(args.origin, '/operator/alert');
const response = await postInkAlert({
  url,
  token: args.token,
  alert: mcpAttentionAlert(args)
});

console.log(JSON.stringify(response, null, 2));
