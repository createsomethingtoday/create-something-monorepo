import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  inputFile: string;
  outDir: string;
  runId?: string;
  assetId?: string;
  versionId?: string;
  policySnapshotId?: string;
  artifactBaseUrl?: string;
};

type SandboxOutput = {
  schema_version?: string;
  run_id?: string;
  lane_id?: string;
  source_url?: string;
  policy_snapshot_id?: string;
  status?: 'ok' | 'partial' | 'failed' | string;
  evidence_quality?: string;
  sandbox_metadata?: {
    provider?: string;
    controls?: {
      timeout_ms?: number;
      max_pages?: number;
      max_network_requests?: number;
      allowed_hosts?: string[];
      viewports?: Array<{ name?: string; width?: number; height?: number }>;
    };
  };
  static_pages?: Array<{
    url?: string;
    title?: string;
    meta_description?: string;
    html_bytes?: number;
    link_count?: number;
    same_origin_links?: string[];
    image_count?: number;
    missing_alt_count?: number;
    heading_counts?: Record<string, number>;
    content_type?: string;
  }>;
  rendered?: {
    status?: string;
    reason?: string;
    message?: string;
    pages?: Array<{
      url?: string;
      viewports?: Array<{
        name?: string;
        width?: number;
        height?: number;
        status?: string;
        error?: string;
        screenshot_path?: string;
        console_error_count?: number;
        console_error_samples?: string[];
        latency_ms?: number;
        metrics?: {
          title?: string;
          current_url?: string;
          viewport_width?: number;
          viewport_height?: number;
          document_width?: number;
          document_height?: number;
          horizontal_overflow?: boolean;
          overflowing_element_count?: number;
          clipped_text_candidate_count?: number;
          h1_count?: number;
          image_count?: number;
          missing_alt_count?: number;
          link_count?: number;
          form_count?: number;
        };
      }>;
    }>;
  };
  network_summary?: {
    request_count?: number;
    network_log_file?: string;
  };
  errors?: Array<Record<string, unknown>>;
  caveats?: string[];
};

type SandboxStaticPage = NonNullable<SandboxOutput['static_pages']>[number];

type NormalizedFinding = {
  id: string;
  rule_id: string;
  status: 'pass' | 'fail' | 'partial' | 'manual' | 'error';
  severity: 'critical' | 'major' | 'minor' | 'info';
  coverage: 'auto' | 'partial' | 'manual';
  rejectability: string;
  finding_bucket: string;
  confidence: number;
  page_url?: string;
  evidence: Record<string, unknown>;
  artifact_url?: string;
  resolution_state: 'open' | 'resolved' | 'waived' | 'false_positive' | 'needs_human_review';
};

