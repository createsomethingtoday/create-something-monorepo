import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
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
  maxScreenshots: number;
  imageDetail: 'low' | 'high' | 'auto';
  timeoutMs: number;
  maxRubricChars: number;
  forbidTools: string[];
};

type BlindCase = {
  case_id: string;
  template_name: string;
  source_url: string;
};

type PrivateOutcome = {
  case_id: string;
  actual_review_status?: string;
  actual_quality_rating?: string;
  selection_stratum?: string;
  reviewer?: string;
};

type RubricReviewerOutput = {
  schema_version: 'rubric_reviewer_shadow.v0.1';
  case_id: string;
  template_name: string;
  source_url: string;
  status: 'shadow' | 'failed';
  recommendation:
    | 'likely_rejectable'
    | 'request_changes_average'
    | 'clean_good_candidate'
    | 'exceptional_human_review_candidate'
    | 'manual_review_required'
    | 'insufficient_evidence';
  quality_band: 'reject' | 'average' | 'good_candidate' | 'exceptional_candidate' | 'uncertain';
  confidence: 'low' | 'medium' | 'high';
  standardized_findings: Array<{
    bucket: string;
    severity: 'info' | 'minor' | 'major' | 'critical';
    internal_summary: string;
    creator_safe_feedback: string;
    evidence_references: string[];
    requires_human_review: boolean;
  }>;
  manual_checks_remaining: string[];
  cannot_determine: string[];
  safety: {
    not_final_decision: boolean;
    no_external_writes: boolean;
    private_outcomes_excluded: boolean;
    screenshot_used: boolean;
  };
};

type RubricReviewerArtifact = {
  generated_at: string;
  provider: string;
  model: string;
  latency_ms: number;
  input_dir: string;
  case_id: string;
  screenshot_paths?: string[];
  screenshot_count?: number;
  screenshot_image_input_attached?: boolean;
  private_comparison?: {
    expected_review_status?: string;
    expected_quality_rating?: string;
    selection_stratum?: string;
    reviewer_present: boolean;
    note: string;
  };
  output: RubricReviewerOutput;
};

type DifySmokeResult = {
  ok: boolean;
  agentId?: string;
  cases?: Array<{
    ok: boolean;
    status: number | null;
    durationMs: number;
    answer: string;
    tools: string[];
    forbiddenToolsUsed: string[];
    usage?: unknown;
    error?: string;
  }>;
};

type CaseBatchResult = {
  case_id: string;
  template_name: string;
  source_url: string;
  provider: Provider;
  ok: boolean;
  output_status: RubricReviewerOutput['status'];
  recommendation: RubricReviewerOutput['recommendation'];
  quality_band: RubricReviewerOutput['quality_band'];
  confidence: RubricReviewerOutput['confidence'];
  standardized_finding_count: number;
  manual_check_count: number;
  screenshot_count: number;
  screenshot_image_input_attached: boolean;
  private_expected_review_status?: string;
  private_expected_quality_rating?: string;
  selection_stratum?: string;
  reviewer_present: boolean;
  alignment_label: string;
  safety_ok: boolean;
  out_dir: string;
  error?: string;
};

