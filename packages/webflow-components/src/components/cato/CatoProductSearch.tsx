import React, { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';

export interface CatoRiskRadarRow {
  mpn?: string;
  brand?: string;
  manufacturer?: string;
  name?: string;
  productName?: string;
  product_name?: string;
  description?: string;
  href?: string;
  url?: string;
  offers_arr?: Array<{ mpns?: string[] }>;
}

export interface CatoProductSearchFormProps {
  placeholder?: string;
  buttonLabel?: string;
  productSearchUrl?: string;
  initialQuery?: string;
  compact?: boolean;
}

export interface CatoRiskRadarCatalogProps {
  title?: string;
  summary?: string;
  ctaLabel?: string;
  riskRadarUrl?: string;
  apiUrl?: string;
  rowsJson?: string;
  fetchEnabled?: boolean;
  maxRows?: number;
  autoScroll?: boolean;
}

export interface CatoSupplySearchHeroProps extends CatoProductSearchFormProps, CatoRiskRadarCatalogProps {
  heading?: string;
  eyebrow?: string;
  body?: string;
  showRiskRadar?: boolean;
}

interface NormalizedRiskRow {
  mpn: string;
  brand: string;
  description: string;
  href?: string;
}

const DEFAULT_ROWS: CatoRiskRadarRow[] = [
  {
    mpn: 'A7017',
    brand: '3M',
    name: 'N95 particulate respirator supply watchlist',
  },
  {
    mpn: 'DYND70800',
    brand: 'Medline',
    name: 'Procedure mask alternate sourcing signal',
  },
  {
    mpn: '8881600145',
    brand: 'Cardinal Health',
    name: 'IV start kit backorder response option',
  },
  {
    mpn: 'NON27381',
    brand: 'McKesson',
    name: 'Isolation gown regional sourcing review',
  },
  {
    mpn: 'MSC095020',
    brand: 'Medline',
    name: 'Exam glove supply continuity watch',
  },
];

const PRODUCT_CSS = `
  .cato-search {
    --cato-bg: var(--background-color--background-primary, #ffffff);
    --cato-bg-soft: var(--background-color--background-secondary, #eaf5ec);
    --cato-cream: var(--base-color-cream--cream-100, #fbf9f4);
    --cato-cream-border: var(--base-color-cream--cream-600, #d9d3c5);
    --cato-text: var(--text-color--text-primary, #282723);
    --cato-muted: var(--text-color--text-secondary, rgba(40, 39, 35, .72));
    --cato-green: var(--base-color-green--green-900, #0a452e);
    --cato-green-mid: var(--base-color-green--green-800, #125a3b);
    --cato-green-bright: var(--base-color-green--green-400, #42c58f);
    --cato-blue: #2b638f;
    color: var(--cato-text);
    font-family: "Inter Variable", Inter, Arial, sans-serif;
    font-size: 1rem;
    line-height: 1.5;
  }
  .cato-search *, .cato-search *::before, .cato-search *::after { box-sizing: border-box; }
  .cato-search a { color: inherit; }
  .cato-search-shell { position: relative; overflow: hidden; background: linear-gradient(180deg, rgba(234,245,236,.96), rgba(251,249,244,.96)); padding: 8rem 1.25rem 5rem; }
  .cato-search-shell::before, .cato-search-shell::after {
    content: "c";
    position: absolute;
    z-index: 0;
    pointer-events: none;
    color: rgba(66,197,143,.12);
    font-size: 42rem;
    font-weight: 800;
    line-height: .7;
    font-family: Georgia, serif;
  }
  .cato-search-shell::before { left: -12rem; top: 9rem; transform: rotate(-22deg); }
  .cato-search-shell::after { right: -12rem; top: 9rem; transform: scaleX(-1) rotate(-22deg); }
  .cato-search-container { position: relative; z-index: 1; width: min(100%, 80rem); margin: 0 auto; }
  .cato-search-hero-copy { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; max-width: 45rem; margin: 0 auto 2.5rem; text-align: center; }
  .cato-search-eyebrow { color: var(--cato-green); margin: 0; font-weight: 800; text-transform: uppercase; font-size: .78rem; }
  .cato-search h1, .cato-search h2, .cato-search h3 { color: var(--cato-text); margin: 0; font-family: Switzer, Arial, sans-serif; font-weight: 400; }
  .cato-search h1 { font-size: 4rem; line-height: 1.2; letter-spacing: -.08rem; }
  .cato-search h2 { font-size: 2rem; line-height: 1.2; letter-spacing: -.04rem; }
  .cato-search h3 { font-size: 1rem; line-height: 1.25; letter-spacing: 0; }
  .cato-search-lede { color: var(--cato-muted); max-width: 45rem; margin: 0; font-size: 1.125rem; line-height: 1.55; }
  .cato-search-form { position: relative; width: min(100%, 54rem); margin: 0 auto; }
  .cato-search-form[data-compact="true"] { width: 100%; margin: 0; }
  .cato-search-input {
    width: 100%;
    height: 4.25rem;
    border: 2px solid var(--cato-cream-border);
    border-radius: .75rem;
    background: var(--cato-cream);
    color: var(--cato-text);
    box-shadow: 0 0 56px rgba(40,39,35,.04), 0 0 32px rgba(40,39,35,.08);
    padding: .75rem 8rem .75rem 1.5rem;
    font: inherit;
    font-size: 1.125rem;
  }
  .cato-search-input::placeholder { color: rgba(40,39,35,.45); }
  .cato-search-input:focus-visible { outline: 2px solid var(--cato-green-bright); outline-offset: 3px; border-color: var(--cato-green-bright); }
  .cato-search-submit {
    position: absolute;
    top: 50%;
    right: .75rem;
    transform: translateY(-50%);
    border: 0;
    border-radius: .55rem;
    min-height: 3rem;
    padding: .7rem 1.2rem;
    background: var(--cato-green-bright);
    color: var(--cato-green);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: background .18s, transform .18s, box-shadow .18s;
  }
  .cato-search-submit:hover { background: #58e0a8; transform: translateY(-52%); box-shadow: 0 .7rem 1.25rem rgba(10,69,46,.12); }
  .cato-radar-card {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 3rem;
    border: 1px solid var(--cato-cream-border);
    border-radius: 1.5rem;
    background: var(--cato-bg);
    margin-top: 4rem;
    padding: 3rem;
  }
  .cato-radar-copy { display: flex; flex-direction: column; align-items: flex-start; gap: 1.5rem; width: 100%; max-width: 23.5rem; }
  .cato-radar-copy p { color: var(--cato-muted); margin: 0; line-height: 1.5; }
  .cato-radar-link {
    display: inline-flex;
    align-items: center;
    gap: .75rem;
    border-radius: .55rem;
    background: var(--cato-blue);
    color: #fff;
    padding: .95rem 1.2rem;
    text-decoration: none;
    font-weight: 600;
    transition: transform .18s, box-shadow .18s, background .18s;
  }
  .cato-radar-link:hover { background: #255779; transform: translate3d(0, -.1rem, 0); box-shadow: 0 .7rem 1.25rem rgba(43,99,143,.18); }
  .cato-radar-table-shell {
    border: 1px solid var(--cato-cream-border);
    border-radius: .75rem;
    width: 100%;
    min-width: 0;
    height: 25.5rem;
    position: relative;
    overflow: hidden;
    background: #fff;
  }
  .cato-radar-scroller { overscroll-behavior: none; height: 100%; max-height: 100%; overflow: auto; font-size: .875rem; }
  .cato-radar-scroller::after {
    content: "";
    position: sticky;
    bottom: 0;
    display: block;
    height: 4rem;
    margin-top: -4rem;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,.94));
  }
  .cato-radar-table { width: 100%; border-collapse: collapse; }
  .cato-radar-table th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #53524f;
    color: #eae9e9;
    text-align: left;
    padding: .75rem 1rem;
    font-weight: 700;
    border-bottom: 1px solid #e8e4d9;
  }
  .cato-radar-table td { padding: .625rem 1rem; color: var(--cato-text); vertical-align: middle; border-bottom: 1px solid #e8e4d9; }
  .cato-radar-table tbody tr:nth-child(even) { background: var(--cato-cream); }
  .cato-radar-table a { color: var(--cato-text); text-decoration: none; }
  .cato-radar-table a:hover { text-decoration: underline; }
  .cato-radar-message { color: var(--cato-muted); padding: 1rem; margin: 0; }
  .cato-radar-message[data-tone="error"] { color: #a54035; }
  @media (prefers-reduced-motion: reduce) {
    .cato-search *, .cato-search *::before, .cato-search *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; }
  }
  @media (max-width: 991px) {
    .cato-radar-card { flex-direction: column; gap: 2rem; padding: 2rem; }
    .cato-radar-copy { max-width: none; }
    .cato-search-shell::before, .cato-search-shell::after { font-size: 30rem; opacity: .7; }
  }
  @media (max-width: 767px) {
    .cato-search-shell { padding-top: 6rem; }
    .cato-search h1 { font-size: 2.5rem; }
    .cato-search-input { height: auto; min-height: 4rem; padding: .9rem 1rem; }
    .cato-search-submit { position: static; width: 100%; margin-top: .75rem; transform: none; }
    .cato-search-submit:hover { transform: none; }
    .cato-radar-card { padding: 1.25rem; margin-top: 3rem; }
    .cato-radar-table-shell { height: 22rem; }
    .cato-radar-link { width: 100%; justify-content: center; }
  }
`;

function parseRows(json?: string): CatoRiskRadarRow[] {
  if (!json?.trim()) return DEFAULT_ROWS;
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? (parsed as CatoRiskRadarRow[]) : DEFAULT_ROWS;
  } catch {
    return DEFAULT_ROWS;
  }
}

