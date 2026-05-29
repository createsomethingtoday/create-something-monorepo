import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  outDir: string;
  target: string;
  cited: string[];
};

type BlindCase = {
  case_id: string;
  asset_id?: string;
  version_id?: string;
  template_name: string;
  source_url: string;
  published_url?: string;
  preview_url?: string;
  marketplace_status?: string;
};

type PrivateOutcome = {
  case_id: string;
  asset_id?: string;
  version_id?: string;
  selection_stratum?: string;
  actual_review_status?: string;
  actual_quality_rating?: string;
  reviewer?: string;
  decision_date?: string;
};

type SandboxResult = {
  case_id: string;
  asset_id?: string;
  version_id?: string;
  template_name: string;
  source_url: string;
  run_ok?: boolean;
  normalized_summary?: {
    evidence_status?: string;
    finding_count?: number;
    escalation_required?: boolean;
    out_dir?: string;
  };
  normalized_output?: {
    rendered_status?: string;
    screenshot_count?: number;
    finding_count?: number;
    substantive_finding_count?: number;
    finding_rule_ids?: string[];
    finding_buckets?: string[];
  };
  run_summary?: {
    artifacts?: {
      screenshots?: string[];
      normalized_out_dir?: string;
    };
  };
  artifacts?: {
    normalized_dir?: string;
    run_dir?: string;
  };
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

type NormalizedFinding = {
  id?: string;
  rule_id?: string;
  status?: string;
  severity?: string;
  coverage?: string;
  rejectability?: string;
  finding_bucket?: string;
  confidence?: number;
  page_url?: string;
  evidence?: Record<string, unknown>;
  resolution_state?: string;
};

type CaseSummary = {
  role: 'target' | 'cited';
  lookup: string;
  case_id: string;
  asset_id?: string;
  version_id?: string;
  template_name: string;
  source_url: string;
  published_url?: string;
  marketplace_status?: string;
  selection_stratum?: string;
  expected_review_status?: string;
  expected_quality_rating?: string;
  reviewer?: string;
  decision_date?: string;
  evidence_status?: string;
  rendered_status?: string;
  screenshot_count: number;
  screenshots: string[];
  finding_count: number;
  substantive_finding_count: number;
  objective_issue_count: number;
  finding_rule_ids: string[];
  finding_buckets: string[];
  alignment_label?: string;
  alignment_notes: string[];
  normalized_findings: NormalizedFinding[];
  artifacts: {
    normalized_dir?: string;
    run_dir?: string;
  };
};

type ComparisonQuestion = {
  id: string;
  severity: 'info' | 'minor' | 'major';
  bucket: 'objective_consistency' | 'subjective_quality' | 'review_equity' | 'evidence_completeness';
  question: string;
  evidence_references: string[];
};

type ComparisonFinding = {
  id: string;
  severity: 'info' | 'minor' | 'major';
  summary: string;
  evidence_references: string[];
};

const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-appeal-equity-comparison';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    cited: [],
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
    if (arg === '--target' && next) {
      options.target = next;
      index += 1;
      continue;
    }
    if (arg === '--cited' && next) {
      options.cited = [...(options.cited ?? []), ...splitCsv(next)];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.target) throw new Error('Provide --target with a case id, template name, asset id, version id, or source URL.');
  if (!options.cited || options.cited.length === 0) throw new Error('Provide at least one --cited value.');

  return {
    inputDir: options.inputDir ?? DEFAULT_INPUT_DIR,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    target: options.target,
    cited: Array.from(new Set(options.cited)),
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:compare -- [options]

Options:
  --input <dir>          Calibration directory with manifest/outcomes/sandbox/alignment JSONL.
                         Default: ${DEFAULT_INPUT_DIR}
  --target <lookup>      Target rejected or appealed case. Matches case id, template name, asset id,
                         version id, source URL, or published URL.
  --cited <lookup>       Creator-cited comparison case. Repeatable, or comma-separated.
  --out <dir>            Output directory. Default: ${DEFAULT_OUT_DIR}
  --help                 Show this help.

Behavior:
  Builds a shadow-only appeal/equity comparison artifact from existing
  calibration evidence. It emits objective evidence and human consistency
  questions only; it must not decide appeals, approvals, rejections, ratings,
  or creator-facing feedback.
`);
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  if (!existsSync(filePath)) return [];
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function normalizeLookup(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

function caseLookupValues(row: BlindCase): string[] {
  return [
    row.case_id,
    row.asset_id,
    row.version_id,
    row.template_name,
    row.source_url,
    row.published_url,
    row.source_url?.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    row.published_url?.replace(/^https?:\/\//, '').replace(/\/$/, ''),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeLookup);
}

function findBlindCase(rows: BlindCase[], lookup: string): BlindCase {
  const normalizedLookup = normalizeLookup(lookup);
  const exact = rows.filter((row) => caseLookupValues(row).includes(normalizedLookup));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    throw new Error(`Lookup "${lookup}" matched multiple cases: ${exact.map((row) => row.case_id).join(', ')}`);
  }

  const partial = rows.filter((row) => normalizeLookup(row.template_name).includes(normalizedLookup));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    throw new Error(`Lookup "${lookup}" matched multiple template names: ${partial.map((row) => row.template_name).join(', ')}`);
  }

  throw new Error(`No case matched lookup "${lookup}".`);
}

async function readFindings(sandbox: SandboxResult | undefined): Promise<NormalizedFinding[]> {
  const normalizedDir =
    sandbox?.artifacts?.normalized_dir ??
    sandbox?.normalized_summary?.out_dir ??
    sandbox?.run_summary?.artifacts?.normalized_out_dir;
  if (!normalizedDir) return [];

  return readJsonl<NormalizedFinding>(path.join(normalizedDir, 'published-site-sandbox-findings.jsonl'));
}

function screenshotPaths(sandbox: SandboxResult | undefined): string[] {
  return sandbox?.run_summary?.artifacts?.screenshots ?? [];
}

function findingRuleIds(sandbox: SandboxResult | undefined, alignment: AlignmentRow | undefined, findings: NormalizedFinding[]): string[] {
  const ids = [
    ...(sandbox?.normalized_output?.finding_rule_ids ?? []),
    ...(alignment?.finding_rule_ids ?? []),
    ...findings.map((finding) => finding.rule_id).filter((value): value is string => Boolean(value)),
  ];
  return Array.from(new Set(ids));
}

function findingBuckets(sandbox: SandboxResult | undefined, findings: NormalizedFinding[]): string[] {
  const buckets = [
    ...(sandbox?.normalized_output?.finding_buckets ?? []),
    ...findings.map((finding) => finding.finding_bucket).filter((value): value is string => Boolean(value)),
  ];
  return Array.from(new Set(buckets));
}

function isSubstantiveFinding(finding: NormalizedFinding): boolean {
  return finding.severity === 'major' || finding.severity === 'critical' || finding.rule_id === 'published_site.render.horizontal_overflow';
}

function expectedStatusIsRejected(caseSummary: CaseSummary): boolean {
  const status = normalizeLookup(caseSummary.expected_review_status);
  const stratum = normalizeLookup(caseSummary.selection_stratum);
  const rating = normalizeLookup(caseSummary.expected_quality_rating);
  return status.includes('rejected') || stratum.includes('rejected') || rating.includes('low quality');
}

function expectedStatusIsApproved(caseSummary: CaseSummary): boolean {
  const status = normalizeLookup(caseSummary.expected_review_status);
  const stratum = normalizeLookup(caseSummary.selection_stratum);
  return status.includes('approved') || stratum.includes('approved');
}

async function buildCaseSummary(
  role: CaseSummary['role'],
  lookup: string,
  blindCase: BlindCase,
  outcomesByCaseId: Map<string, PrivateOutcome>,
  sandboxByCaseId: Map<string, SandboxResult>,
  alignmentByCaseId: Map<string, AlignmentRow>,
): Promise<CaseSummary> {
  const outcome = outcomesByCaseId.get(blindCase.case_id);
  const sandbox = sandboxByCaseId.get(blindCase.case_id);
  const alignment = alignmentByCaseId.get(blindCase.case_id);
  const findings = await readFindings(sandbox);
  const screenshots = screenshotPaths(sandbox);
  const substantiveFindingCount = sandbox?.normalized_output?.substantive_finding_count ?? findings.filter(isSubstantiveFinding).length;
  const objectiveIssueCount = findings.filter(isSubstantiveFinding).length || substantiveFindingCount;

  return {
    role,
    lookup,
    case_id: blindCase.case_id,
    asset_id: blindCase.asset_id ?? outcome?.asset_id ?? sandbox?.asset_id ?? alignment?.asset_id,
    version_id: blindCase.version_id ?? outcome?.version_id ?? sandbox?.version_id ?? alignment?.version_id,
    template_name: blindCase.template_name,
    source_url: blindCase.source_url,
    published_url: blindCase.published_url,
    marketplace_status: blindCase.marketplace_status,
    selection_stratum: outcome?.selection_stratum ?? alignment?.selection_stratum,
    expected_review_status: outcome?.actual_review_status ?? alignment?.expected_review_status,
    expected_quality_rating: outcome?.actual_quality_rating ?? alignment?.expected_quality_rating,
    reviewer: outcome?.reviewer ?? alignment?.reviewer,
    decision_date: outcome?.decision_date,
    evidence_status: alignment?.evidence_status ?? sandbox?.normalized_summary?.evidence_status,
    rendered_status: alignment?.rendered_status ?? sandbox?.normalized_output?.rendered_status,
    screenshot_count: sandbox?.normalized_output?.screenshot_count ?? screenshots.length,
    screenshots,
    finding_count: alignment?.finding_count ?? sandbox?.normalized_output?.finding_count ?? findings.length,
    substantive_finding_count: substantiveFindingCount,
    objective_issue_count: objectiveIssueCount,
    finding_rule_ids: findingRuleIds(sandbox, alignment, findings),
    finding_buckets: findingBuckets(sandbox, findings),
    alignment_label: alignment?.alignment_label,
    alignment_notes: alignment?.notes ?? [],
    normalized_findings: findings,
    artifacts: {
      normalized_dir:
        sandbox?.artifacts?.normalized_dir ??
        sandbox?.normalized_summary?.out_dir ??
        sandbox?.run_summary?.artifacts?.normalized_out_dir,
      run_dir: sandbox?.artifacts?.run_dir,
    },
  };
}

function buildComparisonFindings(target: CaseSummary, citedCases: CaseSummary[]): ComparisonFinding[] {
  const findings: ComparisonFinding[] = [];

  if (expectedStatusIsRejected(target) && target.objective_issue_count === 0) {
    findings.push({
      id: 'target_rejection_not_explained_by_sandbox',
      severity: 'major',
      summary: `${target.template_name} has a rejected/low-quality outcome, but the sandbox found no objective implementation issue in the captured published-site evidence.`,
      evidence_references: [target.case_id, target.artifacts.normalized_dir].filter((value): value is string => Boolean(value)),
    });
  }

  for (const cited of citedCases) {
    if (expectedStatusIsApproved(cited) && cited.objective_issue_count > 0) {
      findings.push({
        id: `approved_cited_has_objective_issue.${cited.case_id}`,
        severity: 'major',
        summary: `${cited.template_name} is an approved cited example with substantive sandbox findings.`,
        evidence_references: [cited.case_id, cited.artifacts.normalized_dir].filter((value): value is string => Boolean(value)),
      });
    }

    if (expectedStatusIsApproved(cited) && expectedStatusIsRejected(target) && cited.objective_issue_count > target.objective_issue_count) {
      findings.push({
        id: `different_decision_surfaces.${target.case_id}.${cited.case_id}`,
        severity: 'info',
        summary: `${target.template_name} appears to be a subjective visual-quality rejection, while ${cited.template_name} has objective implementation findings despite approval.`,
        evidence_references: [target.case_id, cited.case_id],
      });
    }
  }

  return findings;
}

function buildQuestions(target: CaseSummary, citedCases: CaseSummary[]): ComparisonQuestion[] {
  const questions: ComparisonQuestion[] = [];

  if (expectedStatusIsRejected(target) && target.objective_issue_count === 0) {
    questions.push({
      id: 'subjective_quality_precedent_required',
      severity: 'major',
      bucket: 'subjective_quality',
      question: `Which approved/rejected visual-quality precedent supports the ${target.template_name} rejection if the current sandbox evidence is technically clean?`,
      evidence_references: [target.case_id, target.alignment_label].filter((value): value is string => Boolean(value)),
    });
  }

  for (const cited of citedCases) {
    if (expectedStatusIsApproved(cited) && cited.objective_issue_count > 0) {
      questions.push({
        id: `approved_objective_issue_policy_tolerance.${cited.case_id}`,
        severity: 'major',
        bucket: 'objective_consistency',
        question: `Why was ${cited.template_name} approvable with objective findings (${cited.finding_rule_ids.join(', ') || 'unknown rules'}), and does the same tolerance or remediation path apply to ${target.template_name}?`,
        evidence_references: [cited.case_id, cited.artifacts.normalized_dir].filter((value): value is string => Boolean(value)),
      });
    }

    if (target.reviewer && cited.reviewer && target.reviewer === cited.reviewer) {
      questions.push({
        id: `same_reviewer_consistency.${target.case_id}.${cited.case_id}`,
        severity: 'minor',
        bucket: 'review_equity',
        question: `The same reviewer appears on both cases. Is the distinction between subjective visual quality and objective implementation findings documented consistently?`,
        evidence_references: [target.case_id, cited.case_id, target.reviewer],
      });
    }
  }

  questions.push({
    id: 'snapshot_currency_check',
    severity: 'minor',
    bucket: 'evidence_completeness',
    question: 'Does the current published-site snapshot match the version that was actually reviewed, or did the creator or approved cited template change after the decision?',
    evidence_references: [target.case_id, ...citedCases.map((cited) => cited.case_id)],
  });

  questions.push({
    id: 'creator_facing_response_boundary',
    severity: 'major',
    bucket: 'review_equity',
    question: 'What human-reviewed explanation can separate objective implementation issues from subjective visual-quality standards without implying an automated appeal decision?',
    evidence_references: [target.case_id, ...citedCases.map((cited) => cited.case_id)],
  });

  return questions;
}

function buildMarkdown(report: {
  generated_at: string;
  input_dir: string;
  target: CaseSummary;
  cited: CaseSummary[];
  comparison_findings: ComparisonFinding[];
  consistency_questions: ComparisonQuestion[];
}): string {
  const lines = [
    '# Appeal Equity Comparison',
    '',
    `Generated: ${report.generated_at}`,
    `Input: \`${report.input_dir}\``,
    '',
    '**Status:** Shadow evidence only',
    '',
    'This artifact must not be used as a final appeal decision, approval, rejection, rating, or creator-facing feedback without human review.',
    '',
    '## Target',
    '',
    caseMarkdown(report.target),
    '',
    '## Cited Comparisons',
    '',
  ];

  for (const cited of report.cited) {
    lines.push(caseMarkdown(cited), '');
  }

  lines.push('## Comparison Findings', '');
  for (const finding of report.comparison_findings) {
    lines.push(`- **${finding.id}** (${finding.severity}): ${finding.summary}`);
  }
  if (report.comparison_findings.length === 0) lines.push('- No comparison findings generated.');

  lines.push('', '## Consistency Questions', '');
  for (const question of report.consistency_questions) {
    lines.push(`- **${question.id}** (${question.bucket}, ${question.severity}): ${question.question}`);
  }

  lines.push(
    '',
    '## Required Boundary',
    '',
    '- Use this report to route human review, not to decide the appeal.',
    '- Keep objective findings separate from subjective visual-quality conclusions.',
    '- Confirm whether snapshots match the reviewed versions before communicating with a creator.',
  );

  return `${lines.join('\n')}\n`;
}

