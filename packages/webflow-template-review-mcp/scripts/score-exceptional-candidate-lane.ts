import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type RouteSignal = 'exceptional_human_review_candidate' | 'not_exceptional_enough' | 'insufficient_exceptional_evidence';
type ExpectedOutcome = 'approved_exceptional' | 'approved_good' | 'rejected_low_quality' | 'iterative_review' | 'unknown';
type ComparisonLabel =
  | 'aligned'
  | 'missed_exceptional_candidate'
  | 'false_exceptional_risk'
  | 'approved_good_overpromotion'
  | 'acceptable_not_exceptional'
  | 'provider_or_evidence_failed'
  | 'safety_failure'
  | 'no_private_comparison';

type CliOptions = {
  inputDir: string;
  outDir: string;
  minScoredCount: number;
  maxFalseExceptionalRate: number;
  maxApprovedGoodOverpromotionRate: number;
  maxMissedExceptionalRate: number;
  maxProviderFailureRate: number;
  requireImageInputs: boolean;
  failOnGate: boolean;
};

type LaneResult = {
  case_id: string;
  template_name: string;
  source_url: string;
  provider: string;
  ok: boolean;
  output_status: string;
  route_signal: RouteSignal;
  confidence: string;
  screenshot_count: number;
  screenshot_image_input_attached: boolean;
  private_expected_review_status?: string;
  private_expected_quality_rating?: string;
  selection_stratum?: string;
  safety_ok: boolean;
  out_dir: string;
};

type ScoredRow = LaneResult & {
  expected_outcome: ExpectedOutcome;
  comparison_label: ComparisonLabel;
  escalation_required: boolean;
  rationale: string;
};

