export const DEFAULT_AIRTABLE_BASE_ID = 'appMoIgXMTTTNIc3p';

export const TABLE_IDS = {
  assets: 'tblRwzpWoLgE9MrUm',
  assetVersions: 'tblHxZ2hgSFLZxsZu',
  governanceFindings: 'App Review Governance Findings',
} as const;

export const DEFAULT_GOVERNANCE_FINDINGS_TABLE_ID = TABLE_IDS.governanceFindings;

export const FIELD_IDS = {
  assets: {
    name: 'fldUzJBor3Gnkykjc',
    marketplaceStatus: 'fld51CeQNGDgW9b0D',
    latestReviewStatus: 'fldZPFzH3q3KBAjNW',
    daysInCurrentReviewStage: 'fldXmGN0yV8EshIWE',
    latestReviewer: 'fldjbCPUcsZo09Zei',
    latestReviewFeedback: 'fldzw69mpWOU1Z1Ex',
    openReviewStatus: 'fldFXxvUZi8Sja5xc',
    capabilities: 'fldxkZNofdI0i1A9a',
    clientId: 'fldtwvVVlTeDRlTYV',
    appId: 'fldxFrPOO2xtLk93e',
    visibility: 'fldCM1pKBKvgAylh2',
    relationshipOwner: 'fld1jZw7if0r3D7xX',
    featuresText: 'fldLMnR8pz6OFSXCg',
    notes: 'fldBVKHOno8aJlnox',
    credentials: 'fldNtdflbOhjx46A0',
    descriptionShort: 'fldgUDxVqRkSqVWn9',
    descriptionLongHtml: 'fldiDg3clkRAaPWU9',
    installUrlDirect: 'fld0WE5PKhWksXpjt',
    installUrlFormula: 'fldb4zMhpa6QqJhe3',
    workspaceDashboardUrl: 'flddMs5x4ttqo4gwl',
    categories: 'fldGYYJGX2cPCK3Oh',
    iconImage: 'fld43LxLHMZb2yF7F',
    iconImageAltText: 'fldKG132fWtKXhwsH',
    carouselImages: 'fldneaPyoRXBAVtS1',
    carouselImagesAltText: 'fldJ2HQ8HgScYomuE',
    paymentTypes: 'fldOe6TV2zC1BDlR3',
    demoVideoUrl: 'fldrlBXRrBW9c1hGW',
    privacyPolicyUrl: 'fldSw4lJp05JLz3nJ',
    termsAndConditionsUrl: 'fldEmM7EFEPoMqHOa',
    websiteUrl: 'fld3OtovhDTyDO0uZ',
    supportEmailOrUrl: 'fldRq4MBDoxMhpiwH',
    previewSiteUrl: 'fldROrXCnuZyKNCxW',
    promoVideoUrl: 'fldXlxAN7Afc8vUYS',
  },
  versions: {
    reviewStatus: 'flde8Huk5NRIdm2wZ',
    reviewType: 'fldjYFJMGTerFYlol',
    versionNumber: 'fldn2ImbgwKfCdWWA',
    assetLink: 'fldemWilqCQcOCh5s',
    assetRecordIdRollup: 'fldknoYakli2sqznT',
    rejectionReason: 'fldC7Hfkd0TlLtbcy',
    reviewer: 'fldoZScwdH94PVVQE',
    reviewFeedback: 'fldHxIGHMHn4xb9U4',
    submissionDatetime: 'fldWTKKh989L4lTTB',
    submissionDatetimeOverride: 'fldtAJZzh7oVHFmkF',
    daysInCurrentStage: 'fldbVdznI0sOQrEnX',
  },
} as const;

export const MARKETPLACE_STATUS_OPTIONS = [
  '1️⃣Upcoming🆕',
  '2️⃣Scheduled📅',
  '3️⃣Published🚀',
  '4️⃣Delisted☠️',
  '5️⃣Rejected❌',
] as const;

