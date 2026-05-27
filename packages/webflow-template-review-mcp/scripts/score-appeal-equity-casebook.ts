import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  summaryFile: string;
  outDir: string;
  minReadyCount: number;
  maxNeedsEvidenceCount: number;
  maxAmbiguousCount: number;
  maxComparisonFailureCount: number;
  requireStatusVerified: boolean;
  requireExternalComparison: boolean;
  requiredQuestionIds: string[];
  failOnGate: boolean;
};

type Resolution = {
  lookup: string;
  status: 'resolved' | 'unresolved' | 'ambiguous';
  case_id?: string;
  template_name?: string;
  source_url?: string;
  published_url?: string;
};

type StatusVerificationRow = {
  status?: 'verified' | 'unverified' | 'ambiguous';
  status_verified?: boolean;
  verification_level?: string;
};

type ExternalComparisonSummary = {
  json_file?: string;
  markdown_file?: string;
  external_status_verified?: boolean;
  comparison_finding_count?: number;
  consistency_question_count?: number;
  finding_ids?: string[];
  question_ids?: string[];
};

type CasebookCitedRow = {
  lookup: string;
  resolution: Resolution;
  status_verification?: StatusVerificationRow;
  normalized_dir?: string;
  external_comparison?: ExternalComparisonSummary;
  blocked_reason?: string;
  error?: string;
};

type CasebookRow = {
  appeal_id: string;
  source?: string;
  claim_summary?: string;
  intake_status?: string;
  readiness:
    | 'ready_for_human_review'
    | 'ready_for_external_comparison'
    | 'needs_evidence_capture'
    | 'ambiguous_resolution'
    | 'comparison_failed';
  target: Resolution;
  cited: CasebookCitedRow[];
  next_actions?: string[];
};

type CasebookSummary = {
  schema_version?: string;
  generated_at?: string;
  input_dir?: string;
  appeals_file?: string;
  appeal_count?: number;
  cited_count?: number;
  ready_for_human_review_count?: number;
  needs_evidence_capture_count?: number;
  ambiguous_count?: number;
  comparison_failed_count?: number;
  rows?: CasebookRow[];
};

type ScoredCasebookRow = CasebookRow & {
  score_label:
    | 'ready_for_human_review'
    | 'ready_for_external_comparison'
    | 'needs_evidence_capture'
    | 'ambiguous_resolution'
    | 'comparison_failed'
    | 'status_unverified'
    | 'external_comparison_missing'
    | 'required_question_missing';
  ready_for_human_review: boolean;
  blockers: string[];
  evidence_refs: string[];
};