function normalizeRow(row: CatoRiskRadarRow): NormalizedRiskRow {
  const offer = row.offers_arr?.[0];
  return {
    mpn: row.mpn || offer?.mpns?.[0] || '-',
    brand: row.manufacturer || row.brand || '-',
    description: row.name || row.productName || row.product_name || row.description || '-',
    href: row.href || row.url,
  };
}

function withSearchParam(baseUrl: string, query: string) {
  try {
    const url = new URL(baseUrl);
    if (query) url.searchParams.set('search', query);
    return url.toString();
  } catch {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return query ? `${baseUrl}${separator}search=${encodeURIComponent(query)}` : baseUrl;
  }
}

export const CatoProductSearchForm: React.FC<CatoProductSearchFormProps> = ({
  placeholder = 'Search by product, brand, manufacturer, part number, or description',
  buttonLabel = 'Search',
  productSearchUrl = 'https://app.catosupply.com/product_search/',
  initialQuery = '',
  compact = false,
}) => {
  const inputId = useId();
  const [query, setQuery] = useState(initialQuery);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    window.location.href = withSearchParam(productSearchUrl, trimmed);
  }

  return (
    <div className="cato-search">
      <style>{PRODUCT_CSS}</style>
      <form className="cato-search-form" data-compact={compact ? 'true' : undefined} onSubmit={submit} role="search">
        <label style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }} htmlFor={inputId}>
          {placeholder}
        </label>
        <input id={inputId} className="cato-search-input" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={placeholder} type="search" />
        <button className="cato-search-submit" type="submit">
          {buttonLabel}
        </button>
      </form>
    </div>
  );
};