export const VISIBILITY_OPTIONS = [
  'Public',
  'Private: Beta',
  'Private: Not Published',
  'Private: Ongoing',
] as const;

export const CAPABILITIES_OPTIONS = [
  'Data Client v1',
  'Data Client v2',
  'Designer Extension',
  'Hybrid',
] as const;

export const REVIEW_STATUS_OPTIONS = [
  '🆕Ready for Review',
  '🏃🏾In Review',
  'Training Check',
  '👀Admin Feedback Review',
  '👀Managed Feedback Review',
  '📤Changes Requested',
  '📤Changes Requested (No Notification)',
  '🔁Response to Review',
  '👀Admin Approval Review',
  '✅Approved',
  '✅Approved (No Notification)',
  '⏸️On Hold',
  '👀Admin Rejection Review',
  '❌Rejected',
  '❌Rejected (No Notification)',
  '🚨Error: Reason Missing',
  '🚨Error: Release Missing',
  '🚨Error: Feedback Missing',
  '🚨Error: Review Not Started',
  '🚨Error: Field Missing (Email, Type, etc.)',
  '🚨Error: Publishing Checklist Incomplete',
  '☠️Archived',
  '☠️Archived (Auto)',
] as const;

export const REVIEW_TYPE_OPTIONS = [
  'New Asset',
  'Asset Update',
  'Meta Update',
  'Delist',
  'Silent/Ghost/Sub',
] as const;

export const REJECTION_REASON_OPTIONS = [
  'Abandoned',
  'Access/Credentials/Paywall',
  'App issue',
  'Bad ClientID',
  'Bundling issue',
  'Guideline Infringement',
  'Invalid Submission',
  'Duplicate submission',
  'Spam',
  'UI/UX Concerns',
  'Unsubmitted',
  'Other',
] as const;

export const GOVERNANCE_FINDING_CATEGORY_OPTIONS = [
  'Runtime Integrity & Custom Code Governance',
  'Private App & Beta-Testing Governance',
  'Review Transparency & Inspectability',
  'Forms API & Credential-Field Exposure',
  'Documentation Overhaul & Tracking Hub',
  'Tooling: App Review MCP & Security Scanning',
  'Ecosystem & Competitive Watch',
  'Parking Lot',
] as const;

export const GOVERNANCE_FINDING_STATUS_OPTIONS = [
  'New',
  'Triage',
  'In Progress',
  'Needs Decision',
  'Waiting on Owner',
  'Done',
  'Parking Lot',
] as const;

export const GOVERNANCE_FINDING_PRIORITY_OPTIONS = ['P0', 'P1', 'P2', 'P3'] as const;

export const GOVERNANCE_FINDING_FIELD_NAMES = {
  title: 'Title',
  status: 'Status',
  priority: 'Priority',
  category: 'Category',
  summary: 'Summary',
  evidence: 'Evidence',
  recommendation: 'Recommendation',
  decisionNeeded: 'Decision Needed',
  nextAction: 'Next Action',
  owner: 'Owner',
  appName: 'App Name',
  appId: 'App ID',
  asset: 'Asset ID',
  assetVersion: 'Asset Version ID',
  sourceUrl: 'Source URL',
  linkedUrls: 'Linked URLs',
  reporter: 'Reporter',
  createdByAgent: 'Created By Agent',
} as const;

