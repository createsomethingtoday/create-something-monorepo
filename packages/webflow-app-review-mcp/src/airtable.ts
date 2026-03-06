import {
  CAPABILITIES_OPTIONS,
  DEFAULT_AIRTABLE_BASE_ID,
  FIELD_IDS,
  MARKETPLACE_STATUS_OPTIONS,
  REJECTION_REASON_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  REVIEW_TYPE_OPTIONS,
  TABLE_IDS,
  VIEW_IDS,
  VISIBILITY_OPTIONS,
  isAppLikeAsset,
  validateAssetMetadataWriteKeys,
} from './schema.js';

export type FetchFn = typeof fetch;
export type SleepFn = (ms: number) => Promise<void>;

export interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

interface AirtableSingleResponse {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

export type ScopedTableId = (typeof TABLE_IDS)[keyof typeof TABLE_IDS];

const SCOPED_TABLE_IDS = new Set<string>(Object.values(TABLE_IDS));
const RETRYABLE_STATUS = new Set<number>([429, 500, 502, 503, 504]);

const ASSET_QUEUE_FIELD_IDS = [
  FIELD_IDS.assets.name,
  FIELD_IDS.assets.marketplaceStatus,
  FIELD_IDS.assets.latestReviewStatus,
  FIELD_IDS.assets.daysInCurrentReviewStage,
  FIELD_IDS.assets.latestReviewer,
  FIELD_IDS.assets.latestReviewFeedback,
  FIELD_IDS.assets.openReviewStatus,
  FIELD_IDS.assets.capabilities,
  FIELD_IDS.assets.clientId,
  FIELD_IDS.assets.appId,
  FIELD_IDS.assets.visibility,
] as const;

const ASSET_DETAIL_FIELD_IDS = [
  ...ASSET_QUEUE_FIELD_IDS,
  FIELD_IDS.assets.relationshipOwner,
  FIELD_IDS.assets.featuresText,
  FIELD_IDS.assets.notes,
  FIELD_IDS.assets.credentials,
  FIELD_IDS.assets.descriptionShort,
  FIELD_IDS.assets.descriptionLongHtml,
  FIELD_IDS.assets.installUrlDirect,
  FIELD_IDS.assets.installUrlFormula,
  FIELD_IDS.assets.workspaceDashboardUrl,
  FIELD_IDS.assets.categories,
  FIELD_IDS.assets.iconImage,
  FIELD_IDS.assets.iconImageAltText,
  FIELD_IDS.assets.carouselImages,
  FIELD_IDS.assets.carouselImagesAltText,
  FIELD_IDS.assets.paymentTypes,
  FIELD_IDS.assets.demoVideoUrl,
  FIELD_IDS.assets.privacyPolicyUrl,
  FIELD_IDS.assets.termsAndConditionsUrl,
  FIELD_IDS.assets.websiteUrl,
  FIELD_IDS.assets.supportEmailOrUrl,
  FIELD_IDS.assets.previewSiteUrl,
  FIELD_IDS.assets.promoVideoUrl,
] as const;

const VERSION_FIELD_IDS = [
  FIELD_IDS.versions.versionNumber,
  FIELD_IDS.versions.reviewType,
  FIELD_IDS.versions.reviewer,
  FIELD_IDS.versions.reviewStatus,
  FIELD_IDS.versions.submissionDatetime,
  FIELD_IDS.versions.submissionDatetimeOverride,
  FIELD_IDS.versions.rejectionReason,
  FIELD_IDS.versions.reviewFeedback,
  FIELD_IDS.versions.daysInCurrentStage,
  FIELD_IDS.versions.assetLink,
  FIELD_IDS.versions.assetRecordIdRollup,
] as const;

export class AirtableClientError extends Error {
  code: string;
  status?: number;
  details?: unknown;

