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
  sourceUrl?: string;
  artifactBaseUrl?: string;
};

type RawIssue = {
  id?: string;
  severity?: string;
  message?: string;
  details?: unknown;
  example?: string;
  [key: string]: unknown;
};

type RawCategory = {
  category?: string;
  passed?: boolean;
  issues?: RawIssue[];
  stats?: unknown;
  [key: string]: unknown;
};

type ExtractedResults = {
  url?: string;
  success?: boolean;
  timestamp?: string;
  categories: RawCategory[];
  summary: Record<string, unknown>;
  sourceShape: string;
};

type NormalizedSummary = {
  errors: number;
  warnings: number;
  infos: number;
  passed_categories: number;
  failed_categories: number;
  total_categories: number;
  total_issues: number;
};

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

type NormalizedArtifact = {
  schema_version: 'validator_app_results_normalized.v0.1';
  lane_id: 'validator_app_supplemental_results';
  run_id: string;
  asset_id?: string;
  version_id?: string;
  source_url: string;
  policy_snapshot_id: string;
  checked_at: string;
  source_shape: string;
  result_status: 'usable' | 'empty';
  summary: NormalizedSummary;
  categories: Array<{
    category: string;
    passed: boolean;
    issue_count: number;
    error_count: number;
    warning_count: number;
    info_count: number;
  }>;
  findings: NormalizedFinding[];
  caveats: string[];
};

type ArtifactManifestEntry = {
  artifact_type: string;
  path: string;
  sha256: string;
  byte_size: number;
  media_type: string;
  redaction: {
    raw_bridge_token_stored: false;
    secret_like_fields_redacted: boolean;
  };
};

