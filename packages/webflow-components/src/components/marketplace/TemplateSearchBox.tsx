import React, { FormEvent, useEffect, useMemo, useState } from 'react';

export type TemplateSearchBoxMode = 'route' | 'filter';
export type TemplateSearchBoxVariant = 'hero' | 'sidebar' | 'compact';

export interface TemplateSearchBoxSubmitContext {
  mode: TemplateSearchBoxMode;
  source: string;
  destination?: string;
}

export interface TemplateSearchBoxProps {
  /** Route submits to a search page. Filter updates the current URL and notifies Template Grid/Search Results. */
  mode?: TemplateSearchBoxMode;
  /** Visual treatment for the search surface. */
  variant?: TemplateSearchBoxVariant;
  /** Controlled input value. */
  value?: string;
  /** Initial value for uncontrolled usage. */
  defaultValue?: string;
  /** Input placeholder. */
  placeholder?: string;
  /** Accessible label for the search input. */
  ariaLabel?: string;
  /** Submit button label. */
  buttonLabel?: string;
  /** Show a visible submit button. Enter still submits when hidden. */
  showButton?: boolean;
  /** Destination used by Route mode. */
  searchAction?: string;
  /** Query parameter used by Route mode. */
  queryParam?: string;
  /** Maximum query length. */
  maxLength?: number;
  /** Allow empty submits. Useful on in-page filter surfaces to clear the current query. */
  allowEmptySubmit?: boolean;
  /** Dispatch DOM/wf_analytics search events. */
  enableAnalytics?: boolean;
  /** Source label included in emitted events. */
  source?: string;
  /** Additional class name for layout hooks. */
  className?: string;
  /** Controlled input change handler. */
  onValueChange?: (value: string) => void;
  /** Optional submit override for owning components that need custom state/analytics. */
  onSearch?: (query: string, context: TemplateSearchBoxSubmitContext) => void;
}

const DEFAULT_SEARCH_ACTION = 'https://webflow.com/templates/search-v2';
const DEFAULT_QUERY_PARAM = 'q';
const DEFAULT_MAX_LENGTH = 256;

const SEARCH_BOX_STYLES = `
.tmsearchbox,
.tmsearchbox * {
  box-sizing: border-box;
}

.tmsearchbox {
  width: 100%;
  color: #080808;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.tmsearchbox-field {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
}

.tmsearchbox-input {
  appearance: none;
  min-width: 0;
  flex: 1 1 auto;
  margin: 0;
  border: 0;
  background: transparent;
  color: #080808;
  font: inherit;
  letter-spacing: 0;
  outline: none;
}

.tmsearchbox-input::placeholder {
  color: #757575;
}

.tmsearchbox-submit {
  appearance: none;
  flex: 0 0 auto;
  margin: 0;
  border: 0;
  border-left: 1px solid #d9d9d9;
  background: #080808;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-weight: 650;
  letter-spacing: 0;
}

.tmsearchbox-submit:hover {
  background: #2b2b2b;
}

.tmsearchbox-submit:focus-visible,
.tmsearchbox-input:focus-visible {
  outline: 2px solid #146ef5;
  outline-offset: -2px;
}

.tmsearchbox--hero {
  max-width: 760px;
  margin: 28px auto 0;
}

.tmsearchbox--hero .tmsearchbox-field {
  min-height: 56px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.tmsearchbox--hero .tmsearchbox-input {
  padding: 0 18px;
  font-size: 16px;
  line-height: 1.2;
}

.tmsearchbox--hero .tmsearchbox-submit {
  padding: 0 24px;
  font-size: 15px;
}

.tmsearchbox--sidebar .tmsearchbox-field,
.tmsearchbox--compact .tmsearchbox-field {
  min-height: 36px;
  border-radius: 4px;
}

.tmsearchbox--sidebar .tmsearchbox-input,
.tmsearchbox--compact .tmsearchbox-input {
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.2;
}

.tmsearchbox--sidebar .tmsearchbox-submit,
.tmsearchbox--compact .tmsearchbox-submit {
  padding: 0 12px;
  font-size: 13px;
}

.tmsearchbox-submit[hidden] {
  display: none;
}

@media (max-width: 479px) {
  .tmsearchbox--hero .tmsearchbox-field {
    flex-direction: column;
    min-height: 0;
  }

  .tmsearchbox--hero .tmsearchbox-input {
    min-height: 50px;
  }

  .tmsearchbox--hero .tmsearchbox-submit {
    min-height: 46px;
    border-left: 0;
    border-top: 1px solid #d9d9d9;
  }
}
`;

function normalizeSearchValue(value: string, maxLength: number): string {
  return value.replace(/[<>]/g, '').trim().slice(0, maxLength);
}

