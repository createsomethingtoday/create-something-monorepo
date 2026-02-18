export const AIRTABLE_BASE_ID_DEFAULT = 'appMoIgXMTTTNIc3p';

export const TABLE_IDS = {
  assets: 'tblRwzpWoLgE9MrUm',
  versions: 'tblHxZ2hgSFLZxsZu',
} as const;

export type TableScope = keyof typeof TABLE_IDS;
export type AllowedTableId = (typeof TABLE_IDS)[TableScope];

export const ASSET_FIELDS = {
  name: 'fldUzJBor3Gnkykjc',
  marketplaceStatus: 'fld51CeQNGDgW9b0D',
  latestReviewStatus: 'fldZPFzH3q3KBAjNW',
  latestReviewer: 'fldjbCPUcsZo09Zei',
  latestReviewFeedback: 'fldzw69mpWOU1Z1Ex',
  daysInCurrentReviewStage: 'fldXmGN0yV8EshIWE',
  versions: 'fldyO7QBWObqpbpCO',
  capabilities: 'fldxkZNofdI0i1A9a',
  clientId: 'fldtwvVVlTeDRlTYV',
  appId: 'fldxFrPOO2xtLk93e',
  visibility: 'fldCM1pKBKvgAylh2',
  relationshipOwner: 'fld1jZw7if0r3D7xX',
  featuresText: 'fldLMnR8pz6OFSXCg',
  notes: 'fldBVKHOno8aJlnox',
  credentials: 'fldNtdflbOhjx46A0',
  descriptionShort: 'fldgUDxVqRkSqVWn9',
  descriptionLong: 'fldiDg3clkRAaPWU9',
  installUrl: 'fld0WE5PKhWksXpjt',
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
} as const;

export const VERSION_FIELDS = {
  name: 'fldKA9eJja5uajlok',
  reviewStatus: 'flde8Huk5NRIdm2wZ',
  reviewType: 'fldjYFJMGTerFYlol',
  reviewer: 'fldoZScwdH94PVVQE',
  reviewFeedback: 'fldHxIGHMHn4xb9U4',
  rejectionReason: 'fldC7Hfkd0TlLtbcy',
  submissionDatetime: 'fldWTKKh989L4lTTB',
  submissionDatetimeOverride: 'fldtAJZzh7oVHFmkF',
  versionNumber: 'fldn2ImbgwKfCdWWA',
  reviewLength: 'fld3wQobtTqRWgCGq',
  assetLink: 'fldemWilqCQcOCh5s',
  daysInCurrentStage: 'fldbVdznI0sOQrEnX',
} as const;

export const STATUS_ENUMS = {
  marketplaceStatus: [
    '1️⃣Upcoming🆕',
    '2️⃣Scheduled📅',
    '3️⃣Published🚀',
    '4️⃣Delisted☠️',
    '5️⃣Rejected❌',
  ],
  reviewStatus: [
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
  ],
  reviewType: [
    'New Asset',
    'Asset Update',
    'Meta Update',
    'Delist',
    'Silent/Ghost/Sub',
  ],
  rejectionReason: [
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
  ],
  visibility: [
    'Public',
    'Private: Beta',
    'Private: Not Published',
    'Private: Ongoing',
  ],
  capabilities: [
    'Data Client v1',
    'Data Client v2',
    'Designer Extension',
    'Hybrid',
  ],
  reviewLength: [
    '🐌Normal🐌',
    '⚡️Express⚡️',
  ],
} as const;

const ASSET_WRITABLE_FIELD_IDS = new Set<string>([
  ASSET_FIELDS.name,
  ASSET_FIELDS.marketplaceStatus,
  ASSET_FIELDS.capabilities,
  ASSET_FIELDS.clientId,
  ASSET_FIELDS.visibility,
  ASSET_FIELDS.relationshipOwner,
  ASSET_FIELDS.featuresText,
  ASSET_FIELDS.notes,
  ASSET_FIELDS.credentials,
  ASSET_FIELDS.descriptionShort,
  ASSET_FIELDS.descriptionLong,
  ASSET_FIELDS.installUrl,
  ASSET_FIELDS.categories,
  ASSET_FIELDS.iconImage,
  ASSET_FIELDS.iconImageAltText,
  ASSET_FIELDS.carouselImages,
  ASSET_FIELDS.carouselImagesAltText,
  ASSET_FIELDS.paymentTypes,
  ASSET_FIELDS.demoVideoUrl,
  ASSET_FIELDS.privacyPolicyUrl,
  ASSET_FIELDS.termsAndConditionsUrl,
  ASSET_FIELDS.websiteUrl,
  ASSET_FIELDS.supportEmailOrUrl,
  ASSET_FIELDS.previewSiteUrl,
  ASSET_FIELDS.promoVideoUrl,
]);

