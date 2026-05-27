import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  outDir: string;
  maxScreenshots: number;
};

type BlindCase = {
  case_id: string;
  asset_id: string;
  version_id: string;
  template_name: string;
  source_url: string;
  published_url?: string;
  preview_url?: string;
  version_number?: number;
  submitted_at?: string;
  marketplace_status?: string;
  parent_latest_review_status?: string;
};

type PrivateOutcome = {
  case_id: string;
  actual_review_status?: string;
  actual_quality_rating?: string;
  selection_stratum?: string;
  reviewer?: string;
  review_feedback_snippet?: string;
  rejection_reason?: string;
  rejection_feedback_snippet?: string;
};

type SandboxResult = {
  case_id: string;
  artifacts?: {
    run_dir?: string;
    normalized_dir?: string;
  };
  normalized_output?: {
    rendered_status?: string;
    screenshot_count?: number;
    finding_count?: number;
    substantive_finding_count?: number;
    finding_rule_ids?: string[];
    finding_buckets?: string[];
  };
};

type NormalizedOutput = {
  static_summary?: unknown;
  rendered_summary?: unknown;
  network_summary?: unknown;
  findings?: unknown[];
};

type ScreenshotPacket = {
  source_path: string;
  packet_path: string;
  relative_path: string;
  sha256: string;
  bytes: number;
  width?: number;
  height?: number;
};

type BlindPacketRow = {
  schema_version: 'multimodal_review_packet.v0.1';
  case_id: string;
  asset_id: string;
  version_id: string;
  template_name: string;
  source_url: string;
  published_url?: string;
  preview_url?: string;
  screenshot_count: number;
  screenshots: ScreenshotPacket[];
  sandbox_summary?: SandboxResult['normalized_output'];
  static_summary?: unknown;
  rendered_summary?: unknown;
  network_summary?: unknown;
  findings: unknown[];
};

