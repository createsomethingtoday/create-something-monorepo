import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import process from 'node:process';

import {
  CONFIRMED_ASSET_FIELDS,
  CONFIRMED_VERSION_FIELDS,
  DEFAULT_AIRTABLE_BASE_ID,
  QUALITY_RATING_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  TABLE_IDS,
} from '../src/schema.js';

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
};

type CliOptions = {
  limit: number;
  outDir: string;
  strata: string[];
  bootstrapBrowser: boolean;
  maxPages: number;
  viewports: string;
  policySnapshotId: string;
  timeoutMs: number;
  requestTimeoutMs: number;
  sandboxTimeoutMs: number;
  bootstrapTimeoutMs: number;
  commandTimeoutMs: number;
  includeCommandOutput: boolean;
  balanceReviewers: boolean;
  maxReviewerShare: number;
  minReviewers: number;
  fetchMultiplier: number;
};

type SelectedCase = {
  case_id: string;
  selection_stratum: string;
  version: AirtableRecord;
  asset: AirtableRecord;
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
  asset_id: string;
  version_id: string;
  selection_stratum: string;
  actual_review_status?: string;
  actual_quality_rating?: string;
  actual_improvement_areas: string[];
  reviewer?: string;
  review_feedback_snippet?: string;
  rejection_reason?: string;
  rejection_feedback_snippet?: string;
  decision_date?: string;
};

type CommandRecord = {
  ok: boolean;
  exitCode?: number | string;
  stdout?: string;
  stderr?: string;
  error?: string;
};

type NormalizedSummary = {
  ok?: boolean;
  run_id?: string;
  source_url?: string;
  evidence_status?: string;
  escalation_required?: boolean;
  finding_count?: number;
  out_dir?: string;
};

type NormalizedOutput = {
  rendered_summary?: {
    status?: string;
    screenshot_count?: number;
    screenshots?: string[];
  };
  findings?: Array<{
    rule_id?: string;
    severity?: string;
    status?: string;
    finding_bucket?: string;
    rejectability?: string;
  }>;
};

type SandboxResult = {
  case_id: string;
  asset_id: string;
  version_id: string;
  template_name: string;
  source_url: string;
  run_ok: boolean;
  run_summary?: unknown;
  normalized_summary?: NormalizedSummary;
  normalized_output?: {
    rendered_status?: string;
    screenshot_count: number;
    finding_count: number;
    substantive_finding_count: number;
    finding_rule_ids: string[];
    finding_buckets: string[];
  };
  command?: CommandRecord;
  artifacts: {
    run_dir: string;
    bundle_dir: string;
    normalized_dir: string;
  };
};

type CaseSelection = {
  selected: SelectedCase[];
  warnings: string[];
};

