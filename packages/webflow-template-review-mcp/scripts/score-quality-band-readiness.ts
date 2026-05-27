import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  subjectivePanelSummary?: string;
  rubricReviewerSummary?: string;
  exceptionalLaneSummary?: string;
  visualProxyCanarySummary?: string;
  outDir: string;
  minScoredCount: number;
  maxFalseApprovalRate: number;
  maxFalseRejectionRate: number;
  maxMissedExceptionalRate: number;
  maxFalseExceptionalRate: number;
  maxApprovedGoodOverpromotionRate: number;
  maxApprovedControlProxyRate: number;
  minRejectedVisualProxyRecall: number;
  maxEscalationRate: number;
  policySnapshotId?: string;
  evalSetVersion?: string;
  runId?: string;
  artifactBaseUrl?: string;
  failOnGate: boolean;
};

type SummaryFile = Record<string, unknown>;

type MetricSnapshot = {
  source: string;
  file?: string;
  total_rows?: number;
  scored_output_count?: number;
  false_approval_risk_rate?: number;
  false_rejection_risk_rate?: number;
  missed_exceptional_candidate_rate?: number;
  false_exceptional_rate?: number;
  approved_good_overpromotion_rate?: number;
  provider_failure_rate?: number;
  escalation_rate?: number;
  safety_failure_count?: number;
  approved_control_medium_or_high_proxy_rate?: number;
  rejected_visual_any_proxy_signal_rate?: number;
  promotion_gate_status?: string;
  gate_reasons: string[];
};

type ReadinessLevel =
  | 'blocked_no_calibration'
  | 'creator_guidance_only'
  | 'shadow_only'
  | 'reviewer_assist_candidate'
  | 'quality_band_shadow_expansion_candidate';

type ArtifactManifestEntry = {
  artifact_type:
    | 'quality_band_readiness_summary'
    | 'quality_band_readiness_summary_markdown'
    | 'quality_band_readiness_ledger_sql'
    | 'quality_band_readiness_ledger_summary'
    | 'quality_band_readiness_artifact_manifest';
  path: string;
  uri: string;
  sha256: string;
  byte_size: number;
  media_type: string;
  redaction: {
    contains_creator_pii: false;
    contains_raw_reviewer_feedback: false;
    contains_secret_material: false;
    excludes_popularity_sales_views_engagement: true;
  };
};

