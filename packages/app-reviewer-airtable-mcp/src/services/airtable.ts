import type { TokenProvider } from '@create-something/mcp-core';

import {
  ASSET_FIELD_LABELS,
  ASSET_FIELD_PRESETS,
  CAPABILITIES_OPTIONS,
  DEFAULT_AIRTABLE_BASE_ID,
  FIELD_IDS,
  MARKETPLACE_STATUS_OPTIONS,
  READ_ONLY_ASSET_WRITE_KEYS,
  READ_ONLY_VERSION_WRITE_KEYS,
  REJECTION_REASON_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  REVIEW_TYPE_OPTIONS,
  TABLE_IDS,
  VERSION_FIELD_LABELS,
  VERSION_FIELD_PRESETS,
  VISIBILITY_OPTIONS,
  WRITABLE_ASSET_FIELDS,
  WRITABLE_VERSION_FIELDS,
  allAssetFieldIds,
  allVersionFieldIds,
  getReadOnlyAssetWriteHint,
  getReadOnlyVersionWriteHint,
  isReadOnlyAssetWriteKey,
  isReadOnlyVersionWriteKey,
  type AssetFieldPreset,
  type AssetReadOnlyWriteKey,
  type AssetWritableKey,
  type VersionFieldPreset,
  type VersionReadOnlyWriteKey,
  type VersionWritableKey,
} from '../schemas/index.js';

export type FetchFn = typeof fetch;
export type SleepFn = (ms: number) => Promise<void>;

const defaultFetch: FetchFn = (input, init) => fetch(input, init);

export interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface AirtablePage<T> {
  records: T[];
  nextOffset?: string;
  pageSize: number;
  returned: number;
  projectedFields: string[];
}

export interface AppReviewerAsset {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
  rawFields?: Record<string, unknown>;
}

export interface AppReviewerAssetVersion {
  id: string;
  createdTime?: string;
  assetId?: string;
  fields: Record<string, unknown>;
  rawFields?: Record<string, unknown>;
}

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

export interface AirtableClientOptions {
  tokenProvider: TokenProvider;
  baseId?: string;
  fetchFn?: FetchFn;
  sleepFn?: SleepFn;
  maxRetries?: number;
}

export interface ListAssetsQuery {
  limit?: number;
  offset?: string;
  preset?: AssetFieldPreset;
  includeSensitive?: boolean;
  includeRawFields?: boolean;
  search?: string;
  appId?: string;
  marketplaceStatus?: string;
  latestReviewStatus?: string;
  visibility?: string;
  sort?: 'app_name_asc' | 'app_name_desc' | 'latest_review_status_asc' | 'days_in_review_desc' | 'days_in_review_asc';
}

export interface GetAssetQuery {
  assetId?: string;
  appId?: string;
  preset?: AssetFieldPreset;
  includeSensitive?: boolean;
  includeRawFields?: boolean;
  includeVersions?: boolean;
  versionsLimit?: number;
}

export interface ListVersionsQuery {
  assetId?: string;
  versionId?: string;
  limit?: number;
  offset?: string;
  preset?: VersionFieldPreset;
  includeRawFields?: boolean;
  reviewStatus?: string;
  reviewType?: string;
  sort?: 'version_number_desc' | 'version_number_asc' | 'submission_datetime_desc' | 'submission_datetime_asc';
}

export interface CollaboratorRef {
  id: string;
}

export interface AssetFieldsUpdateInput {
  app_name?: string | null;
  app_capabilities?: string | null;
  client_id?: string | null;
  visibility_status?: string | null;
  relationships_status?: CollaboratorRef | null;
  features_text?: string | null;
  notes?: string | null;
  credentials?: string | null;
  description_short?: string | null;
  description_long_html?: string | null;
  install_url?: string | null;
  categories_record_ids?: string[] | null;
  icon_image_url?: string | null;
  icon_image_alt_text?: string | null;
  carousel_image_urls?: string[] | null;
  carousel_image_alt_text?: string | null;
  payment_times?: string[] | null;
  demo_video_url?: string | null;
  privacy_policy_url?: string | null;
  terms_and_conditions_url?: string | null;
  website_url?: string | null;
  support_email_or_url?: string | null;
  preview_site_url?: string | null;
  promo_video_url?: string | null;
  marketplace_status?: string | null;
  latest_review_status?: string;
  days_in_current_review_stage?: number;
  workspace_dashboard_url?: string;
  app_id?: string;
  install_url_formula?: string;
}

