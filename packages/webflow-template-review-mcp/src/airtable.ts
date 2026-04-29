import {
  ASSET_COMPATIBILITY_ALIASES,
  CONFIRMED_ASSET_FIELDS,
  CONFIRMED_RELEASE_FIELDS,
  CONFIRMED_WRITE_FIELD_IDS,
  CONFIRMED_VERSION_FIELDS,
  DEFAULT_AIRTABLE_BASE_ID,
  IMPROVEMENT_AREA_OPTIONS,
  METRICS_ASSET_FIELD_IDS,
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

export type TemplateReviewQueueStatus = 'ready_to_review' | 'in_review' | 'changes_requested' | 'approved' | 'published';
export type TemplateReviewQueueAssignmentFilter = 'any' | 'assigned' | 'unassigned';
export type TemplateReviewQueueSort = 'submittedDate_desc' | 'submittedDate_asc' | 'decisionDate_desc' | 'decisionDate_asc';

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
  latestReviewDate?: string;
  qualityRating?: string;
  websiteUrl?: string;
  previewSiteUrl?: string;
  submittedDate?: string;
  marketplaceStatus?: string;
  decisionDate?: string;
  priceString?: string;
  assignableVersionId?: string;
  reviewOwner?: CollaboratorRef | null;
  normalizedStatus?: TemplateReviewQueueStatus | null;
  isReadyToReview?: boolean;
  isUnassigned?: boolean;
  canAssign?: boolean;
  canReview?: boolean;
  canPublish?: boolean;
  isAssignedToCurrentReviewer?: boolean;
  isBlockedByOtherReviewer?: boolean;
}

export type TemplateReviewAssetSearchMode = 'contains' | 'exact';

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
  agentReviewFeedback?: string;
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

export interface TemplateReviewQueueQuery {
  limit?: number;
  status?: TemplateReviewQueueStatus;
  assigned?: TemplateReviewQueueAssignmentFilter;
  sort?: TemplateReviewQueueSort;
  currentReviewer?: CollaboratorRef | null;
  onlyAssignedToCurrentReviewer?: boolean;
}

export interface TemplateReviewContext {
  versionId: string;
  assetId?: string;
  templateName?: string;
  reviewOwner?: CollaboratorRef | null;
  reviewStatus?: string;
  qualityRating?: string;
  improvementAreas?: string[];
  reviewFeedback?: string;
  reviewChecklist?: string;
  publishingChecklist?: string;
  canAssign: boolean;
  canReview: boolean;
  canPublish: boolean;
  isAssignedToCurrentReviewer: boolean;
  currentReviewer?: CollaboratorRef | null;
  asset?: TemplateReviewAsset | null;
  version: TemplateReviewVersion;
}

export interface TemplateReviewMetricsWindow {
  startDate: string;
  endDate: string;
  days: number;
}

export interface TemplateReviewMarketplaceMetrics {
  window: TemplateReviewMetricsWindow;
  totals: {
    templatesScanned: number;
    submissions: number;
    decisions: number;
    approvals: number;
    rejections: number;
    published: number;
  };
  reviewStatusActivity: Record<string, number>;
  backlogSnapshot: {
    ready_to_review: number;
    in_review: number;
    changes_requested: number;
    approved: number;
    published: number;
    unknown: number;
  };
  qualityRatingSnapshot: Record<string, number>;
  turnaround: {
    decidedCount: number;
    averageHours: number | null;
  };
}

export interface TemplateReviewRelease {
  releaseId: string;
  releaseName: string;
  status?: string;
  releaseOwner?: CollaboratorRef | null;
  rawFields: Record<string, unknown>;
}

export interface TemplateReviewVersionSearchResult {
  asset: TemplateReviewAsset;
  versions: TemplateReviewVersion[];
}

export interface CompletePublishingInput {
  release_record_id?: string;
  release_date_local?: string;
  time_zone?: string;
  approve_version?: boolean;
  mrp_id_overwrite?: string;
}

export interface VersionReviewUpdateInput {
  review_owner?: unknown;
  review_status?: string;
  quality_rating?: string;
  improvement_areas?: string[];
  review_feedback?: string;
  agent_review_feedback?: string;
  review_checklist?: unknown;
  publishing_checklist?: unknown;
  release_date?: string;
  release_record_id?: string;
  mrp_id_overwrite?: string;
  reject_reason?: string;
  rejection_feedback?: string;
}

export interface AssignReviewerInput {
  review_owner: unknown;
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

export interface AgentFeedbackQueueQuery {
  limit?: number;
  includeStatuses?: string[];
  includeExistingFeedback?: boolean;
  viewId?: string;
}

interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

type MetricsAssetSnapshot = Pick<
  TemplateReviewAsset,
  'submittedDate' | 'publishedDate' | 'decisionDate' | 'marketplaceStatus' | 'latestReviewStatus' | 'latestReviewDate' | 'qualityRating'
>;

const QUEUE_ASSET_FIELD_NAMES = [
  CONFIRMED_ASSET_FIELDS.type,
  CONFIRMED_ASSET_FIELDS.name,
  CONFIRMED_ASSET_FIELDS.websiteUrl,
  CONFIRMED_ASSET_FIELDS.previewSiteUrl,
  CONFIRMED_ASSET_FIELDS.marketplaceStatus,
  CONFIRMED_ASSET_FIELDS.latestReviewStatus,
  CONFIRMED_ASSET_FIELDS.latestReviewDate,
  CONFIRMED_ASSET_FIELDS.latestReviewFeedback,
  CONFIRMED_ASSET_FIELDS.qualityScore,
  CONFIRMED_ASSET_FIELDS.submittedDate,
  CONFIRMED_ASSET_FIELDS.decisionDate,
  CONFIRMED_ASSET_FIELDS.priceString,
] as const;

const QUEUE_VERSION_FIELD_NAMES = [
  CONFIRMED_VERSION_FIELDS.assetLink,
  CONFIRMED_VERSION_FIELDS.assetRecordId,
  CONFIRMED_VERSION_FIELDS.versionNumber,
  CONFIRMED_VERSION_FIELDS.submissionDatetime,
  CONFIRMED_VERSION_FIELDS.reviewOwner,
  CONFIRMED_VERSION_FIELDS.reviewStatus,
  CONFIRMED_VERSION_FIELDS.decisionDate,
] as const;

const VERSION_QUEUE_STATUS_OPTIONS: Record<Exclude<TemplateReviewQueueStatus, 'published'>, readonly string[]> = {
  ready_to_review: ['🆕Ready for Review'],
  in_review: ['🏃🏾In Review', '👀Admin Feedback Review'],
  changes_requested: ['📤Changes Requested', '🔁Response to Review'],
  approved: ['✅Approved'],
};

const ASSET_QUEUE_STATUS_PATTERNS: Record<TemplateReviewQueueStatus, readonly string[]> = {
  ready_to_review: ['ready'],
  in_review: ['in review'],
  changes_requested: ['changes requested', 'response to review'],
  approved: ['approved'],
  published: ['published', 'live'],
};

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "''");
}

function escapeFormulaStringValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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

function currentLocalDate(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function markChecklistComplete(value: string): string {
  return value.replace(/(^|\n)(\s*)\[ \]/g, '$1$2[x]');
}

function mapAsset(record: AirtableRecord): TemplateReviewAsset {
  const fields = record.fields;
  return {
    assetId: record.id,
    templateName: firstString(fields[CONFIRMED_ASSET_FIELDS.name]) ?? '',
    // Keep legacy API shape stable even though Airtable no longer has a separate plain description field.
    description: firstString(fields[ASSET_COMPATIBILITY_ALIASES.description]),
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
    // Legacy alias retained for compatibility; Airtable now stores only the text field on the asset.
    rejectionFeedbackHtml: firstString(fields[ASSET_COMPATIBILITY_ALIASES.rejectionFeedbackHtml]),
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

function toQueueItem(asset: TemplateReviewAsset, version?: TemplateReviewVersion | null, query: TemplateReviewQueueQuery = {}): TemplateReviewQueueItem {
  const reviewOwner = version?.reviewOwner ?? null;
  const isAssignedToCurrentReviewer = Boolean(
    query.currentReviewer?.id &&
      reviewOwner?.id &&
      query.currentReviewer.id === reviewOwner.id,
  );
  const normalizedStatus = normalizeQueueStatus(asset, version);

  return {
    assetId: asset.assetId,
    templateName: asset.templateName,
    latestReviewStatus: asset.latestReviewStatus,
    latestReviewFeedback: asset.latestReviewFeedback,
    latestReviewDate: asset.latestReviewDate,
    qualityRating: asset.qualityRating,
    websiteUrl: asset.websiteUrl,
    previewSiteUrl: asset.previewSiteUrl,
    submittedDate: asset.submittedDate,
    marketplaceStatus: asset.marketplaceStatus,
    decisionDate: asset.decisionDate,
    priceString: asset.priceString,
    assignableVersionId: version?.versionId,
    reviewOwner,
    normalizedStatus,
    isReadyToReview: normalizedStatus === 'ready_to_review',
    isUnassigned: !reviewOwner,
    canAssign: Boolean(version?.versionId && query.currentReviewer?.id && !reviewOwner),
    canReview: Boolean(!reviewOwner || isAssignedToCurrentReviewer),
    canPublish: normalizedStatus === 'approved',
    isAssignedToCurrentReviewer,
    isBlockedByOtherReviewer: Boolean(reviewOwner?.id && !isAssignedToCurrentReviewer),
  };
}

function queueItemMatchesQuery(item: TemplateReviewQueueItem, query: TemplateReviewQueueQuery = {}): boolean {
  if (query.status && item.normalizedStatus !== query.status) return false;
  if (query.assigned === 'assigned' && item.isUnassigned) return false;
  if (query.assigned === 'unassigned' && !item.isUnassigned) return false;
  if (query.onlyAssignedToCurrentReviewer && !item.isAssignedToCurrentReviewer) return false;
  return true;
}

function selectQueueVersion(
  asset: TemplateReviewAsset,
  versions: TemplateReviewVersion[],
  query: TemplateReviewQueueQuery = {},
): TemplateReviewVersion | null {
  if (versions.length === 0) return null;

  for (const version of versions) {
    if (queueItemMatchesQuery(toQueueItem(asset, version, query), query)) {
      return version;
    }
  }

  return versions[0] ?? null;
}

function normalizeQueueStatus(
  asset: Pick<TemplateReviewAsset, 'latestReviewStatus' | 'marketplaceStatus'>,
  version?: TemplateReviewVersion | null,
): TemplateReviewQueueStatus | null {
  const marketplaceStatus = normalizeQueueStatusLabel(asset.marketplaceStatus);
  if (marketplaceStatus === 'published') return 'published';

  const candidates = [
    version?.reviewStatus,
    asset.latestReviewStatus,
    asset.marketplaceStatus,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const normalized = normalizeQueueStatusLabel(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function normalizeQueueStatusLabel(value?: string): TemplateReviewQueueStatus | null {
  if (!value) return null;
  if (/published|live/i.test(value)) return 'published';
  if (/approved/i.test(value)) return 'approved';
  if (/changes requested|response to review/i.test(value)) return 'changes_requested';
  if (/in review/i.test(value)) return 'in_review';
  if (/ready/i.test(value)) return 'ready_to_review';
  return null;
}

function queueSortToAirtableSort(sort: TemplateReviewQueueSort): {
  field: string;
  direction: 'asc' | 'desc';
} {
  switch (sort) {
    case 'submittedDate_asc':
      return { field: CONFIRMED_ASSET_FIELDS.submittedDate, direction: 'asc' };
    case 'submittedDate_desc':
      return { field: CONFIRMED_ASSET_FIELDS.submittedDate, direction: 'desc' };
    case 'decisionDate_asc':
      return { field: CONFIRMED_ASSET_FIELDS.decisionDate, direction: 'asc' };
    case 'decisionDate_desc':
      return { field: CONFIRMED_ASSET_FIELDS.decisionDate, direction: 'desc' };
  }
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function myQueueScanLimit(limit?: number): number {
  const requested = Math.max(limit ?? 100, 1);
  return Math.min(Math.max(requested * 5, 100), 500);
}

function queueVersionScanLimit(limit?: number): number | undefined {
  if (!limit) return undefined;
  const requested = Math.max(limit, 1);
  return Math.min(Math.max(requested * 5, 100), 1000);
}

function recordIdsFormula(ids: string[]): string {
  if (ids.length === 0) return 'FALSE()';
  const clauses = ids.map((id) => `RECORD_ID() = '${escapeFormulaValue(id)}'`);
  return clauses.length === 1 ? clauses[0] : `OR(${clauses.join(', ')})`;
}

function andFormula(parts: Array<string | null | undefined>): string | undefined {
  const filtered = parts.filter((part): part is string => Boolean(part));
  if (filtered.length === 0) return undefined;
  return filtered.length === 1 ? filtered[0] : `AND(${filtered.join(', ')})`;
}

function containsLowerFormula(fieldName: string, value: string): string {
  return `FIND(LOWER("${escapeFormulaStringValue(value)}"), LOWER({${fieldName}} & "")) > 0`;
}

function assetStatusFormula(status: TemplateReviewQueueStatus): string {
  const clauses = ASSET_QUEUE_STATUS_PATTERNS[status].flatMap((pattern) => [
    containsLowerFormula(CONFIRMED_ASSET_FIELDS.latestReviewStatus, pattern),
    containsLowerFormula(CONFIRMED_ASSET_FIELDS.marketplaceStatus, pattern),
  ]);
  return clauses.length === 1 ? clauses[0] : `OR(${clauses.join(', ')})`;
}

function versionStatusFormula(status?: TemplateReviewQueueStatus): string | null {
  if (!status || status === 'published') return null;
  const statuses = VERSION_QUEUE_STATUS_OPTIONS[status];
  const clauses = statuses.map((value) => `{${CONFIRMED_VERSION_FIELDS.reviewStatus}} = '${escapeFormulaValue(value)}'`);
  return clauses.length === 1 ? clauses[0] : `OR(${clauses.join(', ')})`;
}

function versionAssignmentFormula(query: TemplateReviewQueueQuery): string | null {
  if (query.onlyAssignedToCurrentReviewer && query.currentReviewer) {
    return reviewerLookupFormula(CONFIRMED_VERSION_FIELDS.reviewOwner, query.currentReviewer);
  }

  if (query.assigned === 'assigned') {
    return `LEN(TRIM(ARRAYJOIN({${CONFIRMED_VERSION_FIELDS.reviewOwner}}) & "")) > 0`;
  }

  if (query.assigned === 'unassigned') {
    return `LEN(TRIM(ARRAYJOIN({${CONFIRMED_VERSION_FIELDS.reviewOwner}}) & "")) = 0`;
  }

  return null;
}

function shouldUseVersionFirstQueue(query: TemplateReviewQueueQuery): boolean {
  return Boolean(
    query.onlyAssignedToCurrentReviewer ||
      (query.assigned && query.assigned !== 'any') ||
      (query.status && query.status !== 'published'),
  );
}

function reviewerLookupFormula(fieldName: string, reviewer: CollaboratorRef): string {
  const identifiers = [...new Set([reviewer.id, reviewer.email, reviewer.name].filter((value): value is string => Boolean(value?.trim())))];
  if (identifiers.length === 0) {
    throw new AirtableClientError(
      'REVIEWER_IDENTITY_UNAVAILABLE',
      'Current reviewer identity is not configured for this MCP runtime.',
      503,
    );
  }

  const exactClauses = identifiers.map((value) => `{${fieldName}} = '${escapeFormulaValue(value)}'`);
  const searchClauses = identifiers.map(
    (value) => `FIND(LOWER("${escapeFormulaStringValue(value)}"), LOWER(ARRAYJOIN({${fieldName}}))) > 0`,
  );
  return `OR(${[...exactClauses, ...searchClauses].join(', ')})`;
}

function compareIsoDates(a?: string, b?: string): number {
  const left = a ? Date.parse(a) : Number.NaN;
  const right = b ? Date.parse(b) : Number.NaN;
  const leftValue = Number.isFinite(left) ? left : -Infinity;
  const rightValue = Number.isFinite(right) ? right : -Infinity;
  return leftValue - rightValue;
}

function formatIsoDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDate(value?: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isWithinRange(value: string | undefined, startMs: number, endExclusiveMs: number): boolean {
  const parsed = parseDate(value);
  return parsed !== null && parsed >= startMs && parsed < endExclusiveMs;
}

function sortQueueItems(items: TemplateReviewQueueItem[], sort: TemplateReviewQueueSort): TemplateReviewQueueItem[] {
  const cloned = [...items];
  cloned.sort((left, right) => {
    switch (sort) {
      case 'submittedDate_asc':
        return compareIsoDates(left.submittedDate, right.submittedDate);
      case 'submittedDate_desc':
        return compareIsoDates(right.submittedDate, left.submittedDate);
      case 'decisionDate_asc':
        return compareIsoDates(left.decisionDate, right.decisionDate);
      case 'decisionDate_desc':
        return compareIsoDates(right.decisionDate, left.decisionDate);
    }
  });
  return cloned;
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
    agentReviewFeedback: firstString(record.fields[CONFIRMED_VERSION_FIELDS.agentReviewFeedback]),
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

function mapMetricsAsset(record: AirtableRecord): MetricsAssetSnapshot {
  return {
    submittedDate: firstString(record.fields[METRICS_ASSET_FIELD_IDS.submittedDate]),
    publishedDate: firstString(record.fields[METRICS_ASSET_FIELD_IDS.publishedDate]),
    decisionDate: firstString(record.fields[METRICS_ASSET_FIELD_IDS.decisionDate]),
    marketplaceStatus: firstString(record.fields[METRICS_ASSET_FIELD_IDS.marketplaceStatus]),
    latestReviewStatus: firstString(record.fields[METRICS_ASSET_FIELD_IDS.latestReviewStatus]),
    latestReviewDate: firstString(record.fields[METRICS_ASSET_FIELD_IDS.latestReviewDate]),
    qualityRating: firstString(record.fields[METRICS_ASSET_FIELD_IDS.qualityScore]),
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

  private async readErrorDetails(response: Response): Promise<unknown> {
    try {
      const text = await response.text();
      if (!text) return undefined;
      try {
        return JSON.parse(text) as unknown;
      } catch {
        return { raw: text };
      }
    } catch {
      return undefined;
    }
  }

  private async listRecords(args: {
    tableId: string;
    fieldNames?: string[];
    fieldIds?: string[];
    limit?: number;
    viewId?: string;
    filterByFormula?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    returnFieldsByFieldId?: boolean;
  }): Promise<AirtableRecord[]> {
    const records: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams();
      const remaining = args.limit ? Math.max(args.limit - records.length, 0) : undefined;
      const pageSize = remaining ? Math.min(remaining, 100) : 100;

      if (args.limit) params.set('maxRecords', String(args.limit));
      params.set('pageSize', String(pageSize));
      if (args.viewId) params.set('view', args.viewId);
      if (args.filterByFormula) params.set('filterByFormula', args.filterByFormula);
      for (const field of args.fieldNames ?? []) params.append('fields[]', field);
      for (const fieldId of args.fieldIds ?? []) params.append('fields[]', fieldId);
      if (args.returnFieldsByFieldId) params.set('returnFieldsByFieldId', 'true');
      if (args.sortField) {
        params.set('sort[0][field]', args.sortField);
        params.set('sort[0][direction]', args.sortDirection ?? 'asc');
      }
      if (offset) params.set('offset', offset);

      const response = await this.request(`/${args.tableId}?${params.toString()}`);
      if (!response.ok) {
        const airtable = await this.readErrorDetails(response);
        throw new AirtableClientError('AIRTABLE_LIST_FAILED', 'Failed to list Airtable records.', response.status, {
          tableId: args.tableId,
          ...(args.limit ? { limit: args.limit } : {}),
          ...(args.viewId ? { viewId: args.viewId } : {}),
          ...(args.filterByFormula ? { filterByFormula: args.filterByFormula } : {}),
          ...(args.fieldNames?.length ? { fieldNames: args.fieldNames } : {}),
          ...(args.fieldIds?.length ? { fieldIds: args.fieldIds } : {}),
          ...(args.returnFieldsByFieldId ? { returnFieldsByFieldId: true } : {}),
          ...(args.sortField ? { sortField: args.sortField, sortDirection: args.sortDirection ?? 'asc' } : {}),
          ...(offset ? { offset } : {}),
          ...(airtable === undefined ? {} : { airtable }),
        });
      }

      const json = (await response.json()) as { records?: AirtableRecord[]; offset?: string };
      records.push(...(json.records ?? []));
      offset = json.offset;
    } while (offset && (!args.limit || records.length < args.limit));

    return args.limit ? records.slice(0, args.limit) : records;
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
      const airtable = await this.readErrorDetails(response);
      throw new AirtableClientError('AIRTABLE_UPDATE_FAILED', 'Failed to update Airtable record.', response.status, {
        tableId,
        recordId,
        ...(airtable === undefined ? {} : { airtable }),
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

  async listAssetQueue(
    limit = 100,
    options?: {
      filterByFormula?: string;
      sortField?: string;
      sortDirection?: 'asc' | 'desc';
    },
  ): Promise<TemplateReviewAsset[]> {
    const records = await this.listRecords({
      tableId: TABLE_IDS.assets,
      limit,
      filterByFormula: options?.filterByFormula ?? `{${CONFIRMED_ASSET_FIELDS.type}} = 'Template🏗️'`,
      sortField: options?.sortField,
      sortDirection: options?.sortDirection,
    });
    return records.filter((record) => isTemplateLikeAsset(record.fields)).map((record) => mapAsset(record));
  }

  async listAssetQueueDetailed(query: TemplateReviewQueueQuery = {}): Promise<{
    sortApplied: TemplateReviewQueueSort;
    items: TemplateReviewQueueItem[];
  }> {
    const limit = query.limit ?? 100;
    const sort = query.sort ?? 'submittedDate_desc';
    const airtableSort = queueSortToAirtableSort(sort);

    if (shouldUseVersionFirstQueue(query)) {
      const versions = await this.listQueueVersions(query, queueVersionScanLimit(query.limit));
      const versionsByAsset = new Map<string, TemplateReviewVersion[]>();
      for (const version of versions) {
        if (!version.assetId) continue;
        const assetVersions = versionsByAsset.get(version.assetId) ?? [];
        assetVersions.push(version);
        versionsByAsset.set(version.assetId, assetVersions);
      }

      const assetsById = await this.listAssetsByIds([...versionsByAsset.keys()]);
      const items: TemplateReviewQueueItem[] = [];

      for (const [assetId, versionsForAsset] of versionsByAsset) {
        const asset = assetsById.get(assetId);
        if (!asset) continue;

        const selectedVersion = selectQueueVersion(asset, versionsForAsset, query);
        const item = toQueueItem(asset, selectedVersion, query);
        if (queueItemMatchesQuery(item, query)) {
          items.push(item);
        }
      }

      const sorted = sortQueueItems(items, sort);
      return {
        sortApplied: sort,
        items: query.limit ? sorted.slice(0, query.limit) : sorted,
      };
    }

    const filterByFormula = andFormula([
      `{${CONFIRMED_ASSET_FIELDS.type}} = 'Template🏗️'`,
      query.status ? assetStatusFormula(query.status) : null,
    ]);
    const assets = await this.listAssetQueue(limit, {
      filterByFormula,
      sortField: airtableSort.field,
      sortDirection: airtableSort.direction,
    });
    const items = await Promise.all(
      assets.map(async (asset) => {
        const versions = await this.listVersionsForAsset(asset.assetId, 25);
        const selectedVersion = selectQueueVersion(asset, versions, query);
        return toQueueItem(asset, selectedVersion, query);
      }),
    );

    const filtered = items.filter((item) => queueItemMatchesQuery(item, query));

    return {
      sortApplied: sort,
      items: sortQueueItems(filtered, sort),
    };
  }

  private async listQueueVersions(query: TemplateReviewQueueQuery, limit?: number): Promise<TemplateReviewVersion[]> {
    const records = await this.listRecords({
      tableId: TABLE_IDS.assetVersions,
      fieldNames: [...QUEUE_VERSION_FIELD_NAMES],
      limit,
      filterByFormula: andFormula([
        versionStatusFormula(query.status),
        versionAssignmentFormula(query),
      ]),
      sortField: CONFIRMED_VERSION_FIELDS.submissionDatetime,
      sortDirection: 'desc',
    });

    return records.map((record) => mapVersion(record));
  }

  private async listAssetsByIds(assetIds: string[]): Promise<Map<string, TemplateReviewAsset>> {
    const uniqueAssetIds = [...new Set(assetIds.filter(Boolean))];
    if (uniqueAssetIds.length === 0) return new Map();

    const recordGroups = await Promise.all(
      chunkArray(uniqueAssetIds, 25).map((chunk) =>
        this.listRecords({
          tableId: TABLE_IDS.assets,
          limit: chunk.length,
          filterByFormula: `AND({${CONFIRMED_ASSET_FIELDS.type}} = 'Template🏗️', ${recordIdsFormula(chunk)})`,
        }),
      ),
    );

    return new Map(
      recordGroups
        .flat()
        .filter((record) => isTemplateLikeAsset(record.fields))
        .map((record) => [record.id, mapAsset(record)]),
    );
  }

  private async listVersionsAssignedToReviewer(currentReviewer: CollaboratorRef, limit?: number): Promise<TemplateReviewVersion[]> {
    const records = await this.listRecords({
      tableId: TABLE_IDS.assetVersions,
      limit,
      filterByFormula: reviewerLookupFormula(CONFIRMED_VERSION_FIELDS.reviewOwner, currentReviewer),
      sortField: CONFIRMED_VERSION_FIELDS.submissionDatetime,
      sortDirection: 'desc',
    });

    return records
      .map((record) => mapVersion(record))
      .filter((version) => version.reviewOwner?.id === currentReviewer.id);
  }

  async listMyQueueDetailed(query: TemplateReviewQueueQuery = {}): Promise<{
    sortApplied: TemplateReviewQueueSort;
    items: TemplateReviewQueueItem[];
  }> {
    const currentReviewer = query.currentReviewer;
    if (!currentReviewer?.id) {
      throw new AirtableClientError(
        'REVIEWER_IDENTITY_UNAVAILABLE',
        'Current reviewer identity is not configured for this MCP runtime.',
        503,
      );
    }

    const sort = query.sort ?? 'submittedDate_desc';
    const normalizedQuery: TemplateReviewQueueQuery = {
      ...query,
      assigned: 'assigned',
      currentReviewer,
      onlyAssignedToCurrentReviewer: true,
    };

    // Bound the reviewer-version scan so large historical queues do not time out
    // before we can apply the requested queue limit.
    const assignedVersions = await this.listVersionsAssignedToReviewer(
      currentReviewer,
      myQueueScanLimit(query.limit),
    );
    const versionsByAsset = new Map<string, TemplateReviewVersion[]>();
    for (const version of assignedVersions) {
      if (!version.assetId) continue;
      const assetVersions = versionsByAsset.get(version.assetId) ?? [];
      assetVersions.push(version);
      versionsByAsset.set(version.assetId, assetVersions);
    }

    const assetsById = await this.listAssetsByIds([...versionsByAsset.keys()]);
    const items: TemplateReviewQueueItem[] = [];

    for (const [assetId, versions] of versionsByAsset) {
      const asset = assetsById.get(assetId);
      if (!asset) continue;

      const selectedVersion = selectQueueVersion(asset, versions, normalizedQuery);
      const item = toQueueItem(asset, selectedVersion, normalizedQuery);
      if (queueItemMatchesQuery(item, normalizedQuery)) {
        items.push(item);
      }
    }

    const sorted = sortQueueItems(items, sort);
    return {
      sortApplied: sort,
      items: query.limit ? sorted.slice(0, query.limit) : sorted,
    };
  }

  async getMarketplaceMetrics(options?: { days?: number; end_date?: string }): Promise<TemplateReviewMarketplaceMetrics> {
    const days = Math.min(Math.max(options?.days ?? 7, 1), 90);
    const endBase = options?.end_date ? new Date(`${options.end_date}T00:00:00.000Z`) : new Date();
    const endDay = new Date(Date.UTC(endBase.getUTCFullYear(), endBase.getUTCMonth(), endBase.getUTCDate()));
    const endExclusive = new Date(endDay);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    const startDay = new Date(endDay);
    startDay.setUTCDate(startDay.getUTCDate() - (days - 1));

    const records = await this.listRecords({
      tableId: TABLE_IDS.assets,
      fieldIds: [
        METRICS_ASSET_FIELD_IDS.marketplaceStatus,
        METRICS_ASSET_FIELD_IDS.latestReviewStatus,
        METRICS_ASSET_FIELD_IDS.latestReviewDate,
        METRICS_ASSET_FIELD_IDS.qualityScore,
        METRICS_ASSET_FIELD_IDS.submittedDate,
        METRICS_ASSET_FIELD_IDS.publishedDate,
        METRICS_ASSET_FIELD_IDS.decisionDate,
      ],
      filterByFormula: `{${CONFIRMED_ASSET_FIELDS.type}} = 'Template🏗️'`,
      // Metrics reads use field ids so display-name drift does not break the analytics path.
      returnFieldsByFieldId: true,
    });
    const assets = records.map((record) => mapMetricsAsset(record));

    const startMs = startDay.getTime();
    const endExclusiveMs = endExclusive.getTime();

    const reviewStatusActivity = Object.fromEntries(REVIEW_STATUS_OPTIONS.map((status) => [status, 0]));
    const qualityRatingSnapshot = Object.fromEntries(QUALITY_RATING_OPTIONS.map((rating) => [rating, 0]));
    const backlogSnapshot = {
      ready_to_review: 0,
      in_review: 0,
      changes_requested: 0,
      approved: 0,
      published: 0,
      unknown: 0,
    };

    let submissions = 0;
    let decisions = 0;
    let approvals = 0;
    let rejections = 0;
    let published = 0;
    let decidedCount = 0;
    let turnaroundHoursTotal = 0;

    for (const asset of assets) {
      if (isWithinRange(asset.submittedDate, startMs, endExclusiveMs)) submissions += 1;
      if (isWithinRange(asset.publishedDate, startMs, endExclusiveMs)) published += 1;

      if (asset.latestReviewStatus && Object.hasOwn(reviewStatusActivity, asset.latestReviewStatus) && isWithinRange(asset.latestReviewDate, startMs, endExclusiveMs)) {
        reviewStatusActivity[asset.latestReviewStatus] += 1;
      }

      if (asset.qualityRating && Object.hasOwn(qualityRatingSnapshot, asset.qualityRating)) {
        qualityRatingSnapshot[asset.qualityRating] += 1;
      }

      const normalizedStatus = normalizeQueueStatus(asset);
      if (normalizedStatus) backlogSnapshot[normalizedStatus] += 1;
      else backlogSnapshot.unknown += 1;

      if (isWithinRange(asset.decisionDate, startMs, endExclusiveMs)) {
        decisions += 1;
        if (/approved/i.test(asset.latestReviewStatus ?? '')) approvals += 1;
        if (/rejected/i.test(asset.latestReviewStatus ?? '')) rejections += 1;

        const submittedMs = parseDate(asset.submittedDate);
        const decisionMs = parseDate(asset.decisionDate);
        if (submittedMs !== null && decisionMs !== null && decisionMs >= submittedMs) {
          decidedCount += 1;
          turnaroundHoursTotal += (decisionMs - submittedMs) / 36e5;
        }
      }
    }

    return {
      window: {
        startDate: formatIsoDateOnly(startDay),
        endDate: formatIsoDateOnly(endDay),
        days,
      },
      totals: {
        templatesScanned: assets.length,
        submissions,
        decisions,
        approvals,
        rejections,
        published,
      },
      reviewStatusActivity,
      backlogSnapshot,
      qualityRatingSnapshot,
      turnaround: {
        decidedCount,
        averageHours: decidedCount > 0 ? Number((turnaroundHoursTotal / decidedCount).toFixed(2)) : null,
      },
    };
  }

  async searchAssetsByName(
    query: string,
    options?: { limit?: number; mode?: TemplateReviewAssetSearchMode },
  ): Promise<TemplateReviewAsset[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      throw new AirtableClientError('INVALID_SEARCH_QUERY', 'query must be a non-empty string.', 400);
    }

    const mode = options?.mode ?? 'contains';
    const exactFormula = `{${CONFIRMED_ASSET_FIELDS.name}} = '${escapeFormulaValue(normalizedQuery)}'`;
    const containsFormula = `FIND(LOWER("${escapeFormulaStringValue(normalizedQuery)}"), LOWER({${CONFIRMED_ASSET_FIELDS.name}})) > 0`;
    const formula = `AND({${CONFIRMED_ASSET_FIELDS.type}} = 'Template🏗️', ${mode === 'exact' ? exactFormula : containsFormula})`;

    const records = await this.listRecords({
      tableId: TABLE_IDS.assets,
      limit: options?.limit ?? 25,
      filterByFormula: formula,
      sortField: CONFIRMED_ASSET_FIELDS.name,
      sortDirection: 'asc',
    });

    return records.filter((record) => isTemplateLikeAsset(record.fields)).map((record) => mapAsset(record));
  }

  async searchVersionsByAssetName(
    query: string,
    options?: {
      mode?: TemplateReviewAssetSearchMode;
      assetLimit?: number;
      versionsPerAssetLimit?: number;
    },
  ): Promise<TemplateReviewVersionSearchResult[]> {
    const assetLimit = options?.assetLimit ?? 10;
    const versionsPerAssetLimit = options?.versionsPerAssetLimit ?? 25;
    const assets = await this.searchAssetsByName(query, {
      mode: options?.mode,
      limit: assetLimit,
    });

    const groupedResults = await Promise.all(
      assets.map(async (asset) => ({
        asset,
        versions: await this.listVersionsForAsset(asset.assetId, versionsPerAssetLimit),
      })),
    );

    return groupedResults.filter((result) => result.versions.length > 0);
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

  async listVersionsForAgentFeedback(query: AgentFeedbackQueueQuery = {}): Promise<TemplateReviewVersion[]> {
    const statuses = query.includeStatuses?.length ? query.includeStatuses : [REVIEW_STATUS_OPTIONS[0]];
    const statusFormula =
      statuses.length === 1
        ? `{${CONFIRMED_VERSION_FIELDS.reviewStatus}} = '${escapeFormulaValue(statuses[0]!)}'`
        : `OR(${statuses
            .map((status) => `{${CONFIRMED_VERSION_FIELDS.reviewStatus}} = '${escapeFormulaValue(status)}'`)
            .join(', ')})`;

    const formulaParts = [statusFormula];
    if (!query.includeExistingFeedback) {
      formulaParts.push(`LEN(TRIM({${CONFIRMED_VERSION_FIELDS.agentReviewFeedback}} & "")) = 0`);
    }

    const records = await this.listRecords({
      tableId: TABLE_IDS.assetVersions,
      fieldNames: Object.values(CONFIRMED_VERSION_FIELDS),
      limit: query.limit ?? 50,
      viewId: query.viewId,
      filterByFormula: formulaParts.length === 1 ? formulaParts[0]! : `AND(${formulaParts.join(', ')})`,
      sortField: CONFIRMED_VERSION_FIELDS.submissionDatetime,
      sortDirection: 'asc',
    });

    return records.map((record) => mapVersion(record));
  }

  async getVersionById(versionId: string): Promise<TemplateReviewVersion | null> {
    const record = await this.getRecord(TABLE_IDS.assetVersions, versionId);
    return record ? mapVersion(record) : null;
  }

  private async getScopedVersion(versionId: string): Promise<{ version: TemplateReviewVersion; asset: TemplateReviewAsset }> {
    const version = await this.getVersionById(versionId);
    if (!version) {
      throw new AirtableClientError('VERSION_NOT_FOUND', 'Template version not found.', 404, { version_id: versionId });
    }
    if (!version.assetId) {
      throw new AirtableClientError('VERSION_ASSET_ID_MISSING', 'Template version is missing its asset linkage.', 500, {
        version_id: versionId,
      });
    }

    const asset = await this.getAssetById(version.assetId);
    if (!asset) {
      throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Template asset not found in template-review scope.', 404, {
        asset_id: version.assetId,
        version_id: versionId,
      });
    }

    return { version, asset };
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

  async findReleaseByLocalDate(localDate: string): Promise<TemplateReviewRelease> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
      throw new AirtableClientError('INVALID_LOCAL_DATE', 'release_date_local must use YYYY-MM-DD format.', 400, {
        value: localDate,
      });
    }

    const records = await this.listRecords({
      tableId: TABLE_IDS.assetReleases,
      fieldNames: Object.values(CONFIRMED_RELEASE_FIELDS),
      limit: 5,
      filterByFormula: `LEFT({${CONFIRMED_RELEASE_FIELDS.releaseName}}, 10) = '${escapeFormulaValue(localDate)}'`,
      sortField: CONFIRMED_RELEASE_FIELDS.releaseName,
      sortDirection: 'desc',
    });

    if (records.length === 0) {
      throw new AirtableClientError('RELEASE_NOT_FOUND', 'No Asset Release record matched the requested local date.', 404, {
        release_date_local: localDate,
      });
    }

    if (records.length > 1) {
      throw new AirtableClientError('AMBIGUOUS_RELEASE_DATE', 'Multiple Asset Release records matched the requested local date.', 409, {
        release_date_local: localDate,
        release_ids: records.map((record) => record.id),
      });
    }

    return mapRelease(records[0]);
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

    if (input.improvement_areas !== undefined) {
      const invalidImprovementAreas = input.improvement_areas.filter(
        (area) => !(IMPROVEMENT_AREA_OPTIONS as readonly string[]).includes(area),
      );
      if (invalidImprovementAreas.length > 0) {
        throw new AirtableClientError('INVALID_IMPROVEMENT_AREAS', 'Unsupported improvement areas.', 400, {
          invalid: invalidImprovementAreas,
          allowed: IMPROVEMENT_AREA_OPTIONS,
        });
      }
      fields[CONFIRMED_VERSION_FIELDS.improvementAreas] = input.improvement_areas;
    }
    if (input.review_feedback !== undefined) {
      fields[CONFIRMED_WRITE_FIELD_IDS.versions.reviewFeedback] = input.review_feedback;
    }
    if (input.agent_review_feedback !== undefined) {
      fields[CONFIRMED_WRITE_FIELD_IDS.versions.agentReviewFeedback] = input.agent_review_feedback;
    }
    if (input.review_checklist !== undefined) fields[CONFIRMED_VERSION_FIELDS.reviewChecklist] = coerceLongText(input.review_checklist);
    if (input.publishing_checklist !== undefined) {
      fields[CONFIRMED_VERSION_FIELDS.publishingChecklist] = coerceLongText(input.publishing_checklist);
    }
    if (input.release_record_id !== undefined) {
      fields[CONFIRMED_WRITE_FIELD_IDS.versions.release] = input.release_record_id ? [input.release_record_id] : [];
    }
    if (input.reject_reason !== undefined) fields[CONFIRMED_VERSION_FIELDS.rejectReason] = input.reject_reason;
    if (input.rejection_feedback !== undefined) fields[CONFIRMED_VERSION_FIELDS.rejectionFeedback] = input.rejection_feedback;

    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError('NO_MUTATION_FIELDS', 'No version review fields were provided.', 400);
    }

    const updated = await this.updateRecord(TABLE_IDS.assetVersions, versionId, fields);
    return mapVersion(updated);
  }

  async assignVersionReviewer(versionId: string, input: AssignReviewerInput): Promise<TemplateReviewVersion> {
    return this.updateVersionReview(versionId, { review_owner: input.review_owner });
  }

  async assignSelfToVersion(versionId: string, currentReviewer?: CollaboratorRef | null): Promise<TemplateReviewVersion> {
    if (!currentReviewer?.id) {
      throw new AirtableClientError(
        'REVIEWER_IDENTITY_UNAVAILABLE',
        'Current reviewer identity is not configured for this MCP runtime.',
        503,
      );
    }

    const { version } = await this.getScopedVersion(versionId);
    if (version.reviewOwner?.id && version.reviewOwner.id !== currentReviewer.id) {
      throw new AirtableClientError(
        'REVIEWER_ASSIGNMENT_CONFLICT',
        'Version is already assigned to a different reviewer.',
        409,
        {
          version_id: versionId,
          current_reviewer_id: currentReviewer.id,
          assigned_reviewer_id: version.reviewOwner.id,
        },
      );
    }
    if (version.reviewOwner?.id === currentReviewer.id) {
      return version;
    }

    return this.assignVersionReviewer(versionId, { review_owner: currentReviewer });
  }

  async unassignVersionReviewer(versionId: string, currentReviewer?: CollaboratorRef | null): Promise<TemplateReviewVersion> {
    const { version } = await this.getScopedVersion(versionId);
    if (!currentReviewer?.id) {
      throw new AirtableClientError(
        'REVIEWER_IDENTITY_UNAVAILABLE',
        'Current reviewer identity is not configured for this MCP runtime.',
        503,
      );
    }
    if (!version.reviewOwner?.id) {
      return version;
    }
    if (version.reviewOwner.id !== currentReviewer.id) {
      throw new AirtableClientError(
        'REVIEWER_ASSIGNMENT_CONFLICT',
        'Version is assigned to a different reviewer and cannot be unassigned from this lane.',
        409,
        {
          version_id: versionId,
          current_reviewer_id: currentReviewer.id,
          assigned_reviewer_id: version.reviewOwner.id,
        },
      );
    }
    return this.assignVersionReviewer(versionId, { review_owner: null });
  }

  async requireAssignedVersion(versionId: string, currentReviewer?: CollaboratorRef | null): Promise<TemplateReviewVersion> {
    const { version } = await this.getScopedVersion(versionId);
    if (!currentReviewer?.id) {
      throw new AirtableClientError(
        'REVIEWER_IDENTITY_UNAVAILABLE',
        'Current reviewer identity is not configured for this MCP runtime.',
        503,
      );
    }
    if (!version.reviewOwner?.id) {
      throw new AirtableClientError(
        'REVIEWER_ASSIGNMENT_REQUIRED',
        'Version must be assigned to the authenticated reviewer before this action can run.',
        409,
        {
          version_id: versionId,
          current_reviewer_id: currentReviewer.id,
        },
      );
    }
    if (version.reviewOwner.id !== currentReviewer.id) {
      throw new AirtableClientError(
        'REVIEWER_ASSIGNMENT_CONFLICT',
        'Version is assigned to a different reviewer.',
        409,
        {
          version_id: versionId,
          current_reviewer_id: currentReviewer.id,
          assigned_reviewer_id: version.reviewOwner.id,
        },
      );
    }
    return version;
  }

  async getReviewContext(versionId: string, currentReviewer?: CollaboratorRef | null): Promise<TemplateReviewContext> {
    const version = await this.getVersionById(versionId);
    if (!version) {
      throw new AirtableClientError('VERSION_NOT_FOUND', 'Template version not found.', 404, { version_id: versionId });
    }

    const asset = version.assetId ? await this.getAssetById(version.assetId) : null;
    const isAssignedToCurrentReviewer = Boolean(
      currentReviewer?.id &&
        version.reviewOwner?.id &&
        currentReviewer.id === version.reviewOwner.id,
    );

    return {
      versionId: version.versionId,
      assetId: version.assetId,
      templateName: asset?.templateName,
      reviewOwner: version.reviewOwner ?? null,
      reviewStatus: version.reviewStatus,
      qualityRating: version.qualityRating,
      improvementAreas: version.improvementAreas,
      reviewFeedback: version.reviewFeedback,
      reviewChecklist: version.reviewChecklist,
      publishingChecklist: version.publishingChecklist,
      canAssign: Boolean(currentReviewer?.id && !version.reviewOwner),
      canReview: !version.reviewOwner || isAssignedToCurrentReviewer,
      canPublish: version.reviewStatus === '✅Approved',
      isAssignedToCurrentReviewer,
      currentReviewer: currentReviewer ?? null,
      asset,
      version,
    };
  }

  async updateAssetMetadata(assetId: string, input: TemplateAssetMetadataUpdateInput): Promise<TemplateReviewAsset> {
    const fields: Record<string, unknown> = {};
    if (input.template_name !== undefined) fields[CONFIRMED_ASSET_FIELDS.name] = input.template_name;
    if (input.description_long_html !== undefined || input.description !== undefined) {
      fields[CONFIRMED_ASSET_FIELDS.descriptionLongHtml] = input.description_long_html ?? input.description;
    }
    if (input.description_short !== undefined) fields[CONFIRMED_ASSET_FIELDS.descriptionShort] = input.description_short;
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

  async completePublishing(versionId: string, input: CompletePublishingInput): Promise<{
    updatedVersion: TemplateReviewVersion;
    updatedAsset: TemplateReviewAsset | null;
    resolvedRelease: TemplateReviewRelease;
    resolvedLocalDate: string;
  }> {
    const currentVersion = await this.getVersionById(versionId);
    if (!currentVersion) {
      throw new AirtableClientError('VERSION_NOT_FOUND', 'Template version not found.', 404, { version_id: versionId });
    }
    if (!currentVersion.assetId) {
      throw new AirtableClientError('VERSION_ASSET_ID_MISSING', 'Template version is missing its asset linkage.', 500, {
        version_id: versionId,
      });
    }

    const currentAsset = await this.getAssetById(currentVersion.assetId);
    if (!currentAsset) {
      throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Template asset not found in template-review scope.', 404, {
        asset_id: currentVersion.assetId,
        version_id: versionId,
      });
    }

    const releaseLocalDate = input.release_date_local ?? currentLocalDate(input.time_zone ?? 'UTC');
    const releaseRecord =
      input.release_record_id !== undefined
        ? (await this.getRecord(TABLE_IDS.assetReleases, input.release_record_id))
        : null;

    if (input.release_record_id !== undefined && !releaseRecord) {
      throw new AirtableClientError('RELEASE_NOT_FOUND', 'Asset Release record not found.', 404, {
        release_record_id: input.release_record_id,
      });
    }

    const release =
      releaseRecord !== null
        ? mapRelease(releaseRecord)
        : await this.findReleaseByLocalDate(releaseLocalDate);

    const checklist = currentVersion.publishingChecklist;
    if (!checklist) {
      throw new AirtableClientError('PUBLISHING_CHECKLIST_MISSING', 'Template version has no publishing checklist to complete.', 409, {
        version_id: versionId,
      });
    }

    const updatedVersion = await this.updateVersionReview(versionId, {
      publishing_checklist: markChecklistComplete(checklist),
      release_record_id: release.releaseId,
      ...(input.approve_version ? { review_status: '✅Approved' } : {}),
    });

    const updatedAsset =
      input.mrp_id_overwrite !== undefined
        ? await this.updateAssetPublishing(currentAsset.assetId, { mrp_id_overwrite: input.mrp_id_overwrite })
        : currentAsset;

    return {
      updatedVersion,
      updatedAsset,
      resolvedRelease: release,
      resolvedLocalDate: releaseLocalDate,
    };
  }

}
