import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type Recommendation =
  | 'hard_blocker_candidate'
  | 'changes_requested_average'
  | 'clean_good_candidate'
  | 'manual_quality_review_required';

type ComparisonLabel =
  | 'aligned'
  | 'acceptable_caution'
  | 'missed_blocker'
  | 'false_blocker'
  | 'manual_gap'
  | 'data_ambiguous';

type AuditCause =
  | 'aligned'
  | 'likely_resolved_or_snapshot_gap'
  | 'manual_quality_gap'
  | 'data_surface_gap'
  | 'policy_exception_or_reviewer_override'
  | 'possible_tool_bug'
  | 'needs_manual_inspection';

type Phase1Run = {
  case_id: string;
  asset_id: string;
  version_id: string;
  recommendation: Recommendation;
  confidence: 'low' | 'medium' | 'high';
  hard_blocker_candidates: string[];
  objective_findings: string[];
  quality_proxy_signals: string[];
  manual_checks_remaining: string[];
};

type PrivateOutcome = {
  case_id: string;
  asset_id: string;
  version_id: string;
  selection_stratum?: string;
  actual_review_status?: string;
  actual_quality_rating?: string;
  actual_improvement_areas?: string[];
  reviewer?: string;
  review_feedback_snippet?: string;
  rejection_reason?: string;
  rejection_feedback_snippet?: string;
  decision_date?: string;
};

type ComparisonRow = {
  case_id: string;
  asset_id: string;
  version_id: string;
  agent_recommendation: Recommendation;
  agent_confidence: string;
  actual_review_status?: string;
  actual_quality_rating?: string;
  rejection_reason?: string;
  comparison_label: ComparisonLabel;
  audit_cause: AuditCause;
  rationale: string;
  hard_blocker_count: number;
  objective_finding_count: number;
  quality_proxy_count: number;
  manual_check_count: number;
};

