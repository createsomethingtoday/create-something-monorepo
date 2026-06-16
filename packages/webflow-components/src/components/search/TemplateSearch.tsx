import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface SuggestItem {
  name: string;
  template_slug: string;
  url: string | null;
  category_group_name?: string | null;
  category_groups?: Array<{ name: string; slug: string; url?: string | null }>;
  is_free: boolean;
  price: number | null;
  highlight?: Array<{ offset: number; length: number }>;
}

export interface TemplateSearchProps {
  /** Base URL of the webflow-template-search API/proxy, e.g. https://templates.webflow.com/templates-api */
  apiBaseUrl?: string;
  /** URL to navigate to on Enter (query appended as ?query=). Defaults to current page. */
  searchResultsUrl?: string;
  /** Fallback base URL for template detail navigation when the API item has no url. */
  collectionBase?: string;
  /** Input placeholder text */
  placeholder?: string;
  /** Max suggestions to show (number or numeric string) */
  maxSuggestions?: number | string;
  /** Query param key in the URL */
  queryParamKey?: string;
  /** CSS class applied to the outer wrapper */
  className?: string;
}

function buildHighlight(name: string, query: string): Array<{ offset: number; length: number }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const offset = name.toLowerCase().indexOf(q);
  return offset >= 0 ? [{ offset, length: q.length }] : [];
}

function highlight(name: string, ranges: Array<{ offset: number; length: number }> = []): React.ReactNode {
  if (!ranges.length) return name;
  const { offset, length } = ranges[0];
  return (
    <>
      {name.slice(0, offset)}
      <strong style={{ fontWeight: 700 }}>{name.slice(offset, offset + length)}</strong>
      {name.slice(offset + length)}
    </>
  );
}

function getCategoryLabel(item: SuggestItem): string | null {
  return item.category_group_name ?? item.category_groups?.[0]?.name ?? null;
}

function isFreeSuggestion(item: SuggestItem): boolean {
  if (typeof item.price === 'number') return item.price === 0;
  return item.is_free;
}