const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-expanded-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-rubric-reviewer-batch';
const DEFAULT_FORBIDDEN_DIFY_TOOLS = [
  'run_code',
  'run_command',
  'upload_file',
  'download_file',
  'crawl',
  'search',
  'hub_list_services',
  'hub_search_proxy_tools',
  'hub_describe_proxy_tool',
  'hub_execute_proxy_tool',
  'hub_refresh_connections',
  'hub_run_intent',
  'hub_run_proxy_tool',
  'hub_set_discovery',
  'hub_update_state',
];

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    provider: 'dry-run',
    caseIds: [],
    agent: 'eric-hub',
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-5.5',
    includeScreenshot: false,
    maxScreenshots: 4,
    imageDetail: 'low',
    timeoutMs: 120_000,
    maxRubricChars: 12_000,
    forbidTools: DEFAULT_FORBIDDEN_DIFY_TOOLS,
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
    if (arg === '--max-screenshots' && next) {
      options.maxScreenshots = boundedInt(next, 1, 12, '--max-screenshots');
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
    if (arg === '--forbid-tool' && next) {
      const existing = options.forbidTools ?? [];
      options.forbidTools = [...existing, next];
      index += 1;
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
    includeScreenshot: options.includeScreenshot ?? false,
    maxScreenshots: options.maxScreenshots ?? 4,
    imageDetail: options.imageDetail ?? 'low',
    timeoutMs: options.timeoutMs ?? 120_000,
    maxRubricChars: options.maxRubricChars ?? 12_000,
    forbidTools: Array.from(new Set(options.forbidTools ?? DEFAULT_FORBIDDEN_DIFY_TOOLS)),
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:batch -- [options]

Options:
  --input <dir>              Calibration output directory. Default: ${DEFAULT_INPUT_DIR}
  --out <dir>                Output directory. Default: ${DEFAULT_OUT_DIR}
  --provider <provider>      dry-run, openai, or dify-agent. Default: dry-run
  --case-id <id>             Include one case ID. Repeatable. Default: all cases, bounded by --limit.
  --limit <n>                Maximum number of manifest cases to run.
  --agent <id>               Dify inventory agent for --provider dify-agent. Default: eric-hub
  --model <model>            OpenAI model for --provider openai. Default: OPENAI_MODEL or gpt-5.5
  --include-screenshot       Include screenshot image input for direct OpenAI runs. Dify receives only text prompt metadata.
  --max-screenshots <n>      Maximum screenshots to include per case. Default: 4
  --image-detail <level>     low, high, or auto. Default: low
  --timeout-ms <n>           Provider timeout. Default: 120000
  --max-rubric-chars <n>     Rubric markdown budget. Default: 12000
  --forbid-tool <name>       Dify tool that must not be used. Repeatable. Defaults: ${DEFAULT_FORBIDDEN_DIFY_TOOLS.join(', ')}
  --help                     Show this help.

Behavior:
  Runs the shadow rubric reviewer over a small calibration subset and writes
  batch summaries. Private Airtable outcomes are not included in prompts; they
  are joined afterward only for calibration scoring.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function findRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);
  for (;;) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`Could not find repo root from ${startDir}.`);
    current = parent;
  }
}

function selectCases(cases: BlindCase[], options: CliOptions): BlindCase[] {
  const selected = options.caseIds.length > 0 ? cases.filter((item) => options.caseIds.includes(item.case_id)) : cases;
  if (options.caseIds.length > 0 && selected.length !== options.caseIds.length) {
    const found = new Set(selected.map((item) => item.case_id));
    const missing = options.caseIds.filter((caseId) => !found.has(caseId));
    throw new Error(`Missing requested case_id values: ${missing.join(', ')}`);
  }
  return typeof options.limit === 'number' ? selected.slice(0, options.limit) : selected;
}

async function runCommand(args: {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  allowFailure?: boolean;
}): Promise<{ code: number | null; stdout: string; stderr: string; duration_ms: number }> {
  const startedAt = Date.now();
  return await new Promise((resolve, reject) => {
    const child = spawn(args.command, args.args, {
      cwd: args.cwd,
      env: args.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      const result = {
        code,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        duration_ms: Date.now() - startedAt,
      };
      if (!args.allowFailure && code !== 0) {
        reject(new Error(`Command failed (${code}): ${args.command} ${args.args.join(' ')}\n${result.stderr || result.stdout}`));
        return;
      }
      resolve(result);
    });
  });
}

async function runSingleReviewer(args: {
  repoRoot: string;
  options: CliOptions;
  blindCase: BlindCase;
  caseDir: string;
  provider: 'dry-run' | 'openai';
}): Promise<RubricReviewerArtifact> {
  await mkdir(args.caseDir, { recursive: true });
  const commandArgs = [
    'tsx',
    'packages/webflow-template-review-mcp/scripts/run-rubric-reviewer-dry-run.ts',
    '--input',
    args.options.inputDir,
    '--out',
    args.caseDir,
    '--case-id',
    args.blindCase.case_id,
    '--provider',
    args.provider,
    '--model',
    args.options.model,
    '--image-detail',
    args.options.imageDetail,
    '--timeout-ms',
    String(args.options.timeoutMs),
    '--max-rubric-chars',
    String(args.options.maxRubricChars),
  ];
  if (args.options.includeScreenshot) commandArgs.push('--include-screenshot');
  commandArgs.push('--max-screenshots', String(args.options.maxScreenshots));
  await runCommand({ command: 'pnpm', args: commandArgs, cwd: args.repoRoot });
  return await readJson<RubricReviewerArtifact>(path.join(args.caseDir, 'rubric-reviewer-output.json'));
}