export interface VersionFieldsUpdateInput {
  review_type?: string | null;
  reviewer?: CollaboratorRef | null;
  review_status?: string | null;
  rejection_reason?: string | null;
  review_feedback?: string | null;
  submission_datetime_override?: string | null;
  version_number?: string | number;
  submission_datetime?: string;
  days_in_current_stage?: number;
  asset_id?: string;
  asset_link?: string;
}

export interface PreparedUpdate {
  fieldIds: string[];
  fieldLabels: string[];
  fieldCount: number;
  fieldsByFieldId: Record<string, unknown>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampLimit(value: number | undefined, fallback: number, max: number): number {
  if (!value || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.trunc(value), max));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "''");
}

function exactFormula(fieldId: string, value: string): string {
  return `{${fieldId}} = '${escapeFormulaValue(value)}'`;
}

function containsFormula(fieldId: string, value: string): string {
  return `FIND(LOWER('${escapeFormulaValue(value)}'), LOWER({${fieldId}} & ''))`;
}

function andFormula(parts: Array<string | undefined>): string | undefined {
  const compact = parts.filter((part): part is string => Boolean(part));
  if (compact.length === 0) return undefined;
  if (compact.length === 1) return compact[0];
  return `AND(${compact.join(',')})`;
}

function orFormula(parts: Array<string | undefined>): string | undefined {
  const compact = parts.filter((part): part is string => Boolean(part));
  if (compact.length === 0) return undefined;
  if (compact.length === 1) return compact[0];
  return `OR(${compact.join(',')})`;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value) && value.length > 0) return toStringValue(value[0]);
  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const raw = item as Record<string, unknown>;
          if (typeof raw.id === 'string') return raw.id;
          if (typeof raw.name === 'string') return raw.name;
        }
        return undefined;
      })
      .filter((item): item is string => Boolean(item));
  }
  const stringValue = toStringValue(value);
  return stringValue ? [stringValue] : [];
}

function mapFields(
  rawFields: Record<string, unknown>,
  labels: Record<string, string>,
  options: { includeRawFields?: boolean; sensitiveFieldIds?: string[] } = {},
): { fields: Record<string, unknown>; rawFields?: Record<string, unknown> } {
  const sensitive = new Set(options.sensitiveFieldIds ?? []);
  const fields: Record<string, unknown> = {};
  for (const [fieldId, value] of Object.entries(rawFields)) {
    if (sensitive.has(fieldId)) continue;
    fields[labels[fieldId] ?? fieldId] = value;
  }
  return {
    fields,
    ...(options.includeRawFields ? { rawFields } : {}),
  };
}

function assetFieldsForPreset(preset: AssetFieldPreset, includeSensitive: boolean): string[] {
  const base = preset === 'all' ? allAssetFieldIds() : [...ASSET_FIELD_PRESETS[preset]];
  return unique(includeSensitive ? [...base, ...ASSET_FIELD_PRESETS.sensitive] : base).filter(
    (fieldId) => includeSensitive || fieldId !== FIELD_IDS.assets.credentials,
  );
}

function versionFieldsForPreset(preset: VersionFieldPreset): string[] {
  return preset === 'all' ? allVersionFieldIds() : unique(VERSION_FIELD_PRESETS[preset]);
}

function sortForAssets(sort: ListAssetsQuery['sort']) {
  switch (sort) {
    case 'app_name_desc':
      return { field: FIELD_IDS.assets.name, direction: 'desc' as const };
    case 'latest_review_status_asc':
      return { field: FIELD_IDS.assets.latestReviewStatus, direction: 'asc' as const };
    case 'days_in_review_desc':
      return { field: FIELD_IDS.assets.daysInCurrentReviewStage, direction: 'desc' as const };
    case 'days_in_review_asc':
      return { field: FIELD_IDS.assets.daysInCurrentReviewStage, direction: 'asc' as const };
    case 'app_name_asc':
    default:
      return { field: FIELD_IDS.assets.name, direction: 'asc' as const };
  }
}

