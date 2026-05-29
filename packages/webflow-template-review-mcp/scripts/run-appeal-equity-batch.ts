import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  outDir: string;
  limit: number;
  targetStrata: string[];
  maxTargetFindingCount: number;
  maxTargetSubstantiveCount: number;
  minCitedSubstantiveCount: number;
  preferSameReviewer: boolean;
  requireSameReviewer: boolean;
  commandTimeoutMs: number;
};

type AlignmentRow = {
  case_id: string;
  asset_id?: string;
  version_id?: string;
  template_name: string;
  source_url: string;
  selection_stratum?: string;
  expected_review_status?: string;
  expected_quality_rating?: string;
  reviewer?: string;
  evidence_status?: string;
  rendered_status?: string;
  finding_count?: number;
  substantive_finding_count?: number;
  finding_rule_ids?: string[];
  alignment_label?: string;
  notes?: string[];
};

type ComparisonReport = {
  status: 'shadow';
  target: {
    case_id: string;
    template_name: string;
    reviewer?: string;
    finding_count: number;
    substantive_finding_count: number;
    objective_issue_count: number;
  };
  cited: Array<{
    case_id: string;
    template_name: string;
    reviewer?: string;
    finding_count: number;
    substantive_finding_count: number;
    objective_issue_count: number;
  }>;
  comparison_findings: Array<{ id: string; severity: string }>;
  consistency_questions: Array<{ id: string; bucket: string; severity: string }>;
  safety: Record<string, boolean>;
};

