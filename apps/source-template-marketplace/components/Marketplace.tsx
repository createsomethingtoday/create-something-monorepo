'use client';
import React, { useEffect, useRef, useState } from 'react';
import { PreviewDialog } from './PreviewDialog';
import { ListingSections } from './ListingSections';
import type { Item, Catalog } from '../lib/types';
import { isFreeBrowse, updateBrowseParams } from '../lib/browseState';
import { categoryFallback, styleFallback } from '../lib/taxonomy';
import { useInfiniteCatalog, forgetBrowse, rememberBrowsePosition } from './useInfiniteCatalog';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TemplateCard, TEMPLATE_CARD_STYLES } from './TemplateCard';
import { TEMPLATE_SORT_OPTIONS, normalizeTemplateSort } from '../lib/templateRoute';
import {
  safeImageUrl,
  safeMarketplaceUrl,
  safePreviewUrl,
  PREVIEW_IFRAME_SANDBOX
} from '../lib/templateUrlSafety';
import { marketplaceConfig, type MarketplaceConfig as Config } from '../marketplace.config';

const categories = [
  ['Portfolio & Agency', 'portfolio-and-agency-websites'],
  ['Technology', 'technology-websites'],
  ['Blog & Editorial', 'blog-and-editorial-websites'],
  ['Professional Services', 'professional-services-websites'],
  ['Real Estate', 'real-estate-websites'],
  ['Retail & E-Commerce', 'retail-and-e-commerce-websites']
];
function useCatalog(query: string) {
  const [data, setData] = useState<Catalog | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [attempt, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    fetch('/api/catalog?' + query, { signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        return d;
      })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, attempt]);
  return { data, error, loading, retry: () => retry((n) => n + 1) };
}
export default function Marketplace() {
  const router = useRouter(),
    pathname = usePathname(),
    search = useSearchParams();
  const url = new URL(pathname + '?' + search.toString(), 'http://local.invalid');
  const freeBrowse = !pathname.startsWith('/templates/html/') && isFreeBrowse(url.searchParams);
  const detail = pathname.startsWith('/templates/html/'),
    home = pathname === '/templates' || pathname === '/';
  function nav(path: string) {
    rememberBrowsePosition();
    router.push(path);
  }
  function link(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      nav(path);
    }
  }
  return (
    <div style={{ '--accent': marketplaceConfig.accent } as React.CSSProperties}>
      <style dangerouslySetInnerHTML={{ __html: TEMPLATE_CARD_STYLES }} />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="review-banner">
        <span>
          <i /> Template Marketplace · Development preview
        </span>
        <span>Purchases open on Webflow</span>
      </div>
      <header className="header">
        <a
          className="brand"
          href="/templates"
          onClick={(e) => link(e, '/templates')}
          aria-label="Marketplace home"
        >
          <strong>Webflow</strong>
          <span>Marketplace</span>
        </a>
        <nav aria-label="Main navigation">
          <a
            className={home ? 'active' : ''}
            href="/templates"
            onClick={(e) => link(e, '/templates')}
          >
            Discover
          </a>
          <a
            className={!home && !detail && !freeBrowse ? 'active' : ''}
            href="/templates/all"
            onClick={(e) => link(e, '/templates/all')}
          >
            All templates
          </a>
          <a
            className={freeBrowse ? 'active' : ''}
            href="/templates/all?scope=free"
            onClick={(e) => link(e, '/templates/all?scope=free')}
          >
            Free templates
          </a>
        </nav>
        <a
          className="creator-link"
          href="https://webflow.com/templates/submission-guidelines"
          target="_blank"
          rel="noreferrer"
        >
          Become a creator
        </a>
      </header>
      {detail ? (
        <Detail
          key={pathname}
          slug={decodeURIComponent(pathname.split('/').pop() || '')}
          nav={nav}
        />
      ) : (
        <main id="main">
          {home ? (
            <Landing config={marketplaceConfig} nav={nav} />
          ) : (
            <Browse key={url.search} url={url} nav={nav} />
          )}
        </main>
      )}
      <footer>
        <div>
          <b>Good design is a great beginning.</b>
          <p>Made by creators. Ready for your next idea.</p>
        </div>
        <div>
          <a href="https://webflow.com/templates" target="_blank" rel="noreferrer">
            Visit Webflow Marketplace
          </a>
          <p>Development preview · Purchases happen on Webflow</p>
        </div>
      </footer>
    </div>
  );
}
function Search({ initial = '', onSearch }: { initial?: string; onSearch: (s: string) => void }) {
  const [q, setQ] = useState(initial);
  useEffect(() => setQ(initial), [initial]);
  return (
    <form
      className="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(q.trim());
      }}
    >
      <span aria-hidden>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
      </span>
      <input
        aria-label="Search templates"
        placeholder="What are you building?"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}
