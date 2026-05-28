import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  CONFIRMED_ASSET_FIELDS,
  CONFIRMED_VERSION_FIELDS,
  DEFAULT_AIRTABLE_BASE_ID,
  TABLE_IDS,
} from '../src/schema.js';

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
};

type CliOptions = {
  rejectedLimit: number;
  approvedGoodLimit: number;
  approvedExceptionalLimit: number;
  outDir: string;
  minAliasCount: number;
};

type VisualBucket =
  | 'outdated_visual_style'
  | 'basic_or_default_layout'
  | 'weak_visual_hierarchy'
  | 'poor_typography_quality'
  | 'poor_color_palette_or_contrast'
  | 'incohesive_assets'
  | 'low_layout_variety'
  | 'saturated_category_no_differentiation'
  | 'poor_interaction_polish';

type GoldenCaseLabel =
  | 'approved_good'
  | 'approved_exceptional'
  | 'rejected_visual_quality'
  | 'rejected_technical_control'
  | 'rejected_app_or_guideline_control'
  | 'ambiguous_excluded';

type VisualQualityRow = {
  version_id: string;
  asset_id?: string;
  template_name?: string;
  published_url?: string;
  reviewer?: string;
  review_status?: string;
  quality_rating?: string;
  rejection_reason?: string;
  decision_date?: string;
  visual_signal: boolean;
  exact_outdated_signal: boolean;
  normalized_buckets: VisualBucket[];
  matched_phrases: Array<{ phrase: string; bucket: VisualBucket }>;
  feedback_snippet?: string;
};

type GoldenCaseProposal = {
  id: string;
  asset_id?: string;
  version_id: string;
  template_name?: string;
  published_url?: string;
  golden_set_version: string;
  case_label: GoldenCaseLabel;
  normalized_buckets: VisualBucket[];
  reviewer_confirmed: boolean;
  reviewer?: string;
  evidence: {
    review_status?: string;
    quality_rating?: string;
    rejection_reason?: string;
    decision_date?: string;
    feedback_snippet?: string;
  };
  status: 'proposed';
};

type AliasProposal = {
  id: string;
  raw_phrase: string;
  canonical_bucket: VisualBucket;
  reviewer?: string;
  source_count: number;
  confidence: number;
  status: 'proposed';
  example_version_ids: string[];
};

const VISUAL_BUCKET_PATTERNS: Record<VisualBucket, string[]> = {
  outdated_visual_style: [
    'outdated visual style',
    'outdated style',
    'outdated design',
    'outdated aesthetics',
    'outdated ui',
    'outdated visuals',
    'dated overall',
    'dated look',
    'modern aesthetics',
    'modern aesthetic',
    'current web trends',
    'web design trends',
    'modern web design',
    'refresh the design',
    'refreshing the design',
  ],
  basic_or_default_layout: [
    'basic layout',
    'very basic',
    'overly basic',
    'default patterns',
    'common/default',
    'common patterns',
    'default layout',
    'generic',
    'flat',
    'lacks visual interest',
    'does not introduce anything new',
    'doesn’t introduce anything new',
  ],
  weak_visual_hierarchy: [
    'visual hierarchy',
    'lacks hierarchy',
    'lack hierarchy',
    'weak hierarchy',
    'crowded',
    'cluttered',
    'spacing',
    'poorly distributed',
    'lacks clear structure',
    'lack clear structure',
  ],
  poor_typography_quality: [
    'poor typography',
    'typography',
    'font pairing',
    'font choices',
    'text too small',
    'readability',
    'legibility',
    'type scale',
    'line height',
  ],
  poor_color_palette_or_contrast: [
    'color contrast',
    'contrast',
    'color palette',
    'color palettes',
    'poor color',
    'color choices',
  ],
  incohesive_assets: [
    'incohesive',
    'not cohesive',
    'not fully cohesive',
    'lacks cohesion',
    'lack cohesion',
    'imagery mixes',
    'image styles',
    'visual assets',
    'human cutouts',
    'cutouts',
    'icons',
    'illustrations',
  ],
  low_layout_variety: [
    'layout variety',
    'too similar',
    'similar layouts',
    'repetitive',
    'same structure',
    'repeated',
    'sections feel too similar',
  ],
  saturated_category_no_differentiation: [
    'saturated',
    'not differentiated',
    'differentiation',
    'nothing new',
    'abundance of',
    'popular and saturated',
    'no unique angle',
    'not unique enough',
    'too generic for the category',
    'already well represented',
  ],
  poor_interaction_polish: [
    'poor interaction',
    'interaction polish',
    'missing interactions',
    'distracting interaction',
    'animation',
    'animations',
    'hover',
    'polish',
    'distracting',
  ],
};

