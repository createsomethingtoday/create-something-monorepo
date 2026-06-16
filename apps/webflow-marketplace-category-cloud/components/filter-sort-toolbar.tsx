'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  buildPageHref,
  type CategoryQuery,
  type SearchResponsePayload,
  type TemplateSort,
} from '../lib/template-search';

type DropdownKey = 'style' | 'type' | 'sort' | null;

const SORT_OPTIONS: Array<{ value: TemplateSort; label: string; group: 'order' | 'price' }> = [
  { value: 'popular', label: 'Popular', group: 'order' },
  { value: 'newest', label: 'Newest', group: 'order' },
  { value: 'price_asc', label: 'Price: low to high', group: 'price' },
  { value: 'price_desc', label: 'Price: high to low', group: 'price' },
];

const SORT_LABEL: Record<TemplateSort, string> = {
  popular: 'Popular',
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
};

export function FilterSortToolbar({
  query,
  payload,
}: {
  query: CategoryQuery;
  payload: SearchResponsePayload;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<DropdownKey>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function navigate(update: Partial<CategoryQuery>) {
    const merged: CategoryQuery = { ...query, ...update, page: 1 };
    router.push(buildPageHref(merged, 1));
  }

  function toggleStyle(slug: string, checked: boolean) {
    const next = checked ? [...query.styles, slug] : query.styles.filter((entry) => entry !== slug);
    navigate({ styles: next });
  }

  function toggleType(value: string) {
    const isActive = query.types.includes(value);
    navigate({ types: isActive ? [] : [value] });
  }

  function toggleFreeOnly(checked: boolean) {
    navigate({ freeOnly: checked });
  }

  function chooseSort(value: TemplateSort) {
    setOpen(null);
    navigate({ sort: value });
  }

  const styleSummary = query.styles.length > 0 ? `Style (${query.styles.length})` : 'Style';
  const typeSummary = query.types[0] ?? 'Type';
  const sortSummary = SORT_LABEL[query.sort];

  return (
    <div className="filter-sort-form w-form category-filter-sort" ref={rootRef}>
      <div className="filter-sort-container">
        <div className="mp-filter">
          <Dropdown
            label={styleSummary}
            isOpen={open === 'style'}
            onToggle={() => setOpen(open === 'style' ? null : 'style')}
            menuRole="menu"
          >
            <div className="category-dd-grid" role="group" aria-label="Filter by style">
              {payload.available_facets.styles.map((style) => {
                const checked = query.styles.includes(style.slug);
                return (
                  <label key={style.slug} className="category-dd-row">
                    <span
                      className={`category-dd-check${checked ? ' is-checked' : ''}`}
                      aria-hidden="true"
                    />
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => toggleStyle(style.slug, event.currentTarget.checked)}
                      className="category-visually-hidden-input"
                      aria-label={style.name}
                    />
                    <span className="category-dd-label">{style.name}</span>
                    <span className="category-dd-count">{style.count}</span>
                  </label>
                );
              })}
            </div>
          </Dropdown>

          <Dropdown
            label={typeSummary}
            isOpen={open === 'type'}
            onToggle={() => setOpen(open === 'type' ? null : 'type')}
            menuRole="menu"
          >
            <div className="category-dd-stack" role="radiogroup" aria-label="Filter by template type">
              {payload.available_facets.types.map((type) => {
                const checked = query.types.includes(type.value);
                return (
                  <label key={type.value} className="category-dd-row">
                    <span
                      className={`category-dd-radio${checked ? ' is-checked' : ''}`}
                      aria-hidden="true"
                    />
                    <input
                      type="radio"
                      name="category-type"
                      value={type.value}
                      checked={checked}
                      onChange={() => toggleType(type.value)}
                      className="category-visually-hidden-input"
                    />
                    <span className="category-dd-label">{type.value}</span>
                    <span className="category-dd-count">{type.count}</span>
                  </label>
                );
              })}
            </div>
            {query.types.length > 0 ? (
              <button
                type="button"
                className="category-clear category-dropdown-clear"
                onClick={() => navigate({ types: [] })}
              >
                Clear type
              </button>
            ) : null}
          </Dropdown>

          <div className="filter-free-wrapper">
            <label className="w-checkbox ms-toggle-wrap small">
              <input
                type="checkbox"
                checked={query.freeOnly}
                onChange={(event) => toggleFreeOnly(event.currentTarget.checked)}
                className="w-checkbox-input ms-toggle-checkbox"
              />
              <span className="ms-toggle-label w-form-label">Free only</span>
              <div className="ms-toggle-dot small" aria-hidden="true" />
              <div className="ms-toggle-bg small" aria-hidden="true" />
            </label>
          </div>
        </div>

        <Dropdown
          label={sortSummary}
          isOpen={open === 'sort'}
          onToggle={() => setOpen(open === 'sort' ? null : 'sort')}
          menuRole="listbox"
          alignEnd
        >
          {SORT_OPTIONS.map((option, index) => {
            const isCurrent = option.value === query.sort;
            const previous = SORT_OPTIONS[index - 1];
            const showSeparator = previous && previous.group !== option.group;
            return (
              <div key={option.value}>
                {showSeparator ? <div className="filter-sort-dropdown-list-separator" /> : null}
                <div className="filter-sort-dropdown-item-wrapper">
                  <div className="filter-sort-dropdown-caret-wrapper">
                    <span
                      className="filter-sort-dropdown-caret"
                      style={{ display: isCurrent ? 'inline-flex' : 'none' }}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  </div>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => chooseSort(option.value)}
                    className={`filter-sort-dropdown-item w-dropdown-link${isCurrent ? ' w--current' : ''}`}
                  >
                    {option.label}
                  </button>
                </div>
              </div>
            );
          })}
        </Dropdown>
      </div>
    </div>
  );
}

function Dropdown({
  label,
  isOpen,
  onToggle,
  menuRole,
  alignEnd,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  menuRole: 'menu' | 'listbox';
  alignEnd?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`filter-sort-wrapper w-dropdown${isOpen ? ' w--open' : ''}${
        alignEnd ? ' category-dropdown-end' : ''
      }`}
    >
      <div
        className="filter-sort-toggle w-dropdown-toggle"
        role="button"
        tabIndex={0}
        aria-haspopup={menuRole}
        aria-expanded={isOpen}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="filter-sort-toggle-label">{label}</div>
        <span className={`fs-dropdown-arrow category-dropdown-arrow${isOpen ? ' is-open' : ''}`} aria-hidden="true" />
      </div>
      <div
        className={`category-dd-panel${isOpen ? ' is-open' : ''}`}
        role={menuRole}
        aria-hidden={!isOpen}
      >
        {children}
      </div>
    </div>
  );
}
