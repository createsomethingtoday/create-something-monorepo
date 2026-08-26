export const DEFAULT_AIRTABLE_BASE_ID = 'appMoIgXMTTTNIc3p';

export const TABLE_IDS = {
  assets: 'tblRwzpWoLgE9MrUm',
  assetVersions: 'tblHxZ2hgSFLZxsZu',
  assetReleases: 'tblhLAXcJiXrkZxUL',
  assetVotingState: 'tblsH0xbgwU0Befs5',
  reviewerVotes: 'tbl8RqpvYksAls2I6',
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
  adminDetailPagePath: '🏸Admin Detail Page Path (🏗️ only)',
  adminRecommendedType: '🏸Admin Recommended Type (🏗️ only)',
  categoryNames: 'ℹ️🪣Categories (Text)',
  categoryCmsSlugs: '🥞CMS Slug (from ℹ️🪣Categories)',
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

/**
 * Featured-batch curation fields on 👛Assets. Names verified against the live
 * base 2026-08-26; the candidate definition mirrors the ⭐Featured templates
 * review interface's "Remaining templates eligible" stat (verified live:
 * monthsBack=1 → 39 templates / 33 creators).
 *
 * Write safety: '⭐Reviewer Pick Reason (featured templates)' is quoted
 * VERBATIM in the creator's featured email and rendered publicly on the
 * marketplace listing. Agent-authored copy stages into the (AI draft) field;
 * promotion into the live field requires an explicit creator-safe
 * confirmation. 'ℹ️Is Featured?' arms the creator-notification worker for the
 * upcoming period — it is behind its own confirmation.
 */
export const FEATURED_ASSET_FIELDS = {
  isEligibleForUpcomingFeatured: 'Is eligible for upcoming featured templates?',
  isFeatured: 'ℹ️Is Featured? (🖥️, 🏗️only)',
  isFeaturedPeriod: '📅Is Featured Period',
  featuredNotifiedForPeriod: '🔔Featured Notified For Period',
  reviewerPick: 'Reviewer pick (featured templates)',
  reviewerPickReason: '⭐Reviewer Pick Reason (featured templates)',
  reviewerPickReasonAiDraft: '⭐Reviewer Pick Reason (AI draft)',
  creatorLink: '🎨Creator',
  creatorName: '🎨Creator Name',
  creatorTimesFeatured: 'How many times the creator has been featured',
  creatorTemplatesInUpcomingBatch: 'Templates featured in upcoming batch (from 🎨Creator)',
  votingStateLink: '🏗️Voting State',
} as const;

/** Field IDs matching FEATURED_ASSET_FIELDS, kept so display-name drift is detectable. Writes use these IDs. */
export const FEATURED_ASSET_FIELD_IDS = {
  isEligibleForUpcomingFeatured: 'fldvndrApFcmYPQds',
  isFeatured: 'fldtkCY5ZQxiEzJcv',
  isFeaturedPeriod: 'fldeDgWr09HIqDFcX',
  featuredNotifiedForPeriod: 'fld9qASBS2pcnXadA',
  reviewerPick: 'fldTgII7p9ZSSK5uW',
  reviewerPickReason: 'fld3w4yqQPzqah0LE',
  reviewerPickReasonAiDraft: 'fldfrWEBPP8DEU1n5',
  creatorLink: 'fldGDWo2VfnTbSUiL',
  creatorName: 'fldbkU8CKmDPtf83d',
  creatorTimesFeatured: 'fld2XFywmXYpSY1Le',
  creatorTemplatesInUpcomingBatch: 'fld4ZEgSBDzuLMvZf',
  votingStateLink: 'flderXfksiA19t4l4',
} as const;

/** 🏗️Asset Voting State — per-asset vote tallies for featured curation. */
export const FEATURED_VOTING_STATE_FIELDS = {
  name: 'Name',
  assetLink: 'Asset',
  votesLink: '🗳️Votes',
  upCount: '👍 count',
  downCount: '👎 count',
  netVotes: 'Net votes',
  inQualifiedPool: 'In qualified pool?',
} as const;

/**
 * 🗳️Reviewer Votes — one record per reviewer per asset. 'Note' is candid
 * internal rationale (explicitly encouraged for 👎/contested picks) and must
 * NEVER reach creators or public copy.
 */
export const FEATURED_VOTE_FIELDS = {
  votingStateLink: 'Asset Voting State',
  reviewer: 'Reviewer',
  vote: 'Vote',
  note: 'Note',
} as const;

export const FEATURED_VOTE_OPTIONS = {
  up: '👍 Up',
  down: '👎 Down',
  comment: '💬 Comment only',
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
  featured: {
    assets: FEATURED_ASSET_FIELDS,
    assetFieldIds: FEATURED_ASSET_FIELD_IDS,
    votingState: FEATURED_VOTING_STATE_FIELDS,
    votes: FEATURED_VOTE_FIELDS,
    voteOptions: FEATURED_VOTE_OPTIONS,
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
      'mark_all_publishing_items',
    ],
    // Per-item checklist edits are the only supported write path for
    // '📝Review Checklist' and '🚀Publishing Checklist'. Whole-field overwrite
    // was removed from versionReview: it destroyed structured reviewer state.
    checklistItems: [
      'checklist',
      'items',
      'expected_total',
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
      'release_record_id',
      'reject_reason',
      'rejection_feedback',
    ],
    featuredPick: [
      'reviewer_pick',
      'pick_reason_draft',
      'pick_reason',
      'confirm_creator_safe',
    ],
    featuredVote: [
      'vote',
      'note',
    ],
    featuredFlag: [
      'is_featured',
      'confirm_creator_notification',
    ],
  },
} as const;

export function isTemplateLikeAsset(fields: Record<string, unknown>): boolean {
  const raw = fields[CONFIRMED_ASSET_FIELDS.type];
  return typeof raw === 'string' && raw.includes('Template');
}
