#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_CASES = 'evals/agent-runtimes/codex-deepagents.cases.json';
const DEFAULT_OUT_DIR = '.cache/codex-deepagents-comparison';
const PINNED_DEEPAGENTS_VERSION = '0.7.8';
const PINNED_LANGCHAIN_OPENAI_VERSION = '1.6.0';
const PINNED_LANGCHAIN_OLLAMA_VERSION = '1.1.0';
const DEFAULT_OPENAI_MODEL = 'gpt-5.5';
const DEFAULT_ORNITH_MODEL = 'ornith:9b';
const ORNITH_RUNTIME = 'deepagents-ornith';

function parseArgs(argv) {
  const options = {
    casesPath: DEFAULT_CASES,
    outDir: DEFAULT_OUT_DIR,
    runtime: 'compare',
    model: null,
    repetitions: 1,
    timeoutMs: 90_000,
    dryRun: false,
    json: false,
    allowFailures: false,
    keepWorkspaces: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    else if (arg === '--cases' && next) options.casesPath = argv[++index];
    else if (arg === '--out-dir' && next) options.outDir = argv[++index];
    else if (arg === '--runtime' && next) options.runtime = argv[++index];
    else if (arg === '--model' && next) options.model = argv[++index];
    else if (arg === '--repetitions' && next) options.repetitions = Number(argv[++index]);
    else if (arg === '--timeout-ms' && next) options.timeoutMs = Number(argv[++index]);
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--allow-failures') options.allowFailures = true;
    else if (arg === '--keep-workspaces') options.keepWorkspaces = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!['compare', 'codex', 'deepagents', ORNITH_RUNTIME].includes(options.runtime)) {
    throw new Error('--runtime must be compare, codex, deepagents, or deepagents-ornith.');
  }
  options.model ??=
    options.runtime === ORNITH_RUNTIME ? DEFAULT_ORNITH_MODEL : DEFAULT_OPENAI_MODEL;
  if (options.runtime === ORNITH_RUNTIME && !options.model.startsWith('ornith:')) {
    throw new Error('--runtime deepagents-ornith requires an Ornith model tag such as ornith:9b.');
  }
  if (
    !Number.isInteger(options.repetitions) ||
    options.repetitions < 1 ||
    options.repetitions > 3
  ) {
    throw new Error('--repetitions must be an integer from 1 to 3.');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000) {
    throw new Error('--timeout-ms must be an integer of at least 1000.');
  }
  return options;
}

function usage() {
  console.log(`Usage:
  pnpm agent:runtime-compare -- [options]

Runs a no-write fixture through the same-model Codex/Deep Agents comparison or
the separately labeled local Deep Agents + Ornith challenger lane.

Options:
  --dry-run                  Validate and describe the shared task pack without model calls.
  --runtime <name>           compare (default), codex, deepagents, or deepagents-ornith.
  --model <name>             OpenAI model, or an Ornith tag for deepagents-ornith. Defaults: gpt-5.5 / ornith:9b.
  --repetitions <1..3>       Run each case this many times. Default: 1.
  --timeout-ms <number>      Per-case runtime limit. Default: 90000.
  --cases <path>             Case file. Default: ${DEFAULT_CASES}.
  --out-dir <path>           Receipt directory. Default: ${DEFAULT_OUT_DIR}.
  --allow-failures           Write a failing receipt and exit zero.
  --keep-workspaces          Preserve disposable fixture copies for debugging.
  --json                     Print the final receipt as JSON.
`);
}

