export const DEFAULT_AIRTABLE_BASE_ID = 'appMoIgXMTTTNIc3p';

export const TABLE_IDS = {
  assets: 'tblRwzpWoLgE9MrUm',
  assetVersions: 'tblHxZ2hgSFLZxsZu',
  assetReleases: 'tblhLAXcJiXrkZxUL',
  features: 'tblvzTXMhOhiFkapL',
} as const;

export const CONFIRMED_RELEASE_FIELDS = {
  releaseName: 'Release Name',
  releaseOwner: 'Release Owner',
  status: 'Status',
} as const;

export const CONFIRMED_ASSET_FIELDS = {
  type: '⚙️🆎Type (Text)',
  name: 'Name',
  uid: 'ℹ️UID',
  descriptionShort: 'ℹ️Description (Short)',
  descriptionLongHtml: 'ℹ️Description (Long).html',
  features: 'ℹ️✨Features',
  featuresHighlighted: 'ℹ️✨Features Highlighted',
  adminDetailPagePath: '🏸Admin Detail Page Path (🏗️ only)',
  adminRecommendedType: '🏸Admin Recommended Type (🏗️ only)',
  categoryGroupDisplayName: '🪣Category Group(s) Display Name',
  categoryGroupCmsSlug: '🪣Category Group(s) CMS Slug',
  websiteUrl: '🔗Website URL',
  previewSiteUrl: '🔗Preview Site URL',
  marketplaceStatus: '🚀Marketplace Status',
  latestReviewStatus: '📝Latest Review Status',
  latestReviewDate: '🚀📅Latest Version Review Status LMT',
  latestReviewFeedback: '🖌️📝Latest Review Feedback',
  rejectionFeedback: '🚩Rejection Feedback',
  qualityScore: '🖌️Initial Quality Score',
  thumbnailImage: '🖼️Thumbnail Image',
  thumbnailImageSecondary: '🖼️Thumbnail Image (Secondary)',
  carouselImages: '🖼️Carousel Images',
  submittedDate: '📅Submitted Date',
  publishedDate: '🚀📅Published Date',
  decisionDate: '🚀📅Decision Date',
  templatePriceFilter: '🥞💲Template Price Filter (🏗️ only)',
  priceString: '🥞💲Template Price String (🏗️ only)',
  mrpId: 'ℹ️MRP ID',
  mrpIdOverride: '👀ℹ️MRP ID (Override)',
} as const;

export const ASSET_COMPATIBILITY_ALIASES = {
  description: 'ℹ️Description (Long).html',
  rejectionFeedbackHtml: '🚩Rejection Feedback',
} as const;

export const CONFIRMED_FEATURE_FIELDS = {
  name: 'Name',
  cmsSlug: '🥞CMS Slug',
  cmsStatus: '🥞CMS Status',
} as const;

export const METRICS_ASSET_FIELD_IDS = {
  type: 'fld7kubS6EE1LOC8d',
  marketplaceStatus: 'fld51CeQNGDgW9b0D',
  latestReviewStatus: 'fldZPFzH3q3KBAjNW',
  latestReviewDate: 'fldBLCaNjRwnox0lT',
  qualityScore: 'fldue77Ea5R8D5Nc4',
  submittedDate: 'fldeE2tArgyRpGuqs',
  publishedDate: 'fld4anS2bYjmdbKEG',
  decisionDate: 'fldcmd1g1TwHXkHla',
} as const;

export const CONFIRMED_VERSION_FIELDS = {
  assetLink: '👛Asset',
  assetRecordId: '⚙️👛Asset Record ID',
  versionNumber: 'ℹ️Version #',
  submissionDatetime: '📅Submission Datetime',
  createdBy: 'Created by',
  reviewOwner: '📝Reviewer',
  reviewStatus: '📝Review Status',
  qualityRating: '✨ Quality Rating',
  improvementAreas: '✨Improvement Areas',
  reviewFeedback: '📝Review Feedback',
  agentReviewFeedback: '📝Agent Review Feedback',
  reviewChecklist: '📝Review Checklist',
  publishingChecklist: '🚀Publishing Checklist',
  release: '🚀Release',
  releaseDate: '🚀Release Date',
  decisionDate: '📅Decision Made Datetime',
  rejectReason: '🚩Rejection Reason',
  rejectionFeedback: '🚩Rejection Feedback',
  mrpIdOverwrite: '❗ℹ️MRP ID',
} as const;

export const CONFIRMED_WRITE_FIELD_IDS = {
  assets: {
    mrpIdOverride: 'fldNI0oPuODQcIZlo',
  },
  versions: {
    reviewStatus: 'flde8Huk5NRIdm2wZ',
    reviewFeedback: 'fldHxIGHMHn4xb9U4',
    agentReviewFeedback: 'fld6OITvSQPxfXJ0Z',
    release: 'fld3CQjSWa9lVBLgT',
  },
} as const;

