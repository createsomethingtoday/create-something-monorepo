'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface CountryPickerProps {
  id?: string;
  countries: readonly string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matches(country: string, queryTokens: string[]) {
  const haystack = normalize(country);
  return queryTokens.every((token) => haystack.includes(token));
}

export function CountryPicker({
  id,
  countries,
  value,
  onChange,
  placeholder = 'Start typing to search…',
  required,
}: CountryPickerProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const skipNextQuerySyncRef = useRef(false);

  useEffect(() => {
    if (skipNextQuerySyncRef.current) {
      skipNextQuerySyncRef.current = false;
      return;
    }
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return countries;
    return countries.filter((c) => matches(c, tokens));
  }, [query, countries]);

  function commit(country: string) {
    onChange(country);
    setQuery(country);
    setOpen(false);
    setFocusedIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && filtered[focusedIndex]) {
        e.preventDefault();
        commit(filtered[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setFocusedIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="submission-country-picker">
      <input
        className="field-input input w-input"
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        required={required}
        onChange={(e) => {
          const nextValue = e.target.value;
          const exactMatch = countries.find(
            (country) => normalize(country) === normalize(nextValue)
          );
          const nextCountry = exactMatch ?? '';
          setQuery(exactMatch ?? nextValue);
          setOpen(true);
          setFocusedIndex(-1);
          if (nextCountry !== value) skipNextQuerySyncRef.current = true;
          onChange(nextCountry);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <ul className="submission-country-picker-menu" role="listbox">
          {filtered.length === 0 ? (
            <li className="submission-country-picker-empty">No matches</li>
          ) : (
            filtered.slice(0, 150).map((country, i) => (
              <li key={country}>
                <button
                  type="button"
                  role="option"
                  aria-selected={country === value}
                  className={
                    'submission-country-picker-item' +
                    (i === focusedIndex ? ' is-focused' : '') +
                    (country === value ? ' is-selected' : '')
                  }
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(country);
                  }}
                  onMouseEnter={() => setFocusedIndex(i)}
                >
                  {country}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