const VERSION_WRITABLE_FIELD_IDS = new Set<string>([
  VERSION_FIELDS.reviewStatus,
  VERSION_FIELDS.reviewType,
  VERSION_FIELDS.reviewer,
  VERSION_FIELDS.reviewFeedback,
  VERSION_FIELDS.rejectionReason,
  VERSION_FIELDS.submissionDatetimeOverride,
  VERSION_FIELDS.reviewLength,
]);

export const WRITABLE_FIELD_IDS: Record<TableScope, ReadonlySet<string>> = {
  assets: ASSET_WRITABLE_FIELD_IDS,
  versions: VERSION_WRITABLE_FIELD_IDS,
};

export type CanonicalField = {
  key: string;
  label: string;
  table: TableScope;
  fieldId: string;
  writable: boolean;
  dataType: string;
  notes?: string;
};

export const CANONICAL_FIELD_MAP: CanonicalField[] = [
  {
    key: 'marketplace_status',
    label: 'Marketplace status',
    table: 'assets',
    fieldId: ASSET_FIELDS.marketplaceStatus,
    writable: true,
    dataType: 'singleSelect',
  },
  {
    key: 'latest_review_status',
    label: 'Latest review status',
    table: 'assets',
    fieldId: ASSET_FIELDS.latestReviewStatus,
    writable: false,
    dataType: 'lookup',
    notes: 'Read-only. Source values live on Asset Versions review status.',
  },
  {
    key: 'days_in_current_review_stage',
    label: 'Days in current review stage',
    table: 'assets',
    fieldId: ASSET_FIELDS.daysInCurrentReviewStage,
    writable: false,
    dataType: 'rollup',
  },
  {
    key: 'version_number',
    label: 'Version #',
    table: 'versions',
    fieldId: VERSION_FIELDS.versionNumber,
    writable: false,
    dataType: 'number',
  },
  {
    key: 'review_type',
    label: 'Review Type',
    table: 'versions',
    fieldId: VERSION_FIELDS.reviewType,
    writable: true,
    dataType: 'singleSelect',
  },
  {
    key: 'reviewer',
    label: 'Reviewer',
    table: 'versions',
    fieldId: VERSION_FIELDS.reviewer,
    writable: true,
    dataType: 'singleCollaborator',
  },
  {
    key: 'review_status',
    label: 'Review Status',
    table: 'versions',
    fieldId: VERSION_FIELDS.reviewStatus,
    writable: true,
    dataType: 'singleSelect',
  },
  {
    key: 'submission_datetime',
    label: 'Submission Datetime',
    table: 'versions',
    fieldId: VERSION_FIELDS.submissionDatetime,
    writable: false,
    dataType: 'formula',
    notes: 'Read-only derived field. Use submission_datetime_override to influence value.',
  },
  {
    key: 'submission_datetime_override',
    label: 'Submission Datetime Override',
    table: 'versions',
    fieldId: VERSION_FIELDS.submissionDatetimeOverride,
    writable: true,
    dataType: 'dateTime',
  },
  {
    key: 'rejection_reason',
    label: 'Rejection Reason',
    table: 'versions',
    fieldId: VERSION_FIELDS.rejectionReason,
    writable: true,
    dataType: 'singleSelect',
  },
  {
    key: 'review_feedback',
    label: 'Review Feedback',
    table: 'versions',
    fieldId: VERSION_FIELDS.reviewFeedback,
    writable: true,
    dataType: 'richText',
  },
  {
    key: 'app_capabilities',
    label: 'App capabilities',
    table: 'assets',
    fieldId: ASSET_FIELDS.capabilities,
    writable: true,
    dataType: 'singleSelect',
  },
  {
    key: 'client_id',
    label: 'Client ID',
    table: 'assets',
    fieldId: ASSET_FIELDS.clientId,
    writable: true,
    dataType: 'singleLineText',
  },
  {
    key: 'app_id',
    label: 'App ID',
    table: 'assets',
    fieldId: ASSET_FIELDS.appId,
    writable: false,
    dataType: 'lookup',
  },
  {
    key: 'visibility_status',
    label: 'Visibility status',
    table: 'assets',
    fieldId: ASSET_FIELDS.visibility,
    writable: true,
    dataType: 'singleSelect',
  },
  {
    key: 'relationships_status',
    label: 'relationships status',
    table: 'assets',
    fieldId: ASSET_FIELDS.relationshipOwner,
    writable: true,
    dataType: 'singleCollaborator',
    notes: 'Canonical mapping: relationships status -> Relationship Owner',
  },
  {
    key: 'features_text',
    label: 'Features Text',
    table: 'assets',
    fieldId: ASSET_FIELDS.featuresText,
    writable: true,
    dataType: 'richText',
  },
  {
    key: 'app_name',
    label: 'App name',
    table: 'assets',
    fieldId: ASSET_FIELDS.name,
    writable: true,
    dataType: 'singleLineText',
  },
  {
    key: 'notes',
    label: 'Notes',
    table: 'assets',
    fieldId: ASSET_FIELDS.notes,
    writable: true,
    dataType: 'multilineText',
  },
  {
    key: 'credentials',
    label: 'Credentials',
    table: 'assets',
    fieldId: ASSET_FIELDS.credentials,
    writable: true,
    dataType: 'multilineText',
  },
  {
    key: 'description_short',
    label: 'Description (short)',
    table: 'assets',
    fieldId: ASSET_FIELDS.descriptionShort,
    writable: true,
    dataType: 'multilineText',
  },
  {
    key: 'description_long',
    label: 'Description (long)',
    table: 'assets',
    fieldId: ASSET_FIELDS.descriptionLong,
    writable: true,
    dataType: 'richText',
  },
  {
    key: 'install_url',
    label: 'Install URL',
    table: 'assets',
    fieldId: ASSET_FIELDS.installUrl,
    writable: true,
    dataType: 'url',
  },
  {
    key: 'workspace_dashboard_url',
    label: 'Workspace Dashboard URL',
    table: 'assets',
    fieldId: ASSET_FIELDS.workspaceDashboardUrl,
    writable: false,
    dataType: 'formula',
  },
  {
    key: 'categories',
    label: 'categories',
    table: 'assets',
    fieldId: ASSET_FIELDS.categories,
    writable: true,
    dataType: 'multipleRecordLinks',
  },
  {
    key: 'icon_image',
    label: 'Icon image',
    table: 'assets',
    fieldId: ASSET_FIELDS.iconImage,
    writable: true,
    dataType: 'multipleAttachments',
    notes: 'Canonical mapping: Icon image -> Thumbnail Image',
  },
  {
    key: 'icon_image_alt_text',
    label: 'Icon Image alt text',
    table: 'assets',
    fieldId: ASSET_FIELDS.iconImageAltText,
    writable: true,
    dataType: 'multilineText',
  },
  {
    key: 'carousel_image',
    label: 'Carousel image',
    table: 'assets',
    fieldId: ASSET_FIELDS.carouselImages,
    writable: true,
    dataType: 'multipleAttachments',
  },
  {
    key: 'carousel_image_alt_text',
    label: 'Carousel Image alt text',
    table: 'assets',
    fieldId: ASSET_FIELDS.carouselImagesAltText,
    writable: true,
    dataType: 'multilineText',
  },
  {
    key: 'payment_times',
    label: 'Payment times',
    table: 'assets',
    fieldId: ASSET_FIELDS.paymentTypes,
    writable: true,
    dataType: 'multipleSelects',
    notes: 'Canonical mapping: Payment times -> Payment Types',
  },
  {
    key: 'demo_video_url',
    label: 'Demo video URL',
    table: 'assets',
    fieldId: ASSET_FIELDS.demoVideoUrl,
    writable: true,
    dataType: 'url',
  },
  {
    key: 'privacy_policy_url',
    label: 'Privacy Policy URL',
    table: 'assets',
    fieldId: ASSET_FIELDS.privacyPolicyUrl,
    writable: true,
    dataType: 'url',
  },
  {
    key: 'terms_conditions_url',
    label: 'Terms & Conditions URL',
    table: 'assets',
    fieldId: ASSET_FIELDS.termsAndConditionsUrl,
    writable: true,
    dataType: 'url',
  },
  {
    key: 'website_url',
    label: 'Website URL',
    table: 'assets',
    fieldId: ASSET_FIELDS.websiteUrl,
    writable: true,
    dataType: 'url',
  },
  {
    key: 'support_email_url',
    label: 'Support Email/URL',
    table: 'assets',
    fieldId: ASSET_FIELDS.supportEmailOrUrl,
    writable: true,
    dataType: 'url',
  },
  {
    key: 'preview_site_url',
    label: 'Preview Site URL',
    table: 'assets',
    fieldId: ASSET_FIELDS.previewSiteUrl,
    writable: true,
    dataType: 'url',
  },
  {
    key: 'promo_video_url',
    label: 'Promo Video URL',
    table: 'assets',
    fieldId: ASSET_FIELDS.promoVideoUrl,
    writable: true,
    dataType: 'url',
  },
] as const;

