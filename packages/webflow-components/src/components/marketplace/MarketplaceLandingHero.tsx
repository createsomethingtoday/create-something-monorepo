import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { MarketplaceExperimentRole, trackMarketplaceEvent } from './analytics';

interface HeroCategoryPill {
  name: string;
  slug: string;
  url?: string;
  count?: number;
}

interface HeroPillsResponse {
  category_pills?: HeroCategoryPill[];
}

export interface MarketplaceLandingHeroSuggestion {
  label: string;
  href: string;
  count?: number;
}

export type MarketplaceLandingHeroSearchExperience = 'native' | 'template_search' | 'custom';

export interface MarketplaceLandingHeroProps {
  /** Base URL for the template search API, no trailing slash. */
  apiBase?: string;
  /** Hero headline. */
  title?: string;
  /** Hero body copy. */
  description?: string;
  /** Search input placeholder. */
  searchPlaceholder?: string;
  /** Search results URL. */
  searchAction?: string;
  /** Query parameter name for the search term. */
  queryParam?: string;
  /** Search destination mode for the landing experiment. */
  searchExperience?: MarketplaceLandingHeroSearchExperience;
  /** Standalone webflow-template-search destination used when Search Experience is Template Search. */
  templateSearchAction?: string;
  /** Query parameter name for the standalone template search destination. */
  templateSearchQueryParam?: string;
  /** JSON array of {label, href, count?}. Used as fallback for category suggestions. */
  suggestions?: string;
  /** Populate suggestion chips from the search API category pills. */
  useSearchSuggestions?: boolean;
  /** Maximum suggestion chips to render. */
  maxSuggestions?: number;
  /** Show the suggestion chip row. */
  showSuggestions?: boolean;
  /** Track hero search and suggestion interactions through wf_analytics and a custom DOM event. */
  enableAnalytics?: boolean;
  /** Experiment role used by Marketplace Landing Experiment Gate selectors. */
  experimentRole?: MarketplaceExperimentRole;
}

const DEFAULT_API_BASE = 'https://templates.webflow.com/templates-api';
const WORKER_ORIGIN = 'https://webflow-template-search.createsomething.workers.dev';
const CLOUD_APP_PREVIEW_ORIGIN = 'https://webflow-template-marketplace.webflow.io';
const SUGGESTION_CACHE_TTL_MS = 5 * 60 * 1000;

const suggestionCache = new Map<string, { timestamp: number; data: MarketplaceLandingHeroSuggestion[] }>();

export const DEFAULT_HERO_SUGGESTIONS: MarketplaceLandingHeroSuggestion[] = [
  {
    label: 'Portfolio & Agency',
    href: 'https://webflow.com/templates/category/portfolio-and-agency-websites',
    count: 3838,
  },
  {
    label: 'Technology',
    href: 'https://webflow.com/templates/category/technology-websites',
    count: 3223,
  },
  {
    label: 'Professional Services',
    href: 'https://webflow.com/templates/category/professional-services-websites',
    count: 1781,
  },
  {
    label: 'Retail & E-Commerce',
    href: 'https://webflow.com/templates/category/retail-and-e-commerce-websites',
    count: 846,
  },
  {
    label: 'Blog & Editorial',
    href: 'https://webflow.com/templates/category/blog-and-editorial-websites',
    count: 610,
  },
  {
    label: 'Food & Drink',
    href: 'https://webflow.com/templates/category/food-and-drink-websites',
    count: 411,
  },
];

export const DEFAULT_HERO_SUGGESTIONS_JSON = JSON.stringify(DEFAULT_HERO_SUGGESTIONS);

