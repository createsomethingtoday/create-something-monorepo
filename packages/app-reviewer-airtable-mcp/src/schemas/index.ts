import { z } from 'zod';

export const SERVER_NAME = 'app-reviewer-airtable-mcp';
export const SERVER_VERSION = '0.2.0';

export const DEFAULT_AIRTABLE_BASE_ID = 'appMoIgXMTTTNIc3p';

export const TABLE_IDS = {
  assets: 'tblRwzpWoLgE9MrUm',
  assetVersions: 'tblHxZ2hgSFLZxsZu',
} as const;

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

export const ASSET_FIELD_PRESETS = {
  summary: [
    FIELD_IDS.assets.name,
    FIELD_IDS.assets.marketplaceStatus,
    FIELD_IDS.assets.latestReviewStatus,
    FIELD_IDS.assets.daysInCurrentReviewStage,
    FIELD_IDS.assets.latestReviewer,
    FIELD_IDS.assets.openReviewStatus,
    FIELD_IDS.assets.capabilities,
    FIELD_IDS.assets.clientId,
    FIELD_IDS.assets.appId,
    FIELD_IDS.assets.visibility,
  ],
  review: [
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
    FIELD_IDS.assets.relationshipOwner,
    FIELD_IDS.assets.featuresText,
    FIELD_IDS.assets.notes,
    FIELD_IDS.assets.descriptionShort,
    FIELD_IDS.assets.descriptionLongHtml,
    FIELD_IDS.assets.installUrlDirect,
    FIELD_IDS.assets.installUrlFormula,
    FIELD_IDS.assets.workspaceDashboardUrl,
    FIELD_IDS.assets.websiteUrl,
    FIELD_IDS.assets.supportEmailOrUrl,
    FIELD_IDS.assets.previewSiteUrl,
  ],
  media: [
    FIELD_IDS.assets.name,
    FIELD_IDS.assets.iconImage,
    FIELD_IDS.assets.iconImageAltText,
    FIELD_IDS.assets.carouselImages,
    FIELD_IDS.assets.carouselImagesAltText,
    FIELD_IDS.assets.demoVideoUrl,
    FIELD_IDS.assets.promoVideoUrl,
  ],
  links: [
    FIELD_IDS.assets.name,
    FIELD_IDS.assets.installUrlDirect,
    FIELD_IDS.assets.installUrlFormula,
    FIELD_IDS.assets.workspaceDashboardUrl,
    FIELD_IDS.assets.websiteUrl,
    FIELD_IDS.assets.supportEmailOrUrl,
    FIELD_IDS.assets.previewSiteUrl,
    FIELD_IDS.assets.privacyPolicyUrl,
    FIELD_IDS.assets.termsAndConditionsUrl,
  ],
  sensitive: [
    FIELD_IDS.assets.name,
    FIELD_IDS.assets.credentials,
    FIELD_IDS.assets.notes,
    FIELD_IDS.assets.installUrlDirect,
    FIELD_IDS.assets.workspaceDashboardUrl,
  ],
} as const;

export const VERSION_FIELD_PRESETS = {
  summary: [
    FIELD_IDS.versions.versionNumber,
    FIELD_IDS.versions.reviewType,
    FIELD_IDS.versions.reviewStatus,
    FIELD_IDS.versions.reviewer,
    FIELD_IDS.versions.submissionDatetime,
    FIELD_IDS.versions.daysInCurrentStage,
    FIELD_IDS.versions.assetRecordIdRollup,
  ],
  review: [
    FIELD_IDS.versions.versionNumber,
    FIELD_IDS.versions.reviewType,
    FIELD_IDS.versions.reviewStatus,
    FIELD_IDS.versions.reviewer,
    FIELD_IDS.versions.submissionDatetime,
    FIELD_IDS.versions.submissionDatetimeOverride,
    FIELD_IDS.versions.rejectionReason,
    FIELD_IDS.versions.reviewFeedback,
    FIELD_IDS.versions.daysInCurrentStage,
    FIELD_IDS.versions.assetLink,
    FIELD_IDS.versions.assetRecordIdRollup,
  ],
} as const;