function sortForVersions(sort: ListVersionsQuery['sort']) {
  switch (sort) {
    case 'version_number_asc':
      return { field: FIELD_IDS.versions.versionNumber, direction: 'asc' as const };
    case 'submission_datetime_desc':
      return { field: FIELD_IDS.versions.submissionDatetime, direction: 'desc' as const };
    case 'submission_datetime_asc':
      return { field: FIELD_IDS.versions.submissionDatetime, direction: 'asc' as const };
    case 'version_number_desc':
    default:
      return { field: FIELD_IDS.versions.versionNumber, direction: 'desc' as const };
  }
}

function assertOption(value: string | null | undefined, allowed: readonly string[], code: string, message: string): void {
  if (value === null || value === undefined) return;
  if (allowed.includes(value)) return;
  throw new AirtableClientError(code, message, 400, { value, allowed });
}

function definedKeys(input: Record<string, unknown>): string[] {
  return Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
}

function readOnlyAssetDetails(keys: AssetReadOnlyWriteKey[]) {
  return Object.fromEntries(keys.map((key) => [key, getReadOnlyAssetWriteHint(key)]));
}

function readOnlyVersionDetails(keys: VersionReadOnlyWriteKey[]) {
  return Object.fromEntries(keys.map((key) => [key, getReadOnlyVersionWriteHint(key)]));
}

function validateAssetWriteKeys(keys: string[]): { writableKeys: AssetWritableKey[]; readOnlyKeys: AssetReadOnlyWriteKey[] } {
  const writableKeys: AssetWritableKey[] = [];
  const readOnlyKeys: AssetReadOnlyWriteKey[] = [];
  const invalidKeys: string[] = [];

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(WRITABLE_ASSET_FIELDS, key)) {
      writableKeys.push(key as AssetWritableKey);
    } else if (isReadOnlyAssetWriteKey(key)) {
      readOnlyKeys.push(key);
    } else {
      invalidKeys.push(key);
    }
  }

  if (invalidKeys.length > 0) {
    throw new AirtableClientError('INVALID_ASSET_FIELDS', 'Unsupported asset write fields.', 400, { invalidKeys });
  }

  if (readOnlyKeys.length > 0) {
    throw new AirtableClientError('READ_ONLY_ASSET_FIELDS', 'One or more requested asset fields are read-only.', 400, {
      readOnlyKeys,
      hints: readOnlyAssetDetails(readOnlyKeys),
      allowedWritableKeys: Object.keys(WRITABLE_ASSET_FIELDS),
      knownReadOnlyKeys: READ_ONLY_ASSET_WRITE_KEYS,
    });
  }

  return { writableKeys, readOnlyKeys };
}

function validateVersionWriteKeys(keys: string[]): { writableKeys: VersionWritableKey[]; readOnlyKeys: VersionReadOnlyWriteKey[] } {
  const writableKeys: VersionWritableKey[] = [];
  const readOnlyKeys: VersionReadOnlyWriteKey[] = [];
  const invalidKeys: string[] = [];

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(WRITABLE_VERSION_FIELDS, key)) {
      writableKeys.push(key as VersionWritableKey);
    } else if (isReadOnlyVersionWriteKey(key)) {
      readOnlyKeys.push(key);
    } else {
      invalidKeys.push(key);
    }
  }

  if (invalidKeys.length > 0) {
    throw new AirtableClientError('INVALID_VERSION_FIELDS', 'Unsupported asset-version write fields.', 400, {
      invalidKeys,
    });
  }

  if (readOnlyKeys.length > 0) {
    throw new AirtableClientError(
      'READ_ONLY_VERSION_FIELDS',
      'One or more requested asset-version fields are read-only.',
      400,
      {
        readOnlyKeys,
        hints: readOnlyVersionDetails(readOnlyKeys),
        allowedWritableKeys: Object.keys(WRITABLE_VERSION_FIELDS),
        knownReadOnlyKeys: READ_ONLY_VERSION_WRITE_KEYS,
      },
    );
  }

  return { writableKeys, readOnlyKeys };
}

function normalizeDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AirtableClientError(
      'INVALID_DATETIME',
      'submission_datetime_override must be an ISO 8601 datetime string or null.',
      400,
      { value },
    );
  }
  return parsed.toISOString();
}

