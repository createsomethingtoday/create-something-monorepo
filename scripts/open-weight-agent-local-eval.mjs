#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_OUT_DIR = '.cache/open-weight-agent-executor';
const DEFAULT_TRANSFORMERS_PROFILE = 'policy-safe-tools';
const DEFAULT_CASES = 'evals/local-models/open-weight-agent-executor.cases.json';
const DEFAULT_ENDPOINT_BASE_URL = 'http://localhost:11434/v1';
const DEFAULT_ENDPOINT_MODEL = 'ornith:9b';
const GPT_OSS_20B_MODEL = 'gpt-oss:20b';
const GPT_OSS_20B_MIN_DISK_KIB = 25 * 1024 * 1024;
const GPT_OSS_20B_MIN_MEMORY_BYTES = 16 * 1024 * 1024 * 1024;

function parseArgs(argv) {
  const options = {
    mode: 'auto',
    cases: DEFAULT_CASES,
    outDir: DEFAULT_OUT_DIR,
    transformersModel: process.env.OPEN_WEIGHT_TRANSFORMERS_MODEL || '',
    endpointBaseUrl: process.env.OPEN_WEIGHT_EVAL_BASE_URL || DEFAULT_ENDPOINT_BASE_URL,
    endpointModel: process.env.OPEN_WEIGHT_EVAL_MODEL || DEFAULT_ENDPOINT_MODEL,
    caseIds: [],
    limit: '',
    maxNewTokens: '',
    timeoutMs: '',
    profile: process.env.OPEN_WEIGHT_PROMPT_PROFILE || DEFAULT_TRANSFORMERS_PROFILE,
    systemPrompt: '',
    repairMalformedToolCalls: false,
    repairJsonSyntax: process.env.OPEN_WEIGHT_REPAIR_JSON_SYNTAX !== '0',
    allowFailures: false,
    write: true,
    json: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (arg === '--mode' && next) options.mode = argv[++index];
    else if (arg === '--cases' && next) options.cases = argv[++index];
    else if (arg === '--out-dir' && next) options.outDir = argv[++index];
    else if (arg === '--transformers-model' && next) options.transformersModel = argv[++index];
    else if (arg === '--base-url' && next) options.endpointBaseUrl = argv[++index];
    else if (arg === '--model' && next) options.endpointModel = argv[++index];
    else if (arg === '--case' && next) options.caseIds.push(argv[++index]);
    else if (arg === '--limit' && next) options.limit = argv[++index];
    else if (arg === '--max-new-tokens' && next) options.maxNewTokens = argv[++index];
    else if (arg === '--timeout-ms' && next) options.timeoutMs = argv[++index];
    else if (arg === '--profile' && next) options.profile = argv[++index];
    else if (arg === '--system' && next) options.systemPrompt = argv[++index];
    else if (arg === '--repair-malformed-tool-calls') options.repairMalformedToolCalls = true;
    else if (arg === '--repair-json-syntax') options.repairJsonSyntax = true;
    else if (arg === '--no-repair-json-syntax') options.repairJsonSyntax = false;
    else if (arg === '--allow-failures') options.allowFailures = true;
    else if (arg === '--no-write') options.write = false;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!['auto', 'dry-run', 'endpoint', 'gpt-oss-preflight', 'transformers'].includes(options.mode)) {
    throw new Error(`Unknown --mode ${options.mode}`);
  }

  return options;
}

function usage() {
  console.log(`Usage:
  pnpm open-weight:eval:local [options]

Modes:
  auto          Use Ornith through the local OpenAI-compatible endpoint unless overridden.
  dry-run       Validate the shared case suite without a model.
  endpoint      Run an OpenAI-compatible /v1/chat/completions endpoint.
  gpt-oss-preflight
                Check local readiness before installing or running gpt-oss-20b.
  transformers  Run a local Transformers model through its chat template.

Options:
  --base-url <url>              Endpoint mode base URL. Env: OPEN_WEIGHT_EVAL_BASE_URL
  --model <name>                Endpoint mode model. Env: OPEN_WEIGHT_EVAL_MODEL
  --transformers-model <name>   Required for explicit Transformers mode.
  --case <id>                   Run one case id. Repeatable.
  --limit <n>                   Run first n cases
  --max-new-tokens <n>          Transformers generation cap
  --timeout-ms <n>              Endpoint request timeout
  --profile <name>              Prompt profile. Default: ${DEFAULT_TRANSFORMERS_PROFILE}
  --system <text>               Override system prompt
  --repair-malformed-tool-calls Ask the model to correct malformed tool-call JSON
  --repair-json-syntax          Repair simple balanced-brace JSON syntax failures in harness
  --no-repair-json-syntax       Disable default JSON syntax repair for raw model measurement
  --out-dir <path>              Receipt directory. Default: ${DEFAULT_OUT_DIR}
  --allow-failures              Exit 0 after writing a failing model report
  --no-write                    Do not write the JSON receipt
  --json                        Print machine-readable preflight output
`);
}

