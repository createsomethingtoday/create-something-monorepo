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
  outDir: string;
  runComparisons: boolean;
  commandTimeoutMs: number;
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

type AlignmentRow = {
  case_id: string;
  template_name: string;
  source_url: string;
  selection_stratum?: string;
  expected_review_status?: string;
  expected_quality_rating?: string;
  reviewer?: string;
  evidence_status?: string;
  finding_count?: number;
  substantive_finding_count?: number;
  finding_rule_ids?: string[];
  alignment_label?: string;
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
  comparison_out_dir?: string;
  comparison_json?: string;
  comparison_markdown?: string;
  next_actions: string[];
};

type EvidenceCaptureQueueItem = {
  appeal_id: string;
  source?: string;
  role: 'target' | 'cited';
  lookup: string;
  reason: 'unresolved_lookup' | 'ambiguous_lookup';
  priority: 'high' | 'medium';
  claim_summary?: string;
  lookup_type: 'marketplace_url' | 'web_url' | 'case_or_name';
  target_lookup: string;
  candidate_count?: number;
  candidates?: Resolution['candidates'];
  next_step: string;
};

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-appeal-equity-intake';
const STOP_WORDS = new Set([
  'template',
  'templates',
  'website',
  'webflow',
  'html',
  'cms',
  'ecommerce',
  'landing',
  'page',
  'pages',
  'site',
]);

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    runComparisons: false,
    commandTimeoutMs: 120_000,
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
      options.appealsFile = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--run-comparisons') {
      options.runComparisons = true;
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
    appealsFile: resolveInputFile(options.appealsFile),
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    runComparisons: options.runComparisons ?? false,
    commandTimeoutMs: options.commandTimeoutMs ?? 120_000,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:intake -- [options]

Options:
  --input <dir>             Calibration directory with manifest/status-alignment JSONL.
                            Default: ${DEFAULT_INPUT_DIR}
  --appeals <file>          JSONL appeal intake file.
  --out <dir>               Output directory. Default: ${DEFAULT_OUT_DIR}
  --run-comparisons         Generate comparison packets for fully resolved appeal rows.
  --command-timeout-ms <n>  Per-comparison timeout. Default: 120000
  --help                    Show this help.

Appeal JSONL shape:
  {"appeal_id":"automatia-introx","target":"Automatia","cited":["https://webflow.com/templates/html/introx-website-template"],"claim_summary":"..."}

Behavior:
  Resolves real creator-cited target/comparison lookups against existing
  calibration evidence. Resolved rows can delegate to appeal:equity:compare.
  Unresolved rows are marked for evidence capture. This is shadow intake only.
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
    path.resolve(SCRIPT_DIR, '..', filePath),
    path.resolve(SCRIPT_DIR, '..', '..', '..', filePath),
  ];
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) throw new Error(`File not found: ${filePath}`);
  return resolved;
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
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

