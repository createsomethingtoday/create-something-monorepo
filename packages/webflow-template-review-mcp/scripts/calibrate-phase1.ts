import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  CONFIRMED_ASSET_FIELDS,
  CONFIRMED_VERSION_FIELDS,
  DEFAULT_AIRTABLE_BASE_ID,
  TABLE_IDS,
} from '../src/schema.js';
import { runPublishedSiteValidation } from '../src/validation.js';

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
};

type CliOptions = {
  limit: number;
  outDir: string;
  runValidation: boolean;
  maxPages: number;
  includeRawValidation: boolean;
  balanceReviewers: boolean;
  maxReviewerShare: number;
  minReviewers: number;
  fetchMultiplier: number;
};

type SelectedVersion = {
  stratum: string;
  version: AirtableRecord;
};

type BlindCase = {
  case_id: string;
  asset_id: string;
  version_id: string;
  template_name: string;
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

type Phase1Run = {
  case_id: string;
  asset_id: string;
  version_id: string;
  published_url?: string;
  recommendation: 'hard_blocker_candidate' | 'changes_requested_average' | 'clean_good_candidate' | 'manual_quality_review_required';
  confidence: 'low' | 'medium' | 'high';
  hard_blocker_candidates: string[];
  objective_findings: string[];
  quality_proxy_signals: string[];
  manual_checks_remaining: string[];
  validation_error?: unknown;
  validation?: unknown;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    limit: 25,
    outDir: '/tmp/webflow-template-review-calibration',
    runValidation: false,
    maxPages: 8,
    includeRawValidation: false,
    balanceReviewers: false,
    maxReviewerShare: 0.4,
    minReviewers: 3,
    fetchMultiplier: 6,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') {
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--limit' && next) {
      options.limit = Math.max(1, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--run-validation') {
      options.runValidation = true;
      continue;
    }
    if (arg === '--max-pages' && next) {
      options.maxPages = Math.max(1, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--include-raw-validation') {
      options.includeRawValidation = true;
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

  return options;
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp calibration:phase1 -- [options]

Options:
  --limit <n>                 Number of Asset Versions to sample. Default: 25
  --out <dir>                 Output directory. Default: /tmp/webflow-template-review-calibration
  --run-validation            Run read-only published-site validation for sampled cases.
  --max-pages <n>             Max pages for validation. Default: 8
  --include-raw-validation    Include raw validation payloads in phase1-runs.jsonl.
  --balance-reviewers         Prefer reviewer-balanced samples within each status stratum.
  --max-reviewer-share <n>    Reviewer cap for balanced samples. Default: 0.4
  --min-reviewers <n>         Warn when fewer reviewers are represented. Default: 3
  --fetch-multiplier <n>      Candidate pool multiplier per stratum. Default: 6
  --help                      Show this help.

Environment:
  AIRTABLE_API_KEY            Required Airtable PAT.
  AIRTABLE_BASE_ID            Optional; defaults to the template review base.
`);
}

function envOrThrow(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
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

function buildFormulaForStratum(stratum: string): string {
  const status = CONFIRMED_VERSION_FIELDS.reviewStatus;
  const rating = CONFIRMED_VERSION_FIELDS.qualityRating;
  const reason = CONFIRMED_VERSION_FIELDS.rejectReason;

  if (stratum === 'approved_good') {
    return `AND({${status}}='✅Approved',{${rating}}='✅Good')`;
  }
  if (stratum === 'approved_exceptional') {
    return `AND({${status}}='✅Approved',{${rating}}='🥇Exceptional')`;
  }
  if (stratum === 'rejected_low_quality') {
    return `AND({${status}}='❌Rejected',{${rating}}='❌Low quality')`;
  }
  if (stratum === 'iterative_review') {
    return `OR({${status}}='📤Changes Requested',{${status}}='🔁Response to Review')`;
  }
  if (stratum === 'policy_or_duplicate') {
    return `AND({${status}}='❌Rejected',OR({${reason}}='Duplicate submission',{${reason}}='Guideline Infringement',{${reason}}='Invalid Submission',{${reason}}='App issue'))`;
  }

  throw new Error(`Unsupported stratum: ${stratum}`);
}

function targetCounts(limit: number): Array<[string, number]> {
  const strata = ['approved_good', 'approved_exceptional', 'rejected_low_quality', 'iterative_review', 'policy_or_duplicate'];
  const base = Math.floor(limit / strata.length);
  let remainder = limit % strata.length;
  return strata.map((stratum) => {
    const count = base + (remainder > 0 ? 1 : 0);
    remainder -= 1;
    return [stratum, Math.max(1, count)];
  });
}

function reviewerForVersion(version: AirtableRecord): string {
  return collaboratorLabel(version.fields[CONFIRMED_VERSION_FIELDS.reviewOwner]) ?? '(missing reviewer)';
}

function countByReviewer(selected: Iterable<SelectedVersion>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of selected) {
    const reviewer = reviewerForVersion(item.version);
    counts[reviewer] = (counts[reviewer] ?? 0) + 1;
  }
  return counts;
}

async function selectVersions(apiKey: string, baseId: string, options: CliOptions): Promise<{ selected: SelectedVersion[]; warnings: string[] }> {
  const { limit } = options;
  const selected = new Map<string, SelectedVersion>();
  const warnings: string[] = [];
  const globalReviewerCounts: Record<string, number> = {};
  const fields = Object.values(CONFIRMED_VERSION_FIELDS);
  const globalReviewerCap = options.balanceReviewers ? Math.max(1, Math.ceil(limit * options.maxReviewerShare)) : Number.POSITIVE_INFINITY;

  for (const [stratum, target] of targetCounts(limit)) {
    const records = await listRecords({
      apiKey,
      baseId,
      tableId: TABLE_IDS.assetVersions,
      fields,
      filterByFormula: buildFormulaForStratum(stratum),
      sortField: CONFIRMED_VERSION_FIELDS.submissionDatetime,
      sortDirection: 'desc',
      limit: target * options.fetchMultiplier,
    });

    const chosenForStratum: SelectedVersion[] = [];
    const stratumReviewerCounts: Record<string, number> = {};
    const stratumReviewerCap = options.balanceReviewers ? Math.max(1, Math.ceil(target * options.maxReviewerShare)) : Number.POSITIVE_INFINITY;

    const tryAccept = (record: AirtableRecord, enforceReviewerCaps: boolean): boolean => {
      if (selected.size >= limit) return false;
      if (selected.has(record.id)) return false;
      if (chosenForStratum.length >= target) return false;

      const reviewer = reviewerForVersion(record);
      if (enforceReviewerCaps) {
        if ((stratumReviewerCounts[reviewer] ?? 0) >= stratumReviewerCap) return false;
        if ((globalReviewerCounts[reviewer] ?? 0) >= globalReviewerCap) return false;
      }

      const item = { stratum, version: record };
      selected.set(record.id, item);
      chosenForStratum.push(item);
      stratumReviewerCounts[reviewer] = (stratumReviewerCounts[reviewer] ?? 0) + 1;
      globalReviewerCounts[reviewer] = (globalReviewerCounts[reviewer] ?? 0) + 1;
      return true;
    };

    for (const record of records) {
      tryAccept(record, options.balanceReviewers);
      if (chosenForStratum.length >= target || selected.size >= limit) break;
    }

    if (chosenForStratum.length < target && options.balanceReviewers) {
      warnings.push(
        `${stratum}: reviewer-balanced pass selected ${chosenForStratum.length}/${target}; filling remainder from newest eligible records and marking sample as balance-constrained.`,
      );
      for (const record of records) {
        tryAccept(record, false);
        if (chosenForStratum.length >= target || selected.size >= limit) break;
      }
    }
  }

  const selectedRows = [...selected.values()].slice(0, limit);
  const representedReviewerCount = Object.keys(countByReviewer(selectedRows)).length;
  if (options.balanceReviewers && representedReviewerCount < options.minReviewers) {
    warnings.push(`reviewer coverage below target: ${representedReviewerCount}/${options.minReviewers} reviewers represented.`);
  }

  return { selected: selectedRows, warnings };
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

function makeCaseId(index: number): string {
  return `phase1_case_${String(index + 1).padStart(3, '0')}`;
}

function buildBlindCase(caseId: string, version: AirtableRecord, asset: AirtableRecord | undefined): BlindCase {
  return {
    case_id: caseId,
    asset_id: versionAssetId(version) ?? '',
    version_id: version.id,
    template_name: stringValue(asset?.fields[CONFIRMED_ASSET_FIELDS.name]) ?? version.id,
    published_url: stringValue(asset?.fields[CONFIRMED_ASSET_FIELDS.websiteUrl]),
    preview_url: stringValue(asset?.fields[CONFIRMED_ASSET_FIELDS.previewSiteUrl]),
    version_number: numberValue(version.fields[CONFIRMED_VERSION_FIELDS.versionNumber]),
    submitted_at: stringValue(version.fields[CONFIRMED_VERSION_FIELDS.submissionDatetime]) ?? version.createdTime,
    marketplace_status: stringValue(asset?.fields[CONFIRMED_ASSET_FIELDS.marketplaceStatus]),
    parent_latest_review_status: stringValue(asset?.fields[CONFIRMED_ASSET_FIELDS.latestReviewStatus]),
  };
}

function buildPrivateOutcome(caseId: string, selected: SelectedVersion): PrivateOutcome {
  const fields = selected.version.fields;
  return {
    case_id: caseId,
    asset_id: versionAssetId(selected.version) ?? '',
    version_id: selected.version.id,
    selection_stratum: selected.stratum,
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

function asRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item))) : [];
}

function summarizePhase1Run(blindCase: BlindCase, validation: unknown, includeRaw: boolean): Phase1Run {
  const hardBlockers: string[] = [];
  const objectiveFindings: string[] = [];
  const qualityProxySignals: string[] = [];
  const manualChecks = ['visual_quality', 'asset_licensing', 'similarity_flooding'];

  const validationRecord = validation && typeof validation === 'object' && !Array.isArray(validation) ? (validation as Record<string, unknown>) : {};
  const results = validationRecord.results && typeof validationRecord.results === 'object' ? (validationRecord.results as Record<string, unknown>) : {};
  const webflowWay = results.webflow_way && typeof results.webflow_way === 'object' ? (results.webflow_way as Record<string, unknown>) : undefined;
  const gsap = results.gsap_custom_code && typeof results.gsap_custom_code === 'object' ? (results.gsap_custom_code as Record<string, unknown>) : undefined;

  if (webflowWay?.ok === false) {
    objectiveFindings.push('wf.template.runtime.site_accessible');
  }

  for (const category of asRecords(webflowWay?.categories)) {
    const key = stringValue(category.key) ?? 'unknown';
    const errorCount = numberValue(category.errorCount) ?? 0;
    const warningCount = numberValue(category.warningCount) ?? 0;
    if (errorCount > 0) objectiveFindings.push(`webflow_way.${key}.errors:${errorCount}`);
    if (warningCount > 0) qualityProxySignals.push(`webflow_way.${key}.warnings:${warningCount}`);
  }

  const detections = gsap?.detections && typeof gsap.detections === 'object' ? (gsap.detections as Record<string, unknown>) : {};
  if (detections.legacyIx2Detected === true) {
    objectiveFindings.push('wf.template.code.no_legacy_ix2');
    manualChecks.push('ix2_policy_confirmation');
  }
  if ((numberValue(detections.securityRiskCount) ?? 0) > 0) hardBlockers.push('wf.template.code.security_risk_pattern');
  if ((numberValue(detections.flaggedCodeCount) ?? 0) > 0) objectiveFindings.push('wf.template.code.custom_code_policy_signal');

  let recommendation: Phase1Run['recommendation'] = 'clean_good_candidate';
  let confidence: Phase1Run['confidence'] = 'medium';
  if (!blindCase.published_url) {
    recommendation = 'manual_quality_review_required';
    confidence = 'low';
  } else if (hardBlockers.length > 0) {
    recommendation = 'hard_blocker_candidate';
    confidence = 'high';
  } else if (objectiveFindings.length > 0) {
    recommendation = 'changes_requested_average';
    confidence = 'medium';
  } else if (qualityProxySignals.length > 0) {
    recommendation = 'manual_quality_review_required';
    confidence = 'low';
  }

  return {
    case_id: blindCase.case_id,
    asset_id: blindCase.asset_id,
    version_id: blindCase.version_id,
    published_url: blindCase.published_url,
    recommendation,
    confidence,
    hard_blocker_candidates: hardBlockers,
    objective_findings: objectiveFindings,
    quality_proxy_signals: qualityProxySignals,
    manual_checks_remaining: manualChecks,
    ...(includeRaw ? { validation } : {}),
  };
}

async function writeJsonl(filePath: string, rows: unknown[]) {
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = envOrThrow('AIRTABLE_API_KEY');
  const baseId = process.env.AIRTABLE_BASE_ID?.trim() || DEFAULT_AIRTABLE_BASE_ID;

  await mkdir(options.outDir, { recursive: true });

  const { selected, warnings: selectionWarnings } = await selectVersions(apiKey, baseId, options);
  const assetIds = selected.map((item) => versionAssetId(item.version)).filter((id): id is string => Boolean(id));
  const assets = await fetchAssets(apiKey, baseId, assetIds);

  const blindCases: BlindCase[] = [];
  const privateOutcomes: PrivateOutcome[] = [];

  selected.forEach((item, index) => {
    const caseId = makeCaseId(index);
    const assetId = versionAssetId(item.version);
    const asset = assetId ? assets.get(assetId) : undefined;
    blindCases.push(buildBlindCase(caseId, item.version, asset));
    privateOutcomes.push(buildPrivateOutcome(caseId, item));
  });

  await writeJsonl(path.join(options.outDir, 'manifest.blind.jsonl'), blindCases);
  await writeJsonl(path.join(options.outDir, 'outcomes.private.jsonl'), privateOutcomes);

  const phase1Runs: Phase1Run[] = [];
  if (options.runValidation) {
    for (const blindCase of blindCases) {
      if (!blindCase.published_url) {
        phase1Runs.push({
          case_id: blindCase.case_id,
          asset_id: blindCase.asset_id,
          version_id: blindCase.version_id,
          recommendation: 'manual_quality_review_required',
          confidence: 'low',
          hard_blocker_candidates: [],
          objective_findings: [],
          quality_proxy_signals: [],
          manual_checks_remaining: ['published_url', 'visual_quality', 'asset_licensing', 'similarity_flooding'],
        });
        continue;
      }

      try {
        const validation = await runPublishedSiteValidation({
          published_url: blindCase.published_url,
          max_pages: options.maxPages,
          include_raw: options.includeRawValidation,
        });
        phase1Runs.push(summarizePhase1Run(blindCase, validation, options.includeRawValidation));
      } catch (error) {
        phase1Runs.push({
          case_id: blindCase.case_id,
          asset_id: blindCase.asset_id,
          version_id: blindCase.version_id,
          published_url: blindCase.published_url,
          recommendation: 'manual_quality_review_required',
          confidence: 'low',
          hard_blocker_candidates: [],
          objective_findings: ['validation.execution_failed'],
          quality_proxy_signals: [],
          manual_checks_remaining: ['visual_quality', 'asset_licensing', 'similarity_flooding'],
          validation_error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
        });
      }
    }
    await writeJsonl(path.join(options.outDir, 'phase1-runs.jsonl'), phase1Runs);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    base_id: baseId,
    out_dir: options.outDir,
    selected_count: selected.length,
    strata_counts: privateOutcomes.reduce<Record<string, number>>((counts, outcome) => {
      counts[outcome.selection_stratum] = (counts[outcome.selection_stratum] ?? 0) + 1;
      return counts;
    }, {}),
    reviewer_counts: countByReviewer(selected),
    reviewer_sampling_policy: {
      balanced: options.balanceReviewers,
      max_reviewer_share: options.balanceReviewers ? options.maxReviewerShare : undefined,
      min_reviewers: options.balanceReviewers ? options.minReviewers : undefined,
      fetch_multiplier: options.fetchMultiplier,
      use_reviewer_identity_as: 'sampling_balance_metadata_only',
      blind_manifest_excludes_reviewer: true,
    },
    selection_warnings: selectionWarnings,
    files: {
      blind_manifest: path.join(options.outDir, 'manifest.blind.jsonl'),
      private_outcomes: path.join(options.outDir, 'outcomes.private.jsonl'),
      ...(options.runValidation ? { phase1_runs: path.join(options.outDir, 'phase1-runs.jsonl') } : {}),
    },
    notes: [
      'manifest.blind.jsonl intentionally excludes review status, quality rating, reviewer, feedback, rejection reason, and selection stratum.',
      'outcomes.private.jsonl is for post-recommendation comparison only.',
      'Reviewer identity may be used to rebalance calibration samples, but never as a reviewer-specific policy branch.',
      'No Airtable writes are performed.',
    ],
  };
  await writeFile(path.join(options.outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