export const FIELD_ALIASES: Record<string, string> = {
  relationships_status: 'relationships_status',
  relationship_status: 'relationships_status',
  relationship_owner: 'relationships_status',
  icon_image: 'icon_image',
  thumbnail_image: 'icon_image',
  payment_times: 'payment_times',
  payment_types: 'payment_times',
};

export const COMPUTED_FIELD_KEYS = new Set<string>([
  'latest_review_status',
  'days_in_current_review_stage',
  'workspace_dashboard_url',
  'app_id',
  'submission_datetime',
]);

export function assertAllowedTableId(tableId: string): asserts tableId is AllowedTableId {
  if (!Object.values(TABLE_IDS).includes(tableId as AllowedTableId)) {
    throw new Error(`Table ${tableId} is not allowed for this MCP.`);
  }
}

export function getWritableFieldIds(scope: TableScope): ReadonlySet<string> {
  return WRITABLE_FIELD_IDS[scope];
}

export function isWritableField(scope: TableScope, fieldId: string): boolean {
  return WRITABLE_FIELD_IDS[scope].has(fieldId);
}

function getLookupString(fields: Record<string, unknown>, fieldId: string): string {
  const value = fields[fieldId];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string');
    if (typeof first === 'string') return first;
  }
  return '';
}

export function isAppScopedAssetFields(fields: Record<string, unknown>): boolean {
  const capabilities = getLookupString(fields, ASSET_FIELDS.capabilities);
  const clientId = getLookupString(fields, ASSET_FIELDS.clientId);
  const appId = getLookupString(fields, ASSET_FIELDS.appId);
  const visibility = getLookupString(fields, ASSET_FIELDS.visibility);

  return [capabilities, clientId, appId, visibility].some((value) => value.trim().length > 0);
}

export function assertEnumValue<T extends readonly string[]>(
  value: string,
  allowed: T,
  enumName: string,
): asserts value is T[number] {
  if (!allowed.includes(value)) {
    throw new Error(
      `${enumName} must be one of: ${allowed.join(', ')}`,
    );
  }
}

export function getStatusOptions() {
  return {
    marketplace_status: [...STATUS_ENUMS.marketplaceStatus],
    review_status: [...STATUS_ENUMS.reviewStatus],
    review_type: [...STATUS_ENUMS.reviewType],
    rejection_reason: [...STATUS_ENUMS.rejectionReason],
    visibility_status: [...STATUS_ENUMS.visibility],
    app_capabilities: [...STATUS_ENUMS.capabilities],
    review_length: [...STATUS_ENUMS.reviewLength],
  };
}
