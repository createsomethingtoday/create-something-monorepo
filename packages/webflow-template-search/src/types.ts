export type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';
export type TemplateSort = 'popular' | 'newest' | 'price_asc' | 'price_desc';
export type TemplateSearchView = 'full' | 'grid';
export type AliasType = 'child_category';

export interface Env {
  DB: D1Database;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_ASSETS_TABLE_ID?: string;
  AIRTABLE_SEARCH_VISIBILITY_FIELDS?: string;
  AIRTABLE_CHILD_CATEGORIES_TABLE_ID?: string;
  AIRTABLE_STYLES_TABLE_ID?: string;
  AIRTABLE_TAGS_TABLE_ID?: string;
  WEBFLOW_API_TOKEN?: string;
  CMS_READ_ONLY?: string;
  WEBFLOW_TEMPLATE_ASSET_SITE_ID?: string;
  WEBFLOW_TEMPLATE_ASSET_FOLDER_ID?: string;
  WEBFLOW_TEMPLATE_COLLECTION_ID?: string;
  WEBFLOW_TEMPLATE_ENABLE_CMS_INDEX?: string;
  ALLOWED_ORIGINS?: string;
  DEFAULT_PAGE_SIZE?: string;
  DEFAULT_CLIENT_MODE?: string;
  ENVIRONMENT?: string;
  SYNC_ADMIN_TOKEN?: string;
  WEBFLOW_WEBHOOK_SECRET?: string;
}

export interface AirtableAttachment {
  id?: string;
  url: string;
  filename?: string;
}

export interface AirtableRecord<TFields extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  createdTime?: string;
  fields: TFields;
}

export interface AirtableListResponse<TFields extends Record<string, unknown> = Record<string, unknown>> {
  records: Array<AirtableRecord<TFields>>;
  offset?: string;
}

export interface AirtableAssetFields extends Record<string, unknown> {
  'Name'?: string;
  '⚙️🆎Type (Text)'?: string;
  '🚀Marketplace Status'?: string;
  'ℹ️Description (Short)'?: string;
  'ℹ️Description (Long).html'?: string;
  '🪣Category Group(s) Display Name'?: string[] | string;
  '🪣Category Group(s) CMS Slug'?: string[] | string;
  'ℹ️🪣Categories'?: string[] | string;
  'ℹ️🪣Categories (Text)'?: string[] | string;
  '🥞CMS Slug (from ℹ️🪣Categories)'?: string[] | string;
  'ℹ️👘Styles'?: string[];
  'ℹ️🏷️Tags (Multi)'?: string[];
  '🥞Template Type (🏗️ only)'?: string;
  'Is free?'?: number | boolean;
  '🥞Is Currently Featured? (🏗️ only)'?: number | boolean;
  'ℹ️Is Featured? (🖥️, 🏗️only)'?: number | boolean;
  '🖌️Popularity Score'?: number;
  '📋 Unique Viewers'?: number;
  '📋 Cumulative Purchases'?: number;
  '🥞💲Template Price Filter (🏗️ only)'?: number;
  '👁️Search Visibility (🏗️ only)'?: string;
  'Search Visibility'?: string;
  search_visibility?: string;
  '👀📅Decision Date (Override)'?: string;
  '🚀📅Published Date'?: string;
  '🥞CMS Slug'?: string;
  '🥞CMS Slug (formula)'?: string;
  '🎨Creator'?: string[];
  '🎨Creator Name'?: string;
  '🖼️Thumbnail Image'?: AirtableAttachment[];
  '🖼️Thumbnail Image (Secondary)'?: AirtableAttachment[];
  '🖼️Carousel Images'?: AirtableAttachment[];
  '🔗Preview Site URL'?: string;
  '🔗Listing URL'?: string;
  '🔗Website URL'?: string;
  '📅LMT'?: string;
}

export interface LookupValue {
  id: string;
  name: string;
  slug: string;
}

export interface ChildCategoryLookupValue extends LookupValue {
  categoryGroupName: string | null;
  categoryGroupSlug: string | null;
}

export interface CreatorLookupValue {
  id: string;
  name: string;
  slug: string;
  profileUrl: string;
  avatarUrl: string | null;
  avatarAlt: string | null;
}

export interface LookupMaps {
  childCategories: Map<string, ChildCategoryLookupValue>;
  styles: Map<string, LookupValue>;
  tags: Map<string, LookupValue>;
  creators: Map<string, CreatorLookupValue>;
}

export interface CategoryMembershipInput {
  childCategoryName: string;
  childCategorySlug: string;
  categoryGroupName: string;
  categoryGroupSlug: string;
}

export interface TemplateDocumentInput {
  id: string;
  templateSlug: string;
  name: string;
  listingUrl: string | null;
  previewUrl: string | null;
  websiteUrl: string | null;
  creatorName: string | null;
  creatorRecordId: string | null;
  creatorSlug: string | null;
  creatorProfileUrl: string | null;
  creatorAvatarUrl: string | null;
  creatorAvatarAlt: string | null;
  thumbnailImageUrl: string | null;
  thumbnailImageSecondaryUrl: string | null;
  carouselImageUrls: string[];
  descriptionShort: string;
  descriptionLongHtml: string;
  descriptionLongText: string;
  categoryGroups: string[];
  categoryGroupSlugs: string[];
  childCategories: string[];
  childCategorySlugs: string[];
  categoryMemberships: CategoryMembershipInput[];
  styles: string[];
  styleSlugs: string[];
  tags: string[];
  tagSlugs: string[];
  templateType: string | null;
  isFree: boolean;
  isFeatured: boolean;
  isLandingPage: boolean;
  popularityScore: number | null;
  uniqueViewers: number | null;
  cumulativePurchases: number | null;
  price: number | null;
  publishedDate: string | null;
  marketplaceStatus: string | null;
  sourceLastModifiedTime: string | null;
  syncedAt: string;
}

