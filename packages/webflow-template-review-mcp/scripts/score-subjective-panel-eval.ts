import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type ExpectedBand = 'reject' | 'average' | 'good' | 'exceptional' | 'control_not_visual_reject';
type PanelBand = 'reject' | 'average' | 'good' | 'exceptional' | 'uncertain';
type ComparisonLabel =
  | 'aligned'
  | 'acceptable_escalation'
  | 'false_approval_risk'
  | 'false_rejection_risk'
  | 'missed_exceptional_candidate'
  | 'band_mismatch_review'
  | 'missing_output';

type CliOptions = {
  inputDir: string;
  panelOutputFile: string;
  outDir: string;
  maxFalseApprovalRate: number;
  maxFalseRejectionRate: number;
  maxEscalationRate: number;
  failOnGate: boolean;
};

type SubjectiveEvalAnswer = {
  case_id: string;
  eval_set_version: string;
  asset_id?: string;
  version_id: string;
  criterion_id: string;
  expected_band: ExpectedBand;
  expected_source_label: string;
  expected_escalation_allowed: boolean;
  source_evidence: Record<string, unknown>;
};

type PanelJudge = {
  score?: number;
  band?: string;
  confidence?: string;
  provider?: string;
  model?: string;
  cost_usd?: number;
  latency_ms?: number;
};

type SubjectivePanelOutput = {
  case_id: string;
  criterion_id: string;
  panel_version?: string;
  status?: string;
  panel_band?: string;
  final_band?: string;
  band?: string;
  criterion_band?: string;
  recommendation?: string;
  panel_score?: number;
  score?: number;
  confidence?: string;
  agreement_level?: string;
  escalation_required?: boolean | string;
  judges?: PanelJudge[];
  cost_usd?: number;
  latency_ms?: number;
};