function buildSearchDestination(action: string, queryParam: string, query: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://webflow.com';
  const url = new URL(action || DEFAULT_SEARCH_ACTION, base);
  url.searchParams.set(queryParam || DEFAULT_QUERY_PARAM, query);
  return url.toString();
}

function readList(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
}

function dispatchFilterChange(source: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const detail = {
    q: (url.searchParams.get('q') ?? url.searchParams.get('query') ?? url.searchParams.get('search') ?? '').trim(),
    styles: readList(url.searchParams, 'styles'),
    tags: readList(url.searchParams, 'tags'),
    types: readList(url.searchParams, 'types'),
    freeOnly: ['1', 'true', 'yes', 'on'].includes((url.searchParams.get('free_only') ?? '').toLowerCase()),
    sort: url.searchParams.get('sort') ?? 'popular',
    href: window.location.href,
    source,
    updatedAt: Date.now(),
  };
  (window as unknown as Record<string, unknown>).__templateMarketplaceFilters = detail;
  window.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
  document.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
}

function writeFilterQuery(query: string, source: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('query');
  url.searchParams.delete('search');
  url.searchParams.delete('page');
  if (query) {
    url.searchParams.set('q', query);
  } else {
    url.searchParams.delete('q');
  }
  window.history.replaceState({}, '', url.toString());
  dispatchFilterChange(source);
}

function trackSearchBoxEvent(
  name: string,
  detail: Record<string, unknown>,
  enabled: boolean,
): void {
  if (!enabled || typeof window === 'undefined') return;
  const payload = {
    ...detail,
    path: window.location.pathname,
    href: window.location.href,
  };
  const analytics = (window as unknown as { wf_analytics?: { track?: (event: string, data: Record<string, unknown>) => void } }).wf_analytics;
  if (typeof analytics?.track === 'function') {
    analytics.track(name, payload);
  }
  window.dispatchEvent(new CustomEvent('templateSearchExperienceAnalytics', { detail: { event: name, ...payload } }));
}

export const TemplateSearchBox: React.FC<TemplateSearchBoxProps> = ({
  mode = 'route',
  variant = 'hero',
  value,
  defaultValue = '',
  placeholder = 'Search for templates',
  ariaLabel = 'Search Webflow templates',
  buttonLabel = 'Search',
  showButton = true,
  searchAction = DEFAULT_SEARCH_ACTION,
  queryParam = DEFAULT_QUERY_PARAM,
  maxLength = DEFAULT_MAX_LENGTH,
  allowEmptySubmit = false,
  enableAnalytics = true,
  source = 'TemplateSearchBox',
  className = '',
  onValueChange,
  onSearch,
}) => {
  const normalizedMaxLength = Math.max(1, Math.floor(maxLength || DEFAULT_MAX_LENGTH));
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const classes = useMemo(
    () => ['tmsearchbox', `tmsearchbox--${variant}`, className].filter(Boolean).join(' '),
    [variant, className],
  );

  useEffect(() => {
    if (!isControlled) setInternalValue(defaultValue);
  }, [defaultValue, isControlled]);

  const setNextValue = (nextValue: string) => {
    const normalized = nextValue.slice(0, normalizedMaxLength);
    if (!isControlled) setInternalValue(normalized);
    onValueChange?.(normalized);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = normalizeSearchValue(currentValue ?? '', normalizedMaxLength);
    if (!query && !allowEmptySubmit) return;

    const destination = mode === 'route' && query ? buildSearchDestination(searchAction, queryParam, query) : undefined;
    const context = { mode, source, destination };
    if (onSearch) {
      onSearch(query, context);
      trackSearchBoxEvent('Template Search Box - Search Submitted', { query, mode, source, destination }, enableAnalytics);
      return;
    }

    if (mode === 'route' && destination) {
      trackSearchBoxEvent('Template Search Box - Search Routed', { query, source, destination }, enableAnalytics);
      window.location.assign(destination);
      return;
    }

    writeFilterQuery(query, source);
    trackSearchBoxEvent('Template Search Box - Search Filtered', { query, source }, enableAnalytics);
  };

  return (
    <form className={classes} onSubmit={submitSearch} role="search" action={searchAction} method="get">
      <style dangerouslySetInnerHTML={{ __html: SEARCH_BOX_STYLES }} />
      <div className="tmsearchbox-field">
        <input
          className="tmsearchbox-input"
          type="search"
          maxLength={normalizedMaxLength}
          name={queryParam || DEFAULT_QUERY_PARAM}
          value={currentValue}
          onChange={(event) => setNextValue(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
        <button className="tmsearchbox-submit" type="submit" hidden={!showButton}>
          {buttonLabel}
        </button>
      </div>
    </form>
  );
};

export default TemplateSearchBox;