export const PENDING_VERSION_FIELDS = {
  createdAt: 'pending_verification',
} as const;

export const PENDING_ASSET_FIELDS = {
  thread: 'pending_verification',
  reviewQueueEntry: 'pending_verification',
  templateCategories: 'pending_verification',
  stylesTags: 'pending_verification',
  listingInfo: 'pending_verification',
  typeOfCms: 'pending_verification',
  typeOfEcommerce: 'pending_verification',
  typeMultiLayout: 'pending_verification',
  multiLayoutGrouping: 'pending_verification',
  paymentTypes: 'pending_verification',
  cmsSlug: 'pending_verification',
  adminCategoryStyles: 'pending_verification',
  adminThumbnailImage: 'pending_verification',
} as const;

export const REVIEW_STATUS_OPTIONS = [
  '🆕Ready for Review',
  '🏃🏾In Review',
  '👀Admin Feedback Review',
  '📤Changes Requested',
  '🔁Response to Review',
  '✅Approved',
  '❌Rejected',
  '☠️Archived',
] as const;

export const QUALITY_RATING_OPTIONS = [
  '❌Low quality',
  '⚠️Satisfactory',
  '✅Good',
  '🥇Exceptional',
] as const;

export const IMPROVEMENT_AREA_OPTIONS = [
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
] as const;

export const HOTSPOT_GROUPS = {
  blue: [
    'thread',
    'review_queue_entry',
    'open_website_url',
    'preview_asset',
    'review_owner',
    'review_status',
    'quality_rating',
    'improvement_areas',
    'review_feedback',
    'review_checklist',
    'approve_version',
    'open_admin',
    'publishing_checklist',
    'release_record_id',
    'mrp_id_overwrite',
    'thumbnail_download',
  ],
  orange: [
    'template_categories',
    'styles_tags',
    'listing_info',
    'template_name',
    'website_url',
    'preview_site_url',
    'type_of_cms',
    'type_of_ecommerce',
    'type_multi_layout',
    'multi_layout_grouping',
    'payment_types',
    'thumbnail_image_upload',
    'cms_slug',
    'admin_category_styles',
    'admin_thumbnail_image',
    'filter_by_creator_name',
    'request_changes',
  ],
  red: [
    'reject_version',
    'reject_reason',
    'rejection_feedback',
  ],
} as const;

export const TEMPLATE_REVIEW_FIELD_MAP = {
  baseId: DEFAULT_AIRTABLE_BASE_ID,
  tables: TABLE_IDS,
  scope: 'templates-only',
  confirmed: {
    assets: CONFIRMED_ASSET_FIELDS,
    versions: CONFIRMED_VERSION_FIELDS,
    releases: CONFIRMED_RELEASE_FIELDS,
    features: CONFIRMED_FEATURE_FIELDS,
  },
  confirmedWriteFieldIds: CONFIRMED_WRITE_FIELD_IDS,
  pending: {
    assets: PENDING_ASSET_FIELDS,
    versions: PENDING_VERSION_FIELDS,
  },
  compatibilityAliases: {
    assets: ASSET_COMPATIBILITY_ALIASES,
  },
  metricsFieldIds: {
    assets: METRICS_ASSET_FIELD_IDS,
  },
  hotspotGroups: HOTSPOT_GROUPS,
  statusOptions: {
    reviewStatus: REVIEW_STATUS_OPTIONS,
    qualityRating: QUALITY_RATING_OPTIONS,
    improvementAreas: IMPROVEMENT_AREA_OPTIONS,
  },
  writeSupport: {
    assetMetadata: [
      'template_name',
      'description',
      'description_short',
      'description_long_html',
      'website_url',
      'preview_site_url',
      'thumbnail_image_url',
      'thumbnail_image_secondary_urls',
      'carousel_image_urls',
    ],
    assetPublishing: [
      'mrp_id_overwrite',
    ],
    publishingCompletion: [
      'release_record_id',
      'release_date_local',
      'time_zone',
      'approve_version',
      'mrp_id_overwrite',
    ],
    reviewerAssignment: [
      'review_owner',
    ],
    versionReview: [
      'review_owner',
      'review_status',
      'quality_rating',
      'improvement_areas',
      'review_feedback',
      'review_checklist',
      'publishing_checklist',
      'release_record_id',
      'reject_reason',
      'rejection_feedback',
    ],
  },
} as const;

export function isTemplateLikeAsset(fields: Record<string, unknown>): boolean {
  const raw = fields[CONFIRMED_ASSET_FIELDS.type];
  return typeof raw === 'string' && raw.includes('Template');
}