type CliOptions = {
  inputDir: string;
  outDir?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    inputDir: '/tmp/webflow-template-review-calibration',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--input' && next) {
      options.inputDir = next;
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp calibration:phase1:compare -- [options]

Options:
  --input <dir>   Directory containing phase1-runs.jsonl and outcomes.private.jsonl.
                 Default: /tmp/webflow-template-review-calibration
  --out <dir>     Output directory for comparison files. Default: same as input.
  --help          Show this help.
`);
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
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

function includesAny(value: string | undefined, needles: string[]) {
  const lower = (value ?? '').toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

function isApproved(outcome: PrivateOutcome) {
  return includesAny(outcome.actual_review_status, ['approved']);
}

function isRejected(outcome: PrivateOutcome) {
  return includesAny(outcome.actual_review_status, ['rejected']);
}

function isIterative(outcome: PrivateOutcome) {
  return includesAny(outcome.actual_review_status, ['changes requested', 'response to review']);
}

function isGood(outcome: PrivateOutcome) {
  return includesAny(outcome.actual_quality_rating, ['good']);
}

function isExceptional(outcome: PrivateOutcome) {
  return includesAny(outcome.actual_quality_rating, ['exceptional']);
}

function isLowQuality(outcome: PrivateOutcome) {
  return includesAny(outcome.actual_quality_rating, ['low quality']);
}

function hasHardRejectionReason(outcome: PrivateOutcome) {
  return includesAny(outcome.rejection_reason, [
    'invalid submission',
    'guideline infringement',
    'duplicate submission',
    'app issue',
    'access',
    'paywall',
    'bundling issue',
  ]);
}

function isUiUxRejection(outcome: PrivateOutcome) {
  return (
    includesAny(outcome.rejection_reason, ['ui/ux', 'ux concerns', 'visual', 'quality']) ||
    includesAny(outcome.rejection_feedback_snippet, [
      'outdated visual style',
      'modern aesthetics',
      'typography',
      'color palettes',
      'ui patterns',
      'web design trends',
    ])
  );
}

function isAppIssueRejection(outcome: PrivateOutcome) {
  return includesAny(outcome.rejection_reason, ['app issue', 'bundling issue', 'access', 'credentials', 'paywall']);
}

function isExternalPolicyRejection(outcome: PrivateOutcome) {
  return includesAny(outcome.rejection_reason, ['guideline infringement', 'invalid submission', 'duplicate submission']);
}

function compareRun(run: Phase1Run, outcome: PrivateOutcome | undefined): ComparisonRow {
  if (!outcome) {
    return buildRow(run, {}, 'data_ambiguous', 'needs_manual_inspection', 'No matching private outcome row found.');
  }

  const recommendation = run.recommendation;

  if (recommendation === 'clean_good_candidate' && isApproved(outcome) && isGood(outcome)) {
    return buildRow(run, outcome, 'aligned', 'aligned', 'Clean-good candidate matched approved Good outcome.');
  }

  if (recommendation === 'manual_quality_review_required' && isApproved(outcome) && isExceptional(outcome)) {
    return buildRow(run, outcome, 'aligned', 'aligned', 'Manual quality review matched approved Exceptional outcome.');
  }

  if (recommendation === 'hard_blocker_candidate' && isRejected(outcome) && (isLowQuality(outcome) || hasHardRejectionReason(outcome))) {
    return buildRow(run, outcome, 'aligned', 'aligned', 'Hard-blocker candidate matched rejected low-quality or hard-reason outcome.');
  }

  if (recommendation === 'changes_requested_average' && (isIterative(outcome) || includesAny(outcome.actual_quality_rating, ['satisfactory']))) {
    return buildRow(run, outcome, 'aligned', 'aligned', 'Changes-requested average matched iterative or Satisfactory outcome.');
  }

  if (recommendation === 'changes_requested_average' && isApproved(outcome)) {
    return buildRow(run, outcome, 'acceptable_caution', 'likely_resolved_or_snapshot_gap', 'Agent was stricter than the final approved outcome; check whether findings were resolved, false positives, or current-site snapshot drift.');
  }

  if (recommendation === 'manual_quality_review_required' && isApproved(outcome)) {
    return buildRow(run, outcome, 'manual_gap', 'manual_quality_gap', 'Outcome was approved, but Phase 1 left quality checks manual.');
  }

  if (recommendation === 'clean_good_candidate' && isRejected(outcome)) {
    if (isAppIssueRejection(outcome) || isExternalPolicyRejection(outcome)) {
      return buildRow(run, outcome, 'data_ambiguous', 'data_surface_gap', 'Actual rejection depended on app, access, duplicate, invalid-submission, or guideline evidence outside Phase 1 published-site evidence.');
    }
    return buildRow(run, outcome, 'missed_blocker', 'needs_manual_inspection', 'Agent predicted clean-good but actual outcome was rejected.');
  }

  if (recommendation === 'hard_blocker_candidate' && isApproved(outcome)) {
    return buildRow(run, outcome, 'false_blocker', 'policy_exception_or_reviewer_override', 'Agent flagged a hard blocker but actual outcome was approved. Check for policy exception, reviewer override, reviewed-state drift, or detector bug.');
  }

  if (recommendation === 'changes_requested_average' && isRejected(outcome)) {
    if (isUiUxRejection(outcome)) {
      return buildRow(run, outcome, 'manual_gap', 'manual_quality_gap', 'Actual rejection was UI/UX-driven, which Phase 1 intentionally leaves to manual quality review.');
    }
    if (isAppIssueRejection(outcome) || isExternalPolicyRejection(outcome)) {
      return buildRow(run, outcome, 'data_ambiguous', 'data_surface_gap', 'Actual rejection was app/access/bundling, duplicate, invalid-submission, or guideline-driven, outside Phase 1 published-template evidence.');
    }
    return buildRow(run, outcome, 'missed_blocker', 'needs_manual_inspection', 'Agent identified fixable issues but actual outcome was rejected.');
  }

  if (recommendation === 'manual_quality_review_required' && isRejected(outcome)) {
    if (isAppIssueRejection(outcome) || isExternalPolicyRejection(outcome)) {
      return buildRow(run, outcome, 'data_ambiguous', 'data_surface_gap', 'Actual rejection depended on app, access, duplicate, invalid-submission, or guideline evidence outside Phase 1 published-site evidence.');
    }
    return buildRow(run, outcome, 'manual_gap', 'manual_quality_gap', 'Actual rejection needs manual quality inspection before assigning a Phase 1 miss.');
  }

  return buildRow(run, outcome, 'data_ambiguous', 'needs_manual_inspection', 'Outcome did not fit a Phase 1 alignment rule.');
}

function buildRow(
  run: Phase1Run,
  outcome: Partial<PrivateOutcome>,
  comparisonLabel: ComparisonLabel,
  auditCause: AuditCause,
  rationale: string,
): ComparisonRow {
  return {
    case_id: run.case_id,
    asset_id: run.asset_id,
    version_id: run.version_id,
    agent_recommendation: run.recommendation,
    agent_confidence: run.confidence,
    actual_review_status: outcome.actual_review_status,
    actual_quality_rating: outcome.actual_quality_rating,
    rejection_reason: outcome.rejection_reason,
    comparison_label: comparisonLabel,
    audit_cause: auditCause,
    rationale,
    hard_blocker_count: run.hard_blocker_candidates.length,
    objective_finding_count: run.objective_findings.length,
    quality_proxy_count: run.quality_proxy_signals.length,
    manual_check_count: run.manual_checks_remaining.length,
  };
}

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = options.outDir ?? options.inputDir;
  const runsPath = path.join(options.inputDir, 'phase1-runs.jsonl');
  const outcomesPath = path.join(options.inputDir, 'outcomes.private.jsonl');

  const runs = await readJsonl<Phase1Run>(runsPath);
  const outcomes = await readJsonl<PrivateOutcome>(outcomesPath);
  const outcomesByCaseId = new Map(outcomes.map((outcome) => [outcome.case_id, outcome]));
  const comparisons = runs.map((run) => compareRun(run, outcomesByCaseId.get(run.case_id)));

  const labelCounts: Record<string, number> = {};
  const auditCauseCounts: Record<string, number> = {};
  const recommendationCounts: Record<string, number> = {};
  const outcomeCounts: Record<string, number> = {};

  for (const row of comparisons) {
    increment(labelCounts, row.comparison_label);
    increment(auditCauseCounts, row.audit_cause);
    increment(recommendationCounts, row.agent_recommendation);
    increment(outcomeCounts, row.actual_review_status ?? '(missing)');
  }

  const summary = {
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    out_dir: outDir,
    compared_count: comparisons.length,
    label_counts: labelCounts,
    audit_cause_counts: auditCauseCounts,
    recommendation_counts: recommendationCounts,
    outcome_counts: outcomeCounts,
    metrics: {
      hard_blocker_false_positive_count: labelCounts.false_blocker ?? 0,
      hard_blocker_miss_count: labelCounts.missed_blocker ?? 0,
      manual_gap_count: labelCounts.manual_gap ?? 0,
      data_ambiguous_count: labelCounts.data_ambiguous ?? 0,
    },
  };

  await mkdir(outDir, { recursive: true });
  await writeJsonl(path.join(outDir, 'comparison.jsonl'), comparisons);
  await writeFile(path.join(outDir, 'comparison-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
