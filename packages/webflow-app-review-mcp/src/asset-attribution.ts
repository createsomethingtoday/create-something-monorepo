import type { FetchFn } from './airtable.js';
import { DEFAULT_AIRTABLE_BASE_ID, FIELD_IDS, TABLE_IDS } from './schema.js';

export const ASSET_ATTRIBUTION_ERROR_STATUS = '🚨Error: Field Missing (Email, Type, etc.)';
export const ASSET_ATTRIBUTION_READY_STATUS = '🆕Ready for Review';
export const ASSET_ATTRIBUTION_REVIEW_TYPE = 'Asset Update';
export const DEFAULT_ASSET_ATTRIBUTION_LOOKBACK_HOURS = 72;
export const DEFAULT_ASSET_ATTRIBUTION_START_AT = '2026-05-29T00:00:00.000Z';

export const ASSET_ATTRIBUTION_FIELD_NAMES = {
  asset: '👛Asset',
  appId: '❓app id',
  createdAt: '📅CRT',
  reviewStatus: '📝Review Status',
  reviewType: '📝Review Type',
  tmpuid: '⚙️TMPUID',
  workspaceId: '❓workspace id'
} as const;

type AssetAttributionFieldName =
  (typeof ASSET_ATTRIBUTION_FIELD_NAMES)[keyof typeof ASSET_ATTRIBUTION_FIELD_NAMES];

export interface AssetAttributionSyncOptions {
  apiKey: string;
  baseId?: string;
  fetchFn?: FetchFn;
  now?: Date;
  lookbackHours?: number;
  startAt?: string | Date | null;
  maxCandidates?: number;
}

export interface AssetAttributionUpdate {
  versionId: string;
  assetId: string;
  matchedFromVersionId: string;
  tmpuid: string;
  appId: string;
  workspaceId: string;
}

export interface AssetAttributionSkip {
  versionId: string;
  tmpuid?: string;
  appId?: string;
  workspaceId?: string;
  reason:
    | 'ambiguous_asset_link'
    | 'missing_identity'
    | 'missing_submission_datetime'
    | 'no_exact_asset_version_match';
}

export interface AssetAttributionSyncSummary {
  ok: true;
  baseId: string;
  submittedAfter: string;
  candidates: number;
  updated: number;
  skipped: AssetAttributionSkip[];
  updates: AssetAttributionUpdate[];
}

interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

interface AirtableUpdateResponse {
  records: AirtableRecord[];
}

interface CandidateRecord {
  id: string;
  tmpuid?: string;
  appId?: string;
  workspaceId?: string;
  submittedAt?: Date;
}

interface MatchedAsset {
  assetId: string;
  matchedFromVersionId: string;
}

const ATTRIBUTION_FIELD_NAMES = Object.values(ASSET_ATTRIBUTION_FIELD_NAMES);
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function assertPositiveFiniteNumber(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "''");
}

function formulaField(name: AssetAttributionFieldName): string {
  return `{${name}}`;
}

function readStringField(
  record: AirtableRecord,
  fieldName: AssetAttributionFieldName
): string | undefined {
  const value = record.fields[fieldName];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readLinkedRecordIds(
  record: AirtableRecord,
  fieldName: AssetAttributionFieldName
): string[] {
  const value = record.fields[fieldName];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function parseOptionalDate(
  value: string | Date | null | undefined,
  name: string
): Date | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`${name} must be a valid date.`);
  }
  return date;
}

export function resolveAssetAttributionSubmittedAfter(
  args: {
    now?: Date;
    lookbackHours?: number;
    startAt?: string | Date | null;
  } = {}
): Date {
  const now = args.now ?? new Date();
  if (!Number.isFinite(now.getTime())) {
    throw new Error('now must be a valid date.');
  }

  const lookbackHours = args.lookbackHours ?? DEFAULT_ASSET_ATTRIBUTION_LOOKBACK_HOURS;
  assertPositiveFiniteNumber(lookbackHours, 'lookbackHours');

  const rollingCutoff = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
  const startAt = parseOptionalDate(args.startAt ?? DEFAULT_ASSET_ATTRIBUTION_START_AT, 'startAt');
  if (!startAt) return rollingCutoff;
  return startAt.getTime() > rollingCutoff.getTime() ? startAt : rollingCutoff;
}

function buildTargetFormula(submittedAfter: Date): string {
  return [
    'AND(',
    `  ${formulaField(ASSET_ATTRIBUTION_FIELD_NAMES.reviewStatus)} = '${escapeFormulaValue(ASSET_ATTRIBUTION_ERROR_STATUS)}',`,
    `  ${formulaField(ASSET_ATTRIBUTION_FIELD_NAMES.reviewType)} = '${escapeFormulaValue(ASSET_ATTRIBUTION_REVIEW_TYPE)}',`,
    `  NOT(${formulaField(ASSET_ATTRIBUTION_FIELD_NAMES.asset)}),`,
    `  IS_AFTER(${formulaField(ASSET_ATTRIBUTION_FIELD_NAMES.createdAt)}, DATETIME_PARSE('${submittedAfter.toISOString()}'))`,
    ')'
  ].join('\n');
}

