#!/usr/bin/env node

import { readFileSync } from 'node:fs';

import {
  bridgeUrl,
  postOperatorPriority,
  synthesizeOperatorPriority
} from '../src/producers.ts';

const DEFAULT_ORIGIN = 'https://ink.createsomething.agency';

function usage() {
  return [
    'Usage:',
    '  pnpm post:langfuse-quality -- --input ./langfuse-summary.json',
    '',
    'Options:',
    '  --input <path>       Local JSON summary or eval command output text',
    '  --origin <url>       Defaults to https://ink.createsomething.agency',
    '  --url <url>          Full POST /ink/operator-priority URL',
    '  --token <token>      Defaults to INK_SOURCE_TOKEN or CALM_OPERATOR_BRIDGE_TOKEN',
    '  --ttl-ms <number>    Optional priority expiry in milliseconds',
    '  --dry-run            Print normalized Langfuse signal and priority without posting'
  ].join('\n');
}

function parseArgs(argv, env = process.env) {
  const args = {
    origin: DEFAULT_ORIGIN,
    token: env.INK_SOURCE_TOKEN ?? env.CALM_OPERATOR_BRIDGE_TOKEN
  };

  for (let index = 2; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--') continue;
    if (item === '--help' || item === '-h') {
      args.help = true;
    } else if (item === '--input') {
      args.input = argv[++index];
    } else if (item === '--origin') {
      args.origin = argv[++index];
    } else if (item === '--url') {
      args.url = argv[++index];
    } else if (item === '--token') {
      args.token = argv[++index];
    } else if (item === '--ttl-ms') {
      args.ttlMs = Number(argv[++index]);
    } else if (item === '--dry-run') {
      args.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }

  return args;
}

function asRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
}

function stringField(record, ...keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.replace(/\s+/g, ' ').trim();
  }
  return '';
}

function numberField(record, ...keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function severityFor(signal) {
  if (typeof signal.severity === 'number' && Number.isFinite(signal.severity)) {
    return Math.max(0, Math.min(100, Math.round(signal.severity)));
  }

  const status = signal.status.toLowerCase();
  if (status.includes('critical') || status.includes('block')) return 96;
  if (signal.regressions > 0 || status.includes('regression')) return 90;
  if (signal.failures > 0 || status.includes('fail') || status.includes('error')) return 86;
  if (status.includes('warn') || status.includes('drift')) return 74;
  return 35;
}

function recommendedAction(signal) {
  if (signal.recommended_action) return signal.recommended_action;
  if (signal.severity >= 90) return 'Review failing Langfuse eval before promotion';
  if (signal.severity >= 70) return 'Inspect Langfuse quality drift';
  return 'No Ink action required from Langfuse';
}

function normalizeJsonSummary(raw) {
  const root = asRecord(raw);
  const record = asRecord(root.langfuse ?? root.quality ?? root.eval ?? root);
  const status = stringField(record, 'status', 'state', 'result') || (record.ok === false ? 'failed' : 'ok');
  const signal = {
    status,
    eval_name: stringField(record, 'eval_name', 'evalName', 'eval', 'suite', 'name'),
    experiment_name: stringField(record, 'experiment_name', 'experimentName', 'experiment'),
    summary: stringField(record, 'summary', 'message', 'description'),
    regression_summary: stringField(record, 'regression_summary', 'regressionSummary'),
    failure_summary: stringField(record, 'failure_summary', 'failureSummary', 'error'),
    permalink: stringField(record, 'permalink', 'url', 'link'),
    severity: numberField(record, 'severity', 'score_severity'),
    failures: numberField(record, 'failures', 'failure_count', 'failed', 'failed_count'),
    regressions: numberField(record, 'regressions', 'regression_count'),
    total: numberField(record, 'total', 'case_count', 'tests')
  };

  signal.severity = severityFor(signal);
  signal.recommended_action = stringField(record, 'recommended_action', 'recommendedAction', 'action') || recommendedAction(signal);
  return signal;
}

function normalizeTextSummary(text) {
  const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? 'Langfuse eval output';
  const lower = text.toLowerCase();
  const failures = Number(lower.match(/(\d+)\s+(?:failed|failures?)/)?.[1] ?? 0);
  const regressions = Number(lower.match(/(\d+)\s+regressions?/)?.[1] ?? 0);
  const status =
    lower.includes('critical') ? 'critical' :
      lower.includes('regression') ? 'regression' :
        lower.includes('fail') || lower.includes('error') ? 'failed' :
          lower.includes('warn') ? 'warning' :
            'ok';
  const signal = {
    status,
    eval_name: 'Langfuse eval',
    summary: firstLine,
    failure_summary: failures > 0 ? `${failures} Langfuse failures` : '',
    regression_summary: regressions > 0 ? `${regressions} Langfuse regressions` : '',
    failures,
    regressions,
    total: 0
  };

  signal.severity = severityFor(signal);
  signal.recommended_action = recommendedAction(signal);
  return signal;
}

function readLangfuseSignal(path) {
  const text = readFileSync(path, 'utf8');
  try {
    return normalizeJsonSummary(JSON.parse(text));
  } catch {
    return normalizeTextSummary(text);
  }
}

async function main(argv = process.argv, env = process.env) {
  const args = parseArgs(argv, env);
  if (args.help) {
    console.log(usage());
    return 0;
  }
  if (!args.input) throw new Error('--input is required');

  const langfuse = readLangfuseSignal(args.input);
  const priority = synthesizeOperatorPriority({ langfuse });
  if (Number.isFinite(args.ttlMs) && args.ttlMs > 0) priority.ttl_ms = args.ttlMs;

  if (args.dryRun) {
    console.log(JSON.stringify({ langfuse, priority }, null, 2));
    return 0;
  }

  if (!args.token?.trim()) throw new Error('INK_SOURCE_TOKEN or CALM_OPERATOR_BRIDGE_TOKEN is required');
  const response = await postOperatorPriority({
    url: args.url ?? bridgeUrl(args.origin, '/ink/operator-priority'),
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
