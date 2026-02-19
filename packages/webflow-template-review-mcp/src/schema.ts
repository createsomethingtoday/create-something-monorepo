export const AIRTABLE_BASE_ID_DEFAULT = 'appMoIgXMTTTNIc3p';

export const TABLE_IDS = {
  assets: 'tblRwzpWoLgE9MrUm',
  versions: 'tblHxZ2hgSFLZxsZu',
} as const;

export type TableScope = keyof typeof TABLE_IDS;
export type AllowedTableId = (typeof TABLE_IDS)[TableScope];

export const TEMPLATE_TYPE_LABEL_FRAGMENT = 'Template';

export const ASSET_FIELDS = {
  name: 'fldUzJBor3Gnkykjc',
  typeText: 'fld7kubS6EE1LOC8d',
  marketplaceStatus: 'fld51CeQNGDgW9b0D',
  latestReviewStatus: 'fldZPFzH3q3KBAjNW',
  latestReviewer: 'fldjbCPUcsZo09Zei',
  latestReviewFeedback: 'fldzw69mpWOU1Z1Ex',
  latestActionableReviewStatus: 'fld2hBy1LidqmmAYT',
  daysInCurrentReviewStage: 'fldXmGN0yV8EshIWE',
  versions: 'fldyO7QBWObqpbpCO',
  creatorName: 'fldbkU8CKmDPtf83d',
  creatorNameOverride: 'fldwFlhVNMBURnbSk',
  websiteUrl: 'fld3OtovhDTyDO0uZ',
  previewSiteUrl: 'fldROrXCnuZyKNCxW',
  openWebsiteButton: 'fldUEi1m5XoQNhJjW',
  openAdminUrl: 'fldboRC76M9c2uXKM',
  categories: 'fldGYYJGX2cPCK3Oh',
  styles: 'fldMxiz76kWrAZPbN',
  tagsPrimary: 'fldOERCPutLT9ihWX',
  tagsMulti: 'fldhuNwvBBrydEN7k',
  typeCms: 'fldZY9vzOYaaCR5vv',
  typeEcommerce: 'fldExwOy43RSBAlDz',
  typeMultiLayout: 'fldaRUrpf5egtyaw8',
  multiLayoutGrouping: 'fldz8ZwHrv7rcrUgP',
  paymentTypes: 'fldOe6TV2zC1BDlR3',
  thumbnailImage: 'fld43LxLHMZb2yF7F',
  thumbnailAltText: 'fldKG132fWtKXhwsH',
  cmsSlug: 'fldXvOFvxtksUts0w',
  mrpIdRollup: 'fldFeWROxzwzCo84b',
  mrpIdOverride: 'fldNI0oPuODQcIZlo',
} as const;

export const VERSION_FIELDS = {
  name: 'fldKA9eJja5uajlok',
  reviewStatus: 'flde8Huk5NRIdm2wZ',
  reviewType: 'fldjYFJMGTerFYlol',
  reviewer: 'fldoZScwdH94PVVQE',
  reviewFeedback: 'fldHxIGHMHn4xb9U4',
  reviewChecklist: 'fldcMEsQc8wuPtobe',
  qualityRating: 'fldSbN2m18FDpJZ1h',
  improvementAreas: 'fldPHDkMp3MUqRSSe',
  publishingChecklist: 'fld8Rt0G1C5EoBtGO',
  releaseLinks: 'fld3CQjSWa9lVBLgT',
  releaseDate: 'fldB7sNWJvHoDyQhC',
  rejectionReason: 'fldC7Hfkd0TlLtbcy',
  rejectionFeedback: 'fldXIdcnOQXLVrsuN',
  reviewLength: 'fld3wQobtTqRWgCGq',
  submissionDatetime: 'fldWTKKh989L4lTTB',
  submissionDatetimeOverride: 'fldtAJZzh7oVHFmkF',
  versionNumber: 'fldn2ImbgwKfCdWWA',
  typeLookup: 'fldVHWX9vpbUCpRjd',
  assetLink: 'fldemWilqCQcOCh5s',
  assetAdminUrl: 'fldM2oTg89qQNzW8L',
  previewSiteUrlLookup: 'flddW7VtejMVQNZMy',
  websiteUrlLookup: 'flddiQM5SGFmyZvzo',
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
  qualityRating: [
    '🥇Exceptional',
    '✅Good',
    '⚠️Satisfactory',
    '❌Low quality',
  ],
  improvementAreas: [
    'Template: Overall user experience',
    'Template: Accessibility',
    'Template: Conversion best practices',
    'Template: Graphic design',
    'Template: Guidelines compliance',
    'Template: Hierarchy',
    'Template: Interaction design',
    'Template: Layout design quality',
    'Template: Responsive design',
    'Template: Site optimization',
    'Template: Technical requirements',
    'Template: Typography',
  ],
  paymentTypes: [
    'Free',
    'Paid',
    'Paid (3rd Party)',
  ],
  multiLayoutGrouping: [
    'No Multi',
    '3+ Layouts for 3+ Pages',
    '5+ Layouts for 5+ Pages',
  ],
  reviewLength: [
    '🐌Normal🐌',
    '⚡️Express⚡️',
  ],
} as const;