const HERO_STYLES = `
.mphero-section,
.mphero-section * {
  box-sizing: border-box;
}

.mphero-section {
  width: 100%;
  color: #080808;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.mphero-inner {
  max-width: 850px;
  margin: 0 auto;
  text-align: center;
}

.mphero-title {
  max-width: 30ch;
  margin: 0 auto;
  color: #080808;
  font-size: 60px;
  font-weight: 600;
  line-height: 1.04;
}

.mphero-description {
  max-width: 760px;
  margin: 24px auto 0;
  color: #080808;
  font-size: 16px;
  line-height: 1.6;
}

.mphero-form {
  width: 100%;
  max-width: 600px;
  margin: 24px auto 0;
}

.mphero-search-shell {
  position: relative;
}

.mphero-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  width: 16px;
  height: 16px;
  color: #5f5f5f;
  transform: translateY(-50%);
  pointer-events: none;
}

.mphero-input {
  width: 100%;
  height: 48px;
  margin: 0;
  padding: 8px 112px 8px 38px;
  color: #080808;
  background: #fff;
  border: 1px solid #d8d8d8;
  border-radius: 4px;
  font: inherit;
  font-size: 16px;
  line-height: 1.3;
  outline: 2px solid transparent;
  transition: border-color 0.2s cubic-bezier(.165, .84, .44, 1), outline-color 0.2s cubic-bezier(.165, .84, .44, 1);
}

.mphero-input::placeholder {
  color: #757575;
}

.mphero-input:hover {
  border-color: #898989;
}

.mphero-input:focus {
  border-color: #146ef5;
  outline-color: #146ef5;
}

.mphero-submit {
  position: absolute;
  right: 4px;
  top: 4px;
  height: 40px;
  min-width: 92px;
  padding: 0 14px;
  color: #fff;
  background: #146ef5;
  border: 0;
  border-radius: 3px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.mphero-submit:hover {
  background: #0f55d9;
}

.mphero-suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 760px;
  margin: 16px auto 0;
  padding: 0;
  list-style: none;
}

.mphero-suggestion-link {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 7px 11px;
  color: #080808;
  background: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.25;
  text-decoration: none;
}

.mphero-suggestion-link:hover {
  border-color: #146ef5;
  color: #146ef5;
}

@media (max-width: 991px) {
  .mphero-title {
    font-size: 48px;
  }
}

@media (max-width: 767px) {
  .mphero-title {
    font-size: 40px;
    line-height: 1.08;
  }

  .mphero-description {
    margin-top: 18px;
  }

  .mphero-input {
    padding-right: 88px;
  }

  .mphero-submit {
    min-width: 74px;
  }
}
`;

function resolveApiBase(apiBaseProp?: string): string {
  const rawBase = apiBaseProp || DEFAULT_API_BASE;
  return rawBase.startsWith(WORKER_ORIGIN) || rawBase.startsWith(CLOUD_APP_PREVIEW_ORIGIN)
    ? DEFAULT_API_BASE
    : rawBase;
}

function normalizeLimit(value: number | undefined, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.round(numeric), min), max);
}

function normalizeSuggestion(value: unknown): MarketplaceLandingHeroSuggestion | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<MarketplaceLandingHeroSuggestion>;
  const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
  const href = typeof candidate.href === 'string' ? candidate.href.trim() : '';
  if (!label || !href) return null;
  const count = typeof candidate.count === 'number' && Number.isFinite(candidate.count)
    ? candidate.count
    : undefined;
  return { label, href, count };
}

function parseSuggestions(suggestionsJson?: string): MarketplaceLandingHeroSuggestion[] {
  if (!suggestionsJson?.trim()) return DEFAULT_HERO_SUGGESTIONS;

  try {
    const parsed = JSON.parse(suggestionsJson) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_HERO_SUGGESTIONS;
    const suggestions = parsed.map(normalizeSuggestion).filter(Boolean) as MarketplaceLandingHeroSuggestion[];
    return suggestions.length > 0 ? suggestions : DEFAULT_HERO_SUGGESTIONS;
  } catch {
    return DEFAULT_HERO_SUGGESTIONS;
  }
}

