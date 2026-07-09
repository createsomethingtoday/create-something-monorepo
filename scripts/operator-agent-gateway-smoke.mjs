#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const DEFAULTS = Object.freeze({
  baseUrl: 'http://127.0.0.1:19932',
  mode: 'memory-proposal',
  timeoutMs: 120_000,
  infisicalEnv: 'prod',
  infisicalPath: '/operator-agent/local-gateway',
  infisicalIncludeImports: 'true',
});

export function parseArgs(argv) {
  const options = { json: false, ...DEFAULTS };
  const args = [...argv];
  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--') continue;
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    const option = arg.startsWith('--') ? arg.slice(2) : '';
    const equalsIndex = option.indexOf('=');
    const rawKey = equalsIndex === -1 ? option : option.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : option.slice(equalsIndex + 1);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = inlineValue ?? args.shift();
    if (!value) throw new Error(`Missing value for --${rawKey}`);
    if (!['baseUrl', 'mode', 'timeoutMs', 'infisicalEnv', 'infisicalPath', 'infisicalIncludeImports'].includes(key)) {
      throw new Error(`Unsupported option: --${rawKey}`);
    }
    options[key] = key === 'timeoutMs' ? Number(value) : value;
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1000 || options.timeoutMs > 300_000) {
    throw new Error('--timeout-ms must be an integer between 1000 and 300000');
  }
  return options;
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
    env: options.env ?? process.env,
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function summarizeError(result) {
  return (result.stderr || result.stdout || 'No output.').trim().split(/\r?\n/).slice(-3).join('\n');
}

function hasCommand(command) {
  return spawnSync('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' }).status === 0;
}

function parseSecretMap(stdout) {
  const parsed = JSON.parse(stdout || '{}');
  if (Array.isArray(parsed)) {
    return Object.fromEntries(
      parsed
        .map((entry) => [entry?.key ?? entry?.secretKey ?? entry?.name, entry?.value ?? entry?.secretValue])
        .filter(([key, value]) => typeof key === 'string' && typeof value === 'string')
    );
  }
  if (parsed && typeof parsed === 'object') return parsed;
  return {};
}

export function loadGatewayToken(options, env = process.env) {
  if (env.OPERATOR_AGENT_GATEWAY_TOKEN) {
    return {
      ok: true,
      source: 'env',
      token: env.OPERATOR_AGENT_GATEWAY_TOKEN,
      tokenValuePrinted: false,
    };
  }
  if (!hasCommand('infisical')) {
    return {
      ok: false,
      source: null,
      tokenValuePrinted: false,
      error: 'OPERATOR_AGENT_GATEWAY_TOKEN is not set and infisical CLI is not available',
    };
  }
  const result = capture('infisical', [
    'export',
    '--format=json',
    `--env=${options.infisicalEnv}`,
    `--path=${options.infisicalPath}`,
    `--include-imports=${options.infisicalIncludeImports}`,
  ], {
    env,
  });
  if (!result.ok) {
    return {
      ok: false,
      source: 'infisical',
      tokenValuePrinted: false,
      error: summarizeError(result),
    };
  }
  try {
    const secrets = parseSecretMap(result.stdout);
    if (secrets.OPERATOR_AGENT_GATEWAY_TOKEN) {
      return {
        ok: true,
        source: 'infisical',
        token: secrets.OPERATOR_AGENT_GATEWAY_TOKEN,
        tokenValuePrinted: false,
      };
    }
    return {
      ok: false,
      source: 'infisical',
      tokenValuePrinted: false,
      error: 'OPERATOR_AGENT_GATEWAY_TOKEN is missing from Infisical local-gateway path',
    };
  } catch (error) {
    return {
      ok: false,
      source: 'infisical',
      tokenValuePrinted: false,
      error: `unable to parse Infisical gateway token: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function fetchJson(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 30_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {}
    return {
      ok: response.ok,
      status: response.status,
      body,
      text: body ? undefined : text.slice(0, 1000),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function smoke(options, env = process.env) {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const token = loadGatewayToken(options, env);
  const steps = [];
  if (!token.ok) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'gateway-smoke',
      ok: false,
      baseUrl,
      runMode: options.mode,
      token: {
        ok: false,
        source: token.source,
        tokenValuePrinted: false,
        error: token.error,
      },
      steps,
      nextActions: ['store OPERATOR_AGENT_GATEWAY_TOKEN in Infisical at /operator-agent/local-gateway or provide it in the environment'],
    };
  }

  const health = await fetchJson(`${baseUrl}/health`, { timeoutMs: 10_000 });
  steps.push({
    id: 'health',
    ok: health.ok,
    status: health.status,
    exposedModes: health.body?.exposedModes ?? [],
    writeModesExposed: health.body?.writeModesExposed ?? null,
  });
  if (!health.ok) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'gateway-smoke',
      ok: false,
      baseUrl,
      runMode: options.mode,
      token: { ok: true, source: token.source, tokenValuePrinted: false },
      steps,
      nextActions: ['start or repair the operator-agent gateway before gateway smoke'],
    };
  }

  const run = await fetchJson(`${baseUrl}/v1/run`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      mode: options.mode,
      receiptLimit: 3,
      noModel: true,
    }),
    timeoutMs: options.timeoutMs,
  });
  steps.push({
    id: 'run',
    ok: run.ok && run.body?.ok === true,
    status: run.status,
    reportMode: run.body?.report?.mode ?? null,
    exitCode: run.body?.exitCode ?? null,
    writeModesExposed: health.body?.writeModesExposed ?? null,
    memoryStoreMutated: run.body?.report?.mutation?.memoryStoreMutated ?? null,
  });

  const ok = steps.every((step) => step.ok);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'gateway-smoke',
    ok,
    baseUrl,
    runMode: options.mode,
    token: { ok: true, source: token.source, tokenValuePrinted: false },
    steps,
    report: run.body?.report
      ? {
          mode: run.body.report.mode,
          outcome: run.body.report.outcome,
          passed: run.body.report.passed,
          mutation: run.body.report.mutation,
          receiptPath: run.body.report.receiptPath,
        }
      : null,
    nextActions: ok
      ? ['gateway bearer-auth run contract is ready for operator-controlled clients']
      : ['inspect gateway run response and keep public access blocked until smoke passes'],
  };
}

function print(report, asJson) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log('# operator-agent gateway smoke');
  console.log(`Result: ${report.ok ? 'passed' : 'blocked'}`);
  console.log(`Base URL: ${report.baseUrl}`);
  console.log(`Run mode: ${report.runMode}`);
  for (const step of report.steps) console.log(`- ${step.id}: ${step.ok ? 'ok' : 'blocked'}`);
  if (report.nextActions?.length) {
    console.log('Next actions:');
    for (const action of report.nextActions) console.log(`- ${action}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await smoke(options);
  print(report, options.json);
  process.exitCode = report.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
