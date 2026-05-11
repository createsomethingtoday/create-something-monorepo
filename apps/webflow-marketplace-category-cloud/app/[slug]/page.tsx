import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryResults } from '../../components/category-results';
import { buildCategoryStructuredData } from '../../lib/structured-data';
import {
  buildPageHref,
  getCategoryMetadata,
  marketplaceBaseUrl,
  parseCategoryQuery,
  searchTemplates,
  type CategoryQuery,
} from '../../lib/template-search';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function canonicalForPage(canonicalUrl: string, page: number): string {
  return page > 1 ? `${canonicalUrl}?page=${page}` : canonicalUrl;
}

function selectedValues(values: string[]): Set<string> {
  return new Set(values);
}

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function FilterForm({ query, payload }: { query: CategoryQuery; payload: Awaited<ReturnType<typeof searchTemplates>> }) {
  const selectedStyles = selectedValues(query.styles);
  const selectedTypes = selectedValues(query.types);

  return (
    <form className="category-filter-panel" method="get">
      <div className="category-filter-group">
        <label className="category-filter-label" htmlFor="template-search">
          Search
        </label>
        <input
          id="template-search"
          className="category-search-input"
          name="q"
          type="search"
          defaultValue={query.q ?? ''}
          placeholder="Search templates"
        />
      </div>

      <div className="category-filter-group">
        <label className="category-filter-label" htmlFor="template-sort">
          Sort
        </label>
        <select id="template-sort" className="category-select" name="sort" defaultValue={query.sort}>
          <option value="popular">Popular</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>

      <fieldset className="category-filter-group">
        <legend className="category-filter-label">Type</legend>
        {payload.available_facets.types.map((type) => (
          <label className="category-check-row" key={type.value}>
            <input name="types" type="checkbox" value={type.value} defaultChecked={selectedTypes.has(type.value)} />
            <span>{type.value}</span>
            <span className="category-filter-count">{type.count}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="category-filter-group">
        <legend className="category-filter-label">Style</legend>
        {payload.available_facets.styles.slice(0, 12).map((style) => (
          <label className="category-check-row" key={style.slug}>
            <input name="styles" type="checkbox" value={style.slug} defaultChecked={selectedStyles.has(style.slug)} />
            <span>{style.name}</span>
            <span className="category-filter-count">{style.count}</span>
          </label>
        ))}
      </fieldset>

      <label className="category-check-row category-check-row-strong">
        <input name="free_only" type="checkbox" value="true" defaultChecked={query.freeOnly} />
        <span>Free templates only</span>
      </label>

      <div className="category-filter-actions">
        <button className="category-submit" type="submit">
          Apply filters
        </button>
        <a className="category-clear" href="?">
          Clear
        </a>
      </div>
    </form>
  );
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ slug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const query = parseCategoryQuery(rawSearchParams);
  const category = await getCategoryMetadata(slug);

  if (!category) {
    return {
      title: 'Template category not found | Webflow',
      robots: { index: false, follow: false },
    };
  }

  const canonical = canonicalForPage(category.canonical_url, query.page);
  const title = query.page > 1 ? `${category.title} - Page ${query.page}` : category.title;

  return {
    title,
    description: category.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: category.description,
      type: 'website',
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: category.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const [{ slug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const query = parseCategoryQuery(rawSearchParams);
  const [category, payload] = await Promise.all([getCategoryMetadata(slug), searchTemplates(slug, query)]);

  if (!category) {
    notFound();
  }

  const structuredData = buildCategoryStructuredData(category, payload.items, query.page);
  const total = payload.pagination.total_items || category.total_items;

  return (
    <main className="category-app">
      {structuredData.map((item) => (
        <script key={item['@type']} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(item) }} />
      ))}

      <section className="category-hero">
        <div className="category-container category-hero-grid">
          <div>
            <div className="category-eyebrow">Webflow templates</div>
            <h1>{category.name} website templates</h1>
            <p>{category.description}</p>
            <div className="category-hero-actions">
              <a className="category-primary-link" href={`${marketplaceBaseUrl()}/templates`}>
                Browse marketplace
              </a>
              <a className="category-secondary-link" href={`${marketplaceBaseUrl()}/templates/submit-a-template`}>
                Submit a template
              </a>
            </div>
          </div>
          <div className="category-hero-stat" aria-label={`${total} templates in this category`}>
            <span>{total.toLocaleString()}</span>
            <strong>templates</strong>
          </div>
        </div>
      </section>

      <section className="category-container category-layout">
        <aside className="category-sidebar">
          <FilterForm query={query} payload={payload} />
        </aside>

        <div className="category-main">
          <div className="category-toolbar">
            <div>
              <h2>{category.name} templates</h2>
              <p>
                Showing {payload.items.length.toLocaleString()} of {total.toLocaleString()} templates.
              </p>
            </div>
            {query.page > 1 ? (
              <a className="category-page-reset" href={buildPageHref(query, 1)}>
                First page
              </a>
            ) : null}
          </div>

          {payload.subcategory_pills.length > 0 ? (
            <nav className="category-pill-row" aria-label={`${category.name} subcategories`}>
              {payload.subcategory_pills.slice(0, 16).map((pill) => (
                <a className={pill.active ? 'category-pill is-active' : 'category-pill'} href={pill.url} key={pill.slug}>
                  {pill.name}
                  <span>{pill.count}</span>
                </a>
              ))}
            </nav>
          ) : null}

          <CategoryResults categorySlug={category.slug} initialPayload={payload} query={query} />
        </div>
      </section>
    </main>
  );
}
