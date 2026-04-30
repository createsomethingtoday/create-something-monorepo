#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { bridgeUrl, operatorDecision, postOperatorDecision } from '../src/producers.ts';

const DEFAULT_ORIGIN = 'https://ink.createsomething.agency';

function usage() {
  return [
    'Usage:',
    `  node ${basename(process.argv[1])} --source mcp-review-agent --subject "MCP review requires attention" --decision-required`,
    '',
    'Options:',
    '  --origin <url>             Defaults to https://ink.createsomething.agency',
    '  --url <url>                Full POST /ink/operator-decision URL',
    '  --token <token>            Defaults to INK_SOURCE_TOKEN or CALM_OPERATOR_BRIDGE_TOKEN',
    '  --decision <path>          Operator decision JSON',
    '  --source <name>            Agent or workflow source',
    '  --subject <text>           Short subject shown on Ink',
    '  --summary <text>           One-line summary',
    '  --reason <text>            Why this matters',
    '  --detail <text>            Evidence or detail',
    '  --action <text>            Operator next action',
    '  --urgency <value>          none, note, attention, urgent, or blocked',
    '  --decision-required        Escalate to Ink',
    '  --can-step-away            Explicitly mark this as non-interrupting',
    '  --owner <name>             Responsible owner',
    '  --artifact <path-or-url>    Evidence artifact',
    '  --confidence <0-1>         Agent confidence',
    '  --id <id>                  Stable decision or alert id',
    '  --ttl-ms <number>          Expire alert after this many milliseconds'
  ].join('\n');
}

function parseArgs(argv) {
  const args = {
    origin: DEFAULT_ORIGIN,
    token: process.env.INK_SOURCE_TOKEN ?? process.env.CALM_OPERATOR_BRIDGE_TOKEN,
    decisionRequired: false
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
    } else if (item === '--decision') {
      args.decision = argv[++index];
    } else if (item === '--source') {
      args.source = argv[++index];
    } else if (item === '--subject') {
      args.subject = argv[++index];
    } else if (item === '--summary') {
      args.summary = argv[++index];
    } else if (item === '--reason') {
      args.reason = argv[++index];
    } else if (item === '--detail') {
      args.detail = argv[++index];
    } else if (item === '--action') {
      args.action = argv[++index];
    } else if (item === '--urgency') {
      args.urgency = argv[++index];
    } else if (item === '--decision-required') {
      args.decisionRequired = true;
    } else if (item === '--can-step-away') {
      args.canStepAway = true;
    } else if (item === '--owner') {
      args.owner = argv[++index];
    } else if (item === '--artifact') {
      args.artifact = argv[++index];
    } else if (item === '--confidence') {
      args.confidence = Number(argv[++index]);
    } else if (item === '--id') {
      args.id = argv[++index];
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

const decision = args.decision
  ? JSON.parse(readFileSync(args.decision, 'utf8'))
  : operatorDecision({
      source: args.source,
      subject: args.subject,
      summary: args.summary,
      reason: args.reason,
      detail: args.detail,
      action: args.action,
      urgency: args.urgency,
      decisionRequired: args.decisionRequired,
      canStepAway: args.canStepAway,
      owner: args.owner,
      artifact: args.artifact,
      confidence: args.confidence,
      id: args.id,
      ttlMs: args.ttlMs
    });

if (!decision.source) throw new Error('--decision or --source is required');
if (!decision.subject) throw new Error('--decision or --subject is required');

const url = args.url ?? bridgeUrl(args.origin, '/ink/operator-decision');
const response = await postOperatorDecision({
  url,
  token: args.token,
  decision
});

console.log(JSON.stringify(response, null, 2));
