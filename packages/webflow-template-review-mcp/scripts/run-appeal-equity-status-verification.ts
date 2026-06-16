import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  lookups: string[];
  lookupsFile?: string;
  trustedStatusesFile?: string;
  outDir: string;
  fetchMarketplace: boolean;
  timeoutMs: number;
};

type BlindCase = {
  case_id: string;
  asset_id?: string;
  version_id?: string;
  template_name: string;
  source_url: string;
  published_url?: string;
  marketplace_status?: string;
};

type PrivateOutcome = {
  case_id: string;
  selection_stratum?: string;
  actual_review_status?: string;
  actual_quality_rating?: string;
  reviewer?: string;
  decision_date?: string;
};

type AlignmentRow = {
  case_id: string;
  selection_stratum?: string;
  expected_review_status?: string;
  expected_quality_rating?: string;
  reviewer?: string;
};

type LookupRow = {
  lookup: string;
  claim?: string;
  source?: string;
};

type TrustedStatusRow = {
  lookup: string;
  status_verified?: boolean;
  status_label?: string;
  verification_scope?: string;
  source?: string;
  evidence_url?: string;
  note?: string;
};

type VerificationEvidence = {
  source: 'calibration_manifest' | 'private_outcome' | 'status_alignment' | 'trusted_status_file' | 'current_marketplace_http';
  status_label: string;
  verified: boolean;
  scope: 'historical_review_status' | 'current_public_listing' | 'calibration_snapshot' | 'trusted_status_export';
  note?: string;
  evidence_ref?: string;
};

type VerificationRow = {
  lookup: string;
  claim?: string;
  source?: string;
  status: 'verified' | 'unverified' | 'ambiguous';
  status_verified: boolean;
  verification_level:
    | 'trusted_or_historical_review'
    | 'current_public_listing_only'
    | 'calibration_snapshot_only'
    | 'ambiguous'
    | 'unverified';
  matched_case?: {
    case_id: string;
    template_name: string;
    source_url: string;
    published_url?: string;
    marketplace_status?: string;
    reviewer?: string;
    expected_review_status?: string;
    expected_quality_rating?: string;
    selection_stratum?: string;
  };
  candidates?: Array<{
    case_id: string;
    template_name: string;
    source_url: string;
  }>;
  evidence: VerificationEvidence[];
  caveats: string[];
};

