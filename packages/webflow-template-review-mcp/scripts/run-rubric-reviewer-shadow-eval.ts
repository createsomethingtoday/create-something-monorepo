import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type Provider = 'dry-run' | 'openai' | 'dify-agent';

type CliOptions = {
  inputDir: string;
  outDir: string;
  provider: Provider;
  caseIds: string[];
  limit?: number;
  agent: string;
  model: string;
  includeScreenshot: boolean;
  packetMaxScreenshots: number;
  reviewerMaxScreenshots: number;
  imageDetail: 'low' | 'high' | 'auto';
  timeoutMs: number;
  maxRubricChars: number;
  minScoredCount: number;
  maxFalseApprovalRate: number;
  maxFalseRejectionRate: number;
  maxProviderFailureRate: number;
  maxEscalationRate: number;
  maxMissedExceptionalRate: number;
  requireImageInputs: boolean;
  failOnGate: boolean;
};

type CommandResult = {
  command: string;
  args: string[];
  code: number | null;
  duration_ms: number;
  stdout_tail: string;
  stderr_tail: string;
};

type EvalSummary = {
  generated_at: string;
  input_dir: string;
  out_dir: string;
  provider: Provider;
  ok: boolean;
  promotion_gate?: unknown;
  stages: {
    packet: CommandResult;
    reviewer_batch: CommandResult;
    score: CommandResult;
  };
  files: {
    packet_summary: string;
    reviewer_batch_summary: string;
    reviewer_score_summary: string;
  };
  notes: string[];
};

