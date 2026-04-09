export type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';
export type TemplateSort = 'popular' | 'newest' | 'price_asc' | 'price_desc';
export type AliasType = 'child_category';

export interface Env {
  DB: D1Database;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_ASSETS_TABLE_ID?: string;
  AIRTABLE_CREATORS_TABLE_ID?: string;
  AIRTABLE_STYLES_TABLE_ID?: string;
  AIRTABLE_CHILD_CATEGORIES_TABLE_ID?: string;
  AIRTABLE_TAGS_TABLE_ID?: string;
  ALLOWED_ORIGINS?: string;
  DEFAULT_PAGE_SIZE?: string;
  DEFAULT_CLIENT_MODE?: string;
  ENVIRONMENT?: string;
  FULL_SYNC_PAGE_LIMIT?: string;
  FULL_SYNC_PAGE_SIZE?: string;
  LOOKUP_CACHE_TTL_SECONDS?: string;
  SEARCH_RANKING_CONFIG_JSON?: string;
  SYNC_ADMIN_TOKEN?: string;
}

export interface AirtableAttachment {
  id?: string;
  url: string;
  filename?: string;
}

export interface AirtableUrlValue {
  label?: string;
  url?: string;
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

export interface AirtablePageResult<TFields extends Record<string, unknown> = Record<string, unknown>> {
  records: Array<AirtableRecord<TFields>>;
  offset: string | null;
}

export interface AirtableAssetFields extends Record<string, unknown> {
  'Name'?: string;
  '⚙️🆎Type (Text)'?: string;
  '🚀Marketplace Status'?: string;
  'ℹ️Description (Short)'?: string;
  'ℹ️Description (Long).html'?: string;
  '🪣Category Group(s) Display Name'?: string[] | string;
  '🪣Category Group(s) CMS Slug'?: string[] | string;
  '🔍Algolia Child Category (🏗️ only)'?: string[];
  'ℹ️👘Styles'?: string[];
  'ℹ️🏷️Tags (Multi)'?: string[];
  '🥞Template Type (🏗️ only)'?: string;
  'Is free?'?: number | boolean;
  '🥞Is Currently Featured? (🏗️ only)'?: number | boolean;
  'ℹ️Is Featured? (🖥️, 🏗️only)'?: number | boolean;
  '🖌️Popularity Score'?: number;
  '📋 Unique Viewers'?: number;
  '📋 Cumulative Purchases'?: number;
  '📋 Cumulative Revenue'?: number;
  '🥞💲Template Price Filter (🏗️ only)'?: number;
  '🚀📅Published Date'?: string;
  '🥞CMS Slug (formula)'?: string;
  '🎨Creator'?: string[];
  '🎨Creator Name'?: string;
  '⚙️🎨Creator Record ID'?: string | string[];
  '🖼️Thumbnail Image'?: AirtableAttachment[];
  '🖼️Thumbnail Image (Secondary)'?: AirtableAttachment[];
  '🖼️Carousel Images'?: AirtableAttachment[];
  '🕸️View Asset Listing'?: AirtableUrlValue | AirtableUrlValue[] | string;
  '🕸️Template Profile Page '?: AirtableUrlValue | AirtableUrlValue[] | string;
  '🔗Preview Site URL'?: string;
  '🔗Listing URL'?: string;
  '🔗Website URL'?: string;
  '📅LMT'?: string;
}

export interface AirtableCreatorFields extends Record<string, unknown> {
  '⚙️🎨Creator Record ID'?: string;
  '🖼️Avatar (Primary)'?: AirtableAttachment[];
  '🖼️Avatar (Secondary)'?: AirtableAttachment[];
  '🖼️Avatar Alt Text'?: string;
  '🔗Creator Profile (📚 only)'?: AirtableUrlValue | AirtableUrlValue[] | string;
  '❓🔗Templates Page'?: AirtableUrlValue | AirtableUrlValue[] | string;
}

export interface LookupValue {
  id: string;
  name: string;
  slug: string;
}

export interface ChildCategoryLookupValue extends LookupValue {
  category: string;
  displayName: string;
  parentCategoryName: string;
  categoryGroups: string[];
  relatedKeywords: string[];
}

export interface LookupMaps {
  styles: Map<string, LookupValue>;
  childCategories: Map<string, ChildCategoryLookupValue>;
  tags: Map<string, LookupValue>;
}

export interface TemplateDocumentInput {
  id: string;
  templateSlug: string;
  name: string;
  listingUrl: string | null;
  previewUrl: string | null;
  websiteUrl: string | null;
  creatorRecordId: string | null;
  creatorName: string | null;
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
  childCategorySearchTerms: string[];
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
  cumulativeRevenue: number | null;
  price: number | null;
  publishedDate: string | null;
  marketplaceStatus: string | null;
  sourceLastModifiedTime: string | null;
  syncedAt: string;
}

export interface SearchHeadTermConceptBucketConfig {
  id: string;
  phrases: string[];
  structuredPhrases?: string[];
  requiredPhraseGroups?: string[][];
}

export interface SearchHeadTermProfileConfig {
  id: string;
  triggers: string[];
  ftsPhrases: string[];
  taxonomyPhrases: string[];
  conceptBuckets?: SearchHeadTermConceptBucketConfig[];
  corroborationPhrases?: string[];
  corroborationPenaltyConcepts?: string[];
  protectedSlotConceptCaps?: Record<string, number>;
  protectedSlotCount?: number;
}

export interface SearchRankingConfig {
  textWeights: {
    name: number;
    descriptionShort: number;
    descriptionLong: number;
    categoryGroups: number;
    childCategories: number;
    styles: number;
    tags: number;
  };
  conceptFieldWeights: {
    name: number;
    descriptionShort: number;
    descriptionLong: number;
    categoryGroups: number;
    childCategories: number;
    tags: number;
  };
  headTermProfiles: SearchHeadTermProfileConfig[];
  signalWeights: {
    text: number;
    popularity: number;
    views: number;
    purchases: number;
    conversionRate: number;
    revenue: number;
    freshness: number;
    creatorTrackRecord: number;
    creatorDiversity: number;
    exactTitle: number;
    categoryMatch: number;
    intentCoverage: number;
    querySaturation: number;
  };
  controls: {
    longDescriptionMaxChars: number;
    reciprocalRankOffset: number;
    conversionRateSmoothingViews: number;
    conversionRateSmoothingPurchases: number;
    taxonomyPrecedenceMinQueryLength: number;
    shortQueryMaxTokens: number;
    shortQueryMaxChars: number;
    shortQueryTextWeightMultiplier: number;
    shortQueryExactTitleWeightMultiplier: number;
    shortQueryCategoryWeightMultiplier: number;
    purchaseSmoothingViews: number;
    purchaseSmoothingPrior: number;
    revenueSmoothingViews: number;
    revenueSmoothingPrior: number;
    freshnessHalfLifeDays: number;
    querySaturationThreshold: number;
    creatorDiversityRerankWindowSize: number;
    creatorDiversityRerankMaxPages: number;
    creatorDiversityRerankPenalty: number;
    creatorDiversityRerankScoreTolerance: number;
    headTermConceptRerankWindowSize: number;
    headTermConceptRerankMaxPages: number;
    headTermConceptRerankPenalty: number;
    headTermConceptRerankScoreTolerance: number;
    headTermConceptProtectedSlots: number;
    headTermCorroborationPenalty: number;
    creatorTrackRecordMinTemplates: number;
    relaxedQueryMinTokens: number;
    relaxedQueryMaxTokens: number;
    relaxedQueryResultThreshold: number;
  };
}

export interface SearchParams {
  q: string | null;
  scope: TemplateScope;
  categoryGroupSlug: string | null;
  childCategorySlug: string | null;
  styles: string[];
  types: string[];
  freeOnly: boolean;
  sort: TemplateSort;
  page: number;
  pageSize: number;
  includeFacets: boolean;
}

export interface SearchItem {
  id: string;
  template_slug: string;
  name: string;
  url: string | null;
  preview_url: string | null;
  website_url: string | null;
  creator_profile_url: string | null;
  creator_name: string | null;
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
  cumulative_revenue: number | null;
  published_date: string | null;
  category_groups: Array<{ name: string; slug: string; url: string }>;
  child_categories: Array<{ name: string; slug: string; url: string }>;
  styles: Array<{ name: string; slug: string }>;
  tags: Array<{ name: string; slug: string }>;
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
    styles: string[];
    types: string[];
    free_only: boolean;
  };
  available_facets: {
    styles: Array<{ name: string; slug: string; count: number }>;
    types: Array<{ value: string; count: number }>;
  };
  subcategory_pills: Array<{ name: string; slug: string; url: string; count: number; active: boolean }>;
}

export interface SyncSummary {
  mode: 'full' | 'incremental';
  started_at: string;
  finished_at: string;
  fetched_records: number;
  indexed_records: number;
  removed_records: number;
  cursor: string;
  complete?: boolean;
  next_offset?: string | null;
}

export interface DocumentRow {
  id: string;
  template_slug: string;
  name: string;
  listing_url: string | null;
  preview_url: string | null;
  website_url: string | null;
  creator_record_id: string | null;
  creator_name: string | null;
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
  cumulative_revenue: number | null;
  price: number | null;
  published_date: string | null;
  marketplace_status: string | null;
  source_last_modified_time: string | null;
  name_query_match?: number | null;
  taxonomy_query_match?: number | null;
  exact_title_match?: number | null;
  intent_query_coverage?: number | null;
  query_saturation?: number | null;
  text_rank?: number | null;
  blended_rank?: number | null;
  creator_track_record_score?: number | null;
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
