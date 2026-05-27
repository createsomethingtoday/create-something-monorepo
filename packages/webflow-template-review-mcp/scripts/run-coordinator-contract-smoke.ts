import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

type CliOptions = {
  requestManifest: string;
  outDir: string;
};

type Manifest = {
  schema_version?: string;
  cases?: Array<{
    case_id?: string;
    request_file?: string;
    expected_status?: 'allowed' | 'blocked';
    expected_blockers?: string[];
  }>;
};

type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type OutputGate = {
  status?: string;
  blocked_lanes?: Array<{ value?: string; reason?: string }>;
  blocked_outputs?: Array<{ value?: string; reason?: string }>;
  blocked_input_sources?: Array<{ value?: string; reason?: string }>;
  missing_human_gates?: Array<{ value?: string; reason?: string }>;
  contract_errors?: Array<{ value?: string; reason?: string }>;
};

type SmokeCaseResult = {
  case_id: string;
  request_file: string;
  expected_status: 'allowed' | 'blocked';
  actual_status: string | null;
  exit_code: number;
  ok: boolean;
  blockers: string[];
  errors: string[];
};

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(import.meta.dirname, '..');
const DEFAULT_REQUEST_MANIFEST = path.join(
  packageRoot,
  'fixtures/coordinator-output-requests/manifest.json',
);
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-coordinator-contract-smoke';
const EXPECTED_MANIFEST_SCHEMA = 'template_review_coordinator_output_request_manifest.v0.1';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    requestManifest: DEFAULT_REQUEST_MANIFEST,
    outDir: DEFAULT_OUT_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--request-manifest' && next) {
      options.requestManifest = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    requestManifest: options.requestManifest ?? DEFAULT_REQUEST_MANIFEST,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp coordinator:contract-smoke -- [options]

Options:
  --request-manifest <file>  Manifest of coordinator output request fixtures.
                             Default: ${DEFAULT_REQUEST_MANIFEST}
  --out <dir>                Output directory. Default: ${DEFAULT_OUT_DIR}
  --help                     Show this help.

Behavior:
  Runs the quality-readiness fixture, derives a coordinator exposure policy,
  then gates each coordinator output request fixture. Expected blocked cases
  must exit with code 2 and write blocked gate artifacts.