function resolveFromRoot(value) {
  return path.resolve(ROOT, value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function selectedRuntimes(runtime) {
  return runtime === 'compare' ? ['codex', 'deepagents'] : [runtime];
}

function evaluationLane(runtimes) {
  return runtimes.includes(ORNITH_RUNTIME)
    ? 'supplementary-model-and-harness'
    : 'same-model-harness';
}

function modelProvider(runtimes) {
  return runtimes.includes(ORNITH_RUNTIME)
    ? `langchain-ollama==${PINNED_LANGCHAIN_OLLAMA_VERSION}`
    : `langchain-openai==${PINNED_LANGCHAIN_OPENAI_VERSION}`;
}

function assertSuite(suite) {
  if (suite?.suite !== 'codex-deepagents-runtime-comparison') {
    throw new Error('Case file must identify the codex-deepagents-runtime-comparison suite.');
  }
  if (!Array.isArray(suite.cases) || suite.cases.length === 0) {
    throw new Error('Case file must contain at least one comparison case.');
  }
  for (const entry of suite.cases) {
    if (!entry.id || !entry.fixture || !entry.prompt || !entry.expected) {
      throw new Error('Each comparison case needs id, fixture, prompt, and expected fields.');
    }
  }
}

function hashTree(root) {
  const hash = createHash('sha256');
  const visit = (current, relative = '') => {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const child = path.join(current, entry.name);
      const childRelative = path.posix.join(relative, entry.name);
      hash.update(`${entry.isDirectory() ? 'd' : 'f'}:${childRelative}\0`);
      if (entry.isDirectory()) visit(child, childRelative);
      else hash.update(fs.readFileSync(child));
    }
  };
  visit(root);
  return hash.digest('hex');
}

function parseJsonValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function elapsedMs(startedAt) {
  return Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
}

function codexTokenUsage(text) {
  const match = text.match(/tokens used\s+([\d,]+)/i);
  return match ? Number(match[1].replaceAll(',', '')) : null;
}

function failureKind(stdout, stderr, processError, provider = 'openai') {
  const diagnostic = `${stdout}\n${stderr}\n${processError?.message ?? ''}`.toLowerCase();
  if (
    diagnostic.includes('credit_balance_exhausted') ||
    diagnostic.includes('insufficient_quota')
  ) {
    return 'api_quota';
  }
  if (processError?.code === 'ETIMEDOUT') return 'timeout';
  if (
    provider === 'ollama' &&
    (diagnostic.includes('connection refused') ||
      diagnostic.includes('failed to connect') ||
      diagnostic.includes('could not connect'))
  ) {
    return 'local_model_unavailable';
  }
  return null;
}

function runCodex({ workspace, prompt, schemaPath, model, artifactsDir, timeoutMs }) {
  const outputPath = path.join(artifactsDir, 'last-message.json');
  const startedAt = process.hrtime.bigint();
  const processResult = spawnSync(
    'codex',
    [
      'exec',
      '--ephemeral',
      '--skip-git-repo-check',
      '--ignore-user-config',
      '--ignore-rules',
      '--sandbox',
      'read-only',
      '--model',
      model,
      '--cd',
      workspace,
      '--output-schema',
      schemaPath,
      '--output-last-message',
      outputPath,
      prompt
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: timeoutMs }
  );
  const stdout = processResult.stdout ?? '';
  const stderr = processResult.stderr ?? '';
  fs.writeFileSync(path.join(artifactsDir, 'runner.stdout.log'), stdout);
  fs.writeFileSync(path.join(artifactsDir, 'runner.stderr.log'), stderr);
  const rawOutput = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  return {
    runtime: 'codex',
    exitCode: processResult.status ?? 1,
    signal: processResult.signal ?? null,
    durationMs: elapsedMs(startedAt),
    rawOutput,
    parsed: parseJsonValue(rawOutput),
    tokenUsage: codexTokenUsage(`${stdout}\n${stderr}`),
    error: processResult.error?.message ?? null,
    failureKind: failureKind(stdout, stderr, processResult.error),
    config: {
      cli: 'codex exec',
      sandbox: 'read-only',
      ephemeral: true,
      userConfig: 'ignored'
    }
  };
}

function runDeepAgents({ workspace, prompt, model, provider, runtime, artifactsDir, timeoutMs }) {
  const startedAt = process.hrtime.bigint();
  const providerDependency =
    provider === 'ollama'
      ? `langchain-ollama==${PINNED_LANGCHAIN_OLLAMA_VERSION}`
      : `langchain-openai==${PINNED_LANGCHAIN_OPENAI_VERSION}`;
  const processResult = spawnSync(
    'uv',
    [
      'run',
      '--quiet',
      '--with',
      `deepagents==${PINNED_DEEPAGENTS_VERSION}`,
      '--with',
      providerDependency,
      'python',
      path.join(SCRIPT_DIR, 'deepagents-comparison-agent.py'),
      '--workspace',
      workspace,
      '--model',
      model,
      '--provider',
      provider,
      '--prompt',
      prompt
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: timeoutMs }
  );
  const stdout = processResult.stdout ?? '';
  const stderr = processResult.stderr ?? '';
  fs.writeFileSync(path.join(artifactsDir, 'runner.stdout.log'), stdout);
  fs.writeFileSync(path.join(artifactsDir, 'runner.stderr.log'), stderr);
  const envelope = parseJsonValue(stdout);
  return {
    runtime,
    exitCode: processResult.status ?? 1,
    signal: processResult.signal ?? null,
    durationMs: elapsedMs(startedAt),
    rawOutput: stdout,
    parsed: envelope?.result ?? null,
    tokenUsage: envelope?.usage ?? null,
    error:
      processResult.error?.message ??
      envelope?.error ??
      (processResult.status === 0 ? null : stderr.trim() || null),
    failureKind: failureKind(stdout, stderr, processResult.error, provider),
    config: {
      sdk: `deepagents==${PINNED_DEEPAGENTS_VERSION}`,
      modelProvider: providerDependency,
      evaluationLane:
        provider === 'ollama' ? 'supplementary-model-and-harness' : 'same-model-harness',
      backend: 'FilesystemBackend virtual_mode=true',
      filesystemTools: ['ls', 'read_file', 'glob', 'grep'],
      writePermissions: 'deny /**'
    }
  };
}

function assess({ execution, expected, beforeDigest, afterDigest }) {
  const failures = [];
  const result = execution.parsed;
  const blocked = ['api_quota', 'local_model_unavailable'].includes(execution.failureKind);
  if (blocked) {
    return {
      passed: false,
      blocked: true,
      failures: [`blocked_${execution.failureKind}`],
      fixtureDigestBefore: beforeDigest,
      fixtureDigestAfter: afterDigest,
      fixtureUnchanged: beforeDigest === afterDigest
    };
  }
  if (execution.exitCode !== 0) failures.push(`runner_exit_${execution.exitCode}`);
  if (!result || typeof result !== 'object') failures.push('missing_structured_result');
  if (beforeDigest !== afterDigest) failures.push('fixture_changed');
  if (result?.noWriteConfirmation !== true) failures.push('missing_no_write_confirmation');
  if (result?.status !== expected.status) failures.push(`status_expected_${expected.status}`);
  const evidence = Array.isArray(result?.evidence) ? result.evidence.join(' ').toLowerCase() : '';
  for (const source of expected.evidenceIncludes ?? []) {
    if (!evidence.includes(source.toLowerCase())) failures.push(`missing_evidence_${source}`);
  }
  const decision = String(result?.decision ?? '').toLowerCase();
  for (const value of expected.decisionIncludes ?? []) {
    if (!decision.includes(value.toLowerCase())) failures.push(`missing_decision_${value}`);
  }
  const recovery = String(result?.recovery ?? '').toLowerCase();
  for (const value of expected.recoveryIncludes ?? []) {
    if (!recovery.includes(value.toLowerCase())) failures.push(`missing_recovery_${value}`);
  }
  return {
    passed: failures.length === 0,
    blocked: false,
    failures,
    fixtureDigestBefore: beforeDigest,
    fixtureDigestAfter: afterDigest,
    fixtureUnchanged: beforeDigest === afterDigest
  };
}

function runCase({ suite, entry, runtime, attempt, options, runRoot, schemaPath, fixtureRoot }) {
  const fixtureSource = path.join(fixtureRoot, entry.fixture);
  if (!fs.statSync(fixtureSource).isDirectory()) {
    throw new Error(`Fixture directory is missing for ${entry.id}: ${fixtureSource}`);
  }
  const artifactsDir = path.join(
    runRoot,
    `${String(attempt).padStart(2, '0')}-${runtime}-${entry.id}`
  );
  fs.mkdirSync(artifactsDir, { recursive: true });
  const workspace = fs.mkdtempSync(path.join(runRoot, `workspace-${runtime}-${entry.id}-`));
  fs.cpSync(fixtureSource, workspace, { recursive: true });
  const beforeDigest = hashTree(workspace);
  const execution =
    runtime === 'codex'
      ? runCodex({
          workspace,
          prompt: entry.prompt,
          schemaPath,
          model: options.model,
          artifactsDir,
          timeoutMs: options.timeoutMs
        })
      : runDeepAgents({
          workspace,
          prompt: entry.prompt,
          model: options.model,
          provider: runtime === ORNITH_RUNTIME ? 'ollama' : 'openai',
          runtime,
          artifactsDir,
          timeoutMs: options.timeoutMs
        });
  const afterDigest = hashTree(workspace);
  const assessment = assess({ execution, expected: entry.expected, beforeDigest, afterDigest });
  const receipt = {
    suite: suite.suite,
    suiteVersion: suite.version,
    runtime,
    model: options.model,
    caseId: entry.id,
    attempt,
    noWrite: true,
    execution,
    assessment
  };
  writeJson(path.join(artifactsDir, 'receipt.json'), receipt);
  if (!options.keepWorkspaces) fs.rmSync(workspace, { recursive: true, force: true });
  return receipt;
}

function renderHuman(report) {
  console.log(`# ${report.suite}`);
  console.log(`Result: ${report.result}`);
  console.log(`Model: ${report.model}`);
  console.log(`Runtimes: ${report.runtimes.join(', ')}`);
  console.log(
    `Cases: ${report.summary.total} total / ${report.summary.passed} passed / ${report.summary.blocked} blocked / ${report.summary.failed} failed`
  );
  console.log(`Receipt: ${report.receiptPath}`);
  for (const entry of report.runs.filter((run) => !run.assessment.passed)) {
    console.log(
      `- ${entry.runtime} ${entry.caseId} attempt ${entry.attempt}: ${entry.assessment.failures.join(', ')}`
    );
  }
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help) return usage();
  const casesPath = resolveFromRoot(options.casesPath);
  const suite = readJson(casesPath);
  assertSuite(suite);
  const runtimes = selectedRuntimes(options.runtime);
  const schemaPath = resolveFromRoot(suite.resultSchema);
  const fixtureRoot = resolveFromRoot(suite.fixtureRoot);
  if (!fs.existsSync(schemaPath) || !fs.statSync(fixtureRoot).isDirectory()) {
    throw new Error('Case file references a missing result schema or fixture root.');
  }

  if (options.dryRun) {
    const report = {
      suite: suite.suite,
      version: suite.version,
      mode: 'dry-run',
      runtimes,
      model: options.model,
      noWrite: true,
      deepAgentsVersion: PINNED_DEEPAGENTS_VERSION,
      langchainOpenaiVersion: PINNED_LANGCHAIN_OPENAI_VERSION,
      langchainOllamaVersion: PINNED_LANGCHAIN_OLLAMA_VERSION,
      evaluationLane: evaluationLane(runtimes),
      modelProvider: modelProvider(runtimes),
      cases: suite.cases.map(({ id, fixture, expected }) => ({ id, fixture, expected }))
    };
    console.log(JSON.stringify(report));
    return;
  }

  const runRoot = path.resolve(
    ROOT,
    options.outDir,
    new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
  );
  fs.mkdirSync(runRoot, { recursive: true });
  const runs = [];
  for (let attempt = 1; attempt <= options.repetitions; attempt += 1) {
    for (const runtime of runtimes) {
      for (const entry of suite.cases) {
        runs.push(
          runCase({ suite, entry, runtime, attempt, options, runRoot, schemaPath, fixtureRoot })
        );
      }
    }
  }
  const summary = {
    total: runs.length,
    passed: runs.filter((run) => run.assessment.passed).length,
    blocked: runs.filter((run) => run.assessment.blocked).length,
    failed: runs.filter((run) => !run.assessment.passed && !run.assessment.blocked).length
  };
  const receiptPath = path.join(runRoot, 'comparison-receipt.json');
  const report = {
    suite: suite.suite,
    version: suite.version,
    mode: 'model-backed',
    result: summary.blocked > 0 ? 'blocked' : summary.failed === 0 ? 'pass' : 'degraded',
    runtimes,
    model: options.model,
    repetitions: options.repetitions,
    timeoutMs: options.timeoutMs,
    noWrite: true,
    deepAgentsVersion: PINNED_DEEPAGENTS_VERSION,
    langchainOpenaiVersion: PINNED_LANGCHAIN_OPENAI_VERSION,
    langchainOllamaVersion: PINNED_LANGCHAIN_OLLAMA_VERSION,
    evaluationLane: evaluationLane(runtimes),
    modelProvider: modelProvider(runtimes),
    platform: { os: process.platform, arch: process.arch, host: os.hostname() },
    receiptPath,
    summary,
    runs
  };
  writeJson(receiptPath, report);
  if (options.json) console.log(JSON.stringify(report));
  else renderHuman(report);
  if ((summary.failed > 0 || summary.blocked > 0) && !options.allowFailures) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}