function fieldLabel(fieldId: string, labels: Record<string, string>): string {
  return labels[fieldId] ?? fieldId;
}

function preparedUpdate(fieldsByFieldId: Record<string, unknown>, labels: Record<string, string>): PreparedUpdate {
  const fieldIds = Object.keys(fieldsByFieldId);
  return {
    fieldIds,
    fieldLabels: fieldIds.map((fieldId) => fieldLabel(fieldId, labels)),
    fieldCount: fieldIds.length,
    fieldsByFieldId,
  };
}

function isAppLikeAsset(fields: Record<string, unknown>): boolean {
  return Boolean(
    fields[FIELD_IDS.assets.capabilities] ||
      fields[FIELD_IDS.assets.clientId] ||
      fields[FIELD_IDS.assets.appId] ||
      fields[FIELD_IDS.assets.visibility] ||
      fields[FIELD_IDS.assets.marketplaceStatus],
  );
}

function mapAsset(record: AirtableRecord, options: { includeRawFields?: boolean; includeSensitive?: boolean }): AppReviewerAsset {
  const mapped = mapFields(record.fields, ASSET_FIELD_LABELS, {
    includeRawFields: options.includeRawFields,
    sensitiveFieldIds: options.includeSensitive ? [] : [FIELD_IDS.assets.credentials],
  });
  return {
    id: record.id,
    createdTime: record.createdTime,
    ...mapped,
  };
}

function mapVersion(record: AirtableRecord, options: { includeRawFields?: boolean }): AppReviewerAssetVersion {
  const mapped = mapFields(record.fields, VERSION_FIELD_LABELS, {
    includeRawFields: options.includeRawFields,
  });
  const linkedIds = [
    ...toStringArray(record.fields[FIELD_IDS.versions.assetLink]),
    ...toStringArray(record.fields[FIELD_IDS.versions.assetRecordIdRollup]),
  ];
  return {
    id: record.id,
    createdTime: record.createdTime,
    assetId: linkedIds[0],
    ...mapped,
  };
}

export class AirtableClient {
  private readonly tokenProvider: TokenProvider;
  private readonly baseId: string;
  private readonly fetchFn: FetchFn;
  private readonly sleepFn: SleepFn;
  private readonly maxRetries: number;

  constructor(options: AirtableClientOptions) {
    this.tokenProvider = options.tokenProvider;
    this.baseId = options.baseId ?? DEFAULT_AIRTABLE_BASE_ID;
    this.fetchFn = options.fetchFn ?? defaultFetch;
    this.sleepFn = options.sleepFn ?? defaultSleep;
    this.maxRetries = options.maxRetries ?? 2;
  }

  async healthCheck(): Promise<{ ok: boolean; baseId: string; tables: typeof TABLE_IDS; sampleReads: Record<string, number> }> {
    const [assets, versions] = await Promise.all([
      this.listRecords({
        tableId: TABLE_IDS.assets,
        fieldIds: [FIELD_IDS.assets.name],
        limit: 1,
      }),
      this.listRecords({
        tableId: TABLE_IDS.assetVersions,
        fieldIds: [FIELD_IDS.versions.versionNumber],
        limit: 1,
      }),
    ]);

    return {
      ok: true,
      baseId: this.baseId,
      tables: TABLE_IDS,
      sampleReads: {
        assets: assets.records.length,
        assetVersions: versions.records.length,
      },
    };
  }

  async listAssets(query: ListAssetsQuery = {}): Promise<AirtablePage<AppReviewerAsset>> {
    const preset = query.preset ?? 'summary';
    const fieldIds = assetFieldsForPreset(preset, query.includeSensitive ?? false);
    const sort = sortForAssets(query.sort);
    const filterByFormula = andFormula([
      query.appId ? exactFormula(FIELD_IDS.assets.appId, query.appId) : undefined,
      query.marketplaceStatus ? exactFormula(FIELD_IDS.assets.marketplaceStatus, query.marketplaceStatus) : undefined,
      query.latestReviewStatus ? exactFormula(FIELD_IDS.assets.latestReviewStatus, query.latestReviewStatus) : undefined,
      query.visibility ? exactFormula(FIELD_IDS.assets.visibility, query.visibility) : undefined,
      query.search
        ? orFormula([
            containsFormula(FIELD_IDS.assets.name, query.search),
            containsFormula(FIELD_IDS.assets.appId, query.search),
            containsFormula(FIELD_IDS.assets.clientId, query.search),
          ])
        : undefined,
    ]);

    const page = await this.listRecords({
      tableId: TABLE_IDS.assets,
      fieldIds,
      limit: query.limit,
      offset: query.offset,
      filterByFormula,
      sortField: sort.field,
      sortDirection: sort.direction,
    });

    return {
      records: page.records.map((record) =>
        mapAsset(record, {
          includeRawFields: query.includeRawFields,
          includeSensitive: query.includeSensitive,
        }),
      ),
      nextOffset: page.nextOffset,
      pageSize: page.pageSize,
      returned: page.records.length,
      projectedFields: fieldIds,
    };
  }