const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-validator-app-results-normalized';
const DEFAULT_POLICY_SNAPSHOT_ID = 'validator_app_results_policy_unversioned';

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
    if (arg === '--source-url' && next) {
      options.sourceUrl = next;
      i += 1;
      continue;
    }
    if (arg === '--artifact-base-url' && next) {
      options.artifactBaseUrl = next.replace(/\/+$/u, '');
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.inputFile) throw new Error('Missing required --input <validator-results.json>.');
  return {
    inputFile: options.inputFile,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    runId: options.runId,
    assetId: options.assetId,
    versionId: options.versionId,
    policySnapshotId: options.policySnapshotId,
    sourceUrl: options.sourceUrl,
    artifactBaseUrl: options.artifactBaseUrl,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp validator:results:normalize -- [options]

Options:
  --input <file>              Validator app result JSON. Required.
  --out <dir>                 Output directory. Default: ${DEFAULT_OUT_DIR}
  --run-id <id>               Optional review run id.
  --asset-id <id>             Optional Airtable Asset id.
  --version-id <id>           Optional Airtable Asset Version id.
  --policy-snapshot-id <id>   Optional policy snapshot id.
  --source-url <url>          Optional source URL override.
  --artifact-base-url <url>   Optional base URL for artifact refs after R2 upload.
  --help                      Show this help.

Accepted input shapes:
  - { validationResults: { url, summary, categories } }
  - { result: { url, summary, categories } } from review status responses
  - { url, summary, categories } direct Validator app output
  - { siteUrl, analysis, summary } enhanced worker output

Behavior:
  Normalizes Validator app results into review-ledger-ready JSONL and SQL.
  It redacts secret-like fields, never stores raw bridge tokens, and does not
  emit approvals, rejections, quality bands, or creator-facing feedback.
`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stableHash(value: unknown, length = 16): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, length);
}

function stableId(prefix: string, parts: unknown[]): string {
  return `${prefix}_${stableHash(parts)}`;
}

function slugify(value: unknown): string {
  const slug = String(value ?? 'unknown')
    .toLowerCase()
    .replace(/&/gu, ' and ')
    .replace(/[^a-z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '')
    .slice(0, 80);
  return slug || 'unknown';
}

function readCount(summary: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = summary[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return fallback;
}

function normalizeIssueSeverity(value: unknown): 'error' | 'warning' | 'info' {
  if (value === 'error' || value === 'critical') return 'error';
  if (value === 'warning' || value === 'warn') return 'warning';
  return 'info';
}

function issueStatus(severity: 'error' | 'warning' | 'info'): NormalizedFinding['status'] {
  if (severity === 'error') return 'fail';
  return 'partial';
}

function ledgerSeverity(severity: 'error' | 'warning' | 'info'): NormalizedFinding['severity'] {
  if (severity === 'error') return 'major';
  if (severity === 'warning') return 'minor';
  return 'info';
}

function rejectability(severity: 'error' | 'warning' | 'info'): string {
  if (severity === 'error') return 'major_fix';
  if (severity === 'warning') return 'minor_fix';
  return 'quality_signal';
}

function bucketForCategory(category: string): string {
  const slug = slugify(category);
  if (slug.includes('asset') || slug.includes('image')) return 'assets';
  if (slug.includes('access')) return 'accessibility';
  if (slug.includes('content') || slug.includes('seo')) return 'content';
  if (slug.includes('interaction') || slug.includes('gsap')) return 'interactions';
  if (slug.includes('component')) return 'components';
  if (slug.includes('variable') || slug.includes('style') || slug.includes('typography') || slug.includes('naming')) {
    return 'designer_webflow_way';
  }
  return 'validator_app';
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/wfbt_[A-Za-z0-9_-]+/gu, '[redacted_bridge_token]')
    .replace(/(bridgeToken\s*[:=]\s*['"]?)[^'",\s}]+/giu, '$1[redacted]')
    .replace(/(api[_-]?key\s*[:=]\s*['"]?)[^'",\s}]+/giu, '$1[redacted]')
    .replace(/(access[_-]?token\s*[:=]\s*['"]?)[^'",\s}]+/giu, '$1[redacted]');
}

function redactValue(value: unknown, key = '', depth = 0): unknown {
  if (depth > 6) return '[max_depth]';
  const keyLower = key.toLowerCase();
  if (
    keyLower.includes('bridgetoken') ||
    keyLower === 'token' ||
    keyLower.endsWith('_token') ||
    keyLower.includes('secret') ||
    keyLower.includes('apikey') ||
    keyLower.includes('api_key') ||
    keyLower.includes('password')
  ) {
    return typeof value === 'string' && value
      ? { redacted: true, sha256_prefix: createHash('sha256').update(value).digest('hex').slice(0, 12) }
      : '[redacted]';
  }
  if (typeof value === 'string') return redactSensitiveText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, '', depth + 1));
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactValue(entryValue, entryKey, depth + 1)]));
  }
  return value;
}

function normalizeCategory(category: RawCategory): Required<Pick<RawCategory, 'category' | 'passed' | 'issues'>> & { stats?: unknown } {
  const issues = Array.isArray(category.issues) ? category.issues : [];
  const hasError = issues.some((issue) => normalizeIssueSeverity(issue.severity) === 'error');
  return {
    category: typeof category.category === 'string' && category.category.trim() ? category.category.trim() : 'Uncategorized',
    passed: typeof category.passed === 'boolean' ? category.passed : !hasError,
    issues,
    stats: category.stats,
  };
}

function extractValidationResults(input: unknown): ExtractedResults {
  if (!isRecord(input)) throw new Error('Input JSON must be an object.');

  const candidates: Array<{ shape: string; value: unknown }> = [
    { shape: 'validation_submit_request.validationResults', value: input.validationResults },
    { shape: 'review_status_response.result', value: input.result },
    { shape: 'direct_validator_result', value: input },
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate.value)) continue;
    if (Array.isArray(candidate.value.categories)) {
      return {
        url: stringValue(candidate.value.url) ?? stringValue(candidate.value.siteUrl),
        success: booleanValue(candidate.value.success),
        timestamp: stringValue(candidate.value.timestamp),
        categories: candidate.value.categories.filter(isRecord) as RawCategory[],
        summary: isRecord(candidate.value.summary) ? candidate.value.summary : {},
        sourceShape: candidate.shape,
      };
    }
    if (isRecord(candidate.value.analysis)) {
      const categories = categoriesFromAnalysis(candidate.value.analysis);
      return {
        url: stringValue(candidate.value.url) ?? stringValue(candidate.value.siteUrl),
        success: booleanValue(candidate.value.success),
        timestamp: stringValue(candidate.value.timestamp),
        categories,
        summary: isRecord(candidate.value.summary) ? candidate.value.summary : {},
        sourceShape: `${candidate.shape}.analysis`,
      };
    }
  }

  throw new Error('Could not find Validator app result categories or enhanced analysis in input JSON.');
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function categoriesFromAnalysis(analysis: Record<string, unknown>): RawCategory[] {
  const mappings = [
    ['assets', 'Assets & Images'],
    ['content', 'Content & Accessibility'],
    ['accessibility', 'Accessibility & WCAG'],
    ['interactions', 'Interactions and GSAP'],
  ] as const;

  return mappings.flatMap(([key, label]) => {
    const result = analysis[key];
    if (!isRecord(result)) return [];
    const issues = Array.isArray(result.issues) ? (result.issues.filter(isRecord) as RawIssue[]) : [];
    return [
      {
        category: label,
        passed: issues.every((issue) => normalizeIssueSeverity(issue.severity) !== 'error'),
        issues,
        stats: result.stats,
      },
    ];
  });
}

function normalizeSummary(categories: ReturnType<typeof normalizeCategory>[], summary: Record<string, unknown>): NormalizedSummary {
  const issues = categories.flatMap((category) => category.issues);
  const computedErrors = issues.filter((issue) => normalizeIssueSeverity(issue.severity) === 'error').length;
  const computedWarnings = issues.filter((issue) => normalizeIssueSeverity(issue.severity) === 'warning').length;
  const computedInfos = issues.filter((issue) => normalizeIssueSeverity(issue.severity) === 'info').length;
  const passed = categories.filter((category) => category.passed).length;
  const failed = Math.max(0, categories.length - passed);

  return {
    errors: readCount(summary, ['totalErrors', 'errors', 'criticalErrors'], computedErrors),
    warnings: readCount(summary, ['totalWarnings', 'warnings'], computedWarnings),
    infos: readCount(summary, ['totalInfo', 'infos'], computedInfos),
    passed_categories: readCount(summary, ['passedCategories'], passed),
    failed_categories: readCount(summary, ['failedCategories'], failed),
    total_categories: categories.length,
    total_issues: readCount(summary, ['totalIssues'], issues.length),
  };
}

function artifactUrl(options: CliOptions, fileName: string): string | undefined {
  if (!options.artifactBaseUrl) return undefined;
  return `${options.artifactBaseUrl}/${encodeURIComponent(fileName)}`;
}

function normalize(input: unknown, options: CliOptions): NormalizedArtifact {
  const extracted = extractValidationResults(input);
  const categories = extracted.categories.map(normalizeCategory);
  const sourceUrl = options.sourceUrl ?? extracted.url ?? 'validator-app-result://unknown';
  const runId = options.runId ?? stableId('validator_app_results_run', [sourceUrl, options.assetId, options.versionId, extracted.timestamp, categories]);
  const policySnapshotId = options.policySnapshotId ?? DEFAULT_POLICY_SNAPSHOT_ID;
  const summary = normalizeSummary(categories, extracted.summary);
  const checkedAt = new Date().toISOString();
  const findings: NormalizedFinding[] = [];
  const resultArtifactUrl = artifactUrl(options, 'validator-app-results-normalized.json');

  findings.push({
    id: stableId('finding', [runId, 'wf.template.validator_app.summary']),
    rule_id: 'wf.template.validator_app.summary',
    status: summary.errors > 0 ? 'fail' : summary.warnings > 0 ? 'partial' : 'pass',
    severity: summary.errors > 0 ? 'major' : summary.warnings > 0 ? 'minor' : 'info',
    coverage: 'auto',
    rejectability: summary.errors > 0 ? 'major_fix' : summary.warnings > 0 ? 'minor_fix' : 'not_rejectable',
    finding_bucket: 'validator_app',
    confidence: 0.95,
    page_url: sourceUrl.startsWith('http') ? sourceUrl : undefined,
    evidence: {
      source_shape: extracted.sourceShape,
      success: extracted.success,
      summary,
    },
    artifact_url: resultArtifactUrl,
    resolution_state: summary.errors > 0 || summary.warnings > 0 ? 'open' : 'resolved',
  });

  for (const category of categories) {
    const categorySlug = slugify(category.category);
    const issueSeverities = category.issues.map((issue) => normalizeIssueSeverity(issue.severity));
    const errorCount = issueSeverities.filter((severity) => severity === 'error').length;
    const warningCount = issueSeverities.filter((severity) => severity === 'warning').length;
    const infoCount = issueSeverities.filter((severity) => severity === 'info').length;
    const categoryStatus: NormalizedFinding['status'] =
      errorCount > 0 || !category.passed ? 'fail' : warningCount > 0 || infoCount > 0 ? 'partial' : 'pass';

    findings.push({
      id: stableId('finding', [runId, 'category', category.category]),
      rule_id: `wf.template.validator_app.category.${categorySlug}`,
      status: categoryStatus,
      severity: errorCount > 0 || !category.passed ? 'major' : warningCount > 0 ? 'minor' : 'info',
      coverage: 'auto',
      rejectability: errorCount > 0 || !category.passed ? 'major_fix' : warningCount > 0 ? 'minor_fix' : 'not_rejectable',
      finding_bucket: bucketForCategory(category.category),
      confidence: 0.93,
      page_url: sourceUrl.startsWith('http') ? sourceUrl : undefined,
      evidence: {
        category: category.category,
        passed: category.passed,
        issue_count: category.issues.length,
        error_count: errorCount,
        warning_count: warningCount,
        info_count: infoCount,
        stats: redactValue(category.stats),
      },
      artifact_url: resultArtifactUrl,
      resolution_state: categoryStatus === 'pass' ? 'resolved' : 'open',
    });

    category.issues.forEach((issue, index) => {
      const severity = normalizeIssueSeverity(issue.severity);
      const issueId = typeof issue.id === 'string' && issue.id.trim() ? issue.id.trim() : stableHash([category.category, issue.message, index], 10);
      findings.push({
        id: stableId('finding', [runId, category.category, issueId, issue.message, index]),
        rule_id: `wf.template.validator_app.issue.${categorySlug}.${slugify(issueId)}`,
        status: issueStatus(severity),
        severity: ledgerSeverity(severity),
        coverage: 'auto',
        rejectability: rejectability(severity),
        finding_bucket: bucketForCategory(category.category),
        confidence: 0.9,
        page_url: sourceUrl.startsWith('http') ? sourceUrl : undefined,
        evidence: {
          category: category.category,
          issue_id: issueId,
          severity,
          message: redactValue(issue.message),
          details: redactValue(issue.details),
          example: redactValue(issue.example),
        },
        artifact_url: resultArtifactUrl,
        resolution_state: 'open',
      });
    });
  }

  return {
    schema_version: 'validator_app_results_normalized.v0.1',
    lane_id: 'validator_app_supplemental_results',
    run_id: runId,
    asset_id: options.assetId,
    version_id: options.versionId,
    source_url: sourceUrl,
    policy_snapshot_id: policySnapshotId,
    checked_at: checkedAt,
    source_shape: extracted.sourceShape,
    result_status: categories.length > 0 ? 'usable' : 'empty',
    summary,
    categories: categories.map((category) => {
      const severities = category.issues.map((issue) => normalizeIssueSeverity(issue.severity));
      return {
        category: category.category,
        passed: category.passed,
        issue_count: category.issues.length,
        error_count: severities.filter((severity) => severity === 'error').length,
        warning_count: severities.filter((severity) => severity === 'warning').length,
        info_count: severities.filter((severity) => severity === 'info').length,
      };
    }),
    findings,
    caveats: [
      'Validator app results are objective evidence only; they do not emit approval, rejection, rating, or creator-facing feedback.',
      'Script presence is a separate submission-contract check and is not proof of validation pass.',
      'Promote result findings only when the result artifact is persisted with a policy snapshot and calibrated rule mapping.',
    ],
  };
}

function sqlString(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'null';
  return `'${String(value).replace(/'/gu, "''")}'`;
}

