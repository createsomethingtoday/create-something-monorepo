#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import http from 'node:http';
import process from 'node:process';

const DEFAULT_HOST = process.env.OPERATOR_AGENT_GATEWAY_HOST || '127.0.0.1';
const DEFAULT_PORT = Number(process.env.OPERATOR_AGENT_GATEWAY_PORT || 19932);
const SCRIPT_PATH = new URL('./operator-agent-system.mjs', import.meta.url).pathname;
const ALLOWED_MODES = new Set([
  'readiness',
  'profiles',
  'policy',
  'scout',
  'batch-eval',
  'pattern-review',
  'model-probe',
  'model-benchmark',
  'memory-proposal',
]);

function jsonResponse(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 32_000) {
        reject(new Error('request body is too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function hasRunAuth(request) {
  const token = process.env.OPERATOR_AGENT_GATEWAY_TOKEN;
  if (!token) return false;
  const auth = request.headers.authorization || '';
  return auth === `Bearer ${token}`;
}

function pushStringArg(args, flag, value) {
  if (typeof value === 'string' && value.trim()) args.push(flag, value.trim());
}

function pushNumberArg(args, flag, value, { min = 1, max = 100 } = {}) {
  if (value === undefined || value === null || value === '') return;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}`);
  }
  args.push(flag, String(parsed));
}

function pushFloatArg(args, flag, value, { min = 0, max = 1 } = {}) {
  if (value === undefined || value === null || value === '') return;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be a number between ${min} and ${max}`);
  }
  args.push(flag, String(parsed));
}

function buildOperatorArgs(input) {
  const mode = String(input.mode || 'readiness');
  if (!ALLOWED_MODES.has(mode)) {
    throw new Error(`mode ${mode} is not exposed by the gateway`);
  }

  const args = [SCRIPT_PATH, mode, '--json'];
  pushStringArg(args, '--surface', input.surface);
  pushStringArg(args, '--target', input.target);
  pushStringArg(args, '--risk', input.risk);
  pushStringArg(args, '--operation', input.operation);
  pushStringArg(args, '--rollback', input.rollback);
  pushStringArg(args, '--base-url', input.baseUrl);
  pushStringArg(args, '--model', input.model);
  pushStringArg(args, '--models', input.models);
  pushNumberArg(args, '--limit', input.limit, { min: 1, max: 20 });
  pushNumberArg(args, '--timeout-ms', input.timeoutMs, { min: 1_000, max: 300_000 });
  pushNumberArg(args, '--attempts', input.attempts, { min: 1, max: 20 });
  pushNumberArg(args, '--receipt-limit', input.receiptLimit, { min: 1, max: 100 });
  pushFloatArg(args, '--min-pass-rate', input.minPassRate);
  if (input.noModel === true) args.push('--no-model');
  if (input.noRevise === true) args.push('--no-revise');
  if (Array.isArray(input.validation)) {
    for (const validation of input.validation.slice(0, 5)) {
      pushStringArg(args, '--validation', validation);
    }
  }
  return args;
}

function runOperatorAgent(input) {
  const args = buildOperatorArgs(input);
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: Number(input.processTimeoutMs || 360_000),
    maxBuffer: 1024 * 1024 * 25,
    env: {
      ...process.env,
      OPERATOR_AGENT_GATEWAY_TOKEN: undefined,
    },
  });

  let report = null;
  try {
    report = JSON.parse(result.stdout || '{}');
  } catch {
    report = null;
  }

  return {
    ok: result.status === 0,
    exitCode: result.status,
    command: ['node', ...args.map((arg) => (arg === input?.baseUrl ? '<base-url>' : arg))].join(' '),
    report,
    stderr: result.stderr,
  };
}

async function handleRun(request, response) {
  if (!hasRunAuth(request)) {
    jsonResponse(response, 401, {
      ok: false,
      error: 'missing or invalid bearer token',
    });
    return;
  }

  let input;
  try {
    const body = await readBody(request);
    input = body.trim() ? JSON.parse(body) : {};
  } catch (error) {
    jsonResponse(response, 400, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  try {
    const result = runOperatorAgent(input);
    jsonResponse(response, result.ok ? 200 : 502, result);
  } catch (error) {
    jsonResponse(response, 400, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);

  if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    jsonResponse(response, 200, {
      name: 'operator-agent-gateway',
      status: 'ok',
      bind: `${DEFAULT_HOST}:${DEFAULT_PORT}`,
      exposedModes: [...ALLOWED_MODES],
      writeModesExposed: false,
      auth: 'Authorization: Bearer <OPERATOR_AGENT_GATEWAY_TOKEN> for /v1/run',
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/v1/run') {
    await handleRun(request, response);
    return;
  }

  jsonResponse(response, 404, { ok: false, error: 'not found' });
});

server.listen(DEFAULT_PORT, DEFAULT_HOST, () => {
  console.log(`operator-agent-gateway listening on http://${DEFAULT_HOST}:${DEFAULT_PORT}`);
});
