'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Catalog } from '../lib/types';

type Saved = { data: Catalog; scroll: number; anchor?: { id: string; offset: number } };
const historyCache = new Map<string, Saved>();
let activeQuery: string | null = null;
export function rememberBrowsePosition() {
  if (!activeQuery) return;
  const saved = historyCache.get(activeQuery);
  if (!saved) return;
  const cards = document.querySelectorAll<HTMLElement>('.browse .card-entry');
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight && card.dataset.templateId) {
      historyCache.set(activeQuery, { ...saved, scroll: window.scrollY, anchor: {id:card.dataset.templateId, offset:rect.top} });
      return;
    }
  }
}
export function forgetBrowse() {
  historyCache.clear();
}
export function mergePages(previous: Catalog | null, next: Catalog): Catalog {
  const ids = new Set(previous?.items.map((item) => item.id));
  return {
    ...next,
    items: [
      ...(previous?.items || []),
      ...next.items.filter((item) => !ids.has(item.id) && !!ids.add(item.id))
    ]
  };
}

/** The observer reads refs so callbacks cannot launch duplicate or stale page requests. */
export function useInfiniteCatalog(query: string) {
  const saved = historyCache.get(query);
  const [data, setData] = useState<Catalog | null>(saved?.data || null);
  const [loading, setLoading] = useState(!saved);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [appendError, setAppendError] = useState('');
  const sentinel = useRef<HTMLDivElement>(null);
  const current = useRef(data);
  const request = useRef<AbortController | null>(null);
  const alive = useRef(false);
  const failed = useRef(false);

  const fetchPage = useCallback(
    async (page: number) => {
      if (request.current) return;
      const controller = new AbortController();
      request.current = controller;
      failed.current = false;
      setError('');
      setAppendError('');
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams(query);
        params.set('page', String(page));
        const response = await fetch('/api/catalog?' + params, { signal: controller.signal });
        if (!response.ok)
          throw new Error(
            'The catalog could not be reached. Your loaded templates are still here.'
          );
        const next: Catalog = await response.json();
        if (!alive.current || controller.signal.aborted) return;
        const merged = mergePages(page === 1 ? null : current.current, next);
        current.current = merged;
        setData(merged);
        historyCache.set(query, { data: merged, scroll: window.scrollY });
        if (historyCache.size > 8) historyCache.delete(historyCache.keys().next().value!);
      } catch (e) {
        if (!controller.signal.aborted && alive.current) {
          failed.current = true;
          const message =
            page === 1
              ? 'We couldn’t reach the catalog. Please try again.'
              : 'We couldn’t load more templates. Your loaded results are still here.';
          if (page === 1) setError(message);
          else setAppendError(message);
        }
      } finally {
        if (request.current === controller) request.current = null;
        if (alive.current && !controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query]
  );

  const loadMore = useCallback(() => {
    const last = current.current;
    if (last?.pagination.has_next_page) void fetchPage(last.pagination.page + 1);
  }, [fetchPage]);

  useEffect(() => {
    alive.current = true;
    activeQuery = query;
    const cached = historyCache.get(query);
    let frame = 0;
    const timer = cached
      ? window.setTimeout(() => {
          frame = requestAnimationFrame(() => {
            const anchor = cached.anchor && document.querySelector<HTMLElement>(`[data-template-id="${CSS.escape(cached.anchor.id)}"]`);
            window.scrollTo(0, anchor ? window.scrollY + anchor.getBoundingClientRect().top - cached.anchor!.offset : cached.scroll);
          });
        }, 50)
      : undefined;
    if (!cached) void fetchPage(1);
    const remember = () => {
      if (current.current)
        historyCache.set(query, { data: current.current, scroll: window.scrollY });
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => {
      alive.current = false;
      if (activeQuery === query) activeQuery = null;
      request.current?.abort();
      request.current = null;
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', remember);
    };
  }, [query, fetchPage]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || loading || loadingMore || appendError || !data?.pagination.has_next_page) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !failed.current) loadMore();
      },
      { rootMargin: '300px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, appendError, data, loadMore]);
  return {
    data,
    error,
    loading,
    retry: () => void fetchPage(1),
    loadingMore,
    appendError,
    loadMore,
    sentinel
  };
}