  constructor(code: string, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'AirtableClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface CollaboratorRef {
  id: string;
  email?: string;
  name?: string;
}

export interface AppReviewQueueItem {
  assetId: string;
  appName: string;
  marketplaceStatus?: string;
  latestReviewStatus?: string;
  daysInCurrentReviewStage?: number;
  latestReviewer?: string;
  latestReviewFeedback?: string;
  openReviewStatus?: string[];
  appCapabilities?: string;
  clientId?: string;
  appId?: string;
  visibilityStatus?: string;
}

export interface AppReviewAsset extends AppReviewQueueItem {
  relationshipOwner?: CollaboratorRef | null;
  featuresText?: string;
  notes?: string;
  credentials?: string;
  descriptionShort?: string;
  descriptionLongHtml?: string;
  installUrl?: string;
  installUrlFormula?: string;
  workspaceDashboardUrl?: string;
  categoriesRecordIds?: string[];
  iconImageUrl?: string;
  iconImageAltText?: string;
  carouselImageUrls?: string[];
  carouselImageAltText?: string;
  paymentTimes?: string[];
  demoVideoUrl?: string;
  privacyPolicyUrl?: string;
  termsAndConditionsUrl?: string;
  websiteUrl?: string;
  supportEmailOrUrl?: string;
  previewSiteUrl?: string;
  promoVideoUrl?: string;
}

export interface AppReviewVersion {
  versionId: string;
  assetId?: string;
  versionNumber?: number;
  reviewType?: string;
  reviewer?: CollaboratorRef | null;
  reviewStatus?: string;
  submissionDatetime?: string;
  submissionDatetimeOverride?: string;
  rejectionReason?: string;
  reviewFeedback?: string;
  daysInCurrentStage?: number;
  createdTime?: string;
}

export interface VersionReviewUpdateInput {
  review_status?: string;
  review_type?: string;
  reviewer?: CollaboratorRef | null;
  rejection_reason?: string;
  review_feedback?: string;
  submission_datetime_override?: string | null;
}

export interface AssetMetadataUpdateInput {
  [key: string]: unknown;
}

export interface RelatedAssetLinkCleanupOptions {
  viewId?: string;
  dryRun?: boolean;
  archivedStatus?: string;
  archivedNameContains?: string;
  sampleLimit?: number;
  linkFieldId?: string;
  linkedStatusFieldId?: string;
  linkedNameFieldId?: string;
}

export interface RelatedAssetLinkCleanupResult {
  viewId: string;
  dryRun: boolean;
  recordsScanned: number;
  uniqueLinkedRecordsEvaluated: number;
  recordsWithChanges: number;
  recordsUpdated: number;
  linksRemoved: number;
  sampleUpdatedRecordIds: string[];
  removeReasons: {
    statusMatches: number;
    nameMatches: number;
    statusAndNameMatches: number;
  };
}

export interface AirtableClientOptions {
  apiKey: string;
  baseId?: string;
  fetchFn?: FetchFn;
  sleepFn?: SleepFn;
  maxRetries?: number;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "''");
}

function normalizeForMatch(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((item) => normalizeForMatch(item)).join(' ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).trim().toLowerCase();
}

function isArchivedStatusMatch(value: unknown, archivedStatus: string): boolean {
  return normalizeForMatch(value) === normalizeForMatch(archivedStatus);
}

function nameContainsNeedle(value: unknown, needle: string): boolean {
  const normalizedNeedle = normalizeForMatch(needle);
  if (!normalizedNeedle) return false;
  return normalizeForMatch(value).includes(normalizedNeedle);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildRecordIdFormula(recordIds: string[]): string {
  if (recordIds.length === 0) return '';
  if (recordIds.length === 1) {
    return `RECORD_ID() = '${escapeFormulaValue(recordIds[0])}'`;
  }
  const clauses = recordIds.map((recordId) => `RECORD_ID() = '${escapeFormulaValue(recordId)}'`);
  return `OR(${clauses.join(',')})`;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function toNumberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (Array.isArray(value) && value.length > 0) return toNumberValue(value[0]);
  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const maybeName = (item as Record<string, unknown>).name;
          const maybeId = (item as Record<string, unknown>).id;
          if (typeof maybeName === 'string') return maybeName;
          if (typeof maybeId === 'string') return maybeId;
        }
        return undefined;
      })
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === 'string') return value.trim() ? [value] : [];
  return [];
}

function firstString(value: unknown): string | undefined {
  if (Array.isArray(value) && value.length > 0) {
    return firstString(value[0]);
  }
  return toStringValue(value);
}

function toAttachmentUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return undefined;
      const url = (item as Record<string, unknown>).url;
      return typeof url === 'string' ? url : undefined;
    })
    .filter((item): item is string => Boolean(item));
}

function toCollaborator(value: unknown): CollaboratorRef | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return toCollaborator(value[0]);
  }
  if (typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    if (typeof raw.id === 'string') {
      const result: CollaboratorRef = { id: raw.id };
      if (typeof raw.email === 'string') result.email = raw.email;
      if (typeof raw.name === 'string') result.name = raw.name;
      return result;
    }
  }
  return null;
}

