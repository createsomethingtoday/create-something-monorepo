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
    />
  );
};

export default TemplateSearchResults;