const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-multimodal-smoke-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-multimodal-review-packet';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    maxScreenshots: 8,
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
    if (arg === '--max-screenshots' && next) {
      options.maxScreenshots = boundedInt(next, 1, 24, '--max-screenshots');
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    inputDir: options.inputDir ?? DEFAULT_INPUT_DIR,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    maxScreenshots: options.maxScreenshots ?? 8,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp multimodal:packet -- [options]

Options:
  --input <dir>              Calibration output directory. Default: ${DEFAULT_INPUT_DIR}
  --out <dir>                Packet output directory. Default: ${DEFAULT_OUT_DIR}
  --max-screenshots <n>      Maximum screenshots per case. Default: 8
  --help                     Show this help.

Behavior:
  Creates a blind multimodal review packet with copied screenshot artifacts,
  hashes, dimensions, evidence summaries, and a contact sheet. Private Airtable
  outcomes are written separately for calibration scoring only.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function optionalJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

async function writeJsonl(filePath: string, rows: unknown[]) {
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}${rows.length ? '\n' : ''}`);
}

async function findScreenshots(runDir: string | undefined, maxScreenshots: number): Promise<string[]> {
  if (!runDir) return [];
  const screenshotDir = path.join(runDir, 'e2b', 'screenshots');
  try {
    const entries = await readdir(screenshotDir);
    return entries
      .filter((entry) => entry.toLowerCase().endsWith('.png'))
      .sort()
      .slice(0, maxScreenshots)
      .map((entry) => path.join(screenshotDir, entry));
  } catch {
    return [];
  }
}

function pngDimensions(bytes: Buffer): { width?: number; height?: number } {
  const pngSignature = '89504e470d0a1a0a';
  if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== pngSignature) return {};
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

async function copyScreenshot(args: {
  sourcePath: string;
  caseId: string;
  index: number;
  outDir: string;
}): Promise<ScreenshotPacket> {
  const bytes = await readFile(args.sourcePath);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const safeName = path.basename(args.sourcePath).replace(/[^a-zA-Z0-9._-]/g, '_');
  const relativePath = path.join('cases', args.caseId, 'screenshots', `${String(args.index + 1).padStart(2, '0')}-${safeName}`);
  const packetPath = path.join(args.outDir, relativePath);
  await mkdir(path.dirname(packetPath), { recursive: true });
  await copyFile(args.sourcePath, packetPath);
  return {
    source_path: args.sourcePath,
    packet_path: packetPath,
    relative_path: relativePath.replaceAll(path.sep, '/'),
    sha256: hash,
    bytes: bytes.byteLength,
    ...pngDimensions(bytes),
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderFindings(findings: unknown[]): string {
  if (findings.length === 0) return '<p class="muted">No normalized findings.</p>';
  return `<ul>${findings
    .slice(0, 8)
    .map((finding) => {
      const row = finding && typeof finding === 'object' ? (finding as Record<string, unknown>) : {};
      return `<li><code>${escapeHtml(row.rule_id)}</code> ${escapeHtml(row.severity)} ${escapeHtml(row.finding_bucket)}</li>`;
    })
    .join('')}</ul>`;
}

function renderBlindHtml(rows: BlindPacketRow[]): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Webflow Template Review Multimodal Packet</title>
  <style>
    body { margin: 0; font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2328; background: #f6f8fa; }
    header { padding: 24px; background: #fff; border-bottom: 1px solid #d0d7de; }
    main { padding: 24px; display: grid; gap: 24px; }
    article { background: #fff; border: 1px solid #d0d7de; border-radius: 8px; padding: 18px; }
    h1, h2 { margin: 0 0 8px; line-height: 1.2; }
    .meta, .muted { color: #57606a; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-top: 16px; }
    figure { margin: 0; border: 1px solid #d8dee4; border-radius: 6px; overflow: hidden; background: #fff; }
    img { display: block; width: 100%; height: auto; }
    figcaption { padding: 8px 10px; font-size: 12px; color: #57606a; border-top: 1px solid #d8dee4; word-break: break-all; }
    code { background: #f6f8fa; padding: 1px 4px; border-radius: 4px; }
    .summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
    .pill { border: 1px solid #d0d7de; border-radius: 999px; padding: 3px 8px; background: #f6f8fa; }
  </style>
</head>
<body>
  <header>
    <h1>Webflow Template Review Multimodal Packet</h1>
    <p class="meta">Blind contact sheet. Private outcomes are intentionally excluded.</p>
  </header>
  <main>
    ${rows
      .map(
        (row) => `<article>
      <h2>${escapeHtml(row.template_name)}</h2>
      <p class="meta"><code>${escapeHtml(row.case_id)}</code> ${escapeHtml(row.source_url)}</p>
      <div class="summary">
        <span class="pill">screenshots: ${row.screenshot_count}</span>
        <span class="pill">findings: ${row.findings.length}</span>
        <span class="pill">render: ${escapeHtml(row.sandbox_summary?.rendered_status ?? 'unknown')}</span>
      </div>
      ${renderFindings(row.findings)}
      <div class="grid">
        ${row.screenshots
          .map(
            (screenshot) => `<figure>
          <img src="${escapeHtml(screenshot.relative_path)}" alt="${escapeHtml(row.template_name)} screenshot ${escapeHtml(screenshot.relative_path)}" loading="lazy" />
          <figcaption>${escapeHtml(screenshot.relative_path)}<br />${screenshot.width ?? '?'}x${screenshot.height ?? '?'} ${Math.round(screenshot.bytes / 1024)} KB</figcaption>
        </figure>`,
          )
          .join('')}
      </div>
    </article>`,
      )
      .join('\n')}
  </main>
</body>
</html>
`;
}