export interface SearchParams {
  q: string | null;
  scope: TemplateScope;
  categoryGroupSlug: string | null;
  childCategorySlug: string | null;
  creatorSlug: string | null;
  creatorRecordId: string | null;
  styleSlug: string | null;
  tagSlug: string | null;
  styles: string[];
  tags: string[];
  types: string[];
  freeOnly: boolean;
  sort: TemplateSort;
  view: TemplateSearchView;
  page: number;
  pageSize: number;
  include: {
    items: boolean;
    facets: boolean;
    pills: boolean;
  };
}

export interface SearchItem {
  id: string;
  template_slug: string;
  name: string;
  url: string | null;
  preview_url: string | null;
  website_url: string | null;
  creator_name: string | null;
  creator_slug: string | null;
  creator_profile_url: string | null;
  creator_avatar_url: string | null;
  creator_avatar_alt: string | null;
  thumbnail_image_url: string | null;
  thumbnail_image_secondary_url: string | null;
  price: number | null;
  is_free: boolean;
  is_featured: boolean;
  template_type: string | null;
  popularity_score: number | null;
  unique_viewers: number | null;
  cumulative_purchases: number | null;
  published_date: string | null;
  category_groups: Array<{ name: string; slug: string; url: string }>;
  child_categories: Array<{ name: string; slug: string; url: string }>;
  styles?: Array<{ name: string; slug: string }>;
  tags?: Array<{ name: string; slug: string }>;
}

export interface SearchResponsePayload {
  items: SearchItem[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
  sort: TemplateSort;
  applied_filters: {
    q: string | null;
    scope: TemplateScope;
    category_group_slug: string | null;
    child_category_slug: string | null;
    creator_slug: string | null;
    creator_record_id: string | null;
    style_slug: string | null;
    tag_slug: string | null;
    styles: string[];
    tags: string[];
    types: string[];
    free_only: boolean;
    /** True when the strict all-tokens query matched nothing and results come from an OR-relaxed retry. */
    relaxed: boolean;
  };
  available_facets: {
    styles: Array<{ name: string; slug: string; count: number }>;
    types: Array<{ value: string; count: number }>;
  };
  category_pills: Array<{ name: string; slug: string; url: string; count: number; active: boolean }>;
  subcategory_pills: Array<{ name: string; slug: string; url: string; count: number; active: boolean }>;
}

export interface ImageRefreshSummary {
  mode: 'image_refresh' | 'creator_refresh';
  started_at: string;
  finished_at: string;
  fetched_records: number;
  refreshed_records: number;
  backfilled_records: number;
}

export interface SyncSummary {
  mode: 'full' | 'incremental' | 'records';
  started_at: string;
  finished_at: string;
  fetched_records: number;
  indexed_records: number;
  removed_records: number;
  backfilled_records: number;
  image_refreshed_records: number;
  cursor: string;
  skipped_empty_windows?: number;
  warnings?: Array<{ source: string; message: string }>;
}

export interface TemplateImageSourceStats {
  total_rows: number;
  rows_with_image: number;
  rows_with_webflow_image: number;
  rows_with_temp_airtable_image: number;
  rows_missing_image: number;
}

export interface TemplateImageBackfillSummary {
  mode: 'image_backfill';
  started_at: string;
  finished_at: string;
  requested_limit: number;
  requested_template_slugs?: string[];
  scanned_records: number;
  updated_records: number;
  remaining_temp_airtable_rows: number;
  image_source_stats: TemplateImageSourceStats;
}

export interface TemplateImagePruneSummary {
  mode: 'image_prune';
  started_at: string;
  finished_at: string;
  requested_limit: number;
  requested_template_slugs?: string[];
  scanned_records: number;
  pruned_records: number;
  skipped_records: Array<{
    id: string;
    name: string;
    template_slug: string;
    status: number | null;
    reason: 'webflow_image_found' | 'listing_not_404';
  }>;
  image_source_stats: TemplateImageSourceStats;
}

export interface DocumentRow {
  id: string;
  template_slug: string;
  name: string;
  listing_url: string | null;
  preview_url: string | null;
  website_url: string | null;
  creator_name: string | null;
  creator_slug: string | null;
  creator_profile_url: string | null;
  creator_avatar_url: string | null;
  creator_avatar_alt: string | null;
  thumbnail_image_url: string | null;
  thumbnail_image_secondary_url: string | null;
  carousel_image_urls_json: string;
  description_short: string;
  description_long_html: string;
  description_long_text: string;
  category_groups_json: string;
  category_group_slugs_json: string;
  child_categories_json: string;
  child_category_slugs_json: string;
  styles_json: string;
  style_slugs_json: string;
  tags_json: string;
  tag_slugs_json: string;
  template_type: string | null;
  is_free: number;
  is_featured: number;
  is_landing_page: number;
  popularity_score: number | null;
  unique_viewers: number | null;
  cumulative_purchases: number | null;
  price: number | null;
  published_date: string | null;
  marketplace_status: string | null;
  source_last_modified_time: string | null;
}

export interface DocumentCountRow {
  total: number;
}

export interface FacetStyleRow {
  name: string;
  slug: string;
  count: number;
}

export interface FacetTypeRow {
  value: string;
  count: number;
}

export interface PillRow {
  name: string;
  slug: string;
  count: number;
}