const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-multimodal-smoke-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-rubric-reviewer-shadow-eval';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    provider: 'dry-run',
    caseIds: [],
    agent: 'eric-hub',
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-5.5',
    includeScreenshot: true,
    packetMaxScreenshots: 8,
    reviewerMaxScreenshots: 4,
    imageDetail: 'low',
    timeoutMs: 120_000,
    maxRubricChars: 12_000,
    minScoredCount: 8,
    maxFalseApprovalRate: 0,
    maxFalseRejectionRate: 0.05,
    maxProviderFailureRate: 0,
    maxEscalationRate: 0.7,
    maxMissedExceptionalRate: 0,
    requireImageInputs: false,
    failOnGate: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--input' && next) {
      options.inputDir = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--provider' && next) {
      if (next !== 'dry-run' && next !== 'openai' && next !== 'dify-agent') {
        throw new Error('--provider must be dry-run, openai, or dify-agent.');
      }
      options.provider = next;
      index += 1;
      continue;
    }
    if (arg === '--case-id' && next) {
      options.caseIds = [...(options.caseIds ?? []), next];
      index += 1;
      continue;
    }
    if (arg === '--limit' && next) {
      options.limit = boundedInt(next, 1, 100, '--limit');
      index += 1;
      continue;
    }
    if (arg === '--agent' && next) {
      options.agent = next;
      index += 1;
      continue;
    }
    if (arg === '--model' && next) {
      options.model = next;
      index += 1;
      continue;
    }
    if (arg === '--include-screenshot') {
      options.includeScreenshot = true;
      continue;
    }
    if (arg === '--no-include-screenshot') {
      options.includeScreenshot = false;
      continue;
    }
    if (arg === '--packet-max-screenshots' && next) {
      options.packetMaxScreenshots = boundedInt(next, 1, 24, '--packet-max-screenshots');
      index += 1;
      continue;
    }
    if (arg === '--reviewer-max-screenshots' && next) {
      options.reviewerMaxScreenshots = boundedInt(next, 1, 12, '--reviewer-max-screenshots');
      index += 1;
      continue;
    }
    if (arg === '--image-detail' && next) {
      if (next !== 'low' && next !== 'high' && next !== 'auto') throw new Error('--image-detail must be low, high, or auto.');
      options.imageDetail = next;
      index += 1;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = boundedInt(next, 5_000, 600_000, '--timeout-ms');
      index += 1;
      continue;
    }
    if (arg === '--max-rubric-chars' && next) {
      options.maxRubricChars = boundedInt(next, 1_000, 50_000, '--max-rubric-chars');
      index += 1;
      continue;
    }
    if (arg === '--min-scored-count' && next) {
      options.minScoredCount = boundedInt(next, 1, 10_000, '--min-scored-count');
      index += 1;
      continue;
    }
    if (arg === '--max-false-approval-rate' && next) {
      options.maxFalseApprovalRate = rateOption(next, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-false-rejection-rate' && next) {
      options.maxFalseRejectionRate = rateOption(next, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-provider-failure-rate' && next) {
      options.maxProviderFailureRate = rateOption(next, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-escalation-rate' && next) {
      options.maxEscalationRate = rateOption(next, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-missed-exceptional-rate' && next) {
      options.maxMissedExceptionalRate = rateOption(next, arg);
      index += 1;
      continue;
    }
    if (arg === '--require-image-inputs') {
      options.requireImageInputs = true;
      continue;
    }
    if (arg === '--fail-on-gate') {
      options.failOnGate = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    inputDir: options.inputDir ?? DEFAULT_INPUT_DIR,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    provider: options.provider ?? 'dry-run',
    caseIds: options.caseIds ?? [],
    limit: options.limit,
    agent: options.agent ?? 'eric-hub',
    model: options.model ?? 'gpt-5.5',
    includeScreenshot: options.includeScreenshot ?? true,
    packetMaxScreenshots: options.packetMaxScreenshots ?? 8,
    reviewerMaxScreenshots: options.reviewerMaxScreenshots ?? 4,
    imageDetail: options.imageDetail ?? 'low',
    timeoutMs: options.timeoutMs ?? 120_000,
    maxRubricChars: options.maxRubricChars ?? 12_000,
    minScoredCount: options.minScoredCount ?? 8,
    maxFalseApprovalRate: options.maxFalseApprovalRate ?? 0,
    maxFalseRejectionRate: options.maxFalseRejectionRate ?? 0.05,
    maxProviderFailureRate: options.maxProviderFailureRate ?? 0,
    maxEscalationRate: options.maxEscalationRate ?? 0.7,
    maxMissedExceptionalRate: options.maxMissedExceptionalRate ?? 0,
    requireImageInputs: options.requireImageInputs ?? false,
    failOnGate: options.failOnGate ?? false,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:eval -- [options]

Options:
  --input <dir>                       Calibration output directory. Default: ${DEFAULT_INPUT_DIR}
  --out <dir>                         Eval output directory. Default: ${DEFAULT_OUT_DIR}
  --provider <provider>               dry-run, openai, or dify-agent. Default: dry-run
  --case-id <id>                      Include one case ID. Repeatable.
  --limit <n>                         Maximum cases to review.
  --agent <id>                        Dify agent for --provider dify-agent. Default: eric-hub
  --model <model>                     OpenAI model for --provider openai. Default: OPENAI_MODEL or gpt-5.5
  --include-screenshot                Include screenshots in reviewer prompt. Default.
  --no-include-screenshot             Do not include screenshots in reviewer prompt.
  --packet-max-screenshots <n>        Max screenshots copied into packet. Default: 8
  --reviewer-max-screenshots <n>      Max screenshots used by reviewer. Default: 4
  --image-detail <level>              low, high, or auto. Default: low
  --timeout-ms <n>                    Provider timeout. Default: 120000
  --max-rubric-chars <n>              Rubric markdown budget. Default: 12000
  --min-scored-count <n>              Promotion gate. Default: 8
  --max-false-approval-rate <n>       Promotion gate. Default: 0
  --max-false-rejection-rate <n>      Promotion gate. Default: 0.05
  --max-provider-failure-rate <n>     Promotion gate. Default: 0
  --max-escalation-rate <n>           Promotion gate. Default: 0.7
  --max-missed-exceptional-rate <n>   Promotion gate. Default: 0
  --require-image-inputs              Block if scored rows did not attach model image inputs.
  --fail-on-gate                      Exit non-zero when promotion gate is blocked.
  --help                              Show this help.

Behavior:
  Runs the provider-independent shadow eval chain:
  1. multimodal:packet
  2. rubric:reviewer:batch
  3. rubric:reviewer:score

  It starts from an existing calibration directory and does not call Airtable,
  E2B, D1, R2, or reviewer write tools.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function rateOption(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`${name} must be a number between 0 and 1.`);
  }
  return parsed;
}

async function runCommand(command: string, args: string[], cwd: string): Promise<CommandResult> {
  const startedAt = Date.now();
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      const stdoutText = Buffer.concat(stdout).toString('utf8');
      const stderrText = Buffer.concat(stderr).toString('utf8');
      resolve({
        command,
        args,
        code,
        duration_ms: Date.now() - startedAt,
        stdout_tail: stdoutText.slice(-8_000),
        stderr_tail: stderrText.slice(-8_000),
      });
    });
  });
}