function buildPillsUrl(base: string): string {
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

async function fetchSuggestionPills(
  apiBase: string,
  maxSuggestions: number,
  signal: AbortSignal,
): Promise<MarketplaceLandingHeroSuggestion[]> {
  const requestUrl = buildPillsUrl(apiBase);
  const cached = suggestionCache.get(requestUrl);
  if (cached && Date.now() - cached.timestamp < SUGGESTION_CACHE_TTL_MS) {
    return cached.data.slice(0, maxSuggestions);
  }

  const response = await fetch(requestUrl, { signal });
  if (!response.ok) throw new Error(`Template category suggestions failed with ${response.status}`);
  const payload = (await response.json()) as HeroPillsResponse;
  const suggestions = (payload.category_pills ?? [])
    .map((pill) => normalizeSuggestion({
      label: pill.name,
      href: pill.url || `https://webflow.com/templates/category/${pill.slug}`,
      count: pill.count,
    }))
    .filter(Boolean) as MarketplaceLandingHeroSuggestion[];

  const sorted = suggestions.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  suggestionCache.set(requestUrl, { timestamp: Date.now(), data: sorted });
  return sorted.slice(0, maxSuggestions);
}

function buildSearchUrl(action: string, queryParam: string, value: string): string {
  const absolute = action.startsWith('/') && typeof window !== 'undefined'
    ? `${window.location.origin}${action}`
    : action;
  const url = new URL(absolute);
  url.searchParams.set(queryParam || 'query', value);
  return url.toString();
}

export const MarketplaceLandingHero: React.FC<MarketplaceLandingHeroProps> = ({
  apiBase: apiBaseProp,
  title = 'Customizable HTML website templates for every need',
  description = 'Build a website tailored to your needs with our curated collection of HTML website templates, fully customizable and built for seamless, responsive web design.',
  searchPlaceholder = 'Search all templates (e.g. Business, Portfolio)',
  searchAction = 'https://webflow.com/templates/search',
  queryParam = 'query',
  searchExperience = 'native',
  templateSearchAction = 'https://webflow.com/templates/search-v2',
  templateSearchQueryParam = 'q',
  suggestions: suggestionsJson,
  useSearchSuggestions = true,
  maxSuggestions = 6,
  showSuggestions = true,
  enableAnalytics = true,
  experimentRole = 'treatment',
}) => {
  const apiBase = resolveApiBase(apiBaseProp);
  const suggestionLimit = normalizeLimit(maxSuggestions, 6, 0, 10);
  const parsedSuggestions = useMemo(() => parseSuggestions(suggestionsJson), [suggestionsJson]);
  const [searchSuggestions, setSearchSuggestions] = useState<MarketplaceLandingHeroSuggestion[] | null>(null);
  const visibleSuggestions = useMemo(
    () => (searchSuggestions ?? parsedSuggestions).slice(0, suggestionLimit),
    [parsedSuggestions, searchSuggestions, suggestionLimit],
  );
  const effectiveSearchAction = searchExperience === 'template_search' ? templateSearchAction : searchAction;
  const effectiveQueryParam =
    searchExperience === 'template_search'
      ? templateSearchQueryParam || 'q'
      : queryParam || 'query';

  useEffect(() => {
    if (!useSearchSuggestions || !showSuggestions || suggestionLimit === 0) {
      setSearchSuggestions(null);
      return;
    }

    const controller = new AbortController();
    fetchSuggestionPills(apiBase, suggestionLimit, controller.signal)
      .then((suggestions) => {
        if (!controller.signal.aborted) setSearchSuggestions(suggestions);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSearchSuggestions(null);
      });

    return () => controller.abort();
  }, [apiBase, showSuggestions, suggestionLimit, useSearchSuggestions]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const data = new FormData(form);
    const query = String(data.get(effectiveQueryParam) ?? '').trim();
    if (!query) {
      event.preventDefault();
      return;
    }

    let nextUrl: string;
    try {
      nextUrl = buildSearchUrl(effectiveSearchAction, effectiveQueryParam, query);
    } catch {
      // Unparseable action: let the native form submission handle it.
      return;
    }
    event.preventDefault();
    trackMarketplaceEvent(
      'Marketplace Landing Hero - Search Submitted',
      {
        component: 'MarketplaceLandingHero',
        query,
        query_param: effectiveQueryParam,
        search_experience: searchExperience,
        destination_url: nextUrl,
      },
      enableAnalytics,
    );
    if (typeof window !== 'undefined') window.location.assign(nextUrl);
  };

  return (
    <section
      className="mphero-section"
      aria-label="Template marketplace search"
      data-marketplace-component="landing-hero"
      data-marketplace-landing-experiment={experimentRole === 'none' ? undefined : experimentRole}
    >
      <style>{HERO_STYLES}</style>
      <div className="mphero-inner">
        <h1 className="mphero-title">{title}</h1>
        {description ? <p className="mphero-description">{description}</p> : null}
        <form className="mphero-form" action={effectiveSearchAction} method="get" onSubmit={handleSubmit}>
          <div className="mphero-search-shell">
            <svg className="mphero-search-icon" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M7.25 2a5.25 5.25 0 0 1 4.16 8.45l2.82 2.82-.96.96-2.82-2.82A5.25 5.25 0 1 1 7.25 2Zm0 1.35a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z"
                fill="currentColor"
              />
            </svg>
              <input
                className="mphero-input"
                type="search"
                name={effectiveQueryParam}
                placeholder={searchPlaceholder}
                aria-label="Search templates"
              />
            <button className="mphero-submit" type="submit">Search</button>
          </div>
        </form>

        {showSuggestions && visibleSuggestions.length > 0 ? (
          <ul className="mphero-suggestions" aria-label="Popular template categories">
            {visibleSuggestions.map((suggestion) => (
              <li key={suggestion.href}>
                <a
                  className="mphero-suggestion-link"
                  href={suggestion.href}
                  data-marketplace-link="hero-suggestion"
                  onClick={() =>
                    trackMarketplaceEvent(
                      'Marketplace Landing Hero - Suggestion Clicked',
                      {
                        component: 'MarketplaceLandingHero',
                        suggestion_label: suggestion.label,
                        suggestion_href: suggestion.href,
                        suggestion_count: suggestion.count,
                      },
                      enableAnalytics,
                    )
                  }
                >
                  {suggestion.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
};

export default MarketplaceLandingHero;
