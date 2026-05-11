'use client';

import { useState } from 'react';
import { appPath } from '../lib/runtime-paths';
import {
  buildPageHref,
  buildSearchParams,
  type CategoryQuery,
  type SearchItem,
  type SearchResponsePayload,
} from '../lib/template-search';

function formatPrice(item: SearchItem): string {
  if (item.is_free || item.price === 0) return 'Free';
  if (typeof item.price !== 'number') return '';
  return `$${item.price} USD`;
}

function marketplaceHref(url: string | null, fallbackPath: string): string {
  if (!url) return fallbackPath;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'webflow.com' || parsed.hostname === 'www.webflow.com') {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return url;
  }

  return url;
}

function TemplateCard({ item }: { item: SearchItem }) {
  const detailHref = marketplaceHref(item.url, `/templates/html/${item.template_slug}`);
  const creator = item.creator_name || 'Webflow creator';
  const price = formatPrice(item);

  return (
    <article className="tm-templates_grid_item w-dyn-item category-template-card" data-template-slug={item.template_slug}>
      <div className="mp-template-item">
        <a className="tm-link w-inline-block category-template-link" href={detailHref} aria-label={`Open ${item.name}`}>
          {item.thumbnail_image_url ? (
            <img className="tm-card_image category-template-image" src={item.thumbnail_image_url} alt={item.name} loading="lazy" />
          ) : (
            <div className="category-template-image category-template-image-empty" aria-hidden="true" />
          )}
          {item.thumbnail_image_secondary_url ? (
            <img
              className="tm-card_image_secondary category-template-image-secondary"
              src={item.thumbnail_image_secondary_url}
              alt=""
              loading="lazy"
              aria-hidden="true"
            />
          ) : null}
          <div className="mp-card_hover category-card-hover" aria-hidden="true">
            <div className="mp-card_hover-content">
              <div className="paragraph-l u-text-semibold">View details</div>
            </div>
          </div>
        </a>
        <div className="mp-template-content category-template-meta">
          <div className="mp-template-details">
            <div className="template-details-wrap category-template-heading">
              <div className="template-name-wrap">
                <a className="template-name-link w-inline-block category-template-name" href={detailHref}>
                  <h4 className="template-name">{item.name}</h4>
                </a>
              </div>
              {price ? (
                <div className="template-price-wrap">
                  <h4 className="category-text category-template-price">{price}</h4>
                </div>
              ) : null}
            </div>
            <div className="template-creator-wrap category-template-submeta">
              <span className="template-creator">{creator}</span>
              {item.template_type ? <span className="category-text">{item.template_type}</span> : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CategoryResults({
  categorySlug,
  initialPayload,
  query,
}: {
  categorySlug: string;
  initialPayload: SearchResponsePayload;
  query: CategoryQuery;
}) {
  const [items, setItems] = useState(initialPayload.items);
  const [pagination, setPagination] = useState(initialPayload.pagination);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!pagination.has_next_page || isLoading) return;

    const nextPage = pagination.page + 1;
    const params = buildSearchParams(categorySlug, query, nextPage);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(appPath(`/api/templates/search?${params.toString()}`), {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Search request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as SearchResponsePayload;
      setItems((current) => [...current, ...payload.items]);
      setPagination(payload.pagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load more templates.');
    } finally {
      setIsLoading(false);
    }
  }

  const nextPage = pagination.page + 1;

  return (
    <section className="category-results" aria-label="Templates">
      <div className="category-results-grid">
        {items.map((item) => (
          <TemplateCard key={item.id} item={item} />
        ))}
      </div>

      {items.length === 0 ? (
        <div className="category-empty-state">
          <h2>No templates found</h2>
          <p>Try clearing a filter or switching back to the popular sort.</p>
        </div>
      ) : null}

      <nav className="category-pagination" aria-label="Template pages">
        {pagination.has_previous_page ? (
          <a className="category-pagination-link" href={buildPageHref(query, pagination.page - 1)}>
            Previous
          </a>
        ) : null}
        <span className="category-pagination-status">
          Page {pagination.page} of {Math.max(pagination.total_pages, 1)}
        </span>
        {pagination.has_next_page ? (
          <a className="category-pagination-link" href={buildPageHref(query, nextPage)}>
            Next
          </a>
        ) : null}
      </nav>

      {pagination.has_next_page ? (
        <div className="category-load-more-wrap">
          <button className="category-load-more" type="button" onClick={loadMore} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load more'}
          </button>
          {error ? <p className="category-load-error">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