export const GOVERNANCE_FINDING_WRITABLE_FIELDS = {
  title: GOVERNANCE_FINDING_FIELD_NAMES.title,
  status: GOVERNANCE_FINDING_FIELD_NAMES.status,
  priority: GOVERNANCE_FINDING_FIELD_NAMES.priority,
  category: GOVERNANCE_FINDING_FIELD_NAMES.category,
  summary: GOVERNANCE_FINDING_FIELD_NAMES.summary,
  evidence: GOVERNANCE_FINDING_FIELD_NAMES.evidence,
  recommendation: GOVERNANCE_FINDING_FIELD_NAMES.recommendation,
  decision_needed: GOVERNANCE_FINDING_FIELD_NAMES.decisionNeeded,
  next_action: GOVERNANCE_FINDING_FIELD_NAMES.nextAction,
  owner: GOVERNANCE_FINDING_FIELD_NAMES.owner,
  app_name: GOVERNANCE_FINDING_FIELD_NAMES.appName,
  app_id: GOVERNANCE_FINDING_FIELD_NAMES.appId,
  asset_id: GOVERNANCE_FINDING_FIELD_NAMES.asset,
  version_id: GOVERNANCE_FINDING_FIELD_NAMES.assetVersion,
  source_url: GOVERNANCE_FINDING_FIELD_NAMES.sourceUrl,
  linked_urls: GOVERNANCE_FINDING_FIELD_NAMES.linkedUrls,
  reporter: GOVERNANCE_FINDING_FIELD_NAMES.reporter,
  created_by_agent: GOVERNANCE_FINDING_FIELD_NAMES.createdByAgent,
} as const;

export type MarketplaceStatus = (typeof MARKETPLACE_STATUS_OPTIONS)[number];
export type VisibilityStatus = (typeof VISIBILITY_OPTIONS)[number];
export type Capability = (typeof CAPABILITIES_OPTIONS)[number];
export type ReviewStatus = (typeof REVIEW_STATUS_OPTIONS)[number];
export type ReviewType = (typeof REVIEW_TYPE_OPTIONS)[number];
export type RejectionReason = (typeof REJECTION_REASON_OPTIONS)[number];
export type GovernanceFindingCategory = (typeof GOVERNANCE_FINDING_CATEGORY_OPTIONS)[number];
export type GovernanceFindingStatus = (typeof GOVERNANCE_FINDING_STATUS_OPTIONS)[number];
export type GovernanceFindingPriority = (typeof GOVERNANCE_FINDING_PRIORITY_OPTIONS)[number];

export type AssetWritableKey =
  | 'app_name'
  | 'app_capabilities'
  | 'client_id'
  | 'visibility_status'
  | 'relationships_status'
  | 'features_text'
  | 'notes'
  | 'credentials'
  | 'description_short'
  | 'description_long_html'
  | 'install_url'
  | 'categories_record_ids'
  | 'icon_image_url'
  | 'icon_image_alt_text'
  | 'carousel_image_urls'
  | 'carousel_image_alt_text'
  | 'payment_times'
  | 'demo_video_url'
  | 'privacy_policy_url'
  | 'terms_and_conditions_url'
  | 'website_url'
  | 'support_email_or_url'
  | 'preview_site_url'
  | 'promo_video_url'
  | 'marketplace_status';

export const WRITABLE_ASSET_FIELDS: Record<AssetWritableKey, string> = {
  app_name: FIELD_IDS.assets.name,
  app_capabilities: FIELD_IDS.assets.capabilities,
  client_id: FIELD_IDS.assets.clientId,
  visibility_status: FIELD_IDS.assets.visibility,
  relationships_status: FIELD_IDS.assets.relationshipOwner,
  features_text: FIELD_IDS.assets.featuresText,
  notes: FIELD_IDS.assets.notes,
  credentials: FIELD_IDS.assets.credentials,
  description_short: FIELD_IDS.assets.descriptionShort,
  description_long_html: FIELD_IDS.assets.descriptionLongHtml,
  install_url: FIELD_IDS.assets.installUrlDirect,
  categories_record_ids: FIELD_IDS.assets.categories,
  icon_image_url: FIELD_IDS.assets.iconImage,
  icon_image_alt_text: FIELD_IDS.assets.iconImageAltText,
  carousel_image_urls: FIELD_IDS.assets.carouselImages,
  carousel_image_alt_text: FIELD_IDS.assets.carouselImagesAltText,
  payment_times: FIELD_IDS.assets.paymentTypes,
  demo_video_url: FIELD_IDS.assets.demoVideoUrl,
  privacy_policy_url: FIELD_IDS.assets.privacyPolicyUrl,
  terms_and_conditions_url: FIELD_IDS.assets.termsAndConditionsUrl,
  website_url: FIELD_IDS.assets.websiteUrl,
  support_email_or_url: FIELD_IDS.assets.supportEmailOrUrl,
  preview_site_url: FIELD_IDS.assets.previewSiteUrl,
  promo_video_url: FIELD_IDS.assets.promoVideoUrl,
  marketplace_status: FIELD_IDS.assets.marketplaceStatus,
};