function buildExactHistoryFormula(
  candidate: Required<Pick<CandidateRecord, 'tmpuid' | 'appId' | 'workspaceId'>>
): string {
  return [
    'AND(',
    `  ${formulaField(ASSET_ATTRIBUTION_FIELD_NAMES.reviewType)} = '${escapeFormulaValue(ASSET_ATTRIBUTION_REVIEW_TYPE)}',`,
    `  ${formulaField(ASSET_ATTRIBUTION_FIELD_NAMES.tmpuid)} = '${escapeFormulaValue(candidate.tmpuid)}',`,
    `  ${formulaField(ASSET_ATTRIBUTION_FIELD_NAMES.appId)} = '${escapeFormulaValue(candidate.appId)}',`,
    `  ${formulaField(ASSET_ATTRIBUTION_FIELD_NAMES.workspaceId)} = '${escapeFormulaValue(candidate.workspaceId)}',`,
    `  ${formulaField(ASSET_ATTRIBUTION_FIELD_NAMES.asset)}`,
    ')'
  ].join('\n');
}

function toCandidateRecord(record: AirtableRecord): CandidateRecord {
  return {
    id: record.id,
    appId: readStringField(record, ASSET_ATTRIBUTION_FIELD_NAMES.appId),
    submittedAt:
      parseDate(record.fields[ASSET_ATTRIBUTION_FIELD_NAMES.createdAt]) ??
      parseDate(record.createdTime),
    tmpuid: readStringField(record, ASSET_ATTRIBUTION_FIELD_NAMES.tmpuid),
    workspaceId: readStringField(record, ASSET_ATTRIBUTION_FIELD_NAMES.workspaceId)
  };
}

function hasCandidateIdentity(candidate: CandidateRecord): candidate is CandidateRecord & {
  tmpuid: string;
  appId: string;
  workspaceId: string;
} {
  return Boolean(candidate.tmpuid && candidate.appId && candidate.workspaceId);
}

class AssetAttributionAirtableClient {
  private readonly apiKey: string;
  private readonly baseId: string;
  private readonly fetchFn: FetchFn;

  constructor(
    options: Required<Pick<AssetAttributionSyncOptions, 'apiKey'>> &
      Pick<AssetAttributionSyncOptions, 'baseId' | 'fetchFn'>
  ) {
    this.apiKey = options.apiKey;
    this.baseId = options.baseId ?? DEFAULT_AIRTABLE_BASE_ID;
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
  }

  get resolvedBaseId(): string {
    return this.baseId;
  }

  private get tableBaseUrl(): string {
    return `https://api.airtable.com/v0/${this.baseId}`;
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit,
    query: URLSearchParams
  ): Promise<T> {
    const separator = query.toString() ? `?${query.toString()}` : '';
    const url = `${this.tableBaseUrl}${path}${separator}`;

    for (let attempt = 0; attempt <= 3; attempt += 1) {
      const response = await this.fetchFn(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {})
        }
      });

      if (response.ok) return (await response.json()) as T;

      if (RETRYABLE_STATUS.has(response.status) && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(200 * 2 ** attempt, 2000)));
        continue;
      }

      const body = await response.text();
      throw new Error(`Airtable request failed (${response.status}): ${body}`);
    }

    throw new Error('Unexpected Airtable request failure.');
  }

  async listVersions(args: {
    filterByFormula: string;
    limit?: number;
    sortDirection?: 'asc' | 'desc';
  }): Promise<AirtableRecord[]> {
    const records: AirtableRecord[] = [];
    let offset: string | undefined;

    while (true) {
      const query = new URLSearchParams();
      query.set('returnFieldsByFieldId', 'false');
      query.set('pageSize', '100');
      query.set('filterByFormula', args.filterByFormula);
      query.set('sort[0][field]', ASSET_ATTRIBUTION_FIELD_NAMES.createdAt);
      query.set('sort[0][direction]', args.sortDirection ?? 'desc');
      ATTRIBUTION_FIELD_NAMES.forEach((fieldName) => query.append('fields[]', fieldName));
      if (offset) query.set('offset', offset);

      const data = await this.requestJson<AirtableListResponse>(
        `/${encodeURIComponent(TABLE_IDS.assetVersions)}`,
        { method: 'GET' },
        query
      );

      records.push(...data.records);
      if (args.limit && records.length >= args.limit) return records.slice(0, args.limit);
      if (!data.offset) return records;
      offset = data.offset;
    }
  }

  async updateVersionAsset(versionId: string, assetId: string): Promise<void> {
    const query = new URLSearchParams();
    query.set('returnFieldsByFieldId', 'true');
    query.set('typecast', 'true');

    const payload = JSON.stringify({
      records: [
        {
          id: versionId,
          fields: {
            [FIELD_IDS.versions.assetLink]: [assetId],
            [FIELD_IDS.versions.reviewStatus]: ASSET_ATTRIBUTION_READY_STATUS
          }
        }
      ]
    });

    await this.requestJson<AirtableUpdateResponse>(
      `/${encodeURIComponent(TABLE_IDS.assetVersions)}`,
      { method: 'PATCH', body: payload },
      query
    );
  }
}