function sqlJson(value: unknown): string {
  return sqlString(JSON.stringify(value));
}

function sqlNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'null';
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
  confidence = excluded.confidence,
  evidence_json = excluded.evidence_json,
  artifact_url = excluded.artifact_url,
  resolution_state = excluded.resolution_state;`;
}

function buildLedgerSql(normalized: NormalizedArtifact): string {
  const createdAt = normalized.checked_at;
  const sql = [
    '-- Validator app results normalized ledger import.',
    '-- Requires review_policy_snapshots to contain the referenced policy_snapshot_id before import.',
    `insert into review_runs (
  id, asset_id, version_id, published_url, policy_snapshot_id, status, created_at, completed_at, error_json
) values (
  ${sqlString(normalized.run_id)},
  ${sqlString(normalized.asset_id)},
  ${sqlString(normalized.version_id)},
  ${sqlString(normalized.source_url)},
  ${sqlString(normalized.policy_snapshot_id)},
  'completed',
  ${sqlString(createdAt)},
  ${sqlString(createdAt)},
  null
) on conflict(id) do update set
  status = excluded.status,
  completed_at = excluded.completed_at,
  error_json = excluded.error_json;`,
    ...normalized.findings.map((finding) => findingSql(normalized.run_id, finding, createdAt)),
  ];
  return `${sql.join('\n\n')}\n`;
}

async function buildManifest(runId: string, entries: Array<{ artifactType: string; filePath: string; mediaType: string }>) {
  const artifacts: ArtifactManifestEntry[] = [];
  for (const entry of entries) {
    const bytes = await readFile(entry.filePath);
    artifacts.push({
      artifact_type: entry.artifactType,
      path: entry.filePath,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      byte_size: bytes.byteLength,
      media_type: entry.mediaType,
      redaction: {
        raw_bridge_token_stored: false,
        secret_like_fields_redacted: true,
      },
    });
  }

  return {
    schema_version: 'review_artifact_manifest.v0.1',
    run_id: runId,
    source_lane: 'validator_app_supplemental_results',
    created_at: new Date().toISOString(),
    artifacts,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const input = JSON.parse(await readFile(options.inputFile, 'utf8')) as unknown;
  const normalized = normalize(input, options);

  await mkdir(options.outDir, { recursive: true });
  const normalizedPath = path.join(options.outDir, 'validator-app-results-normalized.json');
  const findingsPath = path.join(options.outDir, 'validator-app-results-findings.jsonl');
  const sqlPath = path.join(options.outDir, 'validator-app-results-ledger-import.sql');
  const summaryPath = path.join(options.outDir, 'validator-app-results-normalization-summary.json');
  const manifestPath = path.join(options.outDir, 'validator-app-results-artifact-manifest.json');

  await writeFile(normalizedPath, `${JSON.stringify(normalized, null, 2)}\n`);
  await writeFile(
    findingsPath,
    `${normalized.findings.map((finding) => JSON.stringify(finding)).join('\n')}${normalized.findings.length > 0 ? '\n' : ''}`,
  );
  await writeFile(sqlPath, buildLedgerSql(normalized));
  await writeFile(
    summaryPath,
    `${JSON.stringify(
      {
        ok: true,
        run_id: normalized.run_id,
        source_url: normalized.source_url,
        result_status: normalized.result_status,
        finding_count: normalized.findings.length,
        summary: normalized.summary,
        out_dir: options.outDir,
      },
      null,
      2,
    )}\n`,
  );
  const manifest = await buildManifest(normalized.run_id, [
    { artifactType: 'validator_app_results_normalized', filePath: normalizedPath, mediaType: 'application/json' },
    { artifactType: 'validator_app_results_findings', filePath: findingsPath, mediaType: 'application/jsonl' },
    { artifactType: 'validator_app_results_ledger_sql', filePath: sqlPath, mediaType: 'text/sql' },
    { artifactType: 'validator_app_results_summary', filePath: summaryPath, mediaType: 'application/json' },
  ]);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        run_id: normalized.run_id,
        result_status: normalized.result_status,
        finding_count: normalized.findings.length,
        summary: normalized.summary,
        out_dir: options.outDir,
        manifest: manifestPath,
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