function renderPrivateHtml(rows: BlindPacketRow[], outcomes: Map<string, PrivateOutcome>): string {
  const base = renderBlindHtml(rows);
  const privateBlocks = rows
    .map((row) => {
      const outcome = outcomes.get(row.case_id);
      return `<section>
  <h2>${escapeHtml(row.case_id)} private outcome</h2>
  <pre>${escapeHtml(JSON.stringify(outcome ?? { missing: true }, null, 2))}</pre>
</section>`;
    })
    .join('\n');
  return base.replace(
    '<p class="meta">Blind contact sheet. Private outcomes are intentionally excluded.</p>',
    '<p class="meta">Private calibration contact sheet. Do not use this file as a model prompt.</p>',
  ).replace('</main>', `<section style="background:#fff3cd;border:1px solid #d0a806;border-radius:8px;padding:18px;"><h2>Private Outcomes</h2><p>This section is for human calibration only.</p>${privateBlocks}</section></main>`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const blindCases = await readJsonl<BlindCase>(path.join(options.inputDir, 'manifest.blind.jsonl'));
  const sandboxResults = await readJsonl<SandboxResult>(path.join(options.inputDir, 'sandbox-results.jsonl'));
  const privateOutcomes = await readJsonl<PrivateOutcome>(path.join(options.inputDir, 'outcomes.private.jsonl')).catch(() => []);
  const privateByCase = new Map(privateOutcomes.map((outcome) => [outcome.case_id, outcome]));

  const rows: BlindPacketRow[] = [];
  for (const blindCase of blindCases) {
    const sandboxResult = sandboxResults.find((item) => item.case_id === blindCase.case_id);
    const runDir = sandboxResult?.artifacts?.run_dir ?? path.join(options.inputDir, 'runs', blindCase.case_id);
    const normalizedDir = sandboxResult?.artifacts?.normalized_dir ?? path.join(runDir, 'e2b', 'normalized');
    const normalized = await optionalJson<NormalizedOutput>(path.join(normalizedDir, 'published-site-sandbox-normalized.json'));
    const screenshotPaths = await findScreenshots(runDir, options.maxScreenshots);
    const screenshots = await Promise.all(
      screenshotPaths.map((sourcePath, index) =>
        copyScreenshot({
          sourcePath,
          caseId: blindCase.case_id,
          index,
          outDir: options.outDir,
        }),
      ),
    );

    rows.push({
      schema_version: 'multimodal_review_packet.v0.1',
      case_id: blindCase.case_id,
      asset_id: blindCase.asset_id,
      version_id: blindCase.version_id,
      template_name: blindCase.template_name,
      source_url: blindCase.source_url,
      published_url: blindCase.published_url,
      preview_url: blindCase.preview_url,
      screenshot_count: screenshots.length,
      screenshots,
      sandbox_summary: sandboxResult?.normalized_output,
      static_summary: normalized?.static_summary,
      rendered_summary: normalized?.rendered_summary,
      network_summary: normalized?.network_summary,
      findings: normalized?.findings ?? [],
    });
  }

  await writeJsonl(path.join(options.outDir, 'multimodal-review-packet.blind.jsonl'), rows);
  await writeJsonl(
    path.join(options.outDir, 'multimodal-review-packet.private.jsonl'),
    rows.map((row) => ({
      case_id: row.case_id,
      private_outcome: privateByCase.get(row.case_id),
      note: 'Private outcome is for calibration only and must not be included in model prompts.',
    })),
  );
  await writeFile(path.join(options.outDir, 'index.blind.html'), renderBlindHtml(rows));
  await writeFile(path.join(options.outDir, 'index.private.html'), renderPrivateHtml(rows, privateByCase));

  const summary = {
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    out_dir: options.outDir,
    case_count: rows.length,
    screenshot_count: rows.reduce((total, row) => total + row.screenshot_count, 0),
    private_outcome_count: privateOutcomes.length,
    files: {
      blind_jsonl: path.join(options.outDir, 'multimodal-review-packet.blind.jsonl'),
      private_jsonl: path.join(options.outDir, 'multimodal-review-packet.private.jsonl'),
      blind_contact_sheet: path.join(options.outDir, 'index.blind.html'),
      private_contact_sheet: path.join(options.outDir, 'index.private.html'),
    },
    notes: [
      'Use the blind JSONL/contact sheet for prompts and evidence review.',
      'Use the private JSONL/contact sheet only for calibration after a model or reviewer response is produced.',
      'Screenshots were copied into the packet directory and hashed for repeatability.',
    ],
  };
  await writeFile(path.join(options.outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