async function findExactAssetMatch(
  client: AssetAttributionAirtableClient,
  candidate: CandidateRecord & { tmpuid: string; appId: string; workspaceId: string }
): Promise<MatchedAsset | AssetAttributionSkip['reason']> {
  const history = await client.listVersions({
    filterByFormula: buildExactHistoryFormula(candidate),
    limit: 20,
    sortDirection: 'desc'
  });

  if (history.length === 0) return 'no_exact_asset_version_match';

  const preferredHistory = candidate.submittedAt
    ? (history.find((record) => {
        const submittedAt =
          parseDate(record.fields[ASSET_ATTRIBUTION_FIELD_NAMES.createdAt]) ??
          parseDate(record.createdTime);
        return submittedAt ? submittedAt.getTime() <= candidate.submittedAt!.getTime() : true;
      }) ?? history[0])
    : history[0];

  if (!preferredHistory) return 'no_exact_asset_version_match';

  const assetIds = readLinkedRecordIds(preferredHistory, ASSET_ATTRIBUTION_FIELD_NAMES.asset);
  if (assetIds.length !== 1) return 'ambiguous_asset_link';

  return {
    assetId: assetIds[0],
    matchedFromVersionId: preferredHistory.id
  };
}

export async function runAssetAttributionSync(
  options: AssetAttributionSyncOptions
): Promise<AssetAttributionSyncSummary> {
  if (!options.apiKey.trim()) {
    throw new Error('Missing Airtable API key.');
  }

  const submittedAfter = resolveAssetAttributionSubmittedAfter({
    lookbackHours: options.lookbackHours,
    now: options.now,
    startAt: options.startAt
  });
  const client = new AssetAttributionAirtableClient(options);

  const targetRecords = await client.listVersions({
    filterByFormula: buildTargetFormula(submittedAfter),
    limit: options.maxCandidates ?? 200,
    sortDirection: 'desc'
  });

  const skipped: AssetAttributionSkip[] = [];
  const updates: AssetAttributionUpdate[] = [];
  const matchCache = new Map<string, Promise<MatchedAsset | AssetAttributionSkip['reason']>>();

  for (const record of targetRecords) {
    const candidate = toCandidateRecord(record);

    if (!hasCandidateIdentity(candidate)) {
      skipped.push({
        versionId: candidate.id,
        appId: candidate.appId,
        reason: 'missing_identity',
        tmpuid: candidate.tmpuid,
        workspaceId: candidate.workspaceId
      });
      continue;
    }

    if (!candidate.submittedAt) {
      skipped.push({
        versionId: candidate.id,
        appId: candidate.appId,
        reason: 'missing_submission_datetime',
        tmpuid: candidate.tmpuid,
        workspaceId: candidate.workspaceId
      });
      continue;
    }

    const cacheKey = `${candidate.tmpuid}\u0000${candidate.appId}\u0000${candidate.workspaceId}`;
    let matchPromise = matchCache.get(cacheKey);
    if (!matchPromise) {
      matchPromise = findExactAssetMatch(client, candidate);
      matchCache.set(cacheKey, matchPromise);
    }

    const match = await matchPromise;
    if (typeof match === 'string') {
      skipped.push({
        versionId: candidate.id,
        appId: candidate.appId,
        reason: match,
        tmpuid: candidate.tmpuid,
        workspaceId: candidate.workspaceId
      });
      continue;
    }

    await client.updateVersionAsset(candidate.id, match.assetId);
    updates.push({
      versionId: candidate.id,
      appId: candidate.appId,
      assetId: match.assetId,
      matchedFromVersionId: match.matchedFromVersionId,
      tmpuid: candidate.tmpuid,
      workspaceId: candidate.workspaceId
    });
  }

  return {
    ok: true,
    baseId: client.resolvedBaseId,
    candidates: targetRecords.length,
    skipped,
    submittedAfter: submittedAfter.toISOString(),
    updated: updates.length,
    updates
  };
}