  async getAsset(query: GetAssetQuery): Promise<{
    asset: AppReviewerAsset | null;
    versions?: AirtablePage<AppReviewerAssetVersion>;
    projectedFields: string[];
  }> {
    const preset = query.preset ?? 'review';
    const fieldIds = assetFieldsForPreset(preset, query.includeSensitive ?? false);
    const record = query.assetId
      ? await this.getRecord(TABLE_IDS.assets, query.assetId, fieldIds)
      : await this.findOneRecord(TABLE_IDS.assets, fieldIds, exactFormula(FIELD_IDS.assets.appId, query.appId ?? ''));

    if (!record) {
      return { asset: null, projectedFields: fieldIds };
    }

    const asset = mapAsset(record, {
      includeRawFields: query.includeRawFields,
      includeSensitive: query.includeSensitive,
    });

    return {
      asset,
      projectedFields: fieldIds,
      ...(query.includeVersions
        ? {
            versions: await this.listVersions({
              assetId: record.id,
              limit: query.versionsLimit ?? 20,
              preset: 'summary',
            }),
          }
        : {}),
    };
  }

  async getVersion(versionId: string, query: Omit<ListVersionsQuery, 'versionId'> = {}): Promise<{
    version: AppReviewerAssetVersion | null;
    projectedFields: string[];
  }> {
    const fieldIds = versionFieldsForPreset(query.preset ?? 'review');
    const record = await this.getRecord(TABLE_IDS.assetVersions, versionId, fieldIds);
    return {
      version: record ? mapVersion(record, { includeRawFields: query.includeRawFields }) : null,
      projectedFields: fieldIds,
    };
  }

  async listVersions(query: ListVersionsQuery = {}): Promise<AirtablePage<AppReviewerAssetVersion>> {
    const fieldIds = versionFieldsForPreset(query.preset ?? 'review');
    const sort = sortForVersions(query.sort);
    const filterByFormula = andFormula([
      query.versionId ? `RECORD_ID() = '${escapeFormulaValue(query.versionId)}'` : undefined,
      query.assetId ? exactFormula(FIELD_IDS.versions.assetRecordIdRollup, query.assetId) : undefined,
      query.reviewStatus ? exactFormula(FIELD_IDS.versions.reviewStatus, query.reviewStatus) : undefined,
      query.reviewType ? exactFormula(FIELD_IDS.versions.reviewType, query.reviewType) : undefined,
    ]);
    const page = await this.listRecords({
      tableId: TABLE_IDS.assetVersions,
      fieldIds,
      limit: query.limit,
      offset: query.offset,
      filterByFormula,
      sortField: sort.field,
      sortDirection: sort.direction,
    });

    return {
      records: page.records.map((record) => mapVersion(record, { includeRawFields: query.includeRawFields })),
      nextOffset: page.nextOffset,
      pageSize: page.pageSize,
      returned: page.records.length,
      projectedFields: fieldIds,
    };
  }