function toDateTimeOrThrow(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new AirtableClientError('INVALID_DATETIME', `Invalid datetime: ${value}`);
  }
  return new Date(parsed).toISOString();
}

function mapQueueRecord(record: AirtableRecord): AppReviewQueueItem {
  const fields = record.fields;
  return {
    assetId: record.id,
    appName: firstString(fields[FIELD_IDS.assets.name]) ?? '',
    marketplaceStatus: firstString(fields[FIELD_IDS.assets.marketplaceStatus]),
    latestReviewStatus: firstString(fields[FIELD_IDS.assets.latestReviewStatus]),
    daysInCurrentReviewStage: toNumberValue(fields[FIELD_IDS.assets.daysInCurrentReviewStage]),
    latestReviewer: firstString(fields[FIELD_IDS.assets.latestReviewer]),
    latestReviewFeedback: firstString(fields[FIELD_IDS.assets.latestReviewFeedback]),
    openReviewStatus: toStringArray(fields[FIELD_IDS.assets.openReviewStatus]),
    appCapabilities: firstString(fields[FIELD_IDS.assets.capabilities]),
    clientId: firstString(fields[FIELD_IDS.assets.clientId]),
    appId: firstString(fields[FIELD_IDS.assets.appId]),
    visibilityStatus: firstString(fields[FIELD_IDS.assets.visibility]),
  };
}

function mapAssetRecord(record: AirtableRecord): AppReviewAsset {
  const queue = mapQueueRecord(record);
  const fields = record.fields;
  return {
    ...queue,
    relationshipOwner: toCollaborator(fields[FIELD_IDS.assets.relationshipOwner]),
    featuresText: firstString(fields[FIELD_IDS.assets.featuresText]),
    notes: firstString(fields[FIELD_IDS.assets.notes]),
    credentials: firstString(fields[FIELD_IDS.assets.credentials]),
    descriptionShort: firstString(fields[FIELD_IDS.assets.descriptionShort]),
    descriptionLongHtml: firstString(fields[FIELD_IDS.assets.descriptionLongHtml]),
    installUrl: firstString(fields[FIELD_IDS.assets.installUrlDirect]),
    installUrlFormula: firstString(fields[FIELD_IDS.assets.installUrlFormula]),
    workspaceDashboardUrl: firstString(fields[FIELD_IDS.assets.workspaceDashboardUrl]),
    categoriesRecordIds: toStringArray(fields[FIELD_IDS.assets.categories]),
    iconImageUrl: toAttachmentUrls(fields[FIELD_IDS.assets.iconImage])[0],
    iconImageAltText: firstString(fields[FIELD_IDS.assets.iconImageAltText]),
    carouselImageUrls: toAttachmentUrls(fields[FIELD_IDS.assets.carouselImages]),
    carouselImageAltText: firstString(fields[FIELD_IDS.assets.carouselImagesAltText]),
    paymentTimes: toStringArray(fields[FIELD_IDS.assets.paymentTypes]),
    demoVideoUrl: firstString(fields[FIELD_IDS.assets.demoVideoUrl]),
    privacyPolicyUrl: firstString(fields[FIELD_IDS.assets.privacyPolicyUrl]),
    termsAndConditionsUrl: firstString(fields[FIELD_IDS.assets.termsAndConditionsUrl]),
    websiteUrl: firstString(fields[FIELD_IDS.assets.websiteUrl]),
    supportEmailOrUrl: firstString(fields[FIELD_IDS.assets.supportEmailOrUrl]),
    previewSiteUrl: firstString(fields[FIELD_IDS.assets.previewSiteUrl]),
    promoVideoUrl: firstString(fields[FIELD_IDS.assets.promoVideoUrl]),
  };
}

function mapVersionRecord(record: AirtableRecord): AppReviewVersion {
  const fields = record.fields;
  const linkedAssetIds = toStringArray(fields[FIELD_IDS.versions.assetLink]);
  const rollupAssetIds = toStringArray(fields[FIELD_IDS.versions.assetRecordIdRollup]);
  return {
    versionId: record.id,
    assetId: linkedAssetIds[0] ?? rollupAssetIds[0],
    versionNumber: toNumberValue(fields[FIELD_IDS.versions.versionNumber]),
    reviewType: firstString(fields[FIELD_IDS.versions.reviewType]),
    reviewer: toCollaborator(fields[FIELD_IDS.versions.reviewer]),
    reviewStatus: firstString(fields[FIELD_IDS.versions.reviewStatus]),
    submissionDatetime: firstString(fields[FIELD_IDS.versions.submissionDatetime]),
    submissionDatetimeOverride: firstString(fields[FIELD_IDS.versions.submissionDatetimeOverride]),
    rejectionReason: firstString(fields[FIELD_IDS.versions.rejectionReason]),
    reviewFeedback: firstString(fields[FIELD_IDS.versions.reviewFeedback]),
    daysInCurrentStage: toNumberValue(fields[FIELD_IDS.versions.daysInCurrentStage]),
    createdTime: record.createdTime,
  };
}

