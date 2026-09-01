// Pure helpers shared across the extension. No DOM, no Designer API —
// everything here is unit-testable in isolation.

export const EXTENSION_VERSION = '1.3.4';

export function filterRetiredAccessibilityIssues<T extends { id: string }>(issues: readonly T[]): T[] {
  return issues.filter((issue) => issue.id !== 'color-contrast-violations');
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function decodeCommonHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export function ensureHttps(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:') {
      return `https:${url.slice(url.indexOf(':') + 1)}`;
    }
    return url;
  } catch {
    return `https://${url}`;
  }
}

export function getSlugPathname(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return '';

  try {
    const path = trimmed.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `/${trimmed}`;
    return new URL(path, 'https://example.com').pathname;
  } catch {
    const withoutQuery = trimmed.split(/[?#]/, 1)[0] || '';
    return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  }
}

const WEBFLOW_ECOMMERCE_TEMPLATE_ROOTS = new Set(['/product', '/sku', '/category']);

export function isInternalCmsTemplateSlug(value: string): boolean {
  const pathname = getSlugPathname(value);
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return /^\/detail_[^/]+\/?$/i.test(pathname) || WEBFLOW_ECOMMERCE_TEMPLATE_ROOTS.has(normalizedPathname.toLowerCase());
}

const HTML_TAG_STYLE_NAMES = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li',
  'blockquote', 'figure', 'figcaption', 'body', 'html'
]);

// Webflow displays tag selectors as e.g. "All H1 Headings", "All Paragraphs",
// "All Links", "Body (All Pages)"
const HTML_TAG_STYLE_DISPLAY_PATTERN = /^(all\s+(h[1-6]\s+headings?|paragraphs?|links?|lists?|list items?|images?|buttons?)|body\s*\(all pages\))$/i;

export function isHtmlTagStyleName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return HTML_TAG_STYLE_NAMES.has(normalized) || HTML_TAG_STYLE_DISPLAY_PATTERN.test(normalized);
}

export interface SiteDomainInfo {
  url: string;
  lastPublished: string | null;
  default?: boolean;
  stage?: 'staging' | 'production' | string;
}

export interface NormalizedSiteInfo {
  name: string | null;
  id: string | null;
  shortName?: string;
  isPasswordProtected?: boolean;
  isPrivateStaging?: boolean;
  workspaceId?: string;
  workspaceSlug?: string;
  domains?: SiteDomainInfo[];
}

export function normalizeSiteInfo(site: any): NormalizedSiteInfo {
  return {
    name: site?.siteName || site?.name || null,
    id: site?.siteId || site?.id || null,
    shortName: site?.shortName || undefined,
    isPasswordProtected: site?.isPasswordProtected,
    isPrivateStaging: site?.isPrivateStaging,
    workspaceId: site?.workspaceId,
    workspaceSlug: site?.workspaceSlug,
    domains: Array.isArray(site?.domains)
      ? site.domains.map((domain: any) => ({
          url: domain.url,
          lastPublished: domain.lastPublished ?? null,
          default: domain.default,
          stage: domain.stage,
        }))
      : [],
  };
}

export function selectValidationDomain(siteInfo?: NormalizedSiteInfo): {
  url: string | null;
  source: string;
  domain?: SiteDomainInfo;
} {
  const domains = Array.isArray(siteInfo?.domains) ? siteInfo.domains.filter(domain => domain.url) : [];
  const productionPublished = domains.find(domain => domain.stage === 'production' && domain.lastPublished);
  if (productionPublished) {
    return { url: productionPublished.url, source: 'published production domain', domain: productionPublished };
  }

  const defaultProduction = domains.find(domain => domain.stage === 'production' && domain.default);
  if (defaultProduction) {
    return { url: defaultProduction.url, source: 'default production domain', domain: defaultProduction };
  }

  const anyProduction = domains.find(domain => domain.stage === 'production');
  if (anyProduction) {
    return { url: anyProduction.url, source: 'production domain', domain: anyProduction };
  }

  const publishedStaging = domains.find(domain => domain.stage === 'staging' && domain.lastPublished);
  if (publishedStaging) {
    return { url: publishedStaging.url, source: 'published staging domain', domain: publishedStaging };
  }

  const anyStaging = domains.find(domain => domain.stage === 'staging');
  if (anyStaging) {
    return { url: anyStaging.url, source: 'staging domain', domain: anyStaging };
  }

  const firstDomain = domains[0];
  if (firstDomain) {
    return { url: firstDomain.url, source: 'available domain', domain: firstDomain };
  }

  if (siteInfo?.shortName) {
    return {
      url: `https://${siteInfo.shortName}.webflow.io`,
      source: 'Webflow staging short name',
    };
  }

  return { url: null, source: 'no published domain found' };
}
