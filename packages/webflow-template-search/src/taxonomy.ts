import { getTaxonomyMetadata, resolveAlias } from './db.js';
import type { Env, TaxonomyMetadataItem, TemplateScope } from './types.js';

export interface TaxonomyMetadataPayload {
  category_group: TaxonomyMetadataItem | null;
  child_category: TaxonomyMetadataItem | null;
  title: string | null;
  description: string;
}

export interface TemplatePageMetadataPayload extends TaxonomyMetadataPayload {
  path: string;
  page_kind: 'all' | 'featured' | 'free' | 'landing_pages' | 'category' | 'subcategory' | 'style' | 'tag' | 'search';
  scope: TemplateScope;
  canonical_path: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  heading: {
    title: string;
    description: string;
  };
}

const SCOPE_TITLES: Record<TemplateScope, string> = {
  all: 'All Website Templates',
  featured: 'Featured Website Templates',
  free: 'Free Website Templates',
  landing_pages: 'Landing Page Website Templates',
};

const SCOPE_BREADCRUMBS: Record<TemplateScope, string> = {
  all: 'All',
  featured: 'Featured',
  free: 'Free',
  landing_pages: 'Landing Pages',
};

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'and') return '&';
      if (lower === 'ui') return 'UI';
      if (lower === 'hr') return 'HR';
      if (lower === 'it') return 'IT';
      if (lower === 'ai') return 'AI';
      if (lower === 'nft') return 'NFT';
      if (lower === 'nfts') return 'NFTs';
      if (lower === 'saas') return 'SaaS';
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ')
    .replace(/\s+&\s+/g, ' & ');
}

function humanizeSlug(slug: string): string {
  return titleCase(slug.replace(/-websites?$/i, '').replace(/-templates?$/i, '').replace(/-/g, ' '));
}

function formatTaxonomyName(value: string): string {
  return value
    .replace(/\bIt\b/g, 'IT')
    .replace(/\bIT company\b/g, 'IT Company')
    .replace(/\bUi\b/g, 'UI')
    .replace(/\bHr\b/g, 'HR')
    .replace(/\bAi\b/g, 'AI')
    .replace(/\bSaas\b/g, 'SaaS')
    .replace(/\bNfts\b/g, 'NFTs')
    .replace(/\bNft\b/g, 'NFT');
}

function formatTaxonomyItem(item: TaxonomyMetadataItem | null): TaxonomyMetadataItem | null {
  return item
    ? {
        ...item,
        name: formatTaxonomyName(item.name),
        parent_category_group_name: item.parent_category_group_name
          ? formatTaxonomyName(item.parent_category_group_name)
          : item.parent_category_group_name,
      }
    : null;
}

function readPath(url: URL): string {
  const raw = url.searchParams.get('path') ?? url.searchParams.get('url') ?? url.pathname;
  try {
    return new URL(raw).pathname.replace(/\/+$/, '') || '/templates';
  } catch {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return path.replace(/\/+$/, '') || '/templates';
  }
}