type AlignmentRow = {
  case_id: string;
  asset_id: string;
  version_id: string;
  template_name: string;
  source_url: string;
  selection_stratum: string;
  expected_review_status?: string;
  expected_quality_rating?: string;
  reviewer?: string;
  evidence_status?: string;
  rendered_status?: string;
  finding_count: number;
  substantive_finding_count: number;
  finding_rule_ids: string[];
  alignment_label: string;
  notes: string[];
};

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration';
const DEFAULT_STRATA = ['approved_good', 'rejected_low_quality', 'iterative_review'];

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    limit: 3,
    outDir: DEFAULT_OUT_DIR,
    strata: DEFAULT_STRATA,
    bootstrapBrowser: false,
    maxPages: 1,
    viewports: 'desktop:1024x768',
    policySnapshotId: 'template-review-policy.calibration',
    timeoutMs: 180_000,
    requestTimeoutMs: 180_000,
    sandboxTimeoutMs: 900_000,
    bootstrapTimeoutMs: 600_000,
    commandTimeoutMs: 1_200_000,
    includeCommandOutput: false,
    balanceReviewers: false,
    maxReviewerShare: 0.4,
    minReviewers: 3,
    fetchMultiplier: 20,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--limit' && next) {
      options.limit = boundedInt(next, 1, 100, '--limit');
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--strata' && next) {
      options.strata = next
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }
    if (arg === '--bootstrap-browser') {
      options.bootstrapBrowser = true;
      continue;
    }
    if (arg === '--max-pages' && next) {
      options.maxPages = boundedInt(next, 1, 5, '--max-pages');
      i += 1;
      continue;
    }
    if (arg === '--viewports' && next) {
      options.viewports = next;
      i += 1;
      continue;
    }
    if (arg === '--policy-snapshot-id' && next) {
      options.policySnapshotId = next;
      i += 1;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = boundedInt(next, 5_000, 600_000, '--timeout-ms');
      i += 1;
      continue;
    }
    if (arg === '--request-timeout-ms' && next) {
      options.requestTimeoutMs = boundedInt(next, 5_000, 600_000, '--request-timeout-ms');
      i += 1;
      continue;
    }
    if (arg === '--sandbox-timeout-ms' && next) {
      options.sandboxTimeoutMs = boundedInt(next, 60_000, 3_600_000, '--sandbox-timeout-ms');
      i += 1;
      continue;
    }
    if (arg === '--bootstrap-timeout-ms' && next) {
      options.bootstrapTimeoutMs = boundedInt(next, 30_000, 900_000, '--bootstrap-timeout-ms');
      i += 1;
      continue;
    }
    if (arg === '--command-timeout-ms' && next) {
      options.commandTimeoutMs = boundedInt(next, 60_000, 7_200_000, '--command-timeout-ms');
      i += 1;
      continue;
    }
    if (arg === '--include-command-output') {
      options.includeCommandOutput = true;
      continue;
    }
    if (arg === '--balance-reviewers') {
      options.balanceReviewers = true;
      continue;
    }
    if (arg === '--max-reviewer-share' && next) {
      options.maxReviewerShare = rateOption(next, arg);
      i += 1;
      continue;
    }
    if (arg === '--min-reviewers' && next) {
      options.minReviewers = boundedInt(next, 1, 100, arg);
      i += 1;
      continue;
    }
    if (arg === '--fetch-multiplier' && next) {
      options.fetchMultiplier = boundedInt(next, 1, 100, arg);
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.strata?.length) throw new Error('At least one stratum is required.');
  for (const stratum of options.strata) buildFormulaForStratum(stratum);

  return {
    limit: options.limit ?? 3,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    strata: options.strata,
    bootstrapBrowser: options.bootstrapBrowser ?? false,
    maxPages: options.maxPages ?? 1,
    viewports: options.viewports ?? 'desktop:1024x768',
    policySnapshotId: options.policySnapshotId ?? 'template-review-policy.calibration',
    timeoutMs: options.timeoutMs ?? 180_000,
    requestTimeoutMs: options.requestTimeoutMs ?? 180_000,
    sandboxTimeoutMs: options.sandboxTimeoutMs ?? 900_000,
    bootstrapTimeoutMs: options.bootstrapTimeoutMs ?? 600_000,
    commandTimeoutMs: options.commandTimeoutMs ?? 1_200_000,
    includeCommandOutput: options.includeCommandOutput ?? false,
    balanceReviewers: options.balanceReviewers ?? false,
    maxReviewerShare: options.maxReviewerShare ?? 0.4,
    minReviewers: options.minReviewers ?? 3,
    fetchMultiplier: options.fetchMultiplier ?? 20,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-calibration -- [options]

Options:
  --limit <n>                 Real Airtable cases to run. Default: 3
  --out <dir>                 Output directory. Default: ${DEFAULT_OUT_DIR}
  --strata <items>            Comma list. Default: ${DEFAULT_STRATA.join(',')}
  --bootstrap-browser         Install Playwright Chromium and browser dependencies in E2B.
  --max-pages <n>             Same-origin pages per case. Default: 1
  --viewports <items>         Viewports passed to sandbox prepare. Default: desktop:1024x768
  --policy-snapshot-id <id>   Policy snapshot label. Default: template-review-policy.calibration
  --timeout-ms <n>            Runner timeout per case. Default: 180000
  --request-timeout-ms <n>    E2B request timeout per case. Default: 180000
  --sandbox-timeout-ms <n>    E2B sandbox lifetime per case. Default: 900000
  --bootstrap-timeout-ms <n>  Browser bootstrap timeout per case. Default: 600000
  --command-timeout-ms <n>    Local child process timeout per E2B case. Default: 1200000
  --include-command-output    Include child stdout/stderr in sandbox-results.jsonl.
  --balance-reviewers         Prefer reviewer-balanced samples within each status stratum.
  --max-reviewer-share <n>    Reviewer cap for balanced samples. Default: 0.4
  --min-reviewers <n>         Warn when fewer reviewers are represented. Default: 3
  --fetch-multiplier <n>      Candidate pool multiplier per stratum. Default: 20
  --help                      Show this help.

Environment:
  AIRTABLE_API_KEY            Required Airtable PAT.
  AIRTABLE_BASE_ID            Optional; defaults to the template review base.
  E2B_API_KEY                 Required for direct E2B, unless DIFY_E2B_API_KEY is present.
  DIFY_E2B_API_KEY            Fallback direct E2B key.

Behavior:
  Samples private Airtable Asset Version outcomes, runs published-site evidence
  collection in direct E2B, and writes comparison artifacts. It does not write
  Airtable, D1, R2, Dify, approvals, rejections, ratings, or feedback.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function rateOption(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    throw new Error(`${flag} must be a number greater than 0 and less than or equal to 1.`);
  }
  return parsed;
}