async function runDifyAgent(args: {
  repoRoot: string;
  options: CliOptions;
  blindCase: BlindCase;
  caseDir: string;
  baseArtifact: RubricReviewerArtifact;
}): Promise<RubricReviewerArtifact> {
  const promptFile = path.join(args.caseDir, 'rubric-reviewer-prompt.json');
  const difyQueryFile = path.join(args.caseDir, 'rubric-reviewer-dify-query.txt');
  const promptText = await readFile(promptFile, 'utf8');
  await writeFile(
    difyQueryFile,
    [
      'Do not call or inspect any tools for this task. Do not browse, crawl, search, execute code, inspect Hub services, or fetch external data.',
      'All available evidence is included below as a local shadow-review prompt artifact.',
      'Return only valid JSON matching the requested schema. Do not wrap the JSON in Markdown fences.',
      '',
      promptText.trim(),
      '',
    ].join('\n'),
  );
  const commandArgs = [
    'tsx',
    'scripts/dify-agent-smoke.ts',
    '--agent',
    args.options.agent,
    '--query-file',
    difyQueryFile,
    '--timeout-ms',
    String(args.options.timeoutMs),
    '--max-attempts',
    '1',
    '--user',
    `rubric-reviewer-${args.blindCase.case_id}`.slice(0, 120),
  ];
  for (const tool of args.options.forbidTools) {
    commandArgs.push('--forbid-tool', tool);
  }

  const result = await runCommand({
    command: 'pnpm',
    args: commandArgs,
    cwd: args.repoRoot,
    allowFailure: true,
  });
  const rawPath = path.join(args.caseDir, 'rubric-reviewer-dify-smoke-result.json');

  let smokeResult: DifySmokeResult | undefined;
  let output: RubricReviewerOutput;
  try {
    smokeResult = parseJsonFromText<DifySmokeResult>(result.stdout);
    await writeFile(rawPath, `${JSON.stringify(smokeResult, null, 2)}\n`);
    const smokeCase = smokeResult.cases?.[0];
    if (!smokeCase) throw new Error('Dify smoke result did not contain a case result.');
    if (!smokeResult.ok || !smokeCase.ok || smokeCase.forbiddenToolsUsed.length > 0) {
      throw new Error(
        `Dify smoke failed. status=${smokeCase.status ?? 'unknown'} forbidden_tools=${smokeCase.forbiddenToolsUsed.join(',')}`,
      );
    }
    output = parseRubricOutput(smokeCase.answer, args.blindCase.case_id);
  } catch (error) {
    await writeFile(
      rawPath,
      `${JSON.stringify(
        {
          parse_error: error instanceof Error ? error.message : String(error),
          process_exit_code: result.code,
          stdout: result.stdout.slice(0, 20_000),
          stderr: result.stderr.slice(0, 20_000),
          parsed_smoke_result: smokeResult,
        },
        null,
        2,
      )}\n`,
    );
    output = failedProviderOutput(args.blindCase, args.baseArtifact.output.safety.screenshot_used, error);
  }

  const artifact: RubricReviewerArtifact = {
    generated_at: new Date().toISOString(),
    provider: 'dify-agent',
    model: `dify:${args.options.agent}`,
    latency_ms: result.duration_ms,
    input_dir: args.options.inputDir,
    case_id: args.blindCase.case_id,
    screenshot_paths: args.baseArtifact.screenshot_paths,
    screenshot_count: args.baseArtifact.screenshot_count,
    screenshot_image_input_attached: false,
    private_comparison: args.baseArtifact.private_comparison,
    output,
  };
  await writeFile(path.join(args.caseDir, 'rubric-reviewer-output.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  await writeFile(
    path.join(args.caseDir, 'rubric-reviewer-summary.json'),
    `${JSON.stringify(
      {
        ok: output.status === 'shadow',
        provider: artifact.provider,
        model: artifact.model,
        case_id: args.blindCase.case_id,
        template_name: args.blindCase.template_name,
        source_url: args.blindCase.source_url,
        screenshot_used: output.safety.screenshot_used,
        screenshot_count: artifact.screenshot_count ?? 0,
        screenshot_image_input_attached: artifact.screenshot_image_input_attached ?? false,
        recommendation: output.recommendation,
        quality_band: output.quality_band,
        confidence: output.confidence,
        standardized_finding_count: output.standardized_findings.length,
        manual_checks_remaining: output.manual_checks_remaining,
        private_expected_review_status: artifact.private_comparison?.expected_review_status,
        private_expected_quality_rating: artifact.private_comparison?.expected_quality_rating,
        out_dir: args.caseDir,
      },
      null,
      2,
    )}\n`,
  );
  return artifact;
}

function parseJsonFromText<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim()) as T;
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as T;
    throw new Error('No JSON object found in provider response.');
  }
}

