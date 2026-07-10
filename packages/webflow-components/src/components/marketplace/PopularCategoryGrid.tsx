import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MarketplaceExperimentRole, trackMarketplaceEvent } from './analytics';

import { resolveApiBase, type TemplateSort } from './templateRoute';
type ColumnSetting = 'auto' | 'two' | 'three' | 'four';
type CategoryLayout = 'icon_table' | 'thumbnail_cards';
type PopularCategoryIconName =
  | 'portfolio'
  | 'technology'
  | 'blog'
  | 'services'
  | 'ecommerce'
  | 'real_estate'
  | 'startup'
  | 'education'
  | 'wellness'
  | 'food'
  | 'architecture'
  | 'default';

interface PopularCategoryLink {
  href: string;
  target?: string;
}

export interface PopularCategoryGridCategory {
  title: string;
  slug: string;
  href?: string;
  count?: number;
  icon?: PopularCategoryIconName;
  imageUrls?: string[];
}

interface ApiItem {
  name: string;
  thumbnail_image_url: string | null;
  thumbnail_image_secondary_url: string | null;
}

interface ApiResponse {
  items: ApiItem[];
  pagination?: {
    total_items?: number;
  };
}

interface CategoryPill {
  name: string;
  slug: string;
  url?: string;
  count?: number;
}

interface CategoryPillsResponse {
  category_pills?: CategoryPill[];
}

interface CategoryResult {
  images: Array<{ src: string; alt: string }>;
  count?: number;
}

export interface PopularCategoryGridProps {
  /** Base URL for the template search API, no trailing slash. */
  apiBase?: string;
  /** Section heading. */
  title?: string;
  /** Optional eyebrow above the section heading. */
  eyebrow?: string;
  /** Section subheading. */
  description?: string;
  /** CTA label. */
  ctaLabel?: string;
  /** CTA link override. */
  ctaLink?: PopularCategoryLink;
  /** JSON array of {title, slug, href?, count?, imageUrls?}. */
  categories?: string;
  /** Populate categories and counts from the search API category pills. */
  useSearchCategories?: boolean;
  /** Maximum categories to render. */
  maxCategories?: number;
  /** Number of template thumbnails per category card. */
  thumbnailsPerCategory?: number;
  /** Visual layout for category cards. */
  layout?: CategoryLayout;
  /** API sort used when fetching category thumbnails. */
  sort?: TemplateSort;
  /** Fetch current category thumbnails and counts from the template search API. */
  fetchImages?: boolean;
  /** Show category template counts. */
  showCounts?: boolean;
  /** Grid column behavior. Auto mirrors the exported marketplace section. */
  columns?: ColumnSetting;
  /** Track CTA and category clicks through wf_analytics and a custom DOM event. */
  enableAnalytics?: boolean;
  /** Experiment role used by Marketplace Landing Experiment Gate selectors. */
  experimentRole?: MarketplaceExperimentRole;
}

const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;
const IMAGE_PROXY_BLOCKLIST = ['airtableusercontent.com'];

const categoryCache = new Map<string, { timestamp: number; data: CategoryResult }>();
const categoryListCache = new Map<string, { timestamp: number; data: PopularCategoryGridCategory[] }>();

export const DEFAULT_POPULAR_CATEGORIES: PopularCategoryGridCategory[] = [
  {
    title: 'Portfolio & Agency',
    slug: 'portfolio-and-agency-websites',
    href: 'https://webflow.com/templates/category/portfolio-and-agency-websites',
    count: 3838,
  },
  {
    title: 'Technology',
    slug: 'technology-websites',
    href: 'https://webflow.com/templates/category/technology-websites',
    count: 3223,
  },
  {
    title: 'Blog & Editorial',
    slug: 'blog-and-editorial-websites',
    href: 'https://webflow.com/templates/category/blog-and-editorial-websites',
    count: 610,
  },
  {
    title: 'Professional Services',
    slug: 'professional-services-websites',
    href: 'https://webflow.com/templates/category/professional-services-websites',
    count: 1781,
  },
  {
    title: 'Real Estate',
    slug: 'real-estate-websites',
    href: 'https://webflow.com/templates/category/real-estate-websites',
    count: 348,
  },
  {
    title: 'Retail & E-Commerce',
    slug: 'retail-and-e-commerce-websites',
    href: 'https://webflow.com/templates/category/retail-and-e-commerce-websites',
    count: 846,
  },
  {
    title: 'Food & Drink',
    slug: 'food-and-drink-websites',
    href: 'https://webflow.com/templates/category/food-and-drink-websites',
    count: 411,
  },
  {
    title: 'Education',
    slug: 'education-websites',
    href: 'https://webflow.com/templates/category/education-websites',
    count: 283,
  },
  {
    title: 'Community & Nonprofit',
    slug: 'community-and-nonprofit-websites',
    href: 'https://webflow.com/templates/category/community-and-nonprofit-websites',
    count: 167,
  },
  {
    title: 'Home Services',
    slug: 'home-services-websites',
    href: 'https://webflow.com/templates/category/home-services-websites',
    count: 423,
  },
];