export const ASSET_FIELD_LABELS: Record<string, string> = {
  [FIELD_IDS.assets.name]: 'appName',
  [FIELD_IDS.assets.marketplaceStatus]: 'marketplaceStatus',
  [FIELD_IDS.assets.latestReviewStatus]: 'latestReviewStatus',
  [FIELD_IDS.assets.daysInCurrentReviewStage]: 'daysInCurrentReviewStage',
  [FIELD_IDS.assets.latestReviewer]: 'latestReviewer',
  [FIELD_IDS.assets.latestReviewFeedback]: 'latestReviewFeedback',
  [FIELD_IDS.assets.openReviewStatus]: 'openReviewStatus',
  [FIELD_IDS.assets.capabilities]: 'capabilities',
  [FIELD_IDS.assets.clientId]: 'clientId',
  [FIELD_IDS.assets.appId]: 'appId',
  [FIELD_IDS.assets.visibility]: 'visibility',
  [FIELD_IDS.assets.relationshipOwner]: 'relationshipOwner',
  [FIELD_IDS.assets.featuresText]: 'featuresText',
  [FIELD_IDS.assets.notes]: 'notes',
  [FIELD_IDS.assets.credentials]: 'credentials',
  [FIELD_IDS.assets.descriptionShort]: 'descriptionShort',
  [FIELD_IDS.assets.descriptionLongHtml]: 'descriptionLongHtml',
  [FIELD_IDS.assets.installUrlDirect]: 'installUrl',
  [FIELD_IDS.assets.installUrlFormula]: 'installUrlFormula',
  [FIELD_IDS.assets.workspaceDashboardUrl]: 'workspaceDashboardUrl',
  [FIELD_IDS.assets.categories]: 'categories',
  [FIELD_IDS.assets.iconImage]: 'iconImage',
  [FIELD_IDS.assets.iconImageAltText]: 'iconImageAltText',
  [FIELD_IDS.assets.carouselImages]: 'carouselImages',
  [FIELD_IDS.assets.carouselImagesAltText]: 'carouselImagesAltText',
  [FIELD_IDS.assets.paymentTypes]: 'paymentTypes',
  [FIELD_IDS.assets.demoVideoUrl]: 'demoVideoUrl',
  [FIELD_IDS.assets.privacyPolicyUrl]: 'privacyPolicyUrl',
  [FIELD_IDS.assets.termsAndConditionsUrl]: 'termsAndConditionsUrl',
  [FIELD_IDS.assets.websiteUrl]: 'websiteUrl',
  [FIELD_IDS.assets.supportEmailOrUrl]: 'supportEmailOrUrl',
  [FIELD_IDS.assets.previewSiteUrl]: 'previewSiteUrl',
  [FIELD_IDS.assets.promoVideoUrl]: 'promoVideoUrl',
};

export const VERSION_FIELD_LABELS: Record<string, string> = {
  [FIELD_IDS.versions.versionNumber]: 'versionNumber',
  [FIELD_IDS.versions.reviewType]: 'reviewType',
  [FIELD_IDS.versions.reviewStatus]: 'reviewStatus',
  [FIELD_IDS.versions.reviewer]: 'reviewer',
  [FIELD_IDS.versions.submissionDatetime]: 'submissionDatetime',
  [FIELD_IDS.versions.submissionDatetimeOverride]: 'submissionDatetimeOverride',
  [FIELD_IDS.versions.rejectionReason]: 'rejectionReason',
  [FIELD_IDS.versions.reviewFeedback]: 'reviewFeedback',
  [FIELD_IDS.versions.daysInCurrentStage]: 'daysInCurrentStage',
  [FIELD_IDS.versions.assetLink]: 'assetLink',
  [FIELD_IDS.versions.assetRecordIdRollup]: 'assetRecordId',
};

export const MARKETPLACE_STATUS_OPTIONS = [
  '1️⃣Upcoming🆕',
  '2️⃣Scheduled📅',
  '3️⃣Published🚀',
  '4️⃣Delisted☠️',
  '5️⃣Rejected❌',
] as const;

export const VISIBILITY_OPTIONS = ['Public', 'Private: Beta', 'Private: Not Published', 'Private: Ongoing'] as const;

export const CAPABILITIES_OPTIONS = ['Data Client v1', 'Data Client v2', 'Designer Extension', 'Hybrid'] as const;

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

export const REVIEW_TYPE_OPTIONS = ['New Asset', 'Asset Update', 'Meta Update', 'Delist', 'Silent/Ghost/Sub'] as const;

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
  | 'app_id'
  | 'install_url_formula';

export const READ_ONLY_ASSET_WRITE_KEYS: readonly AssetReadOnlyWriteKey[] = [
  'latest_review_status',
  'days_in_current_review_stage',
  'workspace_dashboard_url',
  'app_id',
  'install_url_formula',
] as const;