type BatchRow = {
  target_case_id: string;
  target_template_name: string;
  target_reviewer?: string;
  cited_case_ids: string[];
  cited_template_names: string[];
  same_reviewer_cited: boolean;
  out_dir: string;
  comparison_finding_count: number;
  consistency_question_count: number;
  question_ids: string[];
};

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-appeal-equity-batch';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    limit: 8,
    targetStrata: ['rejected_low_quality'],
    maxTargetFindingCount: 1,
    maxTargetSubstantiveCount: 0,
    minCitedSubstantiveCount: 1,
    preferSameReviewer: true,
    requireSameReviewer: false,
    commandTimeoutMs: 120_000,
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
    if (arg === '--limit' && next) {
      options.limit = boundedInt(next, 1, 100, arg);
      index += 1;
      continue;
    }
    if (arg === '--target-strata' && next) {
      options.targetStrata = splitCsv(next);
      index += 1;
      continue;
    }
    if (arg === '--max-target-finding-count' && next) {
      options.maxTargetFindingCount = boundedInt(next, 0, 100, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-target-substantive-count' && next) {
      options.maxTargetSubstantiveCount = boundedInt(next, 0, 100, arg);
      index += 1;
      continue;
    }
    if (arg === '--min-cited-substantive-count' && next) {
      options.minCitedSubstantiveCount = boundedInt(next, 0, 100, arg);
      index += 1;
      continue;
    }
    if (arg === '--no-prefer-same-reviewer') {
      options.preferSameReviewer = false;
      continue;
    }
    if (arg === '--require-same-reviewer') {
      options.requireSameReviewer = true;
      continue;
    }
    if (arg === '--command-timeout-ms' && next) {
      options.commandTimeoutMs = boundedInt(next, 5_000, 600_000, arg);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    inputDir: options.inputDir ?? DEFAULT_INPUT_DIR,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    limit: options.limit ?? 8,
    targetStrata: options.targetStrata ?? ['rejected_low_quality'],
    maxTargetFindingCount: options.maxTargetFindingCount ?? 1,
    maxTargetSubstantiveCount: options.maxTargetSubstantiveCount ?? 0,
    minCitedSubstantiveCount: options.minCitedSubstantiveCount ?? 1,
    preferSameReviewer: options.preferSameReviewer ?? true,
    requireSameReviewer: options.requireSameReviewer ?? false,
    commandTimeoutMs: options.commandTimeoutMs ?? 120_000,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:batch -- [options]

Options:
  --input <dir>                           Calibration directory with status-alignment.jsonl.
                                          Default: ${DEFAULT_INPUT_DIR}
  --out <dir>                             Output directory. Default: ${DEFAULT_OUT_DIR}
  --limit <n>                             Max target comparisons. Default: 8
  --target-strata <csv>                   Target strata. Default: rejected_low_quality
  --max-target-finding-count <n>          Max target total findings. Default: 1
  --max-target-substantive-count <n>      Max target substantive findings. Default: 0
  --min-cited-substantive-count <n>       Min approved cited substantive findings. Default: 1
  --no-prefer-same-reviewer               Do not prefer same-reviewer cited examples.
  --require-same-reviewer                 Skip targets without a same-reviewer cited example.
  --command-timeout-ms <n>                Per-comparison timeout. Default: 120000
  --help                                  Show this help.

Behavior:
  Selects a small shadow appeal/equity batch from existing calibration evidence,
  then delegates each comparison to appeal:equity:compare. It does not decide
  appeals, approvals, rejections, ratings, or creator-facing feedback.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function normalize(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function findingCount(row: AlignmentRow): number {
  return row.finding_count ?? 0;
}

function substantiveCount(row: AlignmentRow): number {
  return row.substantive_finding_count ?? 0;
}

function isApproved(row: AlignmentRow): boolean {
  return normalize(row.selection_stratum).includes('approved') || normalize(row.expected_review_status).includes('approved');
}

function isTargetStratum(row: AlignmentRow, targetStrata: string[]): boolean {
  const stratum = normalize(row.selection_stratum);
  return targetStrata.map(normalize).includes(stratum);
}

function usable(row: AlignmentRow): boolean {
  return normalize(row.evidence_status) === 'usable';
}

function targetCandidates(rows: AlignmentRow[], options: CliOptions): AlignmentRow[] {
  return rows
    .filter((row) => isTargetStratum(row, options.targetStrata))
    .filter(usable)
    .filter((row) => findingCount(row) <= options.maxTargetFindingCount)
    .filter((row) => substantiveCount(row) <= options.maxTargetSubstantiveCount)
    .sort((a, b) => {
      const findingDelta = findingCount(a) - findingCount(b);
      if (findingDelta !== 0) return findingDelta;
      return a.case_id.localeCompare(b.case_id);
    });
}

function citedCandidates(rows: AlignmentRow[], options: CliOptions): AlignmentRow[] {
  return rows
    .filter(isApproved)
    .filter(usable)
    .filter((row) => substantiveCount(row) >= options.minCitedSubstantiveCount)
    .sort((a, b) => {
      const substantiveDelta = substantiveCount(b) - substantiveCount(a);
      if (substantiveDelta !== 0) return substantiveDelta;
      const findingDelta = findingCount(b) - findingCount(a);
      if (findingDelta !== 0) return findingDelta;
      return a.case_id.localeCompare(b.case_id);
    });
}

function chooseCited(target: AlignmentRow, citedRows: AlignmentRow[], options: CliOptions): AlignmentRow | undefined {
  const sameReviewer = citedRows.find((row) => row.reviewer && target.reviewer && row.reviewer === target.reviewer);
  if (sameReviewer && options.preferSameReviewer) return sameReviewer;
  if (options.requireSameReviewer) return sameReviewer;
  return citedRows[0];
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function runComparison(target: AlignmentRow, cited: AlignmentRow, outDir: string, options: CliOptions): Promise<ComparisonReport> {
  const comparisonScript = path.join(SCRIPT_DIR, 'run-appeal-equity-comparison.ts');
  await mkdir(outDir, { recursive: true });
  await execFileAsync(
    process.execPath,
    [
      '--import',
      'tsx',
      comparisonScript,
      '--input',
      options.inputDir,
      '--target',
      target.case_id,
      '--cited',
      cited.case_id,
      '--out',
      outDir,
    ],
    {
      cwd: path.resolve(SCRIPT_DIR, '..'),
      timeout: options.commandTimeoutMs,
      maxBuffer: 1024 * 1024 * 8,
    },
  );
  return JSON.parse(await readFile(path.join(outDir, 'appeal-equity-comparison.json'), 'utf8')) as ComparisonReport;
}

function buildMarkdown(summary: Record<string, unknown>, rows: BatchRow[]): string {
  const lines = [
    '# Appeal Equity Batch',
    '',
    `Generated: ${summary.generated_at}`,
    `Input: \`${summary.input_dir}\``,
    '',
    '**Status:** Shadow evidence only',
    '',
    'This artifact routes consistency questions for human review. It must not be used as an appeal decision, approval, rejection, rating, or creator-facing response.',
    '',
    '## Summary',
    '',
    `- Target candidates: ${summary.target_candidate_count}`,
    `- Approved cited candidates: ${summary.cited_candidate_count}`,
    `- Comparisons generated: ${summary.comparison_count}`,
    `- Same-reviewer comparisons: ${summary.same_reviewer_comparison_count}`,
    '',
    '## Comparisons',
    '',
    '| Target | Reviewer | Cited comparison | Same reviewer | Findings | Questions | Artifact |',
    '| --- | --- | --- | --- | ---: | ---: | --- |',
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.target_template_name} | ${row.target_reviewer ?? '(missing)'} | ${row.cited_template_names.join(', ')} | ${row.same_reviewer_cited ? 'yes' : 'no'} | ${row.comparison_finding_count} | ${row.consistency_question_count} | \`${row.out_dir}\` |`,
    );
  }

  lines.push(
    '',
    '## Use',
    '',
    '- Review the per-target comparison packet before responding to a creator.',
    '- Treat repeated question IDs as policy/guideline gaps to clarify, not as automated appeal outcomes.',
    '- Add real creator-cited examples when available; this batch uses approved comparison candidates from the calibration slice.',
  );

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const alignmentRows = await readJsonl<AlignmentRow>(path.join(options.inputDir, 'status-alignment.jsonl'));
  const targets = targetCandidates(alignmentRows, options);
  const citedRows = citedCandidates(alignmentRows, options);
  if (targets.length === 0) throw new Error('No target candidates matched the batch criteria.');
  if (citedRows.length === 0) throw new Error('No approved cited candidates matched the batch criteria.');

  const batchRows: BatchRow[] = [];
  for (const target of targets.slice(0, options.limit)) {
    const cited = chooseCited(target, citedRows, options);
    if (!cited) continue;
    const outDir = path.join(
      options.outDir,
      `${String(batchRows.length + 1).padStart(2, '0')}-${slug(target.template_name)}-vs-${slug(cited.template_name)}`,
    );
    const report = await runComparison(target, cited, outDir, options);
    batchRows.push({
      target_case_id: target.case_id,
      target_template_name: target.template_name,
      target_reviewer: target.reviewer,
      cited_case_ids: report.cited.map((row) => row.case_id),
      cited_template_names: report.cited.map((row) => row.template_name),
      same_reviewer_cited: report.cited.some((row) => row.reviewer && target.reviewer && row.reviewer === target.reviewer),
      out_dir: outDir,
      comparison_finding_count: report.comparison_findings.length,
      consistency_question_count: report.consistency_questions.length,
      question_ids: report.consistency_questions.map((question) => question.id),
    });
  }

  const summary = {
    schema_version: 'appeal_equity_batch.v0.1',
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    status: 'shadow',
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      no_creator_facing_feedback: true,
      human_reviewer_required: true,
    },
    selection: {
      target_strata: options.targetStrata,
      max_target_finding_count: options.maxTargetFindingCount,
      max_target_substantive_count: options.maxTargetSubstantiveCount,
      min_cited_substantive_count: options.minCitedSubstantiveCount,
      prefer_same_reviewer: options.preferSameReviewer,
      require_same_reviewer: options.requireSameReviewer,
    },
    target_candidate_count: targets.length,
    cited_candidate_count: citedRows.length,
    comparison_count: batchRows.length,
    same_reviewer_comparison_count: batchRows.filter((row) => row.same_reviewer_cited).length,
    rows: batchRows,
  };

  const summaryJson = path.join(options.outDir, 'appeal-equity-batch-summary.json');
  const summaryMarkdown = path.join(options.outDir, 'appeal-equity-batch-summary.md');
  await writeFile(summaryJson, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(summaryMarkdown, buildMarkdown(summary, batchRows));

  console.log(
    JSON.stringify(
      {
        ok: true,
        out_dir: options.outDir,
        target_candidate_count: targets.length,
        cited_candidate_count: citedRows.length,
        comparison_count: batchRows.length,
        same_reviewer_comparison_count: summary.same_reviewer_comparison_count,
        summary_json: summaryJson,
        summary_markdown: summaryMarkdown,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