function slugTokens(value: string | undefined): string[] {
  const normalized = normalizeLookup(value);
  const withoutQuery = normalized.split(/[?#]/)[0] ?? normalized;
  const lastSegment = withoutQuery.split('/').filter(Boolean).at(-1) ?? withoutQuery;
  return lastSegment
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function compactName(value: string | undefined): string {
  return slugTokens(value).join(' ');
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
    compactName(row.template_name),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeLookup);
}

function buildResolution(row: BlindCase, lookup: string, alignmentByCaseId: Map<string, AlignmentRow>): Resolution {
  const alignment = alignmentByCaseId.get(row.case_id);
  return {
    lookup,
    status: 'resolved',
    case_id: row.case_id,
    template_name: row.template_name,
    source_url: row.source_url,
    published_url: row.published_url,
    marketplace_status: row.marketplace_status,
    selection_stratum: alignment?.selection_stratum,
    expected_review_status: alignment?.expected_review_status,
    expected_quality_rating: alignment?.expected_quality_rating,
    reviewer: alignment?.reviewer,
    evidence_status: alignment?.evidence_status,
    finding_count: alignment?.finding_count,
    substantive_finding_count: alignment?.substantive_finding_count,
    finding_rule_ids: alignment?.finding_rule_ids,
    alignment_label: alignment?.alignment_label,
  };
}

function resolveLookup(rows: BlindCase[], lookup: string, alignmentByCaseId: Map<string, AlignmentRow>): Resolution {
  const normalizedLookup = normalizeLookup(lookup);
  const exact = rows.filter((row) => caseLookupValues(row).includes(normalizedLookup));
  if (exact.length === 1) return buildResolution(exact[0], lookup, alignmentByCaseId);
  if (exact.length > 1) return ambiguousResolution(lookup, exact);

  const lookupName = compactName(lookup);
  const lookupTokens = new Set(slugTokens(lookup));
  const tokenMatches = rows.filter((row) => {
    const rowName = compactName(row.template_name);
    if (!rowName) return false;
    if (lookupName === rowName) return true;
    if (lookupName.includes(rowName) && rowName.length >= 4) return true;
    const rowTokens = slugTokens(row.template_name);
    return rowTokens.length > 0 && rowTokens.every((token) => lookupTokens.has(token));
  });
  if (tokenMatches.length === 1) return buildResolution(tokenMatches[0], lookup, alignmentByCaseId);
  if (tokenMatches.length > 1) return ambiguousResolution(lookup, tokenMatches);

  const partial = rows.filter((row) => normalizeLookup(row.template_name).includes(normalizedLookup));
  if (partial.length === 1) return buildResolution(partial[0], lookup, alignmentByCaseId);
  if (partial.length > 1) return ambiguousResolution(lookup, partial);

  return {
    lookup,
    status: 'unresolved',
  };
}

function ambiguousResolution(lookup: string, rows: BlindCase[]): Resolution {
  return {
    lookup,
    status: 'ambiguous',
    candidates: rows.slice(0, 10).map((row) => ({
      case_id: row.case_id,
      template_name: row.template_name,
      source_url: row.source_url,
    })),
  };
}

function appealId(row: AppealInput, index: number): string {
  return row.appeal_id?.trim() || `appeal_${String(index + 1).padStart(3, '0')}`;
}

function citedLookups(row: AppealInput): string[] {
  return row.cited.map((entry) => (typeof entry === 'string' ? entry : entry.lookup)).filter(Boolean);
}

function statusFor(target: Resolution, cited: Resolution[], comparisonGenerated: boolean): IntakeRow['status'] {
  if (comparisonGenerated) return 'comparison_generated';
  if (target.status === 'ambiguous' || cited.some((row) => row.status === 'ambiguous')) return 'ambiguous_resolution';
  if (target.status !== 'resolved') return 'needs_target_evidence_capture';
  if (!cited.some((row) => row.status === 'resolved')) return 'needs_cited_evidence_capture';
  return 'ready_for_comparison';
}

function nextActions(status: IntakeRow['status'], row: IntakeRow): string[] {
  if (status === 'comparison_generated') {
    return ['Review the generated comparison packet with a human reviewer before any creator-facing response.'];
  }
  if (status === 'ready_for_comparison') {
    return ['Run appeal:equity:compare for the resolved target and cited examples.'];
  }
  if (status === 'ambiguous_resolution') {
    return ['Resolve ambiguous target or cited lookup to an exact Asset Version or calibration case id.'];
  }
  if (status === 'needs_target_evidence_capture') {
    return ['Capture published-site evidence for the appealed target, then rerun intake.'];
  }
  if (status === 'needs_cited_evidence_capture') {
    const unresolved = row.cited.filter((cited) => cited.status !== 'resolved').map((cited) => cited.lookup);
    return [`Capture or map creator-cited comparison evidence: ${unresolved.join(', ') || '(missing cited lookups)'}.`];
  }
  return ['Review intake row manually.'];
}

function lookupType(lookup: string): EvidenceCaptureQueueItem['lookup_type'] {
  const normalized = normalizeLookup(lookup);
  if (normalized.startsWith('webflow.com/templates/')) return 'marketplace_url';
  if (normalized.includes('.') || normalized.includes('/')) return 'web_url';
  return 'case_or_name';
}

function queueItemFor(
  row: IntakeRow,
  role: EvidenceCaptureQueueItem['role'],
  resolution: Resolution,
): EvidenceCaptureQueueItem | undefined {
  if (resolution.status === 'resolved') return undefined;
  const reason = resolution.status === 'ambiguous' ? 'ambiguous_lookup' : 'unresolved_lookup';
  const type = lookupType(resolution.lookup);
  const nextStep =
    reason === 'ambiguous_lookup'
      ? 'Resolve the lookup to an exact Asset Version, calibration case id, or published URL before comparison.'
      : type === 'marketplace_url'
        ? 'Map the marketplace template URL to its published Webflow URL or Asset Version, then capture published-site evidence if missing.'
        : type === 'web_url'
          ? 'Capture published-site sandbox evidence for this URL, then rerun appeal intake.'
          : 'Map the name or id to an Asset Version or published URL, then rerun appeal intake.';

  return {
    appeal_id: row.appeal_id,
    source: row.source,
    role,
    lookup: resolution.lookup,
    reason,
    priority: role === 'target' ? 'high' : 'medium',
    claim_summary: row.claim_summary,
    lookup_type: type,
    target_lookup: row.target.lookup,
    candidate_count: resolution.candidates?.length,
    candidates: resolution.candidates,
    next_step: nextStep,
  };
}

function evidenceCaptureQueue(rows: IntakeRow[]): EvidenceCaptureQueueItem[] {
  const queue: EvidenceCaptureQueueItem[] = [];
  for (const row of rows) {
    const targetItem = queueItemFor(row, 'target', row.target);
    if (targetItem) queue.push(targetItem);
    for (const cited of row.cited) {
      const citedItem = queueItemFor(row, 'cited', cited);
      if (citedItem) queue.push(citedItem);
    }
  }
  return queue;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function runComparison(row: IntakeRow, options: CliOptions): Promise<Partial<IntakeRow>> {
  if (row.target.status !== 'resolved' || !row.target.case_id) return {};
  const citedCaseIds = row.cited
    .filter((resolution) => resolution.status === 'resolved' && resolution.case_id)
    .map((resolution) => resolution.case_id as string);
  if (citedCaseIds.length === 0) return {};

  const comparisonScript = path.join(SCRIPT_DIR, 'run-appeal-equity-comparison.ts');
  const outDir = path.join(options.outDir, `${slug(row.appeal_id)}-comparison`);
  await mkdir(outDir, { recursive: true });
  await execFileAsync(
    process.execPath,
    [
      '--import',
      'tsx',
      comparisonScript,
      '--input',
      options.inputDir,
      '--target',
      row.target.case_id,
      '--cited',
      citedCaseIds.join(','),
      '--out',
      outDir,
    ],
    {
      cwd: path.resolve(SCRIPT_DIR, '..'),
      timeout: options.commandTimeoutMs,
      maxBuffer: 1024 * 1024 * 8,
    },
  );
  return {
    comparison_out_dir: outDir,
    comparison_json: path.join(outDir, 'appeal-equity-comparison.json'),
    comparison_markdown: path.join(outDir, 'appeal-equity-comparison.md'),
  };
}

function buildMarkdown(summary: Record<string, unknown>, rows: IntakeRow[]): string {
  const lines = [
    '# Appeal Equity Intake',
    '',
    `Generated: ${summary.generated_at}`,
    `Input: \`${summary.input_dir}\``,
    `Appeals: \`${summary.appeals_file}\``,
    '',
    '**Status:** Shadow intake only',
    '',
    'This artifact resolves creator-cited appeal examples into evidence work items. It must not be used as an appeal decision, approval, rejection, rating, or creator-facing response.',
    '',
    '## Summary',
    '',
    `- Appeals: ${summary.appeal_count}`,
    `- Fully resolved appeals: ${summary.ready_or_generated_count}`,
    `- Comparisons generated: ${summary.comparison_generated_count}`,
    `- Needs target evidence: ${summary.needs_target_evidence_count}`,
    `- Needs cited evidence: ${summary.needs_cited_evidence_count}`,
    `- Ambiguous rows: ${summary.ambiguous_count}`,
    `- Evidence capture queue items: ${summary.evidence_capture_queue_count}`,
    '',
    '## Rows',
    '',
    '| Appeal | Status | Target | Cited | Comparison | Next action |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of rows) {
    const target = resolutionLabel(row.target);
    const cited = row.cited.map(resolutionLabel).join('<br>');
    const comparison = row.comparison_markdown ? `\`${row.comparison_markdown}\`` : '';
    lines.push(
      `| ${row.appeal_id} | ${row.status} | ${target} | ${cited} | ${comparison} | ${row.next_actions.join(' ')} |`,
    );
  }

  lines.push(
    '',
    '## Intake Contract',
    '',
    '- Prefer exact Asset Version, case id, or published URL when available.',
    '- Marketplace URLs are allowed, but unresolved or ambiguous rows must be mapped before review.',
    '- Run comparison packets only after target and cited examples resolve to captured evidence.',
    '- Use `appeal-equity-evidence-capture-queue.jsonl` to drive missing evidence capture or exact case mapping.',
  );

  return `${lines.join('\n')}\n`;
}

function resolutionLabel(resolution: Resolution): string {
  if (resolution.status === 'resolved') {
    return `${resolution.template_name} (${resolution.case_id})`;
  }
  if (resolution.status === 'ambiguous') {
    return `${resolution.lookup} (ambiguous: ${resolution.candidates?.map((candidate) => candidate.template_name).join(', ') ?? 'candidates'})`;
  }
  return `${resolution.lookup} (unresolved)`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const manifest = await readJsonl<BlindCase>(path.join(options.inputDir, 'manifest.blind.jsonl'));
  const alignmentRows = await readJsonl<AlignmentRow>(path.join(options.inputDir, 'status-alignment.jsonl'));
  const appealInputs = await readJsonl<AppealInput>(options.appealsFile);
  if (manifest.length === 0) throw new Error(`No manifest rows found in ${options.inputDir}.`);
  if (appealInputs.length === 0) throw new Error(`No appeal rows found in ${options.appealsFile}.`);

  const alignmentByCaseId = new Map(alignmentRows.map((row) => [row.case_id, row]));
  const rows: IntakeRow[] = [];

  for (let index = 0; index < appealInputs.length; index += 1) {
    const input = appealInputs[index];
    const baseRow: IntakeRow = {
      appeal_id: appealId(input, index),
      source: input.source,
      claim_summary: input.claim_summary,
      notes: input.notes,
      target: resolveLookup(manifest, input.target, alignmentByCaseId),
      cited: citedLookups(input).map((lookup) => resolveLookup(manifest, lookup, alignmentByCaseId)),
      status: 'ready_for_comparison',
      next_actions: [],
    };
    const canRun =
      options.runComparisons &&
      baseRow.target.status === 'resolved' &&
      baseRow.cited.some((resolution) => resolution.status === 'resolved');
    const comparisonFields = canRun ? await runComparison(baseRow, options) : {};
    const status = statusFor(baseRow.target, baseRow.cited, Boolean(comparisonFields.comparison_json));
    rows.push({
      ...baseRow,
      ...comparisonFields,
      status,
      next_actions: nextActions(status, { ...baseRow, ...comparisonFields, status, next_actions: [] }),
    });
  }

  const summary = {
    schema_version: 'appeal_equity_intake.v0.1',
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
    appeal_count: rows.length,
    ready_or_generated_count: rows.filter((row) => row.status === 'ready_for_comparison' || row.status === 'comparison_generated').length,
    comparison_generated_count: rows.filter((row) => row.status === 'comparison_generated').length,
    needs_target_evidence_count: rows.filter((row) => row.status === 'needs_target_evidence_capture').length,
    needs_cited_evidence_count: rows.filter((row) => row.status === 'needs_cited_evidence_capture').length,
    ambiguous_count: rows.filter((row) => row.status === 'ambiguous_resolution').length,
    evidence_capture_queue_count: evidenceCaptureQueue(rows).length,
    rows,
  };

  const queue = evidenceCaptureQueue(rows);
  const resolvedJsonl = path.join(options.outDir, 'appeal-equity-intake-resolved.jsonl');
  const captureQueueJsonl = path.join(options.outDir, 'appeal-equity-evidence-capture-queue.jsonl');
  const summaryJson = path.join(options.outDir, 'appeal-equity-intake-summary.json');
  const summaryMarkdown = path.join(options.outDir, 'appeal-equity-intake-summary.md');
  await writeFile(resolvedJsonl, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  await writeFile(captureQueueJsonl, queue.length > 0 ? `${queue.map((row) => JSON.stringify(row)).join('\n')}\n` : '');
  await writeFile(summaryJson, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(summaryMarkdown, buildMarkdown(summary, rows));

  console.log(
    JSON.stringify(
      {
        ok: true,
        out_dir: options.outDir,
        appeal_count: rows.length,
        ready_or_generated_count: summary.ready_or_generated_count,
        comparison_generated_count: summary.comparison_generated_count,
        needs_target_evidence_count: summary.needs_target_evidence_count,
        needs_cited_evidence_count: summary.needs_cited_evidence_count,
        ambiguous_count: summary.ambiguous_count,
        evidence_capture_queue_count: summary.evidence_capture_queue_count,
        summary_json: summaryJson,
        summary_markdown: summaryMarkdown,
        resolved_jsonl: resolvedJsonl,
        capture_queue_jsonl: captureQueueJsonl,
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