export function assertScopedTable(tableId: string): asserts tableId is ScopedTableId {
  if (!SCOPED_TABLE_IDS.has(tableId)) {
    throw new AirtableClientError('TABLE_SCOPE_VIOLATION', `Table ${tableId} is outside MCP scope.`);
  }
}

export class AirtableClient {
  private readonly apiKey: string;
  private readonly baseId: string;
  private readonly fetchFn: FetchFn;
  private readonly sleepFn: SleepFn;
  private readonly maxRetries: number;

  constructor(options: AirtableClientOptions) {
    this.apiKey = options.apiKey;
    this.baseId = options.baseId ?? DEFAULT_AIRTABLE_BASE_ID;
    this.fetchFn = options.fetchFn ?? fetch;
    this.sleepFn = options.sleepFn ?? defaultSleep;
    this.maxRetries = options.maxRetries ?? 3;
  }

  private get tableBaseUrl(): string {
    return `https://api.airtable.com/v0/${this.baseId}`;
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit,
    query: URLSearchParams,
  ): Promise<T> {
    const url = `${this.tableBaseUrl}${path}?${query.toString()}`;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.fetchFn(url, {
          ...init,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...(init.headers ?? {}),
          },
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        const body = await response.text();
        if (RETRYABLE_STATUS.has(response.status) && attempt < this.maxRetries) {
          const waitMs = Math.min(200 * 2 ** attempt, 2000);
          await this.sleepFn(waitMs);
          continue;
        }

        throw new AirtableClientError(
          'AIRTABLE_HTTP_ERROR',
          `Airtable request failed (${response.status})`,
          response.status,
          body,
        );
      } catch (error) {
        if (error instanceof AirtableClientError) throw error;
        if (attempt < this.maxRetries) {
          const waitMs = Math.min(200 * 2 ** attempt, 2000);
          await this.sleepFn(waitMs);
          continue;
        }
        throw new AirtableClientError(
          'AIRTABLE_NETWORK_ERROR',
          'Airtable request failed after retries.',
          undefined,
          String(error),
        );
      }
    }

