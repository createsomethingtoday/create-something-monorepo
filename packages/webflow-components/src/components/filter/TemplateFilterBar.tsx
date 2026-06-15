import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateSort = 'popular' | 'newest' | 'price_asc' | 'price_desc';
type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';
type SortDisplay = 'auto' | 'dropdown' | 'segmented';

interface StyleFacet {
  name: string;
  slug: string;
}

interface TypeFacet {
  value: string;
}

interface SubcategoryPill {
  name: string;
  slug: string;
  url: string;
  count: number;
  active: boolean;
}

interface FacetsPayload {
  applied_filters?: {
    category_group_slug: string | null;
    child_category_slug: string | null;
  };
  available_facets: {
    styles: Array<{ name: string; slug: string; count: number }>;
    types: Array<{ value: string; count: number }>;
  };
  category_pills?: SubcategoryPill[];
  subcategory_pills?: SubcategoryPill[];
}

interface LocalFilters {
  q: string;
  styles: string[];
  tags: string[];
  types: string[];
  freeOnly: boolean;
  sort: TemplateSort;
}

interface FilterEventDetail extends LocalFilters {
  categoryGroupSlug: string | null;
  childCategorySlug: string | null;
  creatorSlug: string | null;
  creatorRecordId: string | null;
  href: string;
  source: string;
  updatedAt: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TemplateFilterBarProps {
  /**
   * Base URL for the template search API (no trailing slash).
   * Must match the apiBase configured on TemplateGrid.
   * Production default: https://templates.webflow.com/templates-api
   */
  apiBase?: string;
  /**
   * Override for Designer preview of special pages.
   * In production the scope is auto-detected from the URL path.
   */
  scopeOverride?: TemplateScope;
  /**
   * Category group slug for Designer preview.
   * In production the slug is auto-detected from /templates/category/{slug}.
   */
  categorySlug?: string;
  /**
   * Creator/designer slug for Designer preview.
   * In production the slug is auto-detected from /templates/designers/{slug}.
   */
  creatorSlug?: string;
  /**
   * Optional exact creator Airtable/Webflow sync record ID for Designer pages.
   */
  creatorRecordId?: string;
  /**
   * Subcategory slug for Designer preview.
   * In production the slug is auto-detected from /templates/subcategory/{slug}.
   */
  subcategorySlug?: string;
  /**
   * Style slug for Designer preview.
   * In production the slug is auto-detected from /templates/style/{slug}.
   */
  styleSlug?: string;
  /**
   * Tag slug for Designer preview.
   * In production the slug is auto-detected from /templates/tag/{slug}.
   */
  tagSlug?: string;
  /** Show the search input */
  showSearch?: boolean;
  /** Show the Styles dropdown */
  showStyles?: boolean;
  /** Show the Types dropdown */
  showTypes?: boolean;
  /** Show the Sort dropdown */
  showSort?: boolean;
  /** Visual presentation for sort controls */
  sortDisplay?: SortDisplay;
  /** Show the Free Only checkbox */
  showFreeOnly?: boolean;
  /** Show category-scoped subcategory pills above the filters */
  showSubcategoryPills?: boolean;
  /** Default sort when none is set in the URL */
  defaultSort?: TemplateSort;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** "All styles" option label */
  stylesAllLabel?: string;
  /** Placeholder shown in the closed Styles dropdown */
  stylesLabel?: string;
  /** "All types" option label */
  typesAllLabel?: string;
  /** Placeholder shown in the closed Types dropdown */
  typesLabel?: string;
  /** "Free only" checkbox label */
  freeOnlyLabel?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_API_BASE = 'https://templates.webflow.com/templates-api';
const WORKER_ORIGIN = 'https://webflow-template-search.createsomething.workers.dev';
const CLOUD_APP_PREVIEW_ORIGIN = 'https://webflow-template-marketplace.webflow.io';
const FACETS_CACHE_TTL_MS = 5 * 60 * 1000;

const facetsPayloadCache = new Map<string, { timestamp: number; data: FacetsPayload }>();

const SORT_OPTIONS: Array<{ value: TemplateSort; label: string }> = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

type OpenPanel = 'search' | 'styles' | 'types' | 'sort' | null;

const ARROW_ICON_URL =
  'data:image/svg+xml,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20clip-path%3D%22url%28%23clip0_402_2632%29%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M12%2013.2929L15.6464%209.64648L16.3535%2010.3536L12%2014.7071L7.64641%2010.3536L8.35352%209.64648L12%2013.2929Z%22%20fill%3D%22%23404040%22/%3E%3C/g%3E%3Cdefs%3E%3CclipPath%20id%3D%22clip0_402_2632%22%3E%3Cpath%20d%3D%22M4%206C4%204.89543%204.89543%204%206%204H18C19.1046%204%2020%204.89543%2020%206V18C20%2019.1046%2019.1046%2020%2018%2020H6C4.89543%2020%204%2019.1046%204%2018V6Z%22%20fill%3D%22white%22/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E';

const FILTER_STYLES = `
.tmfilter-shell {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  color: #080808;
  font-family: "WF Visual Sans Variable", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.4;
  position: relative;
  z-index: 20;
  overflow: visible;
}

.tmfilter-shell,
.tmfilter-shell * {
  box-sizing: border-box;
}

.tmfilter-root {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1 1 auto;
  max-width: 100%;
  min-width: 0;
  position: relative;
  box-sizing: border-box;
  overflow: visible;
}

.tmfilter-filter-sort-container {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  position: relative;
  inset: auto;
  box-sizing: border-box;
  z-index: 20;
  overflow: visible;
}

.mp-subcategory {
  grid-column-gap: 8px;
  grid-row-gap: 8px;
  font-size: 14px;
  line-height: 16px;
  position: relative;
  overflow: hidden;
}

.tmfilter-subcategory {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}

.mp-subcategory.margin-bottom-1 {
  margin-bottom: 1rem;
}

.tmfilter-subcategory-scroll {
  display: block;
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.tmfilter-subcategory-track {
  justify-content: flex-start;
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
  max-width: 90vw;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  display: flex;
}

.tmfilter-subcategory-track::-webkit-scrollbar {
  display: none;
}

.tmfilter-subcategory-slide {
  flex: 0 0 auto;
  margin-right: 8px;
  font-size: 14px;
  line-height: 16px;
  position: relative;
  scroll-snap-align: start;
}

.tmfilter-subcategory-slide:last-child {
  margin-right: 0;
}

.tmfilter-subcategory .cc-subcategory {
  box-sizing: border-box;
  font-variation-settings: "wght" 570, "opsz" 14;
  background-color: #f5f5f5;
  border: 1.5px solid transparent;
  border-radius: 4px;
  color: #080808;
  flex: none;
  max-width: min(70vw, 280px);
  overflow: hidden;
  padding: 12px 16px;
  font-family: "WF Visual Sans Variable", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 16px;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.tmfilter-subcategory .cc-subcategory:hover {
  border-color: #146ef5;
}

.tmfilter-subcategory .cc-subcategory.w--current,
.tmfilter-subcategory .cc-subcategory.active,
.tmfilter-subcategory .cc-subcategory[aria-current="page"] {
  border-color: #146ef5;
}

.tmfilter-pill.is-loading {
  color: #404040;
  pointer-events: none;
}

.tmfilter-pill-separator {
  background: transparent;
  border-color: transparent;
  padding-left: 0;
  padding-right: 0;
  pointer-events: none;
}

@media (max-width: 991px) {
  .tmfilter-subcategory,
  .tmfilter-subcategory-scroll {
    max-width: none;
  }
}

@media screen and (min-width: 1280px) {
  .tmfilter-subcategory-scroll {
    max-width: 55vw;
  }
}

@media screen and (min-width: 1440px) {
  .tmfilter-subcategory-scroll {
    max-width: 50vw;
  }
}

@media screen and (min-width: 1920px) {
  .tmfilter-subcategory-scroll {
    max-width: 46vw;
  }
}

.mp-filter {
  grid-column-gap: 8px;
  grid-row-gap: 8px;
  display: flex;
}

.tmfilter-dropdown,
.tmfilter-search-wrap,
.tmfilter-free {
  box-sizing: border-box;
  color: #080808;
  font-family: "WF Visual Sans Variable", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.4;
}

.tmfilter-dropdown {
  position: relative;
  z-index: 1;
  flex: none;
  min-width: 120px;
  margin-left: 0;
  margin-right: 0;
  border-radius: 2px;
  overflow: visible;
}

.tmfilter-dropdown[data-open="true"] {
  z-index: 10000;
}

.tmfilter-sort {
  margin-left: auto;
}

.tmfilter-sort-toggle {
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  flex: none;
  min-height: 36px;
  margin-left: auto;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fff;
}

.tmfilter-sort-option {
  appearance: none;
  min-width: 96px;
  margin: 0;
  padding: 7px 14px;
  border: 0;
  border-left: 1px solid #e0e0e0;
  background: transparent;
  color: #404040;
  cursor: pointer;
  font: inherit;
  font-variation-settings: "wght" 570, "opsz" 14;
  text-align: center;
  white-space: nowrap;
}

.tmfilter-sort-option:first-child {
  border-left: 0;
}

.tmfilter-sort-option:hover {
  background: #f5f5f5;
  color: #080808;
}

.tmfilter-sort-option[data-selected="true"] {
  background: #edf3ff;
  color: #080808;
  box-shadow: inset 0 0 0 1.5px #146ef5;
}

.tmfilter-sort-option:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid #146ef5;
  outline-offset: -2px;
}

.tmfilter-trigger,
.tmfilter-search {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-height: 36px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fff;
  color: #080808;
  font: inherit;
}

.tmfilter-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  padding: 7px 0 7px 8px;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
}

.tmfilter-trigger:hover,
.tmfilter-search:hover {
  border-color: #dbdbdb;
}

.tmfilter-trigger:focus-visible,
.tmfilter-search:focus-visible,
.tmfilter-option:focus-visible {
  outline: 2px solid #146ef5;
  outline-offset: 2px;
}

.tmfilter-trigger-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tmfilter-arrow {
  width: 24px;
  height: 24px;
  flex: none;
  object-fit: contain;
  transform: rotate(0deg);
  transition: transform 160ms ease;
}

.tmfilter-trigger[aria-expanded="true"] .tmfilter-arrow {
  transform: rotate(180deg);
}

.tmfilter-panel {
  display: block;
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  width: 100%;
  max-height: 280px;
  margin-top: 8px;
  overflow: auto;
  padding: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.tmfilter-options {
  grid-column-gap: 5px;
  grid-row-gap: 5px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
}

.tmfilter-option {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  width: 100%;
  min-width: max-content;
  gap: 7px;
  padding: 10px;
  margin-bottom: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #080808;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 500;
  text-align: left;
}

.tmfilter-option:hover {
  background: rgba(20, 110, 245, 0.08);
}

.tmfilter-check {
  position: relative;
  width: 16px;
  height: 16px;
  flex: none;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fff;
}

.tmfilter-option[data-selected="true"] .tmfilter-check {
  border-color: #146ef5;
  background: #146ef5;
}

.tmfilter-option[data-selected="true"] .tmfilter-check::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border-right: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(45deg);
}

.tmfilter-option-text {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  margin-bottom: 0;
  font-size: 14px;
  letter-spacing: normal;
  white-space: nowrap;
}

.tmfilter-option-count {
  color: #757575;
  font-size: 12px;
}

.tmfilter-search-wrap {
  flex: 1 1 220px;
  min-width: 180px;
}

.tmfilter-search {
  padding: 7px 10px;
}

.tmfilter-search::placeholder {
  color: #757575;
}

.tmfilter-free {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  cursor: pointer;
  white-space: nowrap;
}

.tmfilter-free-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.tmfilter-switch {
  position: relative;
  width: 42px;
  height: 20px;
  flex: none;
}

.tmfilter-switch-bg {
  position: absolute;
  inset: 0;
  border: 1px solid #dbdbdb;
  border-radius: 100px;
  background: #e8e8e8;
  transition: background-color 160ms ease;
}

.tmfilter-switch-dot {
  position: absolute;
  z-index: 1;
  left: 2px;
  top: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.20);
  transition: left 160ms ease;
}

.tmfilter-free-input:checked + .tmfilter-switch .tmfilter-switch-bg {
  border-color: #146ef5;
  background: #146ef5;
}

.tmfilter-free-input:checked + .tmfilter-switch .tmfilter-switch-dot {
  left: 24px;
}

.tmfilter-free-input:focus-visible + .tmfilter-switch {
  outline: 2px solid #146ef5;
  outline-offset: 2px;
  border-radius: 100px;
}

@media (max-width: 767px) {
  .tmfilter-filter-sort-container {
    flex-direction: column;
    align-items: stretch;
  }

  .tmfilter-root {
    flex-direction: column;
    align-items: stretch;
  }

  .tmfilter-dropdown,
  .tmfilter-search-wrap {
    flex-basis: auto;
    max-width: none;
    width: 100%;
    min-width: 0;
  }

  .tmfilter-sort {
    margin-left: 0;
  }

  .tmfilter-sort-toggle {
    width: 100%;
    margin-left: 0;
  }

  .tmfilter-sort-option {
    flex: 1 1 0;
    min-width: 0;
  }

  .tmfilter-subcategory .cc-subcategory {
    max-width: calc(100vw - 48px);
    padding: 10px 14px;
  }

  .tmfilter-panel {
    max-height: 340px;
  }

  .tmfilter-options {
    grid-template-columns: 1fr;
  }
}
`;

// ─── URL helpers ──────────────────────────────────────────────────────────────

function toFilterSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function toStyleSlug(name: string): string {
  return toFilterSlug(name);
}

function titleCaseSlug(value: string): string {
  return value
    .replace(/-websites?$/i, '')
    .replace(/-templates?$/i, '')
    .split('-')
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

function normalizeSort(value: string | null, fallback: TemplateSort = 'popular'): TemplateSort {
  switch ((value ?? '').trim()) {
    case 'newest':
    case 'approval-date':
    case 'approval-date-desc':
      return 'newest';
    case 'price_asc':
    case 'price-asc':
      return 'price_asc';
    case 'price_desc':
    case 'price-desc':
      return 'price_desc';
    case 'popular':
    case 'popularity-score':
    case 'popularity-score-desc':
      return 'popular';
    default:
      return fallback;
  }
}

function defaultUrlFilters(defaultSort: TemplateSort = 'popular'): LocalFilters {
  return { q: '', styles: [], tags: [], types: [], freeOnly: false, sort: defaultSort };
}

function readUrlFilters(defaultSort: TemplateSort = 'popular'): LocalFilters {
  if (typeof window === 'undefined') {
    return defaultUrlFilters(defaultSort);
  }
  const params = new URL(window.location.href).searchParams;
  return {
    q: (params.get('q') ?? params.get('query') ?? params.get('search') ?? '').trim(),
    styles: params.getAll('styles').flatMap((v) => v.split(',')).filter(Boolean).map(toStyleSlug),
    tags: params.getAll('tags').flatMap((v) => v.split(',')).filter(Boolean).map(toFilterSlug),
    types: params.getAll('types').flatMap((v) => v.split(',')).filter(Boolean),
    freeOnly: ['1', 'true', 'yes', 'on'].includes((params.get('free_only') ?? '').toLowerCase()),
    sort: normalizeSort(params.get('sort'), defaultSort),
  };
}

function mergeExternalFilters(base: LocalFilters, detail: unknown, defaultSort: TemplateSort = 'popular'): LocalFilters {
  if (!detail || typeof detail !== 'object') return base;
  const patch = detail as Partial<Record<keyof LocalFilters, unknown>>;
  return {
    ...base,
    q: typeof patch.q === 'string' ? patch.q.trim() : base.q,
    styles: Array.isArray(patch.styles)
      ? patch.styles.filter((value): value is string => typeof value === 'string').map(toStyleSlug)
      : base.styles,
    tags: Array.isArray(patch.tags)
      ? patch.tags.filter((value): value is string => typeof value === 'string').map(toFilterSlug)
      : base.tags,
    types: Array.isArray(patch.types)
      ? patch.types.filter((value): value is string => typeof value === 'string')
      : base.types,
    freeOnly: typeof patch.freeOnly === 'boolean' ? patch.freeOnly : base.freeOnly,
    sort: typeof patch.sort === 'string' ? normalizeSort(patch.sort, defaultSort) : base.sort,
  };
}

function readExternalFilters(defaultSort: TemplateSort, detail: unknown): LocalFilters {
  return mergeExternalFilters(readUrlFilters(defaultSort), detail, defaultSort);
}

interface RouteContext {
  scope: 'featured' | 'free' | 'landing_pages' | null;
  categoryGroupSlug: string | null;
  childCategorySlug: string | null;
  creatorSlug: string | null;
  creatorRecordId: string | null;
  styleSlug: string | null;
  tagSlug: string | null;
}

function readRouteContext(
  scopeOverride?: TemplateScope,
  categorySlugOverride?: string,
  creatorSlugOverride?: string,
  creatorRecordIdOverride?: string,
  subcategorySlugOverride?: string,
  styleSlugOverride?: string,
  tagSlugOverride?: string,
  useWindow = true,
): RouteContext {
  if (!useWindow || typeof window === 'undefined') {
    return {
      scope: scopeOverride && scopeOverride !== 'all' ? scopeOverride : null,
      categoryGroupSlug: categorySlugOverride || null,
      childCategorySlug: subcategorySlugOverride || null,
      creatorSlug: creatorSlugOverride || null,
      creatorRecordId: creatorRecordIdOverride || null,
      styleSlug: styleSlugOverride || null,
      tagSlug: tagSlugOverride || null,
    };
  }

  const url = new URL(window.location.href);
  const pathname = url.pathname.replace(/\/+$/, '');
  const categoryMatch = pathname.match(/\/templates\/category\/([^/?#]+)/);
  const subcategoryMatch = pathname.match(/\/templates\/subcategory\/([^/?#]+)/);
  const designerMatch = pathname.match(/\/templates\/designers\/([^/?#]+)/);
  const styleMatch = pathname.match(/\/templates\/style\/([^/?#]+)/);
  const tagMatch = pathname.match(/\/templates\/tag\/([^/?#]+)/);

  let scope: RouteContext['scope'] = null;
  if (pathname === '/templates/featured') {
    scope = 'featured';
  } else if (
    pathname === '/templates/free' ||
    pathname === '/templates/free-website-templates' ||
    url.searchParams.get('pricing') === 'free'
  ) {
    scope = 'free';
  } else if (/\/templates\/landing-page(s)?($|\/)/.test(pathname)) {
    scope = 'landing_pages';
  }

  return {
    scope: scopeOverride && scopeOverride !== 'all' ? scopeOverride : scope,
    categoryGroupSlug:
      categorySlugOverride ||
      (categoryMatch
        ? categoryMatch[1]
        : (url.searchParams.get('category') ?? url.searchParams.get('category_group_slug')) || null),
    childCategorySlug:
      subcategorySlugOverride ||
      (subcategoryMatch
        ? subcategoryMatch[1]
        : (url.searchParams.get('subcategory') ?? url.searchParams.get('child_category_slug')) || null),
    creatorSlug:
      creatorSlugOverride ||
      (designerMatch
        ? toFilterSlug(designerMatch[1])
        : toFilterSlug(
            url.searchParams.get('creator_slug') ??
              url.searchParams.get('designer_slug') ??
              url.searchParams.get('creator') ??
              url.searchParams.get('designer') ??
              '',
          ) || null),
    creatorRecordId: creatorRecordIdOverride || url.searchParams.get('creator_record_id') || url.searchParams.get('designer_record_id') || null,
    styleSlug:
      styleSlugOverride ||
      (styleMatch ? styleMatch[1] : (url.searchParams.get('style_slug') ?? url.searchParams.get('style')) || null),
    tagSlug:
      tagSlugOverride ||
      (tagMatch ? tagMatch[1] : (url.searchParams.get('tag_slug') ?? url.searchParams.get('tag')) || null),
  };
}

function applyRouteContextToUrl(url: URL, context: RouteContext): void {
  if (context.scope) url.searchParams.set('scope', context.scope);
  if (context.categoryGroupSlug) url.searchParams.set('category_group_slug', context.categoryGroupSlug);
  if (context.childCategorySlug) url.searchParams.set('child_category_slug', context.childCategorySlug);
  if (context.creatorSlug) url.searchParams.set('creator_slug', context.creatorSlug);
  if (context.creatorRecordId) url.searchParams.set('creator_record_id', context.creatorRecordId);
  if (context.styleSlug) url.searchParams.set('style_slug', toFilterSlug(context.styleSlug));
  if (context.tagSlug) url.searchParams.set('tag_slug', toFilterSlug(context.tagSlug));
}

function buildScopedCategoryHref(slug: string | null): string {
  if (typeof window === 'undefined') return slug ? `?category=${slug}` : '';
  const url = new URL(window.location.href);
  if (!slug) clearCategoryPathContext(url);
  url.searchParams.delete('subcategory');
  url.searchParams.delete('child_category_slug');
  url.searchParams.delete('page');
  if (slug) {
    url.searchParams.set('category', slug);
  } else {
    url.searchParams.delete('category');
    url.searchParams.delete('category_group_slug');
  }
  return url.toString();
}

function clearCategoryPathContext(url: URL): void {
  const pathname = url.pathname.replace(/\/+$/, '');
  if (/^\/templates\/(?:category|subcategory)\/[^/?#]+/.test(pathname)) {
    url.pathname = '/templates/all';
  }
}

function buildScopedSubcategoryHref(slug: string | null, context: RouteContext): string {
  if (typeof window === 'undefined') return slug ? `?subcategory=${slug}` : '';
  const url = new URL(window.location.href);
  url.searchParams.delete('page');
  if (context.categoryGroupSlug) url.searchParams.set('category', context.categoryGroupSlug);
  if (slug) {
    url.searchParams.set('subcategory', slug);
  } else {
    url.searchParams.delete('subcategory');
    url.searchParams.delete('child_category_slug');
  }
  return url.toString();
}

function writeUrlFilters(state: LocalFilters, defaultSort: TemplateSort = 'popular'): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  // Clear filter params only — preserve path-based scope/category
  ['q', 'query', 'search', 'styles', 'tags', 'types', 'free_only', 'sort', 'page'].forEach((k) =>
    url.searchParams.delete(k),
  );
  if (state.q) url.searchParams.set('q', state.q);
  if (state.sort !== defaultSort) url.searchParams.set('sort', state.sort);
  if (state.freeOnly) url.searchParams.set('free_only', 'true');
  state.styles.forEach((v) => url.searchParams.append('styles', v));
  state.tags.forEach((v) => url.searchParams.append('tags', v));
  state.types.forEach((v) => url.searchParams.append('types', v));
  window.history.replaceState({}, '', url.toString());
  notifyTemplateFiltersChanged(state);
}

function buildFilterEventDetail(
  state: LocalFilters,
  routePatch: Partial<Pick<FilterEventDetail, 'categoryGroupSlug' | 'childCategorySlug'>> = {},
): FilterEventDetail {
  const url = typeof window === 'undefined' ? null : new URL(window.location.href);
  const routeContext = readRouteContext(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    typeof window !== 'undefined',
  );
  return {
    ...state,
    categoryGroupSlug:
      routePatch.categoryGroupSlug !== undefined
        ? routePatch.categoryGroupSlug
        : routeContext.categoryGroupSlug ?? url?.searchParams.get('category_group_slug') ?? null,
    childCategorySlug:
      routePatch.childCategorySlug !== undefined
        ? routePatch.childCategorySlug
        : routeContext.childCategorySlug ?? url?.searchParams.get('child_category_slug') ?? null,
    creatorSlug: routeContext.creatorSlug ?? url?.searchParams.get('creator_slug') ?? null,
    creatorRecordId: routeContext.creatorRecordId ?? url?.searchParams.get('creator_record_id') ?? null,
    styles: [...state.styles],
    tags: [...state.tags],
    types: [...state.types],
    href: url?.toString() ?? '',
    source: 'TemplateFilterBar',
    updatedAt: Date.now(),
  };
}

function notifyTemplateFiltersChanged(
  state: LocalFilters,
  routePatch?: Partial<Pick<FilterEventDetail, 'categoryGroupSlug' | 'childCategorySlug'>>,
): void {
  if (typeof window === 'undefined') return;
  const detail = buildFilterEventDetail(state, routePatch);
  // Persist the latest component-authored filter state for TemplateGrid's
  // URL-change fallback. This is especially important for explicit "popular",
  // which intentionally has no ?sort=popular URL param.
  (window as unknown as Record<string, unknown>).__templateMarketplaceFilters = detail;
  window.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
  document.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
}

function syncPageDescriptionVisibility(context: RouteContext): void {
  if (typeof document === 'undefined') return;
  const description = document.querySelector<HTMLElement>('.u-text-gray600');
  if (!description) return;
  description.style.display = context.childCategorySlug ? 'none' : 'block';
}

// ─── TemplateFilterBar ────────────────────────────────────────────────────────

export const TemplateFilterBar: React.FC<TemplateFilterBarProps> = ({
  apiBase: apiBaseProp = '',
  scopeOverride = 'all',
  categorySlug: categorySlugProp = '',
  creatorSlug: creatorSlugProp = '',
  creatorRecordId: creatorRecordIdProp = '',
  subcategorySlug: subcategorySlugProp = '',
  styleSlug: styleSlugProp = '',
  tagSlug: tagSlugProp = '',
  showSearch = false,
  showStyles = true,
  showTypes = true,
  showSort = true,
  sortDisplay = 'auto',
  showFreeOnly = false,
  showSubcategoryPills = true,
  defaultSort = 'popular',
  searchPlaceholder = 'Search templates…',
  stylesAllLabel = 'All Styles',
  stylesLabel = 'Style',
  typesAllLabel = 'All Types',
  typesLabel = 'Type',
  freeOnlyLabel = 'Free only',
}) => {
  const rawBase = apiBaseProp || DEFAULT_API_BASE;
  // Rewrite origins blocked by webflow.com CSP
  const apiBase =
    rawBase.startsWith(WORKER_ORIGIN) || rawBase.startsWith(CLOUD_APP_PREVIEW_ORIGIN)
      ? DEFAULT_API_BASE
      : rawBase;

  const [filters, setFilters] = useState<LocalFilters>(() => defaultUrlFilters(defaultSort));
  const [styleFacets, setStyleFacets] = useState<StyleFacet[]>([]);
  const [typeFacets, setTypeFacets] = useState<TypeFacet[]>([]);
  const [categoryPills, setCategoryPills] = useState<SubcategoryPill[]>([]);
  const [subcategoryPills, setSubcategoryPills] = useState<SubcategoryPill[]>([]);
  const [pillsLoading, setPillsLoading] = useState(false);
  const [routeVersion, setRouteVersion] = useState(0);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const routeContext = useMemo(
    () =>
      readRouteContext(
        scopeOverride,
        categorySlugProp || undefined,
        creatorSlugProp || undefined,
        creatorRecordIdProp || undefined,
        subcategorySlugProp || undefined,
        styleSlugProp || undefined,
        tagSlugProp || undefined,
        hasHydrated,
      ),
    [
      categorySlugProp,
      creatorRecordIdProp,
      creatorSlugProp,
      hasHydrated,
      routeVersion,
      scopeOverride,
      styleSlugProp,
      subcategorySlugProp,
      tagSlugProp,
    ],
  );
  const hasSubcategoryPillContext = Boolean(routeContext.categoryGroupSlug || routeContext.childCategorySlug);
  const isFreeSortContext = routeContext.scope === 'free' || filters.freeOnly;
  const sortOptions = useMemo(
    () =>
      isFreeSortContext
        ? SORT_OPTIONS.filter((option) => option.value === 'popular' || option.value === 'newest')
        : SORT_OPTIONS,
    [isFreeSortContext],
  );

  const styleNameBySlug = useMemo(() => {
    return new Map(styleFacets.map((style) => [style.slug, style.name]));
  }, [styleFacets]);

  // Fetch available styles/types and category-scoped subcategory pills.
  // Uses page context (scope/category from URL path) so facets reflect the
  // current page's template set.
  useEffect(() => {
    if (!hasHydrated) return undefined;
    if (!showStyles && !showTypes && !showSubcategoryPills) return;
    const ac = new AbortController();
    const context = routeContext;

    const resolvedBase =
      apiBase.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${apiBase}`
        : apiBase;

    const url = new URL(`${resolvedBase}/api/templates/search`);
    url.searchParams.set('include', 'facets,pills');
    url.searchParams.set('page', '1');
    url.searchParams.set('page_size', '1');
    applyRouteContextToUrl(url, context);

    if (showSubcategoryPills) {
      setPillsLoading(
        Boolean(
          context.categoryGroupSlug ||
            context.childCategorySlug ||
            context.creatorSlug ||
            context.creatorRecordId ||
            context.scope ||
            context.styleSlug ||
            context.tagSlug,
        ),
      );
    }

    const cacheKey = url.toString();
    const cached = facetsPayloadCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FACETS_CACHE_TTL_MS) {
      const data = cached.data;
      if (showStyles) setStyleFacets(data.available_facets.styles ?? []);
      if (showTypes) setTypeFacets(data.available_facets.types ?? []);
      if (showSubcategoryPills) {
        setCategoryPills(data.category_pills ?? []);
        setSubcategoryPills(data.subcategory_pills ?? []);
        setPillsLoading(false);
      }
      return () => ac.abort();
    }

    fetch(cacheKey, { signal: ac.signal })
      .then((r) => (r.ok ? (r.json() as Promise<FacetsPayload>) : null))
      .then((data) => {
        if (!data) return;
        facetsPayloadCache.set(cacheKey, { timestamp: Date.now(), data });
        if (showStyles) setStyleFacets(data.available_facets.styles ?? []);
        if (showTypes) setTypeFacets(data.available_facets.types ?? []);
        if (showSubcategoryPills) {
          setCategoryPills(data.category_pills ?? []);
          setSubcategoryPills(data.subcategory_pills ?? []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ac.signal.aborted) setPillsLoading(false);
      });

    return () => ac.abort();
  }, [apiBase, hasHydrated, routeContext, showStyles, showSubcategoryPills, showTypes]);

  // Re-sync filter state from URL on browser back/forward
  useEffect(() => {
    setHasHydrated(true);
    setFilters(readUrlFilters(defaultSort));
    setRouteVersion((value) => value + 1);

    const onPop = () => {
      setFilters(readUrlFilters(defaultSort));
      setRouteVersion((value) => value + 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [defaultSort]);

  useEffect(() => {
    const onExternalFiltersChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.source === 'TemplateFilterBar') return;
      setFilters(readExternalFilters(defaultSort, detail));
      setRouteVersion((value) => value + 1);
    };
    window.addEventListener('templateFiltersChanged', onExternalFiltersChanged);
    document.addEventListener('templateFiltersChanged', onExternalFiltersChanged);
    return () => {
      window.removeEventListener('templateFiltersChanged', onExternalFiltersChanged);
      document.removeEventListener('templateFiltersChanged', onExternalFiltersChanged);
    };
  }, [defaultSort]);

  useEffect(() => {
    if (!openPanel) return undefined;

    const closeOnOutsidePointer = (event: MouseEvent) => {
      const root = rootRef.current;
      const path = event.composedPath();
      if (root && !path.includes(root)) setOpenPanel(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPanel(null);
    };

    document.addEventListener('mousedown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openPanel]);

  useEffect(() => {
    if (!hasHydrated) return;
    syncPageDescriptionVisibility(routeContext);
  }, [hasHydrated, routeContext]);

  // Re-sync when another page script or this component updates category params.
  // pushState/replaceState do not emit popstate, so the custom event is the bridge.
  useEffect(() => {
    const onCat = () => {
      setFilters(readUrlFilters(defaultSort));
      setRouteVersion((value) => value + 1);
    };
    document.addEventListener('categoryFilterUpdated', onCat);
    return () => document.removeEventListener('categoryFilterUpdated', onCat);
  }, [defaultSort]);

  const applyFilter = useCallback((patch: Partial<LocalFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      writeUrlFilters(next, defaultSort);
      return next;
    });
  }, [defaultSort]);

  useEffect(() => {
    if (!isFreeSortContext || (filters.sort !== 'price_asc' && filters.sort !== 'price_desc')) return;
    applyFilter({ sort: defaultSort });
  }, [applyFilter, defaultSort, filters.sort, isFreeSortContext]);

  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      // Update input immediately; debounce the URL write + fetch
      setFilters((prev) => ({ ...prev, q }));
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setFilters((prev) => {
          const next = { ...prev, q: q.trim() };
          writeUrlFilters(next, defaultSort);
          return next;
        });
      }, 220);
    },
    [defaultSort],
  );

  const onStyleChange = useCallback(
    (slug: string) => {
      setFilters((prev) => {
        const styles = prev.styles.includes(slug)
          ? prev.styles.filter((value) => value !== slug)
          : [...prev.styles, slug];
        const next = { ...prev, styles };
        writeUrlFilters(next, defaultSort);
        return next;
      });
    },
    [defaultSort],
  );

  const onTypeChange = useCallback(
    (value: string) => {
      applyFilter({ types: value ? [value] : [] });
      setOpenPanel(null);
    },
    [applyFilter],
  );

  const onSortChange = useCallback(
    (value: string) => {
      applyFilter({ sort: normalizeSort(value, defaultSort) });
      setOpenPanel(null);
    },
    [applyFilter, defaultSort],
  );

  const onFreeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      applyFilter({ freeOnly: e.target.checked });
    },
    [applyFilter],
  );

  const onCategoryPillClick = useCallback(
    (slug: string | null, active: boolean, event: React.MouseEvent<HTMLAnchorElement>) => {
      if (hasSubcategoryPillContext || typeof window === 'undefined') return;
      event.preventDefault();

      const url = new URL(window.location.href);
      const nextSlug = active ? null : slug;
      url.searchParams.delete('subcategory');
      url.searchParams.delete('child_category_slug');
      url.searchParams.delete('page');
      if (nextSlug) {
        url.searchParams.set('category', nextSlug);
        url.searchParams.delete('category_group_slug');
      } else {
        url.searchParams.delete('category');
        url.searchParams.delete('category_group_slug');
      }

      window.history.replaceState({}, '', url.toString());
      setRouteVersion((value) => value + 1);
      notifyTemplateFiltersChanged(filters);
      document.dispatchEvent(
        new CustomEvent('categoryFilterUpdated', {
          detail: { parent: nextSlug, category: nextSlug, subcategory: null },
        }),
      );
    },
    [filters, hasSubcategoryPillContext],
  );

  const onClearCategoryContext = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (typeof window === 'undefined') return;
      event.preventDefault();

      const url = new URL(window.location.href);
      clearCategoryPathContext(url);
      url.searchParams.delete('category');
      url.searchParams.delete('category_group_slug');
      url.searchParams.delete('subcategory');
      url.searchParams.delete('child_category_slug');
      url.searchParams.delete('page');

      window.history.replaceState({}, '', url.toString());
      setRouteVersion((value) => value + 1);
      notifyTemplateFiltersChanged(filters, { categoryGroupSlug: null, childCategorySlug: null });
      document.dispatchEvent(
        new CustomEvent('categoryFilterUpdated', {
          detail: { parent: null, category: null, subcategory: null },
        }),
      );
    },
    [filters],
  );

  const onParentCategoryPillClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (typeof window === 'undefined' || !routeContext.categoryGroupSlug) return;
      event.preventDefault();

      const url = new URL(window.location.href);
      url.searchParams.set('category', routeContext.categoryGroupSlug);
      url.searchParams.delete('category_group_slug');
      url.searchParams.delete('subcategory');
      url.searchParams.delete('child_category_slug');
      url.searchParams.delete('page');

      window.history.replaceState({}, '', url.toString());
      setRouteVersion((value) => value + 1);
      notifyTemplateFiltersChanged(filters);
      document.dispatchEvent(
        new CustomEvent('categoryFilterUpdated', {
          detail: {
            parent: routeContext.categoryGroupSlug,
            category: routeContext.categoryGroupSlug,
            subcategory: null,
          },
        }),
      );
    },
    [filters, routeContext.categoryGroupSlug],
  );

  const onSubcategoryPillClick = useCallback(
    (slug: string, active: boolean, event: React.MouseEvent<HTMLAnchorElement>) => {
      if (typeof window === 'undefined') return;
      if (!routeContext.categoryGroupSlug && !routeContext.scope) return;
      event.preventDefault();

      const nextSubcategory = active ? null : slug;
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      if (routeContext.categoryGroupSlug) url.searchParams.set('category', routeContext.categoryGroupSlug);
      if (nextSubcategory) {
        url.searchParams.set('subcategory', nextSubcategory);
        url.searchParams.delete('child_category_slug');
      } else {
        url.searchParams.delete('subcategory');
        url.searchParams.delete('child_category_slug');
      }

      window.history.replaceState({}, '', url.toString());
      setRouteVersion((value) => value + 1);
      notifyTemplateFiltersChanged(filters);
      document.dispatchEvent(
        new CustomEvent('categoryFilterUpdated', {
          detail: {
            parent: routeContext.categoryGroupSlug,
            category: routeContext.categoryGroupSlug,
            subcategory: nextSubcategory,
          },
        }),
      );
    },
    [filters, routeContext.categoryGroupSlug, routeContext.scope],
  );

  const clearStyles = useCallback(() => {
    applyFilter({ styles: [] });
  }, [applyFilter]);

  const activeStyleLabel = useMemo(() => {
    if (filters.styles.length === 0) return stylesLabel;
    if (filters.styles.length === 1) {
      return styleNameBySlug.get(filters.styles[0]) ?? filters.styles[0];
    }
    return `${filters.styles.length} styles`;
  }, [filters.styles, styleNameBySlug, stylesLabel]);

  const activeTypeLabel = filters.types[0] || typesLabel;
  const activeSortLabel = sortOptions.find((option) => option.value === filters.sort)?.label ?? 'Popular';
  const useSegmentedSort = sortDisplay === 'segmented';

  const rootStyle: CSSProperties = {};
  const showCategoryPillRow = showSubcategoryPills && !hasSubcategoryPillContext;
  const parentCategoryPill = routeContext.categoryGroupSlug
    ? categoryPills.find((pill) => pill.slug === routeContext.categoryGroupSlug)
    : null;
  const parentCategoryLabel = parentCategoryPill?.name ?? (routeContext.categoryGroupSlug ? titleCaseSlug(routeContext.categoryGroupSlug) : '');
  const visiblePills = hasSubcategoryPillContext
    ? subcategoryPills.filter((pill) => pill.slug !== routeContext.categoryGroupSlug)
    : categoryPills;
  const allCategoriesActive = showCategoryPillRow && !routeContext.categoryGroupSlug && !routeContext.childCategorySlug;
  const parentCategoryActive = hasSubcategoryPillContext && !routeContext.childCategorySlug;
  const showAllCategoriesPill = showCategoryPillRow || hasSubcategoryPillContext;
  const shouldShowSubcategoryPills =
    showSubcategoryPills &&
    (hasSubcategoryPillContext || showCategoryPillRow) &&
    (pillsLoading || visiblePills.length > 0 || Boolean(routeContext.categoryGroupSlug));

  let dropdownContent: React.ReactNode = null;
  if (openPanel === 'styles') {
    dropdownContent = (
      <>
        <button
          type="button"
          className="tmfilter-option"
          data-selected={filters.styles.length === 0}
          onClick={clearStyles}
        >
          <span className="tmfilter-check" aria-hidden="true" />
          <span className="tmfilter-option-text">{stylesAllLabel}</span>
        </button>
        {styleFacets.map((style) => {
          const selected = filters.styles.includes(style.slug);
          return (
            <button
              key={style.slug}
              type="button"
              className="tmfilter-option"
              role="option"
              aria-selected={selected}
              data-selected={selected}
              onClick={() => onStyleChange(style.slug)}
            >
              <span className="tmfilter-check" aria-hidden="true" />
              <span className="tmfilter-option-text">{style.name}</span>
            </button>
          );
        })}
      </>
    );
  } else if (openPanel === 'types') {
    dropdownContent = (
      <>
        <button
          type="button"
          className="tmfilter-option"
          data-selected={filters.types.length === 0}
          onClick={() => onTypeChange('')}
        >
          <span className="tmfilter-check" aria-hidden="true" />
          <span className="tmfilter-option-text">{typesAllLabel}</span>
        </button>
        {typeFacets.map((type) => {
          const selected = filters.types[0] === type.value;
          return (
            <button
              key={type.value}
              type="button"
              className="tmfilter-option"
              role="option"
              aria-selected={selected}
              data-selected={selected}
              onClick={() => onTypeChange(type.value)}
            >
              <span className="tmfilter-check" aria-hidden="true" />
              <span className="tmfilter-option-text">{type.value}</span>
            </button>
          );
        })}
      </>
    );
  } else if (openPanel === 'sort') {
    dropdownContent = (
      <>
        {sortOptions.map((option) => {
          const selected = option.value === filters.sort;
          return (
            <button
              key={option.value}
              type="button"
              className="tmfilter-option"
              role="option"
              aria-selected={selected}
              data-selected={selected}
              onClick={() => onSortChange(option.value)}
            >
              <span className="tmfilter-check" aria-hidden="true" />
              <span className="tmfilter-option-text">{option.label}</span>
            </button>
          );
        })}
      </>
    );
  }

  const renderFilterPanel = () => {
    if (!openPanel || openPanel === 'search' || (openPanel === 'sort' && useSegmentedSort) || !dropdownContent) {
      return null;
    }
    return (
      <div
        className="tmfilter-panel"
        role="listbox"
        aria-multiselectable={openPanel === 'styles' ? true : undefined}
      >
        <div className="tmfilter-options">{dropdownContent}</div>
      </div>
    );
  };

  if (!showSearch && !showStyles && !showTypes && !showSort && !showFreeOnly && !showSubcategoryPills) {
    return null;
  }

  return (
    <div ref={rootRef} className="tmfilter-shell" style={rootStyle} data-template-filter-bar="">
      <style dangerouslySetInnerHTML={{ __html: FILTER_STYLES }} />

      {shouldShowSubcategoryPills && (
        <div className="mp-subcategory margin-bottom-1 tmfilter-subcategory" data-template-subcategory-pills="">
          <div className="tmfilter-subcategory-scroll">
            <div className="tmfilter-subcategory-track" role="list">
              {pillsLoading && visiblePills.length === 0 ? (
                <div className="tmfilter-subcategory-slide" role="listitem">
                  <span className="cc-subcategory tmfilter-pill is-loading">Loading categories</span>
                </div>
              ) : (
                <>
                  {showAllCategoriesPill && (
                    <React.Fragment>
                      <div className="tmfilter-subcategory-slide" role="listitem">
                        <a
                          className={`cc-subcategory tmfilter-pill${allCategoriesActive ? ' w--current active' : ''}`}
                          href={buildScopedCategoryHref(null)}
                          aria-current={allCategoriesActive ? 'page' : undefined}
                          onClick={
                            hasSubcategoryPillContext
                              ? onClearCategoryContext
                              : (event) => onCategoryPillClick(null, allCategoriesActive, event)
                          }
                        >
                          All Categories
                        </a>
                      </div>
                    </React.Fragment>
                  )}
                  {hasSubcategoryPillContext && routeContext.categoryGroupSlug && (
                    <div className="tmfilter-subcategory-slide" role="listitem">
                      <a
                        className={`cc-subcategory tmfilter-pill${parentCategoryActive ? ' w--current active' : ''}`}
                        href={buildScopedSubcategoryHref(null, routeContext)}
                        aria-current={parentCategoryActive ? 'page' : undefined}
                        onClick={onParentCategoryPillClick}
                      >
                        {parentCategoryLabel}
                      </a>
                    </div>
                  )}
                  {visiblePills.map((pill) => {
                    const active = hasSubcategoryPillContext
                      ? pill.active || routeContext.childCategorySlug === pill.slug
                      : pill.active || routeContext.categoryGroupSlug === pill.slug;
                    const href = hasSubcategoryPillContext
                      ? buildScopedSubcategoryHref(active ? null : pill.slug, routeContext)
                      : buildScopedCategoryHref(active ? null : pill.slug);
                    return (
                      <div className="tmfilter-subcategory-slide" key={pill.slug} role="listitem">
                        <a
                          className={`cc-subcategory tmfilter-pill${active ? ' w--current active' : ''}`}
                          href={href}
                          aria-current={active ? 'page' : undefined}
                          onClick={
                            hasSubcategoryPillContext
                              ? (event) => onSubcategoryPillClick(pill.slug, active, event)
                              : (event) => onCategoryPillClick(pill.slug, active, event)
                          }
                        >
                          {pill.name}
                        </a>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="tmfilter-filter-sort-container">
        <div className="mp-filter tmfilter-root">

        {showSearch && (
          <div className="tmfilter-search-wrap">
            <input
              className="tmfilter-search"
              type="search"
              placeholder={searchPlaceholder}
              value={filters.q}
              onChange={onSearchChange}
              data-template-search-input=""
            />
          </div>
        )}

      {showStyles && (
        <div className="tmfilter-dropdown" data-open={openPanel === 'styles' ? 'true' : undefined}>
          <button
            type="button"
            className="tmfilter-trigger"
            aria-expanded={openPanel === 'styles'}
            aria-haspopup="listbox"
            onClick={() => setOpenPanel((value) => (value === 'styles' ? null : 'styles'))}
          >
            <span className="tmfilter-trigger-label">{activeStyleLabel}</span>
            <img className="tmfilter-arrow" src={ARROW_ICON_URL} alt="" aria-hidden="true" />
          </button>
        </div>
      )}

      {showTypes && (
        <div className="tmfilter-dropdown" data-open={openPanel === 'types' ? 'true' : undefined}>
          <button
            type="button"
            className="tmfilter-trigger"
            aria-expanded={openPanel === 'types'}
            aria-haspopup="listbox"
            onClick={() => setOpenPanel((value) => (value === 'types' ? null : 'types'))}
          >
            <span className="tmfilter-trigger-label">{activeTypeLabel}</span>
            <img className="tmfilter-arrow" src={ARROW_ICON_URL} alt="" aria-hidden="true" />
          </button>
        </div>
      )}

        {showFreeOnly && (
          <label className="tmfilter-free">
            <input
              className="tmfilter-free-input"
              type="checkbox"
              checked={filters.freeOnly}
              onChange={onFreeChange}
              data-template-search-free=""
            />
            <span className="tmfilter-switch" aria-hidden="true">
              <span className="tmfilter-switch-dot" />
              <span className="tmfilter-switch-bg" />
            </span>
            <span>{freeOnlyLabel}</span>
          </label>
        )}
        </div>

      {showSort && useSegmentedSort && (
        <div className="tmfilter-sort-toggle" aria-label="Sort templates">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="tmfilter-sort-option"
              data-selected={option.value === filters.sort}
              aria-pressed={option.value === filters.sort}
              onClick={() => onSortChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {showSort && !useSegmentedSort && (
        <div className="tmfilter-dropdown tmfilter-sort" data-open={openPanel === 'sort' ? 'true' : undefined}>
          <button
            type="button"
            className="tmfilter-trigger"
            aria-expanded={openPanel === 'sort'}
            aria-haspopup="listbox"
            onClick={() => setOpenPanel((value) => (value === 'sort' ? null : 'sort'))}
          >
            <span className="tmfilter-trigger-label">{activeSortLabel}</span>
            <img className="tmfilter-arrow" src={ARROW_ICON_URL} alt="" aria-hidden="true" />
          </button>
        </div>
      )}
      </div>
      {renderFilterPanel()}
    </div>
  );
};

export default TemplateFilterBar;
