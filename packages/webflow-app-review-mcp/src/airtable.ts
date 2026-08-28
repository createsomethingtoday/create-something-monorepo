import {
  CAPABILITIES_OPTIONS,
  DEFAULT_AIRTABLE_BASE_ID,
  DEFAULT_GOVERNANCE_FINDINGS_TABLE_ID,
  EXCEPTION_STATUS_OPTIONS,
  EXCEPTION_TYPE_OPTIONS,
  FIELD_IDS,
  GOVERNANCE_FINDING_FIELD_NAMES,
  type GovernanceFindingCategory,
  type GovernanceFindingPriority,
  type GovernanceFindingStatus,
  HOLD_REASON_OPTIONS,
  MARKETPLACE_STATUS_OPTIONS,
  PENDING_EXCEPTION_STATUS_OPTIONS,
  REJECTION_REASON_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  REVIEW_TYPE_OPTIONS,
  TABLE_IDS,
  VISIBILITY_OPTIONS,
  isAppLikeAsset,
  validateAssetMetadataWriteKeys,
} from './schema.js';

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

interface AirtableSingleResponse {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

export type ScopedTableId = (typeof TABLE_IDS)[keyof typeof TABLE_IDS];

const SCOPED_TABLE_IDS = new Set<string>(Object.values(TABLE_IDS));
const RETRYABLE_STATUS = new Set<number>([429, 500, 502, 503, 504]);
const AIRTABLE_RATE_LIMIT_COOLDOWN_MS = 30_000;
const EXCEPTION_QUEUE_REQUEST_INTERVAL_MS = 250;

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
  FIELD_IDS.versions.exceptionStatus,
  FIELD_IDS.versions.exceptionType,
  FIELD_IDS.versions.exceptionRationale,
  FIELD_IDS.versions.exceptionDecisionNotes,
  FIELD_IDS.versions.exceptionRequestedBy,
  FIELD_IDS.versions.exceptionDecisionBy,
  FIELD_IDS.versions.exceptionRequestedDatetime,
  FIELD_IDS.versions.exceptionDecisionDatetime,
  FIELD_IDS.versions.exceptionItemsLink,
  FIELD_IDS.versions.undecidedExceptionItems,
  FIELD_IDS.versions.deniedExceptionItems,
  FIELD_IDS.versions.assetUndecidedExceptions,
  FIELD_IDS.versions.assetApprovedExceptions,
  FIELD_IDS.versions.assetExceptionHistory,
  FIELD_IDS.versions.holdReason,
  FIELD_IDS.versions.holdNotes,
  FIELD_IDS.versions.partnershipApp,
  FIELD_IDS.versions.zendeskTicketId,
  FIELD_IDS.versions.zendeskSubject,
] as const;

// Airtable-side twin of isAppLikeAsset: the Assets table is ~90% template records, so
// filtering server-side keeps queue reads to ~1k app rows instead of ~14k. isAppLikeAsset
// remains the in-memory authority on every record that comes back.
const APP_SCOPE_FORMULA = `OR({${FIELD_IDS.assets.capabilities}} != '', {${FIELD_IDS.assets.clientId}} != '', {${FIELD_IDS.assets.visibility}} != '')`;

const STATS_VERSION_FIELD_IDS = [
  FIELD_IDS.versions.versionNumber,
  FIELD_IDS.versions.reviewType,
  FIELD_IDS.versions.reviewer,
  FIELD_IDS.versions.reviewStatus,
  FIELD_IDS.versions.submissionDatetime,
  FIELD_IDS.versions.assetLink,
  FIELD_IDS.versions.assetRecordIdRollup,
] as const;

