import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  outcomesFile?: string;
  visualFeedbackFile?: string;
  modelResultsFile?: string;
  outDir: string;
  minReviewerSample: number;
  maxReviewerShare: number;
};

type PrivateOutcome = {
  case_id?: string;
  asset_id?: string;
  version_id?: string;
  selection_stratum?: string;
  actual_review_status?: string;
  actual_quality_rating?: string;
  reviewer?: string;
  rejection_reason?: string;
};

type VisualQualityRow = {
  version_id?: string;
  reviewer?: string;
  review_status?: string;
  quality_rating?: string;
  rejection_reason?: string;
  visual_signal?: boolean;
  exact_outdated_signal?: boolean;
  normalized_buckets?: string[];
};

type ModelResult = {
  case_id?: string;
  version_id?: string;
  alignment_label?: string;
  comparison_label?: string;
  route_signal?: string;
  recommendation?: string;
  quality_band?: string;
  selection_stratum?: string;
};

type ReviewerStats = {
  reviewer: string;
  outcome_count: number;
  outcome_share: number;
  by_status: Record<string, number>;
  by_quality_rating: Record<string, number>;
  by_selection_stratum: Record<string, number>;
  visual_feedback_count: number;
  visual_signal_count: number;
  visual_signal_rate: number;
  exact_outdated_count: number;
  exact_outdated_rate: number;
  visual_buckets: Record<string, number>;
  model_result_count: number;
  model_alignment: Record<string, number>;
  possible_bias_flags: string[];
};