const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-exceptional-candidate-lane';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    minScoredCount: 8,
    maxFalseExceptionalRate: 0,
    maxApprovedGoodOverpromotionRate: 0,
    maxMissedExceptionalRate: 0,
    maxProviderFailureRate: 0,
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
    if (arg === '--min-scored-count' && next) {
      options.minScoredCount = boundedInt(next, 1, 10_000, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-false-exceptional-rate' && next) {
      options.maxFalseExceptionalRate = rateOption(next, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-approved-good-overpromotion-rate' && next) {
      options.maxApprovedGoodOverpromotionRate = rateOption(next, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-missed-exceptional-rate' && next) {
      options.maxMissedExceptionalRate = rateOption(next, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-provider-failure-rate' && next) {
      options.maxProviderFailureRate = rateOption(next, arg);
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
    outDir: options.outDir ?? path.join(inputDir, 'score'),
    minScoredCount: options.minScoredCount ?? 8,
    maxFalseExceptionalRate: options.maxFalseExceptionalRate ?? 0,
    maxApprovedGoodOverpromotionRate: options.maxApprovedGoodOverpromotionRate ?? 0,
    maxMissedExceptionalRate: options.maxMissedExceptionalRate ?? 0,
    maxProviderFailureRate: options.maxProviderFailureRate ?? 0,
    requireImageInputs: options.requireImageInputs ?? false,
    failOnGate: options.failOnGate ?? false,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp exceptional:lane:score -- [options]

Options:
  --input <dir>                                  Directory with exceptional-candidate-results.jsonl.
                                                 Default: ${DEFAULT_INPUT_DIR}
  --out <dir>                                    Output directory. Default: <input>/score
  --min-scored-count <n>                         Promotion gate. Default: 8
  --max-false-exceptional-rate <n>               Gate for rejected/iterative over-promotion. Default: 0
  --max-approved-good-overpromotion-rate <n>     Gate for approved-good over-promotion. Default: 0
  --max-missed-exceptional-rate <n>              Gate for approved-exceptional recall. Default: 0
  --max-provider-failure-rate <n>                Gate for provider/evidence failures. Default: 0
  --require-image-inputs                         Block if scored rows did not attach model image inputs.
  --fail-on-gate                                 Exit non-zero when promotion gate is blocked.
  --help                                         Show this help.

Behavior:
  Scores the exceptional-candidate lane against private outcomes joined after
  lane output generation. This scorer evaluates shadow routing only.
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

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function expectedOutcome(row: LaneResult): ExpectedOutcome {
  if (row.selection_stratum === 'approved_exceptional') return 'approved_exceptional';
  if (row.selection_stratum === 'approved_good') return 'approved_good';
  if (row.selection_stratum === 'rejected_low_quality') return 'rejected_low_quality';
  if (row.selection_stratum === 'iterative_review') return 'iterative_review';

  const status = row.private_expected_review_status?.toLowerCase() ?? '';
  const rating = row.private_expected_quality_rating?.toLowerCase() ?? '';
  if (status.includes('approved') && rating.includes('exceptional')) return 'approved_exceptional';
  if (status.includes('approved')) return 'approved_good';
  if (status.includes('rejected') || rating.includes('low quality')) return 'rejected_low_quality';
  if (status.includes('changes')) return 'iterative_review';
  return 'unknown';
}

function compare(row: LaneResult): ScoredRow {
  const expected = expectedOutcome(row);
  const routedExceptional = row.route_signal === 'exceptional_human_review_candidate';
  const failed = row.output_status === 'failed' || row.route_signal === 'insufficient_exceptional_evidence';

  if (!row.safety_ok) return buildRow(row, expected, 'safety_failure', false, 'Lane output violated the safety contract.');
  if (failed) return buildRow(row, expected, 'provider_or_evidence_failed', true, 'Lane provider failed or evidence was insufficient.');
  if (expected === 'unknown') return buildRow(row, expected, 'no_private_comparison', !routedExceptional, 'No private expected outcome was available.');

  if (expected === 'approved_exceptional') {
    if (routedExceptional) return buildRow(row, expected, 'aligned', false, 'Approved-exceptional case received an exceptional route signal.');
    return buildRow(row, expected, 'missed_exceptional_candidate', true, 'Approved-exceptional case was not routed for exceptional review.');
  }

  if (expected === 'approved_good') {
    if (routedExceptional) return buildRow(row, expected, 'approved_good_overpromotion', false, 'Approved-good case was over-promoted to exceptional route.');
    return buildRow(row, expected, 'acceptable_not_exceptional', false, 'Approved-good case was not over-promoted.');
  }

  if (expected === 'rejected_low_quality' || expected === 'iterative_review') {
    if (routedExceptional) {
      return buildRow(row, expected, 'false_exceptional_risk', false, 'Rejected or changes-requested case received an exceptional route signal.');
    }
    return buildRow(row, expected, 'acceptable_not_exceptional', false, 'Rejected or changes-requested case was not over-promoted.');
  }

  return buildRow(row, expected, 'no_private_comparison', !routedExceptional, 'Unhandled comparison state.');
}

function buildRow(
  row: LaneResult,
  expected: ExpectedOutcome,
  comparisonLabel: ComparisonLabel,
  escalationRequired: boolean,
  rationale: string,
): ScoredRow {
  return {
    ...row,
    expected_outcome: expected,
    comparison_label: comparisonLabel,
    escalation_required: escalationRequired,
    rationale,
  };
}

function rate(count: number, total: number): number {
  return total > 0 ? Number((count / total).toFixed(4)) : 0;
}

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });
  const resultsFile = path.join(options.inputDir, 'exceptional-candidate-results.jsonl');
  const rows = await readJsonl<LaneResult>(resultsFile);
  const scoredRows = rows.map(compare);
  const scoredCount = scoredRows.length;
  const expectedExceptionalCount = scoredRows.filter((row) => row.expected_outcome === 'approved_exceptional').length;
  const falseExceptionalCount = scoredRows.filter((row) => row.comparison_label === 'false_exceptional_risk').length;
  const approvedGoodOverpromotionCount = scoredRows.filter((row) => row.comparison_label === 'approved_good_overpromotion').length;
  const missedExceptionalCount = scoredRows.filter((row) => row.comparison_label === 'missed_exceptional_candidate').length;
  const providerFailureCount = scoredRows.filter((row) => row.comparison_label === 'provider_or_evidence_failed').length;
  const safetyFailureCount = scoredRows.filter((row) => row.comparison_label === 'safety_failure').length;
  const imageInputCount = scoredRows.filter((row) => row.screenshot_image_input_attached).length;
  const byComparison: Record<string, number> = {};
  const byExpectedOutcome: Record<string, Record<string, number>> = {};
  for (const row of scoredRows) {
    increment(byComparison, row.comparison_label);
    byExpectedOutcome[row.expected_outcome] = byExpectedOutcome[row.expected_outcome] ?? {};
    increment(byExpectedOutcome[row.expected_outcome], row.comparison_label);
  }

  const falseExceptionalRate = rate(falseExceptionalCount, scoredCount);
  const approvedGoodOverpromotionRate = rate(approvedGoodOverpromotionCount, scoredCount);
  const missedExceptionalRate = rate(missedExceptionalCount, expectedExceptionalCount);
  const providerFailureRate = rate(providerFailureCount, scoredCount);
  const gateReasons: string[] = [];
  if (scoredCount < options.minScoredCount) gateReasons.push(`scored_output_count ${scoredCount} below ${options.minScoredCount}`);
  if (safetyFailureCount > 0) gateReasons.push(`safety_failure_count ${safetyFailureCount} exceeded 0`);
  if (falseExceptionalRate > options.maxFalseExceptionalRate) {
    gateReasons.push(`false_exceptional_rate ${falseExceptionalRate} exceeded ${options.maxFalseExceptionalRate}`);
  }
  if (approvedGoodOverpromotionRate > options.maxApprovedGoodOverpromotionRate) {
    gateReasons.push(`approved_good_overpromotion_rate ${approvedGoodOverpromotionRate} exceeded ${options.maxApprovedGoodOverpromotionRate}`);
  }
  if (missedExceptionalRate > options.maxMissedExceptionalRate) {
    gateReasons.push(`missed_exceptional_rate ${missedExceptionalRate} exceeded ${options.maxMissedExceptionalRate}`);
  }
  if (providerFailureRate > options.maxProviderFailureRate) {
    gateReasons.push(`provider_failure_rate ${providerFailureRate} exceeded ${options.maxProviderFailureRate}`);
  }
  if (options.requireImageInputs && imageInputCount < scoredCount) {
    gateReasons.push(`image_input_count ${imageInputCount} below scored_output_count ${scoredCount}`);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    results_file: resultsFile,
    out_dir: options.outDir,
    scored_output_count: scoredCount,
    expected_exceptional_count: expectedExceptionalCount,
    aligned_count: scoredRows.filter((row) => row.comparison_label === 'aligned').length,
    false_exceptional_risk_count: falseExceptionalCount,
    false_exceptional_risk_rate: falseExceptionalRate,
    approved_good_overpromotion_count: approvedGoodOverpromotionCount,
    approved_good_overpromotion_rate: approvedGoodOverpromotionRate,
    missed_exceptional_candidate_count: missedExceptionalCount,
    missed_exceptional_candidate_rate: missedExceptionalRate,
    provider_failure_count: providerFailureCount,
    provider_failure_rate: providerFailureRate,
    safety_failure_count: safetyFailureCount,
    image_input_count: imageInputCount,
    by_comparison: byComparison,
    by_expected_outcome: byExpectedOutcome,
    promotion_gate: {
      status: gateReasons.length > 0 ? 'blocked' : 'candidate_for_human_review',
      reasons: gateReasons,
      thresholds: {
        min_scored_count: options.minScoredCount,
        max_false_exceptional_rate: options.maxFalseExceptionalRate,
        max_approved_good_overpromotion_rate: options.maxApprovedGoodOverpromotionRate,
        max_missed_exceptional_rate: options.maxMissedExceptionalRate,
        max_provider_failure_rate: options.maxProviderFailureRate,
        require_image_inputs: options.requireImageInputs,
      },
    },
    files: {
      scored_rows: path.join(options.outDir, 'exceptional-candidate-scored.jsonl'),
      summary: path.join(options.outDir, 'exceptional-candidate-score-summary.json'),
    },
    notes: [
      'This scorer evaluates shadow exceptional-candidate routing only.',
      'A candidate_for_human_review gate is not permission for autonomous featured or approval decisions.',
      'False exceptional risk is the highest-severity metric for this lane.',
    ],
  };

  await writeFile(summary.files.scored_rows, `${scoredRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  await writeFile(summary.files.summary, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));

  if (options.failOnGate && gateReasons.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
