import {
  CONFIRMED_ASSET_FIELDS,
  CONFIRMED_RELEASE_FIELDS,
  CONFIRMED_WRITE_FIELD_IDS,
  CONFIRMED_VERSION_FIELDS,
  DEFAULT_AIRTABLE_BASE_ID,
  QUALITY_RATING_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  TABLE_IDS,
  isTemplateLikeAsset,
} from './schema.js';

type CollaboratorRef = {
  id: string;
  email?: string;
  name?: string;
};

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
  mrpId?: string;
  mrpIdOverride?: string;
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
  releaseId?: string;
  reviewOwner?: CollaboratorRef | null;
  reviewStatus?: string;
  qualityRating?: string;
  improvementAreas?: string[];
  reviewFeedback?: string;
  reviewChecklist?: string;
  publishingChecklist?: string;
  releaseDate?: string;
  decisionDate?: string;
  rejectReason?: string;
  rejectionFeedback?: string;
  mrpIdOverwrite?: string;
  versionNumber?: number;
  createdAt?: string;
  createdBy?: string;
  rawFields: Record<string, unknown>;
}

export interface TemplateReviewRelease {
  releaseId: string;
  releaseName: string;
  status?: string;
  releaseOwner?: CollaboratorRef | null;
  rawFields: Record<string, unknown>;
}