function parseRubricOutput(text: string, expectedCaseId: string): RubricReviewerOutput {
  const parsed = parseJsonFromText<RubricReviewerOutput>(text);
  if (parsed.schema_version !== 'rubric_reviewer_shadow.v0.1') throw new Error('Invalid schema_version.');
  if (parsed.case_id !== expectedCaseId) throw new Error(`Provider returned case_id=${parsed.case_id}, expected ${expectedCaseId}.`);
  if (!parsed.safety?.not_final_decision || !parsed.safety?.no_external_writes || !parsed.safety?.private_outcomes_excluded) {
    throw new Error('Provider output violated safety contract.');
  }
  return parsed;
}

function failedProviderOutput(blindCase: BlindCase, screenshotUsed: boolean, error: unknown): RubricReviewerOutput {
  const message = error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800);
  return {
    schema_version: 'rubric_reviewer_shadow.v0.1',
    case_id: blindCase.case_id,
    template_name: blindCase.template_name,
    source_url: blindCase.source_url,
    status: 'failed',
    recommendation: 'insufficient_evidence',
    quality_band: 'uncertain',
    confidence: 'low',
    standardized_findings: [],
    manual_checks_remaining: ['provider_retry', 'human_review'],
    cannot_determine: ['rubric_bands', 'standardized_feedback'],
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      private_outcomes_excluded: true,
      screenshot_used: screenshotUsed,
    },
  };
}

function summarizeCase(
  options: CliOptions,
  blindCase: BlindCase,
  artifact: RubricReviewerArtifact,
  privateOutcome: PrivateOutcome | undefined,
  caseDir: string,
): CaseBatchResult {
  const output = artifact.output;
  const safetyOk = Boolean(
    output.safety?.not_final_decision && output.safety?.no_external_writes && output.safety?.private_outcomes_excluded,
  );
  return {
    case_id: blindCase.case_id,
    template_name: blindCase.template_name,
    source_url: blindCase.source_url,
    provider: options.provider,
    ok: output.status === 'shadow' && safetyOk,
    output_status: output.status,
    recommendation: output.recommendation,
    quality_band: output.quality_band,
    confidence: output.confidence,
    standardized_finding_count: output.standardized_findings.length,
    manual_check_count: output.manual_checks_remaining.length,
    screenshot_count: artifact.screenshot_count ?? 0,
    screenshot_image_input_attached: Boolean(artifact.screenshot_image_input_attached),
    private_expected_review_status: privateOutcome?.actual_review_status,
    private_expected_quality_rating: privateOutcome?.actual_quality_rating,
    selection_stratum: privateOutcome?.selection_stratum,
    reviewer_present: Boolean(privateOutcome?.reviewer),
    alignment_label: alignmentLabel(output, privateOutcome),
    safety_ok: safetyOk,
    out_dir: caseDir,
  };
}