const ASSET_WRITABLE_FIELD_IDS = new Set<string>([
  ASSET_FIELDS.name,
  ASSET_FIELDS.marketplaceStatus,
  ASSET_FIELDS.websiteUrl,
  ASSET_FIELDS.previewSiteUrl,
  ASSET_FIELDS.categories,
  ASSET_FIELDS.styles,
  ASSET_FIELDS.tagsPrimary,
  ASSET_FIELDS.tagsMulti,
  ASSET_FIELDS.typeCms,
  ASSET_FIELDS.typeEcommerce,
  ASSET_FIELDS.typeMultiLayout,
  ASSET_FIELDS.multiLayoutGrouping,
  ASSET_FIELDS.paymentTypes,
  ASSET_FIELDS.thumbnailImage,
  ASSET_FIELDS.thumbnailAltText,
  ASSET_FIELDS.cmsSlug,
  ASSET_FIELDS.mrpIdOverride,
]);

const VERSION_WRITABLE_FIELD_IDS = new Set<string>([
  VERSION_FIELDS.reviewStatus,
  VERSION_FIELDS.reviewType,
  VERSION_FIELDS.reviewer,
  VERSION_FIELDS.qualityRating,
  VERSION_FIELDS.improvementAreas,
  VERSION_FIELDS.reviewFeedback,
  VERSION_FIELDS.reviewChecklist,
  VERSION_FIELDS.publishingChecklist,
  VERSION_FIELDS.releaseLinks,
  VERSION_FIELDS.rejectionReason,
  VERSION_FIELDS.rejectionFeedback,
  VERSION_FIELDS.reviewLength,
  VERSION_FIELDS.submissionDatetimeOverride,
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
    key: 'template_name',
    label: 'Template Name',
    table: 'assets',
    fieldId: ASSET_FIELDS.name,
    writable: true,
    dataType: 'singleLineText',
  },
  {
    key: 'review_owner',
    label: 'Review Owner',
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
    key: 'quality_rating',
    label: 'Quality Rating',
    table: 'versions',
    fieldId: VERSION_FIELDS.qualityRating,
    writable: true,
    dataType: 'singleSelect',
  },
  {
    key: 'improvement_areas',
    label: 'Improvement Areas',
    table: 'versions',
    fieldId: VERSION_FIELDS.improvementAreas,
    writable: true,
    dataType: 'multipleSelects',
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
    key: 'review_checklist',
    label: 'Review Checklist',
    table: 'versions',
    fieldId: VERSION_FIELDS.reviewChecklist,
    writable: true,
    dataType: 'richText',
  },
  {
    key: 'publishing_checklist',
    label: 'Publishing Checklist',
    table: 'versions',
    fieldId: VERSION_FIELDS.publishingChecklist,
    writable: true,
    dataType: 'richText',
  },
  {
    key: 'release_links',
    label: 'Release Date/Release records',
    table: 'versions',
    fieldId: VERSION_FIELDS.releaseLinks,
    writable: true,
    dataType: 'multipleRecordLinks',
    notes: 'Use release record IDs; computed release date is read-only.',
  },
  {
    key: 'release_date',
    label: 'Release Date',
    table: 'versions',
    fieldId: VERSION_FIELDS.releaseDate,
    writable: false,
    dataType: 'rollup',
  },
  {
    key: 'rejection_reason',
    label: 'Reject Reason',
    table: 'versions',
    fieldId: VERSION_FIELDS.rejectionReason,
    writable: true,
    dataType: 'singleSelect',
  },
  {
    key: 'rejection_feedback',
    label: 'Rejection Feedback',
    table: 'versions',
    fieldId: VERSION_FIELDS.rejectionFeedback,
    writable: true,
    dataType: 'richText',
  },
  {
    key: 'mrp_id_overwrite',
    label: 'MRP ID Overwrite',
    table: 'assets',
    fieldId: ASSET_FIELDS.mrpIdOverride,
    writable: true,
    dataType: 'singleLineText',
  },
  {
    key: 'template_categories',
    label: 'Template Categories',
    table: 'assets',
    fieldId: ASSET_FIELDS.categories,
    writable: true,
    dataType: 'multipleRecordLinks',
  },
  {
    key: 'styles',
    label: 'Styles',
    table: 'assets',
    fieldId: ASSET_FIELDS.styles,
    writable: true,
    dataType: 'multipleRecordLinks',
  },
  {
    key: 'tags_primary',
    label: 'Tags Primary',
    table: 'assets',
    fieldId: ASSET_FIELDS.tagsPrimary,
    writable: true,
    dataType: 'multipleRecordLinks',
  },
  {
    key: 'tags_multi',
    label: 'Tags Multi',
    table: 'assets',
    fieldId: ASSET_FIELDS.tagsMulti,
    writable: true,
    dataType: 'multipleRecordLinks',
  },
  {
    key: 'type_cms',
    label: 'Type of CMS',
    table: 'assets',
    fieldId: ASSET_FIELDS.typeCms,
    writable: true,
    dataType: 'checkbox',
  },
  {
    key: 'type_ecommerce',
    label: 'Type of E-commerce',
    table: 'assets',
    fieldId: ASSET_FIELDS.typeEcommerce,
    writable: true,
    dataType: 'checkbox',
  },
  {
    key: 'type_multi_layout',
    label: 'Type Multi-layout',
    table: 'assets',
    fieldId: ASSET_FIELDS.typeMultiLayout,
    writable: true,
    dataType: 'checkbox',
  },
  {
    key: 'multi_layout_grouping',
    label: 'Multi-layout Grouping',
    table: 'assets',
    fieldId: ASSET_FIELDS.multiLayoutGrouping,
    writable: true,
    dataType: 'singleSelect',
  },
  {
    key: 'payment_types',
    label: 'Payment Types',
    table: 'assets',
    fieldId: ASSET_FIELDS.paymentTypes,
    writable: true,
    dataType: 'multipleSelects',
  },
  {
    key: 'thumbnail_image',
    label: 'Thumbnail Image',
    table: 'assets',
    fieldId: ASSET_FIELDS.thumbnailImage,
    writable: true,
    dataType: 'multipleAttachments',
  },
  {
    key: 'thumbnail_alt_text',
    label: 'Thumbnail Alt Text',
    table: 'assets',
    fieldId: ASSET_FIELDS.thumbnailAltText,
    writable: true,
    dataType: 'multilineText',
  },
  {
    key: 'cms_slug',
    label: 'CMS Slug',
    table: 'assets',
    fieldId: ASSET_FIELDS.cmsSlug,
    writable: true,
    dataType: 'multilineText',
  },
  {
    key: 'latest_review_status',
    label: 'Latest Review Status',
    table: 'assets',
    fieldId: ASSET_FIELDS.latestReviewStatus,
    writable: false,
    dataType: 'lookup',
  },
  {
    key: 'days_in_current_review_stage',
    label: 'Days in Current Review Stage',
    table: 'assets',
    fieldId: ASSET_FIELDS.daysInCurrentReviewStage,
    writable: false,
    dataType: 'rollup',
  },
  {
    key: 'open_website_url_button',
    label: 'Open Website URL (button)',
    table: 'assets',
    fieldId: ASSET_FIELDS.openWebsiteButton,
    writable: false,
    dataType: 'button',
  },
  {
    key: 'open_admin_button',
    label: 'Open Admin (button/url)',
    table: 'assets',
    fieldId: ASSET_FIELDS.openAdminUrl,
    writable: false,
    dataType: 'formula',
  },
] as const;