`);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function runScript(scriptName: string, args: string[]): Promise<CommandResult> {
  const scriptPath = path.join(packageRoot, 'scripts', scriptName);
  try {
    const result = await execFileAsync(process.execPath, ['--import', 'tsx', scriptPath, ...args], {
      cwd: packageRoot,
      maxBuffer: 1024 * 1024 * 8,
    });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const err = error as { code?: number; stdout?: string; stderr?: string; message?: string };
    return {
      exitCode: typeof err.code === 'number' ? err.code : 1,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message ?? '',
    };
  }
}

function allBlockers(gate: OutputGate): string[] {
  return [
    ...(gate.blocked_lanes ?? []).map((item) => item.value ?? ''),
    ...(gate.blocked_outputs ?? []).map((item) => item.value ?? ''),
    ...(gate.blocked_input_sources ?? []).map((item) => item.value ?? ''),
    ...(gate.missing_human_gates ?? []).map((item) => item.value ?? ''),
    ...(gate.contract_errors ?? []).map((item) => item.value ?? ''),
  ].filter(Boolean);
}

function validateManifest(manifest: Manifest) {
  if (manifest.schema_version !== EXPECTED_MANIFEST_SCHEMA) {
    throw new Error(`Unsupported request manifest schema_version: ${String(manifest.schema_version ?? 'missing')}`);
  }
  if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) {
    throw new Error('Request manifest must include at least one case.');
  }
}

async function runReadinessAndPolicy(outDir: string): Promise<string> {
  const fixtureDir = path.join(packageRoot, 'fixtures/quality-band-readiness');
  const readinessOut = path.join(outDir, 'quality-readiness');
  const policyOut = path.join(outDir, 'coordinator-exposure-policy');

  const readiness = await runScript('score-quality-band-readiness.ts', [
    '--subjective-panel-summary',
    path.join(fixtureDir, 'subjective-panel-eval-score-summary.blocked.sample.json'),
    '--rubric-reviewer-summary',
    path.join(fixtureDir, 'rubric-reviewer-score-summary.blocked.sample.json'),
    '--exceptional-lane-summary',
    path.join(fixtureDir, 'exceptional-candidate-score-summary.blocked.sample.json'),
    '--visual-proxy-canary-summary',
    path.join(fixtureDir, 'visual-proxy-canary-summary.blocked.sample.json'),
    '--out',
    readinessOut,
    '--run-id',
    'coordinator_contract_smoke_readiness',
  ]);
  if (readiness.exitCode !== 0) throw new Error(`Readiness fixture failed: ${readiness.stderr || readiness.stdout}`);

  const policy = await runScript('derive-coordinator-exposure-policy.ts', [
    '--input',
    path.join(readinessOut, 'quality-band-readiness-summary.json'),
    '--out',
    policyOut,
    '--policy-id',
    'coordinator_contract_smoke_policy',
  ]);
  if (policy.exitCode !== 0) throw new Error(`Exposure policy fixture failed: ${policy.stderr || policy.stdout}`);

  return path.join(policyOut, 'coordinator-exposure-policy.json');
}

async function runCase(
  policyFile: string,
  manifestDir: string,
  outDir: string,
  rawCase: NonNullable<Manifest['cases']>[number],
): Promise<SmokeCaseResult> {
  const caseId = rawCase.case_id ?? 'missing_case_id';
  const requestFile = rawCase.request_file ?? '';
  const expectedStatus = rawCase.expected_status ?? 'blocked';
  const errors: string[] = [];
  const requestPath = path.resolve(manifestDir, requestFile);
  const caseOut = path.join(outDir, 'output-gates', caseId);
  const result = await runScript('gate-coordinator-output.ts', [
    '--policy',
    policyFile,
    '--request',
    requestPath,
    '--out',
    caseOut,
  ]);

  let actualStatus: string | null = null;
  let blockers: string[] = [];
  try {
    const gate = await readJson<OutputGate>(path.join(caseOut, 'coordinator-output-gate.json'));
    actualStatus = gate.status ?? null;
    blockers = allBlockers(gate);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  if (actualStatus !== expectedStatus) errors.push(`expected_status ${expectedStatus} got ${actualStatus ?? 'missing'}`);
  if (expectedStatus === 'allowed' && result.exitCode !== 0) {
    errors.push(`expected exit 0 for allowed case, got ${result.exitCode}`);
  }
  if (expectedStatus === 'blocked' && result.exitCode !== 2) {
    errors.push(`expected exit 2 for blocked case, got ${result.exitCode}`);
  }
  for (const blocker of rawCase.expected_blockers ?? []) {
    if (!blockers.includes(blocker)) errors.push(`missing expected blocker ${blocker}`);
  }

  return {
    case_id: caseId,
    request_file: requestFile,
    expected_status: expectedStatus,
    actual_status: actualStatus,
    exit_code: result.exitCode,
    ok: errors.length === 0,
    blockers,
    errors,
  };
}

function markdown(summary: {
  status: string;
  generated_at: string;
  policy_file: string;
  case_results: SmokeCaseResult[];
}) {
  return `# Coordinator Contract Smoke

Generated: ${summary.generated_at}
Status: ${summary.status}
Policy file: ${summary.policy_file}

## Cases

${summary.case_results
  .map((item) => `- ${item.case_id}: ${item.actual_status ?? 'missing'} (${item.ok ? 'ok' : item.errors.join('; ')})`)
  .join('\n')}
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(options.requestManifest);
  const manifestDir = path.dirname(manifestPath);
  const manifest = await readJson<Manifest>(manifestPath);
  validateManifest(manifest);

  await mkdir(options.outDir, { recursive: true });
  const policyFile = await runReadinessAndPolicy(options.outDir);
  const caseResults: SmokeCaseResult[] = [];
  for (const item of manifest.cases ?? []) {
    caseResults.push(await runCase(policyFile, manifestDir, options.outDir, item));
  }

  const summary = {
    schema_version: 'template_review_coordinator_contract_smoke.v0.1',
    generated_at: new Date().toISOString(),
    status: caseResults.every((item) => item.ok) ? 'pass' : 'fail',
    request_manifest: manifestPath,
    policy_file: policyFile,
    case_results: caseResults,
    notes: [
      'This smoke proves the fixture readiness summary, exposure policy, and output gate agree on allowed and blocked coordinator outputs.',
      'It does not call model providers, Airtable, D1, E2B, or Dify.',
    ],
  };

  await writeFile(path.join(options.outDir, 'coordinator-contract-smoke-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(path.join(options.outDir, 'coordinator-contract-smoke-summary.md'), markdown(summary));

  console.log(
    JSON.stringify(
      {
        ok: summary.status === 'pass',
        status: summary.status,
        out_dir: options.outDir,
        case_count: caseResults.length,
      },
      null,
      2,
    ),
  );

  if (summary.status !== 'pass') process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