export interface VersionReviewUpdateInput {
  review_owner?: unknown;
  review_status?: string;
  quality_rating?: string;
  improvement_areas?: string[];
  review_feedback?: string;
  review_checklist?: unknown;
  publishing_checklist?: unknown;
  release_date?: string;
  release_record_id?: string;
  mrp_id_overwrite?: string;
  reject_reason?: string;
  rejection_feedback?: string;
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

export interface TemplateAssetPublishingUpdateInput {
  mrp_id_overwrite?: string;
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

function collaboratorValue(value: unknown): CollaboratorRef | null {
  if (!value) return null;
  if (Array.isArray(value)) return collaboratorValue(value[0]);
  if (typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string') return null;
  return {
    id: raw.id,
    ...(typeof raw.email === 'string' ? { email: raw.email } : {}),
    ...(typeof raw.name === 'string' ? { name: raw.name } : {}),
  };
}

function collaboratorLabel(value: unknown): string | undefined {
  const collaborator = collaboratorValue(value);
  return collaborator?.name ?? collaborator?.email ?? collaborator?.id;
}

function coerceLongText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join('\n');
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value ?? '');
}

function mapAsset(record: AirtableRecord): TemplateReviewAsset {
  const fields = record.fields;
  return {
    assetId: record.id,
    templateName: firstString(fields[CONFIRMED_ASSET_FIELDS.name]) ?? '',
    description: firstString(fields[CONFIRMED_ASSET_FIELDS.description]),
    descriptionShort: firstString(fields[CONFIRMED_ASSET_FIELDS.descriptionShort]),
    descriptionLongHtml: firstString(fields[CONFIRMED_ASSET_FIELDS.descriptionLongHtml]),
    mrpId: firstString(fields[CONFIRMED_ASSET_FIELDS.mrpId]),
    mrpIdOverride: firstString(fields[CONFIRMED_ASSET_FIELDS.mrpIdOverride]),
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
    assetId:
      firstString(record.fields[CONFIRMED_VERSION_FIELDS.assetRecordId]) ??
      firstString(record.fields[CONFIRMED_VERSION_FIELDS.assetLink]),
    releaseId: firstString(record.fields[CONFIRMED_VERSION_FIELDS.release]),
    reviewOwner: collaboratorValue(record.fields[CONFIRMED_VERSION_FIELDS.reviewOwner]),
    reviewStatus: firstString(record.fields[CONFIRMED_VERSION_FIELDS.reviewStatus]),
    qualityRating: firstString(record.fields[CONFIRMED_VERSION_FIELDS.qualityRating]),
    improvementAreas: stringArray(record.fields[CONFIRMED_VERSION_FIELDS.improvementAreas]),
    reviewFeedback: firstString(record.fields[CONFIRMED_VERSION_FIELDS.reviewFeedback]),
    reviewChecklist: firstString(record.fields[CONFIRMED_VERSION_FIELDS.reviewChecklist]),
    publishingChecklist: firstString(record.fields[CONFIRMED_VERSION_FIELDS.publishingChecklist]),
    releaseDate: firstString(record.fields[CONFIRMED_VERSION_FIELDS.releaseDate]),
    decisionDate: firstString(record.fields[CONFIRMED_VERSION_FIELDS.decisionDate]),
    rejectReason: firstString(record.fields[CONFIRMED_VERSION_FIELDS.rejectReason]),
    rejectionFeedback: firstString(record.fields[CONFIRMED_VERSION_FIELDS.rejectionFeedback]),
    mrpIdOverwrite: firstString(record.fields[CONFIRMED_VERSION_FIELDS.mrpIdOverwrite]),
    versionNumber: numberValue(record.fields[CONFIRMED_VERSION_FIELDS.versionNumber]),
    createdAt: firstString(record.fields[CONFIRMED_VERSION_FIELDS.submissionDatetime]) ?? record.createdTime,
    createdBy: collaboratorLabel(record.fields[CONFIRMED_VERSION_FIELDS.createdBy]),
    rawFields: record.fields,
  };
}

function mapRelease(record: AirtableRecord): TemplateReviewRelease {
  return {
    releaseId: record.id,
    releaseName: firstString(record.fields[CONFIRMED_RELEASE_FIELDS.releaseName]) ?? record.id,
    status: firstString(record.fields[CONFIRMED_RELEASE_FIELDS.status]),
    releaseOwner: collaboratorValue(record.fields[CONFIRMED_RELEASE_FIELDS.releaseOwner]),
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
    const formula = `{${CONFIRMED_VERSION_FIELDS.assetRecordId}} = '${escapeFormulaValue(assetId)}'`;
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

  async listReleases(limit = 100): Promise<TemplateReviewRelease[]> {
    const records = await this.listRecords({
      tableId: TABLE_IDS.assetReleases,
      fieldNames: Object.values(CONFIRMED_RELEASE_FIELDS),
      limit,
      sortField: CONFIRMED_RELEASE_FIELDS.releaseName,
      sortDirection: 'desc',
    });
    return records.map((record) => mapRelease(record));
  }

  async updateVersionReview(versionId: string, input: VersionReviewUpdateInput): Promise<TemplateReviewVersion> {
    const fields: Record<string, unknown> = {};

    if (input.release_date !== undefined) {
      throw new AirtableClientError(
        'UNSUPPORTED_WRITE_FIELD',
        'release_date is a read-only rollup on template versions. Use release_record_id to link a 🚀Release record instead.',
        501,
        {
          field: 'release_date',
          airtableField: CONFIRMED_VERSION_FIELDS.releaseDate,
          useInstead: 'release_record_id',
          writableField: CONFIRMED_VERSION_FIELDS.release,
          writableFieldId: CONFIRMED_WRITE_FIELD_IDS.versions.release,
        },
      );
    }

    if (input.mrp_id_overwrite !== undefined) {
      throw new AirtableClientError(
        'UNSUPPORTED_WRITE_FIELD',
        'mrp_id_overwrite appears to belong to asset-level publishing overrides and is not yet wired for template review mutations.',
        501,
        { field: 'mrp_id_overwrite', suspectedScope: 'asset' },
      );
    }

    if (input.review_owner !== undefined) {
      if (input.review_owner === null) {
        fields[CONFIRMED_VERSION_FIELDS.reviewOwner] = null;
      } else if (typeof input.review_owner === 'string') {
        fields[CONFIRMED_VERSION_FIELDS.reviewOwner] = { id: input.review_owner };
      } else if (
        input.review_owner &&
        typeof input.review_owner === 'object' &&
        typeof (input.review_owner as { id?: unknown }).id === 'string'
      ) {
        fields[CONFIRMED_VERSION_FIELDS.reviewOwner] = { id: (input.review_owner as { id: string }).id };
      } else {
        throw new AirtableClientError('INVALID_REVIEW_OWNER', 'review_owner must be null, a collaborator id string, or an object with an id.', 400);
      }
    }

    if (input.review_status !== undefined) {
      if (!(REVIEW_STATUS_OPTIONS as readonly string[]).includes(input.review_status)) {
        throw new AirtableClientError('INVALID_REVIEW_STATUS', 'Unsupported review status.', 400, {
          value: input.review_status,
          allowed: REVIEW_STATUS_OPTIONS,
        });
      }
      fields[CONFIRMED_VERSION_FIELDS.reviewStatus] = input.review_status;
    }

    if (input.quality_rating !== undefined) {
      if (!(QUALITY_RATING_OPTIONS as readonly string[]).includes(input.quality_rating)) {
        throw new AirtableClientError('INVALID_QUALITY_RATING', 'Unsupported quality rating.', 400, {
          value: input.quality_rating,
          allowed: QUALITY_RATING_OPTIONS,
        });
      }
      fields[CONFIRMED_VERSION_FIELDS.qualityRating] = input.quality_rating;
    }

    if (input.improvement_areas !== undefined) fields[CONFIRMED_VERSION_FIELDS.improvementAreas] = input.improvement_areas;
    if (input.review_feedback !== undefined) fields[CONFIRMED_VERSION_FIELDS.reviewFeedback] = input.review_feedback;
    if (input.review_checklist !== undefined) fields[CONFIRMED_VERSION_FIELDS.reviewChecklist] = coerceLongText(input.review_checklist);
    if (input.publishing_checklist !== undefined) {
      fields[CONFIRMED_VERSION_FIELDS.publishingChecklist] = coerceLongText(input.publishing_checklist);
    }
    if (input.release_record_id !== undefined) {
      fields[CONFIRMED_WRITE_FIELD_IDS.versions.release] = input.release_record_id ? [input.release_record_id] : [];
    }
    if (input.mrp_id_overwrite !== undefined) fields[CONFIRMED_VERSION_FIELDS.mrpIdOverwrite] = input.mrp_id_overwrite;
    if (input.reject_reason !== undefined) fields[CONFIRMED_VERSION_FIELDS.rejectReason] = input.reject_reason;
    if (input.rejection_feedback !== undefined) fields[CONFIRMED_VERSION_FIELDS.rejectionFeedback] = input.rejection_feedback;

    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError('NO_MUTATION_FIELDS', 'No version review fields were provided.', 400);
    }

    const updated = await this.updateRecord(TABLE_IDS.assetVersions, versionId, fields);
    return mapVersion(updated);
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

  async updateAssetPublishing(assetId: string, input: TemplateAssetPublishingUpdateInput): Promise<TemplateReviewAsset> {
    const fields: Record<string, unknown> = {};
    if (input.mrp_id_overwrite !== undefined) {
      fields[CONFIRMED_WRITE_FIELD_IDS.assets.mrpIdOverride] = input.mrp_id_overwrite;
    }

    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError('NO_MUTATION_FIELDS', 'No confirmed asset publishing fields were provided.', 400);
    }

    const updated = await this.updateRecord(TABLE_IDS.assets, assetId, fields);
    if (!isTemplateLikeAsset(updated.fields)) {
      throw new AirtableClientError('OUT_OF_SCOPE_ASSET', 'Updated asset is outside template-review scope.', 403);
    }
    return mapAsset(updated);
  }

}
