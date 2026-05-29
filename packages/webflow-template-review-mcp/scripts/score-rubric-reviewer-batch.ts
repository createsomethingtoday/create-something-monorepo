import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type ReviewerRecommendation =
  | 'likely_rejectable'
  | 'request_changes_average'
  | 'clean_good_candidate'
  | 'exceptional_human_review_candidate'
  | 'manual_review_required'
  | 'insufficient_evidence';

type ReviewerQualityBand = 'reject' | 'average' | 'good_candidate' | 'exceptional_candidate' | 'uncertain';

type ExpectedOutcome = 'approved_good' | 'approved_exceptional' | 'rejected_low_quality' | 'iterative_review' | 'unknown';
type PredictedOutcome = 'reject_candidate' | 'request_changes_candidate' | 'approval_candidate' | 'exceptional_candidate' | 'manual_review' | 'failed';
type ComparisonLabel =
  | 'aligned'
  | 'acceptable_escalation'
  | 'cautious_on_approved_case'
  | 'cautious_on_rejected_case'
  | 'possible_iteration_alignment'
  | 'missed_exceptional_candidate'
  | 'false_approval_risk'
  | 'false_rejection_risk'
  | 'provider_failed'
  | 'safety_failure'
  | 'no_private_comparison';

type CliOptions = {
  inputDir: string;
  resultsFile: string;
  outDir: string;
  minScoredCount: number;
  maxFalseApprovalRate: number;
  maxFalseRejectionRate: number;
  maxProviderFailureRate: number;
  maxEscalationRate: number;
  maxMissedExceptionalRate: number;
  requireImageInputs: boolean;
  failOnGate: boolean;
};

type BatchResult = {
  case_id: string;
  template_name: string;
  source_url: string;
  provider: string;
  ok: boolean;
  output_status: 'shadow' | 'failed';
  recommendation: ReviewerRecommendation;
  quality_band: ReviewerQualityBand;
  confidence: 'low' | 'medium' | 'high';
  standardized_finding_count: number;
  manual_check_count: number;
  screenshot_count?: number;
  screenshot_image_input_attached?: boolean;
  private_expected_review_status?: string;
  private_expected_quality_rating?: string;
  selection_stratum?: string;
  reviewer_present: boolean;
  alignment_label?: string;
  safety_ok: boolean;
  out_dir: string;
};

type ScoredRow = BatchResult & {
  expected_outcome: ExpectedOutcome;
  predicted_outcome: PredictedOutcome;
  comparison_label: ComparisonLabel;
  escalation_required: boolean;
  rationale: string;
};

