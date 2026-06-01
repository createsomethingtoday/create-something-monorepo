import React from 'react';
import { TemplateGrid } from '../grid/TemplateGrid';

type TemplateSort = 'popular' | 'newest' | 'price_asc' | 'price_desc';
type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';

export interface TemplateSearchResultsProps {
  /** Base URL for the template search API, no trailing slash. */
  apiBase?: string;
  /** Designer preview category slug. */
  categorySlug?: string;
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
  styleSlug = '',
  tagSlug = '',
  scopeOverride = 'all',
  defaultSort = 'popular',
  pageSize = 24,
  emptyTitle = 'No matching templates',
  emptyDescription = 'Try a broader search, remove a filter, or start again from the full template catalog.',
  emptyActionLabel = 'Clear filters',
  showCategoryMeta = false,
  showTemplateType = false,
  showPreviewLink = false,
  showFeaturedBadge = false,
  showMarketplaceSignals = false,
  enableAnalytics = true,
}) => {
  return (
    <TemplateGrid
      apiBase={apiBase}
      categorySlug={categorySlug}
      styleSlug={styleSlug}
      tagSlug={tagSlug}
      scopeOverride={scopeOverride}
      initialSort={defaultSort}
      pageSize={pageSize}
      showEmptyState
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyActionLabel={emptyActionLabel}
      showCategoryMeta={showCategoryMeta}
      showTemplateType={showTemplateType}
      showPreviewLink={showPreviewLink}
      showFeaturedBadge={showFeaturedBadge}
      showMarketplaceSignals={showMarketplaceSignals}
      enableAnalytics={enableAnalytics}
    />
  );
};

export default TemplateSearchResults;