function envOrThrow(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => stringValue(item)).filter((item): item is string => Boolean(item));
}

function collaboratorLabel(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.map(collaboratorLabel).filter(Boolean).join(', ') || undefined;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return stringValue(record.name) ?? stringValue(record.email) ?? stringValue(record.id);
  }
  return stringValue(value);
}

function textSnippet(value: unknown, maxLength = 500): string | undefined {
  const raw = stringValue(value);
  if (!raw) return undefined;
  const text = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, maxLength) : undefined;
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

function statusOption(label: string): string {
  const option = REVIEW_STATUS_OPTIONS.find((value) => value.toLowerCase().includes(label.toLowerCase()));
  if (!option) throw new Error(`Missing review status option containing "${label}".`);
  return option;
}

function qualityOption(label: string): string {
  const option = QUALITY_RATING_OPTIONS.find((value) => value.toLowerCase().includes(label.toLowerCase()));
  if (!option) throw new Error(`Missing quality rating option containing "${label}".`);
  return option;
}

function fieldEquals(field: string, value: string): string {
  return `{${field}}='${escapeFormulaValue(value)}'`;
}

function buildFormulaForStratum(stratum: string): string {
  const status = CONFIRMED_VERSION_FIELDS.reviewStatus;
  const rating = CONFIRMED_VERSION_FIELDS.qualityRating;
  const reason = CONFIRMED_VERSION_FIELDS.rejectReason;
  const approved = statusOption('Approved');
  const rejected = statusOption('Rejected');
  const changesRequested = statusOption('Changes Requested');
  const responseToReview = statusOption('Response to Review');
  const good = qualityOption('Good');
  const exceptional = qualityOption('Exceptional');
  const lowQuality = qualityOption('Low quality');

  if (stratum === 'approved_good') {
    return `AND(${fieldEquals(status, approved)},${fieldEquals(rating, good)})`;
  }
  if (stratum === 'approved_exceptional') {
    return `AND(${fieldEquals(status, approved)},${fieldEquals(rating, exceptional)})`;
  }
  if (stratum === 'rejected_low_quality') {
    return `AND(${fieldEquals(status, rejected)},${fieldEquals(rating, lowQuality)})`;
  }
  if (stratum === 'iterative_review') {
    return `OR(${fieldEquals(status, changesRequested)},${fieldEquals(status, responseToReview)})`;
  }
  if (stratum === 'policy_or_duplicate') {
    return `AND(${fieldEquals(status, rejected)},OR(${fieldEquals(reason, 'Duplicate submission')},${fieldEquals(
      reason,
      'Guideline Infringement',
    )},${fieldEquals(reason, 'Invalid Submission')},${fieldEquals(reason, 'App issue')}))`;
  }

  throw new Error(`Unsupported stratum: ${stratum}`);
}

function targetCounts(limit: number, strata: string[]): Array<[string, number]> {
  const base = Math.floor(limit / strata.length);
  let remainder = limit % strata.length;
  return strata
    .map((stratum) => {
      const count = base + (remainder > 0 ? 1 : 0);
      remainder -= 1;
      return [stratum, count] as [string, number];
    })
    .filter(([, count]) => count > 0);
}

async function listRecords(args: {
  apiKey: string;
  baseId: string;
  tableId: string;
  fields?: string[];
  filterByFormula?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
}): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${args.baseId}/${args.tableId}`);
    const remaining = args.limit ? Math.max(args.limit - records.length, 0) : undefined;
    url.searchParams.set('pageSize', String(remaining ? Math.min(100, remaining) : 100));
    if (args.limit) url.searchParams.set('maxRecords', String(args.limit));
    if (offset) url.searchParams.set('offset', offset);
    if (args.filterByFormula) url.searchParams.set('filterByFormula', args.filterByFormula);
    if (args.sortField) {
      url.searchParams.set('sort[0][field]', args.sortField);
      url.searchParams.set('sort[0][direction]', args.sortDirection ?? 'asc');
    }
    for (const field of args.fields ?? []) url.searchParams.append('fields[]', field);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Airtable list failed (${response.status}): ${body.slice(0, 500)}`);
    }

    const data = (await response.json()) as { records?: AirtableRecord[]; offset?: string };
    records.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset && (!args.limit || records.length < args.limit));

  return args.limit ? records.slice(0, args.limit) : records;
}