export const CatoRiskRadarCatalog: React.FC<CatoRiskRadarCatalogProps> = ({
  title = 'Disrupted Medical Supplies Recently Sourced',
  summary = 'Access our live catalog here to track SKUs affected by market volatility.',
  ctaLabel = 'View Risk Radar',
  riskRadarUrl = 'https://app.catosupply.com/risk_radar/',
  apiUrl = 'https://app.catosupply.com/api/variations?tag=Risk+Radar',
  rowsJson,
  fetchEnabled = true,
  maxRows = 24,
  autoScroll = true,
}) => {
  const fallbackRows = useMemo(() => parseRows(rowsJson), [rowsJson]);
  const [rows, setRows] = useState<CatoRiskRadarRow[]>(fallbackRows);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(fetchEnabled ? 'loading' : 'ready');
  const [error, setError] = useState('');
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRows(fallbackRows);
  }, [fallbackRows]);

  useEffect(() => {
    if (!fetchEnabled || !apiUrl) {
      setStatus('ready');
      return;
    }

    const controller = new AbortController();
    setStatus('loading');
    setError('');

    fetch(apiUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        const nextRows = Array.isArray(data)
          ? data
          : data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results?: unknown }).results)
            ? ((data as { results: CatoRiskRadarRow[] }).results)
            : [];
        setRows(nextRows.length > 0 ? nextRows : fallbackRows);
        setStatus('ready');
      })
      .catch((fetchError: Error) => {
        if (controller.signal.aborted) return;
        setError(fetchError.message || 'Failed to load data.');
        setRows(fallbackRows);
        setStatus(fallbackRows.length > 0 ? 'ready' : 'error');
      });

    return () => controller.abort();
  }, [apiUrl, fallbackRows, fetchEnabled]);

  const visibleRows = rows.slice(0, Math.max(1, maxRows)).map(normalizeRow);

  useEffect(() => {
    if (!autoScroll || visibleRows.length < 6) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let frame = 0;
    let paused = false;
    let position = scroller.scrollTop;
    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };
    const step = () => {
      if (!paused && scroller.scrollHeight > scroller.clientHeight) {
        position += 0.45;
        if (position + scroller.clientHeight >= scroller.scrollHeight) position = 0;
        scroller.scrollTop = position;
      } else {
        position = scroller.scrollTop;
      }
      frame = window.requestAnimationFrame(step);
    };

    scroller.addEventListener('mouseenter', pause);
    scroller.addEventListener('mouseleave', resume);
    scroller.addEventListener('touchstart', pause, { passive: true });
    scroller.addEventListener('touchend', resume, { passive: true });
    frame = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frame);
      scroller.removeEventListener('mouseenter', pause);
      scroller.removeEventListener('mouseleave', resume);
      scroller.removeEventListener('touchstart', pause);
      scroller.removeEventListener('touchend', resume);
    };
  }, [autoScroll, visibleRows.length]);

  return (
    <div className="cato-search">
      <style>{PRODUCT_CSS}</style>
      <div className="cato-radar-card">
        <div className="cato-radar-copy">
          <div>
            <h2>{title}</h2>
            <p>{summary}</p>
          </div>
          <a className="cato-radar-link" href={riskRadarUrl}>
            {ctaLabel}
            <span aria-hidden="true">›</span>
          </a>
        </div>
        <div className="cato-radar-table-shell">
          <div className="cato-radar-scroller" ref={scrollerRef}>
            {status === 'loading' ? <p className="cato-radar-message">Loading disrupted supplies...</p> : null}
            {status === 'error' ? (
              <p className="cato-radar-message" data-tone="error">
                Error loading Risk Radar: {error}
              </p>
            ) : null}
            {visibleRows.length > 0 ? (
              <table className="cato-radar-table">
                <thead>
                  <tr>
                    <th>MPN</th>
                    <th>Brand</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, index) => (
                    <tr key={`${row.mpn}-${index}`}>
                      <td>{row.href ? <a href={row.href}>{row.mpn}</a> : row.mpn}</td>
                      <td>{row.brand}</td>
                      <td>{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : status !== 'loading' ? (
              <p className="cato-radar-message">No disrupted supplies found.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CatoSupplySearchHero: React.FC<CatoSupplySearchHeroProps> = ({
  eyebrow = '',
  heading = 'What Supply Gap Can We Help You Solve Today?',
  body = 'Cato finds out-of-stock, backordered, and on-allocation medical supplies to help your health system ensure uninterrupted care delivery.',
  placeholder,
  buttonLabel,
  productSearchUrl,
  initialQuery,
  showRiskRadar = true,
  ...riskRadarProps
}) => {
  return (
    <div className="cato-search">
      <style>{PRODUCT_CSS}</style>
      <section className="cato-search-shell">
        <div className="cato-search-container">
          <div className="cato-search-hero-copy">
            {eyebrow ? <p className="cato-search-eyebrow">{eyebrow}</p> : null}
            <h1>{heading}</h1>
            <p className="cato-search-lede">{body}</p>
          </div>
          <CatoProductSearchForm placeholder={placeholder} buttonLabel={buttonLabel} productSearchUrl={productSearchUrl} initialQuery={initialQuery} />
          {showRiskRadar ? <CatoRiskRadarCatalog {...riskRadarProps} /> : null}
        </div>
      </section>
    </div>
  );
};