export const COMPUTED_FIELD_KEYS = new Set<string>([
  'latest_review_status',
  'days_in_current_review_stage',
  'release_date',
  'open_website_url_button',
  'open_admin_button',
]);

export const FIELD_ALIASES: Record<string, string> = {
  review_owner: 'review_owner',
  reviewer: 'review_owner',
  reject_reason: 'rejection_reason',
  website_url: 'website_url',
  preview_asset_url: 'preview_site_url',
  template_categories: 'template_categories',
};

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

function pickFirstString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string');
    if (typeof first === 'string') return first;
  }
  return '';
}

export function isTemplateScopedAssetFields(fields: Record<string, unknown>): boolean {
  const typeText = pickFirstString(fields[ASSET_FIELDS.typeText]);
  if (typeText.toLowerCase().includes(TEMPLATE_TYPE_LABEL_FRAGMENT.toLowerCase())) {
    return true;
  }

  const templateIndicators = [
    fields[ASSET_FIELDS.typeCms],
    fields[ASSET_FIELDS.typeEcommerce],
    fields[ASSET_FIELDS.typeMultiLayout],
    fields[ASSET_FIELDS.multiLayoutGrouping],
    fields[ASSET_FIELDS.categories],
  ];

  return templateIndicators.some((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });
}

export function assertEnumValue<T extends readonly string[]>(
  value: string,
  allowed: T,
  enumName: string,
): asserts value is T[number] {
  if (!allowed.includes(value)) {
    throw new Error(`${enumName} must be one of: ${allowed.join(', ')}`);
  }
}

export function assertMultiEnumValues<T extends readonly string[]>(
  values: string[],
  allowed: T,
  enumName: string,
): asserts values is Array<T[number]> {
  const invalid = values.filter((value) => !allowed.includes(value));
  if (invalid.length > 0) {
    throw new Error(`${enumName} contains invalid values: ${invalid.join(', ')}`);
  }
}

export function getStatusOptions() {
  return {
    marketplace_status: [...STATUS_ENUMS.marketplaceStatus],
    review_status: [...STATUS_ENUMS.reviewStatus],
    review_type: [...STATUS_ENUMS.reviewType],
    rejection_reason: [...STATUS_ENUMS.rejectionReason],
    quality_rating: [...STATUS_ENUMS.qualityRating],
    improvement_areas: [...STATUS_ENUMS.improvementAreas],
    payment_types: [...STATUS_ENUMS.paymentTypes],
    multi_layout_grouping: [...STATUS_ENUMS.multiLayoutGrouping],
    review_length: [...STATUS_ENUMS.reviewLength],
  };
}
