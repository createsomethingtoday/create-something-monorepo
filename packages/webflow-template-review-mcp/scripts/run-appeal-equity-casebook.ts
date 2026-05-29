import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  appealsFile: string;
  trustedStatusesFile?: string;
  outDir: string;
  runExternalComparisons: boolean;
  commandTimeoutMs: number;
};

type AppealInput = {
  appeal_id?: string;
  source?: string;
  target: string;
  cited: Array<string | { lookup: string; note?: string }>;
  claim_summary?: string;
  notes?: string;
};

type Resolution = {
  lookup: string;
  status: 'resolved' | 'unresolved' | 'ambiguous';
  case_id?: string;
  template_name?: string;
  source_url?: string;
  published_url?: string;
  marketplace_status?: string;
  selection_stratum?: string;
  expected_review_status?: string;
  expected_quality_rating?: string;
  reviewer?: string;
  evidence_status?: string;
  finding_count?: number;
  substantive_finding_count?: number;
  finding_rule_ids?: string[];
  alignment_label?: string;
  candidates?: Array<{
    case_id: string;
    template_name: string;
    source_url: string;
  }>;
};

type IntakeRow = {
  appeal_id: string;
  source?: string;
  claim_summary?: string;
  notes?: string;
  target: Resolution;
  cited: Resolution[];
  status:
    | 'ready_for_comparison'
    | 'comparison_generated'
    | 'needs_target_evidence_capture'
    | 'needs_cited_evidence_capture'
    | 'ambiguous_resolution';
  next_actions: string[];
};

type SandboxResult = {
  case_id: string;
  normalized_summary?: {
    out_dir?: string;
  };
  run_summary?: {
    artifacts?: {
      normalized_out_dir?: string;
    };
  };
  artifacts?: {
    normalized_dir?: string;
    run_dir?: string;
  };
};

type StatusLookupRow = {
  lookup: string;
  claim?: string;
  source?: string;
};

type StatusVerificationRow = {
  lookup?: string;
  status?: 'verified' | 'unverified' | 'ambiguous';
  status_verified?: boolean;
  verification_level?: string;
  matched_case?: {
    case_id?: string;
    template_name?: string;
    source_url?: string;
    published_url?: string;
  };
  caveats?: string[];
};

type StatusVerificationSummary = {
  rows?: StatusVerificationRow[];
};

type ExternalComparisonSummary = {
  json_file: string;
  markdown_file: string;
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
  notes?: string;
  intake_status: IntakeRow['status'];
  readiness:
    | 'ready_for_human_review'
    | 'ready_for_external_comparison'
    | 'needs_evidence_capture'
    | 'ambiguous_resolution'
    | 'comparison_failed';
  target: Resolution;
  cited: CasebookCitedRow[];
  next_actions: string[];
};