const EXCEPTION_ITEM_FIELD_IDS = [
  FIELD_IDS.exceptions.item,
  FIELD_IDS.exceptions.assetVersionLink,
  FIELD_IDS.exceptions.assetLink,
  FIELD_IDS.exceptions.status,
  FIELD_IDS.exceptions.type,
  FIELD_IDS.exceptions.rationale,
  FIELD_IDS.exceptions.decisionNotes,
  FIELD_IDS.exceptions.requestedBy,
  FIELD_IDS.exceptions.decisionBy,
  FIELD_IDS.exceptions.requestedDatetime,
  FIELD_IDS.exceptions.decisionDatetime,
  FIELD_IDS.exceptions.undecided,
  FIELD_IDS.exceptions.denied,
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

// The Airtable → Zendesk email composer renders feedback as HTML without escaping,
// so a literal tag like <script type="…"> is parsed as markup and Zendesk's sanitizer
// drops it plus everything after it — the creator receives a silently truncated email
// (observed: Onart, ZD 1170959, 2026-08-08; Wistia, ZD 1170775, 2026-07-30). Matches
// tag-shaped sequences like <script …>, </div>, <br/>; deliberately not <https://…>
// autolinks or "x < y".
const RAW_HTML_TAG_PATTERN = /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>/;

export function findRawHtmlTag(text: string): string | null {
  const match = RAW_HTML_TAG_PATTERN.exec(text);
  return match ? match[0] : null;
}

function assertNoRawHtmlInCreatorFeedback(field: 'review_feedback', value: string | undefined): void {
  if (value === undefined) return;
  const tag = findRawHtmlTag(value);
  if (tag !== null) {
    throw new AirtableClientError(
      'RAW_HTML_IN_FEEDBACK',
      `${field} contains a raw HTML tag (${tag}). The Zendesk email pipeline parses creator-facing feedback as HTML, and a raw tag truncates the delivered email — everything after it is silently dropped. Rewrite the reference without angle brackets, e.g. \`script type="application/ld+json"\` in backticks.`,
      400,
      { field, tag },
    );
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
  assignableVersionId?: string;
  reviewer?: CollaboratorRef | null;
  versionNumber?: number;
  reviewType?: string;
  submissionDatetime?: string;
  normalizedStatus?: AppReviewQueueStatus | null;
  isReadyToReview?: boolean;
  isAssigned?: boolean;
  isUnassigned?: boolean;
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
  exceptionStatus?: string;
  exceptionType?: string;
  exceptionRationale?: string;
  exceptionDecisionNotes?: string;
  exceptionRequestedBy?: CollaboratorRef | null;
  exceptionDecisionBy?: CollaboratorRef | null;
  exceptionRequestedDatetime?: string;
  exceptionDecisionDatetime?: string;
  exceptionItemIds?: string[];
  undecidedExceptionItems?: number;
  deniedExceptionItems?: number;
  assetUndecidedExceptions?: number;
  assetApprovedExceptions?: number;
  assetExceptionHistoryIds?: string[];
  holdReason?: string;
  holdNotes?: string;
  isPartnershipApp?: boolean;
  zendeskTicketId?: string;
  zendeskSubject?: string;
  createdTime?: string;
}

export interface AppReviewExceptionItem {
  exceptionItemId: string;
  item?: string;
  assetVersionId?: string;
  assetId?: string;
  exceptionStatus?: string;
  exceptionType?: string;
  rationale?: string;
  decisionNotes?: string;
  requestedBy?: CollaboratorRef | null;
  decisionBy?: CollaboratorRef | null;
  requestedDatetime?: string;
  decisionDatetime?: string;
  isUndecided?: boolean;
  isDenied?: boolean;
  createdTime?: string;
}

export interface AppReviewExceptionQueueEntry {
  asset: AppReviewAsset;
  version: AppReviewVersion;
  exceptionItems: AppReviewExceptionItem[];
}

export type AppReviewQueueStatus =
  | 'ready_to_review'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'archived';

export type AppReviewQueueAssignmentFilter = 'any' | 'assigned' | 'unassigned';
export type AppReviewQueueSort = 'submissionDatetime_desc' | 'submissionDatetime_asc' | 'versionNumber_desc' | 'versionNumber_asc';

export interface AppReviewQueueQuery {
  limit?: number;
  status?: AppReviewQueueStatus;
  assigned?: AppReviewQueueAssignmentFilter;
  sort?: AppReviewQueueSort;
}

export type AppReviewStatsGroupBy = 'status' | 'review_type' | 'capability' | 'month' | 'reviewer';
export type AppReviewStatsCountMode = 'submissions' | 'assets';

export interface AppReviewQueueStatsQuery {
  groupBy?: AppReviewStatsGroupBy[];
  submittedAfter?: string;
  submittedBefore?: string;
  status?: AppReviewQueueStatus;
  countMode?: AppReviewStatsCountMode;
}

export interface AppReviewStatsBucket {
  key: string;
  count: number;
  breakdown?: AppReviewStatsBucket[];
}

export interface AppReviewQueueStats {
  total: number;
  countMode: AppReviewStatsCountMode;
  groupBy: AppReviewStatsGroupBy[];
  window: { submittedAfter: string | null; submittedBefore: string | null };
  groups: AppReviewStatsBucket[];
  outOfScopeVersionsExcluded: number;
}

export interface AppReviewContext {
  versionId: string;
  assetId?: string;
  appName?: string;
  reviewer?: CollaboratorRef | null;
  reviewStatus?: string;
  reviewType?: string;
  rejectionReason?: string;
  reviewFeedback?: string;
  isAssigned: boolean;
  asset?: AppReviewAsset | null;
  version: AppReviewVersion;
}

export interface AppReviewGovernanceFinding {
  findingId: string;
  title: string;
  status?: GovernanceFindingStatus | string;
  priority?: GovernanceFindingPriority | string;
  category?: GovernanceFindingCategory | string;
  summary?: string;
  evidence?: string;
  recommendation?: string;
  decisionNeeded?: boolean;
  nextAction?: string;
  owner?: string;
  appName?: string;
  appId?: string;
  assetIds?: string[];
  versionIds?: string[];
  sourceUrl?: string;
  linkedUrls?: string[];
  reporter?: string;
  createdByAgent?: string;
  createdTime?: string;
}

export interface GovernanceFindingWriteInput {
  title?: string;
  status?: GovernanceFindingStatus;
  priority?: GovernanceFindingPriority;
  category?: GovernanceFindingCategory;
  summary?: string;
  evidence?: string;
  recommendation?: string;
  decision_needed?: boolean;
  next_action?: string;
  owner?: string;
  app_name?: string;
  app_id?: string;
  asset_id?: string;
  version_id?: string;
  source_url?: string;
  linked_urls?: string[];
  reporter?: string;
  created_by_agent?: string;
}

export interface GovernanceFindingCreateInput extends GovernanceFindingWriteInput {
  title: string;
  category: GovernanceFindingCategory;
  summary: string;
}

export interface GovernanceFindingQuery {
  limit?: number;
  status?: GovernanceFindingStatus;
  category?: GovernanceFindingCategory;
  priority?: GovernanceFindingPriority;
  decisionNeeded?: boolean;
  search?: string;
}

export interface VersionReviewUpdateInput {
  review_status?: string;
  review_type?: string;
  reviewer?: CollaboratorRef | null;
  rejection_reason?: string;
  review_feedback?: string;
  submission_datetime_override?: string | null;
  exception_status?: string;
  exception_type?: string;
  exception_rationale?: string;
  exception_decision_notes?: string;
  hold_reason?: string | null;
  hold_notes?: string;
}

export interface ExceptionItemCreateInput {
  asset_version_id: string;
  /** The version's parent asset — links exception history across versions. */
  asset_id?: string;
  item: string;
  exception_type?: string;
  rationale?: string;
}

export interface ExceptionItemUpdateInput {
  item?: string;
  exception_status?: string;
  exception_type?: string;
  rationale?: string;
  decision_notes?: string;
}

export interface AssetMetadataUpdateInput {
  [key: string]: unknown;
}

export interface VersionExceptionWebhookContext {
  id: string;
  name: string | null;
  creatorName: string | null;
  reviewStatus: string | null;
  exceptionStatus: string | null;
  exceptionType: string | null;
  exceptionRationale: string | null;
  exceptionDecisionNotes: string | null;
  exceptionRequestedBy: CollaboratorRef | null;
  exceptionDecisionBy: CollaboratorRef | null;
  exceptionSlackTs: string | null;
  submissionSlackTs: string | null;
  submissionSlackChannel: string | null;
  reviewFeedback: string | null;
  holdReason: string | null;
  holdNotes: string | null;
  partnershipApp: boolean;
}

export interface ExceptionItemWebhookContext {
  id: string;
  item: string | null;
  status: string | null;
  type: string | null;
  rationale: string | null;
  decisionNotes: string | null;
  requestedBy: CollaboratorRef | null;
  decisionBy: CollaboratorRef | null;
  versionId: string | null;
}

export interface ReviewerGuidanceProposalInput {
  apiKey: string;
  baseId: string;
  tableId: string;
  title: string;
  guidance: string;
  sourceRecordId: string;
  sourceUrl: string;
}

export interface AirtableClientOptions {
  apiKey: string;
  baseId?: string;
  governanceApiKey?: string;
  governanceBaseId?: string;
  governanceFindingsTableId?: string;
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

function buildOrFormula(fieldId: string, values: string[]): string {
  return `OR(${values.map((value) => `{${fieldId}} = '${escapeFormulaValue(value)}'`).join(',')})`;
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

function toLinkedUrlArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return toStringArray(value);
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

function toBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    if (/^(true|yes|1)$/i.test(value)) return true;
    if (/^(false|no|0)$/i.test(value)) return false;
  }
  return undefined;
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
    exceptionStatus: firstString(fields[FIELD_IDS.versions.exceptionStatus]),
    exceptionType: firstString(fields[FIELD_IDS.versions.exceptionType]),
    exceptionRationale: firstString(fields[FIELD_IDS.versions.exceptionRationale]),
    exceptionDecisionNotes: firstString(fields[FIELD_IDS.versions.exceptionDecisionNotes]),
    exceptionRequestedBy: toCollaborator(fields[FIELD_IDS.versions.exceptionRequestedBy]),
    exceptionDecisionBy: toCollaborator(fields[FIELD_IDS.versions.exceptionDecisionBy]),
    exceptionRequestedDatetime: firstString(fields[FIELD_IDS.versions.exceptionRequestedDatetime]),
    exceptionDecisionDatetime: firstString(fields[FIELD_IDS.versions.exceptionDecisionDatetime]),
    exceptionItemIds: toStringArray(fields[FIELD_IDS.versions.exceptionItemsLink]),
    undecidedExceptionItems: toNumberValue(fields[FIELD_IDS.versions.undecidedExceptionItems]),
    deniedExceptionItems: toNumberValue(fields[FIELD_IDS.versions.deniedExceptionItems]),
    assetUndecidedExceptions: toNumberValue(fields[FIELD_IDS.versions.assetUndecidedExceptions]),
    assetApprovedExceptions: toNumberValue(fields[FIELD_IDS.versions.assetApprovedExceptions]),
    assetExceptionHistoryIds: toStringArray(fields[FIELD_IDS.versions.assetExceptionHistory]),
    holdReason: firstString(fields[FIELD_IDS.versions.holdReason]),
    holdNotes: firstString(fields[FIELD_IDS.versions.holdNotes]),
    isPartnershipApp: toBooleanValue(fields[FIELD_IDS.versions.partnershipApp]),
    zendeskTicketId: firstString(fields[FIELD_IDS.versions.zendeskTicketId]),
    zendeskSubject: firstString(fields[FIELD_IDS.versions.zendeskSubject]),
    createdTime: record.createdTime,
  };
}

function mapExceptionItemRecord(record: AirtableRecord): AppReviewExceptionItem {
  const fields = record.fields;
  const undecided = toNumberValue(fields[FIELD_IDS.exceptions.undecided]);
  const denied = toNumberValue(fields[FIELD_IDS.exceptions.denied]);
  return {
    exceptionItemId: record.id,
    item: firstString(fields[FIELD_IDS.exceptions.item]),
    assetVersionId: toStringArray(fields[FIELD_IDS.exceptions.assetVersionLink])[0],
    assetId: toStringArray(fields[FIELD_IDS.exceptions.assetLink])[0],
    exceptionStatus: firstString(fields[FIELD_IDS.exceptions.status]),
    exceptionType: firstString(fields[FIELD_IDS.exceptions.type]),
    rationale: firstString(fields[FIELD_IDS.exceptions.rationale]),
    decisionNotes: firstString(fields[FIELD_IDS.exceptions.decisionNotes]),
    requestedBy: toCollaborator(fields[FIELD_IDS.exceptions.requestedBy]),
    decisionBy: toCollaborator(fields[FIELD_IDS.exceptions.decisionBy]),
    requestedDatetime: firstString(fields[FIELD_IDS.exceptions.requestedDatetime]),
    decisionDatetime: firstString(fields[FIELD_IDS.exceptions.decisionDatetime]),
    isUndecided: undecided === undefined ? undefined : undecided > 0,
    isDenied: denied === undefined ? undefined : denied > 0,
    createdTime: record.createdTime,
  };
}

function mapGovernanceFindingRecord(record: AirtableRecord): AppReviewGovernanceFinding {
  const fields = record.fields;
  return {
    findingId: record.id,
    title: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.title]) ?? '',
    status: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.status]),
    priority: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.priority]),
    category: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.category]),
    summary: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.summary]),
    evidence: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.evidence]),
    recommendation: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.recommendation]),
    decisionNeeded: toBooleanValue(fields[GOVERNANCE_FINDING_FIELD_NAMES.decisionNeeded]),
    nextAction: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.nextAction]),
    owner: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.owner]),
    appName: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.appName]),
    appId: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.appId]),
    assetIds: toStringArray(fields[GOVERNANCE_FINDING_FIELD_NAMES.asset]),
    versionIds: toStringArray(fields[GOVERNANCE_FINDING_FIELD_NAMES.assetVersion]),
    sourceUrl: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.sourceUrl]),
    linkedUrls: toLinkedUrlArray(fields[GOVERNANCE_FINDING_FIELD_NAMES.linkedUrls]),
    reporter: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.reporter]),
    createdByAgent: firstString(fields[GOVERNANCE_FINDING_FIELD_NAMES.createdByAgent]),
    createdTime: record.createdTime,
  };
}