type ScoredRow = {
  case_id: string;
  criterion_id: string;
  expected_band: ExpectedBand;
  expected_source_label: string;
  panel_band: PanelBand;
  panel_score?: number;
  panel_status?: string;
  agreement_level: string;
  escalation_required: boolean;
  comparison_label: ComparisonLabel;
  rationale: string;
  cost_usd: number;
  latency_ms: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: '/tmp/webflow-template-review-subjective-panel-eval',
    maxFalseApprovalRate: 0,
    maxFalseRejectionRate: 0.05,
    maxEscalationRate: 0.7,
    failOnGate: false,
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
    if (arg === '--panel-output' && next) {
      options.panelOutputFile = next;
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--max-false-approval-rate' && next) {
      options.maxFalseApprovalRate = numberOption(next, arg);
      i += 1;
      continue;
    }
    if (arg === '--max-false-rejection-rate' && next) {
      options.maxFalseRejectionRate = numberOption(next, arg);
      i += 1;
      continue;
    }
    if (arg === '--max-escalation-rate' && next) {
      options.maxEscalationRate = numberOption(next, arg);
      i += 1;
      continue;
    }
    if (arg === '--fail-on-gate') {
      options.failOnGate = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  const inputDir = options.inputDir ?? '/tmp/webflow-template-review-subjective-panel-eval';
  return {
    inputDir,
    panelOutputFile: options.panelOutputFile ?? path.join(inputDir, 'subjective-panel-output.jsonl'),
    outDir: options.outDir ?? inputDir,
    maxFalseApprovalRate: options.maxFalseApprovalRate ?? 0,
    maxFalseRejectionRate: options.maxFalseRejectionRate ?? 0.05,
    maxEscalationRate: options.maxEscalationRate ?? 0.7,
    failOnGate: options.failOnGate ?? false,
  };
}

function numberOption(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative number.`);
  return parsed;
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp panel:eval:score -- [options]

Options:
  --input <dir>                       Directory with subjective-panel-eval.answers.private.jsonl.
                                      Default: /tmp/webflow-template-review-subjective-panel-eval
  --panel-output <file>               Shadow panel output JSONL.
                                      Default: <input>/subjective-panel-output.jsonl
  --out <dir>                         Output directory. Default: same as input.
  --max-false-approval-rate <n>       Promotion gate. Default: 0
  --max-false-rejection-rate <n>      Promotion gate. Default: 0.05
  --max-escalation-rate <n>           Promotion gate. Default: 0.7
  --fail-on-gate                      Exit non-zero when promotion gate is blocked.
  --help                              Show this help.

Behavior:
  Compares shadow-mode subjective panel outputs against private locked answers.
  Computes judge-vs-human agreement, false approval risk, false rejection risk,
  escalation rate, cost, and latency. Does not call model providers or write external systems.
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

function key(caseId: string, criterionId: string) {
  return `${caseId}::${criterionId}`;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeBandFromString(value: string | undefined): PanelBand | undefined {
  const raw = value?.toLowerCase().trim();
  if (!raw) return undefined;
  if (['reject', 'rejected', 'fail', 'failed', 'low quality', 'hard_blocker_candidate'].some((item) => raw.includes(item))) {
    return 'reject';
  }
  if (['average', 'satisfactory', 'changes_requested_average', 'needs work'].some((item) => raw.includes(item))) {
    return 'average';
  }
  if (['exceptional', 'featured', 'feature candidate', 'standout'].some((item) => raw.includes(item))) {
    return 'exceptional';
  }
  if (['good', 'pass', 'approved'].some((item) => raw.includes(item))) {
    return 'good';
  }
  if (['uncertain', 'manual', 'escalate', 'unknown'].some((item) => raw.includes(item))) {
    return 'uncertain';
  }
  return undefined;
}

function normalizeBand(output: SubjectivePanelOutput | undefined): PanelBand {
  if (!output) return 'uncertain';
  const fromText = normalizeBandFromString(
    stringValue(output.panel_band ?? output.final_band ?? output.band ?? output.criterion_band ?? output.recommendation),
  );
  if (fromText) return fromText;

  const score = numberValue(output.panel_score ?? output.score);
  if (score === undefined) return 'uncertain';
  if (score <= 1.5) return 'reject';
  if (score <= 2.5) return 'average';
  if (score <= 4.25) return 'good';
  return 'exceptional';
}

function escalationRequired(output: SubjectivePanelOutput | undefined) {
  if (!output) return true;
  if (typeof output.escalation_required === 'boolean') return output.escalation_required;
  const raw = stringValue(output.escalation_required)?.toLowerCase();
  if (!raw) return false;
  return ['true', 'yes', 'required', 'escalate'].includes(raw);
}

function bandDistance(expected: ExpectedBand, actual: PanelBand): number | undefined {
  if (expected === 'control_not_visual_reject' || actual === 'uncertain') return undefined;
  const order: Record<Exclude<ExpectedBand, 'control_not_visual_reject'>, number> = {
    reject: 0,
    average: 1,
    good: 2,
    exceptional: 3,
  };
  return Math.abs(order[expected] - order[actual]);
}

function totalCost(output: SubjectivePanelOutput | undefined): number {
  if (!output) return 0;
  const judgeCost = output.judges?.reduce((sum, judge) => sum + (numberValue(judge.cost_usd) ?? 0), 0) ?? 0;
  return Number(((numberValue(output.cost_usd) ?? 0) + judgeCost).toFixed(6));
}

function totalLatency(output: SubjectivePanelOutput | undefined): number {
  if (!output) return 0;
  const judgeLatency = output.judges?.reduce((sum, judge) => sum + (numberValue(judge.latency_ms) ?? 0), 0) ?? 0;
  return Math.round((numberValue(output.latency_ms) ?? 0) + judgeLatency);
}

function compare(answer: SubjectiveEvalAnswer, output: SubjectivePanelOutput | undefined): ScoredRow {
  if (!output) {
    return buildRow(answer, undefined, 'missing_output', 'No matching panel output was found.');
  }

  const panelBand = normalizeBand(output);
  const escalates = escalationRequired(output);
  const status = output.status;

  if (status === 'failed' || status === 'blocked') {
    return buildRow(answer, output, 'acceptable_escalation', `Panel status was ${status}; human review remains required.`);
  }

  if (escalates) {
    return buildRow(answer, output, 'acceptable_escalation', 'Panel escalated the criterion instead of making an unsupported final call.');
  }

  if (answer.expected_band === 'reject' && panelBand !== 'reject') {
    return buildRow(answer, output, 'false_approval_risk', 'Expected a visual-quality rejection signal, but the panel did not reject or escalate.');
  }

  if (answer.expected_band === 'control_not_visual_reject' && panelBand === 'reject') {
    return buildRow(answer, output, 'false_rejection_risk', 'Control case should not become a visual-quality rejection without escalation.');
  }

  if ((answer.expected_band === 'good' || answer.expected_band === 'exceptional' || answer.expected_band === 'average') && panelBand === 'reject') {
    return buildRow(answer, output, 'false_rejection_risk', 'Approved or non-visual-control case was rejected without escalation.');
  }

  if (answer.expected_band === 'exceptional' && panelBand !== 'exceptional') {
    return buildRow(answer, output, 'missed_exceptional_candidate', 'Expected Exceptional signal was not detected.');
  }

  if (answer.expected_band === 'control_not_visual_reject') {
    return buildRow(answer, output, 'aligned', 'Control case was not turned into a visual-quality rejection.');
  }

  const distance = bandDistance(answer.expected_band, panelBand);
  if (distance === 0) return buildRow(answer, output, 'aligned', 'Panel band matched the locked answer.');
  if (distance === 1) return buildRow(answer, output, 'band_mismatch_review', 'Panel band was adjacent to the locked answer.');
  return buildRow(answer, output, 'band_mismatch_review', 'Panel band differed materially from the locked answer.');
}

function buildRow(
  answer: SubjectiveEvalAnswer,
  output: SubjectivePanelOutput | undefined,
  comparisonLabel: ComparisonLabel,
  rationale: string,
): ScoredRow {
  return {
    case_id: answer.case_id,
    criterion_id: answer.criterion_id,
    expected_band: answer.expected_band,
    expected_source_label: answer.expected_source_label,
    panel_band: normalizeBand(output),
    panel_score: numberValue(output?.panel_score ?? output?.score),
    panel_status: output?.status,
    agreement_level: stringValue(output?.agreement_level) ?? 'unknown',
    escalation_required: escalationRequired(output),
    comparison_label: comparisonLabel,
    rationale,
    cost_usd: totalCost(output),
    latency_ms: totalLatency(output),
  };
}

function increment(record: Record<string, number>, keyValue: string) {
  record[keyValue] = (record[keyValue] ?? 0) + 1;
}

function rate(count: number, total: number) {
  return total > 0 ? Number((count / total).toFixed(3)) : 0;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const answers = await readJsonl<SubjectiveEvalAnswer>(path.join(options.inputDir, 'subjective-panel-eval.answers.private.jsonl'));
  const outputs = await readJsonl<SubjectivePanelOutput>(options.panelOutputFile);
  const outputByKey = new Map(outputs.map((output) => [key(output.case_id, output.criterion_id), output]));
  const rows = answers.map((answer) => compare(answer, outputByKey.get(key(answer.case_id, answer.criterion_id))));

  const byCriterion: Record<string, Record<string, number>> = {};
  const byComparison: Record<string, number> = {};
  for (const row of rows) {
    increment(byComparison, row.comparison_label);
    const criterion = byCriterion[row.criterion_id] ?? {};
    increment(criterion, row.comparison_label);
    byCriterion[row.criterion_id] = criterion;
  }

  const scoredRows = rows.filter((row) => row.comparison_label !== 'missing_output');
  const falseApprovalCount = rows.filter((row) => row.comparison_label === 'false_approval_risk').length;
  const falseRejectionCount = rows.filter((row) => row.comparison_label === 'false_rejection_risk').length;
  const escalationCount = scoredRows.filter((row) => row.escalation_required || row.comparison_label === 'acceptable_escalation').length;
  const exactMatchCount = rows.filter((row) => row.comparison_label === 'aligned').length;
  const acceptableCount = rows.filter((row) => row.comparison_label === 'aligned' || row.comparison_label === 'acceptable_escalation').length;
  const lowAgreementCount = scoredRows.filter((row) => row.agreement_level === 'low').length;
  const costUsd = Number(rows.reduce((sum, row) => sum + row.cost_usd, 0).toFixed(6));
  const latencyMs = rows.reduce((sum, row) => sum + row.latency_ms, 0);

  const gateReasons: string[] = [];
  const falseApprovalRate = rate(falseApprovalCount, rows.length);
  const falseRejectionRate = rate(falseRejectionCount, rows.length);
  const escalationRate = rate(escalationCount, scoredRows.length);
  if (falseApprovalRate > options.maxFalseApprovalRate) {
    gateReasons.push(`false_approval_rate ${falseApprovalRate} exceeded ${options.maxFalseApprovalRate}`);
  }
  if (falseRejectionRate > options.maxFalseRejectionRate) {
    gateReasons.push(`false_rejection_rate ${falseRejectionRate} exceeded ${options.maxFalseRejectionRate}`);
  }
  if (escalationRate > options.maxEscalationRate) {
    gateReasons.push(`escalation_rate ${escalationRate} exceeded ${options.maxEscalationRate}`);
  }
  if (rows.some((row) => row.comparison_label === 'missing_output')) {
    gateReasons.push('one or more expected panel outputs were missing');
  }

  const summary = {
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    panel_output_file: options.panelOutputFile,
    out_dir: options.outDir,
    total_expected_outputs: answers.length,
    scored_output_count: scoredRows.length,
    missing_output_count: rows.length - scoredRows.length,
    exact_match_count: exactMatchCount,
    exact_match_rate: rate(exactMatchCount, rows.length),
    acceptable_count: acceptableCount,
    acceptable_rate: rate(acceptableCount, rows.length),
    false_approval_risk_count: falseApprovalCount,
    false_approval_risk_rate: falseApprovalRate,
    false_rejection_risk_count: falseRejectionCount,
    false_rejection_risk_rate: falseRejectionRate,
    escalation_count: escalationCount,
    escalation_rate: escalationRate,
    low_agreement_count: lowAgreementCount,
    low_agreement_rate: rate(lowAgreementCount, scoredRows.length),
    cost_usd: costUsd,
    latency_ms: latencyMs,
    by_comparison: byComparison,
    by_criterion: byCriterion,
    promotion_gate: {
      status: gateReasons.length === 0 ? 'candidate_for_human_review' : 'blocked',
      reasons: gateReasons,
      thresholds: {
        max_false_approval_rate: options.maxFalseApprovalRate,
        max_false_rejection_rate: options.maxFalseRejectionRate,
        max_escalation_rate: options.maxEscalationRate,
      },
    },
    files: {
      scored_rows: path.join(options.outDir, 'subjective-panel-eval-scored.jsonl'),
      summary: path.join(options.outDir, 'subjective-panel-eval-score-summary.json'),
    },
    notes: [
      'This scorer evaluates shadow-mode panel behavior only.',
      'A candidate_for_human_review gate is not permission for autonomous final decisions.',
      'False approval risk is the highest-severity metric because it lets a rejected visual-quality case pass without escalation.',
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