const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-reviewer-calibration';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: DEFAULT_OUT_DIR,
    minReviewerSample: 5,
    maxReviewerShare: 0.5,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--outcomes' && next) {
      options.outcomesFile = next;
      index += 1;
      continue;
    }
    if (arg === '--visual-feedback' && next) {
      options.visualFeedbackFile = next;
      index += 1;
      continue;
    }
    if (arg === '--model-results' && next) {
      options.modelResultsFile = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--min-reviewer-sample' && next) {
      options.minReviewerSample = boundedInt(next, 1, 1_000, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-reviewer-share' && next) {
      options.maxReviewerShare = rateOption(next, arg);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.outcomesFile && !options.visualFeedbackFile) {
    throw new Error('Provide --outcomes and/or --visual-feedback.');
  }

  return {
    outcomesFile: options.outcomesFile,
    visualFeedbackFile: options.visualFeedbackFile,
    modelResultsFile: options.modelResultsFile,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    minReviewerSample: options.minReviewerSample ?? 5,
    maxReviewerShare: options.maxReviewerShare ?? 0.5,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp calibration:reviewer-bias -- [options]

Options:
  --outcomes <file>              Private outcome JSONL with reviewer labels.
  --visual-feedback <file>       Visual-quality normalized JSONL from calibration:visual-quality.
  --model-results <file>         Optional model/lane result JSONL keyed by case_id.
  --out <dir>                    Output directory. Default: ${DEFAULT_OUT_DIR}
  --min-reviewer-sample <n>      Flag small reviewer samples. Default: 5
  --max-reviewer-share <n>       Flag concentration above this share. Default: 0.5
  --help                         Show this help.

Behavior:
  Produces reviewer-stratified calibration metrics. This is bias analysis only:
  it must not create reviewer-specific review rules.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function rateOption(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) throw new Error(`${flag} must be a number between 0 and 1.`);
  return parsed;
}

async function readJsonl<T>(filePath: string | undefined): Promise<T[]> {
  if (!filePath) return [];
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function increment(record: Record<string, number>, key: string | undefined) {
  const normalized = key?.trim() || '(missing)';
  record[normalized] = (record[normalized] ?? 0) + 1;
}

function rate(count: number, total: number): number {
  return total > 0 ? Number((count / total).toFixed(4)) : 0;
}

function reviewerName(value: string | undefined): string {
  return value?.trim() || '(missing reviewer)';
}

function modelLabel(row: ModelResult): string {
  return row.comparison_label ?? row.alignment_label ?? row.route_signal ?? row.recommendation ?? row.quality_band ?? '(missing)';
}

function buildMarkdown(summary: Record<string, unknown>, reviewers: ReviewerStats[]): string {
  const lines = [
    '# Reviewer Calibration Bias Audit',
    '',
    `Generated: ${summary.generated_at}`,
    '',
    `Unmatched model results: ${summary.unmatched_model_result_count ?? 0}`,
    '',
    '## Purpose',
    '',
    'Identify reviewer concentration and reviewer-correlated outcome patterns so eval sets can be rebalanced. This report must not create reviewer-specific policy.',
    '',
    '## Reviewer Summary',
    '',
    '| Reviewer | Outcomes | Share | Visual signal rate | Exact outdated rate | Model rows | Flags |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ];

  for (const reviewer of reviewers) {
    lines.push(
      `| ${reviewer.reviewer} | ${reviewer.outcome_count} | ${reviewer.outcome_share} | ${reviewer.visual_signal_rate} | ${reviewer.exact_outdated_rate} | ${reviewer.model_result_count} | ${reviewer.possible_bias_flags.join(', ') || 'none'} |`,
    );
  }

  lines.push(
    '',
    '## Recommended Use',
    '',
    '- Cap any single reviewer share in a golden/eval slice unless intentionally measuring that reviewer.',
    '- Track reviewer identity as calibration metadata, not as a branch in the review policy.',
    '- Promote aliases and golden cases only after lead approval and cross-reviewer validation.',
    '- When one reviewer dominates a status band, add counter-samples from other reviewers before tuning prompts.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });
  const outcomes = await readJsonl<PrivateOutcome>(options.outcomesFile);
  const visualRows = await readJsonl<VisualQualityRow>(options.visualFeedbackFile);
  const modelRows = await readJsonl<ModelResult>(options.modelResultsFile);
  const outcomesByCase = new Map(outcomes.filter((row) => row.case_id).map((row) => [row.case_id, row]));
  const outcomesByVersion = new Map(outcomes.filter((row) => row.version_id).map((row) => [row.version_id, row]));
  const reviewers = new Map<string, ReviewerStats>();
  const globalVisualSignalRate = rate(visualRows.filter((row) => row.visual_signal).length, visualRows.length);
  const globalExactOutdatedRate = rate(visualRows.filter((row) => row.exact_outdated_signal).length, visualRows.length);
  let unmatchedModelResultCount = 0;

  function ensureReviewer(name: string): ReviewerStats {
    const existing = reviewers.get(name);
    if (existing) return existing;
    const next: ReviewerStats = {
      reviewer: name,
      outcome_count: 0,
      outcome_share: 0,
      by_status: {},
      by_quality_rating: {},
      by_selection_stratum: {},
      visual_feedback_count: 0,
      visual_signal_count: 0,
      visual_signal_rate: 0,
      exact_outdated_count: 0,
      exact_outdated_rate: 0,
      visual_buckets: {},
      model_result_count: 0,
      model_alignment: {},
      possible_bias_flags: [],
    };
    reviewers.set(name, next);
    return next;
  }

  for (const outcome of outcomes) {
    const stats = ensureReviewer(reviewerName(outcome.reviewer));
    stats.outcome_count += 1;
    increment(stats.by_status, outcome.actual_review_status);
    increment(stats.by_quality_rating, outcome.actual_quality_rating);
    increment(stats.by_selection_stratum, outcome.selection_stratum);
  }

  for (const row of visualRows) {
    const stats = ensureReviewer(reviewerName(row.reviewer));
    stats.visual_feedback_count += 1;
    if (row.visual_signal) stats.visual_signal_count += 1;
    if (row.exact_outdated_signal) stats.exact_outdated_count += 1;
    for (const bucket of row.normalized_buckets ?? []) increment(stats.visual_buckets, bucket);
  }

  for (const row of modelRows) {
    const outcome = (row.case_id ? outcomesByCase.get(row.case_id) : undefined) ?? (row.version_id ? outcomesByVersion.get(row.version_id) : undefined);
    if (!outcome) {
      unmatchedModelResultCount += 1;
      continue;
    }
    const stats = ensureReviewer(reviewerName(outcome.reviewer));
    stats.model_result_count += 1;
    increment(stats.model_alignment, modelLabel(row));
  }

  const sorted = [...reviewers.values()].sort((a, b) => b.outcome_count + b.visual_feedback_count - (a.outcome_count + a.visual_feedback_count));
  const totalOutcomes = outcomes.length;
  for (const stats of sorted) {
    stats.outcome_share = rate(stats.outcome_count, totalOutcomes);
    stats.visual_signal_rate = rate(stats.visual_signal_count, stats.visual_feedback_count);
    stats.exact_outdated_rate = rate(stats.exact_outdated_count, stats.visual_feedback_count);
    if (stats.outcome_count > 0 && stats.outcome_count < options.minReviewerSample) stats.possible_bias_flags.push('low_outcome_sample');
    if (stats.outcome_share > options.maxReviewerShare) stats.possible_bias_flags.push('reviewer_concentration');
    if (stats.visual_feedback_count >= options.minReviewerSample && Math.abs(stats.visual_signal_rate - globalVisualSignalRate) >= 0.2) {
      stats.possible_bias_flags.push('visual_signal_rate_outlier');
    }
    if (stats.visual_feedback_count >= options.minReviewerSample && stats.exact_outdated_rate > globalExactOutdatedRate + 0.1) {
      stats.possible_bias_flags.push('outdated_phrase_rate_outlier');
    }
  }

  const summary = {
    generated_at: new Date().toISOString(),
    outcomes_file: options.outcomesFile,
    visual_feedback_file: options.visualFeedbackFile,
    model_results_file: options.modelResultsFile,
    out_dir: options.outDir,
    outcome_count: outcomes.length,
    visual_feedback_count: visualRows.length,
    model_result_count: modelRows.length,
    unmatched_model_result_count: unmatchedModelResultCount,
    global_visual_signal_rate: globalVisualSignalRate,
    global_exact_outdated_rate: globalExactOutdatedRate,
    reviewer_count: sorted.length,
    flagged_reviewer_count: sorted.filter((reviewer) => reviewer.possible_bias_flags.length > 0).length,
    policy: {
      use_reviewer_identity_as: 'calibration_metadata_only',
      must_not_create: 'reviewer_specific_policy',
      correction_strategy: 'rebalance_samples_normalize_language_and_require_cross_reviewer_validation',
    },
    files: {
      summary: path.join(options.outDir, 'reviewer-calibration-summary.json'),
      reviewers: path.join(options.outDir, 'reviewer-calibration-by-reviewer.jsonl'),
      markdown: path.join(options.outDir, 'reviewer-calibration-bias-audit.md'),
    },
  };

  await writeFile(summary.files.summary, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(summary.files.reviewers, `${sorted.map((row) => JSON.stringify(row)).join('\n')}\n`);
  await writeFile(summary.files.markdown, buildMarkdown(summary, sorted));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