    throw new AirtableClientError('AIRTABLE_UNKNOWN_ERROR', 'Unexpected Airtable request failure.');
  }

  private async listRecords(args: {
    tableId: ScopedTableId;
    fieldIds: readonly string[];
    limit?: number;
    filterByFormula?: string;
    viewId?: string;
  }): Promise<AirtableRecord[]> {
    assertScopedTable(args.tableId);

    const all: AirtableRecord[] = [];
    let offset: string | undefined;

    while (true) {
      const query = new URLSearchParams();
      query.set('returnFieldsByFieldId', 'true');
      query.set('pageSize', '100');
      args.fieldIds.forEach((fieldId) => query.append('fields[]', fieldId));
      if (args.filterByFormula) query.set('filterByFormula', args.filterByFormula);
      if (args.viewId) query.set('view', args.viewId);
      if (offset) query.set('offset', offset);

      const data = await this.requestJson<AirtableListResponse>(
        `/${encodeURIComponent(args.tableId)}`,
        { method: 'GET' },
        query,
      );

      all.push(...data.records);
      if (args.limit && all.length >= args.limit) {
        return all.slice(0, args.limit);
      }

      if (!data.offset) return all;
      offset = data.offset;
    }
  }

  private async getRecord(
    tableId: ScopedTableId,
    recordId: string,
    fieldIds: readonly string[],
  ): Promise<AirtableRecord | null> {
    assertScopedTable(tableId);
    const query = new URLSearchParams();
    query.set('returnFieldsByFieldId', 'true');
    fieldIds.forEach((fieldId) => query.append('fields[]', fieldId));

    try {
      return await this.requestJson<AirtableSingleResponse>(
        `/${encodeURIComponent(tableId)}/${encodeURIComponent(recordId)}`,
        { method: 'GET' },
        query,
      );
    } catch (error) {
      if (error instanceof AirtableClientError && error.status === 404) return null;
      throw error;
    }
  }

  private async updateRecord(
    tableId: ScopedTableId,
    recordId: string,
    fields: Record<string, unknown>,
  ): Promise<AirtableRecord> {
    assertScopedTable(tableId);
    const query = new URLSearchParams();
    query.set('returnFieldsByFieldId', 'true');
    query.set('typecast', 'true');

    const payload = JSON.stringify({ records: [{ id: recordId, fields }] });
    const data = await this.requestJson<AirtableListResponse>(
      `/${encodeURIComponent(tableId)}`,
      { method: 'PATCH', body: payload },
      query,
    );

    if (!data.records[0]) {
      throw new AirtableClientError('AIRTABLE_EMPTY_UPDATE', 'Airtable update returned no record.');
    }
    return data.records[0];
  }

  private async updateRecords(
    tableId: ScopedTableId,
    records: Array<{ id: string; fields: Record<string, unknown> }>,
  ): Promise<AirtableRecord[]> {
    assertScopedTable(tableId);
    if (records.length === 0) return [];
    if (records.length > 10) {
      throw new AirtableClientError('AIRTABLE_BATCH_LIMIT', 'Airtable update batch cannot exceed 10 records.', 400, {
        requested: records.length,
      });
    }

    const query = new URLSearchParams();
    query.set('returnFieldsByFieldId', 'true');
    query.set('typecast', 'false');

    const payload = JSON.stringify({ records });
    const data = await this.requestJson<AirtableListResponse>(
      `/${encodeURIComponent(tableId)}`,
      { method: 'PATCH', body: payload },
      query,
    );
    return data.records;
  }

  async healthCheck(): Promise<{
    ok: boolean;
    baseId: string;
    scopedTables: typeof TABLE_IDS;
    sampleAssetsRead: number;
  }> {
    const records = await this.listRecords({
      tableId: TABLE_IDS.assets,
      fieldIds: [FIELD_IDS.assets.name],
      limit: 1,
    });
    return {
      ok: true,
      baseId: this.baseId,
      scopedTables: TABLE_IDS,
      sampleAssetsRead: records.length,
    };
  }

  async listAssetQueue(limit = 100): Promise<AppReviewQueueItem[]> {
    const records = await this.listRecords({
      tableId: TABLE_IDS.assets,
      fieldIds: ASSET_QUEUE_FIELD_IDS,
      limit,
    });
    return records
      .filter((record) => isAppLikeAsset(record.fields))
      .map((record) => mapQueueRecord(record));
  }

  async getAssetById(assetId: string): Promise<AppReviewAsset | null> {
    const record = await this.getRecord(TABLE_IDS.assets, assetId, ASSET_DETAIL_FIELD_IDS);
    if (!record) return null;
    if (!isAppLikeAsset(record.fields)) return null;
    return mapAssetRecord(record);
  }

  async getAssetByAppId(appId: string): Promise<AppReviewAsset | null> {
    const needle = appId.trim().toLowerCase();
    if (!needle) return null;

    const records = await this.listRecords({
      tableId: TABLE_IDS.assets,
      fieldIds: ASSET_DETAIL_FIELD_IDS,
      limit: 500,
    });

    const match = records.find((record) => {
      if (!isAppLikeAsset(record.fields)) return false;
      const appIds = toStringArray(record.fields[FIELD_IDS.assets.appId]).map((value) => value.toLowerCase());
      return appIds.includes(needle);
    });

    return match ? mapAssetRecord(match) : null;
  }

  async listVersionsForAsset(assetId: string, limit = 100): Promise<AppReviewVersion[]> {
    const formula = `{${FIELD_IDS.versions.assetRecordIdRollup}} = '${escapeFormulaValue(assetId)}'`;
    const records = await this.listRecords({
      tableId: TABLE_IDS.assetVersions,
      fieldIds: VERSION_FIELD_IDS,
      limit,
      filterByFormula: formula,
    });
    return records
      .map((record) => mapVersionRecord(record))
      .sort((a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0));
  }

  async getVersionById(versionId: string): Promise<AppReviewVersion | null> {
    const record = await this.getRecord(TABLE_IDS.assetVersions, versionId, VERSION_FIELD_IDS);
    return record ? mapVersionRecord(record) : null;
  }

  async updateVersionReview(versionId: string, input: VersionReviewUpdateInput): Promise<AppReviewVersion> {
    const fields: Record<string, unknown> = {};

    if (input.review_status !== undefined) {
      if (!(REVIEW_STATUS_OPTIONS as readonly string[]).includes(input.review_status)) {
        throw new AirtableClientError('INVALID_REVIEW_STATUS', 'Unsupported review status.', 400, {
          value: input.review_status,
          allowed: REVIEW_STATUS_OPTIONS,
        });
      }
      fields[FIELD_IDS.versions.reviewStatus] = input.review_status;
    }

    if (input.review_type !== undefined) {
      if (!(REVIEW_TYPE_OPTIONS as readonly string[]).includes(input.review_type)) {
        throw new AirtableClientError('INVALID_REVIEW_TYPE', 'Unsupported review type.', 400, {
          value: input.review_type,
          allowed: REVIEW_TYPE_OPTIONS,
        });
      }
      fields[FIELD_IDS.versions.reviewType] = input.review_type;
    }

    if (input.reviewer !== undefined) {
      fields[FIELD_IDS.versions.reviewer] = input.reviewer ? { id: input.reviewer.id } : null;
    }

    if (input.rejection_reason !== undefined) {
      if (!(REJECTION_REASON_OPTIONS as readonly string[]).includes(input.rejection_reason)) {
        throw new AirtableClientError('INVALID_REJECTION_REASON', 'Unsupported rejection reason.', 400, {
          value: input.rejection_reason,
          allowed: REJECTION_REASON_OPTIONS,
        });
      }
      fields[FIELD_IDS.versions.rejectionReason] = input.rejection_reason;
    }

    if (input.review_feedback !== undefined) {
      fields[FIELD_IDS.versions.reviewFeedback] = input.review_feedback;
    }

    if (input.submission_datetime_override !== undefined) {
      fields[FIELD_IDS.versions.submissionDatetimeOverride] = input.submission_datetime_override
        ? toDateTimeOrThrow(input.submission_datetime_override)
        : null;
    }

    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError('NO_MUTATION_FIELDS', 'No version review fields were provided.', 400);
    }

    const updated = await this.updateRecord(TABLE_IDS.assetVersions, versionId, fields);
    return mapVersionRecord(updated);
  }

  async updateAssetMetadata(assetId: string, input: AssetMetadataUpdateInput): Promise<AppReviewAsset> {
    const definedEntries = Object.entries(input).filter(([, value]) => value !== undefined);
    const keys = definedEntries.map(([key]) => key);
    const { invalidKeys, readOnlyKeys, writableKeys } = validateAssetMetadataWriteKeys(keys);

    if (invalidKeys.length > 0) {
      throw new AirtableClientError('INVALID_ASSET_FIELDS', 'Unsupported asset metadata fields.', 400, {
        invalidKeys,
      });
    }

    if (readOnlyKeys.length > 0) {
      throw new AirtableClientError('READ_ONLY_ASSET_FIELDS', 'One or more requested fields are read-only.', 400, {
        readOnlyKeys,
      });
    }

    const fields: Record<string, unknown> = {};

    for (const key of writableKeys) {
      const value = input[key];
      switch (key) {
        case 'app_name':
        case 'client_id':
        case 'features_text':
        case 'notes':
        case 'credentials':
        case 'description_short':
        case 'description_long_html':
        case 'install_url':
        case 'icon_image_alt_text':
        case 'carousel_image_alt_text':
        case 'demo_video_url':
        case 'privacy_policy_url':
        case 'terms_and_conditions_url':
        case 'website_url':
        case 'support_email_or_url':
        case 'preview_site_url':
        case 'promo_video_url':
          fields[FIELD_IDS.assets[mapWritableKeyToAssetFieldName(key)]] = value ?? null;
          break;
        case 'app_capabilities':
          if (value !== null && value !== undefined && !(CAPABILITIES_OPTIONS as readonly string[]).includes(String(value))) {
            throw new AirtableClientError('INVALID_CAPABILITY', 'Unsupported app capability.', 400, {
              value,
              allowed: CAPABILITIES_OPTIONS,
            });
          }
          fields[FIELD_IDS.assets.capabilities] = value ?? null;
          break;
        case 'visibility_status':
          if (value !== null && value !== undefined && !(VISIBILITY_OPTIONS as readonly string[]).includes(String(value))) {
            throw new AirtableClientError('INVALID_VISIBILITY', 'Unsupported visibility status.', 400, {
              value,
              allowed: VISIBILITY_OPTIONS,
            });
          }
          fields[FIELD_IDS.assets.visibility] = value ?? null;
          break;
        case 'marketplace_status':
          if (value !== null && value !== undefined && !(MARKETPLACE_STATUS_OPTIONS as readonly string[]).includes(String(value))) {
            throw new AirtableClientError('INVALID_MARKETPLACE_STATUS', 'Unsupported marketplace status.', 400, {
              value,
              allowed: MARKETPLACE_STATUS_OPTIONS,
            });
          }
          fields[FIELD_IDS.assets.marketplaceStatus] = value ?? null;
          break;
        case 'relationships_status':
          if (value === null) {
            fields[FIELD_IDS.assets.relationshipOwner] = null;
            break;
          }
          if (!value || typeof value !== 'object' || typeof (value as { id?: unknown }).id !== 'string') {
            throw new AirtableClientError(
              'INVALID_RELATIONSHIP_OWNER',
              'relationships_status must be null or { id: string }.',
              400,
            );
          }
          fields[FIELD_IDS.assets.relationshipOwner] = { id: (value as { id: string }).id };
          break;
        case 'categories_record_ids':
          if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
            throw new AirtableClientError(
              'INVALID_CATEGORIES',
              'categories_record_ids must be an array of Airtable record IDs.',
              400,
            );
          }
          fields[FIELD_IDS.assets.categories] = value;
          break;
        case 'icon_image_url':
          if (value === null) {
            fields[FIELD_IDS.assets.iconImage] = [];
            break;
          }
          if (typeof value !== 'string') {
            throw new AirtableClientError('INVALID_ICON_IMAGE', 'icon_image_url must be a URL string or null.', 400);
          }
          fields[FIELD_IDS.assets.iconImage] = [{ url: value }];
          break;
        case 'carousel_image_urls':
          if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
            throw new AirtableClientError('INVALID_CAROUSEL_IMAGES', 'carousel_image_urls must be an array of URL strings.', 400);
          }
          fields[FIELD_IDS.assets.carouselImages] = value.map((url) => ({ url }));
          break;
        case 'payment_times':
          if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
            throw new AirtableClientError('INVALID_PAYMENT_TYPES', 'payment_times must be an array of strings.', 400);
          }
          fields[FIELD_IDS.assets.paymentTypes] = value;
          break;
        default:
          break;
      }
    }

    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError('NO_MUTATION_FIELDS', 'No writable asset fields were provided.', 400);
    }

    const updated = await this.updateRecord(TABLE_IDS.assets, assetId, fields);
    if (!isAppLikeAsset(updated.fields)) {
      throw new AirtableClientError('OUT_OF_SCOPE_ASSET', 'Updated asset is outside app-review scope.', 403);
    }
    return mapAssetRecord(updated);
  }

  async setMarketplaceStatus(assetId: string, marketplaceStatus: string): Promise<AppReviewAsset> {
    return this.updateAssetMetadata(assetId, { marketplace_status: marketplaceStatus });
  }

  async cleanupArchivedRelatedAssetLinks(
    input: RelatedAssetLinkCleanupOptions = {},
  ): Promise<RelatedAssetLinkCleanupResult> {
    const viewId = input.viewId ?? VIEW_IDS.assetsDailyAssetLinkCleanup;
    const linkFieldId = input.linkFieldId ?? FIELD_IDS.assets.relatedAssets;
    const linkedStatusFieldId = input.linkedStatusFieldId ?? FIELD_IDS.assets.lifecycleStatus;
    const linkedNameFieldId = input.linkedNameFieldId ?? FIELD_IDS.assets.name;
    const archivedStatus = input.archivedStatus ?? 'Archived';
    const archivedNameContains = input.archivedNameContains ?? 'archived';
    const dryRun = input.dryRun ?? true;
    const sampleLimit = Math.max(1, Math.min(100, input.sampleLimit ?? 10));

    const assetRecords = await this.listRecords({
      tableId: TABLE_IDS.assets,
      fieldIds: [linkFieldId],
      viewId,
    });

    const linkedRecordIds = new Set<string>();
    for (const record of assetRecords) {
      const links = record.fields[linkFieldId];
      if (!Array.isArray(links)) continue;
      for (const linkedId of links) {
        if (typeof linkedId === 'string' && linkedId.length > 0) {
          linkedRecordIds.add(linkedId);
        }
      }
    }

    const linkedInfo = new Map<string, AirtableRecord>();
    const linkedIdChunks = chunk(Array.from(linkedRecordIds), 50);
    for (const idChunk of linkedIdChunks) {
      const formula = buildRecordIdFormula(idChunk);
      if (!formula) continue;
      const records = await this.listRecords({
        tableId: TABLE_IDS.assets,
        fieldIds: [linkedStatusFieldId, linkedNameFieldId],
        filterByFormula: formula,
      });
      for (const record of records) {
        linkedInfo.set(record.id, record);
      }
    }

    const recordsToRemove = new Set<string>();
    let statusMatches = 0;
    let nameMatches = 0;
    let statusAndNameMatches = 0;

    for (const [recordId, record] of linkedInfo.entries()) {
      const statusMatch = isArchivedStatusMatch(record.fields[linkedStatusFieldId], archivedStatus);
      const nameMatch = nameContainsNeedle(record.fields[linkedNameFieldId], archivedNameContains);
      if (!statusMatch && !nameMatch) continue;

      recordsToRemove.add(recordId);
      if (statusMatch) statusMatches += 1;
      if (nameMatch) nameMatches += 1;
      if (statusMatch && nameMatch) statusAndNameMatches += 1;
    }

    const updates: Array<{ id: string; fields: Record<string, unknown> }> = [];
    let linksRemoved = 0;
    const sampleUpdatedRecordIds: string[] = [];

    for (const record of assetRecords) {
      const currentLinks = record.fields[linkFieldId];
      if (!Array.isArray(currentLinks) || currentLinks.length === 0) continue;

      const keptLinks = currentLinks.filter(
        (linkedId): linkedId is string =>
          typeof linkedId === 'string' && linkedId.length > 0 && !recordsToRemove.has(linkedId),
      );

      const removedCount = currentLinks.length - keptLinks.length;
      if (removedCount <= 0) continue;

      linksRemoved += removedCount;
      updates.push({
        id: record.id,
        fields: { [linkFieldId]: keptLinks },
      });
      if (sampleUpdatedRecordIds.length < sampleLimit) {
        sampleUpdatedRecordIds.push(record.id);
      }
    }

    let recordsUpdated = 0;
    if (!dryRun && updates.length > 0) {
      for (const updateChunk of chunk(updates, 10)) {
        const updated = await this.updateRecords(TABLE_IDS.assets, updateChunk);
        recordsUpdated += updated.length;
      }
    }

    return {
      viewId,
      dryRun,
      recordsScanned: assetRecords.length,
      uniqueLinkedRecordsEvaluated: linkedInfo.size,
      recordsWithChanges: updates.length,
      recordsUpdated,
      linksRemoved,
      sampleUpdatedRecordIds,
      removeReasons: {
        statusMatches,
        nameMatches,
        statusAndNameMatches,
      },
    };
  }
}

