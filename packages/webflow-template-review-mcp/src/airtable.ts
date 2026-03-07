import {
  CONFIRMED_ASSET_FIELDS,
  CONFIRMED_VERSION_FIELDS,
  DEFAULT_AIRTABLE_BASE_ID,
  REVIEW_STATUS_OPTIONS,
  TABLE_IDS,
  TEMPLATE_REVIEW_FIELD_MAP,
  isTemplateLikeAsset,
} from './schema.js';

const VERSION_ASSET_ID_ROLLUP_FIELD_ID = 'fldknoYakli2sqznT';

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

export interface TemplateReviewQueueItem {
  assetId: string;
  templateName: string;
  latestReviewStatus?: string;
  latestReviewFeedback?: string;
  qualityRating?: string;
  websiteUrl?: string;
  previewSiteUrl?: string;
  submittedDate?: string;
}

export interface TemplateReviewAsset extends TemplateReviewQueueItem {
  description?: string;
  descriptionShort?: string;
  descriptionLongHtml?: string;
  thumbnailImageUrl?: string;
  secondaryThumbnailUrls?: string[];
  carouselImageUrls?: string[];
  marketplaceStatus?: string;
  latestReviewDate?: string;
  rejectionFeedback?: string;
  rejectionFeedbackHtml?: string;
  publishedDate?: string;
  decisionDate?: string;
  priceString?: string;
}

export interface TemplateReviewVersion {
  versionId: string;
  assetId?: string;
  versionNumber?: number;
  createdAt?: string;
  createdBy?: string;
  changes?: string;
  snapshot?: unknown;
  rawFields: Record<string, unknown>;
}

export interface TemplateAssetMetadataUpdateInput {
  template_name?: string;
  description?: string;
  description_short?: string;
  description_long_html?: string;
  website_url?: string;
  preview_site_url?: string;
  thumbnail_image_url?: string | null;
  thumbnail_image_secondary_urls?: string[];
  carousel_image_urls?: string[];
}

export interface AirtableClientOptions {
  apiKey: string;
  baseId?: string;
  fetchFn?: typeof fetch;
}

interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "''");
}

function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstString(value[0]);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string') {
        return (item as { name: string }).name;
      }
      return undefined;
    })
    .filter((item): item is string => Boolean(item));
}

function attachmentUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return undefined;
      const url = (item as { url?: unknown }).url;
      return typeof url === 'string' ? url : undefined;
    })
    .filter((item): item is string => Boolean(item));
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function mapAsset(record: AirtableRecord): TemplateReviewAsset {
  const fields = record.fields;
  return {
    assetId: record.id,
    templateName: firstString(fields[CONFIRMED_ASSET_FIELDS.name]) ?? '',
    description: firstString(fields[CONFIRMED_ASSET_FIELDS.description]),
    descriptionShort: firstString(fields[CONFIRMED_ASSET_FIELDS.descriptionShort]),
    descriptionLongHtml: firstString(fields[CONFIRMED_ASSET_FIELDS.descriptionLongHtml]),
    websiteUrl: firstString(fields[CONFIRMED_ASSET_FIELDS.websiteUrl]),
    previewSiteUrl: firstString(fields[CONFIRMED_ASSET_FIELDS.previewSiteUrl]),
    marketplaceStatus: firstString(fields[CONFIRMED_ASSET_FIELDS.marketplaceStatus]),
    latestReviewStatus: firstString(fields[CONFIRMED_ASSET_FIELDS.latestReviewStatus]),
    latestReviewDate: firstString(fields[CONFIRMED_ASSET_FIELDS.latestReviewDate]),
    latestReviewFeedback: firstString(fields[CONFIRMED_ASSET_FIELDS.latestReviewFeedback]),
    rejectionFeedback: firstString(fields[CONFIRMED_ASSET_FIELDS.rejectionFeedback]),
    rejectionFeedbackHtml: firstString(fields[CONFIRMED_ASSET_FIELDS.rejectionFeedbackHtml]),
    qualityRating: firstString(fields[CONFIRMED_ASSET_FIELDS.qualityScore]),
    thumbnailImageUrl: attachmentUrls(fields[CONFIRMED_ASSET_FIELDS.thumbnailImage])[0],
    secondaryThumbnailUrls: attachmentUrls(fields[CONFIRMED_ASSET_FIELDS.thumbnailImageSecondary]),
    carouselImageUrls: attachmentUrls(fields[CONFIRMED_ASSET_FIELDS.carouselImages]),
    submittedDate: firstString(fields[CONFIRMED_ASSET_FIELDS.submittedDate]),
    publishedDate: firstString(fields[CONFIRMED_ASSET_FIELDS.publishedDate]),
    decisionDate: firstString(fields[CONFIRMED_ASSET_FIELDS.decisionDate]),
    priceString: firstString(fields[CONFIRMED_ASSET_FIELDS.priceString]),
  };
}

