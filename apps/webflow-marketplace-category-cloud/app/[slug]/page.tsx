import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryResults } from '../../components/category-results';
import { FilterSortToolbar } from '../../components/filter-sort-toolbar';
import { buildCategoryStructuredData } from '../../lib/structured-data';
import {
  buildPageHref,
  getCategoryMetadata,
  marketplaceBaseUrl,
  parseCategoryQuery,
  searchTemplates,
} from '../../lib/template-search';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function canonicalForPage(canonicalUrl: string, page: number): string {
  return page > 1 ? `${canonicalUrl}?page=${page}` : canonicalUrl;
}

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
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
        <div className="category-main">
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

          <FilterSortToolbar query={query} payload={payload} />

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

          <CategoryResults categorySlug={category.slug} initialPayload={payload} query={query} />
        </div>
      </section>
    </main>
  );
}