function normalizeString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeLinkedUrls(values: string[] | undefined): string | undefined {
  if (!values) return undefined;
  const urls = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return urls.length > 0 ? urls.join('\n') : undefined;
}

function buildGovernanceFindingFields(input: GovernanceFindingWriteInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  function setString(key: keyof typeof GOVERNANCE_FINDING_FIELD_NAMES, value: string | undefined) {
    const normalized = normalizeString(value);
    if (normalized !== undefined) fields[GOVERNANCE_FINDING_FIELD_NAMES[key]] = normalized;
  }

  setString('title', input.title);
  setString('status', input.status);
  setString('priority', input.priority);
  setString('category', input.category);
  setString('summary', input.summary);
  setString('evidence', input.evidence);
  setString('recommendation', input.recommendation);
  setString('nextAction', input.next_action);
  setString('owner', input.owner);
  setString('appName', input.app_name);
  setString('appId', input.app_id);
  setString('sourceUrl', input.source_url);
  setString('reporter', input.reporter);
  setString('createdByAgent', input.created_by_agent);

  if (input.decision_needed !== undefined) {
    fields[GOVERNANCE_FINDING_FIELD_NAMES.decisionNeeded] = input.decision_needed;
  }
  if (input.asset_id) {
    fields[GOVERNANCE_FINDING_FIELD_NAMES.asset] = input.asset_id;
  }
  if (input.version_id) {
    fields[GOVERNANCE_FINDING_FIELD_NAMES.assetVersion] = input.version_id;
  }

  const linkedUrls = normalizeLinkedUrls(input.linked_urls);
  if (linkedUrls !== undefined) {
    fields[GOVERNANCE_FINDING_FIELD_NAMES.linkedUrls] = linkedUrls;
  }

  return fields;
}

export function normalizeStatusValue(candidate: string): AppReviewQueueStatus | null {
  if (/ready/i.test(candidate)) return 'ready_to_review';
  if (/training check|in review|admin feedback review|managed feedback review|admin approval review|admin rejection review/i.test(candidate)) {
    return 'in_review';
  }
  if (/changes requested|response to review/i.test(candidate)) return 'changes_requested';
  if (/approved/i.test(candidate)) return 'approved';
  if (/rejected/i.test(candidate)) return 'rejected';
  if (/on hold/i.test(candidate)) return 'on_hold';
  if (/archived/i.test(candidate)) return 'archived';
  return null;
}

function normalizeQueueStatus(asset: AppReviewAsset, version?: AppReviewVersion | null): AppReviewQueueStatus | null {
  const candidates = [
    version?.reviewStatus,
    asset.latestReviewStatus,
    ...(asset.openReviewStatus ?? []),
    asset.marketplaceStatus,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const normalized = normalizeStatusValue(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function toQueueItem(asset: AppReviewAsset, version?: AppReviewVersion | null): AppReviewQueueItem {
  const reviewer = version?.reviewer ?? null;
  const normalizedStatus = normalizeQueueStatus(asset, version);

  return {
    ...asset,
    assignableVersionId: version?.versionId,
    reviewer,
    versionNumber: version?.versionNumber,
    reviewType: version?.reviewType,
    submissionDatetime: version?.submissionDatetime ?? version?.createdTime,
    normalizedStatus,
    isReadyToReview: normalizedStatus === 'ready_to_review',
    isAssigned: Boolean(reviewer),
    isUnassigned: !reviewer,
  };
}

function compareIsoDates(a?: string, b?: string): number {
  const left = a ? Date.parse(a) : Number.NaN;
  const right = b ? Date.parse(b) : Number.NaN;
  const leftValue = Number.isFinite(left) ? left : -Infinity;
  const rightValue = Number.isFinite(right) ? right : -Infinity;
  return leftValue - rightValue;
}

function sortQueueItems(items: AppReviewQueueItem[], sort: AppReviewQueueSort): AppReviewQueueItem[] {
  const cloned = [...items];
  cloned.sort((left, right) => {
    switch (sort) {
      case 'submissionDatetime_asc':
        return compareIsoDates(left.submissionDatetime, right.submissionDatetime);
      case 'submissionDatetime_desc':
        return compareIsoDates(right.submissionDatetime, left.submissionDatetime);
      case 'versionNumber_asc':
        return (left.versionNumber ?? 0) - (right.versionNumber ?? 0);
      case 'versionNumber_desc':
        return (right.versionNumber ?? 0) - (left.versionNumber ?? 0);
    }
  });
  return cloned;
}

function pickLatestVersion(current: AppReviewVersion | undefined, candidate: AppReviewVersion): AppReviewVersion {
  if (!current) return candidate;

  const currentVersionNumber = current.versionNumber ?? -Infinity;
  const candidateVersionNumber = candidate.versionNumber ?? -Infinity;
  if (candidateVersionNumber !== currentVersionNumber) {
    return candidateVersionNumber > currentVersionNumber ? candidate : current;
  }

  const currentSubmitted = Date.parse(current.submissionDatetime ?? current.createdTime ?? '');
  const candidateSubmitted = Date.parse(candidate.submissionDatetime ?? candidate.createdTime ?? '');
  if (Number.isFinite(candidateSubmitted) && (!Number.isFinite(currentSubmitted) || candidateSubmitted > currentSubmitted)) {
    return candidate;
  }

  return current;
}

const STATS_UNSET_KEY = '(not set)';

function parseWindowBound(value: string | undefined, bound: 'after' | 'before'): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  // A bare date means the whole day: "2026-08-20" as an end bound includes that day's submissions.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}${bound === 'before' ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
    : trimmed;
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) {
    throw new AirtableClientError(
      'INVALID_INPUT',
      `submitted_${bound} must be an ISO date (YYYY-MM-DD) or datetime. Received: ${value}`,
      400,
    );
  }
  return parsed;
}

function effectiveSubmissionTime(version: AppReviewVersion): number {
  return Date.parse(version.submissionDatetime ?? version.createdTime ?? '');
}

function statsKeyFor(
  dimension: AppReviewStatsGroupBy,
  version: AppReviewVersion,
  assetsById: Map<string, AppReviewQueueItem>,
): string {
  switch (dimension) {
    case 'status':
      return (version.reviewStatus ? normalizeStatusValue(version.reviewStatus) : null) ?? STATS_UNSET_KEY;
    case 'review_type':
      return version.reviewType ?? STATS_UNSET_KEY;
    case 'capability': {
      const asset = version.assetId ? assetsById.get(version.assetId) : undefined;
      return asset?.appCapabilities ?? STATS_UNSET_KEY;
    }
    case 'month': {
      const time = effectiveSubmissionTime(version);
      return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 7) : STATS_UNSET_KEY;
    }
    case 'reviewer':
      return version.reviewer?.name ?? version.reviewer?.email ?? version.reviewer?.id ?? '(unassigned)';
  }
}