const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-appeal-equity-status-verification';
const STOP_WORDS = new Set(['template', 'templates', 'website', 'webflow', 'html', 'cms', 'ecommerce', 'landing', 'page', 'pages', 'site']);

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    lookups: [],
    fetchMarketplace: false,
    timeoutMs: 15_000,
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
    if (arg === '--lookup' && next) {
      options.lookups = [...(options.lookups ?? []), next];
      index += 1;
      continue;
    }
    if (arg === '--lookups' && next) {
      options.lookupsFile = resolveInputFile(next);
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
    if (arg === '--fetch-marketplace') {
      options.fetchMarketplace = true;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = boundedInt(next, 1_000, 60_000, arg);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if ((options.lookups ?? []).length === 0 && !options.lookupsFile) {
    throw new Error('Provide at least one --lookup or a --lookups JSONL file.');
  }

  return {
    inputDir: options.inputDir ?? DEFAULT_INPUT_DIR,
    lookups: options.lookups ?? [],
    lookupsFile: options.lookupsFile,
    trustedStatusesFile: options.trustedStatusesFile,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    fetchMarketplace: options.fetchMarketplace ?? false,
    timeoutMs: options.timeoutMs ?? 15_000,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:verify-status -- [options]

Options:
  --input <dir>                 Calibration directory. Default: ${DEFAULT_INPUT_DIR}
  --lookup <value>              Lookup to verify. Repeatable.
  --lookups <file>              Optional JSONL rows: {"lookup":"...","claim":"approved"}.
  --trusted-statuses <file>     Optional JSONL trusted status export.
  --out <dir>                   Output directory. Default: ${DEFAULT_OUT_DIR}
  --fetch-marketplace           Optionally check current public marketplace URL reachability.
  --timeout-ms <n>              HTTP timeout for marketplace checks. Default: 15000
  --help                        Show this help.

Behavior:
  Verifies creator-cited template status against captured calibration outcomes,
  optional trusted status exports, and optional current marketplace reachability.
  Current public reachability is not treated as historical review approval.
  No Airtable, D1, R2, decisions, ratings, or creator-facing feedback are written.
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
    path.resolve(process.cwd(), '..', '..', filePath),
    path.resolve(process.cwd(), '..', '..', '..', filePath),
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

function lookupValues(row: BlindCase): string[] {
  return [
    row.case_id,
    row.asset_id,
    row.version_id,
    row.template_name,
    row.source_url,
    row.published_url,
    compactName(row.template_name),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeLookup);
}

function resolveCase(rows: BlindCase[], lookup: string): { match?: BlindCase; candidates?: BlindCase[] } {
  const normalized = normalizeLookup(lookup);
  const exact = rows.filter((row) => lookupValues(row).includes(normalized));
  if (exact.length === 1) return { match: exact[0] };
  if (exact.length > 1) return { candidates: exact };

  const lookupName = compactName(lookup);
  const lookupTokenSet = new Set(slugTokens(lookup));
  const tokenMatches = rows.filter((row) => {
    const rowName = compactName(row.template_name);
    if (!rowName) return false;
    if (lookupName === rowName) return true;
    if (lookupName.includes(rowName) && rowName.length >= 4) return true;
    const rowTokens = slugTokens(row.template_name);
    return rowTokens.length > 0 && rowTokens.every((token) => lookupTokenSet.has(token));
  });
  if (tokenMatches.length === 1) return { match: tokenMatches[0] };
  if (tokenMatches.length > 1) return { candidates: tokenMatches };

  return {};
}

function isApprovedLike(value: string | undefined): boolean {
  return (value ?? '').toLowerCase().includes('approved');
}

function isPublishedLike(value: string | undefined): boolean {
  return (value ?? '').toLowerCase().includes('published');
}

function trustedForLookup(rows: TrustedStatusRow[], lookup: string): TrustedStatusRow | undefined {
  const normalized = normalizeLookup(lookup);
  return rows.find((row) => normalizeLookup(row.lookup) === normalized);
}

function isMarketplaceUrl(lookup: string): boolean {
  try {
    const url = new URL(lookup);
    return url.hostname === 'webflow.com' || url.hostname === 'www.webflow.com';
  } catch {
    return false;
  }
}

async function fetchMarketplaceEvidence(lookup: string, timeoutMs: number): Promise<VerificationEvidence | undefined> {
  if (!isMarketplaceUrl(lookup)) return undefined;
  try {
    const response = await fetch(lookup, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      source: 'current_marketplace_http',
      status_label: `http_${response.status}`,
      verified: response.ok,
      scope: 'current_public_listing',
      evidence_ref: lookup,
      note: 'Current public reachability only; not proof of historical review status.',
    };
  } catch (error) {
    return {
      source: 'current_marketplace_http',
      status_label: 'http_error',
      verified: false,
      scope: 'current_public_listing',
      evidence_ref: lookup,
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verifyLookup(
  input: LookupRow,
  manifest: BlindCase[],
  outcomesByCaseId: Map<string, PrivateOutcome>,
  alignmentByCaseId: Map<string, AlignmentRow>,
  trustedRows: TrustedStatusRow[],
  options: CliOptions,
): Promise<VerificationRow> {
  const evidence: VerificationEvidence[] = [];
  const caveats = ['This status artifact does not make an appeal decision or produce creator-facing feedback.'];
  const resolved = resolveCase(manifest, input.lookup);
  const trusted = trustedForLookup(trustedRows, input.lookup);

  if (resolved.candidates?.length) {
    return {
      lookup: input.lookup,
      claim: input.claim,
      source: input.source,
      status: 'ambiguous',
      status_verified: false,
      verification_level: 'ambiguous',
      candidates: resolved.candidates.slice(0, 10).map((row) => ({
        case_id: row.case_id,
        template_name: row.template_name,
        source_url: row.source_url,
      })),
      evidence,
      caveats: [...caveats, 'Resolve ambiguous lookup before using this cited example in comparison.'],
    };
  }

  const match = resolved.match;
  if (trusted) {
    evidence.push({
      source: 'trusted_status_file',
      status_label: trusted.status_label ?? 'trusted_status',
      verified: trusted.status_verified === true,
      scope: 'trusted_status_export',
      evidence_ref: trusted.evidence_url ?? trusted.source,
      note: trusted.note,
    });
  }

  if (match) {
    const outcome = outcomesByCaseId.get(match.case_id);
    const alignment = alignmentByCaseId.get(match.case_id);
    evidence.push({
      source: 'calibration_manifest',
      status_label: match.marketplace_status ?? '(missing)',
      verified: isPublishedLike(match.marketplace_status),
      scope: 'calibration_snapshot',
      evidence_ref: match.case_id,
      note: 'Calibration manifest status may be stale if marketplace state changed after the run.',
    });
    if (outcome?.actual_review_status || outcome?.selection_stratum) {
      evidence.push({
        source: 'private_outcome',
        status_label: outcome.actual_review_status ?? outcome.selection_stratum ?? '(missing)',
        verified: isApprovedLike(outcome.actual_review_status) || isApprovedLike(outcome.selection_stratum),
        scope: 'historical_review_status',
        evidence_ref: match.case_id,
      });
    }
    if (alignment?.expected_review_status || alignment?.selection_stratum) {
      evidence.push({
        source: 'status_alignment',
        status_label: alignment.expected_review_status ?? alignment.selection_stratum ?? '(missing)',
        verified: isApprovedLike(alignment.expected_review_status) || isApprovedLike(alignment.selection_stratum),
        scope: 'historical_review_status',
        evidence_ref: match.case_id,
      });
    }
  }

  if (options.fetchMarketplace) {
    const fetched = await fetchMarketplaceEvidence(input.lookup, options.timeoutMs);
    if (fetched) evidence.push(fetched);
  }

  const hasTrustedOrHistorical = evidence.some(
    (row) => row.verified && (row.scope === 'trusted_status_export' || row.scope === 'historical_review_status'),
  );
  const hasCurrentPublic = evidence.some((row) => row.verified && row.scope === 'current_public_listing');
  const hasCalibrationPublished = evidence.some((row) => row.verified && row.scope === 'calibration_snapshot');
  const statusVerified = hasTrustedOrHistorical || hasCurrentPublic || hasCalibrationPublished;
  const verificationLevel = hasTrustedOrHistorical
    ? 'trusted_or_historical_review'
    : hasCurrentPublic
      ? 'current_public_listing_only'
      : hasCalibrationPublished
        ? 'calibration_snapshot_only'
        : 'unverified';

  if (hasCurrentPublic) caveats.push('Current public marketplace reachability is not proof that the template was approved at the time of the original review.');
  if (hasCalibrationPublished && !hasTrustedOrHistorical) caveats.push('Calibration marketplace status is useful context but should be refreshed before creator-facing use.');
  if (!statusVerified) caveats.push('No trusted or captured source verified the cited status.');

  return {
    lookup: input.lookup,
    claim: input.claim,
    source: input.source,
    status: statusVerified ? 'verified' : 'unverified',
    status_verified: statusVerified,
    verification_level: verificationLevel,
    matched_case: match
      ? {
          case_id: match.case_id,
          template_name: match.template_name,
          source_url: match.source_url,
          published_url: match.published_url,
          marketplace_status: match.marketplace_status,
          reviewer: outcomesByCaseId.get(match.case_id)?.reviewer ?? alignmentByCaseId.get(match.case_id)?.reviewer,
          expected_review_status: outcomesByCaseId.get(match.case_id)?.actual_review_status ?? alignmentByCaseId.get(match.case_id)?.expected_review_status,
          expected_quality_rating: outcomesByCaseId.get(match.case_id)?.actual_quality_rating ?? alignmentByCaseId.get(match.case_id)?.expected_quality_rating,
          selection_stratum: outcomesByCaseId.get(match.case_id)?.selection_stratum ?? alignmentByCaseId.get(match.case_id)?.selection_stratum,
        }
      : undefined,
    evidence,
    caveats,
  };
}

function buildMarkdown(summary: Record<string, unknown>, rows: VerificationRow[]): string {
  const lines = [
    '# Appeal Equity Status Verification',
    '',
    `Generated: ${summary.generated_at}`,
    `Input: \`${summary.input_dir}\``,
    '',
    '**Status:** Shadow verification only',
    '',
    'This artifact verifies cited-template status evidence. It does not decide appeals or write creator-facing feedback.',
    '',
    '## Summary',
    '',
    `- Lookups: ${summary.lookup_count}`,
    `- Verified: ${summary.verified_count}`,
    `- Unverified: ${summary.unverified_count}`,
    `- Ambiguous: ${summary.ambiguous_count}`,
    '',
    '## Rows',
    '',
    '| Lookup | Status | Level | Matched case | Evidence | Caveats |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of rows) {
    const evidence = row.evidence.map((item) => `${item.source}:${item.status_label}:${item.verified}`).join('<br>');
    lines.push(
      `| ${row.lookup} | ${row.status} | ${row.verification_level} | ${row.matched_case?.template_name ?? ''} ${row.matched_case?.case_id ? `(${row.matched_case.case_id})` : ''} | ${evidence} | ${row.caveats.join(' ')} |`,
    );
  }

  lines.push(
    '',
    '## Use',
    '',
    '- Use `trusted_or_historical_review` as the strongest status evidence.',
    '- Treat `current_public_listing_only` as current visibility, not historical approval.',
    '- Keep unverified or ambiguous cited status claims in human review.',
  );

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const manifest = await readJsonl<BlindCase>(path.join(options.inputDir, 'manifest.blind.jsonl'));
  const outcomes = await readJsonl<PrivateOutcome>(path.join(options.inputDir, 'outcomes.private.jsonl'));
  const alignmentRows = await readJsonl<AlignmentRow>(path.join(options.inputDir, 'status-alignment.jsonl'));
  const fileLookups = await readJsonl<LookupRow>(options.lookupsFile);
  const trustedRows = await readJsonl<TrustedStatusRow>(options.trustedStatusesFile);
  const lookupRows = [
    ...options.lookups.map((lookup) => ({ lookup })),
    ...fileLookups,
  ];

  const rows: VerificationRow[] = [];
  for (const lookup of lookupRows) {
    rows.push(
      await verifyLookup(
        lookup,
        manifest,
        new Map(outcomes.map((row) => [row.case_id, row])),
        new Map(alignmentRows.map((row) => [row.case_id, row])),
        trustedRows,
        options,
      ),
    );
  }

  const summary = {
    schema_version: 'appeal_equity_status_verification.v0.1',
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    status: 'shadow',
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      no_creator_facing_feedback: true,
      current_listing_not_historical_approval: true,
    },
    options: {
      fetch_marketplace: options.fetchMarketplace,
      trusted_statuses_file: options.trustedStatusesFile,
    },
    lookup_count: rows.length,
    verified_count: rows.filter((row) => row.status === 'verified').length,
    unverified_count: rows.filter((row) => row.status === 'unverified').length,
    ambiguous_count: rows.filter((row) => row.status === 'ambiguous').length,
    rows,
  };

  const rowsJsonl = path.join(options.outDir, 'appeal-equity-status-verification.jsonl');
  const summaryJson = path.join(options.outDir, 'appeal-equity-status-verification-summary.json');
  const summaryMarkdown = path.join(options.outDir, 'appeal-equity-status-verification-summary.md');
  await writeFile(rowsJsonl, rows.length > 0 ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : '');
  await writeFile(summaryJson, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(summaryMarkdown, buildMarkdown(summary, rows));

  console.log(
    JSON.stringify(
      {
        ok: true,
        out_dir: options.outDir,
        lookup_count: summary.lookup_count,
        verified_count: summary.verified_count,
        unverified_count: summary.unverified_count,
        ambiguous_count: summary.ambiguous_count,
        rows_jsonl: rowsJsonl,
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
