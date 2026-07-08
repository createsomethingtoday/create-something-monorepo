#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_WORKSPACE_NAME = 'Ornith Codebase Loop';
const DEFAULT_SURFACE = 'docs/guides';
const DEFAULT_LIMIT = 3;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_BATCH_TIMEOUT_MS = 60_000;
const DEFAULT_MODEL = process.env.OPERATOR_AGENT_MODEL || 'ornith:9b';
const DEFAULT_BASE_URL = process.env.OPERATOR_AGENT_BASE_URL || 'http://localhost:11434/v1';
const VISIBLE_ORNITH_PROMPT = [
  'Final answer only.',
  'You are Ornith, CREATE SOMETHING local specialized coding worker.',
  'Codex is driving you inside a no-write cmux lane.',
  'The authoritative improvement candidate comes from the operator-agent receipt above.',
  'Do not name files, propose edits, or claim repository inspection unless the prompt includes that evidence.',
  'Briefly summarize your role in this lane and ask Codex for the next bounded target or receipt path.',
].join(' ');

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    dryRun: false,
    focus: true,
    name: DEFAULT_WORKSPACE_NAME,
    surface: DEFAULT_SURFACE,
    limit: DEFAULT_LIMIT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    batchTimeoutMs: DEFAULT_BATCH_TIMEOUT_MS,
    model: DEFAULT_MODEL,
    baseUrl: DEFAULT_BASE_URL,
    skipProbe: false,
    skipBatchEval: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--no-focus') options.focus = false;
    else if (arg === '--skip-probe') options.skipProbe = true;
    else if (arg === '--skip-batch-eval') options.skipBatchEval = true;
    else if (arg === '--name' && next) options.name = argv[++index];
    else if (arg === '--surface' && next) options.surface = argv[++index];
    else if (arg === '--model' && next) options.model = argv[++index];
    else if (arg === '--base-url' && next) options.baseUrl = argv[++index];
    else if (arg === '--limit' && next) options.limit = Number(argv[++index]);
    else if (arg === '--timeout-ms' && next) options.timeoutMs = Number(argv[++index]);
    else if (arg === '--batch-timeout-ms' && next) options.batchTimeoutMs = Number(argv[++index]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 20) {
    throw new Error('--limit must be an integer between 1 and 20');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000 || options.timeoutMs > 900_000) {
    throw new Error('--timeout-ms must be an integer between 1000 and 900000');
  }
  if (
    !Number.isInteger(options.batchTimeoutMs) ||
    options.batchTimeoutMs < 1_000 ||
    options.batchTimeoutMs > 300_000
  ) {
    throw new Error('--batch-timeout-ms must be an integer between 1000 and 300000');
  }

  return options;
}