  prepareAssetFieldsUpdate(input: AssetFieldsUpdateInput): PreparedUpdate {
    const keys = definedKeys(input as Record<string, unknown>);
    const { writableKeys } = validateAssetWriteKeys(keys);
    const fields: Record<string, unknown> = {};

    for (const key of writableKeys) {
      const value = input[key];
      switch (key) {
        case 'app_name':
          fields[FIELD_IDS.assets.name] = value ?? null;
          break;
        case 'client_id':
          fields[FIELD_IDS.assets.clientId] = value ?? null;
          break;
        case 'features_text':
          fields[FIELD_IDS.assets.featuresText] = value ?? null;
          break;
        case 'notes':
          fields[FIELD_IDS.assets.notes] = value ?? null;
          break;
        case 'credentials':
          fields[FIELD_IDS.assets.credentials] = value ?? null;
          break;
        case 'description_short':
          fields[FIELD_IDS.assets.descriptionShort] = value ?? null;
          break;
        case 'description_long_html':
          fields[FIELD_IDS.assets.descriptionLongHtml] = value ?? null;
          break;
        case 'install_url':
          fields[FIELD_IDS.assets.installUrlDirect] = value ?? null;
          break;
        case 'icon_image_alt_text':
          fields[FIELD_IDS.assets.iconImageAltText] = value ?? null;
          break;
        case 'carousel_image_alt_text':
          fields[FIELD_IDS.assets.carouselImagesAltText] = value ?? null;
          break;
        case 'demo_video_url':
          fields[FIELD_IDS.assets.demoVideoUrl] = value ?? null;
          break;
        case 'privacy_policy_url':
          fields[FIELD_IDS.assets.privacyPolicyUrl] = value ?? null;
          break;
        case 'terms_and_conditions_url':
          fields[FIELD_IDS.assets.termsAndConditionsUrl] = value ?? null;
          break;
        case 'website_url':
          fields[FIELD_IDS.assets.websiteUrl] = value ?? null;
          break;
        case 'support_email_or_url':
          fields[FIELD_IDS.assets.supportEmailOrUrl] = value ?? null;
          break;
        case 'preview_site_url':
          fields[FIELD_IDS.assets.previewSiteUrl] = value ?? null;
          break;
        case 'promo_video_url':
          fields[FIELD_IDS.assets.promoVideoUrl] = value ?? null;
          break;
        case 'app_capabilities':
          assertOption(value as string | null | undefined, CAPABILITIES_OPTIONS, 'INVALID_CAPABILITY', 'Unsupported app capability.');
          fields[FIELD_IDS.assets.capabilities] = value ?? null;
          break;
        case 'visibility_status':
          assertOption(
            value as string | null | undefined,
            VISIBILITY_OPTIONS,
            'INVALID_VISIBILITY_STATUS',
            'Unsupported visibility status.',
          );
          fields[FIELD_IDS.assets.visibility] = value ?? null;
          break;
        case 'marketplace_status':
          assertOption(
            value as string | null | undefined,
            MARKETPLACE_STATUS_OPTIONS,
            'INVALID_MARKETPLACE_STATUS',
            'Unsupported marketplace status.',
          );
          fields[FIELD_IDS.assets.marketplaceStatus] = value ?? null;
          break;
        case 'relationships_status':
          if (value === null) {
            fields[FIELD_IDS.assets.relationshipOwner] = null;
            break;
          }
          if (!value || typeof value !== 'object' || typeof (value as CollaboratorRef).id !== 'string') {
            throw new AirtableClientError(
              'INVALID_RELATIONSHIPS_STATUS',
              'relationships_status must be null or { id: string }.',
              400,
            );
          }
          fields[FIELD_IDS.assets.relationshipOwner] = { id: (value as CollaboratorRef).id };
          break;
        case 'categories_record_ids':
          if (value !== null && (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))) {
            throw new AirtableClientError(
              'INVALID_CATEGORIES',
              'categories_record_ids must be null or an array of Airtable record IDs.',
              400,
            );
          }
          fields[FIELD_IDS.assets.categories] = value ?? [];
          break;
        case 'icon_image_url':
          fields[FIELD_IDS.assets.iconImage] = value ? [{ url: value }] : [];
          break;
        case 'carousel_image_urls':
          if (value !== null && (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))) {
            throw new AirtableClientError(
              'INVALID_CAROUSEL_IMAGES',
              'carousel_image_urls must be null or an array of URL strings.',
              400,
            );
          }
          fields[FIELD_IDS.assets.carouselImages] = (value === null ? [] : (value as string[])).map((url) => ({ url }));
          break;
        case 'payment_times':
          if (value !== null && (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))) {
            throw new AirtableClientError('INVALID_PAYMENT_TYPES', 'payment_times must be null or an array of strings.', 400);
          }
          fields[FIELD_IDS.assets.paymentTypes] = value ?? [];
          break;
        default:
          break;
      }
    }

    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError('NO_MUTATION_FIELDS', 'No writable asset fields were provided.', 400, {
        allowedWritableKeys: Object.keys(WRITABLE_ASSET_FIELDS),
      });
    }

    return preparedUpdate(fields, ASSET_FIELD_LABELS);
  }

  prepareVersionFieldsUpdate(input: VersionFieldsUpdateInput): PreparedUpdate {
    const keys = definedKeys(input as Record<string, unknown>);
    const { writableKeys } = validateVersionWriteKeys(keys);
    const fields: Record<string, unknown> = {};

    for (const key of writableKeys) {
      const value = input[key];
      switch (key) {
        case 'review_status':
          assertOption(value as string | null | undefined, REVIEW_STATUS_OPTIONS, 'INVALID_REVIEW_STATUS', 'Unsupported review status.');
          fields[FIELD_IDS.versions.reviewStatus] = value ?? null;
          break;
        case 'review_type':
          assertOption(value as string | null | undefined, REVIEW_TYPE_OPTIONS, 'INVALID_REVIEW_TYPE', 'Unsupported review type.');
          fields[FIELD_IDS.versions.reviewType] = value ?? null;
          break;
        case 'rejection_reason':
          assertOption(
            value as string | null | undefined,
            REJECTION_REASON_OPTIONS,
            'INVALID_REJECTION_REASON',
            'Unsupported rejection reason.',
          );
          fields[FIELD_IDS.versions.rejectionReason] = value ?? null;
          break;
        case 'reviewer':
          if (value === null) {
            fields[FIELD_IDS.versions.reviewer] = null;
            break;
          }
          if (!value || typeof value !== 'object' || typeof (value as CollaboratorRef).id !== 'string') {
            throw new AirtableClientError('INVALID_REVIEWER', 'reviewer must be null or { id: string }.', 400);
          }
          fields[FIELD_IDS.versions.reviewer] = { id: (value as CollaboratorRef).id };
          break;
        case 'review_feedback':
          fields[FIELD_IDS.versions.reviewFeedback] = value ?? null;
          break;
        case 'submission_datetime_override':
          fields[FIELD_IDS.versions.submissionDatetimeOverride] =
            typeof value === 'string' ? normalizeDateTime(value) : null;
          break;
        default:
          break;
      }
    }

    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError('NO_MUTATION_FIELDS', 'No writable asset-version fields were provided.', 400, {
        allowedWritableKeys: Object.keys(WRITABLE_VERSION_FIELDS),
      });
    }

    return preparedUpdate(fields, VERSION_FIELD_LABELS);
  }

  async updateAssetFields(
    assetId: string,
    input: AssetFieldsUpdateInput,
    options: { includeSensitive?: boolean; includeRawFields?: boolean } = {},
  ): Promise<{ asset: AppReviewerAsset; updatedFields: PreparedUpdate }> {
    const prepared = this.prepareAssetFieldsUpdate(input);
    const updated = await this.updateRecord(TABLE_IDS.assets, assetId, prepared.fieldsByFieldId);
    if (!isAppLikeAsset(updated.fields)) {
      throw new AirtableClientError('OUT_OF_SCOPE_ASSET', 'Updated asset is outside app-review scope.', 403);
    }
    return {
      asset: mapAsset(updated, {
        includeRawFields: options.includeRawFields,
        includeSensitive: options.includeSensitive,
      }),
      updatedFields: {
        ...prepared,
        fieldsByFieldId: options.includeRawFields ? prepared.fieldsByFieldId : {},
      },
    };
  }

  async updateVersionFields(
    versionId: string,
    input: VersionFieldsUpdateInput,
    options: { includeRawFields?: boolean } = {},
  ): Promise<{ version: AppReviewerAssetVersion; updatedFields: PreparedUpdate }> {
    const prepared = this.prepareVersionFieldsUpdate(input);
    const updated = await this.updateRecord(TABLE_IDS.assetVersions, versionId, prepared.fieldsByFieldId);
    return {
      version: mapVersion(updated, { includeRawFields: options.includeRawFields }),
      updatedFields: {
        ...prepared,
        fieldsByFieldId: options.includeRawFields ? prepared.fieldsByFieldId : {},
      },
    };
  }

  private async findOneRecord(
    tableId: string,
    fieldIds: string[],
    filterByFormula: string | undefined,
  ): Promise<AirtableRecord | null> {
    if (!filterByFormula) return null;
    const page = await this.listRecords({ tableId, fieldIds, limit: 1, filterByFormula });
    return page.records[0] ?? null;
  }

  private async getRecord(tableId: string, recordId: string, fieldIds: string[]): Promise<AirtableRecord | null> {
    const query = new URLSearchParams();
    query.set('returnFieldsByFieldId', 'true');
    fieldIds.forEach((fieldId) => query.append('fields[]', fieldId));

    try {
      return await this.requestJson<AirtableRecord>(
        `/${encodeURIComponent(tableId)}/${encodeURIComponent(recordId)}`,
        query,
      );
    } catch (error) {
      if (error instanceof AirtableClientError && error.status === 404) return null;
      throw error;
    }
  }

  private async listRecords(args: {
    tableId: string;
    fieldIds: string[];
    limit?: number;
    offset?: string;
    filterByFormula?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<{ records: AirtableRecord[]; nextOffset?: string; pageSize: number }> {
    const pageSize = clampLimit(args.limit, 25, 100);
    const query = new URLSearchParams();
    query.set('returnFieldsByFieldId', 'true');
    query.set('pageSize', String(pageSize));
    args.fieldIds.forEach((fieldId) => query.append('fields[]', fieldId));
    if (args.offset) query.set('offset', args.offset);
    if (args.filterByFormula) query.set('filterByFormula', args.filterByFormula);
    if (args.sortField) {
      query.set('sort[0][field]', args.sortField);
      query.set('sort[0][direction]', args.sortDirection ?? 'asc');
    }

    const data = await this.requestJson<AirtableListResponse>(`/${encodeURIComponent(args.tableId)}`, query);
    return {
      records: data.records,
      nextOffset: data.offset,
      pageSize,
    };
  }

  private async updateRecord(tableId: string, recordId: string, fields: Record<string, unknown>): Promise<AirtableRecord> {
    const query = new URLSearchParams();
    query.set('returnFieldsByFieldId', 'true');
    query.set('typecast', 'true');

    const data = await this.requestJson<AirtableListResponse>(`/${encodeURIComponent(tableId)}`, query, {
      method: 'PATCH',
      body: JSON.stringify({
        records: [
          {
            id: recordId,
            fields,
          },
        ],
      }),
    });

    const updated = data.records[0];
    if (!updated) {
      throw new AirtableClientError('AIRTABLE_EMPTY_UPDATE', 'Airtable update returned no records.', 502);
    }
    return updated;
  }

  private async requestJson<T>(
    path: string,
    query: URLSearchParams,
    init: { method?: 'GET' | 'PATCH'; body?: string } = {},
  ): Promise<T> {
    const token = await this.tokenProvider.getAccessToken();
    const url = new URL(`https://api.airtable.com/v0/${encodeURIComponent(this.baseId)}${path}`);
    for (const [key, value] of query.entries()) {
      url.searchParams.append(key, value);
    }

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.fetchFn(url, {
          method: init.method ?? 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(init.body ? { body: init.body } : {}),
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        const details = await safeJson(response);
        if ([429, 500, 502, 503, 504].includes(response.status) && attempt < this.maxRetries) {
          await this.sleepFn(Math.min(250 * 2 ** attempt, 2000));
          continue;
        }

        throw new AirtableClientError(
          'AIRTABLE_REQUEST_FAILED',
          `Airtable request failed with ${response.status} ${response.statusText}.`,
          response.status,
          details,
        );
      } catch (error) {
        if (error instanceof AirtableClientError) throw error;
        if (attempt < this.maxRetries) {
          await this.sleepFn(Math.min(250 * 2 ** attempt, 2000));
          continue;
        }
        throw new AirtableClientError('AIRTABLE_NETWORK_ERROR', 'Airtable network request failed.', undefined, String(error));
      }
    }

    throw new AirtableClientError('AIRTABLE_UNKNOWN_ERROR', 'Unexpected Airtable request failure.');
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}
