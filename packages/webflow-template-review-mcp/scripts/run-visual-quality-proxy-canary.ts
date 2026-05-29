import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type CliOptions = {
  inputDir: string;
  outDir: string;
  approvedGoodLimit: number;
  approvedExceptionalLimit: number;
  rejectedVisualLimit: number;
  appGuidelineControlLimit: number;
  maxStylesheets: number;
  timeoutMs: number;
};

type GoldenCaseProposal = {
  id: string;
  asset_id?: string;
  version_id: string;
  template_name?: string;
  published_url?: string;
  golden_set_version: string;
  case_label: string;
  normalized_buckets: string[];
  reviewer_confirmed: boolean;
  reviewer?: string;
  evidence: Record<string, unknown>;
  status: string;
};

type ProxyArtifact = {
  source_url: string;
  extraction_version?: string;
  review_posture?: string;
  page?: {
    css_variable_count?: number;
    baseline_tag_coverage?: number;
    h1_count?: number;
    skipped_heading_count?: number;
    image_count?: number;
    missing_alt_count?: number;
    section_count?: number;
    repeated_section_ratio?: number;
  };
  proxy_signals?: Array<{ id: string; supports?: string[] }>;
  findings?: Array<{ rule_id: string; severity?: string; confidence?: number; sub_buckets?: string[] }>;
};