function mapVersion(record: AirtableRecord): TemplateReviewVersion {
  return {
    versionId: record.id,
    assetId: firstString(record.fields[CONFIRMED_VERSION_FIELDS.assetId]),
    versionNumber: numberValue(record.fields[CONFIRMED_VERSION_FIELDS.versionNumber]),
    createdAt: firstString(record.fields[CONFIRMED_VERSION_FIELDS.createdAt]) ?? record.createdTime,
    createdBy: firstString(record.fields[CONFIRMED_VERSION_FIELDS.createdBy]),
    changes: firstString(record.fields[CONFIRMED_VERSION_FIELDS.changes]),
    snapshot: record.fields[CONFIRMED_VERSION_FIELDS.snapshot],
    rawFields: record.fields,
  };
}

export class AirtableClient {
  private apiKey: string;
  private baseId: string;
  private fetchFn: typeof fetch;

  constructor(options: AirtableClientOptions) {
    this.apiKey = options.apiKey;
    this.baseId = options.baseId ?? DEFAULT_AIRTABLE_BASE_ID;
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const response = await this.fetchFn(`https://api.airtable.com/v0/${this.baseId}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    return response;
  }

  private async listRecords(args: {
    tableId: string;
    fieldNames?: string[];
    limit?: number;
    filterByFormula?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<AirtableRecord[]> {
    const params = new URLSearchParams();
    if (args.limit) params.set('maxRecords', String(args.limit));
    if (args.filterByFormula) params.set('filterByFormula', args.filterByFormula);
    for (const field of args.fieldNames ?? []) params.append('fields[]', field);
    if (args.sortField) {
      params.set('sort[0][field]', args.sortField);
      params.set('sort[0][direction]', args.sortDirection ?? 'asc');
    }
    const response = await this.request(`/${args.tableId}?${params.toString()}`);
    if (!response.ok) {
      throw new AirtableClientError('AIRTABLE_LIST_FAILED', 'Failed to list Airtable records.', response.status);
    }
    const json = (await response.json()) as { records?: AirtableRecord[] };
    return json.records ?? [];
  }

  private async getRecord(tableId: string, recordId: string): Promise<AirtableRecord | null> {
    const response = await this.request(`/${tableId}/${recordId}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new AirtableClientError('AIRTABLE_GET_FAILED', 'Failed to fetch Airtable record.', response.status, {
        tableId,
        recordId,
      });
    }
    return (await response.json()) as AirtableRecord;
  }