const EXACT_OUTDATED_PHRASES = [
  'outdated visual style',
  'modern aesthetics',
  'current web trends',
  'web design trends',
];

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    rejectedLimit: 200,
    approvedGoodLimit: 25,
    approvedExceptionalLimit: 10,
    outDir: '/tmp/webflow-template-review-visual-quality-calibration',
    minAliasCount: 2,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--rejected-limit' && next) {
      options.rejectedLimit = Math.max(1, Number.parseInt(next, 10));
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
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--min-alias-count' && next) {
      options.minAliasCount = Math.max(1, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp calibration:visual-quality -- [options]

Options:
  --rejected-limit <n>               Rejected Asset Versions to sample. Default: 200
  --approved-good-limit <n>          Approved Good control cases. Default: 25
  --approved-exceptional-limit <n>   Approved Exceptional control cases. Default: 10
  --min-alias-count <n>              Minimum phrase count to emit alias proposal. Default: 2
  --out <dir>                        Output directory. Default: /tmp/webflow-template-review-visual-quality-calibration
  --help                             Show this help.

Environment:
  AIRTABLE_API_KEY                   Required Airtable PAT.
  AIRTABLE_BASE_ID                   Optional; defaults to the template review base.
`);
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

function stripHtml(value: unknown): string {
  const raw = stringValue(value);
  if (!raw) return '';
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function textSnippet(value: unknown, maxLength = 500): string | undefined {
  const text = stripHtml(value);
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

function selectedVersionFields() {
  const fields = CONFIRMED_VERSION_FIELDS;
  return [
    fields.assetLink,
    fields.assetRecordId,
    fields.submissionDatetime,
    fields.reviewOwner,
    fields.reviewStatus,
    fields.qualityRating,
    fields.improvementAreas,
    fields.reviewFeedback,
    fields.rejectReason,
    fields.rejectionFeedback,
    fields.decisionDate,
  ];
}

async function selectVersionRows(args: {
  apiKey: string;
  baseId: string;
  filterByFormula: string;
  limit: number;
}): Promise<AirtableRecord[]> {
  return listRecords({
    apiKey: args.apiKey,
    baseId: args.baseId,
    tableId: TABLE_IDS.assetVersions,
    fields: selectedVersionFields(),
    filterByFormula: args.filterByFormula,
    sortField: CONFIRMED_VERSION_FIELDS.decisionDate,
    sortDirection: 'desc',
    limit: args.limit,
  });
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^\w\s/-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function includesPhrase(text: string, phrase: string) {
  return normalizeSearchText(text).includes(normalizeSearchText(phrase));
}

function detectVisualBuckets(text: string): Array<{ phrase: string; bucket: VisualBucket }> {
  const matches: Array<{ phrase: string; bucket: VisualBucket }> = [];
  for (const [bucket, phrases] of Object.entries(VISUAL_BUCKET_PATTERNS) as Array<[VisualBucket, string[]]>) {
    for (const phrase of phrases) {
      if (includesPhrase(text, phrase)) matches.push({ phrase, bucket });
    }
  }
  return matches;
}

function uniqueBuckets(matches: Array<{ bucket: VisualBucket }>): VisualBucket[] {
  return [...new Set(matches.map((match) => match.bucket))];
}

function isExactOutdated(text: string) {
  return EXACT_OUTDATED_PHRASES.some((phrase) => includesPhrase(text, phrase));
}

function isUiUxReason(reason: string | undefined) {
  return includesPhrase(reason ?? '', 'ui/ux concerns');
}

function isAppOrGuidelineReason(reason: string | undefined) {
  const value = reason ?? '';
  return ['app issue', 'guideline infringement', 'invalid submission', 'duplicate submission', 'access/credentials/paywall'].some((phrase) =>
    includesPhrase(value, phrase),
  );
}

function buildVisualRow(version: AirtableRecord, asset: AirtableRecord | undefined): VisualQualityRow {
  const fields = version.fields;
  const reason = stringValue(fields[CONFIRMED_VERSION_FIELDS.rejectReason]);
  const rejectionFeedback = stripHtml(fields[CONFIRMED_VERSION_FIELDS.rejectionFeedback]);
  const reviewFeedback = stripHtml(fields[CONFIRMED_VERSION_FIELDS.reviewFeedback]);
  const combinedText = [reason, rejectionFeedback, reviewFeedback].filter(Boolean).join(' ');
  const matchedPhrases = detectVisualBuckets(combinedText);
  const normalizedBuckets = uniqueBuckets(matchedPhrases);

  return {
    version_id: version.id,
    asset_id: versionAssetId(version),
    template_name: stringValue(asset?.fields[CONFIRMED_ASSET_FIELDS.name]),
    published_url: stringValue(asset?.fields[CONFIRMED_ASSET_FIELDS.websiteUrl]),
    reviewer: collaboratorLabel(fields[CONFIRMED_VERSION_FIELDS.reviewOwner]),
    review_status: stringValue(fields[CONFIRMED_VERSION_FIELDS.reviewStatus]),
    quality_rating: stringValue(fields[CONFIRMED_VERSION_FIELDS.qualityRating]),
    rejection_reason: reason,
    decision_date: stringValue(fields[CONFIRMED_VERSION_FIELDS.decisionDate]),
    visual_signal: normalizedBuckets.length > 0 || isUiUxReason(reason),
    exact_outdated_signal: isExactOutdated(combinedText),
    normalized_buckets: normalizedBuckets,
    matched_phrases: matchedPhrases,
    feedback_snippet: textSnippet(fields[CONFIRMED_VERSION_FIELDS.rejectionFeedback]) ?? textSnippet(fields[CONFIRMED_VERSION_FIELDS.reviewFeedback]),
  };
}

function goldenCaseLabel(row: VisualQualityRow): GoldenCaseLabel {
  if (row.review_status === '✅Approved' && row.quality_rating === '✅Good') return 'approved_good';
  if (row.review_status === '✅Approved' && row.quality_rating === '🥇Exceptional') return 'approved_exceptional';
  if (row.review_status === '❌Rejected' && isAppOrGuidelineReason(row.rejection_reason)) return 'rejected_app_or_guideline_control';
  if (row.review_status === '❌Rejected' && row.visual_signal) return 'rejected_visual_quality';
  if (row.review_status === '❌Rejected') return 'rejected_technical_control';
  return 'ambiguous_excluded';
}

function buildGoldenCase(row: VisualQualityRow, goldenSetVersion: string): GoldenCaseProposal {
  const label = goldenCaseLabel(row);
  return {
    id: `${goldenSetVersion}:${row.version_id}`,
    asset_id: row.asset_id,
    version_id: row.version_id,
    template_name: row.template_name,
    published_url: row.published_url,
    golden_set_version: goldenSetVersion,
    case_label: label,
    normalized_buckets: row.normalized_buckets,
    reviewer_confirmed: label === 'rejected_visual_quality' || label === 'approved_good' || label === 'approved_exceptional',
    reviewer: row.reviewer,
    evidence: {
      review_status: row.review_status,
      quality_rating: row.quality_rating,
      rejection_reason: row.rejection_reason,
      decision_date: row.decision_date,
      feedback_snippet: row.feedback_snippet,
    },
    status: 'proposed',
  };
}

function buildAliasProposals(rows: VisualQualityRow[], minAliasCount: number): AliasProposal[] {
  const aggregate = new Map<
    string,
    {
      rawPhrase: string;
      bucket: VisualBucket;
      reviewer?: string;
      count: number;
      versionIds: Set<string>;
    }
  >();

  for (const row of rows) {
    for (const match of row.matched_phrases) {
      const key = `${match.phrase}::${match.bucket}::${row.reviewer ?? ''}`;
      const current =
        aggregate.get(key) ??
        {
          rawPhrase: match.phrase,
          bucket: match.bucket,
          reviewer: row.reviewer,
          count: 0,
          versionIds: new Set<string>(),
        };
      current.count += 1;
      current.versionIds.add(row.version_id);
      aggregate.set(key, current);
    }
  }

  return [...aggregate.values()]
    .filter((item) => item.count >= minAliasCount)
    .sort((a, b) => b.count - a.count || a.rawPhrase.localeCompare(b.rawPhrase))
    .map((item, index) => ({
      id: `visual_alias_${String(index + 1).padStart(3, '0')}`,
      raw_phrase: item.rawPhrase,
      canonical_bucket: item.bucket,
      reviewer: item.reviewer,
      source_count: item.count,
      confidence: Math.min(0.95, 0.55 + item.count * 0.05),
      status: 'proposed',
      example_version_ids: [...item.versionIds].slice(0, 10),
    }));
}

function increment(record: Record<string, number>, key: string | undefined) {
  record[key || '(missing)'] = (record[key || '(missing)'] ?? 0) + 1;
}

async function writeJsonl(filePath: string, rows: unknown[]) {
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = envOrThrow('AIRTABLE_API_KEY');
  const baseId = process.env.AIRTABLE_BASE_ID?.trim() || DEFAULT_AIRTABLE_BASE_ID;
  const fields = CONFIRMED_VERSION_FIELDS;
  const goldenSetVersion = `visual_quality_${new Date().toISOString().slice(0, 10)}`;

  await mkdir(options.outDir, { recursive: true });

  const rejected = await selectVersionRows({
    apiKey,
    baseId,
    filterByFormula: `{${fields.reviewStatus}}='❌Rejected'`,
    limit: options.rejectedLimit,
  });
  const approvedGood = await selectVersionRows({
    apiKey,
    baseId,
    filterByFormula: `AND({${fields.reviewStatus}}='✅Approved',{${fields.qualityRating}}='✅Good')`,
    limit: options.approvedGoodLimit,
  });
  const approvedExceptional = await selectVersionRows({
    apiKey,
    baseId,
    filterByFormula: `AND({${fields.reviewStatus}}='✅Approved',{${fields.qualityRating}}='🥇Exceptional')`,
    limit: options.approvedExceptionalLimit,
  });

  const allVersions = [...rejected, ...approvedGood, ...approvedExceptional];
  const assetIds = allVersions.map((version) => versionAssetId(version)).filter((id): id is string => Boolean(id));
  const assets = await fetchAssets(apiKey, baseId, assetIds);
  const normalizedRows = allVersions.map((version) => buildVisualRow(version, assets.get(versionAssetId(version) ?? '')));
  const aliasSourceRows = normalizedRows.filter((row) => goldenCaseLabel(row) === 'rejected_visual_quality');
  const aliasProposals = buildAliasProposals(aliasSourceRows, options.minAliasCount);

  const goldenCases = normalizedRows
    .map((row) => buildGoldenCase(row, goldenSetVersion))
    .filter((row) => row.case_label !== 'ambiguous_excluded');

  const bucketCounts: Record<string, number> = {};
  const reviewerCounts: Record<string, number> = {};
  const reviewerVisualCounts: Record<string, number> = {};
  const caseLabelCounts: Record<string, number> = {};
  const rejectionReasonCounts: Record<string, number> = {};

  for (const row of normalizedRows) {
    increment(reviewerCounts, row.reviewer);
    if (row.visual_signal) increment(reviewerVisualCounts, row.reviewer);
    if (row.review_status === '❌Rejected') increment(rejectionReasonCounts, row.rejection_reason);
    for (const bucket of row.normalized_buckets) increment(bucketCounts, bucket);
  }
  for (const row of goldenCases) increment(caseLabelCounts, row.case_label);

  const rejectedRows = normalizedRows.filter((row) => row.review_status === '❌Rejected');
  const visualRows = rejectedRows.filter((row) => row.visual_signal);
  const exactOutdatedRows = rejectedRows.filter((row) => row.exact_outdated_signal);
  const rejectedAppOrGuidelineRows = rejectedRows.filter((row) => isAppOrGuidelineReason(row.rejection_reason));
  const rejectedAppOrGuidelineVisualRows = rejectedAppOrGuidelineRows.filter((row) => row.visual_signal);
  const approvedRows = normalizedRows.filter((row) => row.review_status === '✅Approved');
  const approvedVisualRows = approvedRows.filter((row) => row.visual_signal);

  const summary = {
    generated_at: new Date().toISOString(),
    base_id: baseId,
    out_dir: options.outDir,
    golden_set_version: goldenSetVersion,
    sampled_counts: {
      rejected: rejected.length,
      approved_good: approvedGood.length,
      approved_exceptional: approvedExceptional.length,
      total: normalizedRows.length,
    },
    rejected_visual_signal_count: visualRows.length,
    rejected_visual_signal_rate: rejectedRows.length > 0 ? Number((visualRows.length / rejectedRows.length).toFixed(3)) : 0,
    rejected_exact_outdated_count: exactOutdatedRows.length,
    rejected_exact_outdated_rate: rejectedRows.length > 0 ? Number((exactOutdatedRows.length / rejectedRows.length).toFixed(3)) : 0,
    rejected_app_or_guideline_control_visual_signal_count: rejectedAppOrGuidelineVisualRows.length,
    rejected_app_or_guideline_control_visual_signal_rate:
      rejectedAppOrGuidelineRows.length > 0 ? Number((rejectedAppOrGuidelineVisualRows.length / rejectedAppOrGuidelineRows.length).toFixed(3)) : 0,
    approved_control_visual_signal_count: approvedVisualRows.length,
    approved_control_visual_signal_rate: approvedRows.length > 0 ? Number((approvedVisualRows.length / approvedRows.length).toFixed(3)) : 0,
    bucket_counts: bucketCounts,
    case_label_counts: caseLabelCounts,
    rejection_reason_counts: rejectionReasonCounts,
    reviewer_counts: reviewerCounts,
    reviewer_visual_counts: reviewerVisualCounts,
    alias_source_row_count: aliasSourceRows.length,
    alias_proposal_count: aliasProposals.length,
    files: {
      normalized_feedback: path.join(options.outDir, 'visual-quality-feedback.normalized.jsonl'),
      alias_proposals: path.join(options.outDir, 'visual-quality-alias-proposals.jsonl'),
      golden_case_proposals: path.join(options.outDir, 'visual-quality-golden-cases.proposed.jsonl'),
      summary: path.join(options.outDir, 'visual-quality-summary.json'),
    },
    notes: [
      'No Airtable writes are performed.',
      'Alias and golden-case outputs are proposals only; reviewer or lead approval is required before policy promotion.',
      'Visual-quality buckets are manual-quality signals, not automatic hard blockers.',
    ],
  };

  await writeJsonl(path.join(options.outDir, 'visual-quality-feedback.normalized.jsonl'), normalizedRows);
  await writeJsonl(path.join(options.outDir, 'visual-quality-alias-proposals.jsonl'), aliasProposals);
  await writeJsonl(path.join(options.outDir, 'visual-quality-golden-cases.proposed.jsonl'), goldenCases);
  await writeFile(path.join(options.outDir, 'visual-quality-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