async function fetchAssets(apiKey: string, baseId: string, assetIds: string[]): Promise<Map<string, AirtableRecord>> {
  const assets = new Map<string, AirtableRecord>();
  const uniqueIds = [...new Set(assetIds)].filter(Boolean);
  const fields = Object.values(CONFIRMED_ASSET_FIELDS);

  for (let i = 0; i < uniqueIds.length; i += 40) {
    const batch = uniqueIds.slice(i, i + 40);
    const formula = `OR(${batch.map((id) => `RECORD_ID()='${escapeFormulaValue(id)}'`).join(',')})`;
    const records = await listRecords({
      apiKey,
      baseId,
      tableId: TABLE_IDS.assets,
      fields,
      filterByFormula: formula,
      limit: batch.length,
    });
    for (const record of records) assets.set(record.id, record);
  }

  return assets;
}

function versionAssetId(version: AirtableRecord): string | undefined {
  return (
    stringValue(version.fields[CONFIRMED_VERSION_FIELDS.assetRecordId]) ??
    stringArray(version.fields[CONFIRMED_VERSION_FIELDS.assetLink])[0]
  );
}

function publicHttpsUrl(value: unknown): string | undefined {
  const raw = stringValue(value);
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return undefined;
    if (isPrivateHostname(parsed.hostname.toLowerCase())) return undefined;
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function isPrivateHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function caseId(index: number): string {
  return `e2b_calibration_case_${String(index + 1).padStart(3, '0')}`;
}

function reviewerForVersion(version: AirtableRecord): string {
  return collaboratorLabel(version.fields[CONFIRMED_VERSION_FIELDS.reviewOwner]) ?? '(missing reviewer)';
}

function countCasesByReviewer(selected: Iterable<SelectedCase>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of selected) {
    const reviewer = reviewerForVersion(item.version);
    counts[reviewer] = (counts[reviewer] ?? 0) + 1;
  }
  return counts;
}

async function selectCases(apiKey: string, baseId: string, options: CliOptions): Promise<CaseSelection> {
  const selected: SelectedCase[] = [];
  const seenVersions = new Set<string>();
  const warnings: string[] = [];
  const globalReviewerCounts: Record<string, number> = {};
  const globalReviewerCap = options.balanceReviewers
    ? Math.max(1, Math.ceil(options.limit * options.maxReviewerShare))
    : Number.POSITIVE_INFINITY;
  const counts = targetCounts(options.limit, options.strata);
  const versionFields = Object.values(CONFIRMED_VERSION_FIELDS);

  for (const [stratum, target] of counts) {
    const candidates = await listRecords({
      apiKey,
      baseId,
      tableId: TABLE_IDS.assetVersions,
      fields: versionFields,
      filterByFormula: buildFormulaForStratum(stratum),
      sortField: CONFIRMED_VERSION_FIELDS.submissionDatetime,
      sortDirection: 'desc',
      limit: Math.max(target * options.fetchMultiplier, 20),
    });
    const assetIds = candidates.map(versionAssetId).filter((id): id is string => Boolean(id));
    const assets = await fetchAssets(apiKey, baseId, assetIds);
    const selectedForStratum: SelectedCase[] = [];
    const stratumReviewerCounts: Record<string, number> = {};
    const stratumReviewerCap = options.balanceReviewers
      ? Math.max(1, Math.ceil(target * options.maxReviewerShare))
      : Number.POSITIVE_INFINITY;

    const tryAccept = (version: AirtableRecord, enforceReviewerCaps: boolean): boolean => {
      if (selected.length >= options.limit) return false;
      if (selectedForStratum.length >= target) return false;
      if (seenVersions.has(version.id)) return false;
      const assetId = versionAssetId(version);
      const asset = assetId ? assets.get(assetId) : undefined;
      if (!asset) return false;
      const sourceUrl =
        publicHttpsUrl(asset.fields[CONFIRMED_ASSET_FIELDS.websiteUrl]) ??
        publicHttpsUrl(asset.fields[CONFIRMED_ASSET_FIELDS.previewSiteUrl]);
      if (!sourceUrl) return false;

      const reviewer = reviewerForVersion(version);
      if (enforceReviewerCaps) {
        if ((stratumReviewerCounts[reviewer] ?? 0) >= stratumReviewerCap) return false;
        if ((globalReviewerCounts[reviewer] ?? 0) >= globalReviewerCap) return false;
      }

      seenVersions.add(version.id);
      const selectedCase = {
        case_id: caseId(selected.length),
        selection_stratum: stratum,
        version,
        asset,
      };
      selected.push(selectedCase);
      selectedForStratum.push(selectedCase);
      stratumReviewerCounts[reviewer] = (stratumReviewerCounts[reviewer] ?? 0) + 1;
      globalReviewerCounts[reviewer] = (globalReviewerCounts[reviewer] ?? 0) + 1;
      return true;
    };

    for (const version of candidates) {
      tryAccept(version, options.balanceReviewers);
      if (selected.length >= options.limit || selectedForStratum.length >= target) break;
    }

    if (selectedForStratum.length < target && options.balanceReviewers) {
      warnings.push(
        `${stratum}: reviewer-balanced pass selected ${selectedForStratum.length}/${target}; filling remainder from newest eligible records and marking sample as balance-constrained.`,
      );
      for (const version of candidates) {
        tryAccept(version, false);
        if (selected.length >= options.limit || selectedForStratum.length >= target) break;
      }
    }
    if (selected.length >= options.limit) break;
  }

  const representedReviewerCount = Object.keys(countCasesByReviewer(selected)).length;
  if (options.balanceReviewers && representedReviewerCount < options.minReviewers) {
    warnings.push(`reviewer coverage below target: ${representedReviewerCount}/${options.minReviewers} reviewers represented.`);
  }

  return { selected, warnings };
}