  private async updateRecord(
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>,
  ): Promise<AirtableRecord> {
    const response = await this.request(`/${tableId}/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    });
    if (!response.ok) {
      throw new AirtableClientError('AIRTABLE_UPDATE_FAILED', 'Failed to update Airtable record.', response.status, {
        tableId,
        recordId,
      });
    }
    return (await response.json()) as AirtableRecord;
  }

  async healthCheck() {
    const records = await this.listRecords({
      tableId: TABLE_IDS.assets,
      fieldNames: [CONFIRMED_ASSET_FIELDS.type, CONFIRMED_ASSET_FIELDS.name],
      limit: 10,
    });
    const templateSample = records.filter((record) => isTemplateLikeAsset(record.fields));
    return {
      ok: true,
      baseId: this.baseId,
      scope: 'templates-only',
      sampleAssetsRead: records.length,
      templateAssetsMatched: templateSample.length,
      supportedStatusOptions: [...REVIEW_STATUS_OPTIONS],
    };
  }

  async listAssetQueue(limit = 100): Promise<TemplateReviewQueueItem[]> {
    const records = await this.listRecords({
      tableId: TABLE_IDS.assets,
      limit,
      filterByFormula: `{${CONFIRMED_ASSET_FIELDS.type}} = 'Template🏗️'`,
    });
    return records.filter((record) => isTemplateLikeAsset(record.fields)).map((record) => mapAsset(record));
  }

  async getAssetById(assetId: string): Promise<TemplateReviewAsset | null> {
    const record = await this.getRecord(TABLE_IDS.assets, assetId);
    if (!record || !isTemplateLikeAsset(record.fields)) return null;
    return mapAsset(record);
  }

  async listVersionsForAsset(assetId: string, limit = 100): Promise<TemplateReviewVersion[]> {
    const formula = `{${VERSION_ASSET_ID_ROLLUP_FIELD_ID}} = '${escapeFormulaValue(assetId)}'`;
    const records = await this.listRecords({
      tableId: TABLE_IDS.assetVersions,
      limit,
      filterByFormula: formula,
    });
    return records
      .map((record) => mapVersion(record))
      .sort((a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0));
  }

  async getVersionById(versionId: string): Promise<TemplateReviewVersion | null> {
    const record = await this.getRecord(TABLE_IDS.assetVersions, versionId);
    return record ? mapVersion(record) : null;
  }

  async updateAssetMetadata(assetId: string, input: TemplateAssetMetadataUpdateInput): Promise<TemplateReviewAsset> {
    const fields: Record<string, unknown> = {};
    if (input.template_name !== undefined) fields[CONFIRMED_ASSET_FIELDS.name] = input.template_name;
    if (input.description !== undefined) fields[CONFIRMED_ASSET_FIELDS.description] = input.description;
    if (input.description_short !== undefined) fields[CONFIRMED_ASSET_FIELDS.descriptionShort] = input.description_short;
    if (input.description_long_html !== undefined) fields[CONFIRMED_ASSET_FIELDS.descriptionLongHtml] = input.description_long_html;
    if (input.website_url !== undefined) fields[CONFIRMED_ASSET_FIELDS.websiteUrl] = input.website_url;
    if (input.preview_site_url !== undefined) fields[CONFIRMED_ASSET_FIELDS.previewSiteUrl] = input.preview_site_url;
    if (input.thumbnail_image_url !== undefined) {
      fields[CONFIRMED_ASSET_FIELDS.thumbnailImage] = input.thumbnail_image_url ? [{ url: input.thumbnail_image_url }] : [];
    }
    if (input.thumbnail_image_secondary_urls !== undefined) {
      fields[CONFIRMED_ASSET_FIELDS.thumbnailImageSecondary] = input.thumbnail_image_secondary_urls.map((url) => ({ url }));
    }
    if (input.carousel_image_urls !== undefined) {
      fields[CONFIRMED_ASSET_FIELDS.carouselImages] = input.carousel_image_urls.map((url) => ({ url }));
    }

    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError('NO_MUTATION_FIELDS', 'No confirmed asset metadata fields were provided.', 400);
    }

    const updated = await this.updateRecord(TABLE_IDS.assets, assetId, fields);
    if (!isTemplateLikeAsset(updated.fields)) {
      throw new AirtableClientError('OUT_OF_SCOPE_ASSET', 'Updated asset is outside template-review scope.', 403);
    }
    return mapAsset(updated);
  }

  async pendingVersionMutation(toolName: string): Promise<never> {
    throw new AirtableClientError(
      'PENDING_FIELD_MAPPING',
      `${toolName} is scaffolded but blocked until template version field mappings are verified in Airtable.`,
      501,
      {
        fieldMap: TEMPLATE_REVIEW_FIELD_MAP.pending.versions,
      },
    );
  }
}