const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-quality-band-readiness';
const INPUT_EXCLUSIONS = ['popularity', 'sales', 'views', 'favorites', 'marketplace_engagement'] as const;

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: DEFAULT_OUT_DIR,
    minScoredCount: 20,
    maxFalseApprovalRate: 0,
    maxFalseRejectionRate: 0.05,
    maxMissedExceptionalRate: 0.25,
    maxFalseExceptionalRate: 0,
    maxApprovedGoodOverpromotionRate: 0,
    maxApprovedControlProxyRate: 0.1,
    minRejectedVisualProxyRecall: 0.8,
    maxEscalationRate: 0.7,
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
    if (arg === '--subjective-panel-summary' && next) {
      options.subjectivePanelSummary = next;
      index += 1;
      continue;
    }
    if (arg === '--rubric-reviewer-summary' && next) {
      options.rubricReviewerSummary = next;
      index += 1;
      continue;
    }
    if (arg === '--exceptional-lane-summary' && next) {
      options.exceptionalLaneSummary = next;
      index += 1;
      continue;
    }
    if (arg === '--visual-proxy-canary-summary' && next) {
      options.visualProxyCanarySummary = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--min-scored-count' && next) {
      options.minScoredCount = boundedInt(next, 1, 100_000, arg);
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
    if (arg === '--max-missed-exceptional-rate' && next) {
      options.maxMissedExceptionalRate = rateOption(next, arg);
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
    if (arg === '--max-approved-control-proxy-rate' && next) {
      options.maxApprovedControlProxyRate = rateOption(next, arg);
      index += 1;
      continue;
    }
    if (arg === '--min-rejected-visual-proxy-recall' && next) {
      options.minRejectedVisualProxyRecall = rateOption(next, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-escalation-rate' && next) {
      options.maxEscalationRate = rateOption(next, arg);
      index += 1;
      continue;
    }
    if (arg === '--policy-snapshot-id' && next) {
      options.policySnapshotId = next;
      index += 1;
      continue;
    }
    if (arg === '--eval-set-version' && next) {
      options.evalSetVersion = next;
      index += 1;
      continue;
    }
    if (arg === '--run-id' && next) {
      options.runId = next;
      index += 1;
      continue;
    }
    if (arg === '--artifact-base-url' && next) {
      options.artifactBaseUrl = next.replace(/\/+$/u, '');
      index += 1;
      continue;
    }
    if (arg === '--fail-on-gate') {
      options.failOnGate = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    subjectivePanelSummary: options.subjectivePanelSummary,
    rubricReviewerSummary: options.rubricReviewerSummary,
    exceptionalLaneSummary: options.exceptionalLaneSummary,
    visualProxyCanarySummary: options.visualProxyCanarySummary,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    minScoredCount: options.minScoredCount ?? 20,
    maxFalseApprovalRate: options.maxFalseApprovalRate ?? 0,
    maxFalseRejectionRate: options.maxFalseRejectionRate ?? 0.05,
    maxMissedExceptionalRate: options.maxMissedExceptionalRate ?? 0.25,
    maxFalseExceptionalRate: options.maxFalseExceptionalRate ?? 0,
    maxApprovedGoodOverpromotionRate: options.maxApprovedGoodOverpromotionRate ?? 0,
    maxApprovedControlProxyRate: options.maxApprovedControlProxyRate ?? 0.1,
    minRejectedVisualProxyRecall: options.minRejectedVisualProxyRecall ?? 0.8,
    maxEscalationRate: options.maxEscalationRate ?? 0.7,
    policySnapshotId: options.policySnapshotId,
    evalSetVersion: options.evalSetVersion,
    runId: options.runId,
    artifactBaseUrl: options.artifactBaseUrl,
    failOnGate: options.failOnGate ?? false,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp quality:readiness:score -- [options]

Options:
  --subjective-panel-summary <file>       subjective-panel-eval-score-summary.json
  --rubric-reviewer-summary <file>        rubric-reviewer-score-summary.json
  --exceptional-lane-summary <file>       exceptional-candidate-score-summary.json
  --visual-proxy-canary-summary <file>    visual-proxy-canary-summary.json
  --out <dir>                             Output directory. Default: ${DEFAULT_OUT_DIR}
  --min-scored-count <n>                  Minimum combined scored outputs. Default: 20
  --max-false-approval-rate <n>           Default: 0
  --max-false-rejection-rate <n>          Default: 0.05
  --max-missed-exceptional-rate <n>       Default: 0.25
  --max-false-exceptional-rate <n>        Default: 0
  --max-approved-good-overpromotion-rate <n> Default: 0
  --max-approved-control-proxy-rate <n>   Default: 0.1
  --min-rejected-visual-proxy-recall <n>  Default: 0.8
  --max-escalation-rate <n>               Default: 0.7
  --policy-snapshot-id <id>               Optional policy snapshot id for D1 import SQL.
  --eval-set-version <id>                 Optional eval/golden-set version label.
  --run-id <id>                           Optional quality-band readiness run id.
  --artifact-base-url <url>               Optional R2/base URL used in generated artifact URIs.
  --fail-on-gate                          Exit non-zero if readiness is blocked.
  --help                                  Show this help.

Behavior:
  Aggregates shadow score summaries into a quality-band readiness gate.
  It does not call providers and does not write Airtable, D1, reviewer feedback, approvals, or rejections.
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
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`${flag} must be a number between 0 and 1.`);
  }
  return parsed;
}

async function readOptionalJson(filePath: string | undefined): Promise<SummaryFile | undefined> {
  if (!filePath) return undefined;
  return JSON.parse(await readFile(filePath, 'utf8')) as SummaryFile;
}

function numberValue(summary: SummaryFile | undefined, key: string): number | undefined {
  const value = summary?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function stringValue(summary: SummaryFile | undefined, key: string): string | undefined {
  const value = summary?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stableHash(value: unknown, length = 16): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, length);
}

function stableId(prefix: string, parts: unknown[]): string {
  return `${prefix}_${stableHash(parts)}`;
}

function nestedGateReasons(summary: SummaryFile | undefined): string[] {
  const gate = summary?.promotion_gate;
  if (!gate || typeof gate !== 'object') return [];
  const reasons = (gate as { reasons?: unknown }).reasons;
  return Array.isArray(reasons) ? reasons.filter((reason): reason is string => typeof reason === 'string') : [];
}

function nestedGateStatus(summary: SummaryFile | undefined): string | undefined {
  const gate = summary?.promotion_gate;
  if (!gate || typeof gate !== 'object') return undefined;
  const status = (gate as { status?: unknown }).status;
  return typeof status === 'string' ? status : undefined;
}

function metricSnapshot(source: string, file: string | undefined, summary: SummaryFile | undefined): MetricSnapshot | undefined {
  if (!summary) return undefined;
  return {
    source,
    file,
    total_rows: numberValue(summary, 'total_rows') ?? numberValue(summary, 'total_expected_outputs') ?? numberValue(summary, 'selected_count'),
    scored_output_count: numberValue(summary, 'scored_output_count') ?? numberValue(summary, 'completed_count'),
    false_approval_risk_rate: numberValue(summary, 'false_approval_risk_rate'),
    false_rejection_risk_rate: numberValue(summary, 'false_rejection_risk_rate'),
    missed_exceptional_candidate_rate: numberValue(summary, 'missed_exceptional_candidate_rate'),
    false_exceptional_rate: numberValue(summary, 'false_exceptional_rate'),
    approved_good_overpromotion_rate: numberValue(summary, 'approved_good_overpromotion_rate'),
    provider_failure_rate: numberValue(summary, 'provider_failure_rate'),
    escalation_rate: numberValue(summary, 'escalation_rate'),
    safety_failure_count: numberValue(summary, 'safety_failure_count'),
    approved_control_medium_or_high_proxy_rate: numberValue(summary, 'approved_control_medium_or_high_proxy_rate'),
    rejected_visual_any_proxy_signal_rate: numberValue(summary, 'rejected_visual_any_proxy_signal_rate'),
    promotion_gate_status: nestedGateStatus(summary) ?? stringValue(summary, 'status'),
    gate_reasons: nestedGateReasons(summary),
  };
}

function present<T>(values: Array<T | undefined>): T[] {
  return values.filter((value): value is T => value !== undefined);
}

function maxDefined(values: Array<number | undefined>): number | undefined {
  const defined = present(values);
  return defined.length ? Math.max(...defined) : undefined;
}

function minDefined(values: Array<number | undefined>): number | undefined {
  const defined = present(values);
  return defined.length ? Math.min(...defined) : undefined;
}

function rateOk(value: number | undefined, comparator: 'lte' | 'gte', threshold: number): boolean {
  if (value === undefined) return false;
  return comparator === 'lte' ? value <= threshold : value >= threshold;
}

function buildGateReasons(options: CliOptions, snapshots: MetricSnapshot[]) {
  const reasons: string[] = [];
  const combinedScoredCount = snapshots.reduce((sum, snapshot) => sum + (snapshot.scored_output_count ?? 0), 0);
  const falseApprovalRate = maxDefined(snapshots.map((snapshot) => snapshot.false_approval_risk_rate));
  const falseRejectionRate = maxDefined(snapshots.map((snapshot) => snapshot.false_rejection_risk_rate));
  const missedExceptionalRate = maxDefined(snapshots.map((snapshot) => snapshot.missed_exceptional_candidate_rate));
  const falseExceptionalRate = maxDefined(snapshots.map((snapshot) => snapshot.false_exceptional_rate));
  const approvedGoodOverpromotionRate = maxDefined(snapshots.map((snapshot) => snapshot.approved_good_overpromotion_rate));
  const providerFailureRate = maxDefined(snapshots.map((snapshot) => snapshot.provider_failure_rate));
  const escalationRate = maxDefined(snapshots.map((snapshot) => snapshot.escalation_rate));
  const safetyFailureCount = snapshots.reduce((sum, snapshot) => sum + (snapshot.safety_failure_count ?? 0), 0);
  const approvedControlProxyRate = maxDefined(snapshots.map((snapshot) => snapshot.approved_control_medium_or_high_proxy_rate));
  const rejectedVisualProxyRecall = minDefined(snapshots.map((snapshot) => snapshot.rejected_visual_any_proxy_signal_rate));

  if (snapshots.length === 0) reasons.push('no calibration score summaries were provided');
  if (combinedScoredCount < options.minScoredCount) {
    reasons.push(`combined_scored_output_count ${combinedScoredCount} below ${options.minScoredCount}`);
  }
  if (!rateOk(falseApprovalRate, 'lte', options.maxFalseApprovalRate)) {
    reasons.push(`max_false_approval_risk_rate ${falseApprovalRate ?? 'missing'} above ${options.maxFalseApprovalRate}`);
  }
  if (!rateOk(falseRejectionRate, 'lte', options.maxFalseRejectionRate)) {
    reasons.push(`max_false_rejection_risk_rate ${falseRejectionRate ?? 'missing'} above ${options.maxFalseRejectionRate}`);
  }
  if (!rateOk(missedExceptionalRate, 'lte', options.maxMissedExceptionalRate)) {
    reasons.push(`max_missed_exceptional_candidate_rate ${missedExceptionalRate ?? 'missing'} above ${options.maxMissedExceptionalRate}`);
  }
  if (!rateOk(falseExceptionalRate, 'lte', options.maxFalseExceptionalRate)) {
    reasons.push(`max_false_exceptional_rate ${falseExceptionalRate ?? 'missing'} above ${options.maxFalseExceptionalRate}`);
  }
  if (!rateOk(approvedGoodOverpromotionRate, 'lte', options.maxApprovedGoodOverpromotionRate)) {
    reasons.push(`max_approved_good_overpromotion_rate ${approvedGoodOverpromotionRate ?? 'missing'} above ${options.maxApprovedGoodOverpromotionRate}`);
  }
  if ((providerFailureRate ?? 0) > 0) reasons.push(`provider_failure_rate ${providerFailureRate} above 0`);
  if (safetyFailureCount > 0) reasons.push(`safety_failure_count ${safetyFailureCount} above 0`);
  if (!rateOk(escalationRate, 'lte', options.maxEscalationRate)) {
    reasons.push(`max_escalation_rate ${escalationRate ?? 'missing'} above ${options.maxEscalationRate}`);
  }
  if (!rateOk(approvedControlProxyRate, 'lte', options.maxApprovedControlProxyRate)) {
    reasons.push(`approved_control_medium_or_high_proxy_rate ${approvedControlProxyRate ?? 'missing'} above ${options.maxApprovedControlProxyRate}`);
  }
  if (!rateOk(rejectedVisualProxyRecall, 'gte', options.minRejectedVisualProxyRecall)) {
    reasons.push(`rejected_visual_any_proxy_signal_rate ${rejectedVisualProxyRecall ?? 'missing'} below ${options.minRejectedVisualProxyRecall}`);
  }
  for (const snapshot of snapshots) {
    for (const reason of snapshot.gate_reasons) {
      reasons.push(`${snapshot.source}: ${reason}`);
    }
  }

  return {
    combinedScoredCount,
    falseApprovalRate,
    falseRejectionRate,
    missedExceptionalRate,
    falseExceptionalRate,
    approvedGoodOverpromotionRate,
    providerFailureRate,
    escalationRate,
    safetyFailureCount,
    approvedControlProxyRate,
    rejectedVisualProxyRecall,
    reasons,
  };
}

function readinessLevel(params: {
  snapshots: MetricSnapshot[];
  gateReasons: string[];
  combinedScoredCount: number;
  falseApprovalRate?: number;
  falseRejectionRate?: number;
}): ReadinessLevel {
  const { snapshots, gateReasons, combinedScoredCount, falseApprovalRate, falseRejectionRate } = params;
  if (snapshots.length === 0) return 'blocked_no_calibration';
  if (combinedScoredCount === 0) return 'blocked_no_calibration';
  if ((falseApprovalRate ?? 1) > 0 || (falseRejectionRate ?? 1) > 0.05) return 'creator_guidance_only';
  if (gateReasons.length > 0) return 'shadow_only';
  if (combinedScoredCount < 50) return 'reviewer_assist_candidate';
  return 'quality_band_shadow_expansion_candidate';
}

function markdown(summary: Record<string, unknown>): string {
  const gate = summary.promotion_gate as { status: string; reasons: string[] };
  const metrics = summary.aggregate_metrics as Record<string, unknown>;
  const snapshots = summary.metric_snapshots as MetricSnapshot[];
  return `# Quality Band Readiness

Generated: ${summary.generated_at}
Readiness level: ${summary.readiness_level}
Promotion gate: ${gate.status}

This is a shadow calibration gate. It does not authorize autonomous approval, rejection, quality rating, or featured decisions.

## Aggregate Metrics

- Combined scored outputs: ${metrics.combined_scored_output_count}
- Max false approval risk rate: ${metrics.max_false_approval_risk_rate ?? 'missing'}
- Max false rejection risk rate: ${metrics.max_false_rejection_risk_rate ?? 'missing'}
- Max missed exceptional candidate rate: ${metrics.max_missed_exceptional_candidate_rate ?? 'missing'}
- Max false exceptional rate: ${metrics.max_false_exceptional_rate ?? 'missing'}
- Max approved Good overpromotion rate: ${metrics.max_approved_good_overpromotion_rate ?? 'missing'}
- Max escalation rate: ${metrics.max_escalation_rate ?? 'missing'}
- Approved-control proxy collision rate: ${metrics.approved_control_medium_or_high_proxy_rate ?? 'missing'}
- Rejected visual proxy recall: ${metrics.rejected_visual_any_proxy_signal_rate ?? 'missing'}

## Gate Reasons

${gate.reasons.length ? gate.reasons.map((reason) => `- ${reason}`).join('\n') : '- none'}

## Source Summaries

${snapshots
  .map(
    (snapshot) => `- ${snapshot.source}: scored=${snapshot.scored_output_count ?? 'unknown'}, gate=${
      snapshot.promotion_gate_status ?? 'unknown'
    }, file=${snapshot.file ?? 'not provided'}`,
  )
  .join('\n')}

## Interpretation

- creator_guidance_only: use the system for evidence and revision guidance only.
- shadow_only: keep quality-band outputs out of Dify/reviewer-facing workflows; continue calibration.
- reviewer_assist_candidate: a reviewer-facing assist may be considered after human review of the gate result.
- quality_band_shadow_expansion_candidate: expand shadow evaluation before considering any production-facing quality-band automation.
`;
}

function sqlString(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'null';
  return `'${String(value).replace(/'/gu, "''")}'`;
}

function sqlJson(value: unknown): string {
  return sqlString(JSON.stringify(value));
}

function artifactUri(options: CliOptions, filePath: string): string {
  if (!options.artifactBaseUrl) return filePath;
  return `${options.artifactBaseUrl}/${encodeURIComponent(path.basename(filePath))}`;
}

async function artifactEntry(args: {
  artifactType: ArtifactManifestEntry['artifact_type'];
  filePath: string;
  uri: string;
  mediaType: string;
}): Promise<ArtifactManifestEntry> {
  const bytes = await readFile(args.filePath);
  return {
    artifact_type: args.artifactType,
    path: args.filePath,
    uri: args.uri,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    byte_size: bytes.byteLength,
    media_type: args.mediaType,
    redaction: {
      contains_creator_pii: false,
      contains_raw_reviewer_feedback: false,
      contains_secret_material: false,
      excludes_popularity_sales_views_engagement: true,
    },
  };
}

function artifactSql(readinessRunId: string, entry: ArtifactManifestEntry, createdAt: string): string {
  return `insert into quality_band_readiness_artifacts (
  id, readiness_run_id, artifact_type, uri, sha256, byte_size, media_type, redaction_json, created_at
) values (
  ${sqlString(stableId('quality_readiness_artifact', [readinessRunId, entry.artifact_type, entry.sha256]))},
  ${sqlString(readinessRunId)},
  ${sqlString(entry.artifact_type)},
  ${sqlString(entry.uri)},
  ${sqlString(entry.sha256)},
  ${entry.byte_size},
  ${sqlString(entry.media_type)},
  ${sqlJson(entry.redaction)},
  ${sqlString(createdAt)}
) on conflict(id) do update set
  uri = excluded.uri,
  sha256 = excluded.sha256,
  byte_size = excluded.byte_size,
  media_type = excluded.media_type,
  redaction_json = excluded.redaction_json;`;
}

function buildLedgerSql(summary: Record<string, unknown>, entries: ArtifactManifestEntry[]): string {
  const gate = summary.promotion_gate as { status: string; reasons: string[] };
  const createdAt = String(summary.generated_at);
  const readinessRunId = String(summary.run_id);
  const summaryArtifact = entries.find((entry) => entry.artifact_type === 'quality_band_readiness_summary');

  return `${[
    '-- Quality-band readiness ledger import.',
    '-- This is a shadow calibration artifact only. It does not approve, reject, rate, or feature templates.',
    '-- Popularity, sales, views, favorites, and marketplace engagement are intentionally excluded.',
    `insert into quality_band_readiness_runs (
  id, policy_snapshot_id, eval_set_version, schema_version, review_posture,
  readiness_level, promotion_gate_status, aggregate_metrics_json, thresholds_json,
  metric_snapshots_json, gate_reasons_json, input_exclusions_json, notes_json,
  artifact_url, created_at
) values (
  ${sqlString(readinessRunId)},
  ${sqlString(summary.policy_snapshot_id)},
  ${sqlString(summary.eval_set_version)},
  ${sqlString(summary.schema_version)},
  ${sqlString(summary.review_posture)},
  ${sqlString(summary.readiness_level)},
  ${sqlString(gate.status)},
  ${sqlJson(summary.aggregate_metrics)},
  ${sqlJson(summary.thresholds)},
  ${sqlJson(summary.metric_snapshots)},
  ${sqlJson(gate.reasons)},
  ${sqlJson(summary.input_exclusions)},
  ${sqlJson(summary.notes)},
  ${sqlString(summaryArtifact?.uri)},
  ${sqlString(createdAt)}
) on conflict(id) do update set
  readiness_level = excluded.readiness_level,
  promotion_gate_status = excluded.promotion_gate_status,
  aggregate_metrics_json = excluded.aggregate_metrics_json,
  thresholds_json = excluded.thresholds_json,
  metric_snapshots_json = excluded.metric_snapshots_json,
  gate_reasons_json = excluded.gate_reasons_json,
  input_exclusions_json = excluded.input_exclusions_json,
  notes_json = excluded.notes_json,
  artifact_url = excluded.artifact_url;`,
    ...entries
      .filter((entry) =>
        entry.artifact_type === 'quality_band_readiness_summary' ||
        entry.artifact_type === 'quality_band_readiness_summary_markdown',
      )
      .map((entry) => artifactSql(readinessRunId, entry, createdAt)),
  ].join('\n\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [subjectivePanel, rubricReviewer, exceptionalLane, visualProxyCanary] = await Promise.all([
    readOptionalJson(options.subjectivePanelSummary),
    readOptionalJson(options.rubricReviewerSummary),
    readOptionalJson(options.exceptionalLaneSummary),
    readOptionalJson(options.visualProxyCanarySummary),
  ]);

  const snapshots = present([
    metricSnapshot('subjective_panel', options.subjectivePanelSummary, subjectivePanel),
    metricSnapshot('rubric_reviewer', options.rubricReviewerSummary, rubricReviewer),
    metricSnapshot('exceptional_lane', options.exceptionalLaneSummary, exceptionalLane),
    metricSnapshot('visual_proxy_canary', options.visualProxyCanarySummary, visualProxyCanary),
  ]);
  const gate = buildGateReasons(options, snapshots);
  const level = readinessLevel({
    snapshots,
    gateReasons: gate.reasons,
    combinedScoredCount: gate.combinedScoredCount,
    falseApprovalRate: gate.falseApprovalRate,
    falseRejectionRate: gate.falseRejectionRate,
  });
  const runId =
    options.runId ??
    stableId('quality_readiness_run', [
      options.policySnapshotId,
      options.evalSetVersion,
      gate,
      snapshots.map((snapshot) => ({ source: snapshot.source, file: snapshot.file, gate: snapshot.promotion_gate_status })),
    ]);
  const summary = {
    schema_version: 'quality_band_readiness.v0.2',
    run_id: runId,
    generated_at: new Date().toISOString(),
    policy_snapshot_id: options.policySnapshotId,
    eval_set_version: options.evalSetVersion,
    review_posture: 'shadow_calibration_only',
    readiness_level: level,
    aggregate_metrics: {
      combined_scored_output_count: gate.combinedScoredCount,
      max_false_approval_risk_rate: gate.falseApprovalRate,
      max_false_rejection_risk_rate: gate.falseRejectionRate,
      max_missed_exceptional_candidate_rate: gate.missedExceptionalRate,
      max_false_exceptional_rate: gate.falseExceptionalRate,
      max_approved_good_overpromotion_rate: gate.approvedGoodOverpromotionRate,
      max_provider_failure_rate: gate.providerFailureRate,
      max_escalation_rate: gate.escalationRate,
      safety_failure_count: gate.safetyFailureCount,
      approved_control_medium_or_high_proxy_rate: gate.approvedControlProxyRate,
      rejected_visual_any_proxy_signal_rate: gate.rejectedVisualProxyRecall,
    },
    thresholds: {
      min_scored_count: options.minScoredCount,
      max_false_approval_rate: options.maxFalseApprovalRate,
      max_false_rejection_rate: options.maxFalseRejectionRate,
      max_missed_exceptional_rate: options.maxMissedExceptionalRate,
      max_false_exceptional_rate: options.maxFalseExceptionalRate,
      max_approved_good_overpromotion_rate: options.maxApprovedGoodOverpromotionRate,
      max_approved_control_proxy_rate: options.maxApprovedControlProxyRate,
      min_rejected_visual_proxy_recall: options.minRejectedVisualProxyRecall,
      max_escalation_rate: options.maxEscalationRate,
    },
    promotion_gate: {
      status: gate.reasons.length === 0 ? 'candidate_for_human_review' : 'blocked',
      reasons: gate.reasons,
    },
    metric_snapshots: snapshots,
    input_exclusions: INPUT_EXCLUSIONS,
    notes: [
      'This gate aggregates existing shadow calibration outputs only.',
      'A passing gate is not permission for autonomous decisions.',
      'Missing summaries are treated as missing evidence for the corresponding quality lane.',
      'False approval risk and exceptional overpromotion remain hard zero-tolerance gates.',
      'Popularity, sales, views, and marketplace engagement are intentionally excluded from this quality-readiness corpus.',
    ],
  };

  await mkdir(options.outDir, { recursive: true });
  const jsonFile = path.join(options.outDir, 'quality-band-readiness-summary.json');
  const markdownFile = path.join(options.outDir, 'quality-band-readiness-summary.md');
  const sqlFile = path.join(options.outDir, 'quality-band-readiness-ledger-import.sql');
  const ledgerSummaryFile = path.join(options.outDir, 'quality-band-readiness-ledger-summary.json');
  const manifestFile = path.join(options.outDir, 'quality-band-readiness-artifact-manifest.json');
  await writeFile(jsonFile, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(markdownFile, markdown(summary));

  const primaryEntries = await Promise.all([
    artifactEntry({
      artifactType: 'quality_band_readiness_summary',
      filePath: jsonFile,
      uri: artifactUri(options, jsonFile),
      mediaType: 'application/json',
    }),
    artifactEntry({
      artifactType: 'quality_band_readiness_summary_markdown',
      filePath: markdownFile,
      uri: artifactUri(options, markdownFile),
      mediaType: 'text/markdown',
    }),
  ]);
  await writeFile(sqlFile, buildLedgerSql(summary, primaryEntries));

  const ledgerSummary = {
    ok: true,
    run_id: runId,
    readiness_level: level,
    promotion_gate_status: summary.promotion_gate.status,
    out_dir: options.outDir,
    files: {
      summary_json: jsonFile,
      summary_markdown: markdownFile,
      ledger_sql: sqlFile,
      ledger_summary: ledgerSummaryFile,
      artifact_manifest: manifestFile,
    },
    notes: [
      'Generated ledger SQL is an import artifact only; this script does not write D1.',
      'Quality-band readiness remains shadow calibration unless a human approves a future policy promotion.',
      'Popularity, sales, views, favorites, and marketplace engagement are excluded by contract.',
    ],
  };
  await writeFile(ledgerSummaryFile, `${JSON.stringify(ledgerSummary, null, 2)}\n`);

  const manifestEntries = await Promise.all([
    ...primaryEntries.map(async (entry) => entry),
    artifactEntry({
      artifactType: 'quality_band_readiness_ledger_sql',
      filePath: sqlFile,
      uri: artifactUri(options, sqlFile),
      mediaType: 'text/sql',
    }),
    artifactEntry({
      artifactType: 'quality_band_readiness_ledger_summary',
      filePath: ledgerSummaryFile,
      uri: artifactUri(options, ledgerSummaryFile),
      mediaType: 'application/json',
    }),
  ]);
  const manifest = {
    schema_version: 'review_artifact_manifest.v0.1',
    run_id: runId,
    source_lane: 'quality_band_readiness_gate',
    created_at: new Date().toISOString(),
    artifacts: manifestEntries,
  };
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(JSON.stringify({ ok: true, run_id: runId, readiness_level: level, out_dir: options.outDir }, null, 2));

  if (options.failOnGate && gate.reasons.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
