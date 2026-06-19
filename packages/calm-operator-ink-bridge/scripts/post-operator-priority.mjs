#!/usr/bin/env node

import { readFileSync } from 'node:fs';

import {
  bridgeUrl,
  operatorPriorityBrief,
  postOperatorPriority,
  synthesizeOperatorPriority
} from '../src/producers.ts';

const DEFAULT_ORIGIN = 'https://ink.createsomething.agency';

function usage() {
  return [
    'Usage:',
    `  pnpm post:priority -- --focus "Webflow MCP launch" --risk "Marketplace copy incomplete" --next-action "Review Airtable fields"`,
    '',
    'Options:',
    '  --origin <url>        Defaults to https://ink.createsomething.agency',
    '  --url <url>           Full POST /ink/operator-priority URL',
    '  --token <token>       Defaults to INK_SOURCE_TOKEN or CALM_OPERATOR_BRIDGE_TOKEN',
    '  --focus <text>        What the operator should focus on now',
    '  --risk <text>         The main risk or reason this matters',
    '  --next-action <text>  The next concrete action',
    '  --summary <text>      Optional longer summary stored as detail',
    '  --source-link <x>     Source link as label=url or kind:label=url; repeatable',
    '  --linear <x>          Linear source link as label=url; repeatable',
    '  --notion <x>          Notion source link as label=url; repeatable',
    '  --codex <x>           Codex source link as label=url; repeatable',
    '  --health <x>          Health source link as label=url; repeatable',
    '  --sources <path>      JSON state bundle; can synthesize focus/risk/action',
    '  --severity <0-100>    Defaults to 92',
    '  --urgent             Mark the priority urgent',
    '  --ttl-ms <number>     Optional expiry in milliseconds'
  ].join('\n');
}

function parseArgs(argv, env = process.env) {
  const args = {
    origin: DEFAULT_ORIGIN,
    token: env.INK_SOURCE_TOKEN ?? env.CALM_OPERATOR_BRIDGE_TOKEN,
    sourceLinks: [],
    sources: {}
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
    } else if (item === '--focus') {
      args.focus = argv[++index];
    } else if (item === '--risk') {
      args.risk = argv[++index];
    } else if (item === '--next-action') {
      args.nextAction = argv[++index];
    } else if (item === '--summary') {
      args.summary = argv[++index];
    } else if (item === '--source-link') {
      args.sourceLinks.push(parseSourceLink(argv[++index]));
    } else if (item === '--linear' || item === '--notion' || item === '--codex' || item === '--health') {
      args.sourceLinks.push(parseSourceLink(argv[++index], item.slice(2)));
    } else if (item === '--sources') {
      args.sources = JSON.parse(readFileSync(argv[++index], 'utf8'));
    } else if (item === '--severity') {
      args.severity = Number(argv[++index]);
    } else if (item === '--urgent') {
      args.urgent = true;
    } else if (item === '--ttl-ms') {
      args.ttlMs = Number(argv[++index]);
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }

  return args;
}

function parseSourceLink(value, forcedKind) {
  const [rawLabel, ...urlParts] = String(value ?? '').split('=');
  const url = urlParts.join('=').trim();
  const kindMatch = rawLabel.match(/^([a-z][a-z0-9_-]*):(.*)$/i);
  const kind = forcedKind ?? kindMatch?.[1];
  const label = (kindMatch ? kindMatch[2] : rawLabel).trim();
  if (!label) throw new Error('Source link label is required');
  return {
    label,
    ...(url ? { url } : {}),
    ...(kind ? { kind } : {})
  };
}

async function main(argv = process.argv, env = process.env) {
  const args = parseArgs(argv, env);
  if (args.help) {
    console.log(usage());
    return 0;
  }
  if (!args.token?.trim()) throw new Error('INK_SOURCE_TOKEN or CALM_OPERATOR_BRIDGE_TOKEN is required');

  const hasExplicitBrief = args.focus && args.risk && args.nextAction;
  const hasSources = Object.keys(args.sources).length > 0;
  if (!hasExplicitBrief && !hasSources) {
    throw new Error('--focus, --risk, and --next-action are required unless --sources is provided');
  }

  let priority;
  if (hasExplicitBrief) {
    priority = operatorPriorityBrief({
      focus: args.focus,
      risk: args.risk,
      nextAction: args.nextAction,
      summary: args.summary,
      sourceLinks: args.sourceLinks,
      sources: args.sources,
      severity: args.severity,
      urgent: args.urgent,
      ttlMs: args.ttlMs
    });
  } else {
    const synthesized = synthesizeOperatorPriority(args.sources);
    priority = {
      ...synthesized,
      source_links: [
        ...((synthesized.source_links ?? [])),
        ...args.sourceLinks
      ]
    };
  }
  const url = args.url ?? bridgeUrl(args.origin, '/ink/operator-priority');
  const response = await postOperatorPriority({
    url,
    token: args.token,
    priority
  });

  console.log(JSON.stringify(response, null, 2));
  return 0;
}

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
