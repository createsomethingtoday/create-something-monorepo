import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  appealsFile: string;
  trustedStatusesFile?: string;
  outDir: string;
  runExternalComparisons: boolean;
  timeoutMs: number;
  minReadyCount: number;
  maxNeedsEvidenceCount: number;
  maxAmbiguousCount: number;
  maxComparisonFailureCount: number;
  requireStatusVerified: boolean;
  requireExternalComparison: boolean;
  requiredQuestionIds: string[];
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

type CasebookSummary = {
  appeal_count?: number;
  cited_count?: number;
  ready_for_human_review_count?: number;
  needs_evidence_capture_count?: number;
  ambiguous_count?: number;
  comparison_failed_count?: number;
};

type ScoreSummary = {
  gate_status?: 'passed' | 'blocked';
  gate_reasons?: string[];
  scored_count?: number;
  ready_count?: number;
  needs_evidence_capture_count?: number;
  ambiguous_count?: number;
  comparison_failed_count?: number;
  status_unverified_count?: number;
  external_comparison_missing_count?: number;
  required_question_missing_count?: number;
};

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-appeal-equity-shadow-eval';
const DEFAULT_REQUIRED_QUESTIONS = ['creator_facing_response_boundary'];

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    runExternalComparisons: true,
    timeoutMs: 180_000,
    minReadyCount: 1,
    maxNeedsEvidenceCount: 0,
    maxAmbiguousCount: 0,
    maxComparisonFailureCount: 0,
    requireStatusVerified: true,
    requireExternalComparison: true,
    requiredQuestionIds: DEFAULT_REQUIRED_QUESTIONS,
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
    if (arg === '--appeals' && next) {
      options.appealsFile = next;
      index += 1;
      continue;
    }
    if (arg === '--trusted-statuses' && next) {
      options.trustedStatusesFile = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--run-external-comparisons') {
      options.runExternalComparisons = true;
      continue;
    }
    if (arg === '--no-run-external-comparisons') {
      options.runExternalComparisons = false;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = boundedInt(next, 5_000, 900_000, arg);
      index += 1;
      continue;
    }
    if (arg === '--min-ready-count' && next) {
      options.minReadyCount = boundedInt(next, 0, 10_000, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-needs-evidence-count' && next) {
      options.maxNeedsEvidenceCount = boundedInt(next, 0, 10_000, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-ambiguous-count' && next) {
      options.maxAmbiguousCount = boundedInt(next, 0, 10_000, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-comparison-failure-count' && next) {
      options.maxComparisonFailureCount = boundedInt(next, 0, 10_000, arg);
      index += 1;
      continue;
    }
    if (arg === '--allow-unverified-status') {
      options.requireStatusVerified = false;
      continue;
    }
    if (arg === '--allow-missing-external-comparison') {
      options.requireExternalComparison = false;
      continue;
    }
    if (arg === '--required-question-ids' && next) {
      options.requiredQuestionIds = next
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (arg === '--fail-on-gate') {
      options.failOnGate = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.appealsFile) throw new Error('Provide --appeals with a JSONL file of creator-cited appeal rows.');

  return {
    inputDir: options.inputDir ?? DEFAULT_INPUT_DIR,
    appealsFile: options.appealsFile,
    trustedStatusesFile: options.trustedStatusesFile,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    runExternalComparisons: options.runExternalComparisons ?? true,
    timeoutMs: options.timeoutMs ?? 180_000,
    minReadyCount: options.minReadyCount ?? 1,
    maxNeedsEvidenceCount: options.maxNeedsEvidenceCount ?? 0,
    maxAmbiguousCount: options.maxAmbiguousCount ?? 0,
    maxComparisonFailureCount: options.maxComparisonFailureCount ?? 0,
    requireStatusVerified: options.requireStatusVerified ?? true,
    requireExternalComparison: options.requireExternalComparison ?? true,
    requiredQuestionIds: options.requiredQuestionIds ?? DEFAULT_REQUIRED_QUESTIONS,
    failOnGate: options.failOnGate ?? false,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:eval -- [options]

Options:
  --input <dir>                              Calibration directory.
                                             Default: ${DEFAULT_INPUT_DIR}
  --appeals <file>                           JSONL appeal intake file.
  --trusted-statuses <file>                  Optional trusted status export.
  --out <dir>                                Eval output directory.
                                             Default: ${DEFAULT_OUT_DIR}
  --run-external-comparisons                 Generate comparison packets. Default.
  --no-run-external-comparisons              Resolve and score without generating comparisons.
  --timeout-ms <n>                           Child command timeout. Default: 180000
  --min-ready-count <n>                      Score gate. Default: 1
  --max-needs-evidence-count <n>             Score gate. Default: 0
  --max-ambiguous-count <n>                  Score gate. Default: 0
  --max-comparison-failure-count <n>         Score gate. Default: 0
  --allow-unverified-status                  Do not block on unverified cited status.
  --allow-missing-external-comparison        Do not block on missing comparison packets.
  --required-question-ids <csv>              Required comparison questions.
                                             Default: ${DEFAULT_REQUIRED_QUESTIONS.join(',')}
  --fail-on-gate                             Exit non-zero when the score gate blocks.
  --help                                     Show this help.

Behavior:
  Runs appeal/equity casebook generation followed by the casebook score gate.
  This is a shadow eval harness only. It does not make appeal decisions,
  approval/rejection calls, ratings, or creator-facing feedback.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function runScript(scriptName: string, args: string[], timeoutMs: number): Promise<CommandResult> {
  const startedAt = Date.now();
  try {
    const result = await execFileAsync(process.execPath, ['--import', 'tsx', path.join(SCRIPT_DIR, scriptName), ...args], {
      cwd: PACKAGE_DIR,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 16,
    });
    return {
      command: scriptName,
      args,
      code: 0,
      duration_ms: Date.now() - startedAt,
      stdout_tail: tail(result.stdout),
      stderr_tail: tail(result.stderr),
    };
  } catch (error) {
    const err = error as { code?: number | null; stdout?: string; stderr?: string; message?: string };
    return {
      command: scriptName,
      args,
      code: err.code ?? 1,
      duration_ms: Date.now() - startedAt,
      stdout_tail: tail(err.stdout ?? ''),
      stderr_tail: tail(err.stderr || err.message || String(error)),
    };
  }
}

function tail(value: string): string {
  return value.split('\n').slice(-25).join('\n').trim();
}

function scoreArgs(options: CliOptions, casebookDir: string, scoreDir: string): string[] {
  const args = [
    '--input',
    casebookDir,
    '--out',
    scoreDir,
    '--min-ready-count',
    String(options.minReadyCount),
    '--max-needs-evidence-count',
    String(options.maxNeedsEvidenceCount),
    '--max-ambiguous-count',
    String(options.maxAmbiguousCount),
    '--max-comparison-failure-count',
    String(options.maxComparisonFailureCount),
    '--required-question-ids',
    options.requiredQuestionIds.join(','),
  ];
  if (!options.requireStatusVerified) args.push('--allow-unverified-status');
  if (!options.requireExternalComparison) args.push('--allow-missing-external-comparison');
  return args;
}

function casebookArgs(options: CliOptions, casebookDir: string): string[] {
  const args = [
    '--input',
    options.inputDir,
    '--appeals',
    options.appealsFile,
    '--out',
    casebookDir,
    '--command-timeout-ms',
    String(options.timeoutMs),
  ];
  if (options.trustedStatusesFile) args.push('--trusted-statuses', options.trustedStatusesFile);
  if (options.runExternalComparisons) args.push('--run-external-comparisons');
  return args;
}

function buildMarkdown(summary: {
  generated_at: string;
  input_dir: string;
  appeals_file: string;
  gate_status: string;
  gate_reasons: string[];
  casebook_summary?: CasebookSummary;
  score_summary?: ScoreSummary;
  files: Record<string, string>;
  stages: { casebook: CommandResult; score: CommandResult };
}): string {
  const lines = [
    '# Appeal Equity Shadow Eval',
    '',
    `Generated: ${summary.generated_at}`,
    `Input: \`${summary.input_dir}\``,
    `Appeals: \`${summary.appeals_file}\``,
    '',
    '**Status:** Shadow eval only',
    '',
    'This artifact runs casebook generation and structural scoring. It does not decide appeals, approvals, rejections, ratings, or creator-facing feedback.',
    '',
    '## Gate',
    '',
    `- Status: ${summary.gate_status}`,
    `- Reasons: ${summary.gate_reasons.join('; ') || 'none'}`,
    `- Appeals: ${summary.casebook_summary?.appeal_count ?? 0}`,
    `- Cited examples: ${summary.casebook_summary?.cited_count ?? 0}`,
    `- Ready rows: ${summary.score_summary?.ready_count ?? 0}`,
    `- Needs evidence: ${summary.score_summary?.needs_evidence_capture_count ?? 0}`,
    `- Status unverified: ${summary.score_summary?.status_unverified_count ?? 0}`,
    `- Missing comparison: ${summary.score_summary?.external_comparison_missing_count ?? 0}`,
    '',
    '## Files',
    '',
    `- Casebook summary: \`${summary.files.casebook_summary}\``,
    `- Score summary: \`${summary.files.score_summary}\``,
    `- Eval summary JSON: \`${summary.files.eval_summary_json}\``,
    '',
    '## Stages',
    '',
    `- Casebook: exit ${summary.stages.casebook.code}, ${summary.stages.casebook.duration_ms}ms`,
    `- Score: exit ${summary.stages.score.code}, ${summary.stages.score.duration_ms}ms`,
    '',
    '## Boundary',
    '',
    '- Passing means evidence is structurally ready for human review only.',
    '- Blocked means the appeal rows should return to mapping, capture, status verification, or comparison generation.',
    '- Keep subjective visual-quality decisions and creator-facing responses with human reviewers.',
  ];

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const casebookDir = path.join(options.outDir, 'casebook');
  const scoreDir = path.join(options.outDir, 'score');
  await mkdir(casebookDir, { recursive: true });
  await mkdir(scoreDir, { recursive: true });

  const casebookStage = await runScript('run-appeal-equity-casebook.ts', casebookArgs(options, casebookDir), options.timeoutMs);
  let scoreStage: CommandResult = {
    command: 'score-appeal-equity-casebook.ts',
    args: [],
    code: 1,
    duration_ms: 0,
    stdout_tail: '',
    stderr_tail: 'Skipped because casebook stage failed.',
  };
  if (casebookStage.code === 0) {
    scoreStage = await runScript('score-appeal-equity-casebook.ts', scoreArgs(options, casebookDir, scoreDir), options.timeoutMs);
  }

  const casebookSummaryFile = path.join(casebookDir, 'appeal-equity-casebook-summary.json');
  const scoreSummaryFile = path.join(scoreDir, 'appeal-equity-casebook-score-summary.json');
  const casebookSummary = casebookStage.code === 0 ? await readJsonFile<CasebookSummary>(casebookSummaryFile) : undefined;
  const scoreSummary = scoreStage.code === 0 ? await readJsonFile<ScoreSummary>(scoreSummaryFile) : undefined;
  const gateStatus = casebookStage.code === 0 && scoreStage.code === 0 ? (scoreSummary?.gate_status ?? 'blocked') : 'blocked';
  const gateReasons = [
    ...(casebookStage.code === 0 ? [] : [`casebook_stage_failed:${casebookStage.code}`]),
    ...(scoreStage.code === 0 ? [] : [`score_stage_failed:${scoreStage.code}`]),
    ...(scoreSummary?.gate_reasons ?? []),
  ];

  const summary = {
    schema_version: 'appeal_equity_shadow_eval.v0.1',
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    appeals_file: options.appealsFile,
    out_dir: options.outDir,
    status: 'shadow',
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      no_creator_facing_feedback: true,
      human_reviewer_required: true,
    },
    options: {
      run_external_comparisons: options.runExternalComparisons,
      min_ready_count: options.minReadyCount,
      max_needs_evidence_count: options.maxNeedsEvidenceCount,
      max_ambiguous_count: options.maxAmbiguousCount,
      max_comparison_failure_count: options.maxComparisonFailureCount,
      require_status_verified: options.requireStatusVerified,
      require_external_comparison: options.requireExternalComparison,
      required_question_ids: options.requiredQuestionIds,
    },
    gate_status: gateStatus,
    gate_reasons: gateReasons,
    appeal_count: casebookSummary?.appeal_count ?? 0,
    cited_count: casebookSummary?.cited_count ?? 0,
    ready_count: scoreSummary?.ready_count ?? 0,
    needs_evidence_capture_count: scoreSummary?.needs_evidence_capture_count ?? 0,
    status_unverified_count: scoreSummary?.status_unverified_count ?? 0,
    external_comparison_missing_count: scoreSummary?.external_comparison_missing_count ?? 0,
    required_question_missing_count: scoreSummary?.required_question_missing_count ?? 0,
    casebook_summary: casebookSummary,
    score_summary: scoreSummary,
    stages: {
      casebook: casebookStage,
      score: scoreStage,
    },
    files: {
      casebook_summary: casebookSummaryFile,
      score_summary: scoreSummaryFile,
      eval_summary_json: path.join(options.outDir, 'appeal-equity-shadow-eval-summary.json'),
      eval_summary_markdown: path.join(options.outDir, 'appeal-equity-shadow-eval-summary.md'),
    },
  };

  await writeFile(summary.files.eval_summary_json, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(summary.files.eval_summary_markdown, buildMarkdown(summary));

  console.log(
    JSON.stringify(
      {
        ok: gateStatus === 'passed',
        out_dir: options.outDir,
        gate_status: gateStatus,
        gate_reasons: gateReasons,
        appeal_count: casebookSummary?.appeal_count ?? 0,
        cited_count: casebookSummary?.cited_count ?? 0,
        ready_count: scoreSummary?.ready_count ?? 0,
        needs_evidence_capture_count: scoreSummary?.needs_evidence_capture_count ?? 0,
        status_unverified_count: scoreSummary?.status_unverified_count ?? 0,
        external_comparison_missing_count: scoreSummary?.external_comparison_missing_count ?? 0,
        summary_json: summary.files.eval_summary_json,
        summary_markdown: summary.files.eval_summary_markdown,
      },
      null,
      2,
    ),
  );

  if (options.failOnGate && gateStatus === 'blocked') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
