import React from 'react';
import { TemplateGrid } from '../grid/TemplateGrid';

type TemplateSort = 'popular' | 'newest' | 'price_asc' | 'price_desc';
type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';

export interface TemplateSearchResultsProps {
  /** Base URL for the template search API, no trailing slash. */
  apiBase?: string;
  /** Designer preview category slug. */
  categorySlug?: string;
  /** Designer preview creator/designer slug. Production can infer from /templates/designers/{slug}. */
  creatorSlug?: string;
  /** Optional exact creator Airtable/Webflow sync record ID for Designer profile pages. */
  creatorRecordId?: string;
  /** Designer preview style slug. */
  styleSlug?: string;
  /** Designer preview tag slug. */
  tagSlug?: string;
  /** Designer preview scope. Production can still infer scope from the URL. */
  scopeOverride?: TemplateScope;
  /** Default sort when none is set in the URL. */
  defaultSort?: TemplateSort;
  /** Items per grid page. */
  pageSize?: number;
  /** No-results heading. */
  emptyTitle?: string;
  /** No-results body copy. */
  emptyDescription?: string;
  /** No-results clear action label. */
  emptyActionLabel?: string;
  /** Show recommended templates when the current search returns no results. */
  showEmptyRecommendations?: boolean;
  /** Heading for the no-results recommendation grid. */
  emptyRecommendationsTitle?: string;
  /** Show category/subcategory metadata below card creator names. */
  showCategoryMeta?: boolean;
  /** Show template type alongside category metadata. */
  showTemplateType?: boolean;
  /** Show preview links on cards when available. */
  showPreviewLink?: boolean;
  /** Show Featured badges on API-featured templates. */
  showFeaturedBadge?: boolean;
  /** Show compact social-proof signals from the search API on each card. */
  showMarketplaceSignals?: boolean;
  /** Emit aggregate grid health telemetry and component errors. */
  enableAnalytics?: boolean;
}

export const TemplateSearchResults: React.FC<TemplateSearchResultsProps> = ({
  apiBase = '',
  categorySlug = '',
  scopeOverride = 'all',
  defaultSort = 'popular',
  pageSize = 24,
}) => {
  return (
    <TemplateGrid
      apiBase={apiBase}
      categorySlug={categorySlug}
      scopeOverride={scopeOverride}
      initialSort={defaultSort}
      pageSize={pageSize}
    />
  );
};

export default TemplateSearchResults;
