#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SERVER_NAME = 'create-something-operator-agent';
const SERVER_VERSION = '0.1.0';
const SCRIPT_DIR = import.meta.dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const SYSTEM_SCRIPT = path.join(SCRIPT_DIR, 'operator-agent-system.mjs');
const DOCTOR_SCRIPT = path.join(SCRIPT_DIR, 'operator-agent-doctor.mjs');
const SCHEDULE_SCRIPT = path.join(SCRIPT_DIR, 'operator-agent-schedule.mjs');
const RUNTIME_SCRIPT = path.join(SCRIPT_DIR, 'operator-agent-runtime.mjs');
const ACCESS_SCRIPT = path.join(SCRIPT_DIR, 'operator-agent-cloudflare-access.mjs');
const SCHEDULE_RECEIPT_DIR = path.join(REPO_ROOT, '.cache/operator-agent-schedule');

const MAX_TIMEOUT_MS = 300_000;

function enumSchema(values, description) {
  return { type: 'string', enum: values, description };
}

const tools = [
  {
    name: 'operator_agent_readiness',
    description: 'Check local CREATE SOMETHING operator-agent readiness without writing code or touching production.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'operator_agent_doctor',
    description:
      'Run the read-only local operator-agent doctor. Reports local readiness, latest receipt health, and public Cloudflare Access blockers without exposing write tools.',
    inputSchema: {
      type: 'object',
      properties: {
        public: { type: 'boolean', description: 'Also run public Cloudflare Access preflight. Default false.' },
        strictPublic: { type: 'boolean', description: 'Fail the doctor if public Access is not ready. Default false.' },
        strictModel: { type: 'boolean', description: 'Fail the doctor unless latest model health is ok. Default false.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: 'operator_agent_completion_audit',
    description:
      'Return the operator-agent completion audit: requirement-by-requirement evidence for local deterministic readiness, model-backed authority, and public Cloudflare Access readiness.',
    inputSchema: {
      type: 'object',
      properties: {
        public: { type: 'boolean', description: 'Also run public Cloudflare Access preflight. Default false.' },
        strictPublic: { type: 'boolean', description: 'Fail the audit if public Access is not ready. Default false.' },
        strictModel: { type: 'boolean', description: 'Fail the audit unless latest model health is ok. Default false.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: 'operator_agent_capabilities',
    description:
      'Inspect the declared local no-write operator-agent profile, including its repository skills, read-only MCP tools, disabled plugins, and denied authority classes.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'operator_agent_pattern_review',
    description:
      'Run all-scope pattern review for CREATE SOMETHING. Defaults to deterministic/no-model because repo-wide pattern review should stay stable even when local models vary.',
    inputSchema: {
      type: 'object',
      properties: {
        patternScope: enumSchema(['all', 'canonical'], 'Pattern review scope. Default: all.'),
        modelPatternReview: {
          type: 'boolean',
          description: 'Experimental: allow model-backed pattern review. Default false.',
        },
        timeoutMs: {
          type: 'integer',
          minimum: 1000,
          maximum: MAX_TIMEOUT_MS,
          description: 'Timeout in milliseconds. Default: 300000.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'operator_agent_model_probe',
    description:
      'Run a cheap strict-JSON probe against the configured local model endpoint. Writes only a local receipt and does not grant patch/revise authority.',
    inputSchema: {
      type: 'object',
      properties: {
        timeoutMs: {
          type: 'integer',
          minimum: 1000,
          maximum: MAX_TIMEOUT_MS,
          description: 'Timeout in milliseconds. Default: 120000.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'operator_agent_model_benchmark',
    description:
      'Run repeated strict-JSON probes per candidate local model and return pass-rate evidence for model-backed promotion. Writes only a local receipt.',
    inputSchema: {
      type: 'object',
      properties: {
        attempts: { type: 'integer', minimum: 1, maximum: 20, description: 'Probe attempts per model. Default: 3.' },
        minPassRate: { type: 'number', minimum: 0, maximum: 1, description: 'Required pass rate. Default: 0.8.' },
        models: { type: 'string', description: 'Comma-separated model names. Default: configured model.' },
        timeoutMs: {
          type: 'integer',
          minimum: 1000,
          maximum: MAX_TIMEOUT_MS,
          description: 'Timeout per probe in milliseconds. Default: 120000.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'operator_agent_batch_eval',
    description:
      'Run a bounded local batch-eval against repo docs. The command may write local receipts but exposes no patch/revise authority.',
    inputSchema: {
      type: 'object',
      properties: {
        surface: { type: 'string', description: 'Repo surface to evaluate. Default: docs/guides.' },
        limit: { type: 'integer', minimum: 1, maximum: 3, description: 'Candidate limit. Default: 1.' },
        noModel: { type: 'boolean', description: 'Disable local model and use deterministic fallback.' },
        timeoutMs: { type: 'integer', minimum: 1000, maximum: MAX_TIMEOUT_MS, description: 'Timeout in milliseconds.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'operator_agent_memory_proposal',
    description:
      'Synthesize durable-context update proposals from recent operator-agent receipts. Does not mutate Codex memory or expose write authority.',
    inputSchema: {
      type: 'object',
      properties: {
        receiptLimit: { type: 'integer', minimum: 1, maximum: 100, description: 'Max receipts to inspect. Default: 12.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'operator_agent_schedule_once',
    description:
      'Run the regular local heartbeat: deterministic all-scope pattern review plus bounded batch-eval. Writes local receipts only.',
    inputSchema: {
      type: 'object',
      properties: {
        evalLimit: { type: 'integer', minimum: 1, maximum: 3, description: 'Batch-eval candidate limit. Default: 1.' },
        noModel: { type: 'boolean', description: 'Disable model-backed batch-eval.' },
        modelPatternReview: { type: 'boolean', description: 'Experimental: model-back pattern review. Default false.' },
        timeoutMs: { type: 'integer', minimum: 1000, maximum: MAX_TIMEOUT_MS, description: 'Timeout in milliseconds.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'operator_agent_runtime_status',
    description: 'Inspect local operator-agent gateway and tunnel process status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'operator_agent_latest_receipt',
    description:
      'Read the latest local operator-agent schedule receipt without running a model or writing new receipts. Use this before deciding whether a new run is needed.',
    inputSchema: {
      type: 'object',
      properties: {
        includeRuns: { type: 'boolean', description: 'Include child run summaries. Default true.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'operator_agent_access_preflight',
    description:
      'Run local or public Cloudflare Access preflight. Public mode verifies Access posture and remains blocked until the dedicated Access token is present.',
    inputSchema: {
      type: 'object',
      properties: {
        public: { type: 'boolean', description: 'Include public hostname and Cloudflare Access verification. Default false.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
];

function integerArg(args, flag, value, { min = 1, max = MAX_TIMEOUT_MS } = {}) {
  if (value === undefined || value === null || value === '') return;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}`);
  }
  args.push(flag, String(parsed));
}

function stringArg(args, flag, value) {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string') throw new Error(`${flag} must be a string`);
  args.push(flag, value);
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('\n}');
  const fallbackEnd = text.lastIndexOf('}');
  if (start < 0 || fallbackEnd <= start) return null;
  const jsonText = end >= start ? text.slice(start, end + 2) : text.slice(start, fallbackEnd + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function runScript(script, args, timeoutMs = 360_000) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024 * 40,
    env: { ...process.env, NO_COLOR: '1', OPERATOR_AGENT_GATEWAY_TOKEN: undefined },
  });
  const report = extractJson(result.stdout || '');
  return {
    ok: result.status === 0,
    exitCode: result.status,
    signal: result.signal,
    report,
    stderrTail: (result.stderr || '').trim().split(/\r?\n/).slice(-8).join('\n'),
  };
}

function readLatestScheduleReceipt({ includeRuns = true } = {}) {
  if (!existsSync(SCHEDULE_RECEIPT_DIR)) {
    return {
      ok: false,
      mode: 'latest-receipt',
      receiptDir: path.relative(REPO_ROOT, SCHEDULE_RECEIPT_DIR),
      error: 'no operator-agent schedule receipt directory exists yet',
      nextActions: ['run operator_agent_schedule_once or pnpm operator-agent:schedule:once -- --json'],
    };
  }
  const receiptFiles = readdirSync(SCHEDULE_RECEIPT_DIR)
    .filter((file) => file.endsWith('schedule-once-local.json'))
    .sort()
    .reverse();
  if (receiptFiles.length === 0) {
    return {
      ok: false,
      mode: 'latest-receipt',
      receiptDir: path.relative(REPO_ROOT, SCHEDULE_RECEIPT_DIR),
      error: 'no schedule-once receipts found',
      nextActions: ['run operator_agent_schedule_once or pnpm operator-agent:schedule:once -- --json'],
    };
  }
  const receiptPath = path.join(SCHEDULE_RECEIPT_DIR, receiptFiles[0]);
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  return {
    ok: true,
    mode: 'latest-receipt',
    receiptPath: path.relative(REPO_ROOT, receiptPath),
    generatedAt: receipt.generatedAt,
    outcome: receipt.outcome,
    passed: receipt.passed,
    modelBacked: receipt.modelBacked,
    patternModelBacked: receipt.patternModelBacked,
    patternScope: receipt.patternScope,
    evalSurface: receipt.evalSurface,
    evalLimit: receipt.evalLimit,
    scorecard: receipt.scorecard,
    nextDecision: receipt.nextDecision,
    nextRecommendedRun: receipt.nextRecommendedRun,
    runs: includeRuns === false ? undefined : receipt.runs?.map((run) => ({
      id: run.id,
      ok: run.ok,
      exitCode: run.exitCode,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      report: run.report,
    })),
  };
}

function contentFor(result) {
  const payload = result.report ?? result;
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
    isError: !result.report && !result.ok,
  };
}

function buildToolRun(name, input) {
  const args = input && typeof input === 'object' ? input : {};
  if (name === 'operator_agent_readiness') {
    return runScript(SYSTEM_SCRIPT, ['readiness', '--json']);
  }
  if (name === 'operator_agent_doctor') {
    const commandArgs = [];
    if (args.public === true) commandArgs.push('--public');
    if (args.strictPublic === true) commandArgs.push('--strict-public');
    if (args.strictModel === true) commandArgs.push('--strict-model');
    commandArgs.push('--json');
    return runScript(DOCTOR_SCRIPT, commandArgs, 240_000);
  }
  if (name === 'operator_agent_completion_audit') {
    const commandArgs = [];
    if (args.public === true) commandArgs.push('--public');
    if (args.strictPublic === true) commandArgs.push('--strict-public');
    if (args.strictModel === true) commandArgs.push('--strict-model');
    commandArgs.push('--json');
    return runScript(DOCTOR_SCRIPT, commandArgs, 240_000);
  }
  if (name === 'operator_agent_capabilities') {
    return runScript(SYSTEM_SCRIPT, ['capabilities', '--json']);
  }
  if (name === 'operator_agent_pattern_review') {
    const commandArgs = ['pattern-review', '--pattern-scope', args.patternScope || 'all'];
    integerArg(commandArgs, '--timeout-ms', args.timeoutMs ?? MAX_TIMEOUT_MS, { min: 1000, max: MAX_TIMEOUT_MS });
    if (args.modelPatternReview !== true) commandArgs.push('--no-model');
    commandArgs.push('--json');
    return runScript(SYSTEM_SCRIPT, commandArgs, Number(args.timeoutMs || MAX_TIMEOUT_MS) + 60_000);
  }
  if (name === 'operator_agent_model_probe') {
    const commandArgs = ['model-probe'];
    integerArg(commandArgs, '--timeout-ms', args.timeoutMs ?? 120_000, { min: 1000, max: MAX_TIMEOUT_MS });
    commandArgs.push('--json');
    return runScript(SYSTEM_SCRIPT, commandArgs, Number(args.timeoutMs || 120_000) + 30_000);
  }
  if (name === 'operator_agent_model_benchmark') {
    const commandArgs = ['model-benchmark'];
    integerArg(commandArgs, '--attempts', args.attempts ?? 3, { min: 1, max: 20 });
    integerArg(commandArgs, '--timeout-ms', args.timeoutMs ?? 120_000, { min: 1000, max: MAX_TIMEOUT_MS });
    if (args.minPassRate !== undefined) {
      const minPassRate = Number(args.minPassRate);
      if (Number.isNaN(minPassRate) || minPassRate < 0 || minPassRate > 1) {
        throw new Error('--min-pass-rate must be between 0 and 1');
      }
      commandArgs.push('--min-pass-rate', String(minPassRate));
    }
    stringArg(commandArgs, '--models', args.models);
    commandArgs.push('--json');
    return runScript(SYSTEM_SCRIPT, commandArgs, Number(args.timeoutMs || 120_000) * Number(args.attempts || 3) + 60_000);
  }
  if (name === 'operator_agent_batch_eval') {
    const commandArgs = ['batch-eval', '--no-revise'];
    stringArg(commandArgs, '--surface', args.surface || 'docs/guides');
    integerArg(commandArgs, '--limit', args.limit ?? 1, { min: 1, max: 3 });
    integerArg(commandArgs, '--timeout-ms', args.timeoutMs ?? MAX_TIMEOUT_MS, { min: 1000, max: MAX_TIMEOUT_MS });
    if (args.noModel === true) commandArgs.push('--no-model');
    commandArgs.push('--json');
    return runScript(SYSTEM_SCRIPT, commandArgs, Number(args.timeoutMs || MAX_TIMEOUT_MS) + 60_000);
  }
  if (name === 'operator_agent_memory_proposal') {
    const commandArgs = ['memory-proposal'];
    integerArg(commandArgs, '--receipt-limit', args.receiptLimit ?? 12, { min: 1, max: 100 });
    commandArgs.push('--json');
    return runScript(SYSTEM_SCRIPT, commandArgs, 120_000);
  }
  if (name === 'operator_agent_schedule_once') {
    const commandArgs = ['once'];
    integerArg(commandArgs, '--eval-limit', args.evalLimit ?? 1, { min: 1, max: 3 });
    integerArg(commandArgs, '--timeout-ms', args.timeoutMs ?? MAX_TIMEOUT_MS, { min: 1000, max: MAX_TIMEOUT_MS });
    if (args.noModel === true) commandArgs.push('--no-model');
    if (args.modelPatternReview === true) commandArgs.push('--model-pattern-review');
    commandArgs.push('--json');
    return runScript(SCHEDULE_SCRIPT, commandArgs, Number(args.timeoutMs || MAX_TIMEOUT_MS) * 2 + 60_000);
  }
  if (name === 'operator_agent_runtime_status') {
    return runScript(RUNTIME_SCRIPT, ['status', '--json']);
  }
  if (name === 'operator_agent_latest_receipt') {
    return {
      ok: true,
      report: readLatestScheduleReceipt({ includeRuns: args.includeRuns !== false }),
    };
  }
  if (name === 'operator_agent_access_preflight') {
    const commandArgs = ['preflight'];
    if (args.public === true) commandArgs.push('--public');
    commandArgs.push('--json');
    return runScript(ACCESS_SCRIPT, commandArgs, 120_000);
  }
  throw new Error(`Unknown operator-agent MCP tool: ${name}`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function success(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function failure(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function handleRequest(message) {
  if (!message || typeof message !== 'object') return;
  if (message.method?.startsWith('notifications/')) return;
  const id = message.id;
  try {
    if (message.method === 'initialize') {
      success(id, {
        protocolVersion: message.params?.protocolVersion || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
      return;
    }
    if (message.method === 'tools/list') {
      success(id, { tools });
      return;
    }
    if (message.method === 'tools/call') {
      const name = message.params?.name;
      const args = message.params?.arguments ?? {};
      success(id, contentFor(buildToolRun(name, args)));
      return;
    }
    failure(id, -32601, `Method not found: ${message.method}`);
  } catch (error) {
    success(id, {
      content: [
        {
          type: 'text',
          text: error instanceof Error ? error.message : String(error),
        },
      ],
      isError: true,
    });
  }
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline = buffer.indexOf('\n');
  while (newline >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (line) {
      try {
        handleRequest(JSON.parse(line));
      } catch (error) {
        failure(null, -32700, error instanceof Error ? error.message : String(error));
      }
    }
    newline = buffer.indexOf('\n');
  }
});

process.stdin.on('end', () => process.exit(0));
console.error(`${SERVER_NAME} MCP server started on stdio`);