function buildBlindCase(selected: SelectedCase): BlindCase {
  const assetId = versionAssetId(selected.version) ?? '';
  const publishedUrl = publicHttpsUrl(selected.asset.fields[CONFIRMED_ASSET_FIELDS.websiteUrl]);
  const previewUrl = publicHttpsUrl(selected.asset.fields[CONFIRMED_ASSET_FIELDS.previewSiteUrl]);
  const sourceUrl = publishedUrl ?? previewUrl;
  if (!sourceUrl) throw new Error(`Selected case ${selected.case_id} does not have a public https URL.`);

  return {
    case_id: selected.case_id,
    asset_id: assetId,
    version_id: selected.version.id,
    template_name: stringValue(selected.asset.fields[CONFIRMED_ASSET_FIELDS.name]) ?? selected.version.id,
    source_url: sourceUrl,
    published_url: publishedUrl,
    preview_url: previewUrl,
    version_number: numberValue(selected.version.fields[CONFIRMED_VERSION_FIELDS.versionNumber]),
    submitted_at: stringValue(selected.version.fields[CONFIRMED_VERSION_FIELDS.submissionDatetime]) ?? selected.version.createdTime,
    marketplace_status: stringValue(selected.asset.fields[CONFIRMED_ASSET_FIELDS.marketplaceStatus]),
    parent_latest_review_status: stringValue(selected.asset.fields[CONFIRMED_ASSET_FIELDS.latestReviewStatus]),
  };
}

function buildPrivateOutcome(selected: SelectedCase): PrivateOutcome {
  const fields = selected.version.fields;
  return {
    case_id: selected.case_id,
    asset_id: versionAssetId(selected.version) ?? '',
    version_id: selected.version.id,
    selection_stratum: selected.selection_stratum,
    actual_review_status: stringValue(fields[CONFIRMED_VERSION_FIELDS.reviewStatus]),
    actual_quality_rating: stringValue(fields[CONFIRMED_VERSION_FIELDS.qualityRating]),
    actual_improvement_areas: stringArray(fields[CONFIRMED_VERSION_FIELDS.improvementAreas]),
    reviewer: collaboratorLabel(fields[CONFIRMED_VERSION_FIELDS.reviewOwner]),
    review_feedback_snippet: textSnippet(fields[CONFIRMED_VERSION_FIELDS.reviewFeedback]),
    rejection_reason: stringValue(fields[CONFIRMED_VERSION_FIELDS.rejectReason]),
    rejection_feedback_snippet: textSnippet(fields[CONFIRMED_VERSION_FIELDS.rejectionFeedback]),
    decision_date: stringValue(fields[CONFIRMED_VERSION_FIELDS.decisionDate]),
  };
}