function commandExists(command) {
  const result = spawnSync('command', ['-v', command], {
    shell: true,
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

function readDiskAvailableKiB(targetPath) {
  const result = spawnSync('df', ['-Pk', targetPath], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  const lines = result.stdout.trim().split('\n');
  const row = lines[1]?.trim().split(/\s+/);
  return row?.[3] ? Number(row[3]) : null;
}

function inspectOllamaModel(modelName) {
  if (!commandExists('ollama')) return { installed: false, source: 'missing-ollama' };
  const result = spawnSync('ollama', ['list'], { encoding: 'utf8' });
  if (result.status !== 0) {
    return {
      installed: false,
      source: 'ollama-list',
      error: result.stderr.trim() || result.stdout.trim(),
    };
  }
  const row = result.stdout
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .find((columns) => columns[0] === modelName);
  return {
    installed: Boolean(row),
    source: 'ollama-list',
    row: row ? row.join(' ') : '',
  };
}

function gptOssPreflight() {
  const diskAvailableKiB = readDiskAvailableKiB(process.cwd());
  const totalMemoryBytes = os.totalmem();
  const runtimes = {
    ollama: commandExists('ollama'),
    llamaServer: commandExists('llama-server'),
    llamaCli: commandExists('llama-cli'),
    docker: commandExists('docker'),
  };
  const dockerInfo = runtimes.docker
    ? spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8' })
    : null;
  const gptOss20b = inspectOllamaModel(GPT_OSS_20B_MODEL);
  const checks = [
    {
      id: 'disk',
      passed:
        gptOss20b.installed ||
        (typeof diskAvailableKiB === 'number' && diskAvailableKiB >= GPT_OSS_20B_MIN_DISK_KIB),
      observed: diskAvailableKiB,
      required: gptOss20b.installed ? 'installed model or 25 GiB free before first pull' : GPT_OSS_20B_MIN_DISK_KIB,
      note: gptOss20b.installed
        ? 'gpt-oss:20b is already installed, so the first-pull disk gate is satisfied.'
        : 'Require 25 GiB free before pulling a 12-14 GiB gpt-oss-20b artifact.',
    },
    {
      id: 'memory',
      passed: totalMemoryBytes >= GPT_OSS_20B_MIN_MEMORY_BYTES,
      observed: totalMemoryBytes,
      required: GPT_OSS_20B_MIN_MEMORY_BYTES,
      note: '16 GiB unified memory is the floor, not a comfortable target.',
    },
    {
      id: 'runtime',
      passed: Boolean(runtimes.ollama || runtimes.llamaServer || runtimes.llamaCli || dockerInfo?.status === 0),
      observed: {
        ...runtimes,
        dockerDaemon: dockerInfo?.status === 0 ? dockerInfo.stdout.trim() : '',
      },
      required: 'ollama, llama.cpp, or running Docker daemon',
      note: 'Need a local runtime before the endpoint eval can run.',
    },
  ];
  return {
    generatedAt: new Date().toISOString(),
    mode: 'gpt-oss-preflight',
    passed: checks.every((check) => check.passed),
    recommendedRuntime: runtimes.ollama
      ? 'ollama'
      : runtimes.llamaServer || runtimes.llamaCli
        ? 'llama.cpp'
        : dockerInfo?.status === 0
          ? 'docker'
          : 'install-runtime',
    checks,
    installedModels: {
      [GPT_OSS_20B_MODEL]: gptOss20b,
    },
    nextCommands: [
      ...(gptOss20b.installed ? [] : [`ollama pull ${GPT_OSS_20B_MODEL}`]),
      `OPEN_WEIGHT_EVAL_BASE_URL=http://localhost:11434/v1 OPEN_WEIGHT_EVAL_MODEL=${GPT_OSS_20B_MODEL} pnpm open-weight:eval:endpoint -- --profile policy-safe-tools --repair-json-syntax --timeout-ms 180000 --allow-failures`,
    ],
  };
}

function preflight(options, resolvedMode) {
  const diskAvailableKiB = readDiskAvailableKiB(process.cwd());
  return {
    platform: os.platform(),
    arch: os.arch(),
    totalMemoryBytes: os.totalmem(),
    freeMemoryBytes: os.freemem(),
    diskAvailableKiB,
    mode: resolvedMode,
    cases: options.cases,
    outDir: options.outDir,
  };
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  });
  return {
    command: [command, ...args].join(' '),
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function parseJsonOutput(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart < 0) return null;
  return JSON.parse(trimmed.slice(jsonStart));
}

function buildRun(options, resolvedMode) {
  if (resolvedMode === 'dry-run') {
    const args = ['scripts/open-weight-agent-executor-eval.mjs', '--cases', options.cases, '--dry-run', '--json'];
    for (const caseId of options.caseIds) args.push('--case', caseId);
    return {
      label: 'dry-run',
      command: 'node',
      args,
    };
  }

  if (resolvedMode === 'endpoint') {
    if (!options.endpointBaseUrl || !options.endpointModel) {
      throw new Error('Endpoint mode requires --base-url and --model, or OPEN_WEIGHT_EVAL_BASE_URL and OPEN_WEIGHT_EVAL_MODEL.');
    }
    const args = [
      'scripts/open-weight-agent-executor-eval.mjs',
      '--cases',
      options.cases,
      '--base-url',
      options.endpointBaseUrl,
      '--model',
      options.endpointModel,
      '--json',
    ];
    for (const caseId of options.caseIds) args.push('--case', caseId);
    if (options.limit) args.push('--limit', options.limit);
    if (options.timeoutMs) args.push('--timeout-ms', options.timeoutMs);
    if (options.profile) args.push('--profile', options.profile);
    if (options.systemPrompt) args.push('--system', options.systemPrompt);
    if (options.repairMalformedToolCalls) args.push('--repair-malformed-tool-calls');
    if (options.repairJsonSyntax) args.push('--repair-json-syntax');
    return { label: `endpoint-${options.endpointModel}`, command: 'node', args };
  }

  if (!options.transformersModel) {
    throw new Error('Transformers mode requires --transformers-model. The default local executor is ornith:9b through endpoint mode.');
  }

  const args = [
    '--with',
    'torch',
    '--with',
    'transformers',
    'python',
    'scripts/open-weight-agent-transformers-eval.py',
    '--cases',
    options.cases,
    '--model',
    options.transformersModel,
    '--json',
  ];
  for (const caseId of options.caseIds) args.push('--case', caseId);
  if (options.limit) args.push('--limit', options.limit);
  if (options.maxNewTokens) args.push('--max-new-tokens', options.maxNewTokens);
  if (options.profile) args.push('--profile', options.profile);
  if (options.systemPrompt) args.push('--system', options.systemPrompt);
  if (options.repairMalformedToolCalls) args.push('--repair-malformed-tool-calls');
  if (options.repairJsonSyntax) args.push('--repair-json-syntax');
  const profileSuffix = options.profile ? `-${options.profile}` : '';
  const repairSuffix = options.repairMalformedToolCalls ? '-repair' : '';
  const syntaxRepairSuffix = options.repairJsonSyntax ? '-jsonrepair' : '';
  return { label: `transformers-${options.transformersModel.replaceAll('/', '-')}${profileSuffix}${repairSuffix}${syntaxRepairSuffix}`, command: 'uvx', args };
}

function writeReceipt(options, run, preflightReport, commandResult, modelReport) {
  if (!options.write) return null;
  fs.mkdirSync(options.outDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
  const filePath = path.join(options.outDir, `${stamp}-${run.label.replace(/[^a-zA-Z0-9_.-]/g, '-')}.json`);
  const receipt = {
    generatedAt: new Date().toISOString(),
    preflight: preflightReport,
    command: commandResult.command,
    status: commandResult.status,
    stderr: commandResult.stderr.trim(),
    report: modelReport,
  };
  fs.writeFileSync(filePath, `${JSON.stringify(receipt, null, 2)}\n`);
  return filePath;
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  if (options.mode === 'gpt-oss-preflight') {
    const report = gptOssPreflight();
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log('# gpt-oss-20b preflight');
      console.log(`Result: ${report.passed ? 'passed' : 'blocked'}`);
      for (const check of report.checks) {
        console.log(`- ${check.passed ? 'PASS' : 'BLOCK'} ${check.id}: ${check.note}`);
      }
      console.log(`Recommended runtime: ${report.recommendedRuntime}`);
    }
    process.exit(report.passed ? 0 : 1);
  }

  const resolvedMode =
    options.mode === 'auto' && options.endpointBaseUrl && options.endpointModel
      ? 'endpoint'
      : options.mode === 'auto'
        ? 'transformers'
        : options.mode;
  const preflightReport = preflight(options, resolvedMode);
  const run = buildRun(options, resolvedMode);
  const commandResult = runCommand(run.command, run.args);
  let modelReport = null;
  let parseError = null;
  try {
    modelReport = parseJsonOutput(commandResult.stdout);
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  const receiptPath = writeReceipt(options, run, preflightReport, commandResult, {
    ...modelReport,
    parseError,
  });

  const passed = commandResult.status === 0 && !parseError;
  const failedModelRun = modelReport?.passed === false;
  console.log(`# open-weight-agent-local-eval`);
  console.log(`Mode: ${resolvedMode}`);
  console.log(`Command: ${commandResult.command}`);
  console.log(`Result: ${passed ? 'passed' : 'failed'}`);
  if (modelReport?.totals) {
    console.log(`Cases: ${modelReport.totals.passed}/${modelReport.totals.cases} passed`);
  } else if (modelReport?.cases) {
    console.log(`Cases: ${modelReport.cases.length}`);
  }
  if (receiptPath) console.log(`Receipt: ${receiptPath}`);
  if (parseError) console.log(`Parse error: ${parseError}`);
  if (commandResult.stderr.trim()) {
    console.log('\n## stderr');
    console.log(commandResult.stderr.trim().slice(0, 4000));
  }

  if (passed || (options.allowFailures && failedModelRun)) return;
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