function caseMarkdown(caseSummary: CaseSummary): string {
  const rules = caseSummary.finding_rule_ids.length > 0 ? caseSummary.finding_rule_ids.join(', ') : 'none';
  return [
    `- Template: ${caseSummary.template_name}`,
    `- Case: ${caseSummary.case_id}`,
    `- Source: ${caseSummary.source_url}`,
    `- Outcome: ${caseSummary.expected_review_status ?? '(missing)'} / ${caseSummary.expected_quality_rating ?? '(missing)'} / ${caseSummary.selection_stratum ?? '(missing)'}`,
    `- Reviewer: ${caseSummary.reviewer ?? '(missing)'}`,
    `- Evidence: ${caseSummary.evidence_status ?? '(missing)'}, rendered ${caseSummary.rendered_status ?? '(missing)'}, screenshots ${caseSummary.screenshot_count}`,
    `- Findings: ${caseSummary.finding_count} total, ${caseSummary.substantive_finding_count} substantive, rules ${rules}`,
    `- Alignment: ${caseSummary.alignment_label ?? '(missing)'}`,
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const manifest = await readJsonl<BlindCase>(path.join(options.inputDir, 'manifest.blind.jsonl'));
  const outcomes = await readJsonl<PrivateOutcome>(path.join(options.inputDir, 'outcomes.private.jsonl'));
  const sandboxResults = await readJsonl<SandboxResult>(path.join(options.inputDir, 'sandbox-results.jsonl'));
  const alignmentRows = await readJsonl<AlignmentRow>(path.join(options.inputDir, 'status-alignment.jsonl'));

  if (manifest.length === 0) throw new Error(`No manifest rows found in ${options.inputDir}.`);

  const outcomesByCaseId = new Map(outcomes.map((row) => [row.case_id, row]));
  const sandboxByCaseId = new Map(sandboxResults.map((row) => [row.case_id, row]));
  const alignmentByCaseId = new Map(alignmentRows.map((row) => [row.case_id, row]));

  const targetCase = findBlindCase(manifest, options.target);
  const citedCases = options.cited.map((lookup) => findBlindCase(manifest, lookup));

  const target = await buildCaseSummary('target', options.target, targetCase, outcomesByCaseId, sandboxByCaseId, alignmentByCaseId);
  const cited = await Promise.all(
    citedCases.map((blindCase, index) =>
      buildCaseSummary('cited', options.cited[index] ?? blindCase.case_id, blindCase, outcomesByCaseId, sandboxByCaseId, alignmentByCaseId),
    ),
  );

  const report = {
    schema_version: 'appeal_equity_comparison.v0.1',
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    status: 'shadow' as const,
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      no_creator_facing_feedback: true,
      private_outcomes_joined_after_evidence_collection: true,
      human_reviewer_required: true,
    },
    target,
    cited,
    comparison_findings: buildComparisonFindings(target, cited),
    consistency_questions: buildQuestions(target, cited),
    prohibited_outputs: [
      'final_appeal_decision',
      'reversal_recommendation',
      'final_approval_or_rejection',
      'quality_rating',
      'creator_facing_feedback_without_human_review',
    ],
  };

  const jsonFile = path.join(options.outDir, 'appeal-equity-comparison.json');
  const markdownFile = path.join(options.outDir, 'appeal-equity-comparison.md');
  await writeFile(jsonFile, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownFile, buildMarkdown(report));

  console.log(
    JSON.stringify(
      {
        ok: true,
        out_dir: options.outDir,
        target: target.case_id,
        cited: cited.map((row) => row.case_id),
        comparison_finding_count: report.comparison_findings.length,
        consistency_question_count: report.consistency_questions.length,
        json_file: jsonFile,
        markdown_file: markdownFile,
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