function Card({ item, nav, index }: { item: Item; nav: (p: string) => void; index: number }) {
  const path = '/templates/html/' + encodeURIComponent(item.template_slug);
  const [preview, setPreview] = useState(false);
  return (
    <div className="card-entry" data-template-id={item.id}>
      <TemplateCard
        stylesProvided
        priorityIndex={index}
        deferSecondaryImage
        templateName={item.name}
        templateLink={{
          href: path,
          onClick: (e) => {
            if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
              e.preventDefault();
              nav(path);
            }
          }
        }}
        creatorName={item.creator_name}
        creatorLink={{
          href: '/templates/all?creator_slug=' + encodeURIComponent(item.creator_slug),
          onClick: (e) => {
            if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
              e.preventDefault();
              forgetBrowse();
              nav('/templates/all?creator_slug=' + encodeURIComponent(item.creator_slug));
            }
          }
        }}
        price={item.is_free ? 'Free' : item.price == null ? 'See listing' : `$${item.price}`}
        isFree={item.is_free}
        primaryImage={{
          src: safeImageUrl(item.thumbnail_image_url) || '',
          alt: item.name + ' website preview'
        }}
        secondaryImage={{
          src: safeImageUrl(item.thumbnail_image_secondary_url) || '',
          alt: item.name + ' alternate preview'
        }}
        categoryName={item.category_groups?.[0]?.name}
        showCategoryMeta
        templateType={item.template_type}
        showTemplateType
        showAiBadge={false}
        creatorIcon={{ src: safeImageUrl(item.creator_avatar_url) || '', alt: item.creator_name }}
        showPreviewLink={!!safePreviewUrl(item.website_url)}
        previewLabel="Preview website"
        previewLink={{
          href: safePreviewUrl(item.website_url) || '#',
          onClick: (e) => {
            if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
              e.preventDefault();
              setPreview(true);
            }
          }
        }}
      />
      {preview && (
        <PreviewDialog name={item.name} url={item.website_url} close={() => setPreview(false)} />
      )}
    </div>
  );
}
function Results({
  result,
  nav
}: {
  result: ReturnType<typeof useCatalog>;
  nav: (p: string) => void;
}) {
  if (result.loading)
    return (
      <div className="skeleton-grid" role="status" aria-label="Loading templates">
        {[1, 2, 3].map((x) => (
          <div className="skeleton" key={x} />
        ))}
        <span className="sr">Loading templates…</span>
      </div>
    );
  if (result.error)
    return (
      <div className="empty" role="alert">
        <h3>We couldn’t load the templates.</h3>
        <p>{result.error}</p>
        <button onClick={result.retry}>Try again</button>
      </div>
    );
  if (!result.data?.items.length)
    return (
      <div className="empty">
        <h3>No templates match these filters.</h3>
        <p>Try a broader search or remove a filter.</p>
        <button
          onClick={() => {
            forgetBrowse();
            nav('/templates/all');
          }}
        >
          Clear all filters
        </button>
      </div>
    );
  return (
    <>
      <div className="grid">
        {result.data.items.map((i, index) => (
          <Card key={i.id} item={i} nav={nav} index={index} />
        ))}
      </div>
      <p className="provenance">
        Live Marketplace catalog · Retrieved{' '}
        {new Date(result.data.provenance.fetchedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}{' '}
        · Webflow templates
      </p>
    </>
  );
}
function Collection({
  title,
  subtitle,
  scope = 'all',
  sort = 'popular',
  nav
}: {
  title: string;
  subtitle: string;
  scope?: string;
  sort?: string;
  nav: (p: string) => void;
}) {
  const result = useCatalog(`scope=${scope}&sort=${sort}&page_size=6`);
  const rail = useRef<HTMLDivElement>(null);
  return (
    <section className="collection">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <button
          className="text-button"
          onClick={() => nav(`/templates/all?scope=${scope}&sort=${sort}`)}
        >
          Explore collection
        </button>
      </div>
      <div className="collection-controls">
        <button
          aria-label={'Previous ' + title + ' templates'}
          onClick={() =>
            rail.current?.scrollBy({
              left: -rail.current.clientWidth,
              behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth'
            })
          }
        >
          <Arrow left />
        </button>
        <button
          aria-label={'Next ' + title + ' templates'}
          onClick={() =>
            rail.current?.scrollBy({
              left: rail.current.clientWidth,
              behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth'
            })
          }
        >
          <Arrow />
        </button>
      </div>
      <div className="collection-rail" ref={rail}>
        <Results result={result} nav={nav} />
      </div>
    </section>
  );
}
function Arrow({ left = false }: { left?: boolean }) {
  return (
    <svg
      aria-hidden
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      style={{ transform: left ? 'rotate(180deg)' : undefined }}
    >
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  );
}
function CategoryTile({
  name,
  slug,
  nav
}: {
  name: string;
  slug: string;
  nav: (p: string) => void;
}) {
  const result = useCatalog('category_group_slug=' + slug + '&page_size=1');
  const item = result.data?.items[0];
  return (
    <button
      className="category-tile"
      onClick={() => nav('/templates/all?category_group_slug=' + slug)}
    >
      <div className="category-art">
        {item && (
          <img
            src={safeImageUrl(item.thumbnail_image_url) || undefined}
            alt={item.name + ' template from ' + name}
            loading="lazy"
          />
        )}
      </div>
      <span className="category-caption">
        <span>
          <strong>{name}</strong>
          <small>
            {result.data
              ? result.data.pagination.total_items.toLocaleString() + ' templates'
              : 'Explore category'}
          </small>
        </span>
        <Arrow />
      </span>
    </button>
  );
}
function FeaturedSpotlight({ nav }: { nav: (p: string) => void }) {
  const result = useCatalog('scope=featured&page_size=1');
  const item = result.data?.items[0];
  if (!item) return null;
  return (
    <section className="featured-spotlight">
      <button
        className="spotlight-image"
        onClick={() => nav('/templates/html/' + item.template_slug)}
      >
        <img
          src={safeImageUrl(item.thumbnail_image_url) || undefined}
          alt={item.name + ' website template'}
          loading="lazy"
        />
      </button>
      <div>
        <h2>Featured: {item.name}</h2>
        <p>{item.reviewer_pick_reason || item.description_short}</p>
        <p className="byline">By {item.creator_name}</p>
        <button onClick={() => nav('/templates/html/' + item.template_slug)}>
          Explore {item.name}
        </button>
      </div>
    </section>
  );
}
function Landing({ config, nav }: { config: Config; nav: (p: string) => void }) {
  return (
    <>
      <section className="hero">
        <h1>{config.headline}</h1>
        <p>{config.description}</p>
        <Search onSearch={(q) => nav('/templates/all?q=' + encodeURIComponent(q))} />
        <div className="quick">
          <span>Popular searches</span>
          {['Portfolio', 'SaaS', 'Agency', 'Ecommerce'].map((q) => (
            <button key={q} onClick={() => nav('/templates/all?q=' + q)}>
              {q}
            </button>
          ))}
        </div>
      </section>
      <section className="category-section">
        <div className="section-head">
          <h2>A starting point for every idea.</h2>
          <button
            className="text-button"
            onClick={() => {
              forgetBrowse();
              nav('/templates/all');
            }}
          >
            Browse all templates
          </button>
        </div>
        <div className="categories">
          {categories.map(([name, slug]) => (
            <CategoryTile key={slug} name={name} slug={slug} nav={nav} />
          ))}
        </div>
      </section>
      <Collection
        title={
          config.collection === 'featured'
            ? 'Selected for a strong first impression.'
            : config.collection === 'free'
              ? 'Great beginnings. No upfront cost.'
              : 'Discover your next starting point.'
        }
        subtitle={
          config.collection === 'featured'
            ? 'A curated selection from the Webflow Marketplace.'
            : 'Explore professionally designed templates.'
        }
        scope={config.collection}
        nav={nav}
      />
      <FeaturedSpotlight nav={nav} />
      <Collection
        title="Fresh perspectives."
        subtitle="Recently added by independent designers."
        sort="newest"
        nav={nav}
      />
      <Collection
        title="Start something for free."
        subtitle="Explore a new idea without a template purchase."
        scope="free"
        nav={nav}
      />
      <section className="faq">
        <h2>A few things to know.</h2>
        {[
          [
            'What is a Webflow template?',
            'A professionally designed starting point with responsive layouts, reusable sections, and styled components. Customize it in Webflow to fit your brand.'
          ],
          [
            'Can I customize a template?',
            'Yes. Edit content, colors, typography, layouts and reusable components in Webflow Designer to make the template your own.'
          ],
          [
            'Can I buy a template here?',
            'This local version does not process purchases. Template details link to the official Marketplace listing, where current pricing, licensing, and purchase options are available.'
          ],
          [
            'Do I need a paid site plan?',
            'You can explore and customize a template in Webflow before selecting hosting. A paid Site Plan is required for a custom domain; template purchase fees are separate. Check the official listing for current terms.'
          ]
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span>+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </>
  );
}
function Browse({ url, nav }: { url: URL; nav: (p: string) => void }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const params = new URLSearchParams(url.search);
  const free = isFreeBrowse(params);
  const activeFilters =
    ['category_group_slug', 'child_category_slug', 'creator_slug', 'tag_slug', 'types'].filter(
      (k) => params.has(k)
    ).length +
    Number(params.has('styles') || params.has('style_slug')) +
    Number(free) +
    Number(params.get('scope') === 'featured');
  params.delete('page');
  params.set('page_size', '24');
  params.set('sort', normalizeTemplateSort(params.get('sort')));
  const result = useInfiniteCatalog(params.toString());
  function update(k: string, v: string) {
    const p = updateBrowseParams(new URLSearchParams(url.search), k, v);
    forgetBrowse();
    nav('/templates/all?' + p.toString());
  }
  return (
    <section className="browse">
      <div className="browse-top">
        <h1>
          {(free
            ? 'Free website templates'
            : categoryFallback.find((c) => c.slug === params.get('category_group_slug'))?.name) ||
            (params.get('creator_slug')
              ? params.get('creator_slug')!.replaceAll('-', ' ') + ' templates'
              : params.get('q')
                ? 'Search results'
                : 'All website templates')}
        </h1>
        <Search initial={params.get('q') || ''} onSearch={(q) => update('q', q)} />
      </div>
      <div className="browse-layout">
        <aside className={`filters ${filtersOpen ? 'is-open' : ''}`}>
          <button
            className="filter-toggle"
            aria-expanded={filtersOpen}
            aria-controls="filter-fields"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            Filters{activeFilters ? ` (${activeFilters})` : ''}{' '}
            <span>{filtersOpen ? 'Hide' : 'Show'}</span>
          </button>
          <div className="filter-fields" id="filter-fields">
            <div className="section-head">
              <h2>Filters</h2>
              <button
                className="text-button"
                onClick={() => {
                  forgetBrowse();
                  nav('/templates/all');
                }}
              >
                Clear
              </button>
            </div>
            <label>
              Category
              <select
                value={params.get('category_group_slug') || ''}
                onChange={(e) => update('category_group_slug', e.target.value)}
              >
                <option value="">All categories</option>
                {Array.from(
                  new Map(
                    [...categoryFallback, ...(result.data?.category_pills || [])].map((c) => [
                      c.slug,
                      c
                    ])
                  ).values()
                ).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {!!result.data?.subcategory_pills?.length && (
              <label>
                Subcategory
                <select
                  value={params.get('child_category_slug') || ''}
                  onChange={(e) => update('child_category_slug', e.target.value)}
                >
                  <option value="">All subcategories</option>
                  {result.data.subcategory_pills.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Collection
              <select
                value={params.get('scope') || 'all'}
                onChange={(e) => update('scope', e.target.value)}
              >
                <option value="all">All templates</option>
                <option value="featured">Featured</option>
                <option value="free">Free</option>
              </select>
            </label>
            <label>
              Structure
              <select
                value={params.get('types') || ''}
                onChange={(e) => update('types', e.target.value)}
              >
                <option value="">Any structure</option>
                {['One Page', 'Multi Page', 'Multi Layout'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Style
              <select
                value={params.get('styles') || params.get('style_slug') || ''}
                onChange={(e) => update('styles', e.target.value)}
              >
                <option value="">Any style</option>
                {Array.from(
                  new Map(
                    [...styleFallback, ...(result.data?.available_facets?.styles || [])].map(
                      (c) => [c.slug, c]
                    )
                  ).values()
                ).map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={free}
                onChange={(e) => update('free_only', e.target.checked ? 'true' : '')}
              />{' '}
              Free templates only
            </label>
            {['creator_slug', 'tag_slug', 'child_category_slug']
              .filter((key) => params.has(key))
              .map((key) => (
                <button className="active-filter" key={key} onClick={() => update(key, '')}>
                  Remove {params.get(key)?.replaceAll('-', ' ')}
                </button>
              ))}
          </div>
        </aside>
        <div className="results">
          <div className="result-toolbar">
            <p role="status">
              {result.loading
                ? 'Finding templates…'
                : result.data
                  ? `${result.data.pagination.total_items.toLocaleString()} templates`
                  : ''}
            </p>
            <label>
              Sort by{' '}
              <select
                aria-label="Sort templates"
                value={params.get('sort') || 'popular'}
                onChange={(e) => update('sort', e.target.value)}
              >
                {TEMPLATE_SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Results result={result} nav={nav} />
          <div className="load-more" ref={result.sentinel}>
            {result.appendError ? (
              <div role="alert">
                <p>{result.appendError}</p>
                <button onClick={result.loadMore}>Retry loading more</button>
              </div>
            ) : result.data?.pagination.has_next_page ? (
              <button onClick={result.loadMore} disabled={result.loadingMore}>
                {result.loadingMore ? 'Loading more templates…' : 'Load more templates'}
              </button>
            ) : result.data?.items.length ? (
              <p>
                You’ve explored all {result.data.items.length.toLocaleString()} matching templates.
              </p>
            ) : null}
            <span role="status" className="sr">
              {result.loadingMore
                ? 'Loading more templates'
                : result.data
                  ? `${result.data.items.length} templates shown`
                  : ''}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
function Related({
  item,
  creator,
  nav
}: {
  item: Item;
  creator?: boolean;
  nav: (p: string) => void;
}) {
  const filter = creator
    ? 'creator_slug=' + encodeURIComponent(item.creator_slug)
    : 'category_group_slug=' + encodeURIComponent(item.category_groups?.[0]?.slug || '');
  const result = useCatalog(filter + '&page_size=7');
  const filtered = {
    ...result,
    data: result.data
      ? { ...result.data, items: result.data.items.filter((i) => i.id !== item.id).slice(0, 6) }
      : null
  };
  if (filtered.data && !filtered.data.items.length) return null;
  return (
    <section className="collection related">
      <div className="section-head">
        <h2>{creator ? 'More by ' + item.creator_name : 'Similar templates'}</h2>
        <button
          className="text-button"
          onClick={() => {
            forgetBrowse();
            nav('/templates/all?' + filter);
          }}
        >
          View all
        </button>
      </div>
      <Results result={filtered} nav={nav} />
    </section>
  );
}
function Detail({ slug, nav }: { slug: string; nav: (p: string) => void }) {
  const result = useCatalog('template_slug=' + encodeURIComponent(slug) + '&page_size=1');
  const [preview, setPreview] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const heroEnd = useRef<HTMLDivElement>(null);
  const item = result.data?.items.find((i) => i.template_slug === slug);
  useEffect(() => {
    if (!item || !heroEnd.current) return;
    const observer = new IntersectionObserver(
      (entries) => setSticky(entries[0].boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(heroEnd.current);
    return () => observer.disconnect();
  }, [item]);
  if (result.loading)
    return (
      <main id="main" className="empty" role="status">
        Loading template details…
      </main>
    );
  if (result.error)
    return (
      <main id="main" className="empty" role="alert">
        <h1>Details unavailable</h1>
        <p>{result.error}</p>
        <button onClick={result.retry}>Try again</button>
      </main>
    );
  if (!item)
    return (
      <main id="main" className="empty">
        <h1>Template not found</h1>
        <button onClick={() => nav('/templates/all')}>Browse templates</button>
      </main>
    );
  const site = safePreviewUrl(item.website_url),
    listing = safeMarketplaceUrl(item.url),
    designer = safeMarketplaceUrl(item.preview_url);
  const price = item.is_free ? 'Free' : item.price == null ? 'See listing' : `$${item.price}`;
  const browse = (key: string, value: string) => {
    forgetBrowse();
    nav('/templates/all?' + new URLSearchParams({ [key]: value }));
  };
  return (
    <main id="main" className="detail">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <a
          href="/templates/all"
          onClick={(e) => {
            if (e.button === 0 && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              nav('/templates/all');
            }
          }}
        >
          All templates
        </a>
        <span aria-hidden>/</span>
        {item.category_groups?.slice(0, 1).map((c) => (
          <a
            key={c.slug}
            href={'/templates/all?category_group_slug=' + c.slug}
            onClick={(e) => {
              e.preventDefault();
              browse('category_group_slug', c.slug);
            }}
          >
            {c.name}
          </a>
        ))}
      </nav>
      <div className="detail-heading">
        <div>
          <h1>{item.name}</h1>
          <p className="byline">
            Designed by{' '}
            <a
              href={'/templates/all?creator_slug=' + item.creator_slug}
              onClick={(e) => {
                e.preventDefault();
                browse('creator_slug', item.creator_slug);
              }}
            >
              {item.creator_name}
            </a>
          </p>
        </div>
        <button
          className="share-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(listing || location.href);
              setCopied(true);
              setCopyError(false);
            } catch {
              setCopied(false);
              setCopyError(true);
            }
          }}
        >
          {copied ? 'Link copied' : 'Copy listing link'}
        </button>
        {copyError && (
          <p role="alert" className="copy-error">
            Couldn’t copy the link.{' '}
            <a href={listing || '#'} target="_blank" rel="noreferrer">
              Open the listing
            </a>{' '}
            and copy its address.
          </p>
        )}
      </div>
      <div className="detail-layout">
        <div>
          <button
            className="detail-preview"
            aria-label={'Preview ' + item.name + ' website'}
            onClick={() => setPreview(true)}
            disabled={!site}
          >
            <img
              className="detail-image"
              src={safeImageUrl(item.thumbnail_image_url) || undefined}
              alt={item.name + ' website preview'}
            />
            <span>Preview website</span>
          </button>
          <div ref={heroEnd} />
          <p className="detail-summary">{item.description_short}</p>
          <div className="detail-highlights">
            <span>{item.template_type}</span>
            {item.included_pages?.length > 0 && (
              <span>{item.included_pages.length} included pages</span>
            )}
            <span>{item.is_free ? 'Free template' : 'Single use license'}</span>
          </div>
          {item.is_featured && item.reviewer_pick_reason && (
            <section className="reviewer-note">
              <h2>Why it’s featured</h2>
              <p>{item.reviewer_pick_reason}</p>
            </section>
          )}
          <ListingSections slug={slug} listing={listing} />
          {!!item.included_pages?.length && (
            <section className="included-pages">
              <h2>Included pages</h2>
              <ul>
                {item.included_pages.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="offer" aria-label="Template price and preview">
          <h2>{price}</h2>
          <p>
            {item.is_free ? 'No template purchase fee.' : 'One-time template purchase on Webflow.'}
          </p>
          {listing && (
            <a className="primary" href={listing} target="_blank" rel="noreferrer">
              {item.is_free ? 'Use this template' : 'Get this template'}
            </a>
          )}
          {site && <button onClick={() => setPreview(true)}>Preview website</button>}
          {designer && (
            <a className="secondary-action" href={designer} target="_blank" rel="noreferrer">
              Preview in Designer
            </a>
          )}
          <dl>
            <dt>Structure</dt>
            <dd>{item.template_type || 'See listing'}</dd>
            <dt>Categories</dt>
            <dd className="taxonomy-links">
              {item.category_groups?.map((c) => (
                <button key={c.slug} onClick={() => browse('category_group_slug', c.slug)}>
                  {c.name}
                </button>
              ))}
            </dd>
            {!!item.child_categories?.length && (
              <>
                <dt>Subcategories</dt>
                <dd className="taxonomy-links">
                  {item.child_categories.map((c) => (
                    <button key={c.slug} onClick={() => browse('child_category_slug', c.slug)}>
                      {c.name}
                    </button>
                  ))}
                </dd>
              </>
            )}
            <dt>Styles</dt>
            <dd className="taxonomy-links">
              {item.styles?.map((c) => (
                <button key={c.slug} onClick={() => browse('style_slug', c.slug)}>
                  {c.name}
                </button>
              ))}
            </dd>
            {!!item.tags?.length && (
              <>
                <dt>Tags</dt>
                <dd className="taxonomy-links">
                  {item.tags.map((c) => (
                    <button key={c.slug} onClick={() => browse('tag_slug', c.slug)}>
                      {c.name}
                    </button>
                  ))}
                </dd>
              </>
            )}
            <dt>Built for</dt>
            <dd>Webflow Designer</dd>
          </dl>
          <p className="fine">Review current pricing and license terms on the official listing.</p>
        </aside>
      </div>
      <Related item={item} nav={nav} />
      <Related item={item} creator nav={nav} />
      {sticky && (
        <div className="sticky-offer">
          <div>
            <strong>{item.name}</strong>
            <span>{price}</span>
          </div>
          <div>
            {site && <button onClick={() => setPreview(true)}>Preview</button>}
            {listing && (
              <a className="primary" href={listing} target="_blank" rel="noreferrer">
                Get template
              </a>
            )}
          </div>
        </div>
      )}
      {preview && site && (
        <PreviewDialog name={item.name} url={site} close={() => setPreview(false)} />
      )}
    </main>
  );
}
