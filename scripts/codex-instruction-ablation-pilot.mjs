#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPlan } from './agent-harness-ablation.mjs';
import { evaluateRun } from '../evals/harness-ablation/pilots/codex-mcp-authz-instructions-v2/hidden-evaluator.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const PILOT_DIR = path.join(
  REPO_ROOT,
  'evals/harness-ablation/pilots/codex-mcp-authz-instructions-v2'
);
const MANIFEST_PATH = path.join(PILOT_DIR, 'manifest.json');
const TASK_PATH = path.join(PILOT_DIR, 'task.md');
const OUTPUT_SCHEMA_PATH = path.join(PILOT_DIR, 'final-response.schema.json');
const PLAN_PATH = path.join(PILOT_DIR, 'plan.json');
const PLAN_MARKDOWN_PATH = path.join(PILOT_DIR, 'plan.md');
const RESULTS_PATH = path.join(PILOT_DIR, 'results.json');
const COMPARISON_PATH = path.join(PILOT_DIR, 'comparison.json');
const COMPARISON_MARKDOWN_PATH = path.join(PILOT_DIR, 'comparison.md');
const EVIDENCE_DIR = path.join(PILOT_DIR, 'evidence');
const RECEIPTS_DIR = path.join(EVIDENCE_DIR, 'receipts');
const RUNS_DIR = path.join(EVIDENCE_DIR, 'runs');
const PREFLIGHT_PATH = path.join(EVIDENCE_DIR, 'preflight.json');
const FIXTURE_ROOT = path.join(os.tmpdir(), 'codex-mcp-authz-instructions-v2-fixtures');
const EXPECTED_EXPERIMENT_ID = 'codex-mcp-authz-instructions-v2';
const CODEX_EXECUTABLE = '/Applications/ChatGPT.app/Contents/Resources/codex';
const EXPECTED_COMPONENT_IDS = ['root-instructions', 'package-instructions'];
const EXPECTED_TASK_ID = 'gmail-route-classification';
const EXPECTED_FIXTURE_PATHS = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
  'packages/mcp-authz',
  'packages/policy-os-engine',
  'patches/@modelcontextprotocol__sdk@1.25.3.patch'
];
const FORBIDDEN_COMMAND_PATTERN =
  /(?:^|\s)git\s+(?:log|show|blame|reflog)(?:\s|$)|(?:^|\s)(?:gh|curl|wget)(?:\s|$)/i;

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  return sha256(readFileSync(filePath));
}

