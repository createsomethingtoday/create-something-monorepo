export const DEFAULT_AIRTABLE_BASE_ID = 'appMoIgXMTTTNIc3p';

export const TABLE_IDS = {
  assets: 'tblRwzpWoLgE9MrUm',
  assetVersions: 'tblHxZ2hgSFLZxsZu',
} as const;

export const CONFIRMED_ASSET_FIELDS = {
  type: '⚙️🆎Type (Text)',
  name: 'Name',
  description: '📝Description',
  descriptionShort: 'ℹ️Description (Short)',
  descriptionLongHtml: 'ℹ️Description (Long).html',
  websiteUrl: '🔗Website URL',
  previewSiteUrl: '🔗Preview Site URL',
  marketplaceStatus: '🚀Marketplace Status',
  latestReviewStatus: '📝Latest Review Status',
  latestReviewDate: '📝Latest Review Date',
  latestReviewFeedback: '🖌️📝Latest Review Feedback',
  rejectionFeedback: '🚩Rejection Feedback',
  rejectionFeedbackHtml: '🚩Rejection Feedback.html',
  qualityScore: '🖌️Initial Quality Score',
  thumbnailImage: '🖼️Thumbnail Image',
  thumbnailImageSecondary: '🖼️Thumbnail Image (Secondary)',
  carouselImages: '🖼️Carousel Images',
  submittedDate: '📅Submitted Date',
  publishedDate: '📅Published Date',
  decisionDate: '🚀📅Decision Date',
  priceString: '🥞💲Template Price String (🏗️ only)',
  mrpId: 'ℹ️MRP ID',
  mrpIdOverride: 'fldNI0oPuODQcIZlo',
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
  reviewChecklist: '📝Review Checklist',
  publishingChecklist: '🚀Publishing Checklist',
  release: 'fld3CQjSWa9lVBLgT',
  releaseDate: '🚀Release Date',
  decisionDate: '📅Decision Made Datetime',
  rejectReason: '🚩Rejection Reason',
  rejectionFeedback: '🚩Rejection Feedback',
  mrpIdOverwrite: '👀ℹ️MRP ID (Override)',
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
    'release_date',
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
  },
  pending: {
    assets: PENDING_ASSET_FIELDS,
    versions: PENDING_VERSION_FIELDS,
  },
  hotspotGroups: HOTSPOT_GROUPS,
  statusOptions: {
    reviewStatus: REVIEW_STATUS_OPTIONS,
    qualityRating: QUALITY_RATING_OPTIONS,
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