function sortStatsBuckets(buckets: AppReviewStatsBucket[], dimension: AppReviewStatsGroupBy): AppReviewStatsBucket[] {
  const cloned = [...buckets];
  if (dimension === 'month') {
    cloned.sort((left, right) => left.key.localeCompare(right.key));
  } else {
    cloned.sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
  }
  return cloned;
}

export function assertScopedTable(tableId: string): asserts tableId is ScopedTableId {
  if (!SCOPED_TABLE_IDS.has(tableId)) {
    throw new AirtableClientError('TABLE_SCOPE_VIOLATION', `Table ${tableId} is outside MCP scope.`);
  }
}

function buildAndFormula(clauses: string[]): string | undefined {
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return `AND(${clauses.join(',')})`;
}

function buildGovernanceFindingFilter(query: GovernanceFindingQuery): string | undefined {
  const clauses: string[] = [];
  const fields = GOVERNANCE_FINDING_FIELD_NAMES;

  if (query.status) clauses.push(`{${fields.status}} = '${escapeFormulaValue(query.status)}'`);
  if (query.category) clauses.push(`{${fields.category}} = '${escapeFormulaValue(query.category)}'`);
  if (query.priority) clauses.push(`{${fields.priority}} = '${escapeFormulaValue(query.priority)}'`);
  if (query.decisionNeeded !== undefined) {
    clauses.push(query.decisionNeeded ? `{${fields.decisionNeeded}} = TRUE()` : `NOT({${fields.decisionNeeded}})`);
  }

  const search = normalizeString(query.search);
  if (search) {
    const haystack = `{${fields.title}} & ' ' & {${fields.summary}} & ' ' & {${fields.evidence}} & ' ' & {${fields.recommendation}}`;
    clauses.push(`SEARCH('${escapeFormulaValue(search)}', ${haystack})`);
  }

  return buildAndFormula(clauses);
}

export class AirtableClient {
  private readonly apiKey: string;
  private readonly governanceApiKey: string;
  readonly baseId: string;
  private readonly governanceBaseId: string;
  private readonly governanceFindingsTableId: string;
  private readonly fetchFn: FetchFn;
  private readonly sleepFn: SleepFn;
  private readonly maxRetries: number;

  constructor(options: AirtableClientOptions) {
    this.apiKey = options.apiKey;
    this.governanceApiKey = options.governanceApiKey ?? options.apiKey;
    this.baseId = options.baseId ?? DEFAULT_AIRTABLE_BASE_ID;
    this.governanceBaseId = options.governanceBaseId ?? this.baseId;
    this.governanceFindingsTableId = options.governanceFindingsTableId ?? DEFAULT_GOVERNANCE_FINDINGS_TABLE_ID;
    this.fetchFn = options.fetchFn ?? defaultFetch;
    this.sleepFn = options.sleepFn ?? defaultSleep;
    this.maxRetries = options.maxRetries ?? 3;
  }

