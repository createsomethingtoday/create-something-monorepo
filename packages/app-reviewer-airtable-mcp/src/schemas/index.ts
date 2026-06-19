import { z } from 'zod';

export const SERVER_NAME = 'app-reviewer-airtable-mcp';
export const SERVER_VERSION = '0.1.0';

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
      sensitiveFields: [FIELD_IDS.assets.credentials],
    },
    assetVersions: {
      fields: FIELD_IDS.versions,
      presets: VERSION_FIELD_PRESETS,
      labels: VERSION_FIELD_LABELS,
    },
  };
}