type CanaryCaseResult = {
  case_id: string;
  case_label: string;
  template_name?: string;
  published_url: string;
  status: 'completed' | 'failed' | 'skipped';
  proxy_risk_band: 'no_signal' | 'low_proxy_load' | 'medium_proxy_load' | 'high_proxy_load' | 'unavailable';
  signal_count: number;
  finding_count: number;
  major_finding_count: number;
  finding_buckets: string[];
  output_file?: string;
  error?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: '/tmp/webflow-template-review-visual-proxy-canary',
    approvedGoodLimit: 10,
    approvedExceptionalLimit: 5,
    rejectedVisualLimit: 10,
    appGuidelineControlLimit: 5,
    maxStylesheets: 6,
    timeoutMs: 60_000,
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
    if (arg === '--approved-good-limit' && next) {
      options.approvedGoodLimit = Math.max(0, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--approved-exceptional-limit' && next) {
      options.approvedExceptionalLimit = Math.max(0, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--rejected-visual-limit' && next) {
      options.rejectedVisualLimit = Math.max(0, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--app-guideline-control-limit' && next) {
      options.appGuidelineControlLimit = Math.max(0, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--max-stylesheets' && next) {
      options.maxStylesheets = Math.max(0, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = Math.max(10_000, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.inputDir) throw new Error('Missing required --input <visual-quality-calibration-dir>');
  return {
    inputDir: options.inputDir,
    outDir: options.outDir ?? '/tmp/webflow-template-review-visual-proxy-canary',
    approvedGoodLimit: options.approvedGoodLimit ?? 10,
    approvedExceptionalLimit: options.approvedExceptionalLimit ?? 5,
    rejectedVisualLimit: options.rejectedVisualLimit ?? 10,
    appGuidelineControlLimit: options.appGuidelineControlLimit ?? 5,
    maxStylesheets: options.maxStylesheets ?? 6,
    timeoutMs: options.timeoutMs ?? 60_000,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp visual-quality:proxy-canary -- [options]

Options:
  --input <dir>                         Visual-quality calibration output directory. Required.
  --out <dir>                           Output directory. Default: /tmp/webflow-template-review-visual-proxy-canary
  --approved-good-limit <n>             Approved Good controls. Default: 10
  --approved-exceptional-limit <n>      Approved Exceptional controls. Default: 5
  --rejected-visual-limit <n>           Rejected visual-quality cases. Default: 10
  --app-guideline-control-limit <n>     App/guideline controls. Default: 5
  --max-stylesheets <n>                 Max stylesheets per URL. Default: 6
  --timeout-ms <n>                      Per-URL extraction timeout. Default: 60000
  --help                                Show this help.

Behavior:
  Runs the evidence-only visual proxy extractor across a small golden-set canary.
  Does not write to Airtable, D1, or review recommendations.
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

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'case';
}

function selectCases(cases: GoldenCaseProposal[], options: CliOptions): GoldenCaseProposal[] {
  const withUrls = cases.filter((item) => item.published_url?.startsWith('https://'));
  const take = (label: string, limit: number) => withUrls.filter((item) => item.case_label === label).slice(0, limit);
  return [
    ...take('approved_good', options.approvedGoodLimit),
    ...take('approved_exceptional', options.approvedExceptionalLimit),
    ...take('rejected_visual_quality', options.rejectedVisualLimit),
    ...take('rejected_app_or_guideline_control', options.appGuidelineControlLimit),
  ];
}

function riskBand(artifact: ProxyArtifact): CanaryCaseResult['proxy_risk_band'] {
  const signalCount = artifact.proxy_signals?.length ?? 0;
  const findings = artifact.findings ?? [];
  const majorCount = findings.filter((item) => item.severity === 'major').length;
  if (signalCount === 0 && findings.length === 0) return 'no_signal';
  if (majorCount >= 2 || signalCount >= 5) return 'high_proxy_load';
  if (majorCount >= 1 || signalCount >= 3) return 'medium_proxy_load';
  return 'low_proxy_load';
}

function increment(record: Record<string, number>, key: string | undefined) {
  record[key || '(missing)'] = (record[key || '(missing)'] ?? 0) + 1;
}

async function runExtractor(goldenCase: GoldenCaseProposal, options: CliOptions): Promise<CanaryCaseResult> {
  if (!goldenCase.published_url) {
    return {
      case_id: goldenCase.id,
      case_label: goldenCase.case_label,
      template_name: goldenCase.template_name,
      published_url: '',
      status: 'skipped',
      proxy_risk_band: 'unavailable',
      signal_count: 0,
      finding_count: 0,
      major_finding_count: 0,
      finding_buckets: [],
      error: 'missing_published_url',
    };
  }

  const caseOutDir = path.join(options.outDir, 'cases', `${slug(goldenCase.case_label)}-${slug(goldenCase.template_name ?? goldenCase.version_id)}`);
  await mkdir(caseOutDir, { recursive: true });

  try {
    await execFileAsync(
      process.execPath,
      [
        '--import',
        'tsx',
        path.join('scripts', 'extract-visual-quality-proxies.ts'),
        '--url',
        goldenCase.published_url,
        '--out',
        caseOutDir,
        '--max-stylesheets',
        String(options.maxStylesheets),
      ],
      {
        cwd: process.cwd(),
        timeout: options.timeoutMs,
        maxBuffer: 1024 * 1024,
      },
    );

    const outputFile = path.join(caseOutDir, 'visual-proxy-features.json');
    const artifact = JSON.parse(await readFile(outputFile, 'utf8')) as ProxyArtifact;
    const findings = artifact.findings ?? [];
    return {
      case_id: goldenCase.id,
      case_label: goldenCase.case_label,
      template_name: goldenCase.template_name,
      published_url: goldenCase.published_url,
      status: 'completed',
      proxy_risk_band: riskBand(artifact),
      signal_count: artifact.proxy_signals?.length ?? 0,
      finding_count: findings.length,
      major_finding_count: findings.filter((item) => item.severity === 'major').length,
      finding_buckets: [...new Set(findings.flatMap((item) => item.sub_buckets ?? []))].sort(),
      output_file: outputFile,
    };
  } catch (error) {
    return {
      case_id: goldenCase.id,
      case_label: goldenCase.case_label,
      template_name: goldenCase.template_name,
      published_url: goldenCase.published_url,
      status: 'failed',
      proxy_risk_band: 'unavailable',
      signal_count: 0,
      finding_count: 0,
      major_finding_count: 0,
      finding_buckets: [],
      error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    };
  }
}

async function writeJsonl(filePath: string, rows: unknown[]) {
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const goldenCases = await readJsonl<GoldenCaseProposal>(path.join(options.inputDir, 'visual-quality-golden-cases.proposed.jsonl'));
  const selected = selectCases(goldenCases, options);
  const results: CanaryCaseResult[] = [];

  for (const goldenCase of selected) {
    results.push(await runExtractor(goldenCase, options));
  }

  const byLabel: Record<string, { total: number; completed: number; failed: number; signals: number; findings: number; major: number }> = {};
  const riskBandCounts: Record<string, number> = {};
  const bucketCounts: Record<string, number> = {};

  for (const result of results) {
    const current =
      byLabel[result.case_label] ??
      {
        total: 0,
        completed: 0,
        failed: 0,
        signals: 0,
        findings: 0,
        major: 0,
      };
    current.total += 1;
    if (result.status === 'completed') current.completed += 1;
    if (result.status === 'failed') current.failed += 1;
    current.signals += result.signal_count;
    current.findings += result.finding_count;
    current.major += result.major_finding_count;
    byLabel[result.case_label] = current;
    increment(riskBandCounts, `${result.case_label}:${result.proxy_risk_band}`);
    for (const bucket of result.finding_buckets) increment(bucketCounts, `${result.case_label}:${bucket}`);
  }

  const approvedResults = results.filter((item) => item.case_label === 'approved_good' || item.case_label === 'approved_exceptional');
  const rejectedVisualResults = results.filter((item) => item.case_label === 'rejected_visual_quality');
  const completedApproved = approvedResults.filter((item) => item.status === 'completed');
  const completedRejectedVisual = rejectedVisualResults.filter((item) => item.status === 'completed');
  const approvedMediumOrHigh = completedApproved.filter(
    (item) => item.proxy_risk_band === 'medium_proxy_load' || item.proxy_risk_band === 'high_proxy_load',
  );
  const rejectedVisualAnySignal = completedRejectedVisual.filter((item) => item.signal_count > 0);

  const summary = {
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    out_dir: options.outDir,
    selected_count: selected.length,
    completed_count: results.filter((item) => item.status === 'completed').length,
    failed_count: results.filter((item) => item.status === 'failed').length,
    by_label: byLabel,
    risk_band_counts: riskBandCounts,
    bucket_counts: bucketCounts,
    approved_control_medium_or_high_proxy_count: approvedMediumOrHigh.length,
    approved_control_medium_or_high_proxy_rate:
      completedApproved.length > 0 ? Number((approvedMediumOrHigh.length / completedApproved.length).toFixed(3)) : 0,
    rejected_visual_any_proxy_signal_count: rejectedVisualAnySignal.length,
    rejected_visual_any_proxy_signal_rate:
      completedRejectedVisual.length > 0 ? Number((rejectedVisualAnySignal.length / completedRejectedVisual.length).toFixed(3)) : 0,
    files: {
      case_results: path.join(options.outDir, 'visual-proxy-canary-cases.jsonl'),
      summary: path.join(options.outDir, 'visual-proxy-canary-summary.json'),
    },
    notes: [
      'This canary measures proxy behavior only; it does not validate final review ratings.',
      'Approved controls may have proxy findings. Medium/high proxy load on approved controls should block reviewer-facing automation.',
      'Rejected visual-quality recall is only useful after approved-control false-positive behavior is acceptable.',
    ],
  };

  await writeJsonl(path.join(options.outDir, 'visual-proxy-canary-cases.jsonl'), results);
  await writeFile(path.join(options.outDir, 'visual-proxy-canary-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