  private tableBaseUrlFor(baseId: string): string {
    return `https://api.airtable.com/v0/${baseId}`;
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit,
    query: URLSearchParams,
    baseId = this.baseId,
    apiKey = this.apiKey,
  ): Promise<T> {
    const url = `${this.tableBaseUrlFor(baseId)}${path}?${query.toString()}`;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.fetchFn(url, {
          ...init,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(init.headers ?? {}),
          },
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        const body = await response.text();
        if (RETRYABLE_STATUS.has(response.status) && attempt < this.maxRetries) {
          const waitMs = response.status === 429
            ? AIRTABLE_RATE_LIMIT_COOLDOWN_MS
            : Math.min(200 * 2 ** attempt, 2000);
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
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    pageIntervalMs?: number;
  }): Promise<AirtableRecord[]> {
    assertScopedTable(args.tableId);

    const all: AirtableRecord[] = [];
    let offset: string | undefined;

    while (true) {
      if (offset && args.pageIntervalMs && args.pageIntervalMs > 0) {
        await this.sleepFn(args.pageIntervalMs);
      }
      const query = new URLSearchParams();
      query.set('returnFieldsByFieldId', 'true');
      query.set('pageSize', '100');
      args.fieldIds.forEach((fieldId) => query.append('fields[]', fieldId));
      if (args.filterByFormula) query.set('filterByFormula', args.filterByFormula);
      if (args.sortField) {
        query.set('sort[0][field]', args.sortField);
        query.set('sort[0][direction]', args.sortDirection ?? 'asc');
      }
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
    _fieldIds: readonly string[],
  ): Promise<AirtableRecord | null> {
    assertScopedTable(tableId);
    const query = new URLSearchParams();
    query.set('returnFieldsByFieldId', 'true');
    // Airtable's single-record GET rejects a fields[] parameter (422 INVALID_REQUEST_UNKNOWN);
    // fetch all fields and let the record mappers pick the ones they need.

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

  private async createRecord(
    tableId: ScopedTableId,
    fields: Record<string, unknown>,
  ): Promise<AirtableRecord> {
    assertScopedTable(tableId);
    const query = new URLSearchParams();
    query.set('returnFieldsByFieldId', 'true');
    query.set('typecast', 'true');

    const payload = JSON.stringify({ records: [{ fields }] });
    const data = await this.requestJson<AirtableListResponse>(
      `/${encodeURIComponent(tableId)}`,
      { method: 'POST', body: payload },
      query,
    );

    if (!data.records[0]) {
      throw new AirtableClientError('AIRTABLE_EMPTY_CREATE', 'Airtable create returned no record.');
    }
    return data.records[0];
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

  private async listGovernanceFindingRecords(query: GovernanceFindingQuery): Promise<AirtableRecord[]> {
    const all: AirtableRecord[] = [];
    let offset: string | undefined;

    while (true) {
      const params = new URLSearchParams();
      params.set('pageSize', '100');
      params.set('sort[0][field]', GOVERNANCE_FINDING_FIELD_NAMES.priority);
      params.set('sort[0][direction]', 'asc');
      params.set('sort[1][field]', GOVERNANCE_FINDING_FIELD_NAMES.title);
      params.set('sort[1][direction]', 'asc');
      for (const fieldName of Object.values(GOVERNANCE_FINDING_FIELD_NAMES)) {
        params.append('fields[]', fieldName);
      }
      const filterByFormula = buildGovernanceFindingFilter(query);
      if (filterByFormula) params.set('filterByFormula', filterByFormula);
      if (offset) params.set('offset', offset);

      const data = await this.requestJson<AirtableListResponse>(
        `/${encodeURIComponent(this.governanceFindingsTableId)}`,
        { method: 'GET' },
        params,
        this.governanceBaseId,
        this.governanceApiKey,
      );

      all.push(...data.records);
      if (query.limit && all.length >= query.limit) {
        return all.slice(0, query.limit);
      }

      if (!data.offset) return all;
      offset = data.offset;
    }
  }

  private async getGovernanceFindingRecord(recordId: string): Promise<AirtableRecord | null> {
    const params = new URLSearchParams();
    for (const fieldName of Object.values(GOVERNANCE_FINDING_FIELD_NAMES)) {
      params.append('fields[]', fieldName);
    }

    try {
      return await this.requestJson<AirtableSingleResponse>(
        `/${encodeURIComponent(this.governanceFindingsTableId)}/${encodeURIComponent(recordId)}`,
        { method: 'GET' },
        params,
        this.governanceBaseId,
        this.governanceApiKey,
      );
    } catch (error) {
      if (error instanceof AirtableClientError && error.status === 404) return null;
      throw error;
    }
  }

  private async createGovernanceFindingRecord(fields: Record<string, unknown>): Promise<AirtableRecord> {
    const params = new URLSearchParams();
    params.set('typecast', 'true');
    const payload = JSON.stringify({ records: [{ fields }] });
    const data = await this.requestJson<AirtableListResponse>(
      `/${encodeURIComponent(this.governanceFindingsTableId)}`,
      { method: 'POST', body: payload },
      params,
      this.governanceBaseId,
      this.governanceApiKey,
    );

    if (!data.records[0]) {
      throw new AirtableClientError('AIRTABLE_EMPTY_CREATE', 'Airtable create returned no governance finding.');
    }
    return data.records[0];
  }

  private async updateGovernanceFindingRecord(recordId: string, fields: Record<string, unknown>): Promise<AirtableRecord> {
    const params = new URLSearchParams();
    params.set('typecast', 'true');
    const payload = JSON.stringify({ records: [{ id: recordId, fields }] });
    const data = await this.requestJson<AirtableListResponse>(
      `/${encodeURIComponent(this.governanceFindingsTableId)}`,
      { method: 'PATCH', body: payload },
      params,
      this.governanceBaseId,
      this.governanceApiKey,
    );

    if (!data.records[0]) {
      throw new AirtableClientError('AIRTABLE_EMPTY_UPDATE', 'Airtable update returned no governance finding.');
    }
    return data.records[0];
  }

  async healthCheck(): Promise<{
    ok: boolean;
    baseId: string;
    scopedTables: typeof TABLE_IDS;
    governanceBaseId: string;
    governanceFindingsTable: string;
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
      governanceBaseId: this.governanceBaseId,
      governanceFindingsTable: this.governanceFindingsTableId,
      sampleAssetsRead: records.length,
    };
  }

  async createGovernanceFinding(input: GovernanceFindingCreateInput): Promise<AppReviewGovernanceFinding> {
    const fields = buildGovernanceFindingFields(input);
    if (!fields[GOVERNANCE_FINDING_FIELD_NAMES.status]) {
      fields[GOVERNANCE_FINDING_FIELD_NAMES.status] = 'New';
    }
    if (!fields[GOVERNANCE_FINDING_FIELD_NAMES.priority]) {
      fields[GOVERNANCE_FINDING_FIELD_NAMES.priority] = 'P2';
    }
    if (fields[GOVERNANCE_FINDING_FIELD_NAMES.decisionNeeded] === undefined) {
      fields[GOVERNANCE_FINDING_FIELD_NAMES.decisionNeeded] = false;
    }

    if (!fields[GOVERNANCE_FINDING_FIELD_NAMES.title]) {
      throw new AirtableClientError('INVALID_GOVERNANCE_FINDING', 'Governance finding title is required.', 400);
    }
    if (!fields[GOVERNANCE_FINDING_FIELD_NAMES.summary]) {
      throw new AirtableClientError('INVALID_GOVERNANCE_FINDING', 'Governance finding summary is required.', 400);
    }
    if (!fields[GOVERNANCE_FINDING_FIELD_NAMES.category]) {
      throw new AirtableClientError('INVALID_GOVERNANCE_FINDING', 'Governance finding category is required.', 400);
    }

    return mapGovernanceFindingRecord(await this.createGovernanceFindingRecord(fields));
  }

  async listGovernanceFindings(query: GovernanceFindingQuery = {}): Promise<AppReviewGovernanceFinding[]> {
    const limit = query.limit ?? 100;
    const records = await this.listGovernanceFindingRecords({ ...query, limit });
    return records.map((record) => mapGovernanceFindingRecord(record));
  }

  async getGovernanceFinding(findingId: string): Promise<AppReviewGovernanceFinding | null> {
    const record = await this.getGovernanceFindingRecord(findingId);
    return record ? mapGovernanceFindingRecord(record) : null;
  }

  async updateGovernanceFinding(
    findingId: string,
    input: GovernanceFindingWriteInput,
  ): Promise<AppReviewGovernanceFinding> {
    const fields = buildGovernanceFindingFields(input);
    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError(
        'NO_MUTATION_FIELDS',
        'No governance finding fields were provided for update.',
        400,
      );
    }

    return mapGovernanceFindingRecord(await this.updateGovernanceFindingRecord(findingId, fields));
  }

  async listAssetQueue(limit?: number): Promise<AppReviewQueueItem[]> {
    const records = await this.listRecords({
      tableId: TABLE_IDS.assets,
      fieldIds: ASSET_QUEUE_FIELD_IDS,
      limit,
      filterByFormula: APP_SCOPE_FORMULA,
    });
    return records
      .filter((record) => isAppLikeAsset(record.fields))
      .map((record) => mapQueueRecord(record));
  }

  async listAssetQueueDetailed(query: AppReviewQueueQuery = {}): Promise<{
    sortApplied: AppReviewQueueSort;
    items: AppReviewQueueItem[];
  }> {
    const limit = query.limit ?? 100;
    const sort = query.sort ?? 'submissionDatetime_desc';
    const needsPostFilterCompleteness = Boolean(query.status || query.assigned !== undefined);
    const queue = await this.listAssetQueue(needsPostFilterCompleteness ? undefined : limit);
    const latestVersions = await this.listLatestVersionsForAssets(queue.map((item) => item.assetId));
    const items = queue.map((item) => toQueueItem(item, latestVersions.get(item.assetId) ?? null));

    const filtered = items.filter((item) => {
      if (query.status && item.normalizedStatus !== query.status) return false;
      if (query.assigned === 'assigned' && item.isUnassigned) return false;
      if (query.assigned === 'unassigned' && !item.isUnassigned) return false;
      return true;
    });

    return {
      sortApplied: sort,
      items: sortQueueItems(filtered, sort).slice(0, limit),
    };
  }

  async getQueueStats(query: AppReviewQueueStatsQuery = {}): Promise<AppReviewQueueStats> {
    const groupBy: AppReviewStatsGroupBy[] =
      query.groupBy && query.groupBy.length > 0 ? query.groupBy.slice(0, 2) : ['status'];
    const countMode = query.countMode ?? 'submissions';
    const afterMs = parseWindowBound(query.submittedAfter, 'after');
    const beforeMs = parseWindowBound(query.submittedBefore, 'before');
    if (afterMs !== null && beforeMs !== null && afterMs > beforeMs) {
      throw new AirtableClientError('INVALID_INPUT', 'submitted_after must not be later than submitted_before.', 400);
    }

    // The formula pre-filter only trims what Airtable sends back; it runs with ±1 day
    // slack because Airtable's date comparison semantics differ from Date.parse. The
    // exact in-memory window below is authoritative.
    const dayMs = 24 * 60 * 60 * 1000;
    const effectiveDateFormula = `IF({${FIELD_IDS.versions.submissionDatetime}}, {${FIELD_IDS.versions.submissionDatetime}}, CREATED_TIME())`;
    const windowClauses: string[] = [];
    if (afterMs !== null) {
      windowClauses.push(`NOT(IS_BEFORE(${effectiveDateFormula}, '${new Date(afterMs - dayMs).toISOString()}'))`);
    }
    if (beforeMs !== null) {
      windowClauses.push(`NOT(IS_AFTER(${effectiveDateFormula}, '${new Date(beforeMs + dayMs).toISOString()}'))`);
    }

    const [versionRecords, assets] = await Promise.all([
      this.listRecords({
        tableId: TABLE_IDS.assetVersions,
        fieldIds: STATS_VERSION_FIELD_IDS,
        filterByFormula: buildAndFormula(windowClauses),
      }),
      this.listAssetQueue(),
    ]);

    const assetsById = new Map(assets.map((asset) => [asset.assetId, asset]));

    const inWindow = versionRecords
      .map((record) => mapVersionRecord(record))
      .filter((version) => {
        const time = effectiveSubmissionTime(version);
        if (afterMs !== null && !(Number.isFinite(time) && time >= afterMs)) return false;
        if (beforeMs !== null && !(Number.isFinite(time) && time <= beforeMs)) return false;
        return true;
      });

    let outOfScopeVersionsExcluded = 0;
    let versions = inWindow.filter((version) => {
      if (!version.assetId || !assetsById.has(version.assetId)) {
        outOfScopeVersionsExcluded += 1;
        return false;
      }
      return true;
    });

    if (countMode === 'assets') {
      const latestByAssetId = new Map<string, AppReviewVersion>();
      for (const version of versions) {
        const assetId = version.assetId as string;
        latestByAssetId.set(assetId, pickLatestVersion(latestByAssetId.get(assetId), version));
      }
      versions = [...latestByAssetId.values()];
    }

    if (query.status) {
      versions = versions.filter(
        (version) => (version.reviewStatus ? normalizeStatusValue(version.reviewStatus) : null) === query.status,
      );
    }

    const [primary, secondary] = groupBy;
    const counters = new Map<string, { count: number; breakdown: Map<string, number> }>();
    for (const version of versions) {
      const key = statsKeyFor(primary, version, assetsById);
      const bucket = counters.get(key) ?? { count: 0, breakdown: new Map<string, number>() };
      bucket.count += 1;
      if (secondary) {
        const subKey = statsKeyFor(secondary, version, assetsById);
        bucket.breakdown.set(subKey, (bucket.breakdown.get(subKey) ?? 0) + 1);
      }
      counters.set(key, bucket);
    }

    const groups = sortStatsBuckets(
      [...counters.entries()].map(([key, bucket]) => ({
        key,
        count: bucket.count,
        ...(secondary
          ? {
              breakdown: sortStatsBuckets(
                [...bucket.breakdown.entries()].map(([subKey, count]) => ({ key: subKey, count })),
                secondary,
              ),
            }
          : {}),
      })),
      primary,
    );

    return {
      total: versions.length,
      countMode,
      groupBy,
      window: {
        submittedAfter: afterMs !== null ? new Date(afterMs).toISOString() : null,
        submittedBefore: beforeMs !== null ? new Date(beforeMs).toISOString() : null,
      },
      groups,
      outOfScopeVersionsExcluded,
    };
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

    let offset: string | undefined;
    do {
      const query = new URLSearchParams();
      query.set('returnFieldsByFieldId', 'true');
      query.set('pageSize', '100');
      query.set('filterByFormula', APP_SCOPE_FORMULA);
      ASSET_DETAIL_FIELD_IDS.forEach((fieldId) => query.append('fields[]', fieldId));
      if (offset) query.set('offset', offset);

      const data = await this.requestJson<AirtableListResponse>(
        `/${encodeURIComponent(TABLE_IDS.assets)}`,
        { method: 'GET' },
        query,
      );

      const match = data.records.find((record) => {
        if (!isAppLikeAsset(record.fields)) return false;
        const appIds = toStringArray(record.fields[FIELD_IDS.assets.appId]).map((value) => value.toLowerCase());
        return appIds.includes(needle);
      });
      if (match) return mapAssetRecord(match);

      offset = data.offset;
    } while (offset);

    return null;
  }

  async listVersionsForAsset(assetId: string, limit = 100): Promise<AppReviewVersion[]> {
    const formula = `{${FIELD_IDS.versions.assetRecordIdRollup}} = '${escapeFormulaValue(assetId)}'`;
    const records = await this.listRecords({
      tableId: TABLE_IDS.assetVersions,
      fieldIds: VERSION_FIELD_IDS,
      limit,
      filterByFormula: formula,
      sortField: FIELD_IDS.versions.versionNumber,
      sortDirection: 'desc',
    });
    return records
      .map((record) => mapVersionRecord(record))
      .sort((a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0));
  }

  async listPendingExceptionQueue(): Promise<AppReviewExceptionQueueEntry[]> {
    const pendingStatuses = [...PENDING_EXCEPTION_STATUS_OPTIONS];
    const pendingStatusSet = new Set<string>(pendingStatuses);
    // A version belongs in the queue when its aggregate ⚖️Exception Status is pending
    // OR it still carries undecided ⚖️Exceptions items — the aggregate can be stale,
    // decided early (partner-lead recommendation), or unset after items are re-linked
    // to a resubmission, while the per-item rows remain the source of truth.
    const pendingFormula = `OR(${buildOrFormula(FIELD_IDS.versions.exceptionStatus, pendingStatuses)},{${FIELD_IDS.versions.undecidedExceptionItems}} > 0)`;
    const records = await this.listRecords({
      tableId: TABLE_IDS.assetVersions,
      fieldIds: VERSION_FIELD_IDS,
      filterByFormula: pendingFormula,
      sortField: FIELD_IDS.versions.exceptionRequestedDatetime,
      sortDirection: 'asc',
      pageIntervalMs: EXCEPTION_QUEUE_REQUEST_INTERVAL_MS,
    });
    const versions = records
      .map((record) => mapVersionRecord(record))
      .filter((version) =>
        Boolean(version.assetId)
        && (pendingStatusSet.has(version.exceptionStatus ?? '') || (version.undecidedExceptionItems ?? 0) > 0))
      .sort((left, right) => {
        const leftTime = left.exceptionRequestedDatetime ?? left.createdTime ?? '';
        const rightTime = right.exceptionRequestedDatetime ?? right.createdTime ?? '';
        return leftTime.localeCompare(rightTime);
      });

    const assetIds = [...new Set(versions.map((version) => version.assetId).filter((id): id is string => Boolean(id)))];
    const assets: AppReviewAsset[] = [];
    for (const assetId of assetIds) {
      await this.sleepFn(EXCEPTION_QUEUE_REQUEST_INTERVAL_MS);
      const asset = await this.getAssetById(assetId);
      if (asset) assets.push(asset);
    }
    const assetsById = new Map(
      assets.map((asset) => [asset.assetId, asset]),
    );

    const exceptionItemIds = versions.flatMap((version) => version.exceptionItemIds ?? []);
    const exceptionItems = await this.listExceptionItemsByIds(
      exceptionItemIds,
      EXCEPTION_QUEUE_REQUEST_INTERVAL_MS,
    );
    const itemsByVersionId = new Map<string, AppReviewExceptionItem[]>();
    for (const item of exceptionItems) {
      if (!item.assetVersionId) continue;
      const items = itemsByVersionId.get(item.assetVersionId) ?? [];
      items.push(item);
      itemsByVersionId.set(item.assetVersionId, items);
    }

    return versions.flatMap((version) => {
      const asset = version.assetId ? assetsById.get(version.assetId) : undefined;
      if (!asset) return [];
      return [{
        asset,
        version,
        exceptionItems: itemsByVersionId.get(version.versionId) ?? [],
      }];
    });
  }

  private async listLatestVersionsForAssets(assetIds: string[]): Promise<Map<string, AppReviewVersion>> {
    const uniqueAssetIds = [...new Set(assetIds.filter(Boolean))];
    const latestByAssetId = new Map<string, AppReviewVersion>();
    if (uniqueAssetIds.length === 0) return latestByAssetId;

    const chunkSize = 25;
    for (let index = 0; index < uniqueAssetIds.length; index += chunkSize) {
      const chunk = uniqueAssetIds.slice(index, index + chunkSize);
      const records = await this.listRecords({
        tableId: TABLE_IDS.assetVersions,
        fieldIds: VERSION_FIELD_IDS,
        filterByFormula: buildOrFormula(FIELD_IDS.versions.assetRecordIdRollup, chunk),
      });

      for (const record of records) {
        const version = mapVersionRecord(record);
        if (!version.assetId) continue;
        latestByAssetId.set(version.assetId, pickLatestVersion(latestByAssetId.get(version.assetId), version));
      }
    }

    return latestByAssetId;
  }

  async getVersionById(versionId: string): Promise<AppReviewVersion | null> {
    const record = await this.getRecord(TABLE_IDS.assetVersions, versionId, VERSION_FIELD_IDS);
    return record ? mapVersionRecord(record) : null;
  }

  private async getScopedVersion(versionId: string): Promise<{ version: AppReviewVersion; asset: AppReviewAsset }> {
    const version = await this.getVersionById(versionId);
    if (!version) {
      throw new AirtableClientError('VERSION_NOT_FOUND', 'Version not found.', 404, { version_id: versionId });
    }
    if (!version.assetId) {
      throw new AirtableClientError('VERSION_SCOPE_ERROR', 'Version is missing linked asset ID.', 400, { version_id: versionId });
    }

    const asset = await this.getAssetById(version.assetId);
    if (!asset) {
      throw new AirtableClientError(
        'ASSET_NOT_FOUND_OR_OUT_OF_SCOPE',
        'Asset not found or outside app-review scope.',
        404,
        {
          asset_id: version.assetId,
          version_id: versionId,
        },
      );
    }

    return { version, asset };
  }

  async getReviewContext(versionId: string): Promise<AppReviewContext> {
    const { version, asset } = await this.getScopedVersion(versionId);

    return {
      versionId: version.versionId,
      assetId: version.assetId,
      appName: asset?.appName,
      reviewer: version.reviewer ?? null,
      reviewStatus: version.reviewStatus,
      reviewType: version.reviewType,
      rejectionReason: version.rejectionReason,
      reviewFeedback: version.reviewFeedback,
      isAssigned: Boolean(version.reviewer?.id),
      asset,
      version,
    };
  }

  async updateVersionReview(versionId: string, input: VersionReviewUpdateInput): Promise<AppReviewVersion> {
    assertNoRawHtmlInCreatorFeedback('review_feedback', input.review_feedback);

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

    if (input.exception_status !== undefined) {
      if (!(EXCEPTION_STATUS_OPTIONS as readonly string[]).includes(input.exception_status)) {
        throw new AirtableClientError('INVALID_EXCEPTION_STATUS', 'Unsupported exception status.', 400, {
          value: input.exception_status,
          allowed: EXCEPTION_STATUS_OPTIONS,
        });
      }
      fields[FIELD_IDS.versions.exceptionStatus] = input.exception_status;
    }

    if (input.exception_type !== undefined) {
      if (!(EXCEPTION_TYPE_OPTIONS as readonly string[]).includes(input.exception_type)) {
        throw new AirtableClientError('INVALID_EXCEPTION_TYPE', 'Unsupported exception type.', 400, {
          value: input.exception_type,
          allowed: EXCEPTION_TYPE_OPTIONS,
        });
      }
      fields[FIELD_IDS.versions.exceptionType] = input.exception_type;
    }

    if (input.exception_rationale !== undefined) {
      fields[FIELD_IDS.versions.exceptionRationale] = input.exception_rationale;
    }

    if (input.exception_decision_notes !== undefined) {
      fields[FIELD_IDS.versions.exceptionDecisionNotes] = input.exception_decision_notes;
    }

    if (input.hold_reason !== undefined) {
      if (input.hold_reason !== null && !(HOLD_REASON_OPTIONS as readonly string[]).includes(input.hold_reason)) {
        throw new AirtableClientError('INVALID_HOLD_REASON', 'Unsupported hold reason.', 400, {
          value: input.hold_reason,
          allowed: HOLD_REASON_OPTIONS,
        });
      }
      fields[FIELD_IDS.versions.holdReason] = input.hold_reason;
    }

    if (input.hold_notes !== undefined) {
      fields[FIELD_IDS.versions.holdNotes] = input.hold_notes;
    }

    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError('NO_MUTATION_FIELDS', 'No version review fields were provided.', 400);
    }

    const updated = await this.updateRecord(TABLE_IDS.assetVersions, versionId, fields);
    return mapVersionRecord(updated);
  }

  async listExceptionItems(versionId: string): Promise<AppReviewExceptionItem[]> {
    const version = await this.getVersionById(versionId);
    if (!version) {
      throw new AirtableClientError('VERSION_NOT_FOUND', `Asset Version ${versionId} was not found.`, 404);
    }
    return this.listExceptionItemsByIds(version.exceptionItemIds ?? []);
  }

  async listAllExceptionItems(): Promise<AppReviewExceptionItem[]> {
    const records = await this.listRecords({
      tableId: TABLE_IDS.exceptions,
      fieldIds: [...EXCEPTION_ITEM_FIELD_IDS],
    });
    return records.map((record) => mapExceptionItemRecord(record));
  }

  async listExceptionItemsByIds(
    itemIds: string[],
    requestIntervalMs = 0,
  ): Promise<AppReviewExceptionItem[]> {
    const uniqueIds = [...new Set(itemIds.filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    // Chunk the RECORD_ID() OR-formula to stay well under Airtable's URL/formula limits.
    const chunkSize = 50;
    const items: AppReviewExceptionItem[] = [];
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      if (requestIntervalMs > 0) await this.sleepFn(requestIntervalMs);
      const chunk = uniqueIds.slice(i, i + chunkSize);
      const records = await this.listRecords({
        tableId: TABLE_IDS.exceptions,
        fieldIds: [...EXCEPTION_ITEM_FIELD_IDS],
        filterByFormula: `OR(${chunk.map((id) => `RECORD_ID() = '${escapeFormulaValue(id)}'`).join(',')})`,
      });
      items.push(...records.map((record) => mapExceptionItemRecord(record)));
    }
    return items;
  }

  async createExceptionItem(input: ExceptionItemCreateInput): Promise<AppReviewExceptionItem> {
    if (input.exception_type !== undefined && !(EXCEPTION_TYPE_OPTIONS as readonly string[]).includes(input.exception_type)) {
      throw new AirtableClientError('INVALID_EXCEPTION_TYPE', 'Unsupported exception type.', 400, {
        value: input.exception_type,
        allowed: EXCEPTION_TYPE_OPTIONS,
      });
    }

    const fields: Record<string, unknown> = {
      [FIELD_IDS.exceptions.item]: input.item,
      [FIELD_IDS.exceptions.assetVersionLink]: [input.asset_version_id],
    };
    if (input.asset_id) fields[FIELD_IDS.exceptions.assetLink] = [input.asset_id];
    if (input.exception_type !== undefined) fields[FIELD_IDS.exceptions.type] = input.exception_type;
    if (input.rationale !== undefined) fields[FIELD_IDS.exceptions.rationale] = input.rationale;

    const created = await this.createRecord(TABLE_IDS.exceptions, fields);
    return mapExceptionItemRecord(created);
  }

  async updateExceptionItem(exceptionItemId: string, input: ExceptionItemUpdateInput): Promise<AppReviewExceptionItem> {
    const fields: Record<string, unknown> = {};

    if (input.item !== undefined) fields[FIELD_IDS.exceptions.item] = input.item;

    if (input.exception_status !== undefined) {
      if (!(EXCEPTION_STATUS_OPTIONS as readonly string[]).includes(input.exception_status)) {
        throw new AirtableClientError('INVALID_EXCEPTION_STATUS', 'Unsupported exception status.', 400, {
          value: input.exception_status,
          allowed: EXCEPTION_STATUS_OPTIONS,
        });
      }
      fields[FIELD_IDS.exceptions.status] = input.exception_status;
    }

    if (input.exception_type !== undefined) {
      if (!(EXCEPTION_TYPE_OPTIONS as readonly string[]).includes(input.exception_type)) {
        throw new AirtableClientError('INVALID_EXCEPTION_TYPE', 'Unsupported exception type.', 400, {
          value: input.exception_type,
          allowed: EXCEPTION_TYPE_OPTIONS,
        });
      }
      fields[FIELD_IDS.exceptions.type] = input.exception_type;
    }

    if (input.rationale !== undefined) fields[FIELD_IDS.exceptions.rationale] = input.rationale;
    if (input.decision_notes !== undefined) fields[FIELD_IDS.exceptions.decisionNotes] = input.decision_notes;

    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError('NO_MUTATION_FIELDS', 'No exception item fields were provided.', 400);
    }

    const updated = await this.updateRecord(TABLE_IDS.exceptions, exceptionItemId, fields);
    return mapExceptionItemRecord(updated);
  }

  // --- Exception webhook leg (Slack enrichment) -----------------------------
  // Narrow reads/writes used by src/exception-webhook.ts. Writes are limited
  // to the script-era fields (Slack TS + actor stamps) that native Airtable
  // automation actions structurally cannot set.

  async getVersionExceptionWebhookContext(versionId: string): Promise<VersionExceptionWebhookContext | null> {
    const v = FIELD_IDS.versions;
    const record = await this.getRecord(TABLE_IDS.assetVersions, versionId, [
      v.name,
      v.creatorName,
      v.reviewStatus,
      v.exceptionStatus,
      v.exceptionType,
      v.exceptionRationale,
      v.exceptionDecisionNotes,
      v.exceptionRequestedBy,
      v.exceptionDecisionBy,
      v.exceptionSlackTs,
      v.submissionSlackTs,
      v.submissionSlackChannel,
      v.reviewFeedback,
      v.holdReason,
      v.holdNotes,
      v.partnershipApp,
    ]);
    if (!record) return null;

    const fields = record.fields;
    return {
      id: record.id,
      name: firstString(fields[v.name]) ?? null,
      creatorName: firstString(fields[v.creatorName]) ?? null,
      reviewStatus: firstString(fields[v.reviewStatus]) ?? null,
      exceptionStatus: firstString(fields[v.exceptionStatus]) ?? null,
      exceptionType: firstString(fields[v.exceptionType]) ?? null,
      exceptionRationale: firstString(fields[v.exceptionRationale]) ?? null,
      exceptionDecisionNotes: firstString(fields[v.exceptionDecisionNotes]) ?? null,
      exceptionRequestedBy: toCollaborator(fields[v.exceptionRequestedBy]),
      exceptionDecisionBy: toCollaborator(fields[v.exceptionDecisionBy]),
      exceptionSlackTs: firstString(fields[v.exceptionSlackTs]) ?? null,
      submissionSlackTs: firstString(fields[v.submissionSlackTs]) ?? null,
      submissionSlackChannel: firstString(fields[v.submissionSlackChannel]) ?? null,
      reviewFeedback: firstString(fields[v.reviewFeedback]) ?? null,
      holdReason: firstString(fields[v.holdReason]) ?? null,
      holdNotes: firstString(fields[v.holdNotes]) ?? null,
      partnershipApp: toBooleanValue(firstString(fields[v.partnershipApp])) ?? Boolean(firstString(fields[v.partnershipApp])),
    };
  }

  async getExceptionItemWebhookContext(itemId: string): Promise<ExceptionItemWebhookContext | null> {
    const e = FIELD_IDS.exceptions;
    const record = await this.getRecord(TABLE_IDS.exceptions, itemId, [
      e.item,
      e.status,
      e.type,
      e.rationale,
      e.decisionNotes,
      e.requestedBy,
      e.decisionBy,
      e.assetVersionLink,
    ]);
    if (!record) return null;

    const fields = record.fields;
    const versionLink = fields[e.assetVersionLink];
    return {
      id: record.id,
      item: firstString(fields[e.item]) ?? null,
      status: firstString(fields[e.status]) ?? null,
      type: firstString(fields[e.type]) ?? null,
      rationale: firstString(fields[e.rationale]) ?? null,
      decisionNotes: firstString(fields[e.decisionNotes]) ?? null,
      requestedBy: toCollaborator(fields[e.requestedBy]),
      decisionBy: toCollaborator(fields[e.decisionBy]),
      versionId: Array.isArray(versionLink) && typeof versionLink[0] === 'string' ? versionLink[0] : null,
    };
  }

  async writeVersionExceptionSlackTs(versionId: string, ts: string): Promise<void> {
    await this.updateRecord(TABLE_IDS.assetVersions, versionId, {
      [FIELD_IDS.versions.exceptionSlackTs]: ts,
    });
  }

  async stampVersionExceptionActor(versionId: string, role: 'requested' | 'decision', email: string): Promise<void> {
    const fieldId = role === 'requested'
      ? FIELD_IDS.versions.exceptionRequestedBy
      : FIELD_IDS.versions.exceptionDecisionBy;
    await this.updateRecord(TABLE_IDS.assetVersions, versionId, {
      [fieldId]: { email },
    });
  }

  async stampExceptionItemActor(itemId: string, role: 'requested' | 'decision', email: string): Promise<void> {
    const fieldId = role === 'requested'
      ? FIELD_IDS.exceptions.requestedBy
      : FIELD_IDS.exceptions.decisionBy;
    await this.updateRecord(TABLE_IDS.exceptions, itemId, {
      [fieldId]: { email },
    });
  }

  /**
   * Propose an approved exception into the reviewer-exceptions knowledge base
   * (a third base — requires its own PAT). Mirrors the retired Script A
   * promotion payload; the record lands as Knowledge Status = Proposed and
   * needs curation before it becomes Active.
   */
  async proposeReviewerExceptionGuidance(input: ReviewerGuidanceProposalInput): Promise<{ id: string }> {
    const query = new URLSearchParams();
    query.set('typecast', 'true');
    const data = await this.requestJson<AirtableListResponse>(
      `/${encodeURIComponent(input.tableId)}`,
      {
        method: 'POST',
        body: JSON.stringify({
          records: [
            {
              fields: {
                Title: input.title,
                Guidance: input.guidance,
                'Knowledge Status': 'Proposed',
                Scope: 'App Review',
                'Source Type': 'Airtable Record',
                'Source Record ID': input.sourceRecordId,
                'Source URL': input.sourceUrl,
                'Review Decision Impact': 'Temporary exception',
                'Applies To': ['App'],
              },
            },
          ],
        }),
      },
      query,
      input.baseId,
      input.apiKey,
    );
    const created = data.records[0];
    if (!created) {
      throw new AirtableClientError('AIRTABLE_EMPTY_CREATE', 'Guidance proposal returned no record.');
    }
    return { id: created.id };
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