function alignmentLabel(output: RubricReviewerOutput, privateOutcome: PrivateOutcome | undefined): string {
  if (output.status === 'failed') return 'provider_failed';
  const stratum = privateOutcome?.selection_stratum ?? '';
  const recommendation = output.recommendation;
  if (stratum.startsWith('approved')) {
    if (recommendation === 'likely_rejectable') return 'danger_false_reject_candidate';
    if (recommendation === 'manual_review_required' || output.quality_band === 'uncertain') return 'cautious_on_approved_case';
    return 'possible_approval_alignment';
  }
  if (stratum === 'rejected_low_quality') {
    if (recommendation === 'clean_good_candidate' || recommendation === 'exceptional_human_review_candidate') {
      return 'danger_false_approval_candidate';
    }
    if (recommendation === 'likely_rejectable') return 'possible_reject_alignment';
    return 'cautious_on_rejected_case';
  }
  if (stratum === 'iterative_review') {
    if (recommendation === 'request_changes_average' || recommendation === 'manual_review_required') return 'possible_iteration_alignment';
    if (recommendation === 'clean_good_candidate' || recommendation === 'exceptional_human_review_candidate') {
      return 'danger_false_approval_candidate';
    }
    return 'cautious_on_iterative_case';
  }
  return 'no_private_comparison';
}

function countBy<T extends string>(items: T[]): Record<T, number> {
  return items.reduce(
    (accumulator, item) => {
      accumulator[item] = (accumulator[item] ?? 0) + 1;
      return accumulator;
    },
    {} as Record<T, number>,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = findRepoRoot(process.cwd());
  await mkdir(options.outDir, { recursive: true });

  const blindCases = await readJsonl<BlindCase>(path.join(options.inputDir, 'manifest.blind.jsonl'));
  const privateOutcomes = await readJsonl<PrivateOutcome>(path.join(options.inputDir, 'outcomes.private.jsonl')).catch(() => []);
  const selectedCases = selectCases(blindCases, options);
  if (selectedCases.length === 0) throw new Error('No cases selected.');

  const results: CaseBatchResult[] = [];
  for (const blindCase of selectedCases) {
    const caseDir = path.join(options.outDir, 'cases', blindCase.case_id);
    const singleProvider = options.provider === 'dify-agent' ? 'dry-run' : options.provider;
    const baseArtifact = await runSingleReviewer({
      repoRoot,
      options,
      blindCase,
      caseDir,
      provider: singleProvider,
    });
    const artifact =
      options.provider === 'dify-agent'
        ? await runDifyAgent({ repoRoot, options, blindCase, caseDir, baseArtifact })
        : baseArtifact;
    const privateOutcome = privateOutcomes.find((item) => item.case_id === blindCase.case_id);
    const summary = summarizeCase(options, blindCase, artifact, privateOutcome, caseDir);
    results.push(summary);
    console.log(JSON.stringify(summary));
  }

  const resultJsonl = results.map((item) => JSON.stringify(item)).join('\n');
  await writeFile(path.join(options.outDir, 'rubric-reviewer-batch-results.jsonl'), `${resultJsonl}\n`);
  const summary = {
    generated_at: new Date().toISOString(),
    provider: options.provider,
    model: options.provider === 'openai' ? options.model : options.provider === 'dify-agent' ? `dify:${options.agent}` : 'dry_run_no_model_call',
    input_dir: options.inputDir,
    out_dir: options.outDir,
    selected_count: results.length,
    ok_count: results.filter((item) => item.ok).length,
    failed_count: results.filter((item) => item.output_status === 'failed').length,
    safety_failure_count: results.filter((item) => !item.safety_ok).length,
    recommendation_counts: countBy(results.map((item) => item.recommendation)),
    quality_band_counts: countBy(results.map((item) => item.quality_band)),
    alignment_counts: countBy(results.map((item) => item.alignment_label)),
    notes: [
      'Private Airtable outcomes were excluded from all reviewer prompts and joined only after output for calibration scoring.',
      'Dify provider runs receive text prompt artifacts only; direct OpenAI provider is required for actual screenshot image input.',
      'Batch outputs are shadow-only and must not be used as official approval, rejection, rating, featured, or creator-facing feedback decisions.',
    ],
  };
  await writeFile(path.join(options.outDir, 'rubric-reviewer-batch-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