const READ_ONLY_ASSET_WRITE_HINTS: Record<AssetReadOnlyWriteKey, { reason: string; routeTo?: string }> = {
  latest_review_status: {
    reason: 'Derived from Asset Versions review states.',
    routeTo: 'Use app_reviewer_update_asset_version_fields.review_status on the relevant Asset Version record.',
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
  install_url_formula: {
    reason: 'Computed formula field; write install_url instead.',
    routeTo: 'Use app_reviewer_update_asset_fields.install_url.',
  },
};

export type VersionWritableKey =
  | 'review_type'
  | 'reviewer'
  | 'review_status'
  | 'rejection_reason'
  | 'review_feedback'
  | 'submission_datetime_override';

export const WRITABLE_VERSION_FIELDS: Record<VersionWritableKey, string> = {
  review_type: FIELD_IDS.versions.reviewType,
  reviewer: FIELD_IDS.versions.reviewer,
  review_status: FIELD_IDS.versions.reviewStatus,
  rejection_reason: FIELD_IDS.versions.rejectionReason,
  review_feedback: FIELD_IDS.versions.reviewFeedback,
  submission_datetime_override: FIELD_IDS.versions.submissionDatetimeOverride,
};

export type VersionReadOnlyWriteKey =
  | 'version_number'
  | 'submission_datetime'
  | 'days_in_current_stage'
  | 'asset_id'
  | 'asset_link';

export const READ_ONLY_VERSION_WRITE_KEYS: readonly VersionReadOnlyWriteKey[] = [
  'version_number',
  'submission_datetime',
  'days_in_current_stage',
  'asset_id',
  'asset_link',
] as const;

const READ_ONLY_VERSION_WRITE_HINTS: Record<VersionReadOnlyWriteKey, { reason: string; routeTo?: string }> = {
  version_number: {
    reason: 'Reference field controlled by submission/version creation.',
  },
  submission_datetime: {
    reason: 'Canonical submission timestamp. Use override only when a reviewer needs to correct display timing.',
    routeTo: 'Use app_reviewer_update_asset_version_fields.submission_datetime_override.',
  },
  days_in_current_stage: {
    reason: 'Computed stage-age field.',
  },
  asset_id: {
    reason: 'Linked/rollup relationship to the Assets table.',
  },
  asset_link: {
    reason: 'Linked relationship to the Assets table.',
  },
};

export function getReadOnlyAssetWriteHint(key: AssetReadOnlyWriteKey) {
  return READ_ONLY_ASSET_WRITE_HINTS[key];
}

export function getReadOnlyVersionWriteHint(key: VersionReadOnlyWriteKey) {
  return READ_ONLY_VERSION_WRITE_HINTS[key];
}

export function isWritableAssetWriteKey(key: string): key is AssetWritableKey {
  return Object.prototype.hasOwnProperty.call(WRITABLE_ASSET_FIELDS, key);
}

export function isReadOnlyAssetWriteKey(key: string): key is AssetReadOnlyWriteKey {
  return (READ_ONLY_ASSET_WRITE_KEYS as readonly string[]).includes(key);
}

export function isWritableVersionWriteKey(key: string): key is VersionWritableKey {
  return Object.prototype.hasOwnProperty.call(WRITABLE_VERSION_FIELDS, key);
}

export function isReadOnlyVersionWriteKey(key: string): key is VersionReadOnlyWriteKey {
  return (READ_ONLY_VERSION_WRITE_KEYS as readonly string[]).includes(key);
}

export type AssetFieldPreset = keyof typeof ASSET_FIELD_PRESETS | 'all';
export type VersionFieldPreset = keyof typeof VERSION_FIELD_PRESETS | 'all';

export const assetFieldPresetSchema = z.enum(['summary', 'review', 'media', 'links', 'sensitive', 'all']);
export const versionFieldPresetSchema = z.enum(['summary', 'review', 'all']);

export const assetSortSchema = z.enum([
  'app_name_asc',
  'app_name_desc',
  'latest_review_status_asc',
  'days_in_review_desc',
  'days_in_review_asc',
]);

export const versionSortSchema = z.enum([
  'version_number_desc',
  'version_number_asc',
  'submission_datetime_desc',
  'submission_datetime_asc',
]);

export function allAssetFieldIds(): string[] {
  return Object.values(FIELD_IDS.assets);
}

export function allVersionFieldIds(): string[] {
  return Object.values(FIELD_IDS.versions);
}

export function fieldMapResource() {
  return {
    baseId: DEFAULT_AIRTABLE_BASE_ID,
    tables: TABLE_IDS,
    assets: {
      fields: FIELD_IDS.assets,
      presets: ASSET_FIELD_PRESETS,
      labels: ASSET_FIELD_LABELS,
      writable: WRITABLE_ASSET_FIELDS,
      readOnlyWriteKeys: Object.fromEntries(READ_ONLY_ASSET_WRITE_KEYS.map((key) => [key, getReadOnlyAssetWriteHint(key)])),
      sensitiveFields: [FIELD_IDS.assets.credentials],
    },
    assetVersions: {
      fields: FIELD_IDS.versions,
      presets: VERSION_FIELD_PRESETS,
      labels: VERSION_FIELD_LABELS,
      writable: WRITABLE_VERSION_FIELDS,
      readOnlyWriteKeys: Object.fromEntries(
        READ_ONLY_VERSION_WRITE_KEYS.map((key) => [key, getReadOnlyVersionWriteHint(key)]),
      ),
    },
    statusOptions: {
      marketplace: MARKETPLACE_STATUS_OPTIONS,
      visibility: VISIBILITY_OPTIONS,
      capabilities: CAPABILITIES_OPTIONS,
      reviewStatus: REVIEW_STATUS_OPTIONS,
      reviewType: REVIEW_TYPE_OPTIONS,
      rejectionReason: REJECTION_REASON_OPTIONS,
    },
  };
}