const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-appeal-equity-casebook';
const DEFAULT_REQUIRED_QUESTIONS = ['creator_facing_response_boundary'];

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
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
    if (arg === '--summary' && next) {
      options.summaryFile = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
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

  const inputDir = options.inputDir ?? DEFAULT_INPUT_DIR;
  return {
    inputDir,
    summaryFile: options.summaryFile ?? path.join(inputDir, 'appeal-equity-casebook-summary.json'),
    outDir: options.outDir ?? path.join(inputDir, 'score'),
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
  pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:score-casebook -- [options]

Options:
  --input <dir>                              Casebook directory.
                                             Default: ${DEFAULT_INPUT_DIR}
  --summary <file>                           Casebook summary JSON.
                                             Default: <input>/appeal-equity-casebook-summary.json
  --out <dir>                                Output directory. Default: <input>/score
  --min-ready-count <n>                      Required ready rows. Default: 1
  --max-needs-evidence-count <n>             Gate threshold. Default: 0
  --max-ambiguous-count <n>                  Gate threshold. Default: 0
  --max-comparison-failure-count <n>         Gate threshold. Default: 0
  --allow-unverified-status                  Do not block on unverified cited status.
  --allow-missing-external-comparison        Do not block on missing comparison packets.
  --required-question-ids <csv>              Required comparison questions.
                                             Default: ${DEFAULT_REQUIRED_QUESTIONS.join(',')}
  --fail-on-gate                             Exit non-zero when gate is blocked.
  --help                                     Show this help.

Behavior:
  Scores an appeal/equity casebook for structural readiness. It does not make
  appeal decisions, approval/rejection calls, ratings, or creator-facing feedback.
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

async function writeJsonl(filePath: string, rows: unknown[]) {
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}${rows.length ? '\n' : ''}`);
}

function citedIsResolved(cited: CasebookCitedRow): boolean {
  return cited.resolution.status === 'resolved';
}

function citedStatusVerified(cited: CasebookCitedRow): boolean {
  return cited.status_verification?.status_verified === true;
}

function citedHasExternalComparison(cited: CasebookCitedRow): boolean {
  return Boolean(cited.external_comparison?.json_file || cited.external_comparison?.markdown_file);
}

function missingRequiredQuestions(cited: CasebookCitedRow, requiredQuestionIds: string[]): string[] {
  const questionIds = new Set(cited.external_comparison?.question_ids ?? []);
  return requiredQuestionIds.filter((id) => !questionIds.has(id));
}

function scoreRow(row: CasebookRow, options: CliOptions): ScoredCasebookRow {
  const blockers: string[] = [];
  const evidenceRefs: string[] = [];

  if (row.target.status !== 'resolved') blockers.push('target_not_resolved');
  if (row.readiness === 'needs_evidence_capture') blockers.push('casebook_marked_needs_evidence_capture');
  if (row.readiness === 'ambiguous_resolution') blockers.push('casebook_marked_ambiguous_resolution');
  if (row.readiness === 'comparison_failed') blockers.push('casebook_marked_comparison_failed');

  for (const cited of row.cited) {
    if (!citedIsResolved(cited)) blockers.push(`cited_not_resolved:${cited.lookup}`);
    if (cited.blocked_reason) blockers.push(`${cited.blocked_reason}:${cited.lookup}`);
    if (cited.normalized_dir) evidenceRefs.push(cited.normalized_dir);
    if (cited.external_comparison?.json_file) evidenceRefs.push(cited.external_comparison.json_file);
    if (cited.external_comparison?.markdown_file) evidenceRefs.push(cited.external_comparison.markdown_file);
    if (options.requireStatusVerified && !citedStatusVerified(cited)) blockers.push(`cited_status_unverified:${cited.lookup}`);
    if (options.requireExternalComparison && !citedHasExternalComparison(cited)) {
      blockers.push(`external_comparison_missing:${cited.lookup}`);
    }
    if (citedHasExternalComparison(cited)) {
      for (const questionId of missingRequiredQuestions(cited, options.requiredQuestionIds)) {
        blockers.push(`required_question_missing:${questionId}:${cited.lookup}`);
      }
    }
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  return {
    ...row,
    score_label: scoreLabel(row, uniqueBlockers),
    ready_for_human_review: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    evidence_refs: Array.from(new Set(evidenceRefs)),
  };
}

function scoreLabel(row: CasebookRow, blockers: string[]): ScoredCasebookRow['score_label'] {
  if (row.readiness === 'comparison_failed') return 'comparison_failed';
  if (row.readiness === 'ambiguous_resolution') return 'ambiguous_resolution';
  if (row.readiness === 'needs_evidence_capture') return 'needs_evidence_capture';
  if (blockers.some((blocker) => blocker.startsWith('cited_status_unverified'))) return 'status_unverified';
  if (blockers.some((blocker) => blocker.startsWith('external_comparison_missing'))) return 'external_comparison_missing';
  if (blockers.some((blocker) => blocker.startsWith('required_question_missing'))) return 'required_question_missing';
  if (row.readiness === 'ready_for_external_comparison') return 'ready_for_external_comparison';
  return 'ready_for_human_review';
}

function countBy<T extends string>(values: T[]): Record<T, number> {
  return values.reduce(
    (counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    },
    {} as Record<T, number>,
  );
}

function buildGateReasons(summary: {
  readyCount: number;
  needsEvidenceCount: number;
  ambiguousCount: number;
  comparisonFailedCount: number;
  statusUnverifiedCount: number;
  externalComparisonMissingCount: number;
  requiredQuestionMissingCount: number;
}, options: CliOptions): string[] {
  const reasons: string[] = [];
  if (summary.readyCount < options.minReadyCount) {
    reasons.push(`ready_count ${summary.readyCount} below min_ready_count ${options.minReadyCount}`);
  }
  if (summary.needsEvidenceCount > options.maxNeedsEvidenceCount) {
    reasons.push(`needs_evidence_capture_count ${summary.needsEvidenceCount} exceeded ${options.maxNeedsEvidenceCount}`);
  }
  if (summary.ambiguousCount > options.maxAmbiguousCount) {
    reasons.push(`ambiguous_count ${summary.ambiguousCount} exceeded ${options.maxAmbiguousCount}`);
  }
  if (summary.comparisonFailedCount > options.maxComparisonFailureCount) {
    reasons.push(`comparison_failed_count ${summary.comparisonFailedCount} exceeded ${options.maxComparisonFailureCount}`);
  }
  if (options.requireStatusVerified && summary.statusUnverifiedCount > 0) {
    reasons.push(`status_unverified_count ${summary.statusUnverifiedCount} exceeded 0`);
  }
  if (options.requireExternalComparison && summary.externalComparisonMissingCount > 0) {
    reasons.push(`external_comparison_missing_count ${summary.externalComparisonMissingCount} exceeded 0`);
  }
  if (summary.requiredQuestionMissingCount > 0) {
    reasons.push(`required_question_missing_count ${summary.requiredQuestionMissingCount} exceeded 0`);
  }
  return reasons;
}

function buildMarkdown(summary: Record<string, unknown>, rows: ScoredCasebookRow[]): string {
  const lines = [
    '# Appeal Equity Casebook Score',
    '',
    `Generated: ${summary.generated_at}`,
    `Input: \`${summary.input_dir}\``,
    '',
    '**Status:** Shadow readiness score',
    '',
    'This artifact scores structural readiness only. It does not decide appeals, approvals, rejections, ratings, or creator-facing feedback.',
    '',
    '## Gate',
    '',
    `- Status: ${summary.gate_status}`,
    `- Reasons: ${(summary.gate_reasons as string[]).join('; ') || 'none'}`,
    `- Ready rows: ${summary.ready_count}`,
    `- Needs evidence: ${summary.needs_evidence_capture_count}`,
    `- Ambiguous: ${summary.ambiguous_count}`,
    `- Comparison failed: ${summary.comparison_failed_count}`,
    `- Status unverified: ${summary.status_unverified_count}`,
    `- Missing comparison: ${summary.external_comparison_missing_count}`,
    `- Missing required questions: ${summary.required_question_missing_count}`,
    '',
    '## Rows',
    '',
    '| Appeal | Score label | Ready | Blockers | Evidence |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.appeal_id} | ${row.score_label} | ${row.ready_for_human_review} | ${row.blockers.join('<br>') || ''} | ${row.evidence_refs.map((ref) => `\`${ref}\``).join('<br>')} |`,
    );
  }

  lines.push(
    '',
    '## Boundary',
    '',
    '- Passing means the casebook is structurally ready for human review, not that the appeal should be accepted.',
    '- Blocked rows should return to mapping, capture, status verification, or comparison generation.',
    '- Keep subjective visual-quality decisions with reviewer precedent review.',
  );

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const casebook = await readJsonFile<CasebookSummary>(options.summaryFile);
  const rows = casebook.rows ?? [];
  const scoredRows = rows.map((row) => scoreRow(row, options));

  const readyCount = scoredRows.filter((row) => row.ready_for_human_review).length;
  const needsEvidenceCount = scoredRows.filter((row) =>
    row.blockers.some(
      (blocker) =>
        blocker === 'target_not_resolved' ||
        blocker === 'casebook_marked_needs_evidence_capture' ||
        blocker.startsWith('cited_not_resolved') ||
        blocker.startsWith('missing_cited_normalized_dir'),
    ),
  ).length;
  const ambiguousCount = scoredRows.filter((row) => row.blockers.includes('casebook_marked_ambiguous_resolution')).length;
  const comparisonFailedCount = scoredRows.filter((row) =>
    row.blockers.some((blocker) => blocker === 'casebook_marked_comparison_failed' || blocker.startsWith('external_comparison_failed')),
  ).length;
  const statusUnverifiedCount = scoredRows.filter((row) => row.blockers.some((blocker) => blocker.startsWith('cited_status_unverified'))).length;
  const externalComparisonMissingCount = scoredRows.filter((row) =>
    row.blockers.some((blocker) => blocker.startsWith('external_comparison_missing')),
  ).length;
  const requiredQuestionMissingCount = scoredRows.filter((row) =>
    row.blockers.some((blocker) => blocker.startsWith('required_question_missing')),
  ).length;
  const gateReasons = buildGateReasons(
    {
      readyCount,
      needsEvidenceCount,
      ambiguousCount,
      comparisonFailedCount,
      statusUnverifiedCount,
      externalComparisonMissingCount,
      requiredQuestionMissingCount,
    },
    options,
  );

  const summary = {
    schema_version: 'appeal_equity_casebook_score.v0.1',
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    summary_file: options.summaryFile,
    status: 'shadow',
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      no_creator_facing_feedback: true,
      human_reviewer_required: true,
    },
    options: {
      min_ready_count: options.minReadyCount,
      max_needs_evidence_count: options.maxNeedsEvidenceCount,
      max_ambiguous_count: options.maxAmbiguousCount,
      max_comparison_failure_count: options.maxComparisonFailureCount,
      require_status_verified: options.requireStatusVerified,
      require_external_comparison: options.requireExternalComparison,
      required_question_ids: options.requiredQuestionIds,
    },
    casebook_appeal_count: casebook.appeal_count ?? rows.length,
    casebook_cited_count: casebook.cited_count,
    scored_count: scoredRows.length,
    ready_count: readyCount,
    needs_evidence_capture_count: needsEvidenceCount,
    ambiguous_count: ambiguousCount,
    comparison_failed_count: comparisonFailedCount,
    status_unverified_count: statusUnverifiedCount,
    external_comparison_missing_count: externalComparisonMissingCount,
    required_question_missing_count: requiredQuestionMissingCount,
    score_label_counts: countBy(scoredRows.map((row) => row.score_label)),
    gate_status: gateReasons.length === 0 ? 'passed' : 'blocked',
    gate_reasons: gateReasons,
    rows: scoredRows,
  };

  const scoredJsonl = path.join(options.outDir, 'appeal-equity-casebook-scored.jsonl');
  const summaryJson = path.join(options.outDir, 'appeal-equity-casebook-score-summary.json');
  const summaryMarkdown = path.join(options.outDir, 'appeal-equity-casebook-score-summary.md');
  await writeJsonl(scoredJsonl, scoredRows);
  await writeFile(summaryJson, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(summaryMarkdown, buildMarkdown(summary, scoredRows));

  console.log(
    JSON.stringify(
      {
        ok: true,
        out_dir: options.outDir,
        gate_status: summary.gate_status,
        gate_reasons: summary.gate_reasons,
        scored_count: summary.scored_count,
        ready_count: summary.ready_count,
        needs_evidence_capture_count: summary.needs_evidence_capture_count,
        status_unverified_count: summary.status_unverified_count,
        external_comparison_missing_count: summary.external_comparison_missing_count,
        required_question_missing_count: summary.required_question_missing_count,
        summary_json: summaryJson,
        summary_markdown: summaryMarkdown,
        scored_jsonl: scoredJsonl,
      },
      null,
      2,
    ),
  );

  if (options.failOnGate && summary.gate_status === 'blocked') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
