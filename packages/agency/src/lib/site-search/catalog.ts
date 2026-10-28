import routes from '../data/searchRoutes.json';
import { quickAccessItems } from '../data/quickAccessItems';
import { workflowPages } from '../data/workflowPages';

export type SearchCategory = 'all' | 'overview' | 'guides';
export type SearchEntry = { id: string; title: string; description: string; excerpt: string; keywords: string[]; category: Exclude<SearchCategory, 'all'>; url: string };
const allowed = new Set(routes.map((route) => route.path));
export function isPublicSearchPage(path: string): boolean { return allowed.has(path); }
const overviews = quickAccessItems.filter((item) => allowed.has(item.href)).map((item) => ({
  id: item.href, title: item.label, description: item.description, keywords: item.keywords
}));
// Only public editorial sources. Never import account navigation or client data.
export const searchCatalog: SearchEntry[] = [
  ...overviews.map((entry) => ({ ...entry, excerpt: entry.description, category: 'overview' as const, url: `https://createsomething.agency${entry.id}` })),
  ...workflowPages.map((entry) => ({ id: `/workflows/${entry.slug}`, title: entry.title, description: entry.description, excerpt: entry.directAnswer, keywords: entry.keywords, category: 'guides' as const, url: `https://createsomething.agency/workflows/${entry.slug}` }))
].filter((entry) => allowed.has(entry.id));

export function validateSearch(input: unknown): { query: string; category: SearchCategory } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected search arguments.');
  const args = input as Record<string, unknown>;
  if (Object.keys(args).some((key) => !['query', 'category'].includes(key))) throw new Error('Unknown search argument.');
  if (typeof args.query !== 'string' || args.query.length > 160) throw new Error('Query must contain at most 160 characters.');
  const category = args.category ?? 'all';
  if (!['all', 'overview', 'guides'].includes(category as string)) throw new Error('Unknown category.');
  return { query: args.query.trim(), category: category as SearchCategory };
}

export function findResults(query: string, category: SearchCategory): SearchEntry[] {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return searchCatalog.filter((entry) => {
    const text = `${entry.title} ${entry.description} ${entry.keywords.join(' ')}`.toLocaleLowerCase();
    return (category === 'all' || category === entry.category) && words.every((word) => text.includes(word));
  });
}