const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-published-site-sandbox-normalized';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: DEFAULT_OUT_DIR,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if ((arg === '--input' || arg === '--input-file') && next) {
      options.inputFile = next;
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--run-id' && next) {
      options.runId = next;
      i += 1;
      continue;
    }
    if (arg === '--asset-id' && next) {
      options.assetId = next;
      i += 1;
      continue;
    }
    if (arg === '--version-id' && next) {
      options.versionId = next;
      i += 1;
      continue;
    }
    if (arg === '--policy-snapshot-id' && next) {
      options.policySnapshotId = next;
      i += 1;
      continue;
    }
    if (arg === '--artifact-base-url' && next) {
      options.artifactBaseUrl = next.replace(/\/+$/, '');
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.inputFile) throw new Error('Missing required --input <published-site-sandbox-output.json>.');
  return {
    inputFile: options.inputFile,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    runId: options.runId,
    assetId: options.assetId,
    versionId: options.versionId,
    policySnapshotId: options.policySnapshotId,
    artifactBaseUrl: options.artifactBaseUrl,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:normalize -- [options]

Options:
  --input <file>              Downloaded published-site-sandbox-output.json. Required.
  --out <dir>                 Output directory. Default: ${DEFAULT_OUT_DIR}
  --run-id <id>               Optional run id override.
  --asset-id <id>             Optional Airtable asset id for ledger SQL.
  --version-id <id>           Optional Airtable version id for ledger SQL.
  --policy-snapshot-id <id>   Optional policy snapshot override.
  --artifact-base-url <url>   Optional base URL for artifact refs after R2 upload.
  --help                      Show this help.

Behavior:
  Validates and normalizes sandbox evidence into review-ledger-ready JSONL and SQL.
  Emits manual/partial/error findings only. It never emits approval, rejection, rating,
  creator-facing feedback, or external writes.
`);
}

function stableId(prefix: string, parts: unknown[]): string {
  const hash = createHash('sha256').update(parts.map((part) => String(part ?? '')).join('|')).digest('hex').slice(0, 16);
  return `${prefix}_${hash}`;
}

function sqlString(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value: unknown): string {
  return sqlString(JSON.stringify(value));
}

function sqlNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'null';
}

function artifactUrl(options: CliOptions, filePath: string | undefined): string | undefined {
  if (!options.artifactBaseUrl || !filePath) return undefined;
  const basename = path.basename(filePath);
  return `${options.artifactBaseUrl}/${encodeURIComponent(basename)}`;
}

function numeric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function headingCount(page: SandboxStaticPage | undefined, level: string): number {
  return numeric(page?.heading_counts?.[level]);
}

function addFinding(findings: NormalizedFinding[], runId: string, finding: Omit<NormalizedFinding, 'id'>) {
  findings.push({
    id: stableId('finding', [runId, finding.rule_id, finding.page_url, JSON.stringify(finding.evidence), finding.artifact_url]),
    ...finding,
  });
}

function normalize(output: SandboxOutput, options: CliOptions) {
  const runId = options.runId ?? output.run_id ?? stableId('sandbox_run', [output.source_url, output.policy_snapshot_id, options.inputFile]);
  const sourceUrl = output.source_url ?? '';
  const policySnapshotId = options.policySnapshotId ?? output.policy_snapshot_id ?? 'template-review-policy.draft';
  const findings: NormalizedFinding[] = [];
  const errors = output.errors ?? [];

  if (!sourceUrl.startsWith('https://')) {
    addFinding(findings, runId, {
      rule_id: 'sandbox.source_url.invalid',
      status: 'error',
      severity: 'major',
      coverage: 'partial',
      rejectability: 'not_rejectable_sandbox_setup_error',
      finding_bucket: 'sandbox_execution',
      confidence: 1,
      evidence: { source_url: sourceUrl },
      resolution_state: 'needs_human_review',
    });
  }

  if (output.status === 'failed') {
    addFinding(findings, runId, {
      rule_id: 'sandbox.run.failed',
      status: 'error',
      severity: 'major',
      coverage: 'partial',
      rejectability: 'not_rejectable_sandbox_setup_error',
      finding_bucket: 'sandbox_execution',
      confidence: 1,
      evidence: { errors },
      resolution_state: 'needs_human_review',
    });
  }

  if (output.rendered?.status && output.rendered.status !== 'ok') {
    addFinding(findings, runId, {
      rule_id: 'sandbox.render.unavailable',
      status: 'partial',
      severity: 'info',
      coverage: 'partial',
      rejectability: 'not_rejectable_partial_evidence',
      finding_bucket: 'sandbox_execution',
      confidence: 1,
      evidence: {
        render_status: output.rendered.status,
        reason: output.rendered.reason,
        message: output.rendered.message,
      },
      resolution_state: 'needs_human_review',
    });
  }

  for (const page of output.static_pages ?? []) {
    if (numeric(page.missing_alt_count) > 0) {
      addFinding(findings, runId, {
        rule_id: 'published_site.static.images_missing_alt',
        status: 'manual',
        severity: 'minor',
        coverage: 'partial',
        rejectability: 'candidate_signal_needs_review_context',
        finding_bucket: 'accessibility',
        confidence: 0.75,
        page_url: page.url,
        evidence: {
          missing_alt_count: page.missing_alt_count,
          image_count: page.image_count,
          source: 'sandbox_static_html',
        },
        resolution_state: 'needs_human_review',
      });
    }

    if (headingCount(page, 'h1') === 0) {
      addFinding(findings, runId, {
        rule_id: 'published_site.static.h1_missing',
        status: 'manual',
        severity: 'minor',
        coverage: 'partial',
        rejectability: 'candidate_signal_needs_review_context',
        finding_bucket: 'seo_accessibility',
        confidence: 0.65,
        page_url: page.url,
        evidence: {
          heading_counts: page.heading_counts ?? {},
          source: 'sandbox_static_html',
        },
        resolution_state: 'needs_human_review',
      });
    }
  }

  for (const page of output.rendered?.pages ?? []) {
    for (const viewport of page.viewports ?? []) {
      const evidenceBase = {
        viewport: {
          name: viewport.name,
          width: viewport.width,
          height: viewport.height,
        },
        source: 'sandbox_rendered_browser',
      };

      if (viewport.status && viewport.status !== 'ok') {
        addFinding(findings, runId, {
          rule_id: 'published_site.render.viewport_failed',
          status: 'error',
          severity: 'info',
          coverage: 'partial',
          rejectability: 'not_rejectable_partial_evidence',
          finding_bucket: 'sandbox_execution',
          confidence: 1,
          page_url: page.url,
          evidence: {
            ...evidenceBase,
            error: viewport.error,
            latency_ms: viewport.latency_ms,
          },
          resolution_state: 'needs_human_review',
        });
        continue;
      }

      const metrics = viewport.metrics ?? {};
      const viewportWidth = numeric(metrics.viewport_width);
      const documentWidth = numeric(metrics.document_width);
      const pageLevelHorizontalOverflow = metrics.horizontal_overflow === true && documentWidth > viewportWidth + 4;
      if (pageLevelHorizontalOverflow) {
        addFinding(findings, runId, {
          rule_id: 'published_site.render.horizontal_overflow',
          status: 'manual',
          severity: 'major',
          coverage: 'partial',
          rejectability: 'candidate_signal_needs_visual_confirmation',
          finding_bucket: 'responsive_layout',
          confidence: 0.85,
          page_url: page.url,
          artifact_url: artifactUrl(options, viewport.screenshot_path),
          evidence: {
            ...evidenceBase,
            document_width: metrics.document_width,
            viewport_width: metrics.viewport_width,
            overflowing_element_count: metrics.overflowing_element_count,
            screenshot_path: viewport.screenshot_path,
          },
          resolution_state: 'needs_human_review',
        });
      }

      if (numeric(viewport.console_error_count) > 0) {
        addFinding(findings, runId, {
          rule_id: 'published_site.render.console_errors',
          status: 'manual',
          severity: 'minor',
          coverage: 'partial',
          rejectability: 'candidate_signal_needs_review_context',
          finding_bucket: 'runtime_quality',
          confidence: 0.7,
          page_url: page.url,
          artifact_url: artifactUrl(options, viewport.screenshot_path),
          evidence: {
            ...evidenceBase,
            console_error_count: viewport.console_error_count,
            console_error_samples: viewport.console_error_samples ?? [],
          },
          resolution_state: 'needs_human_review',
        });
      }
    }
  }

  const maxRequests = output.sandbox_metadata?.controls?.max_network_requests;
  if (typeof maxRequests === 'number' && numeric(output.network_summary?.request_count) >= maxRequests) {
    addFinding(findings, runId, {
      rule_id: 'sandbox.network.request_cap_reached',
      status: 'partial',
      severity: 'info',
      coverage: 'partial',
      rejectability: 'not_rejectable_partial_evidence',
      finding_bucket: 'sandbox_execution',
      confidence: 1,
      evidence: {
        request_count: output.network_summary?.request_count,
        max_network_requests: maxRequests,
        network_log_file: output.network_summary?.network_log_file,
      },
      artifact_url: artifactUrl(options, output.network_summary?.network_log_file),
      resolution_state: 'needs_human_review',
    });
  }

  const evidenceStatus = output.status === 'failed' ? 'unusable' : output.status === 'ok' && output.rendered?.status === 'ok' ? 'usable' : 'partial';
  const staticPages = output.static_pages ?? [];
  const renderedPages = output.rendered?.pages ?? [];
  const renderedViewports = renderedPages.flatMap((page) => page.viewports ?? []);

  return {
    schema_version: 'published_site_sandbox_normalized.v0.1',
    generated_at: new Date().toISOString(),
    run_id: runId,
    asset_id: options.assetId,
    version_id: options.versionId,
    source_url: sourceUrl,
    policy_snapshot_id: policySnapshotId,
    source_schema_version: output.schema_version,
    source_status: output.status ?? 'unknown',
    evidence_status: evidenceStatus,
    escalation_required: evidenceStatus !== 'usable' || findings.some((finding) => finding.resolution_state === 'needs_human_review'),
    evidence_quality:
      output.evidence_quality ?? 'Sandbox evidence for published-site review triage. Not a final approval or rejection.',
    static_summary: {
      page_count: staticPages.length,
      total_html_bytes: staticPages.reduce((total, page) => total + numeric(page.html_bytes), 0),
      total_images: staticPages.reduce((total, page) => total + numeric(page.image_count), 0),
      total_missing_alt: staticPages.reduce((total, page) => total + numeric(page.missing_alt_count), 0),
      pages: staticPages.map((page) => ({
        url: page.url,
        title: page.title,
        content_type: page.content_type,
        html_bytes: page.html_bytes,
        h1_count: headingCount(page, 'h1'),
        image_count: page.image_count,
        missing_alt_count: page.missing_alt_count,
      })),
    },
    rendered_summary: {
      status: output.rendered?.status ?? 'missing',
      page_count: renderedPages.length,
      viewport_count: renderedViewports.length,
      total_overflowing_element_candidates: renderedViewports.reduce(
        (total, viewport) => total + numeric(viewport.metrics?.overflowing_element_count),
        0,
      ),
      total_clipped_text_candidates: renderedViewports.reduce(
        (total, viewport) => total + numeric(viewport.metrics?.clipped_text_candidate_count),
        0,
      ),
      screenshots: renderedPages.flatMap((page) =>
        (page.viewports ?? [])
          .map((viewport) => viewport.screenshot_path)
          .filter((value): value is string => Boolean(value)),
      ),
    },
    network_summary: output.network_summary ?? {},
    findings,
    errors,
    caveats: [
      ...(output.caveats ?? []),
      'Normalized sandbox findings are evidence-only and require coordinator/human review before any creator-facing decision.',
    ],
  };
}

function findingSql(runId: string, finding: NormalizedFinding, createdAt: string): string {
  return `insert into review_findings (
  id, run_id, rule_id, status, severity, coverage, rejectability, finding_bucket,
  confidence, page_url, evidence_json, artifact_url, resolution_state, created_at
) values (
  ${sqlString(finding.id)},
  ${sqlString(runId)},
  ${sqlString(finding.rule_id)},
  ${sqlString(finding.status)},
  ${sqlString(finding.severity)},
  ${sqlString(finding.coverage)},
  ${sqlString(finding.rejectability)},
  ${sqlString(finding.finding_bucket)},
  ${sqlNumber(finding.confidence)},
  ${sqlString(finding.page_url)},
  ${sqlJson(finding.evidence)},
  ${sqlString(finding.artifact_url)},
  ${sqlString(finding.resolution_state)},
  ${sqlString(createdAt)}
) on conflict(id) do update set
  status = excluded.status,
  severity = excluded.severity,
  coverage = excluded.coverage,
  rejectability = excluded.rejectability,
  finding_bucket = excluded.finding_bucket,
  confidence = excluded.confidence,
  evidence_json = excluded.evidence_json,
  artifact_url = excluded.artifact_url,
  resolution_state = excluded.resolution_state;`;
}

function buildLedgerSql(normalized: ReturnType<typeof normalize>): string {
  const status = normalized.evidence_status === 'unusable' ? 'failed' : 'completed';
  const createdAt = normalized.generated_at;
  const sql = [
    '-- Generated by normalize-published-site-sandbox-output.ts',
    '-- Requires review_policy_snapshots to contain the referenced policy_snapshot_id before import.',
    `insert into review_runs (
  id, asset_id, version_id, published_url, policy_snapshot_id, status, created_at, completed_at, error_json
) values (
  ${sqlString(normalized.run_id)},
  ${sqlString(normalized.asset_id)},
  ${sqlString(normalized.version_id)},
  ${sqlString(normalized.source_url)},
  ${sqlString(normalized.policy_snapshot_id)},
  ${sqlString(status)},
  ${sqlString(createdAt)},
  ${sqlString(createdAt)},
  ${normalized.errors.length > 0 ? sqlJson(normalized.errors) : 'null'}
) on conflict(id) do update set
  status = excluded.status,
  completed_at = excluded.completed_at,
  error_json = excluded.error_json;`,
    ...normalized.findings.map((finding) => findingSql(normalized.run_id, finding, createdAt)),
  ];
  return `${sql.join('\n\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const output = JSON.parse(await readFile(options.inputFile, 'utf8')) as SandboxOutput;
  const normalized = normalize(output, options);

  await mkdir(options.outDir, { recursive: true });
  await writeFile(path.join(options.outDir, 'published-site-sandbox-normalized.json'), `${JSON.stringify(normalized, null, 2)}\n`);
  await writeFile(
    path.join(options.outDir, 'published-site-sandbox-findings.jsonl'),
    `${normalized.findings.map((finding) => JSON.stringify(finding)).join('\n')}${normalized.findings.length > 0 ? '\n' : ''}`,
  );
  await writeFile(path.join(options.outDir, 'published-site-sandbox-ledger-import.sql'), buildLedgerSql(normalized));
  await writeFile(
    path.join(options.outDir, 'published-site-sandbox-normalization-summary.json'),
    `${JSON.stringify(
      {
        ok: true,
        run_id: normalized.run_id,
        source_url: normalized.source_url,
        evidence_status: normalized.evidence_status,
        escalation_required: normalized.escalation_required,
        finding_count: normalized.findings.length,
        out_dir: options.outDir,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        run_id: normalized.run_id,
        evidence_status: normalized.evidence_status,
        escalation_required: normalized.escalation_required,
        finding_count: normalized.findings.length,
        out_dir: options.outDir,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