function inferPageKind(path: string): TemplatePageMetadataPayload['page_kind'] {
  if (path === '/templates/search' || path === '/templates/search-v2') return 'search';
  if (path === '/templates/featured') return 'featured';
  if (path === '/templates/free' || path === '/templates/free-website-templates') return 'free';
  if (/\/templates\/landing-page(s)?($|\/)/.test(path)) return 'landing_pages';
  if (/\/templates\/category\/([^/?#]+)/.test(path)) return 'category';
  if (/\/templates\/subcategory\/([^/?#]+)/.test(path)) return 'subcategory';
  if (/\/templates\/style\/([^/?#]+)/.test(path)) return 'style';
  if (/\/templates\/tag\/([^/?#]+)/.test(path)) return 'tag';
  return 'all';
}

function inferScope(pageKind: TemplatePageMetadataPayload['page_kind']): TemplateScope {
  if (pageKind === 'featured' || pageKind === 'free' || pageKind === 'landing_pages') return pageKind;
  return 'all';
}

function extractPathSlug(path: string, segment: 'category' | 'subcategory' | 'style' | 'tag'): string | null {
  const match = path.match(new RegExp(`/templates/${segment}/([^/?#]+)`));
  return match?.[1] ?? null;
}

function buildCanonicalPath(pageKind: TemplatePageMetadataPayload['page_kind'], path: string, activeSlug: string | null): string {
  if (pageKind === 'category' && activeSlug) return `/templates/category/${activeSlug}`;
  if (pageKind === 'subcategory' && activeSlug) return `/templates/subcategory/${activeSlug}`;
  if (pageKind === 'featured') return '/templates/featured';
  if (pageKind === 'free') return '/templates/free-website-templates';
  if (pageKind === 'landing_pages') return '/templates/landing-page';
  if (pageKind === 'search') return '/templates/search-v2';
  return path || '/templates/all';
}

function buildHeadingTitle(
  pageKind: TemplatePageMetadataPayload['page_kind'],
  scope: TemplateScope,
  activeTitle: string | null,
  activeSlug: string | null,
): string {
  if (pageKind === 'search') return 'Search Webflow templates';
  if (pageKind === 'style' && activeSlug) return `${humanizeSlug(activeSlug)} Website Templates`;
  if (pageKind === 'tag' && activeSlug) return `${humanizeSlug(activeSlug)} Website Templates`;
  if (activeTitle) return `${activeTitle} Website Templates`;
  if (activeSlug) return `${humanizeSlug(activeSlug)} Website Templates`;
  return SCOPE_TITLES[scope];
}

export async function getTemplateTaxonomyMetadata(env: Env, url: URL): Promise<TaxonomyMetadataPayload> {
  const categoryGroupSlug = url.searchParams.get('category_group_slug')?.trim() || null;
  const rawChildCategorySlug = url.searchParams.get('child_category_slug')?.trim() || null;
  const childCategorySlug = await resolveAlias(env.DB, 'child_category', rawChildCategorySlug);

  const childCategory = await getTaxonomyMetadata(env.DB, 'child_category', childCategorySlug);
  const resolvedCategoryGroupSlug = categoryGroupSlug ?? childCategory?.parent_category_group_slug ?? null;
  const categoryGroup = await getTaxonomyMetadata(env.DB, 'category_group', resolvedCategoryGroupSlug);
  const active = childCategory ?? categoryGroup;
  const formattedCategoryGroup = formatTaxonomyItem(categoryGroup);
  const formattedChildCategory = formatTaxonomyItem(childCategory);
  const activeDescription = active?.description_landing_page.trim() || active?.description_short.trim() || '';
  const parentDescription =
    categoryGroup?.description_landing_page.trim() || categoryGroup?.description_short.trim() || '';

  return {
    category_group: formattedCategoryGroup,
    child_category: formattedChildCategory,
    title: active?.name ? formatTaxonomyName(active.name) : null,
    description: activeDescription || (childCategory ? parentDescription : ''),
  };
}

export async function getTemplatePageMetadata(env: Env, url: URL): Promise<TemplatePageMetadataPayload> {
  const path = readPath(url);
  const pageKind = inferPageKind(path);
  const scope = inferScope(pageKind);
  const rawCategorySlug =
    url.searchParams.get('category_group_slug')?.trim() ||
    (pageKind === 'category' ? extractPathSlug(path, 'category') : null);
  const rawChildCategorySlug =
    url.searchParams.get('child_category_slug')?.trim() ||
    (pageKind === 'subcategory' ? extractPathSlug(path, 'subcategory') : null);
  const styleSlug = pageKind === 'style' ? extractPathSlug(path, 'style') : null;
  const tagSlug = pageKind === 'tag' ? extractPathSlug(path, 'tag') : null;
  const childCategorySlug = await resolveAlias(env.DB, 'child_category', rawChildCategorySlug);
  const childCategory = await getTaxonomyMetadata(env.DB, 'child_category', childCategorySlug);
  const categoryGroupSlug = rawCategorySlug ?? childCategory?.parent_category_group_slug ?? null;
  const categoryGroup = await getTaxonomyMetadata(env.DB, 'category_group', categoryGroupSlug);
  const active = childCategory ?? categoryGroup;
  const formattedCategoryGroup = formatTaxonomyItem(categoryGroup);
  const formattedChildCategory = formatTaxonomyItem(childCategory);
  const activeName = active?.name ? formatTaxonomyName(active.name) : null;
  const activeSlug = active?.slug ?? styleSlug ?? tagSlug ?? null;
  const activeDescription = active?.description_landing_page.trim() || active?.description_short.trim() || '';
  const parentDescription =
    categoryGroup?.description_landing_page.trim() || categoryGroup?.description_short.trim() || '';
  const description = activeDescription || (childCategory ? parentDescription : '');
  const title = buildHeadingTitle(pageKind, scope, activeName, activeSlug);
  const canonicalPath = buildCanonicalPath(pageKind, path, activeSlug);
  const breadcrumbs: TemplatePageMetadataPayload['breadcrumbs'] = [{ label: 'Templates', href: '/templates' }];

  if (pageKind === 'category' || pageKind === 'subcategory' || pageKind === 'all') {
    breadcrumbs.push({ label: 'Categories', href: '/templates/categories' });
  }

  if (pageKind === 'subcategory' && formattedCategoryGroup) {
    breadcrumbs.push({ label: formattedCategoryGroup.name, href: `/templates/category/${formattedCategoryGroup.slug}` });
  }

  if (pageKind === 'search') {
    breadcrumbs.push({ label: 'Search' });
  } else if (activeName) {
    breadcrumbs.push({ label: activeName });
  } else if (pageKind === 'style' && styleSlug) {
    breadcrumbs.push({ label: humanizeSlug(styleSlug) });
  } else if (pageKind === 'tag' && tagSlug) {
    breadcrumbs.push({ label: humanizeSlug(tagSlug) });
  } else {
    breadcrumbs.push({ label: SCOPE_BREADCRUMBS[scope] });
  }

  return {
    path,
    page_kind: pageKind,
    scope,
    canonical_path: canonicalPath,
    category_group: formattedCategoryGroup,
    child_category: formattedChildCategory,
    title: activeName ?? (activeSlug ? humanizeSlug(activeSlug) : null),
    description,
    breadcrumbs,
    heading: {
      title,
      description,
    },
  };
}