async function writeJsonl(filePath: string, rows: unknown[]) {
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}${rows.length ? '\n' : ''}`);
}

async function optionalJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

async function optionalJsonl<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

function commandRecordFromError(error: unknown): CommandRecord {
  const maybe = error as { code?: number | string; signal?: string; stdout?: string; stderr?: string };
  return {
    ok: false,
    exitCode: maybe.code ?? maybe.signal,
    stdout: typeof maybe.stdout === 'string' ? maybe.stdout : undefined,
    stderr: typeof maybe.stderr === 'string' ? maybe.stderr : undefined,
    error: error instanceof Error ? error.message : String(error),
  };
}

async function runNodeScript(script: string, args: string[], cwd: string, timeoutMs: number): Promise<CommandRecord> {
  try {
    const result = await execFileAsync(process.execPath, ['--import', 'tsx', script, ...args], {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 20 * 1024 * 1024,
      env: process.env,
    });
    return {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    return commandRecordFromError(error);
  }
}

function isSubstantiveFinding(finding: NonNullable<NormalizedOutput['findings']>[number]): boolean {
  const severity = finding.severity ?? '';
  const rejectability = finding.rejectability ?? '';
  return (
    (severity === 'critical' || severity === 'major') &&
    rejectability.startsWith('candidate_signal') &&
    finding.status !== 'partial' &&
    finding.status !== 'error'
  );
}

async function runSandboxCase(blindCase: BlindCase, options: CliOptions): Promise<SandboxResult> {
  const runDir = path.join(options.outDir, 'runs', blindCase.case_id);
  const bundleDir = path.join(runDir, 'bundle');
  const e2bOutDir = path.join(runDir, 'e2b');
  const prepareCommand = await runNodeScript(
    path.join(SCRIPT_DIR, 'prepare-published-site-sandbox-run.ts'),
    [
      '--url',
      blindCase.source_url,
      '--out',
      bundleDir,
      '--run-id',
      blindCase.case_id,
      '--policy-snapshot-id',
      options.policySnapshotId,
      '--sandbox-provider',
      'direct_e2b',
      '--max-pages',
      String(options.maxPages),
      '--viewports',
      options.viewports,
      '--timeout-ms',
      String(Math.min(options.timeoutMs, 120_000)),
    ],
    path.dirname(SCRIPT_DIR),
    120_000,
  );

  if (!prepareCommand.ok) {
    return {
      case_id: blindCase.case_id,
      asset_id: blindCase.asset_id,
      version_id: blindCase.version_id,
      template_name: blindCase.template_name,
      source_url: blindCase.source_url,
      run_ok: false,
      command: options.includeCommandOutput ? prepareCommand : { ok: false, exitCode: prepareCommand.exitCode, error: prepareCommand.error },
      artifacts: {
        run_dir: runDir,
        bundle_dir: bundleDir,
        normalized_dir: path.join(e2bOutDir, 'normalized'),
      },
    };
  }

  const e2bArgs = [
    '--bundle-dir',
    bundleDir,
    '--out',
    e2bOutDir,
    '--normalize',
    '--asset-id',
    blindCase.asset_id,
    '--version-id',
    blindCase.version_id,
    '--policy-snapshot-id',
    options.policySnapshotId,
    '--timeout-ms',
    String(options.timeoutMs),
    '--request-timeout-ms',
    String(options.requestTimeoutMs),
    '--sandbox-timeout-ms',
    String(options.sandboxTimeoutMs),
    '--bootstrap-timeout-ms',
    String(options.bootstrapTimeoutMs),
  ];
  if (options.bootstrapBrowser) e2bArgs.push('--bootstrap-browser');

  const command = await runNodeScript(
    path.join(SCRIPT_DIR, 'run-published-site-e2b-sandbox.ts'),
    e2bArgs,
    path.dirname(SCRIPT_DIR),
    options.commandTimeoutMs,
  );
  const normalizedDir = path.join(e2bOutDir, 'normalized');
  const runSummary = await optionalJson<unknown>(path.join(e2bOutDir, 'published-site-sandbox-e2b-run-summary.json'));
  const normalizedSummary = await optionalJson<NormalizedSummary>(
    path.join(normalizedDir, 'published-site-sandbox-normalization-summary.json'),
  );
  const normalized = await optionalJson<NormalizedOutput>(path.join(normalizedDir, 'published-site-sandbox-normalized.json'));
  const findings = await optionalJsonl<NonNullable<NormalizedOutput['findings']>[number]>(
    path.join(normalizedDir, 'published-site-sandbox-findings.jsonl'),
  );
  const findingRuleIds = [...new Set(findings.map((finding) => finding.rule_id).filter((value): value is string => Boolean(value)))];
  const findingBuckets = [
    ...new Set(findings.map((finding) => finding.finding_bucket).filter((value): value is string => Boolean(value))),
  ];
  const substantiveFindingCount = findings.filter(isSubstantiveFinding).length;
  const screenshots = normalized?.rendered_summary?.screenshots ?? [];

  return {
    case_id: blindCase.case_id,
    asset_id: blindCase.asset_id,
    version_id: blindCase.version_id,
    template_name: blindCase.template_name,
    source_url: blindCase.source_url,
    run_ok: command.ok && Boolean(normalizedSummary),
    run_summary: runSummary,
    normalized_summary: normalizedSummary,
    normalized_output: {
      rendered_status: normalized?.rendered_summary?.status,
      screenshot_count: screenshots.length,
      finding_count: findings.length,
      substantive_finding_count: substantiveFindingCount,
      finding_rule_ids: findingRuleIds,
      finding_buckets: findingBuckets,
    },
    command: options.includeCommandOutput ? command : { ok: command.ok, exitCode: command.exitCode, error: command.error },
    artifacts: {
      run_dir: runDir,
      bundle_dir: bundleDir,
      normalized_dir: normalizedDir,
    },
  };
}

function statusKind(status: string | undefined): 'approved' | 'rejected' | 'iterative' | 'other' {
  const normalized = status?.toLowerCase() ?? '';
  if (normalized.includes('approved')) return 'approved';
  if (normalized.includes('rejected')) return 'rejected';
  if (normalized.includes('changes requested') || normalized.includes('response to review')) return 'iterative';
  return 'other';
}

function alignResult(outcome: PrivateOutcome, result: SandboxResult): AlignmentRow {
  const evidenceStatus = result.normalized_summary?.evidence_status;
  const findingCount = result.normalized_output?.finding_count ?? result.normalized_summary?.finding_count ?? 0;
  const substantiveFindingCount = result.normalized_output?.substantive_finding_count ?? 0;
  const findingRuleIds = result.normalized_output?.finding_rule_ids ?? [];
  const notes: string[] = [];
  let alignmentLabel = 'sandbox_inconclusive';

  if (!result.run_ok) {
    alignmentLabel = 'sandbox_execution_failed';
    notes.push('No normalized sandbox result was produced.');
  } else if (evidenceStatus !== 'usable') {
    alignmentLabel = 'sandbox_inconclusive_partial_evidence';
    notes.push('Partial or unusable sandbox evidence cannot explain a human decision.');
  } else {
    const kind = statusKind(outcome.actual_review_status);
    if (kind === 'approved' && substantiveFindingCount === 0) {
      alignmentLabel = findingCount === 0 ? 'sandbox_consistent_with_approved_clean_evidence' : 'sandbox_minor_signals_on_approved_case';
      if (findingCount > 0) notes.push('Minor sandbox signals do not explain or contradict the approved status.');
    } else if (kind === 'approved') {
      alignmentLabel = 'sandbox_found_substantive_signal_on_approved_case';
      notes.push('Approved cases with substantive sandbox findings should be reviewed for false-positive thresholds.');
    } else if (kind === 'rejected' && substantiveFindingCount > 0) {
      alignmentLabel = 'sandbox_found_substantive_signal_for_rejected_case';
    } else if (kind === 'rejected') {
      alignmentLabel = 'sandbox_did_not_explain_human_rejection';
      notes.push('No sandbox finding explains the rejected status; likely subjective quality, policy context, or missing artifact lane.');
    } else if (kind === 'iterative' && substantiveFindingCount > 0) {
      alignmentLabel = 'sandbox_supports_iterative_review_signal';
    } else if (kind === 'iterative') {
      alignmentLabel = 'sandbox_did_not_explain_iterative_review';
      notes.push('No sandbox finding explains changes-requested status; compare against reviewer feedback and visual-quality lanes.');
    } else {
      alignmentLabel = 'human_status_unmapped';
      notes.push('Human status is outside the initial calibration labels.');
    }
  }

  return {
    case_id: outcome.case_id,
    asset_id: outcome.asset_id,
    version_id: outcome.version_id,
    template_name: result.template_name,
    source_url: result.source_url,
    selection_stratum: outcome.selection_stratum,
    expected_review_status: outcome.actual_review_status,
    expected_quality_rating: outcome.actual_quality_rating,
    reviewer: outcome.reviewer,
    evidence_status: evidenceStatus,
    rendered_status: result.normalized_output?.rendered_status,
    finding_count: findingCount,
    substantive_finding_count: substantiveFindingCount,
    finding_rule_ids: findingRuleIds,
    alignment_label: alignmentLabel,
    notes,
  };
}

function countBy<T extends string>(rows: T[]): Record<T, number> {
  return rows.reduce<Record<T, number>>((counts, item) => {
    counts[item] = (counts[item] ?? 0) + 1;
    return counts;
  }, {} as Record<T, number>);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = envOrThrow('AIRTABLE_API_KEY');
  const baseId = process.env.AIRTABLE_BASE_ID?.trim() || DEFAULT_AIRTABLE_BASE_ID;

  if (!process.env.E2B_API_KEY && !process.env.DIFY_E2B_API_KEY) {
    throw new Error('Missing E2B_API_KEY or DIFY_E2B_API_KEY for direct E2B calibration.');
  }

  await mkdir(options.outDir, { recursive: true });
  const { selected, warnings: selectionWarnings } = await selectCases(apiKey, baseId, options);
  if (selected.length === 0) throw new Error('No Airtable cases with public https URLs were selected.');

  const blindCases = selected.map(buildBlindCase);
  const outcomes = selected.map(buildPrivateOutcome);
  await writeJsonl(path.join(options.outDir, 'manifest.blind.jsonl'), blindCases);
  await writeJsonl(path.join(options.outDir, 'outcomes.private.jsonl'), outcomes);

  const results: SandboxResult[] = [];
  const alignments: AlignmentRow[] = [];
  for (const blindCase of blindCases) {
    const result = await runSandboxCase(blindCase, options);
    results.push(result);
    const outcome = outcomes.find((item) => item.case_id === blindCase.case_id);
    if (outcome) alignments.push(alignResult(outcome, result));
    await writeJsonl(path.join(options.outDir, 'sandbox-results.jsonl'), results);
    await writeJsonl(path.join(options.outDir, 'status-alignment.jsonl'), alignments);
  }

  const evidenceStatuses = results.map((result) => result.normalized_summary?.evidence_status ?? 'missing');
  const alignmentLabels = alignments.map((row) => row.alignment_label);
  const summary = {
    generated_at: new Date().toISOString(),
    base_id: baseId,
    out_dir: options.outDir,
    selected_count: selected.length,
    requested_limit: options.limit,
    strata_counts: countBy(outcomes.map((outcome) => outcome.selection_stratum)),
    reviewer_counts: countCasesByReviewer(selected),
    reviewer_sampling_policy: {
      balanced: options.balanceReviewers,
      max_reviewer_share: options.balanceReviewers ? options.maxReviewerShare : undefined,
      min_reviewers: options.balanceReviewers ? options.minReviewers : undefined,
      fetch_multiplier: options.fetchMultiplier,
      use_reviewer_identity_as: 'sampling_balance_metadata_only',
      blind_manifest_excludes_reviewer: true,
    },
    selection_warnings: selectionWarnings,
    evidence_status_counts: countBy(evidenceStatuses),
    alignment_counts: countBy(alignmentLabels),
    screenshot_count: results.reduce((total, result) => total + (result.normalized_output?.screenshot_count ?? 0), 0),
    finding_count: results.reduce((total, result) => total + (result.normalized_output?.finding_count ?? 0), 0),
    options: {
      bootstrap_browser: options.bootstrapBrowser,
      max_pages: options.maxPages,
      viewports: options.viewports,
      policy_snapshot_id: options.policySnapshotId,
    },
    files: {
      blind_manifest: path.join(options.outDir, 'manifest.blind.jsonl'),
      private_outcomes: path.join(options.outDir, 'outcomes.private.jsonl'),
      sandbox_results: path.join(options.outDir, 'sandbox-results.jsonl'),
      status_alignment: path.join(options.outDir, 'status-alignment.jsonl'),
    },
    notes: [
      'This calibration artifact is private because it joins sandbox evidence to human outcomes.',
      'Alignment labels are diagnostic only and must not be used as creator-facing decisions.',
      'Reviewer identity may be used to rebalance calibration samples, but never as a reviewer-specific policy branch.',
      'No Airtable, D1, R2, Dify, approval, rejection, rating, or feedback writes are performed.',
    ],
  };
  await writeFile(path.join(options.outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