export const DEFAULT_POPULAR_CATEGORIES_JSON = JSON.stringify(DEFAULT_POPULAR_CATEGORIES);

const POPULAR_CATEGORY_GRID_STYLES = `
.mpcat-section,
.mpcat-section * {
  box-sizing: border-box;
}

.mpcat-section {
  width: 100%;
  margin-bottom: 4rem;
  color: #080808;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.mpcat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.mpcat-copy {
  min-width: 0;
}

.mpcat-eyebrow {
  margin: 0 0 6px;
  color: #757575;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  text-transform: uppercase;
}

.mpcat-title {
  margin: 0;
  color: #080808;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
}

.mpcat-description {
  margin: 4px 0 0;
  color: #757575;
  font-size: 18px;
  font-weight: 400;
  line-height: 1.6;
}

.mpcat-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  color: #080808;
  background: transparent;
  border-radius: 2px;
  font-size: 15px;
  font-weight: 600;
  line-height: 24px;
  text-decoration: none;
}

.mpcat-cta:hover {
  color: #146ef5;
}

.mpcat-grid {
  display: grid;
  grid-template-rows: minmax(150px, 1fr);
  grid-auto-rows: minmax(150px, 1fr);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.mpcat-grid[data-columns="two"] {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mpcat-grid[data-columns="three"] {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.mpcat-grid[data-columns="four"] {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.mpcat-grid[data-layout="icon_table"] {
  grid-template-rows: auto;
  grid-auto-rows: auto;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.mpcat-card {
  min-width: 0;
  min-height: 150px;
  display: flex;
  justify-content: space-between;
  overflow: hidden;
  color: #080808;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  text-decoration: none;
}

.mpcat-icon-card {
  min-height: 108px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 16px;
  color: #080808;
  background: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 6px;
  text-decoration: none;
}

.mpcat-icon-card:hover {
  border-color: #c9c9c9;
}

.mpcat-icon-card:focus-visible {
  outline: 2px solid #146ef5;
  outline-offset: 3px;
}

.mpcat-icon-box {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #5f5f5f;
}

.mpcat-icon-box svg {
  width: 20px;
  height: 20px;
  display: block;
}

.mpcat-icon-card-title {
  margin: 0;
  color: #080808;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
}

.mpcat-icon-card-count {
  margin-top: 3px;
  color: #757575;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.25;
}

.mpcat-card:hover {
  border-color: #c9c9c9;
}

.mpcat-card:focus-visible {
  outline: 2px solid #146ef5;
  outline-offset: 3px;
}

.mpcat-content {
  min-width: 50%;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 8px;
  padding: 45px 16px 45px 32px;
}

.mpcat-card-title {
  width: min(12ch, 100%);
  margin: 0;
  color: #080808;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
}

.mpcat-count {
  color: #757575;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
}

.mpcat-media {
  align-self: stretch;
  flex: 1.1;
  display: flex;
  min-width: 0;
  margin-right: -1px;
}

.mpcat-thumb {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: #f5f5f5;
  box-shadow: -2px 0 28px rgba(0, 0, 0, 0.12);
}

.mpcat-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 150px;
  object-fit: cover;
  object-position: 0% 50%;
}

.mpcat-placeholder {
  width: 100%;
  height: 100%;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  background:
    linear-gradient(135deg, rgba(20, 110, 245, 0.12), rgba(0, 0, 0, 0) 55%),
    linear-gradient(180deg, #f7f7f7, #eeeeee);
  font-size: 13px;
  font-weight: 600;
}

.mpcat-card[data-loading="true"] .mpcat-placeholder {
  background:
    linear-gradient(90deg, #f3f3f3 0%, #e8e8e8 40%, #f3f3f3 80%);
  background-size: 220% 100%;
  color: transparent;
  animation: mpcat-loading 1.2s ease-in-out infinite;
}

@keyframes mpcat-loading {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

@media (max-width: 991px) {
  .mpcat-grid,
  .mpcat-grid[data-columns="three"],
  .mpcat-grid[data-columns="four"] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mpcat-grid[data-layout="icon_table"] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .mpcat-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .mpcat-description {
    margin-bottom: 0;
    font-size: 16px;
    line-height: 1.5;
  }

  .mpcat-grid,
  .mpcat-grid[data-columns="two"],
  .mpcat-grid[data-columns="three"],
  .mpcat-grid[data-columns="four"] {
    grid-template-columns: 1fr;
  }

  .mpcat-grid[data-layout="icon_table"] {
    grid-template-columns: 1fr;
  }

  .mpcat-content {
    min-width: 147px;
    padding-left: 24px;
  }

  .mpcat-card-title {
    width: min(11ch, 100%);
  }
}
`;