export type AssetReadOnlyWriteKey =
  | 'latest_review_status'
  | 'days_in_current_review_stage'
  | 'workspace_dashboard_url'
  | 'app_id';

export const READ_ONLY_ASSET_WRITE_KEYS: readonly AssetReadOnlyWriteKey[] = [
  'latest_review_status',
  'days_in_current_review_stage',
  'workspace_dashboard_url',
  'app_id',
] as const;

const READ_ONLY_HINTS: Record<AssetReadOnlyWriteKey, { reason: string; routeTo?: string }> = {
  latest_review_status: {
    reason: 'Derived from Asset Versions review states.',
    routeTo: 'Use app_review_update_version_review.review_status (auto-routed to latest version when possible).',
  },
  days_in_current_review_stage: {
    reason: 'Computed rollup/formula field.',
  },
  workspace_dashboard_url: {
    reason: 'Computed formula field.',
  },
  app_id: {
    reason: 'Lookup/derived field from linked resources.',
  },
};

export function getReadOnlyAssetWriteHint(key: AssetReadOnlyWriteKey) {
  return READ_ONLY_HINTS[key];
}

export function isReadOnlyAssetWriteKey(key: string): key is AssetReadOnlyWriteKey {
  return (READ_ONLY_ASSET_WRITE_KEYS as readonly string[]).includes(key);
}

export function isWritableAssetWriteKey(key: string): key is AssetWritableKey {
  return Object.prototype.hasOwnProperty.call(WRITABLE_ASSET_FIELDS, key);
}

export function isMarketplaceStatus(value: string): value is MarketplaceStatus {
  return (MARKETPLACE_STATUS_OPTIONS as readonly string[]).includes(value);
}

export function isVisibilityStatus(value: string): value is VisibilityStatus {
  return (VISIBILITY_OPTIONS as readonly string[]).includes(value);
}

export function isCapability(value: string): value is Capability {
  return (CAPABILITIES_OPTIONS as readonly string[]).includes(value);
}

export function isReviewStatus(value: string): value is ReviewStatus {
  return (REVIEW_STATUS_OPTIONS as readonly string[]).includes(value);
}

export function isReviewType(value: string): value is ReviewType {
  return (REVIEW_TYPE_OPTIONS as readonly string[]).includes(value);
}

export function isRejectionReason(value: string): value is RejectionReason {
  return (REJECTION_REASON_OPTIONS as readonly string[]).includes(value);
}

export function isGovernanceFindingCategory(value: string): value is GovernanceFindingCategory {
  return (GOVERNANCE_FINDING_CATEGORY_OPTIONS as readonly string[]).includes(value);
}

export function isGovernanceFindingStatus(value: string): value is GovernanceFindingStatus {
  return (GOVERNANCE_FINDING_STATUS_OPTIONS as readonly string[]).includes(value);
}