const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-rubric-reviewer-batch';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
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
    if (arg === '--results' && next) {
      options.resultsFile = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
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

  const inputDir = options.inputDir ?? DEFAULT_INPUT_DIR;
  return {
    inputDir,
    resultsFile: options.resultsFile ?? path.join(inputDir, 'rubric-reviewer-batch-results.jsonl'),
    outDir: options.outDir ?? inputDir,
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
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:score -- [options]

Options:
  --input <dir>                       Directory with rubric-reviewer-batch-results.jsonl.
                                      Default: ${DEFAULT_INPUT_DIR}
  --results <file>                    Batch results JSONL.
                                      Default: <input>/rubric-reviewer-batch-results.jsonl
  --out <dir>                         Output directory. Default: same as input.
  --min-scored-count <n>              Minimum private-comparison rows required. Default: 8
  --max-false-approval-rate <n>       Promotion gate. Default: 0
  --max-false-rejection-rate <n>      Promotion gate. Default: 0.05
  --max-provider-failure-rate <n>     Promotion gate. Default: 0
  --max-escalation-rate <n>           Promotion gate. Default: 0.7
  --max-missed-exceptional-rate <n>   Promotion gate for approved-exceptional recall. Default: 0
  --require-image-inputs              Block if scored rows did not attach model image inputs.
  --fail-on-gate                      Exit non-zero when promotion gate is blocked.
  --help                              Show this help.

Behavior:
  Scores shadow rubric reviewer batch outputs against private outcomes that
  were joined after generation. Does not call model providers or write external systems.
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

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, 'utf8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function writeJsonl(filePath: string, rows: unknown[]) {
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}${rows.length ? '\n' : ''}`);
}

function expectedOutcome(row: BatchResult): ExpectedOutcome {
  const stratum = row.selection_stratum?.trim();
  if (stratum === 'approved_good') return 'approved_good';
  if (stratum === 'approved_exceptional') return 'approved_exceptional';
  if (stratum === 'rejected_low_quality') return 'rejected_low_quality';
  if (stratum === 'iterative_review') return 'iterative_review';

  const status = row.private_expected_review_status?.toLowerCase() ?? '';
  const rating = row.private_expected_quality_rating?.toLowerCase() ?? '';
  if (status.includes('approved') && rating.includes('exceptional')) return 'approved_exceptional';
  if (status.includes('approved')) return 'approved_good';
  if (status.includes('rejected') && rating.includes('low')) return 'rejected_low_quality';
  if (status.includes('changes requested') || status.includes('response to review')) return 'iterative_review';
  return 'unknown';
}

function predictedOutcome(row: BatchResult): PredictedOutcome {
  if (row.output_status === 'failed' || row.recommendation === 'insufficient_evidence') return 'failed';
  if (row.recommendation === 'likely_rejectable' || row.quality_band === 'reject') return 'reject_candidate';
  if (row.recommendation === 'request_changes_average' || row.quality_band === 'average') return 'request_changes_candidate';
  if (row.recommendation === 'exceptional_human_review_candidate' || row.quality_band === 'exceptional_candidate') {
    return 'exceptional_candidate';
  }
  if (row.recommendation === 'clean_good_candidate' || row.quality_band === 'good_candidate') return 'approval_candidate';
  return 'manual_review';
}

function compare(row: BatchResult): ScoredRow {
  const expected = expectedOutcome(row);
  const predicted = predictedOutcome(row);
  const escalationRequired = predicted === 'manual_review' || predicted === 'failed';

  if (!row.safety_ok) {
    return buildRow(row, expected, predicted, escalationRequired, 'safety_failure', 'Reviewer output violated the safety contract.');
  }
  if (predicted === 'failed') {
    return buildRow(row, expected, predicted, true, 'provider_failed', 'Reviewer provider failed or returned insufficient evidence.');
  }
  if (expected === 'unknown') {
    return buildRow(row, expected, predicted, escalationRequired, 'no_private_comparison', 'No private expected outcome was available.');
  }

  if (expected === 'approved_good') {
    if (predicted === 'reject_candidate') {
      return buildRow(row, expected, predicted, false, 'false_rejection_risk', 'Historically approved-good case was marked rejectable.');
    }
    if (predicted === 'approval_candidate') return buildRow(row, expected, predicted, false, 'aligned', 'Approved-good case received an approval candidate signal.');
    if (predicted === 'exceptional_candidate') return buildRow(row, expected, predicted, false, 'aligned', 'Approved-good case received a positive candidate signal.');
    return buildRow(row, expected, predicted, escalationRequired, 'cautious_on_approved_case', 'Approved-good case remained cautious.');
  }

  if (expected === 'approved_exceptional') {
    if (predicted === 'reject_candidate') {
      return buildRow(row, expected, predicted, false, 'false_rejection_risk', 'Historically approved-exceptional case was marked rejectable.');
    }
    if (predicted === 'exceptional_candidate') {
      return buildRow(row, expected, predicted, false, 'aligned', 'Approved-exceptional case received an exceptional candidate signal.');
    }
    if (predicted === 'approval_candidate') {
      return buildRow(row, expected, predicted, false, 'missed_exceptional_candidate', 'Approved-exceptional case was positive but not exceptional.');
    }
    return buildRow(row, expected, predicted, escalationRequired, 'missed_exceptional_candidate', 'Approved-exceptional case was not recognized.');
  }

  if (expected === 'rejected_low_quality') {
    if (predicted === 'approval_candidate' || predicted === 'exceptional_candidate') {
      return buildRow(row, expected, predicted, false, 'false_approval_risk', 'Historically rejected low-quality case received an approval candidate signal.');
    }
    if (predicted === 'reject_candidate') return buildRow(row, expected, predicted, false, 'aligned', 'Rejected low-quality case was marked rejectable.');
    return buildRow(row, expected, predicted, escalationRequired, 'cautious_on_rejected_case', 'Rejected low-quality case remained cautious instead of falsely approving.');
  }

  if (expected === 'iterative_review') {
    if (predicted === 'approval_candidate' || predicted === 'exceptional_candidate') {
      return buildRow(row, expected, predicted, false, 'false_approval_risk', 'Changes-requested case received an approval candidate signal.');
    }
    if (predicted === 'reject_candidate') {
      return buildRow(row, expected, predicted, false, 'false_rejection_risk', 'Changes-requested case was escalated to rejectable without private support.');
    }
    return buildRow(row, expected, predicted, escalationRequired, 'possible_iteration_alignment', 'Changes-requested case stayed in review or request-changes territory.');
  }

  return buildRow(row, expected, predicted, escalationRequired, 'no_private_comparison', 'Unhandled comparison state.');
}

function buildRow(
  row: BatchResult,
  expected: ExpectedOutcome,
  predicted: PredictedOutcome,
  escalationRequired: boolean,
  comparisonLabel: ComparisonLabel,
  rationale: string,
): ScoredRow {
  return {
    ...row,
    expected_outcome: expected,
    predicted_outcome: predicted,
    comparison_label: comparisonLabel,
    escalation_required: escalationRequired,
    rationale,
  };
}

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

function rate(count: number, total: number) {
  return total > 0 ? Number((count / total).toFixed(3)) : 0;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const inputs = await readJsonl<BatchResult>(options.resultsFile);
  const rows = inputs.map(compare);
  const scoredRows = rows.filter((row) => row.expected_outcome !== 'unknown' && row.comparison_label !== 'no_private_comparison');
  const byComparison: Record<string, number> = {};
  const byExpectedOutcome: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    increment(byComparison, row.comparison_label);
    const bucket = byExpectedOutcome[row.expected_outcome] ?? {};
    increment(bucket, row.comparison_label);
    byExpectedOutcome[row.expected_outcome] = bucket;
  }

  const safetyFailureCount = rows.filter((row) => row.comparison_label === 'safety_failure').length;
  const providerFailureCount = rows.filter((row) => row.comparison_label === 'provider_failed').length;
  const falseApprovalCount = rows.filter((row) => row.comparison_label === 'false_approval_risk').length;
  const falseRejectionCount = rows.filter((row) => row.comparison_label === 'false_rejection_risk').length;
  const expectedExceptionalCount = scoredRows.filter((row) => row.expected_outcome === 'approved_exceptional').length;
  const missedExceptionalCount = scoredRows.filter((row) => row.comparison_label === 'missed_exceptional_candidate').length;
  const escalationCount = scoredRows.filter((row) => row.escalation_required).length;
  const alignedCount = rows.filter((row) => row.comparison_label === 'aligned').length;
  const acceptableCount = rows.filter((row) =>
    ['aligned', 'acceptable_escalation', 'cautious_on_rejected_case', 'possible_iteration_alignment'].includes(row.comparison_label),
  ).length;
  const imageInputCount = scoredRows.filter((row) => row.screenshot_image_input_attached).length;

  const falseApprovalRate = rate(falseApprovalCount, scoredRows.length);
  const falseRejectionRate = rate(falseRejectionCount, scoredRows.length);
  const providerFailureRate = rate(providerFailureCount, rows.length);
  const escalationRate = rate(escalationCount, scoredRows.length);
  const missedExceptionalRate = expectedExceptionalCount > 0 ? rate(missedExceptionalCount, expectedExceptionalCount) : 0;
  const gateReasons: string[] = [];

  if (scoredRows.length < options.minScoredCount) {
    gateReasons.push(`scored_output_count ${scoredRows.length} below ${options.minScoredCount}`);
  }
  if (safetyFailureCount > 0) {
    gateReasons.push(`safety_failure_count ${safetyFailureCount} exceeded 0`);
  }
  if (falseApprovalRate > options.maxFalseApprovalRate) {
    gateReasons.push(`false_approval_rate ${falseApprovalRate} exceeded ${options.maxFalseApprovalRate}`);
  }
  if (falseRejectionRate > options.maxFalseRejectionRate) {
    gateReasons.push(`false_rejection_rate ${falseRejectionRate} exceeded ${options.maxFalseRejectionRate}`);
  }
  if (providerFailureRate > options.maxProviderFailureRate) {
    gateReasons.push(`provider_failure_rate ${providerFailureRate} exceeded ${options.maxProviderFailureRate}`);
  }
  if (escalationRate > options.maxEscalationRate) {
    gateReasons.push(`escalation_rate ${escalationRate} exceeded ${options.maxEscalationRate}`);
  }
  if (missedExceptionalRate > options.maxMissedExceptionalRate) {
    gateReasons.push(`missed_exceptional_rate ${missedExceptionalRate} exceeded ${options.maxMissedExceptionalRate}`);
  }
  if (options.requireImageInputs && imageInputCount < scoredRows.length) {
    gateReasons.push(`image_input_count ${imageInputCount} below scored_output_count ${scoredRows.length}`);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    results_file: options.resultsFile,
    out_dir: options.outDir,
    total_rows: rows.length,
    scored_output_count: scoredRows.length,
    no_private_comparison_count: rows.length - scoredRows.length,
    aligned_count: alignedCount,
    aligned_rate: rate(alignedCount, scoredRows.length),
    acceptable_count: acceptableCount,
    acceptable_rate: rate(acceptableCount, scoredRows.length),
    safety_failure_count: safetyFailureCount,
    false_approval_risk_count: falseApprovalCount,
    false_approval_risk_rate: falseApprovalRate,
    false_rejection_risk_count: falseRejectionCount,
    false_rejection_risk_rate: falseRejectionRate,
    expected_exceptional_count: expectedExceptionalCount,
    missed_exceptional_candidate_count: missedExceptionalCount,
    missed_exceptional_candidate_rate: missedExceptionalRate,
    provider_failure_count: providerFailureCount,
    provider_failure_rate: providerFailureRate,
    escalation_count: escalationCount,
    escalation_rate: escalationRate,
    image_input_count: imageInputCount,
    by_comparison: byComparison,
    by_expected_outcome: byExpectedOutcome,
    promotion_gate: {
      status: gateReasons.length === 0 ? 'candidate_for_human_review' : 'blocked',
      reasons: gateReasons,
      thresholds: {
        min_scored_count: options.minScoredCount,
        max_false_approval_rate: options.maxFalseApprovalRate,
        max_false_rejection_rate: options.maxFalseRejectionRate,
        max_provider_failure_rate: options.maxProviderFailureRate,
        max_escalation_rate: options.maxEscalationRate,
        max_missed_exceptional_rate: options.maxMissedExceptionalRate,
        require_image_inputs: options.requireImageInputs,
      },
    },
    files: {
      scored_rows: path.join(options.outDir, 'rubric-reviewer-scored.jsonl'),
      summary: path.join(options.outDir, 'rubric-reviewer-score-summary.json'),
    },
    notes: [
      'This scorer evaluates shadow-mode rubric reviewer behavior only.',
      'A candidate_for_human_review gate is not permission for autonomous final decisions.',
      'False approval risk is the highest-severity metric because it lets a rejected low-quality case pass without escalation.',
      'Missed exceptional risk blocks featured or exceptional flagging even when rejection safety looks acceptable.',
      'High escalation can be acceptable for standardization assistance, but blocks promotion as a quality-band classifier.',
    ],
  };

  await writeJsonl(summary.files.scored_rows, rows);
  await writeFile(summary.files.summary, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));

  if (options.failOnGate && gateReasons.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
