import type { DocsVersion, PageRef } from './types.js';

export const DOCS_ORIGIN = 'https://developers.webflow.com';
export const ROOT_INDEX_URL = `${DOCS_ORIGIN}/llms.txt`;

/**
 * Sections that are not indexed: the v1 Data API is deprecated and its app
 * pages are copies of the current ones.
 */
const SKIPPED_PATH_PREFIXES = ['/data/v1.0.0/', '/flowkit/v1.0.0/'];
const BETA_SEGMENT = '/v2.0.0-beta/';
/** The docs site serves the default Data API version without a version segment. */
const DEFAULT_VERSION_SEGMENT = '/data/v2.0.0/';
const BETA_RANK_PENALTY = 10_000;

export interface IndexListing {
  /** Nested llms.txt indexes. */
  indexes: string[];
  pages: Array<{ sourceUrl: string; title: string }>;
}

/** Read the links of one llms.txt index. Only links to the docs origin are kept. */
export function parseIndex(text: string): IndexListing {
  const indexes: string[] = [];
  const pages: Array<{ sourceUrl: string; title: string }> = [];
  for (const match of text.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g)) {
    const title = match[1].trim();
    const href = match[2];
    if (!href.startsWith(`${DOCS_ORIGIN}/`)) continue;
    if (href.endsWith('/llms.txt')) indexes.push(href);
    else if (/\.mdx?$/.test(href)) pages.push({ sourceUrl: href, title });
  }
  return { indexes, pages };
}

/** Map a Markdown URL to the page it is indexed as, or null when the page is not indexed. */
export function toPageRef(sourceUrl: string, title: string): PageRef | null {
  let path: string;
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.origin !== DOCS_ORIGIN) return null;
    path = parsed.pathname;
  } catch {
    return null;
  }
  if (!/\.mdx?$/.test(path)) return null;
  if (SKIPPED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return null;

  const version: DocsVersion = path.includes(BETA_SEGMENT) ? 'beta' : 'current';
  let canonicalPath = path.replace(/\.mdx?$/, '');
  if (canonicalPath.startsWith(DEFAULT_VERSION_SEGMENT)) {
    canonicalPath = `/data/${canonicalPath.slice(DEFAULT_VERSION_SEGMENT.length)}`;
  }
  const product = canonicalPath.split('/').filter(Boolean)[0] ?? '';
  if (!product) return null;

  return {
    url: `${DOCS_ORIGIN}${canonicalPath}`,
    sourceUrl,
    title,
    product,
    version,
    rank: canonicalPath.length + (version === 'beta' ? BETA_RANK_PENALTY : 0),
  };
}

/**
 * The page content without the note block the docs site puts above the title
 * ("This page is for ...", "For clean Markdown ..."). That block differs between
 * copies of the same page, so it must not be part of the body hash.
 */
export function pageBody(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const titleStart = normalized.search(/^# /m);
  return (titleStart >= 0 ? normalized.slice(titleStart) : normalized).trim();
}