type ExternalComparisonReport = {
  external_cited?: {
    status_verified?: boolean;
  };
  comparison_findings?: Array<{ id?: string }>;
  consistency_questions?: Array<{ id?: string }>;
};

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-appeal-equity-casebook';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    runExternalComparisons: false,
    commandTimeoutMs: 180_000,
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
    if (arg === '--appeals' && next) {
      options.appealsFile = resolveInputFile(next);
      index += 1;
      continue;
    }
    if (arg === '--trusted-statuses' && next) {
      options.trustedStatusesFile = resolveInputFile(next);
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--run-external-comparisons') {
      options.runExternalComparisons = true;
      continue;
    }
    if (arg === '--command-timeout-ms' && next) {
      options.commandTimeoutMs = boundedInt(next, 5_000, 600_000, arg);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.appealsFile) throw new Error('Provide --appeals with a JSONL file of creator-cited appeal inputs.');

  return {
    inputDir: options.inputDir ?? DEFAULT_INPUT_DIR,
    appealsFile: options.appealsFile,
    trustedStatusesFile: options.trustedStatusesFile,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    runExternalComparisons: options.runExternalComparisons ?? false,
    commandTimeoutMs: options.commandTimeoutMs ?? 180_000,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:casebook -- [options]

Options:
  --input <dir>                    Calibration directory. Default: ${DEFAULT_INPUT_DIR}
  --appeals <file>                 JSONL appeal intake file.
  --trusted-statuses <file>        Optional JSONL trusted status export for cited examples.
  --out <dir>                      Output directory. Default: ${DEFAULT_OUT_DIR}
  --run-external-comparisons       Run verified external comparison for resolved cited examples.
  --command-timeout-ms <n>         Child command timeout. Default: 180000
  --help                           Show this help.

Behavior:
  Orchestrates appeal intake, cited-status verification, and optional verified
  external comparisons into a review casebook. It reads local artifacts only
  and writes shadow evidence packets. No Airtable, D1, R2, approval, rejection,
  rating, or creator-facing feedback is written.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function resolveInputFile(filePath: string): string {
  if (path.isAbsolute(filePath) && existsSync(filePath)) return filePath;
  const candidates = [
    path.resolve(process.cwd(), filePath),
    path.resolve(PACKAGE_DIR, filePath),
    path.resolve(PACKAGE_DIR, '..', '..', filePath),
  ];
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) throw new Error(`File not found: ${filePath}`);
  return resolved;
}