export function isGovernanceFindingPriority(value: string): value is GovernanceFindingPriority {
  return (GOVERNANCE_FINDING_PRIORITY_OPTIONS as readonly string[]).includes(value);
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function isAppLikeAsset(fields: Record<string, unknown>): boolean {
  return (
    hasValue(fields[FIELD_IDS.assets.capabilities]) ||
    hasValue(fields[FIELD_IDS.assets.clientId]) ||
    hasValue(fields[FIELD_IDS.assets.appId]) ||
    hasValue(fields[FIELD_IDS.assets.visibility])
  );
}

export function validateAssetMetadataWriteKeys(keys: string[]): {
  invalidKeys: string[];
  readOnlyKeys: AssetReadOnlyWriteKey[];
  writableKeys: AssetWritableKey[];
} {
  const invalidKeys: string[] = [];
  const readOnlyKeys: AssetReadOnlyWriteKey[] = [];
  const writableKeys: AssetWritableKey[] = [];

  for (const key of keys) {
    if (isWritableAssetWriteKey(key)) {
      writableKeys.push(key);
      continue;
    }
    if (isReadOnlyAssetWriteKey(key)) {
      readOnlyKeys.push(key);
      continue;
    }
    invalidKeys.push(key);
  }

  return { invalidKeys, readOnlyKeys, writableKeys };
}

export const CANONICAL_FIELD_MAPPINGS = {
  icon_image: {
    sourceLabel: 'Icon image',
    routedTo: 'icon_image_url',
    fieldId: FIELD_IDS.assets.iconImage,
    writable: true,
  },
  payment_times: {
    sourceLabel: 'Payment times',
    routedTo: 'payment_times',
    fieldId: FIELD_IDS.assets.paymentTypes,
    writable: true,
  },
  relationships_status: {
    sourceLabel: 'relationships status',
    routedTo: 'relationships_status',
    fieldId: FIELD_IDS.assets.relationshipOwner,
    writable: true,
  },
} as const;

export const APP_REVIEW_FIELD_MAP = {
  tables: TABLE_IDS,
  assets: {
    writable: WRITABLE_ASSET_FIELDS,
    readOnly: {
      latest_review_status: FIELD_IDS.assets.latestReviewStatus,
      days_in_current_review_stage: FIELD_IDS.assets.daysInCurrentReviewStage,
      workspace_dashboard_url: FIELD_IDS.assets.workspaceDashboardUrl,
      app_id: FIELD_IDS.assets.appId,
      install_url_formula: FIELD_IDS.assets.installUrlFormula,
    },
  },
  versions: {
    writable: {
      review_status: FIELD_IDS.versions.reviewStatus,
      review_type: FIELD_IDS.versions.reviewType,
      reviewer: FIELD_IDS.versions.reviewer,
      rejection_reason: FIELD_IDS.versions.rejectionReason,
      review_feedback: FIELD_IDS.versions.reviewFeedback,
      submission_datetime_override: FIELD_IDS.versions.submissionDatetimeOverride,
    },
    readOnly: {
      submission_datetime: FIELD_IDS.versions.submissionDatetime,
      days_in_current_stage: FIELD_IDS.versions.daysInCurrentStage,
      version_number: FIELD_IDS.versions.versionNumber,
    },
  },
  governanceFindings: {
    writable: GOVERNANCE_FINDING_WRITABLE_FIELDS,
    fieldNames: GOVERNANCE_FINDING_FIELD_NAMES,
  },
  canonicalMappings: CANONICAL_FIELD_MAPPINGS,
  statusOptions: {
    marketplace: MARKETPLACE_STATUS_OPTIONS,
    visibility: VISIBILITY_OPTIONS,
    capabilities: CAPABILITIES_OPTIONS,
    reviewStatus: REVIEW_STATUS_OPTIONS,
    reviewType: REVIEW_TYPE_OPTIONS,
    rejectionReason: REJECTION_REASON_OPTIONS,
    governanceFindingCategory: GOVERNANCE_FINDING_CATEGORY_OPTIONS,
    governanceFindingStatus: GOVERNANCE_FINDING_STATUS_OPTIONS,
    governanceFindingPriority: GOVERNANCE_FINDING_PRIORITY_OPTIONS,
  },
} as const;