function mapWritableKeyToAssetFieldName(
  key:
    | 'app_name'
    | 'client_id'
    | 'features_text'
    | 'notes'
    | 'credentials'
    | 'description_short'
    | 'description_long_html'
    | 'install_url'
    | 'icon_image_alt_text'
    | 'carousel_image_alt_text'
    | 'demo_video_url'
    | 'privacy_policy_url'
    | 'terms_and_conditions_url'
    | 'website_url'
    | 'support_email_or_url'
    | 'preview_site_url'
    | 'promo_video_url',
):
  | 'name'
  | 'clientId'
  | 'featuresText'
  | 'notes'
  | 'credentials'
  | 'descriptionShort'
  | 'descriptionLongHtml'
  | 'installUrlDirect'
  | 'iconImageAltText'
  | 'carouselImagesAltText'
  | 'demoVideoUrl'
  | 'privacyPolicyUrl'
  | 'termsAndConditionsUrl'
  | 'websiteUrl'
  | 'supportEmailOrUrl'
  | 'previewSiteUrl'
  | 'promoVideoUrl' {
  switch (key) {
    case 'app_name':
      return 'name';
    case 'client_id':
      return 'clientId';
    case 'features_text':
      return 'featuresText';
    case 'notes':
      return 'notes';
    case 'credentials':
      return 'credentials';
    case 'description_short':
      return 'descriptionShort';
    case 'description_long_html':
      return 'descriptionLongHtml';
    case 'install_url':
      return 'installUrlDirect';
    case 'icon_image_alt_text':
      return 'iconImageAltText';
    case 'carousel_image_alt_text':
      return 'carouselImagesAltText';
    case 'demo_video_url':
      return 'demoVideoUrl';
    case 'privacy_policy_url':
      return 'privacyPolicyUrl';
    case 'terms_and_conditions_url':
      return 'termsAndConditionsUrl';
    case 'website_url':
      return 'websiteUrl';
    case 'support_email_or_url':
      return 'supportEmailOrUrl';
    case 'preview_site_url':
      return 'previewSiteUrl';
    case 'promo_video_url':
      return 'promoVideoUrl';
  }
}