async function readJsonl<T>(filePath: string | undefined): Promise<T[]> {
  if (!filePath || !existsSync(filePath)) return [];
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
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

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

function citedLookups(row: AppealInput): string[] {
  return row.cited.map((entry) => (typeof entry === 'string' ? entry : entry.lookup)).filter(Boolean);
}

function appealId(row: AppealInput, index: number): string {
  return row.appeal_id?.trim() || `appeal_${String(index + 1).padStart(3, '0')}`;
}

function normalizedDirFor(sandboxByCaseId: Map<string, SandboxResult>, caseId: string | undefined): string | undefined {
  if (!caseId) return undefined;
  const sandbox = sandboxByCaseId.get(caseId);
  return sandbox?.artifacts?.normalized_dir ?? sandbox?.normalized_summary?.out_dir ?? sandbox?.run_summary?.artifacts?.normalized_out_dir;
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

function statusForLookup(rows: StatusVerificationRow[], lookup: string, resolution: Resolution): StatusVerificationRow | undefined {
  const values = [lookup, resolution.case_id, resolution.template_name, resolution.source_url, resolution.published_url]
    .filter((value): value is string => Boolean(value))
    .map(normalizeLookup);
  return rows.find((row) => {
    const rowValues = statusRowValues(row);
    return values.some((value) => rowValues.includes(value));
  });
}

function buildStatusLookups(appeals: AppealInput[]): StatusLookupRow[] {
  const byLookup = new Map<string, StatusLookupRow>();
  for (let index = 0; index < appeals.length; index += 1) {
    const appeal = appeals[index];
    const id = appealId(appeal, index);
    for (const lookup of citedLookups(appeal)) {
      const key = normalizeLookup(lookup);
      if (!byLookup.has(key)) {
        byLookup.set(key, {
          lookup,
          claim: 'creator_cited_approved_claim',
          source: id,
        });
      }
    }
  }
  return Array.from(byLookup.values());
}

async function runLocalScript(scriptName: string, args: string[], timeout: number): Promise<void> {
  await execFileAsync(process.execPath, ['--import', 'tsx', path.join(SCRIPT_DIR, scriptName), ...args], {
    cwd: PACKAGE_DIR,
    timeout,
    maxBuffer: 1024 * 1024 * 16,
  });
}

async function runIntake(options: CliOptions, intakeDir: string): Promise<IntakeRow[]> {
  await runLocalScript(
    'run-appeal-equity-intake.ts',
    ['--input', options.inputDir, '--appeals', options.appealsFile, '--out', intakeDir],
    options.commandTimeoutMs,
  );
  return readJsonl<IntakeRow>(path.join(intakeDir, 'appeal-equity-intake-resolved.jsonl'));
}

async function runStatusVerification(
  options: CliOptions,
  lookups: StatusLookupRow[],
  lookupsFile: string,
  statusDir: string,
): Promise<{ summaryFile?: string; rows: StatusVerificationRow[] }> {
  if (lookups.length === 0) return { rows: [] };
  await writeFile(lookupsFile, `${lookups.map((row) => JSON.stringify(row)).join('\n')}\n`);
  const args = ['--input', options.inputDir, '--lookups', lookupsFile, '--out', statusDir];
  if (options.trustedStatusesFile) args.push('--trusted-statuses', options.trustedStatusesFile);
  await runLocalScript('run-appeal-equity-status-verification.ts', args, options.commandTimeoutMs);
  const summaryFile = path.join(statusDir, 'appeal-equity-status-verification-summary.json');
  const summary = await readJsonFile<StatusVerificationSummary>(summaryFile);
  return { summaryFile, rows: summary.rows ?? [] };
}

async function runExternalComparison(
  options: CliOptions,
  row: IntakeRow,
  cited: Resolution,
  normalizedDir: string,
  statusSummaryFile: string | undefined,
): Promise<ExternalComparisonSummary> {
  const comparisonDir = path.join(options.outDir, 'external-comparisons', `${slug(row.appeal_id)}-${slug(cited.template_name ?? cited.lookup)}`);
  await mkdir(comparisonDir, { recursive: true });
  const args = [
    '--input',
    options.inputDir,
    '--target',
    row.target.case_id ?? row.target.lookup,
    '--external-name',
    cited.template_name ?? cited.lookup,
    '--external-url',
    cited.published_url ?? cited.source_url ?? cited.lookup,
    '--external-normalized-dir',
    normalizedDir,
    '--external-claim',
    'creator_cited_approved_claim',
    '--out',
    comparisonDir,
  ];
  if (statusSummaryFile) args.push('--status-verification', statusSummaryFile);
  await runLocalScript('run-appeal-equity-external-comparison.ts', args, options.commandTimeoutMs);

  const jsonFile = path.join(comparisonDir, 'appeal-equity-external-comparison.json');
  const markdownFile = path.join(comparisonDir, 'appeal-equity-external-comparison.md');
  const report = await readJsonFile<ExternalComparisonReport>(jsonFile);
  return {
    json_file: jsonFile,
    markdown_file: markdownFile,
    external_status_verified: report.external_cited?.status_verified,
    comparison_finding_count: report.comparison_findings?.length ?? 0,
    consistency_question_count: report.consistency_questions?.length ?? 0,
    finding_ids: report.comparison_findings?.map((finding) => finding.id).filter((id): id is string => Boolean(id)) ?? [],
    question_ids: report.consistency_questions?.map((question) => question.id).filter((id): id is string => Boolean(id)) ?? [],
  };
}

function readinessFor(row: CasebookRow): CasebookRow['readiness'] {
  if (row.intake_status === 'ambiguous_resolution') return 'ambiguous_resolution';
  if (row.intake_status === 'needs_target_evidence_capture' || row.intake_status === 'needs_cited_evidence_capture') {
    return 'needs_evidence_capture';
  }
  if (row.cited.some((cited) => cited.blocked_reason === 'missing_cited_normalized_dir')) return 'needs_evidence_capture';
  if (row.cited.some((cited) => cited.blocked_reason === 'external_comparison_failed')) return 'comparison_failed';
  if (row.cited.some((cited) => cited.external_comparison)) return 'ready_for_human_review';
  if (row.cited.some((cited) => cited.resolution.status === 'resolved')) return 'ready_for_external_comparison';
  return 'needs_evidence_capture';
}

function nextActionsFor(row: CasebookRow): string[] {
  if (row.readiness === 'ready_for_human_review') {
    return ['Human reviewer should inspect the casebook packet; do not convert it into a creator-facing decision automatically.'];
  }
  if (row.readiness === 'ready_for_external_comparison') {
    return ['Run with --run-external-comparisons to produce verified comparison packets.'];
  }
  if (row.readiness === 'ambiguous_resolution') {
    return ['Resolve ambiguous target or cited lookup before comparison.'];
  }
  if (row.readiness === 'comparison_failed') {
    return ['Inspect comparison errors and rerun after fixing missing artifacts or malformed inputs.'];
  }
  return ['Capture or map missing target/cited evidence, then rerun the casebook.'];
}

function buildMarkdown(summary: Record<string, unknown>, rows: CasebookRow[]): string {
  const lines = [
    '# Appeal Equity Casebook',
    '',
    `Generated: ${summary.generated_at}`,
    `Input: \`${summary.input_dir}\``,
    `Appeals: \`${summary.appeals_file}\``,
    '',
    '**Status:** Shadow review packet',
    '',
    'This artifact coordinates intake, cited-status verification, and optional external comparison packets. It must not be used as an appeal decision, approval, rejection, rating, or creator-facing response.',
    '',
    '## Summary',
    '',
    `- Appeals: ${summary.appeal_count}`,
    `- Cited examples: ${summary.cited_count}`,
    `- Status verified cited examples: ${summary.status_verified_count}`,
    `- External comparisons: ${summary.external_comparison_count}`,
    `- Ready for human review: ${summary.ready_for_human_review_count}`,
    `- Needs evidence capture: ${summary.needs_evidence_capture_count}`,
    `- Ambiguous: ${summary.ambiguous_count}`,
    '',
    '## Cases',
    '',
    '| Appeal | Readiness | Target | Cited status | Comparison packets | Next action |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of rows) {
    const citedStatus = row.cited
      .map((cited) => `${cited.resolution.template_name ?? cited.lookup}: ${cited.status_verification?.verification_level ?? 'unverified'}${cited.status_verification?.status_verified ? ' verified' : ''}`)
      .join('<br>');
    const packets = row.cited
      .map((cited) => cited.external_comparison?.markdown_file)
      .filter((value): value is string => Boolean(value))
      .map((value) => `\`${value}\``)
      .join('<br>');
    lines.push(
      `| ${row.appeal_id} | ${row.readiness} | ${row.target.template_name ?? row.target.lookup} | ${citedStatus || '(none)'} | ${packets || ''} | ${row.next_actions.join(' ')} |`,
    );
  }

  lines.push(
    '',
    '## Boundary',
    '',
    '- Status verification proves status evidence only; it does not prove an appeal should be accepted.',
    '- Objective implementation issues and subjective visual-quality judgments remain separate decision surfaces.',
    '- Every ready casebook row still requires human reviewer resolution.',
  );

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const appeals = await readJsonl<AppealInput>(options.appealsFile);
  if (appeals.length === 0) throw new Error(`No appeal rows found in ${options.appealsFile}.`);

  const sandboxRows = await readJsonl<SandboxResult>(path.join(options.inputDir, 'sandbox-results.jsonl'));
  const sandboxByCaseId = new Map(sandboxRows.map((row) => [row.case_id, row]));

  const intakeDir = path.join(options.outDir, 'intake');
  const statusDir = path.join(options.outDir, 'status-verification');
  await mkdir(statusDir, { recursive: true });

  const intakeRows = await runIntake(options, intakeDir);
  const statusLookups = buildStatusLookups(appeals);
  const statusLookupsFile = path.join(options.outDir, 'appeal-equity-casebook-status-lookups.jsonl');
  const statusVerification = await runStatusVerification(options, statusLookups, statusLookupsFile, statusDir);

  const casebookRows: CasebookRow[] = [];
  for (const row of intakeRows) {
    const citedRows: CasebookCitedRow[] = [];
    for (const cited of row.cited) {
      const statusRow = statusForLookup(statusVerification.rows, cited.lookup, cited);
      const normalizedDir = normalizedDirFor(sandboxByCaseId, cited.case_id);
      const citedRow: CasebookCitedRow = {
        lookup: cited.lookup,
        resolution: cited,
        status_verification: statusRow,
        normalized_dir: normalizedDir,
      };

      if (options.runExternalComparisons && row.target.status === 'resolved' && cited.status === 'resolved') {
        if (!normalizedDir) {
          citedRow.blocked_reason = 'missing_cited_normalized_dir';
        } else {
          try {
            citedRow.external_comparison = await runExternalComparison(options, row, cited, normalizedDir, statusVerification.summaryFile);
          } catch (error) {
            citedRow.blocked_reason = 'external_comparison_failed';
            citedRow.error = error instanceof Error ? error.message : String(error);
          }
        }
      }
      citedRows.push(citedRow);
    }

    const casebookRow: CasebookRow = {
      appeal_id: row.appeal_id,
      source: row.source,
      claim_summary: row.claim_summary,
      notes: row.notes,
      intake_status: row.status,
      readiness: 'needs_evidence_capture',
      target: row.target,
      cited: citedRows,
      next_actions: [],
    };
    casebookRow.readiness = readinessFor(casebookRow);
    casebookRow.next_actions = nextActionsFor(casebookRow);
    casebookRows.push(casebookRow);
  }

  const citedRows = casebookRows.flatMap((row) => row.cited);
  const summary = {
    schema_version: 'appeal_equity_casebook.v0.1',
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    appeals_file: options.appealsFile,
    status: 'shadow',
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      no_creator_facing_feedback: true,
      human_reviewer_required: true,
    },
    options: {
      run_external_comparisons: options.runExternalComparisons,
      trusted_statuses_file: options.trustedStatusesFile,
    },
    appeal_count: casebookRows.length,
    cited_count: citedRows.length,
    target_resolved_count: casebookRows.filter((row) => row.target.status === 'resolved').length,
    cited_resolved_count: citedRows.filter((row) => row.resolution.status === 'resolved').length,
    status_verified_count: citedRows.filter((row) => row.status_verification?.status_verified === true).length,
    status_unverified_count: citedRows.filter((row) => row.status_verification && row.status_verification.status_verified !== true).length,
    external_comparison_count: citedRows.filter((row) => row.external_comparison).length,
    ready_for_human_review_count: casebookRows.filter((row) => row.readiness === 'ready_for_human_review').length,
    needs_evidence_capture_count: casebookRows.filter((row) => row.readiness === 'needs_evidence_capture').length,
    ambiguous_count: casebookRows.filter((row) => row.readiness === 'ambiguous_resolution').length,
    comparison_failed_count: casebookRows.filter((row) => row.readiness === 'comparison_failed').length,
    intake_dir: intakeDir,
    status_verification_dir: statusDir,
    status_lookups_file: statusLookupsFile,
    rows: casebookRows,
  };

  const rowsJsonl = path.join(options.outDir, 'appeal-equity-casebook-cases.jsonl');
  const summaryJson = path.join(options.outDir, 'appeal-equity-casebook-summary.json');
  const summaryMarkdown = path.join(options.outDir, 'appeal-equity-casebook-summary.md');
  await writeFile(rowsJsonl, `${casebookRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  await writeFile(summaryJson, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(summaryMarkdown, buildMarkdown(summary, casebookRows));

  console.log(
    JSON.stringify(
      {
        ok: true,
        out_dir: options.outDir,
        appeal_count: summary.appeal_count,
        cited_count: summary.cited_count,
        status_verified_count: summary.status_verified_count,
        external_comparison_count: summary.external_comparison_count,
        ready_for_human_review_count: summary.ready_for_human_review_count,
        needs_evidence_capture_count: summary.needs_evidence_capture_count,
        ambiguous_count: summary.ambiguous_count,
        comparison_failed_count: summary.comparison_failed_count,
        summary_json: summaryJson,
        summary_markdown: summaryMarkdown,
        rows_jsonl: rowsJsonl,
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