async function readOptionalJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

function assertStageOk(stageName: string, result: CommandResult) {
  if (result.code === 0) return;
  throw new Error(`${stageName} failed with exit code ${result.code}.\n${result.stderr_tail || result.stdout_tail}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const packetDir = path.join(options.outDir, 'packet');
  const reviewerBatchDir = path.join(options.outDir, 'reviewer-batch');
  const scoreDir = path.join(options.outDir, 'score');

  const packetArgs = [
    'multimodal:packet',
    '--',
    '--input',
    options.inputDir,
    '--out',
    packetDir,
    '--max-screenshots',
    String(options.packetMaxScreenshots),
  ];
  const packet = await runCommand('pnpm', packetArgs, process.cwd());
  assertStageOk('multimodal packet', packet);

  const batchArgs = [
    'rubric:reviewer:batch',
    '--',
    '--input',
    options.inputDir,
    '--out',
    reviewerBatchDir,
    '--provider',
    options.provider,
    '--agent',
    options.agent,
    '--model',
    options.model,
    '--image-detail',
    options.imageDetail,
    '--timeout-ms',
    String(options.timeoutMs),
    '--max-rubric-chars',
    String(options.maxRubricChars),
    '--max-screenshots',
    String(options.reviewerMaxScreenshots),
  ];
  if (options.includeScreenshot) batchArgs.push('--include-screenshot');
  if (typeof options.limit === 'number') batchArgs.push('--limit', String(options.limit));
  for (const caseId of options.caseIds) batchArgs.push('--case-id', caseId);
  const reviewerBatch = await runCommand('pnpm', batchArgs, process.cwd());
  assertStageOk('reviewer batch', reviewerBatch);

  const scoreArgs = [
    'rubric:reviewer:score',
    '--',
    '--input',
    reviewerBatchDir,
    '--out',
    scoreDir,
    '--min-scored-count',
    String(options.minScoredCount),
    '--max-false-approval-rate',
    String(options.maxFalseApprovalRate),
    '--max-false-rejection-rate',
    String(options.maxFalseRejectionRate),
    '--max-provider-failure-rate',
    String(options.maxProviderFailureRate),
    '--max-escalation-rate',
    String(options.maxEscalationRate),
    '--max-missed-exceptional-rate',
    String(options.maxMissedExceptionalRate),
  ];
  if (options.requireImageInputs) scoreArgs.push('--require-image-inputs');
  if (options.failOnGate) scoreArgs.push('--fail-on-gate');
  const score = await runCommand('pnpm', scoreArgs, process.cwd());
  if (!options.failOnGate) assertStageOk('reviewer score', score);

  const packetSummaryPath = path.join(packetDir, 'summary.json');
  const reviewerBatchSummaryPath = path.join(reviewerBatchDir, 'rubric-reviewer-batch-summary.json');
  const reviewerScoreSummaryPath = path.join(scoreDir, 'rubric-reviewer-score-summary.json');
  const scoreSummary = await readOptionalJson<{ promotion_gate?: { status?: string } }>(reviewerScoreSummaryPath);
  const ok = score.code === 0 && scoreSummary?.promotion_gate?.status === 'candidate_for_human_review';

  const summary: EvalSummary = {
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    out_dir: options.outDir,
    provider: options.provider,
    ok,
    promotion_gate: scoreSummary?.promotion_gate,
    stages: {
      packet,
      reviewer_batch: reviewerBatch,
      score,
    },
    files: {
      packet_summary: packetSummaryPath,
      reviewer_batch_summary: reviewerBatchSummaryPath,
      reviewer_score_summary: reviewerScoreSummaryPath,
    },
    notes: [
      'This eval chain starts from an existing calibration directory.',
      'Private outcomes remain excluded from reviewer prompts and are used only by the scorer after output generation.',
      'A candidate_for_human_review gate is not permission for autonomous final decisions.',
    ],
  };

  await writeFile(path.join(options.outDir, 'rubric-reviewer-shadow-eval-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));

  if (options.failOnGate && !ok) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
