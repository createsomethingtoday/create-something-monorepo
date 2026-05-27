import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import process from 'node:process';

type CliOptions = {
  queueFile: string;
  mappingsFile?: string;
  outDir: string;
  limit: number;
  prepareBundles: boolean;
  runE2b: boolean;
  bootstrapBrowser: boolean;
  commandTimeoutMs: number;
  maxPages: number;
  viewports: string;
};

type QueueItem = {
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
  candidates?: Array<{
    case_id: string;
    template_name: string;
    source_url: string;
  }>;
  next_step: string;
};

type MappingRow = {
  lookup: string;
  published_url?: string;
  source_url?: string;
  asset_id?: string;
  version_id?: string;
  note?: string;
};

type CapturePlanRow = {
  capture_id: string;
  appeal_id: string;
  role: QueueItem['role'];
  lookup: string;
  lookup_type: QueueItem['lookup_type'];
  reason: QueueItem['reason'];
  priority: QueueItem['priority'];
  status:
    | 'needs_marketplace_mapping'
    | 'needs_case_mapping'
    | 'ambiguous_manual_resolution'
    | 'ready_for_sandbox_prepare'
    | 'bundle_prepared'
    | 'e2b_capture_completed'
    | 'capture_failed';
  capture_url?: string;
  mapping?: MappingRow;
  bundle_dir?: string;
  e2b_out_dir?: string;
  normalized_dir?: string;
  prepare_command?: string;
  e2b_command?: string;
  next_step: string;
  error?: string;
};

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-appeal-equity-capture-queue';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: DEFAULT_OUT_DIR,
    limit: 25,
    prepareBundles: false,
    runE2b: false,
    bootstrapBrowser: false,
    commandTimeoutMs: 180_000,
    maxPages: 1,
    viewports: 'desktop:1365x900,mobile:390x844',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--queue' && next) {
      options.queueFile = next;
      index += 1;
      continue;
    }
    if (arg === '--mappings' && next) {
      options.mappingsFile = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--limit' && next) {
      options.limit = boundedInt(next, 1, 100, arg);
      index += 1;
      continue;
    }
    if (arg === '--prepare-bundles') {
      options.prepareBundles = true;
      continue;
    }
    if (arg === '--run-e2b') {
      options.runE2b = true;
      options.prepareBundles = true;
      continue;
    }
    if (arg === '--bootstrap-browser') {
      options.bootstrapBrowser = true;
      continue;
    }
    if (arg === '--command-timeout-ms' && next) {
      options.commandTimeoutMs = boundedInt(next, 5_000, 900_000, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-pages' && next) {
      options.maxPages = boundedInt(next, 1, 5, arg);
      index += 1;
      continue;
    }
    if (arg === '--viewports' && next) {
      options.viewports = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.queueFile) throw new Error('Provide --queue with appeal-equity-evidence-capture-queue.jsonl.');

  return {
    queueFile: resolveInputFile(options.queueFile),
    mappingsFile: options.mappingsFile ? resolveInputFile(options.mappingsFile) : undefined,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    limit: options.limit ?? 25,
    prepareBundles: options.prepareBundles ?? false,
    runE2b: options.runE2b ?? false,
    bootstrapBrowser: options.bootstrapBrowser ?? false,
    commandTimeoutMs: options.commandTimeoutMs ?? 180_000,
    maxPages: options.maxPages ?? 1,
    viewports: options.viewports ?? 'desktop:1365x900,mobile:390x844',
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:capture-queue -- [options]

Options:
  --queue <file>              appeal-equity-evidence-capture-queue.jsonl from intake.
  --mappings <file>           Optional JSONL mappings: {"lookup":"...","published_url":"https://..."}.
  --out <dir>                 Output directory. Default: ${DEFAULT_OUT_DIR}
  --limit <n>                 Max queue rows to process. Default: 25
  --prepare-bundles           Prepare published-site sandbox bundles for ready URLs.
  --run-e2b                   Run direct E2B capture after preparing bundles. Requires E2B credentials.
  --bootstrap-browser         Pass through to published-site:sandbox:e2b-run.
  --max-pages <n>             Max pages for prepared bundle. Default: 1
  --viewports <items>         Viewports for prepared bundle. Default: desktop:1365x900,mobile:390x844
  --command-timeout-ms <n>    Child command timeout. Default: 180000
  --help                      Show this help.

Behavior:
  Converts unresolved appeal/equity intake rows into a bounded capture plan.
  Marketplace URLs and case/name lookups require mapping before capture.
  Direct public URLs or mapped published URLs can be prepared for sandbox
  evidence capture. No Airtable, D1, R2, approval, rejection, rating, or
  creator-facing feedback is written.
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

async function readJsonl<T>(filePath: string | undefined): Promise<T[]> {
  if (!filePath || !existsSync(filePath)) return [];
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function normalizeLookup(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

function buildMappingIndex(rows: MappingRow[]): Map<string, MappingRow> {
  const index = new Map<string, MappingRow>();
  for (const row of rows) {
    index.set(normalizeLookup(row.lookup), row);
  }
  return index;
}

function isDirectPublicUrl(item: QueueItem): boolean {
  if (item.lookup_type !== 'web_url') return false;
  try {
    const url = new URL(item.lookup);
    return url.protocol === 'https:' && !url.hostname.endsWith('webflow.com');
  } catch {
    return false;
  }
}

function captureUrlFor(item: QueueItem, mapping: MappingRow | undefined): string | undefined {
  const mappedUrl = mapping?.published_url ?? mapping?.source_url;
  if (mappedUrl) return mappedUrl;
  if (isDirectPublicUrl(item)) return item.lookup;
  return undefined;
}

function captureId(item: QueueItem, index: number): string {
  return `${String(index + 1).padStart(2, '0')}-${slug(item.appeal_id)}-${item.role}`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function initialPlanRow(item: QueueItem, index: number, mapping: MappingRow | undefined, captureUrl: string | undefined): CapturePlanRow {
  const id = captureId(item, index);
  if (item.reason === 'ambiguous_lookup') {
    return {
      capture_id: id,
      appeal_id: item.appeal_id,
      role: item.role,
      lookup: item.lookup,
      lookup_type: item.lookup_type,
      reason: item.reason,
      priority: item.priority,
      status: 'ambiguous_manual_resolution',
      mapping,
      next_step: 'Resolve the ambiguous lookup to an exact case, Asset Version, or published URL before evidence capture.',
    };
  }

  if (!captureUrl) {
    const status = item.lookup_type === 'marketplace_url' ? 'needs_marketplace_mapping' : 'needs_case_mapping';
    const nextStep =
      status === 'needs_marketplace_mapping'
        ? 'Map the marketplace template URL to a published Webflow URL or Asset Version, then rerun capture queue.'
        : 'Map this lookup to a published Webflow URL or Asset Version, then rerun capture queue.';
    return {
      capture_id: id,
      appeal_id: item.appeal_id,
      role: item.role,
      lookup: item.lookup,
      lookup_type: item.lookup_type,
      reason: item.reason,
      priority: item.priority,
      status,
      mapping,
      next_step: nextStep,
    };
  }

  return {
    capture_id: id,
    appeal_id: item.appeal_id,
    role: item.role,
    lookup: item.lookup,
    lookup_type: item.lookup_type,
    reason: item.reason,
    priority: item.priority,
    status: 'ready_for_sandbox_prepare',
    capture_url: captureUrl,
    mapping,
    next_step: 'Prepare and optionally run published-site sandbox evidence capture.',
  };
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function prepareCommand(row: CapturePlanRow, options: CliOptions): string | undefined {
  if (!row.capture_url) return undefined;
  const bundleDir = path.join(options.outDir, row.capture_id, 'bundle');
  return [
    'pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:prepare --',
    `--url ${shellQuote(row.capture_url)}`,
    `--out ${shellQuote(bundleDir)}`,
    `--run-id ${shellQuote(row.capture_id)}`,
    '--sandbox-provider direct_e2b',
    `--max-pages ${options.maxPages}`,
    `--viewports ${shellQuote(options.viewports)}`,
    '--policy-snapshot-id template-review-policy.appeal-equity-capture',
  ].join(' ');
}

function e2bCommand(row: CapturePlanRow, options: CliOptions): string | undefined {
  if (!row.bundle_dir) return undefined;
  const e2bOutDir = path.join(options.outDir, row.capture_id, 'e2b');
  return [
    'infisical run --env=prod --path=/ --include-imports=true --',
    'pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-run --',
    `--bundle-dir ${shellQuote(row.bundle_dir)}`,
    `--out ${shellQuote(e2bOutDir)}`,
    '--normalize',
    options.bootstrapBrowser ? '--bootstrap-browser' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

async function prepareBundle(row: CapturePlanRow, options: CliOptions): Promise<CapturePlanRow> {
  if (!row.capture_url) return row;
  const bundleDir = path.join(options.outDir, row.capture_id, 'bundle');
  const prepareScript = path.join(SCRIPT_DIR, 'prepare-published-site-sandbox-run.ts');
  await mkdir(path.dirname(bundleDir), { recursive: true });
  await execFileAsync(
    process.execPath,
    [
      '--import',
      'tsx',
      prepareScript,
      '--url',
      row.capture_url,
      '--out',
      bundleDir,
      '--run-id',
      row.capture_id,
      '--sandbox-provider',
      'direct_e2b',
      '--max-pages',
      String(options.maxPages),
      '--viewports',
      options.viewports,
      '--policy-snapshot-id',
      'template-review-policy.appeal-equity-capture',
    ],
    {
      cwd: path.resolve(SCRIPT_DIR, '..'),
      timeout: options.commandTimeoutMs,
      maxBuffer: 1024 * 1024 * 4,
    },
  );
  return {
    ...row,
    status: 'bundle_prepared',
    bundle_dir: bundleDir,
    prepare_command: prepareCommand(row, options),
    next_step: 'Run published-site:sandbox:e2b-run against the prepared bundle, then normalize and re-enter appeal intake/comparison.',
  };
}

async function runE2b(row: CapturePlanRow, options: CliOptions): Promise<CapturePlanRow> {
  if (!row.bundle_dir) return row;
  const e2bOutDir = path.join(options.outDir, row.capture_id, 'e2b');
  const e2bScript = path.join(SCRIPT_DIR, 'run-published-site-e2b-sandbox.ts');
  const args = [
    '--import',
    'tsx',
    e2bScript,
    '--bundle-dir',
    row.bundle_dir,
    '--out',
    e2bOutDir,
    '--normalize',
  ];
  if (options.bootstrapBrowser) args.push('--bootstrap-browser');
  await execFileAsync(process.execPath, args, {
    cwd: path.resolve(SCRIPT_DIR, '..'),
    timeout: options.commandTimeoutMs,
    maxBuffer: 1024 * 1024 * 8,
  });
  return {
    ...row,
    status: 'e2b_capture_completed',
    e2b_out_dir: e2bOutDir,
    normalized_dir: path.join(e2bOutDir, 'normalized'),
    e2b_command: e2bCommand(row, options),
    next_step: 'Inspect normalized findings, then append captured evidence to a calibration/intake run before comparison.',
  };
}

async function materializePlanRow(row: CapturePlanRow, options: CliOptions): Promise<CapturePlanRow> {
  if (!row.capture_url) return row;
  const withCommands = {
    ...row,
    prepare_command: prepareCommand(row, options),
  };
  if (!options.prepareBundles) return withCommands;

  try {
    const prepared = await prepareBundle(withCommands, options);
    return options.runE2b ? await runE2b(prepared, options) : { ...prepared, e2b_command: e2bCommand(prepared, options) };
  } catch (error) {
    return {
      ...withCommands,
      status: 'capture_failed',
      error: error instanceof Error ? error.message : String(error),
      next_step: 'Inspect capture failure and rerun after fixing mapping, URL accessibility, or sandbox configuration.',
    };
  }
}

function buildMarkdown(summary: Record<string, unknown>, rows: CapturePlanRow[]): string {
  const lines = [
    '# Appeal Equity Evidence Capture Queue',
    '',
    `Generated: ${summary.generated_at}`,
    `Queue: \`${summary.queue_file}\``,
    '',
    '**Status:** Shadow evidence workflow',
    '',
    'This artifact plans or prepares missing evidence capture for creator-cited appeal comparisons. It does not decide appeals or write creator-facing feedback.',
    '',
    '## Summary',
    '',
    `- Queue rows: ${summary.queue_count}`,
    `- Processed rows: ${summary.processed_count}`,
    `- Ready for prepare: ${summary.ready_for_prepare_count}`,
    `- Bundles prepared: ${summary.bundle_prepared_count}`,
    `- E2B captures completed: ${summary.e2b_capture_completed_count}`,
    `- Needs mapping: ${summary.needs_mapping_count}`,
    `- Ambiguous: ${summary.ambiguous_count}`,
    `- Failed: ${summary.failed_count}`,
    '',
    '## Rows',
    '',
    '| Capture | Appeal | Role | Lookup | Status | Capture URL | Next step |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.capture_id} | ${row.appeal_id} | ${row.role} | ${row.lookup} | ${row.status} | ${row.capture_url ?? ''} | ${row.next_step} |`,
    );
  }

  lines.push(
    '',
    '## Contract',
    '',
    '- Marketplace template URLs require mapping to a published Webflow URL or Asset Version before sandbox capture.',
    '- Direct public Webflow URLs can be prepared for capture.',
    '- E2B execution is opt-in via `--run-e2b`; plan and bundle preparation stay local.',
  );

  return `${lines.join('\n')}\n`;
}

function count(rows: CapturePlanRow[], status: CapturePlanRow['status']): number {
  return rows.filter((row) => row.status === status).length;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const queue = await readJsonl<QueueItem>(options.queueFile);
  const mappings = await readJsonl<MappingRow>(options.mappingsFile);
  const mappingIndex = buildMappingIndex(mappings);
  const selected = queue.slice(0, options.limit);
  const rows: CapturePlanRow[] = [];

  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    const mapping = mappingIndex.get(normalizeLookup(item.lookup));
    const captureUrl = captureUrlFor(item, mapping);
    const baseRow = initialPlanRow(item, index, mapping, captureUrl);
    rows.push(await materializePlanRow(baseRow, options));
  }

  const summary = {
    schema_version: 'appeal_equity_capture_queue.v0.1',
    generated_at: new Date().toISOString(),
    queue_file: options.queueFile,
    mappings_file: options.mappingsFile,
    status: 'shadow',
    safety: {
      not_final_decision: true,
      no_airtable_writes: true,
      no_d1_writes: true,
      no_r2_writes: true,
      no_creator_facing_feedback: true,
    },
    options: {
      limit: options.limit,
      prepare_bundles: options.prepareBundles,
      run_e2b: options.runE2b,
      max_pages: options.maxPages,
      viewports: options.viewports,
    },
    queue_count: queue.length,
    processed_count: rows.length,
    ready_for_prepare_count: count(rows, 'ready_for_sandbox_prepare'),
    bundle_prepared_count: count(rows, 'bundle_prepared'),
    e2b_capture_completed_count: count(rows, 'e2b_capture_completed'),
    needs_mapping_count: count(rows, 'needs_marketplace_mapping') + count(rows, 'needs_case_mapping'),
    ambiguous_count: count(rows, 'ambiguous_manual_resolution'),
    failed_count: count(rows, 'capture_failed'),
    rows,
  };

  const planJsonl = path.join(options.outDir, 'appeal-equity-capture-plan.jsonl');
  const summaryJson = path.join(options.outDir, 'appeal-equity-capture-summary.json');
  const summaryMarkdown = path.join(options.outDir, 'appeal-equity-capture-summary.md');
  await writeFile(planJsonl, rows.length > 0 ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : '');
  await writeFile(summaryJson, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(summaryMarkdown, buildMarkdown(summary, rows));

  console.log(
    JSON.stringify(
      {
        ok: true,
        out_dir: options.outDir,
        queue_count: queue.length,
        processed_count: rows.length,
        ready_for_prepare_count: summary.ready_for_prepare_count,
        bundle_prepared_count: summary.bundle_prepared_count,
        e2b_capture_completed_count: summary.e2b_capture_completed_count,
        needs_mapping_count: summary.needs_mapping_count,
        ambiguous_count: summary.ambiguous_count,
        failed_count: summary.failed_count,
        plan_jsonl: planJsonl,
        summary_json: summaryJson,
        summary_markdown: summaryMarkdown,
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
