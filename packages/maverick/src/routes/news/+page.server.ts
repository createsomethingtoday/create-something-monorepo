/**
 * News Page Server Load - Fetches content from KV at request time
 */

import type { PageServerLoad } from './$types';

export interface NewsArticle {
  id: string;
  date: string;
  title: string;
  excerpt: string;
  image: string;
  slug: string;
  featured: boolean;
  category: string;
}

export interface NewsContent {
  redesign?: {
    articles?: Array<{ date: string; kind: string; title: string; source: string; url: string }>;
  };
  title?: string;
  articles?: NewsArticle[];
}

// Press publication is versioned in source while the October launch review is pending.
export const load: PageServerLoad = () => ({ content: null });