function normalizeLimit(value: number | undefined, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.round(numeric), min), max);
}

function normalizeCategory(value: unknown): PopularCategoryGridCategory | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PopularCategoryGridCategory>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const slug = typeof candidate.slug === 'string' ? candidate.slug.trim() : '';
  if (!title || !slug) return null;

  const href = typeof candidate.href === 'string' && candidate.href.trim()
    ? candidate.href.trim()
    : `https://webflow.com/templates/category/${slug}`;
  const count = typeof candidate.count === 'number' && Number.isFinite(candidate.count)
    ? candidate.count
    : undefined;
  const icon = typeof candidate.icon === 'string' ? candidate.icon as PopularCategoryIconName : undefined;
  const imageUrls = Array.isArray(candidate.imageUrls)
    ? candidate.imageUrls.filter((url): url is string => typeof url === 'string' && Boolean(url.trim()))
    : undefined;

  return { title, slug, href, count, icon, imageUrls };
}

function parseCategories(categoriesJson?: string): PopularCategoryGridCategory[] {
  if (!categoriesJson?.trim()) return DEFAULT_POPULAR_CATEGORIES;

  try {
    const parsed = JSON.parse(categoriesJson) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_POPULAR_CATEGORIES;
    const categories = parsed.map(normalizeCategory).filter(Boolean) as PopularCategoryGridCategory[];
    return categories.length > 0 ? categories : DEFAULT_POPULAR_CATEGORIES;
  } catch {
    return DEFAULT_POPULAR_CATEGORIES;
  }
}