function usage() {
  return `Usage:
  pnpm cmux:ornith [--dry-run] [--name <workspace>] [--surface <path>] [--limit <n>] [--timeout-ms <ms>] [--batch-timeout-ms <ms>]

Opens a visible cmux workspace for Codex-driven Ornith local codebase work.

Defaults:
  --name       ${DEFAULT_WORKSPACE_NAME}
  --surface    ${DEFAULT_SURFACE}
  --limit      ${DEFAULT_LIMIT}
  --timeout-ms ${DEFAULT_TIMEOUT_MS}
  --batch-timeout-ms ${DEFAULT_BATCH_TIMEOUT_MS}
  --model      ${DEFAULT_MODEL}
  --base-url   ${DEFAULT_BASE_URL}

Safety:
  This lane runs readiness/probe/batch-eval only with visible bounded timeouts.
  Patch/revise authority remains outside this cmux launcher and requires
  explicit Codex/operator review.
`;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function createCommandFile(command, { prefix = 'cmux-ornith-lane-' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const filePath = path.join(dir, 'run.zsh');
  fs.writeFileSync(filePath, `#!/bin/zsh\n${command}\n`, { mode: 0o700 });
  return filePath;
}

function buildInnerCommand(options, repoRoot = process.cwd()) {
  const lines = [
    `cd ${shellQuote(repoRoot)}`,
    'clear',
    'echo "CREATE SOMETHING / Codex-driven Ornith codebase loop"',
    `echo "Model: ${options.model}"`,
    `echo "Endpoint: ${options.baseUrl}"`,
    `echo "Probe timeout: ${options.timeoutMs}ms"`,
    `echo "Batch-eval timeout: ${options.batchTimeoutMs}ms"`,
    'echo "Authority: no-write scout/probe/batch-eval; Codex reviews patches"',
    'echo',
    'echo "== cmux / local model =="',
    'cmux ping || true',
    'ollama list | sed -n "1,12p" || true',
    'echo',
    'echo "== operator-agent doctor =="',
    'corepack pnpm operator-agent:doctor -- --json',
  ];

  if (!options.skipProbe) {
    lines.push(
      'echo',
      'echo "== Ornith model probe =="',
      `OPERATOR_AGENT_MODEL=${shellQuote(options.model)} OPERATOR_AGENT_BASE_URL=${shellQuote(options.baseUrl)} corepack pnpm operator-agent:model-probe -- --timeout-ms ${options.timeoutMs} --json`,
    );
  }

  if (!options.skipBatchEval) {
    lines.push(
      'echo',
      'echo "== bounded batch-eval =="',
      'echo "If model candidate generation times out, operator-agent should fall back to deterministic candidates and write a receipt."',
      `OPERATOR_AGENT_MODEL=${shellQuote(options.model)} OPERATOR_AGENT_BASE_URL=${shellQuote(options.baseUrl)} corepack pnpm operator-agent:batch-eval -- --surface ${shellQuote(options.surface)} --limit ${options.limit} --timeout-ms ${options.batchTimeoutMs} --json`,
    );
  }

  lines.push(
    'echo',
    'echo "== visible Ornith chat =="',
    `ollama run ${shellQuote(options.model)} ${shellQuote(VISIBLE_ORNITH_PROMPT)}`,
    'echo',
    'echo "---"',
    'echo "Lane remains open. Suggested next commands:"',
    'echo "  corepack pnpm operator-agent:batch-eval -- --surface <path> --limit 3 --json"',
    'echo "  corepack pnpm cmux:ornith:receipt"',
    'echo "  ollama run ornith:9b <receipt-backed prompt>"',
    'exec zsh',
  );

  return lines.join('\n');
}

function buildCmuxArgs(options, repoRoot = process.cwd(), commandFilePath = null) {
  const command = commandFilePath
    ? `zsh ${shellQuote(commandFilePath)}`
    : `zsh -lc ${shellQuote(buildInnerCommand(options, repoRoot))}`;
  return [
    'workspace',
    'create',
    '--name',
    options.name,
    '--description',
    'Codex-driven Ornith local codebase improvement lane',
    '--cwd',
    repoRoot,
    '--focus',
    String(options.focus),
    '--command',
    command,
  ];
}

function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(usage());
    return;
  }

  const repoRoot = path.resolve(process.cwd());

  if (options.dryRun) {
    const command = buildInnerCommand(options, repoRoot);
    const args = buildCmuxArgs(options, repoRoot, '/tmp/cmux-ornith-lane/run.zsh');
    console.log(
      JSON.stringify(
        {
          mode: 'cmux-ornith-lane',
          dryRun: true,
          command: ['cmux', ...args],
          commandFile: '/tmp/cmux-ornith-lane/run.zsh',
          commandFileContents: command,
          workspaceName: options.name,
          model: options.model,
          baseUrl: options.baseUrl,
          timeoutMs: options.timeoutMs,
          batchTimeoutMs: options.batchTimeoutMs,
          safety: 'no-write scout/probe/batch-eval; patch/revise requires Codex/operator review',
        },
        null,
        2,
      ),
    );
    return;
  }

  const commandFilePath = createCommandFile(buildInnerCommand(options, repoRoot));
  const args = buildCmuxArgs(options, repoRoot, commandFilePath);

  const result = spawnSync('cmux', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buildCmuxArgs, buildInnerCommand, createCommandFile, parseArgs, shellQuote };