export const TemplateSearch: React.FC<TemplateSearchProps> = ({
  apiBaseUrl = 'https://templates.webflow.com/templates-api',
  searchResultsUrl = '',
  collectionBase = '/templates/html/',
  placeholder = 'Search templates…',
  maxSuggestions: maxSuggestionsRaw = 5,
  queryParamKey = 'query',
  className = '',
}) => {
  const maxSuggestions = Math.max(1, Math.min(10, Number(maxSuggestionsRaw) || 5));
  const id = useId();
  const listId = `wf-suggest-${id}`;

  // Read initial query from URL
  const getUrlQuery = () => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get(queryParamKey) ?? params.get('q') ?? params.get('search') ?? '';
  };

  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input in sync when URL query param changes externally (e.g. back/forward)
  useEffect(() => {
    const onPop = () => setInputValue(getUrlQuery());
    setInputValue(getUrlQuery());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [queryParamKey]);

  const fetchSuggestions = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const trimmed = q.trim();
        if (trimmed.length < 2) {
          setItems([]);
          setIsOpen(false);
          return;
        }

        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setIsLoading(true);

        try {
          const base = (apiBaseUrl || '').replace(/\/$/, '');
          const endpoint = base
            ? `${base}/api/templates/search`
            : '/api/templates/search';
          const url = new URL(endpoint, window.location.origin);
          url.searchParams.set('q', trimmed);
          url.searchParams.set('page', '1');
          url.searchParams.set('page_size', String(maxSuggestions));
          url.searchParams.set('sort', 'popular');

          const res = await fetch(url.toString(), { signal: abortRef.current.signal });
          if (!res.ok) throw new Error(`${res.status}`);
          const data = await res.json() as { items?: SuggestItem[] };
          const suggestions = (data.items ?? []).map((item) => ({
            ...item,
            category_group_name: getCategoryLabel(item),
            highlight: item.highlight ?? buildHighlight(item.name, trimmed),
          }));
          setItems(suggestions);
          setActiveIndex(suggestions.length ? 0 : -1);
          setIsOpen(true);
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            setItems([]);
            setIsOpen(false);
          }
        } finally {
          setIsLoading(false);
        }
      }, 150);
    },
    [apiBaseUrl, maxSuggestions]
  );

  const navigate = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;

      const base = (searchResultsUrl || '').replace(/\/$/, '') || window.location.pathname;
      const url = new URL(base, window.location.origin);
      url.searchParams.set(queryParamKey, q);

      // Update URL and dispatch event so Template Grid can re-fetch
      window.history.pushState({}, '', url.toString());
      const popStateEvent =
        typeof PopStateEvent === 'function'
          ? new PopStateEvent('popstate', { state: {} })
          : new Event('popstate');
      const queryEventDetail = { q, query: q, source: 'TemplateSearch' };
      window.dispatchEvent(popStateEvent);
      window.dispatchEvent(new CustomEvent('template-search-query', { detail: queryEventDetail }));
      document.dispatchEvent(new CustomEvent('template-search-query', { detail: queryEventDetail }));

      setIsOpen(false);
      setItems([]);
    },
    [searchResultsUrl, queryParamKey]
  );

  const selectItem = useCallback(
    (item: SuggestItem) => {
      setIsOpen(false);
      setItems([]);
      const base = (collectionBase || '/templates/html/').replace(/\/$/, '');
      window.location.href = item.url || `${base}/${item.template_slug}`;
    },
    [collectionBase]
  );

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    fetchSuggestions(val);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        selectItem(items[activeIndex]);
      } else {
        navigate(inputValue);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setItems([]);
      setActiveIndex(-1);
    }
  };

  const onFocus = () => {
    if (inputValue.trim().length >= 2) fetchSuggestions(inputValue);
  };

  const onBlur = () => {
    // Delay so mousedown on item fires first
    setTimeout(() => {
      setIsOpen(false);
      setActiveIndex(-1);
    }, 150);
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = {
    position: 'relative',
    width: '100%',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '48px',
    padding: '8px 40px 8px 40px',
    fontSize: '15px',
    lineHeight: '1.4',
    color: '#1a1a1a',
    background: '#ffffff',
    border: '1px solid #d9d9d9',
    borderRadius: '6px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s ease',
    fontFamily: 'inherit',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '13px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '18px',
    height: '18px',
    pointerEvents: 'none',
    color: '#9b9b9b',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 2147483000,
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #d9d9d9',
    borderRadius: '6px',
    padding: '4px 0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    display: isOpen && items.length > 0 ? 'block' : 'none',
  };

  const itemBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: '1.4',
    color: '#1a1a1a',
    gap: '8px',
  };

  return (
    <div style={wrap} className={className} role="search">
      <div style={{ position: 'relative' }}>
        {/* Search icon */}
        <svg style={iconStyle} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          type="search"
          value={inputValue}
          onChange={onInput}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          style={inputStyle}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={isOpen && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
        />

        {isLoading && (
          <div
            style={{
              position: 'absolute',
              right: '13px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              border: '2px solid #e0e0e0',
              borderTopColor: '#146ef5',
              borderRadius: '50%',
              animation: 'wf-spin 0.7s linear infinite',
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Dropdown */}
      <div
        id={listId}
        role="listbox"
        aria-label="Template suggestions"
        style={dropdownStyle}
      >
        {items.map((item, i) => (
          <div
            key={item.template_slug}
            id={`${listId}-opt-${i}`}
            role="option"
            aria-selected={i === activeIndex}
            onMouseDown={(e) => { e.preventDefault(); selectItem(item); }}
            onMouseEnter={() => setActiveIndex(i)}
            style={{
              ...itemBaseStyle,
              background: i === activeIndex ? '#f5f5f5' : 'transparent',
            }}
          >
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {highlight(item.name, item.highlight)}
            </span>
            <span style={{ fontSize: '12px', color: '#9b9b9b', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {getCategoryLabel(item) && `${getCategoryLabel(item)} · `}
              {isFreeSuggestion(item) ? 'Free' : item.price ? `$${item.price}` : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Keyframe for spinner */}
      <style>{`@keyframes wf-spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
};