function proxyImageUrl(imageUrl: string, apiBase: string): string {
  try {
    const host = new URL(imageUrl).hostname;
    if (IMAGE_PROXY_BLOCKLIST.some((blocked) => host.includes(blocked))) {
      const proxyBase = apiBase.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${apiBase}`
        : apiBase;
      return `${proxyBase}/api/avatar?url=${encodeURIComponent(imageUrl)}`;
    }
  } catch {
    return imageUrl;
  }
  return imageUrl;
}

function buildCategoryUrl(base: string, slug: string, sort: TemplateSort, limit: number): string {
  const absolute = base.startsWith('/') && typeof window !== 'undefined'
    ? `${window.location.origin}${base}`
    : base;
  const url = new URL(`${absolute}/api/templates/search`);
  url.searchParams.set('include', 'items');
  url.searchParams.set('page', '1');
  url.searchParams.set('page_size', String(limit));
  url.searchParams.set('sort', sort);
  url.searchParams.set('category_group_slug', slug);
  return url.toString();
}

function buildCategoryPillsUrl(base: string): string {
  const absolute = base.startsWith('/') && typeof window !== 'undefined'
    ? `${window.location.origin}${base}`
    : base;
  const url = new URL(`${absolute}/api/templates/search`);
  url.searchParams.set('include', 'pills');
  url.searchParams.set('page', '1');
  url.searchParams.set('page_size', '1');
  url.searchParams.set('sort', 'popular');
  return url.toString();
}

async function fetchSearchCategories(
  apiBase: string,
  maxCategories: number,
  signal: AbortSignal,
): Promise<PopularCategoryGridCategory[]> {
  const requestUrl = buildCategoryPillsUrl(apiBase);
  const cached = categoryListCache.get(requestUrl);
  if (cached && Date.now() - cached.timestamp < CATEGORY_CACHE_TTL_MS) {
    return cached.data.slice(0, maxCategories);
  }

  const response = await fetch(requestUrl, { signal });
  if (!response.ok) throw new Error(`Template category pills failed with ${response.status}`);
  const payload = (await response.json()) as CategoryPillsResponse;
  const categories = (payload.category_pills ?? [])
    .map((pill) => normalizeCategory({
      title: pill.name,
      slug: pill.slug,
      href: pill.url,
      count: pill.count,
    }))
    .filter(Boolean) as PopularCategoryGridCategory[];

  const sorted = categories.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  categoryListCache.set(requestUrl, { timestamp: Date.now(), data: sorted });
  return sorted.slice(0, maxCategories);
}

async function fetchCategoryResult(
  apiBase: string,
  category: PopularCategoryGridCategory,
  sort: TemplateSort,
  thumbnailLimit: number,
  signal: AbortSignal,
): Promise<[string, CategoryResult]> {
  const requestUrl = buildCategoryUrl(apiBase, category.slug, sort, thumbnailLimit);
  const cached = categoryCache.get(requestUrl);
  if (cached && Date.now() - cached.timestamp < CATEGORY_CACHE_TTL_MS) {
    return [category.slug, cached.data];
  }

  const response = await fetch(requestUrl, { signal });
  if (!response.ok) throw new Error(`Template category search failed with ${response.status}`);
  const payload = (await response.json()) as ApiResponse;
  const result: CategoryResult = {
    count: payload.pagination?.total_items ?? category.count,
    images: payload.items
      .map((item) => item.thumbnail_image_url ?? item.thumbnail_image_secondary_url)
      .filter((src): src is string => Boolean(src))
      .slice(0, thumbnailLimit)
      .map((src, index) => ({
        src: proxyImageUrl(src, apiBase),
        alt: `${category.title} template ${index + 1}`,
      })),
  };

  categoryCache.set(requestUrl, { timestamp: Date.now(), data: result });
  return [category.slug, result];
}

function fallbackImages(category: PopularCategoryGridCategory, thumbnailLimit: number): CategoryResult {
  return {
    count: category.count,
    images: (category.imageUrls ?? []).slice(0, thumbnailLimit).map((src, index) => ({
      src,
      alt: `${category.title} template ${index + 1}`,
    })),
  };
}

function formatCount(value?: number): string {
  if (!value) return '';
  return `${new Intl.NumberFormat('en-US').format(value)} templates`;
}

function inferIcon(category: PopularCategoryGridCategory): PopularCategoryIconName {
  if (category.icon) return category.icon;
  const raw = `${category.slug} ${category.title}`.toLowerCase();
  if (raw.includes('portfolio') || raw.includes('agency')) return 'portfolio';
  if (raw.includes('tech') || raw.includes('software') || raw.includes('saas')) return 'technology';
  if (raw.includes('blog') || raw.includes('editorial')) return 'blog';
  if (raw.includes('service')) return 'services';
  if (raw.includes('commerce') || raw.includes('retail')) return 'ecommerce';
  if (raw.includes('real-estate') || raw.includes('real estate')) return 'real_estate';
  if (raw.includes('startup') || raw.includes('launch')) return 'startup';
  if (raw.includes('education')) return 'education';
  if (raw.includes('wellness') || raw.includes('health') || raw.includes('medical')) return 'wellness';
  if (raw.includes('food') || raw.includes('restaurant') || raw.includes('drink')) return 'food';
  if (raw.includes('architecture') || raw.includes('design')) return 'architecture';
  return 'default';
}

function CategoryIcon({ name }: { name: PopularCategoryIconName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'portfolio':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M8 7V5.8C8 4.8 8.8 4 9.8 4h4.4c1 0 1.8.8 1.8 1.8V7M5 7h14v11H5zM5 11h14" /></svg>;
    case 'technology':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M8 4h8v16H8zM10.5 7h3M10.5 17h3M6 8H4M6 12H4M6 16H4M20 8h-2M20 12h-2M20 16h-2" /></svg>;
    case 'blog':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M6 5h12v14H6zM9 9h6M9 12h6M9 15h3" /></svg>;
    case 'services':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M8 12h8M12 8v8M5 5h14v14H5z" /></svg>;
    case 'ecommerce':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M6 7h12l-1 10H7zM9 7a3 3 0 0 1 6 0M9 19h.1M15 19h.1" /></svg>;
    case 'real_estate':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m4 11 8-7 8 7M6 10v10h12V10M10 20v-5h4v5" /></svg>;
    case 'startup':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M12 3c3 2 4.5 4.8 4.5 8.2L20 15l-4 1.2L12 21l-4-4.8L4 15l3.5-3.8C7.5 7.8 9 5 12 3ZM12 10h.1" /></svg>;
    case 'education':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m4 9 8-4 8 4-8 4zM7 11v4c1.5 1.4 3.2 2 5 2s3.5-.6 5-2v-4" /></svg>;
    case 'wellness':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M12 20s-7-4.2-7-10a3.8 3.8 0 0 1 6.7-2.4A3.8 3.8 0 0 1 18.4 10c0 5.8-6.4 10-6.4 10Z" /></svg>;
    case 'food':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M7 4v16M4 4v5a3 3 0 0 0 6 0V4M16 4v16M16 4c2.2 1 3.5 2.7 3.5 5.2 0 2.2-1.2 3.8-3.5 4.8" /></svg>;
    case 'architecture':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M4 20h16M6 20V9l6-4 6 4v11M9 20v-6h6v6" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" /></svg>;
  }
}

function placeholderLabel(title: string, index: number): string {
  const initials = title
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .replace(/[^a-z]/gi, '')
    .slice(0, 2)
    .toUpperCase();
  return index === 0 ? initials || 'WF' : '';
}

export const PopularCategoryGrid: React.FC<PopularCategoryGridProps> = ({
  apiBase: apiBaseProp,
  title = 'Find templates by use case',
  eyebrow = 'Popular categories',
  description = 'Ten popular launch points to start your template search.',
  ctaLabel = 'Browse popular categories',
  ctaLink,
  categories: categoriesJson,
  useSearchCategories = true,
  maxCategories = 10,
  thumbnailsPerCategory = 3,
  layout = 'icon_table',
  sort = 'popular',
  fetchImages = true,
  showCounts = false,
  columns = 'auto',
  enableAnalytics = true,
  experimentRole = 'treatment',
}) => {
  const apiBase = resolveApiBase(apiBaseProp);
  const selectedCategoryLimit = normalizeLimit(maxCategories, 10, 1, 12);
  const thumbnailLimit = normalizeLimit(thumbnailsPerCategory, 3, 1, 3);
  const parsedCategories = useMemo(() => parseCategories(categoriesJson), [categoriesJson]);
  const [searchCategories, setSearchCategories] = useState<PopularCategoryGridCategory[] | null>(null);
  const visibleCategories = useMemo(
    () => (searchCategories ?? parsedCategories).slice(0, selectedCategoryLimit),
    [parsedCategories, searchCategories, selectedCategoryLimit],
  );
  const [resultsBySlug, setResultsBySlug] = useState<Record<string, CategoryResult>>({});
  const [isLoading, setIsLoading] = useState(fetchImages);

  useEffect(() => {
    if (!useSearchCategories) {
      setSearchCategories(null);
      return;
    }

    const controller = new AbortController();
    fetchSearchCategories(apiBase, selectedCategoryLimit, controller.signal)
      .then((categories) => {
        if (!controller.signal.aborted) setSearchCategories(categories);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSearchCategories(null);
      });

    return () => controller.abort();
  }, [apiBase, selectedCategoryLimit, useSearchCategories]);

  useEffect(() => {
    if (layout === 'icon_table' || !fetchImages || visibleCategories.length === 0) {
      setIsLoading(false);
      setResultsBySlug({});
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    Promise.allSettled(
      visibleCategories.map((category) =>
        fetchCategoryResult(apiBase, category, sort, thumbnailLimit, controller.signal),
      ),
    )
      .then((settled) => {
        if (controller.signal.aborted) return;
        const next: Record<string, CategoryResult> = {};
        settled.forEach((entry, index) => {
          const category = visibleCategories[index];
          if (!category) return;
          if (entry.status === 'fulfilled') {
            const [slug, result] = entry.value;
            next[slug] = result;
          } else {
            next[category.slug] = fallbackImages(category, thumbnailLimit);
          }
        });
        setResultsBySlug(next);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [apiBase, fetchImages, layout, sort, thumbnailLimit, visibleCategories]);

  const ctaHref = ctaLink?.href || 'https://webflow.com/templates/categories';
  const ctaTarget = ctaLink?.target;
  const trackGridEvent = useCallback(
    (eventName: string, data: Record<string, string | number | boolean | null | undefined> = {}) => {
      trackMarketplaceEvent(
        eventName,
        {
          component: 'PopularCategoryGrid',
          section_title: title,
          layout,
          ...data,
        },
        enableAnalytics,
      );
    },
    [enableAnalytics, layout, title],
  );

  const trackCategoryClick = useCallback(
    (category: PopularCategoryGridCategory, position: number, href: string, countLabel: string) => {
      trackGridEvent('Marketplace Landing Category Grid - Category Clicked', {
        category_title: category.title,
        category_slug: category.slug,
        category_position: position,
        category_href: href,
        category_count: category.count,
        category_count_label: countLabel || null,
      });
    },
    [trackGridEvent],
  );

  return (
    <section
      className="mpcat-section"
      aria-label={title}
      data-marketplace-component="popular-category-grid"
      data-marketplace-layout={layout}
      data-marketplace-landing-experiment={experimentRole === 'none' ? undefined : experimentRole}
    >
      <style>{POPULAR_CATEGORY_GRID_STYLES}</style>
      <div className="mpcat-header">
        <div className="mpcat-copy">
          {eyebrow ? <p className="mpcat-eyebrow">{eyebrow}</p> : null}
          <h2 className="mpcat-title">{title}</h2>
          {description ? <p className="mpcat-description">{description}</p> : null}
        </div>
        {ctaLabel ? (
          <a
            className="mpcat-cta"
            href={ctaHref}
            target={ctaTarget}
            rel={ctaTarget === '_blank' ? 'noreferrer' : undefined}
            data-marketplace-link="category-grid-cta"
            onClick={() =>
              trackGridEvent('Marketplace Landing Category Grid - CTA Clicked', {
                cta_label: ctaLabel,
                cta_href: ctaHref,
              })
            }
          >
            <span>{ctaLabel}</span>
            <span aria-hidden="true">-&gt;</span>
          </a>
        ) : null}
      </div>

      <div className="mpcat-grid" data-columns={columns} data-layout={layout}>
        {visibleCategories.map((category, index) => {
          const result = resultsBySlug[category.slug] ?? fallbackImages(category, thumbnailLimit);
          const imageSlots = Array.from({ length: thumbnailLimit }, (_, index) => result.images[index]);
          const countLabel = formatCount(result.count ?? category.count);
          const loadingCard = fetchImages && isLoading && result.images.length === 0;
          const href = category.href || `https://webflow.com/templates/category/${category.slug}`;

          if (layout === 'icon_table') {
            return (
              <a
                key={category.slug}
                className="mpcat-icon-card"
                href={href}
                data-category-slug={category.slug}
                data-marketplace-category-position={index + 1}
                onClick={() => trackCategoryClick(category, index + 1, href, countLabel)}
              >
                <span className="mpcat-icon-box">
                  <CategoryIcon name={inferIcon(category)} />
                </span>
                <span>
                  <span className="mpcat-icon-card-title">{category.title}</span>
                  {showCounts && countLabel ? <span className="mpcat-icon-card-count">{countLabel}</span> : null}
                </span>
              </a>
            );
          }

          return (
            <a
              key={category.slug}
              className="mpcat-card"
              href={href}
              data-loading={loadingCard ? 'true' : 'false'}
              data-category-slug={category.slug}
              data-marketplace-category-position={index + 1}
              onClick={() => trackCategoryClick(category, index + 1, href, countLabel)}
            >
              <div className="mpcat-content">
                <h3 className="mpcat-card-title">{category.title}</h3>
                {showCounts && countLabel ? <span className="mpcat-count">{countLabel}</span> : null}
              </div>
              <div className="mpcat-media" aria-hidden="true">
                {imageSlots.map((image, index) => (
                  <div className="mpcat-thumb" key={`${category.slug}-${index}`}>
                    {image ? (
                      <img src={image.src} alt={image.alt} loading="lazy" />
                    ) : (
                      <div className="mpcat-placeholder">{placeholderLabel(category.title, index)}</div>
                    )}
                  </div>
                ))}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};

export default PopularCategoryGrid;
