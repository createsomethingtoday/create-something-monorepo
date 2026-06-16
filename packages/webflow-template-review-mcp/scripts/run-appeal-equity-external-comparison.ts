import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  target: string;
  externalName: string;
  externalUrl: string;
  externalNormalizedDir: string;
  externalClaim: string;
  statusVerificationFile?: string;
  outDir: string;
};

type BlindCase = {
  case_id: string;
  asset_id?: string;
  version_id?: string;
  template_name: string;
  source_url: string;
  published_url?: string;
  marketplace_status?: string;
};

type PrivateOutcome = {
  case_id: string;
  selection_stratum?: string;
  actual_review_status?: string;
  actual_quality_rating?: string;
  reviewer?: string;
  decision_date?: string;
};

type SandboxResult = {
  case_id: string;
  normalized_summary?: {
    evidence_status?: string;
    finding_count?: number;
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
  rejectability?: string;
  finding_bucket?: string;
  confidence?: number;
  page_url?: string;
  evidence?: Record<string, unknown>;
  resolution_state?: string;
};

type NormalizationSummary = {
  ok?: boolean;
  run_id?: string;
  source_url?: string;
  evidence_status?: string;
  finding_count?: number;
  out_dir?: string;
};

type TargetSummary = {
  case_id: string;
  template_name: string;
  source_url: string;
  selection_stratum?: string;
  expected_review_status?: string;
  expected_quality_rating?: string;
  reviewer?: string;
  evidence_status?: string;
  rendered_status?: string;
  screenshot_count: number;
  finding_count: number;
  substantive_finding_count: number;
  objective_issue_count: number;
  finding_rule_ids: string[];
  alignment_label?: string;
  artifacts: {
    normalized_dir?: string;
    run_dir?: string;
  };
};

type ExternalSummary = {
  name: string;
  source_url: string;
  approval_or_status_claim: string;
  status_verified: boolean;
  status_verification?: ExternalStatusVerification;
  evidence_status?: string;
  normalized_dir: string;
  finding_count: number;
  substantive_finding_count: number;
  objective_issue_count: number;
  finding_rule_ids: string[];
  finding_buckets: string[];
  normalized_findings: NormalizedFinding[];
};

type StatusVerificationEvidence = {
  source?: string;
  status_label?: string;
  verified?: boolean;
  scope?: string;
  note?: string;
  evidence_ref?: string;
};

type StatusVerificationRow = {
  lookup?: string;
  claim?: string;
  source?: string;
  status?: string;
  status_verified?: boolean;
  verification_level?: string;
  matched_case?: {
    case_id?: string;
    template_name?: string;
    source_url?: string;
    published_url?: string;
    marketplace_status?: string;
    reviewer?: string;
    expected_review_status?: string;
    expected_quality_rating?: string;
    selection_stratum?: string;
  };
  evidence?: StatusVerificationEvidence[];
  caveats?: string[];
};

type StatusVerificationSummary = {
  rows?: StatusVerificationRow[];
};

type ExternalStatusVerification = {
  source_file: string;
  lookup?: string;
  status?: string;
  status_verified: boolean;
  verification_level?: string;
  matched_case?: StatusVerificationRow['matched_case'];
  evidence: StatusVerificationEvidence[];
  caveats: string[];
};

type ComparisonFinding = {
  id: string;
  severity: 'info' | 'minor' | 'major';
  summary: string;
  evidence_references: string[];
};

type ComparisonQuestion = {
  id: string;
  severity: 'minor' | 'major';
  bucket: 'objective_consistency' | 'subjective_quality' | 'review_equity' | 'evidence_completeness';
  question: string;
  evidence_references: string[];
};

const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-appeal-equity-external-comparison';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    externalClaim: 'creator_cited_approved_claim',
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
    if (arg === '--target' && next) {
      options.target = next;
      index += 1;
      continue;
    }
    if (arg === '--external-name' && next) {
      options.externalName = next;
      index += 1;
      continue;
    }
    if (arg === '--external-url' && next) {
      options.externalUrl = next;
      index += 1;
      continue;
    }
    if (arg === '--external-normalized-dir' && next) {
      options.externalNormalizedDir = next;
      index += 1;
      continue;
    }
    if (arg === '--external-claim' && next) {
      options.externalClaim = next;
      index += 1;
      continue;
    }
    if (arg === '--status-verification' && next) {
      options.statusVerificationFile = resolveInputFile(next);
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.target) throw new Error('Provide --target with a calibration case id, template name, asset id, version id, or URL.');
  if (!options.externalName) throw new Error('Provide --external-name.');
  if (!options.externalUrl) throw new Error('Provide --external-url.');
  if (!options.externalNormalizedDir) throw new Error('Provide --external-normalized-dir.');

  return {
    inputDir: options.inputDir ?? DEFAULT_INPUT_DIR,
    target: options.target,
    externalName: options.externalName,
    externalUrl: options.externalUrl,
    externalNormalizedDir: options.externalNormalizedDir,
    externalClaim: options.externalClaim ?? 'creator_cited_approved_claim',
    statusVerificationFile: options.statusVerificationFile,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:external-compare -- [options]

Options:
  --input <dir>                    Calibration directory containing the target case.
                                   Default: ${DEFAULT_INPUT_DIR}
  --target <lookup>                Target case lookup from calibration evidence.
  --external-name <name>           Cited template display name.
  --external-url <url>             Cited template published URL.
  --external-normalized-dir <dir>  Directory with published-site-sandbox-findings.jsonl.
  --external-claim <label>         Claim/status label. Default: creator_cited_approved_claim
  --status-verification <file>     Optional status verification summary JSON or rows JSONL.
  --out <dir>                      Output directory. Default: ${DEFAULT_OUT_DIR}
  --help                           Show this help.

Behavior:
  Compares a calibration target against captured external cited evidence.
  The external cited template is evidence-only unless a separate status
  verification artifact verifies its status. No Airtable, D1, R2, review
  decisions, ratings, or creator-facing feedback are written.
`);
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

async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  if (!existsSync(filePath)) return undefined;
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function resolveInputFile(filePath: string): string {
  if (path.isAbsolute(filePath) && existsSync(filePath)) return filePath;
  const candidates = [
    path.resolve(process.cwd(), filePath),
    path.resolve(process.cwd(), '..', '..', filePath),
    path.resolve(process.cwd(), '..', '..', '..', filePath),
  ];
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) throw new Error(`File not found: ${filePath}`);
  return resolved;
}

function normalizeLookup(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '');
}

function compactText(value: string | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function lookupValues(row: BlindCase): string[] {
  return [row.case_id, row.asset_id, row.version_id, row.template_name, row.source_url, row.published_url]
    .filter((value): value is string => Boolean(value))
    .map(normalizeLookup);
}

function findTarget(rows: BlindCase[], lookup: string): BlindCase {
  const normalized = normalizeLookup(lookup);
  const exact = rows.filter((row) => lookupValues(row).includes(normalized));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new Error(`Lookup "${lookup}" matched multiple target cases.`);

  const partial = rows.filter((row) => normalizeLookup(row.template_name).includes(normalized));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) throw new Error(`Lookup "${lookup}" matched multiple target templates.`);

  throw new Error(`No target matched lookup "${lookup}".`);
}

function isSubstantiveFinding(finding: NormalizedFinding): boolean {
  return finding.severity === 'major' || finding.severity === 'critical' || finding.rule_id === 'published_site.render.horizontal_overflow';
}

function isRejected(target: TargetSummary): boolean {
  const status = `${target.selection_stratum ?? ''} ${target.expected_review_status ?? ''} ${target.expected_quality_rating ?? ''}`.toLowerCase();
  return status.includes('rejected') || status.includes('low quality');
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function screenshotCount(sandbox: SandboxResult | undefined): number {
  return sandbox?.normalized_output?.screenshot_count ?? sandbox?.run_summary?.artifacts?.screenshots?.length ?? 0;
}

async function readStatusVerificationRows(filePath: string | undefined): Promise<StatusVerificationRow[]> {
  if (!filePath) return [];
  const raw = await readFile(filePath, 'utf8');
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(trimmed) as StatusVerificationSummary | StatusVerificationRow[];
    if (Array.isArray(parsed)) return parsed;
    return parsed.rows ?? [];
  }

  return trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StatusVerificationRow);
}

function statusRowValues(row: StatusVerificationRow): string[] {
  return [
    row.lookup,
    row.matched_case?.case_id,
    row.matched_case?.template_name,
    row.matched_case?.source_url,
    row.matched_case?.published_url,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeLookup);
}

function statusRowMatchesExternal(row: StatusVerificationRow, options: CliOptions): boolean {
  const normalizedName = normalizeLookup(options.externalName);
  const normalizedUrl = normalizeLookup(options.externalUrl);
  const normalizedValues = statusRowValues(row);
  if (normalizedValues.includes(normalizedName) || normalizedValues.includes(normalizedUrl)) return true;

  const externalName = compactText(options.externalName);
  const matchedName = compactText(row.matched_case?.template_name);
  return externalName.length > 0 && matchedName.length > 0 && externalName === matchedName;
}

function verificationPriority(row: StatusVerificationRow): number {
  if (row.status_verified !== true) return 0;
  if (row.verification_level === 'trusted_or_historical_review') return 4;
  if (row.verification_level === 'calibration_snapshot_only') return 3;
  if (row.verification_level === 'current_public_listing_only') return 2;
  return 1;
}

function chooseStatusVerification(rows: StatusVerificationRow[], options: CliOptions): ExternalStatusVerification | undefined {
  const matches = rows
    .filter((row) => statusRowMatchesExternal(row, options))
    .sort((left, right) => verificationPriority(right) - verificationPriority(left));
  const selected = matches[0];
  if (!selected || !options.statusVerificationFile) return undefined;

  return {
    source_file: options.statusVerificationFile,
    lookup: selected.lookup,
    status: selected.status,
    status_verified: selected.status_verified === true,
    verification_level: selected.verification_level,
    matched_case: selected.matched_case,
    evidence: selected.evidence ?? [],
    caveats: selected.caveats ?? [],
  };
}

async function buildTargetSummary(
  target: BlindCase,
  outcomesByCaseId: Map<string, PrivateOutcome>,
  sandboxByCaseId: Map<string, SandboxResult>,
  alignmentByCaseId: Map<string, AlignmentRow>,
): Promise<TargetSummary> {
  const outcome = outcomesByCaseId.get(target.case_id);
  const sandbox = sandboxByCaseId.get(target.case_id);
  const alignment = alignmentByCaseId.get(target.case_id);
  const normalizedDir = sandbox?.artifacts?.normalized_dir ?? sandbox?.normalized_summary?.out_dir ?? sandbox?.run_summary?.artifacts?.normalized_out_dir;
  const findings = normalizedDir ? await readJsonl<NormalizedFinding>(path.join(normalizedDir, 'published-site-sandbox-findings.jsonl')) : [];
  const substantive = sandbox?.normalized_output?.substantive_finding_count ?? findings.filter(isSubstantiveFinding).length;

  return {
    case_id: target.case_id,
    template_name: target.template_name,
    source_url: target.source_url,
    selection_stratum: outcome?.selection_stratum ?? alignment?.selection_stratum,
    expected_review_status: outcome?.actual_review_status ?? alignment?.expected_review_status,
    expected_quality_rating: outcome?.actual_quality_rating ?? alignment?.expected_quality_rating,
    reviewer: outcome?.reviewer ?? alignment?.reviewer,
    evidence_status: alignment?.evidence_status ?? sandbox?.normalized_summary?.evidence_status,
    rendered_status: alignment?.rendered_status ?? sandbox?.normalized_output?.rendered_status,
    screenshot_count: screenshotCount(sandbox),
    finding_count: alignment?.finding_count ?? sandbox?.normalized_output?.finding_count ?? findings.length,
    substantive_finding_count: substantive,
    objective_issue_count: findings.filter(isSubstantiveFinding).length || substantive,
    finding_rule_ids: unique([...(sandbox?.normalized_output?.finding_rule_ids ?? []), ...(alignment?.finding_rule_ids ?? []), ...findings.map((finding) => finding.rule_id)]),
    alignment_label: alignment?.alignment_label,
    artifacts: {
      normalized_dir: normalizedDir,
      run_dir: sandbox?.artifacts?.run_dir,
    },
  };
}

async function buildExternalSummary(options: CliOptions, statusRows: StatusVerificationRow[]): Promise<ExternalSummary> {
  const normalizedDir = options.externalNormalizedDir;
  const findings = await readJsonl<NormalizedFinding>(path.join(normalizedDir, 'published-site-sandbox-findings.jsonl'));
  const summary = await readJsonFile<NormalizationSummary>(path.join(normalizedDir, 'published-site-sandbox-normalization-summary.json'));
  const substantive = findings.filter(isSubstantiveFinding).length;
  const statusVerification = chooseStatusVerification(statusRows, options);
  return {
    name: options.externalName,
    source_url: options.externalUrl,
    approval_or_status_claim: options.externalClaim,
    status_verified: statusVerification?.status_verified === true,
    status_verification: statusVerification,
    evidence_status: summary?.evidence_status,
    normalized_dir: options.externalNormalizedDir,
    finding_count: summary?.finding_count ?? findings.length,
    substantive_finding_count: substantive,
    objective_issue_count: substantive,
    finding_rule_ids: unique(findings.map((finding) => finding.rule_id)),
    finding_buckets: unique(findings.map((finding) => finding.finding_bucket)),
    normalized_findings: findings,
  };
}

function buildComparisonFindings(target: TargetSummary, external: ExternalSummary): ComparisonFinding[] {
  const findings: ComparisonFinding[] = [];
  if (isRejected(target) && target.objective_issue_count === 0) {
    findings.push({
      id: 'target_rejection_not_explained_by_sandbox',
      severity: 'major',
      summary: `${target.template_name} has a rejected/low-quality outcome, but captured sandbox evidence found no substantive objective implementation issue.`,
      evidence_references: [target.case_id, target.artifacts.normalized_dir].filter((value): value is string => Boolean(value)),
    });
  }

  if (external.objective_issue_count > 0) {
    findings.push({
      id: 'external_cited_has_objective_issue',
      severity: 'major',
      summary: `${external.name} has substantive objective findings in captured evidence.`,
      evidence_references: [external.source_url, external.normalized_dir],
    });
  }

  if (external.status_verified) {
    findings.push({
      id: 'external_cited_status_verified',
      severity: 'info',
      summary: `${external.name} has separate status verification evidence (${external.status_verification?.verification_level ?? 'verified'}).`,
      evidence_references: [external.source_url, external.status_verification?.source_file].filter((value): value is string => Boolean(value)),
    });
  } else {
    findings.push({
      id: 'external_cited_status_unverified',
      severity: 'minor',
      summary: `${external.name} carries the status claim "${external.approval_or_status_claim}", but that claim is not verified by this comparison artifact.`,
      evidence_references: [external.source_url],
    });
  }

  return findings;
}

function buildQuestions(target: TargetSummary, external: ExternalSummary): ComparisonQuestion[] {
  const questions: ComparisonQuestion[] = [];
  if (isRejected(target) && target.objective_issue_count === 0) {
    questions.push({
      id: 'subjective_quality_precedent_required',
      severity: 'major',
      bucket: 'subjective_quality',
      question: `Which visual-quality precedent supports the ${target.template_name} rejection if objective evidence remains clean?`,
      evidence_references: [target.case_id, target.alignment_label].filter((value): value is string => Boolean(value)),
    });
  }

  if (!external.status_verified) {
    questions.push({
      id: 'external_status_verification_required',
      severity: 'major',
      bucket: 'evidence_completeness',
      question: `Is ${external.name} actually approved/published in the relevant review context, or is it only creator-cited?`,
      evidence_references: [external.source_url],
    });
  }

  if (external.objective_issue_count > 0) {
    questions.push({
      id: 'external_objective_issue_tolerance',
      severity: 'major',
      bucket: 'objective_consistency',
      question: external.status_verified
        ? `Why were objective findings (${external.finding_rule_ids.join(', ') || 'unknown rules'}) tolerable for verified cited example ${external.name}, and does that tolerance apply to ${target.template_name}?`
        : `If ${external.name} is verified as approved, why were objective findings (${external.finding_rule_ids.join(', ') || 'unknown rules'}) tolerable there, and does that tolerance apply to ${target.template_name}?`,
      evidence_references: [external.normalized_dir],
    });
  }

  questions.push({
    id: 'snapshot_currency_check',
    severity: 'minor',
    bucket: 'evidence_completeness',
    question: 'Do the current target and cited snapshots match the versions that were actually reviewed?',
    evidence_references: [target.case_id, external.source_url],
  });

  questions.push({
    id: 'creator_facing_response_boundary',
    severity: 'major',
    bucket: 'review_equity',
    question: 'What human-reviewed explanation can separate subjective visual-quality standards from objective implementation issues without implying an automated appeal decision?',
    evidence_references: [target.case_id, external.source_url],
  });

  return questions;
}

function buildMarkdown(report: {
  generated_at: string;
  input_dir: string;
  target: TargetSummary;
  external_cited: ExternalSummary;
  comparison_findings: ComparisonFinding[];
  consistency_questions: ComparisonQuestion[];
}): string {
  const lines = [
    '# Appeal Equity External Comparison',
    '',
    `Generated: ${report.generated_at}`,
    `Input: \`${report.input_dir}\``,
    '',
    '**Status:** Shadow evidence only',
    '',
    'This artifact compares a calibration target against captured external cited evidence. It does not verify final approval status and must not be used as an appeal decision, approval, rejection, rating, or creator-facing response without human review.',
    '',
    '## Target',
    '',
    `- Template: ${report.target.template_name}`,
    `- Case: ${report.target.case_id}`,
    `- Source: ${report.target.source_url}`,
    `- Outcome: ${report.target.expected_review_status ?? '(missing)'} / ${report.target.expected_quality_rating ?? '(missing)'} / ${report.target.selection_stratum ?? '(missing)'}`,
    `- Findings: ${report.target.finding_count} total, ${report.target.substantive_finding_count} substantive`,
    `- Alignment: ${report.target.alignment_label ?? '(missing)'}`,
    '',
    '## External Cited Evidence',
    '',
    `- Name: ${report.external_cited.name}`,
    `- Source: ${report.external_cited.source_url}`,
    `- Claim: ${report.external_cited.approval_or_status_claim}`,
    `- Status verified: ${report.external_cited.status_verified}`,
    `- Status verification level: ${report.external_cited.status_verification?.verification_level ?? '(missing)'}`,
    `- Status verification source: ${report.external_cited.status_verification?.source_file ? `\`${report.external_cited.status_verification.source_file}\`` : '(missing)'}`,
    `- Status caveats: ${report.external_cited.status_verification?.caveats.join(' ') || '(none)'}`,
    `- Normalized dir: \`${report.external_cited.normalized_dir}\``,
    `- Findings: ${report.external_cited.finding_count} total, ${report.external_cited.substantive_finding_count} substantive`,
    `- Rules: ${report.external_cited.finding_rule_ids.join(', ') || 'none'}`,
    '',
    '## Comparison Findings',
    '',
  ];

  for (const finding of report.comparison_findings) {
    lines.push(`- **${finding.id}** (${finding.severity}): ${finding.summary}`);
  }

  lines.push('', '## Consistency Questions', '');
  for (const question of report.consistency_questions) {
    lines.push(`- **${question.id}** (${question.bucket}, ${question.severity}): ${question.question}`);
  }

  lines.push(
    '',
    '## Required Boundary',
    '',
    report.external_cited.status_verified
      ? '- Keep the separate status verification artifact attached to the comparison before any reviewer conclusion.'
      : '- Verify the external cited template status before any reviewer conclusion.',
    '- Keep objective implementation findings separate from subjective visual-quality judgments.',
    '- Use this as a human-review packet, not an automated appeal outcome.',
  );

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const manifest = await readJsonl<BlindCase>(path.join(options.inputDir, 'manifest.blind.jsonl'));
  const outcomes = await readJsonl<PrivateOutcome>(path.join(options.inputDir, 'outcomes.private.jsonl'));
  const sandboxResults = await readJsonl<SandboxResult>(path.join(options.inputDir, 'sandbox-results.jsonl'));
  const alignmentRows = await readJsonl<AlignmentRow>(path.join(options.inputDir, 'status-alignment.jsonl'));
  const statusVerificationRows = await readStatusVerificationRows(options.statusVerificationFile);

  const targetCase = findTarget(manifest, options.target);
  const target = await buildTargetSummary(
    targetCase,
    new Map(outcomes.map((row) => [row.case_id, row])),
    new Map(sandboxResults.map((row) => [row.case_id, row])),
    new Map(alignmentRows.map((row) => [row.case_id, row])),
  );
  const external = await buildExternalSummary(options, statusVerificationRows);

  const report = {
    schema_version: 'appeal_equity_external_comparison.v0.1',
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    status: 'shadow' as const,
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      no_creator_facing_feedback: true,
      external_status_claim_not_verified: !external.status_verified,
      human_reviewer_required: true,
    },
    target,
    external_cited: external,
    comparison_findings: buildComparisonFindings(target, external),
    consistency_questions: buildQuestions(target, external),
    prohibited_outputs: [
      'final_appeal_decision',
      'reversal_recommendation',
      'final_approval_or_rejection',
      'quality_rating',
      'creator_facing_feedback_without_human_review',
    ],
  };

  const jsonFile = path.join(options.outDir, 'appeal-equity-external-comparison.json');
  const markdownFile = path.join(options.outDir, 'appeal-equity-external-comparison.md');
  await writeFile(jsonFile, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownFile, buildMarkdown(report));

  console.log(
    JSON.stringify(
      {
        ok: true,
        out_dir: options.outDir,
        target: target.case_id,
        external_name: external.name,
        external_status_verified: external.status_verified,
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
