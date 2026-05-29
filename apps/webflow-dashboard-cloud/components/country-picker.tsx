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

function normalize(value: string) {
  return value
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
  placeholder = 'Start typing to search...',
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

    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const filtered = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return countries;
    return countries.filter((country) => matches(country, tokens));
  }, [query, countries]);

  function commit(country: string) {
    onChange(country);
    setQuery(country);
    setOpen(false);
    setFocusedIndex(-1);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setFocusedIndex((index) => Math.min(index + 1, filtered.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusedIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      if (focusedIndex >= 0 && filtered[focusedIndex]) {
        event.preventDefault();
        commit(filtered[focusedIndex]);
      }
      return;
    }

    if (event.key === 'Escape') {
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
        onChange={(event) => {
          const nextValue = event.target.value;
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
            filtered.slice(0, 150).map((country, index) => (
              <li key={country}>
                <button
                  type="button"
                  role="option"
                  aria-selected={country === value}
                  className={
                    'submission-country-picker-item' +
                    (index === focusedIndex ? ' is-focused' : '') +
                    (country === value ? ' is-selected' : '')
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commit(country);
                  }}
                  onMouseEnter={() => setFocusedIndex(index)}
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