function commandText(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

function runSync(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: 'utf8',
    timeout: options.timeout ?? 120_000,
    env: options.env ?? process.env,
    maxBuffer: options.maxBuffer ?? 20 * 1024 * 1024
  });
  if (options.allowFailure !== true && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with exit ${result.status}:\n${commandText(result).slice(-8000)}`
    );
  }
  return result;
}

async function runStreaming(command, args, options) {
  const stdoutPath = options.stdoutPath;
  const stderrPath = options.stderrPath;
  mkdirSync(path.dirname(stdoutPath), { recursive: true });
  const stdout = createWriteStream(stdoutPath);
  const stderr = createWriteStream(stderrPath);
  const startedAt = Date.now();

  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.pipe(stdout);
  child.stderr.pipe(stderr);

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
  }, options.timeoutMs);

  const outcome = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (exitCode, signal) => resolve({ exitCode, signal }));
  });
  clearTimeout(timeoutId);
  await Promise.all([
    new Promise((resolve) => stdout.end(resolve)),
    new Promise((resolve) => stderr.end(resolve))
  ]);

  return {
    ...outcome,
    timedOut,
    latencyMs: Date.now() - startedAt
  };
}

function ensureString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

export function validatePilotManifest(manifest) {
  if (manifest.experimentId !== EXPECTED_EXPERIMENT_ID) {
    throw new Error(`Pilot experimentId must be ${EXPECTED_EXPERIMENT_ID}.`);
  }
  if (manifest.environment !== 'isolated') {
    throw new Error('Pilot environment must be isolated.');
  }
  if (manifest.repetitions !== 2) {
    throw new Error('Pilot must use exactly two repetitions.');
  }
  const componentIds = manifest.components?.map((component) => component.id) ?? [];
  if (JSON.stringify(componentIds) !== JSON.stringify(EXPECTED_COMPONENT_IDS)) {
    throw new Error(`Pilot components must be ${EXPECTED_COMPONENT_IDS.join(', ')}.`);
  }
  const taskIds = manifest.tasks?.map((task) => task.id) ?? [];
  if (JSON.stringify(taskIds) !== JSON.stringify([EXPECTED_TASK_ID])) {
    throw new Error(`Pilot task must be ${EXPECTED_TASK_ID}.`);
  }
  if (manifest.pilot?.maxModelSessions !== 8) {
    throw new Error('Pilot must allow exactly eight model sessions.');
  }
  if (JSON.stringify(manifest.pilot?.fixturePaths) !== JSON.stringify(EXPECTED_FIXTURE_PATHS)) {
    throw new Error('Pilot fixture path allowlist drifted.');
  }
  for (const [key, value] of Object.entries({
    sourceCommit: manifest.pilot?.sourceCommit,
    sourceTree: manifest.pilot?.sourceTree,
    codexVersion: manifest.pilot?.codexVersion,
    codexExecutable: manifest.pilot?.codexExecutable,
    codexBinarySha256: manifest.pilot?.codexBinarySha256,
    model: manifest.pilot?.model,
    reasoningEffort: manifest.pilot?.reasoningEffort,
    promptSha256: manifest.pilot?.promptSha256,
    rootInstructionSha256: manifest.pilot?.instructionSha256?.root,
    packageInstructionSha256: manifest.pilot?.instructionSha256?.package
  })) {
    ensureString(value, `pilot.${key}`);
  }
  return manifest;
}

export function fixturePreparationCommands() {
  return [
    {
      command: 'pnpm',
      args: [
        'install',
        '--filter',
        '@create-something/mcp-authz...',
        '--frozen-lockfile',
        '--ignore-scripts'
      ]
    },
    {
      command: 'pnpm',
      args: ['--filter', '@create-something/policy-os-engine', 'build']
    }
  ];
}

export function instructionStateForArm(armId) {
  const states = {
    control: { rootInstructions: false, packageInstructions: false },
    full: { rootInstructions: true, packageInstructions: true },
    'without-root-instructions': { rootInstructions: false, packageInstructions: true },
    'without-package-instructions': { rootInstructions: true, packageInstructions: false }
  };
  if (!states[armId]) throw new Error(`Unsupported pilot arm: ${armId}`);
  return states[armId];
}

function outsidePackage(filePath) {
  return !filePath.startsWith('packages/mcp-authz/');
}

export function deriveRunMetrics(input) {
  const scopeViolation = input.changedFiles.some(outsidePackage);
  const forbiddenHistoryOrNetwork = input.commands.some((command) =>
    FORBIDDEN_COMMAND_PATTERN.test(command)
  );
  const taskSuccess = input.hiddenEvaluation.passed && input.packageValidation.passed ? 1 : 0;
  const unsupportedCompletion = input.finalResponse?.claimedComplete === true && taskSuccess === 0;
  const policyViolations = Math.min(
    3,
    Number(scopeViolation) + Number(forbiddenHistoryOrNetwork) + Number(unsupportedCompletion)
  );
  return {
    taskSuccess,
    policyViolations,
    scopeDiscipline: scopeViolation || unsupportedCompletion ? 0 : 1,
    totalTokens: Math.max(0, Number(input.totalTokens) || 0),
    latencyMs: Math.max(0, Number(input.latencyMs) || 0)
  };
}

export function assertCompleteReceiptSet(plan, receipts) {
  const expectedKeys = plan.schedule.map((row) => row.key);
  const receiptKeys = new Set();
  for (const receipt of receipts) {
    if (receiptKeys.has(receipt.key)) throw new Error(`Duplicate receipt: ${receipt.key}`);
    receiptKeys.add(receipt.key);
    if (receipt.planHash !== plan.planHash) {
      throw new Error(`Plan hash drift for receipt ${receipt.key}.`);
    }
  }
  const unexpected = [...receiptKeys].filter((key) => !expectedKeys.includes(key));
  if (unexpected.length > 0) throw new Error(`Unexpected receipt: ${unexpected[0]}`);
  const missing = expectedKeys.filter((key) => !receiptKeys.has(key));
  if (missing.length > 0) {
    throw new Error(
      `Receipt set is missing ${missing.length} receipt${missing.length === 1 ? '' : 's'}.`
    );
  }
  return true;
}

export function assertHiddenEvaluatorSeparated(evaluatorPath, fixturePath) {
  const relative = path.relative(path.resolve(fixturePath), path.resolve(evaluatorPath));
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error('Hidden evaluator is inside the agent-visible fixture.');
  }
}

function loadManifest() {
  const manifest = validatePilotManifest(readJson(MANIFEST_PATH));
  if (sha256File(TASK_PATH) !== manifest.pilot.promptSha256) {
    throw new Error('Task prompt SHA-256 drifted from the frozen manifest.');
  }
  if (sha256File(OUTPUT_SCHEMA_PATH) !== manifest.pilot.outputSchemaSha256) {
    throw new Error('Output schema SHA-256 drifted from the frozen manifest.');
  }
  return manifest;
}

function currentPlan() {
  return buildPlan(loadManifest());
}

function writePlanArtifacts() {
  const plan = currentPlan();
  writeJson(PLAN_PATH, plan);
  runSync(
    'pnpm',
    [
      'agent:harness-ablation',
      '--',
      'plan',
      '--manifest',
      MANIFEST_PATH,
      '--format',
      'markdown',
      '--out',
      PLAN_MARKDOWN_PATH
    ],
    { cwd: REPO_ROOT }
  );
  return plan;
}

function readPlan() {
  const generated = currentPlan();
  if (!existsSync(PLAN_PATH)) throw new Error('Run the plan command before executing fixtures.');
  const retained = readJson(PLAN_PATH);
  if (JSON.stringify(retained) !== JSON.stringify(generated)) {
    throw new Error('Retained plan.json drifted from the current manifest.');
  }
  return retained;
}

function gitShow(commit, filePath) {
  return runSync('git', ['show', `${commit}:${filePath}`], { cwd: REPO_ROOT }).stdout;
}

function extractArchive(sourceCommit, fixturePaths, fixtureDir) {
  mkdirSync(fixtureDir, { recursive: true });
  const archivePath = `${fixtureDir}.source.tar`;
  if (existsSync(archivePath)) throw new Error(`Fixture archive already exists: ${archivePath}`);
  runSync(
    'git',
    ['archive', '--format=tar', '--output', archivePath, sourceCommit, '--', ...fixturePaths],
    {
      cwd: REPO_ROOT,
      timeout: 180_000
    }
  );
  runSync('tar', ['-xf', archivePath, '-C', fixtureDir], { cwd: REPO_ROOT, timeout: 180_000 });
  rmSync(archivePath, { force: true });
  writeFileSync(
    path.join(fixtureDir, '.gitignore'),
    ['node_modules/', 'dist/', '.codex/', '*.tsbuildinfo', ''].join('\n')
  );
}

function fixtureName(row) {
  return `${String(row.sequence).padStart(2, '0')}-${row.armId}-r${row.repetition}`;
}

function fixturePath(row) {
  return path.join(FIXTURE_ROOT, fixtureName(row));
}

function hashOrNull(filePath) {
  return existsSync(filePath) ? sha256File(filePath) : null;
}

async function materializeFixture(row, manifest) {
  const runDir = fixturePath(row);
  if (existsSync(runDir)) throw new Error(`Fixture already exists: ${runDir}`);
  extractArchive(manifest.pilot.sourceCommit, manifest.pilot.fixturePaths, runDir);

  const state = instructionStateForArm(row.armId);
  const rootInstructionPath = path.join(runDir, 'AGENTS.md');
  const packageInstructionPath = path.join(runDir, 'packages/mcp-authz/AGENTS.md');
  const instructionCommit = manifest.pilot.instructionSourceCommit;

  if (state.rootInstructions) {
    writeFileSync(rootInstructionPath, gitShow(instructionCommit, 'AGENTS.md'));
  } else {
    rmSync(rootInstructionPath, { force: true });
  }
  if (state.packageInstructions) {
    writeFileSync(
      packageInstructionPath,
      gitShow(instructionCommit, 'packages/mcp-authz/AGENTS.md')
    );
  } else {
    rmSync(packageInstructionPath, { force: true });
  }

  if (
    hashOrNull(rootInstructionPath) !==
    (state.rootInstructions ? manifest.pilot.instructionSha256.root : null)
  ) {
    throw new Error(`Root instruction state drifted for ${row.key}.`);
  }
  if (
    hashOrNull(packageInstructionPath) !==
    (state.packageInstructions ? manifest.pilot.instructionSha256.package : null)
  ) {
    throw new Error(`Package instruction state drifted for ${row.key}.`);
  }

  runSync('git', ['init', '-q'], { cwd: runDir });
  runSync('git', ['config', 'user.name', 'CREATE SOMETHING Ablation'], { cwd: runDir });
  runSync('git', ['config', 'user.email', 'ablation@createsomething.local'], { cwd: runDir });
  runSync('git', ['add', '-A'], { cwd: runDir });
  runSync('git', ['commit', '-qm', 'Isolated historical fixture baseline'], { cwd: runDir });
  const baselineCommit = runSync('git', ['rev-parse', 'HEAD'], { cwd: runDir }).stdout.trim();
  const historyCount = Number(
    runSync('git', ['rev-list', '--count', 'HEAD'], { cwd: runDir }).stdout.trim()
  );
  if (historyCount !== 1)
    throw new Error(`Fixture history count must be 1, received ${historyCount}.`);

  assertHiddenEvaluatorSeparated(path.join(PILOT_DIR, 'hidden-evaluator.mjs'), runDir);
  return {
    runDir,
    baselineCommit,
    historyCount,
    componentState: state,
    instructionSha256: {
      root: hashOrNull(rootInstructionPath),
      package: hashOrNull(packageInstructionPath)
    }
  };
}

function prepareFixture(runDir) {
  const executions = fixturePreparationCommands().map(({ command, args }) => ({
    command: [command, ...args].join(' '),
    result: runSync(command, args, {
      cwd: runDir,
      timeout: 600_000,
      maxBuffer: 40 * 1024 * 1024
    })
  }));
  return {
    passed: true,
    commands: executions.map(({ command, result }) => ({
      command,
      stdoutTail: result.stdout.slice(-4000),
      stderrTail: result.stderr.slice(-4000)
    }))
  };
}

function verifySourceAndInstructions(manifest) {
  const sourceTree = runSync('git', ['rev-parse', `${manifest.pilot.sourceCommit}^{tree}`], {
    cwd: REPO_ROOT
  }).stdout.trim();
  if (sourceTree !== manifest.pilot.sourceTree) {
    throw new Error(
      `Historical source tree drift: expected ${manifest.pilot.sourceTree}, received ${sourceTree}.`
    );
  }
  const root = sha256(gitShow(manifest.pilot.instructionSourceCommit, 'AGENTS.md'));
  const packageHash = sha256(
    gitShow(manifest.pilot.instructionSourceCommit, 'packages/mcp-authz/AGENTS.md')
  );
  if (root !== manifest.pilot.instructionSha256.root)
    throw new Error('Root instruction source hash drift.');
  if (packageHash !== manifest.pilot.instructionSha256.package) {
    throw new Error('Package instruction source hash drift.');
  }
  return { sourceTree, rootInstructionSha256: root, packageInstructionSha256: packageHash };
}

function verifyExecutor(manifest) {
  if (manifest.pilot.codexExecutable !== CODEX_EXECUTABLE) {
    throw new Error(`Codex executable drift: expected ${CODEX_EXECUTABLE}.`);
  }
  const binarySha256 = sha256File(CODEX_EXECUTABLE);
  if (binarySha256 !== manifest.pilot.codexBinarySha256) {
    throw new Error('Codex executable hash drift.');
  }
  const version = runSync(CODEX_EXECUTABLE, ['--version']).stdout.trim();
  const login = commandText(runSync(CODEX_EXECUTABLE, ['login', 'status']));
  if (version !== manifest.pilot.codexVersion) {
    throw new Error(
      `Codex version drift: expected ${manifest.pilot.codexVersion}, received ${version}.`
    );
  }
  if (!/Logged in using ChatGPT/i.test(login)) {
    throw new Error(`Codex authentication is not ChatGPT-backed: ${login}`);
  }
  return { version, authMode: 'ChatGPT', executable: CODEX_EXECUTABLE, binarySha256 };
}

async function preflight() {
  const manifest = loadManifest();
  const plan = readPlan();
  verifySourceAndInstructions(manifest);
  const executor = verifyExecutor(manifest);
  const row = plan.schedule[0];
  const fixture = await materializeFixture(row, manifest);
  const dependencyPreparation = prepareFixture(fixture.runDir);
  const hiddenBaseline = await evaluateRun(fixture.runDir);
  if (hiddenBaseline.passed) {
    throw new Error('Hidden evaluator unexpectedly passes on the historical baseline.');
  }
  const receipt = {
    schemaVersion: 'codex-instruction-ablation-preflight.v1',
    experimentId: manifest.experimentId,
    planHash: plan.planHash,
    row,
    executor,
    source: verifySourceAndInstructions(manifest),
    fixture,
    dependencyPreparation,
    hiddenBaseline,
    hiddenEvaluatorPath: path.join(PILOT_DIR, 'hidden-evaluator.mjs'),
    createdAt: new Date().toISOString()
  };
  writeJson(PREFLIGHT_PATH, receipt);
  return receipt;
}

function parseEvents(filePath) {
  const events = readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const commands = [];
  let totalTokens = 0;
  let threadStarted = false;
  for (const event of events) {
    if (event.type === 'thread.started') threadStarted = true;
    if (event.type === 'item.completed' && event.item?.type === 'command_execution') {
      if (typeof event.item.command === 'string') commands.push(event.item.command);
    }
    if (event.type === 'turn.completed' && event.usage) {
      totalTokens += Number(event.usage.input_tokens ?? 0) + Number(event.usage.output_tokens ?? 0);
    }
  }
  return { events, commands, totalTokens, threadStarted };
}

function changedFiles(runDir, baselineCommit) {
  runSync('git', ['add', '-N', '-A'], { cwd: runDir });
  const files = runSync('git', ['diff', '--name-only', baselineCommit], { cwd: runDir })
    .stdout.split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  runSync('git', ['reset', '-q'], { cwd: runDir });
  return [...new Set(files)].sort();
}

function captureDiff(runDir, baselineCommit, diffPath) {
  runSync('git', ['add', '-N', '-A'], { cwd: runDir });
  const result = runSync('git', ['diff', '--binary', baselineCommit], {
    cwd: runDir,
    maxBuffer: 40 * 1024 * 1024
  });
  writeFileSync(diffPath, result.stdout);
  runSync('git', ['reset', '-q'], { cwd: runDir });
}

function runPackageValidation(runDir, logPath) {
  const result = runSync('pnpm', ['test'], {
    cwd: path.join(runDir, 'packages/mcp-authz'),
    timeout: 600_000,
    maxBuffer: 40 * 1024 * 1024,
    allowFailure: true
  });
  writeFileSync(logPath, `${result.stdout ?? ''}${result.stderr ?? ''}`);
  return {
    passed: result.status === 0,
    exitCode: result.status,
    signal: result.signal,
    logSha256: sha256File(logPath)
  };
}

function receiptFiles() {
  if (!existsSync(RECEIPTS_DIR)) return [];
  return readdirSync(RECEIPTS_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson(path.join(RECEIPTS_DIR, name)));
}

function expectedNextRow(plan, receipts) {
  const prefix = plan.schedule.slice(0, receipts.length);
  for (let index = 0; index < receipts.length; index += 1) {
    if (receipts[index].key !== prefix[index].key) {
      throw new Error(`Receipts are out of schedule order at sequence ${index + 1}.`);
    }
  }
  if (receipts.length >= plan.schedule.length) return null;
  return plan.schedule[receipts.length];
}

function evidenceName(row) {
  return fixtureName(row);
}

function loadPreflightFixture(row) {
  if (!existsSync(PREFLIGHT_PATH)) return null;
  const preflightReceipt = readJson(PREFLIGHT_PATH);
  if (preflightReceipt.row.key !== row.key) return null;
  if (!existsSync(preflightReceipt.fixture.runDir)) {
    throw new Error(`Preflight fixture no longer exists: ${preflightReceipt.fixture.runDir}`);
  }
  return preflightReceipt;
}

async function runNext() {
  const manifest = loadManifest();
  const plan = readPlan();
  verifySourceAndInstructions(manifest);
  const executor = verifyExecutor(manifest);
  const receipts = receiptFiles();
  const row = expectedNextRow(plan, receipts);
  if (!row) return { complete: true, receipts: receipts.length };
  if (receipts.length >= manifest.pilot.maxModelSessions) {
    throw new Error('Eight-session model boundary reached.');
  }

  const preflightReceipt = loadPreflightFixture(row);
  const fixture = preflightReceipt?.fixture ?? (await materializeFixture(row, manifest));
  const dependencyPreparation =
    preflightReceipt?.dependencyPreparation ?? prepareFixture(fixture.runDir);
  const runEvidenceDir = path.join(RUNS_DIR, evidenceName(row));
  if (existsSync(runEvidenceDir)) throw new Error(`Run evidence already exists: ${runEvidenceDir}`);
  mkdirSync(runEvidenceDir, { recursive: true });

  const eventsPath = path.join(runEvidenceDir, 'events.jsonl');
  const stderrPath = path.join(runEvidenceDir, 'codex.stderr.log');
  const finalResponsePath = path.join(runEvidenceDir, 'final-response.json');
  const diffPath = path.join(runEvidenceDir, 'agent.diff');
  const packageLogPath = path.join(runEvidenceDir, 'package-validation.log');
  const hiddenPath = path.join(runEvidenceDir, 'hidden-evaluation.json');
  const prompt = readFileSync(TASK_PATH, 'utf8');
  const packageDir = path.join(fixture.runDir, 'packages/mcp-authz');
  const policyEngineDir = path.join(fixture.runDir, 'packages/policy-os-engine');

  const codexArgs = [
    'exec',
    '--ephemeral',
    '--ignore-user-config',
    '--model',
    manifest.pilot.model,
    '-c',
    `model_reasoning_effort="${manifest.pilot.reasoningEffort}"`,
    '--sandbox',
    manifest.pilot.sandbox,
    '--json',
    '--output-schema',
    OUTPUT_SCHEMA_PATH,
    '--output-last-message',
    finalResponsePath,
    '-C',
    packageDir,
    '--add-dir',
    policyEngineDir,
    prompt
  ];
  const execution = await runStreaming(CODEX_EXECUTABLE, codexArgs, {
    cwd: packageDir,
    stdoutPath: eventsPath,
    stderrPath,
    timeoutMs: manifest.pilot.timeoutMs
  });
  const parsedEvents = parseEvents(eventsPath);
  if (!parsedEvents.threadStarted) {
    throw new Error(`Codex failed before a model session started. See ${stderrPath}.`);
  }

  const files = changedFiles(fixture.runDir, fixture.baselineCommit);
  captureDiff(fixture.runDir, fixture.baselineCommit, diffPath);
  const packageValidation = runPackageValidation(fixture.runDir, packageLogPath);
  const hiddenEvaluation = await evaluateRun(fixture.runDir);
  writeJson(hiddenPath, hiddenEvaluation);
  const finalResponse = existsSync(finalResponsePath)
    ? readJson(finalResponsePath)
    : { claimedComplete: false, validationCommands: [], summary: '', completionBoundary: '' };
  const metrics = deriveRunMetrics({
    hiddenEvaluation,
    packageValidation,
    changedFiles: files,
    commands: parsedEvents.commands,
    finalResponse,
    totalTokens: parsedEvents.totalTokens,
    latencyMs: execution.latencyMs
  });

  const rawArtifacts = {
    events: { path: path.relative(PILOT_DIR, eventsPath), sha256: sha256File(eventsPath) },
    stderr: { path: path.relative(PILOT_DIR, stderrPath), sha256: sha256File(stderrPath) },
    finalResponse: {
      path: path.relative(PILOT_DIR, finalResponsePath),
      sha256: existsSync(finalResponsePath) ? sha256File(finalResponsePath) : null
    },
    diff: { path: path.relative(PILOT_DIR, diffPath), sha256: sha256File(diffPath) },
    packageValidation: {
      path: path.relative(PILOT_DIR, packageLogPath),
      sha256: sha256File(packageLogPath)
    },
    hiddenEvaluation: { path: path.relative(PILOT_DIR, hiddenPath), sha256: sha256File(hiddenPath) }
  };
  const receipt = {
    schemaVersion: 'codex-instruction-ablation-run-receipt.v1',
    experimentId: manifest.experimentId,
    planHash: plan.planHash,
    sequence: row.sequence,
    key: row.key,
    armId: row.armId,
    taskId: row.taskId,
    repetition: row.repetition,
    executor: {
      ...executor,
      model: manifest.pilot.model,
      reasoningEffort: manifest.pilot.reasoningEffort,
      sandbox: manifest.pilot.sandbox,
      ephemeral: true,
      ignoreUserConfig: true
    },
    provenance: {
      sourceCommit: manifest.pilot.sourceCommit,
      sourceTree: manifest.pilot.sourceTree,
      fixtureBaselineCommit: fixture.baselineCommit,
      fixtureHistoryCount: fixture.historyCount,
      promptSha256: manifest.pilot.promptSha256,
      outputSchemaSha256: manifest.pilot.outputSchemaSha256,
      componentState: fixture.componentState,
      instructionSha256: fixture.instructionSha256,
      hiddenEvaluatorSeparated: true,
      designerSawHistoricalSolution: true
    },
    execution,
    changedFiles: files,
    commands: parsedEvents.commands,
    packageValidation,
    hiddenEvaluation: {
      passed: hiddenEvaluation.passed,
      summary: hiddenEvaluation.summary
    },
    finalResponse,
    metrics,
    artifacts: rawArtifacts,
    dependencyPreparation,
    recordedAt: new Date().toISOString()
  };
  const receiptPath = path.join(
    RECEIPTS_DIR,
    `${String(row.sequence).padStart(2, '0')}-${row.key.replaceAll('::', '__')}.json`
  );
  writeJson(receiptPath, receipt);
  return { complete: false, receiptPath, receipt };
}

function verifyArtifactHash(artifact) {
  const filePath = path.join(PILOT_DIR, artifact.path);
  if (!existsSync(filePath)) throw new Error(`Missing retained artifact: ${artifact.path}`);
  if (artifact.sha256 !== sha256File(filePath))
    throw new Error(`Artifact hash drift: ${artifact.path}`);
}

function verifyReceipts() {
  const manifest = loadManifest();
  const plan = readPlan();
  const receipts = receiptFiles();
  assertCompleteReceiptSet(plan, receipts);
  verifySourceAndInstructions(manifest);
  for (const receipt of receipts) {
    if (receipt.experimentId !== manifest.experimentId)
      throw new Error(`Experiment drift: ${receipt.key}`);
    if (receipt.executor.version !== manifest.pilot.codexVersion)
      throw new Error(`Executor drift: ${receipt.key}`);
    if (receipt.executor.binarySha256 !== manifest.pilot.codexBinarySha256) {
      throw new Error(`Executor binary drift: ${receipt.key}`);
    }
    if (receipt.executor.model !== manifest.pilot.model)
      throw new Error(`Model drift: ${receipt.key}`);
    if (receipt.provenance.sourceTree !== manifest.pilot.sourceTree)
      throw new Error(`Source drift: ${receipt.key}`);
    if (receipt.provenance.promptSha256 !== manifest.pilot.promptSha256)
      throw new Error(`Prompt drift: ${receipt.key}`);
    const expectedState = instructionStateForArm(receipt.armId);
    if (JSON.stringify(receipt.provenance.componentState) !== JSON.stringify(expectedState)) {
      throw new Error(`Component-state drift: ${receipt.key}`);
    }
    for (const artifact of Object.values(receipt.artifacts)) {
      if (artifact.sha256 !== null) verifyArtifactHash(artifact);
    }
    const hiddenEvaluation = readJson(
      path.join(PILOT_DIR, receipt.artifacts.hiddenEvaluation.path)
    );
    const derived = deriveRunMetrics({
      hiddenEvaluation,
      packageValidation: receipt.packageValidation,
      changedFiles: receipt.changedFiles,
      commands: receipt.commands,
      finalResponse: receipt.finalResponse,
      totalTokens: receipt.metrics.totalTokens,
      latencyMs: receipt.execution.latencyMs
    });
    if (JSON.stringify(derived) !== JSON.stringify(receipt.metrics)) {
      throw new Error(`Metric derivation drift: ${receipt.key}`);
    }
  }
  return { manifest, plan, receipts };
}

function writeResultsAndComparison() {
  const { manifest, plan, receipts } = verifyReceipts();
  const results = {
    schemaVersion: 'harness-ablation-results.v1',
    experimentId: manifest.experimentId,
    planHash: plan.planHash,
    provenance:
      'codex-cli-0.146.0-alpha.3.1-gpt-5.6-terra-medium-isolated-historical-reconstruction-real-pilot-v2',
    runs: receipts.map((receipt) => ({
      armId: receipt.armId,
      taskId: receipt.taskId,
      repetition: receipt.repetition,
      metrics: receipt.metrics,
      receipt: path.relative(PILOT_DIR, receiptPathFor(receipt))
    }))
  };
  writeJson(RESULTS_PATH, results);
  runSync(
    'pnpm',
    [
      'agent:harness-ablation',
      '--',
      'compare',
      '--manifest',
      MANIFEST_PATH,
      '--results',
      RESULTS_PATH,
      '--format',
      'json',
      '--out',
      COMPARISON_PATH
    ],
    { cwd: REPO_ROOT }
  );
  runSync(
    'pnpm',
    [
      'agent:harness-ablation',
      '--',
      'compare',
      '--manifest',
      MANIFEST_PATH,
      '--results',
      RESULTS_PATH,
      '--format',
      'markdown',
      '--out',
      COMPARISON_MARKDOWN_PATH
    ],
    { cwd: REPO_ROOT }
  );
  return { results, comparison: readJson(COMPARISON_PATH) };
}

function receiptPathFor(receipt) {
  return path.join(
    RECEIPTS_DIR,
    `${String(receipt.sequence).padStart(2, '0')}-${receipt.key.replaceAll('::', '__')}.json`
  );
}

function status() {
  const plan = existsSync(PLAN_PATH) ? readPlan() : currentPlan();
  const receipts = receiptFiles();
  return {
    experimentId: EXPECTED_EXPERIMENT_ID,
    planHash: plan.planHash,
    completedRuns: receipts.length,
    expectedRuns: plan.schedule.length,
    next: expectedNextRow(plan, receipts),
    preflight: existsSync(PREFLIGHT_PATH) ? PREFLIGHT_PATH : null,
    results: existsSync(RESULTS_PATH) ? RESULTS_PATH : null,
    comparison: existsSync(COMPARISON_PATH) ? COMPARISON_PATH : null
  };
}

function usage() {
  return `Usage: node scripts/codex-instruction-ablation-pilot.mjs <plan|preflight|run-next|compare|verify|status>\n`;
}

export function parsePilotCommand(argv) {
  return argv.filter((token) => token !== '--')[0] ?? null;
}

async function main() {
  const command = parsePilotCommand(process.argv.slice(2));
  let result;
  if (command === 'plan') result = writePlanArtifacts();
  else if (command === 'preflight') result = await preflight();
  else if (command === 'run-next') result = await runNext();
  else if (command === 'compare') result = writeResultsAndComparison();
  else if (command === 'verify') {
    const verified = verifyReceipts();
    result = {
      passed: true,
      planHash: verified.plan.planHash,
      receipts: verified.receipts.length
    };
  } else if (command === 'status') result = status();
  else {
    process.stderr.write(usage());
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
