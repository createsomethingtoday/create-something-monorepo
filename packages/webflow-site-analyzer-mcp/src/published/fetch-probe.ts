import type { ClassifiedUrl, PublishedSitePrecheckResult } from '../types.js';

export type ClassifyPublishedUrls = (
  urls: string[],
  startUrl: string
) => Promise<ClassifiedUrl[]>;

function normalizeSameOriginUrl(rawUrl: string, origin: string): string | null {
  try {
    const parsed = new URL(rawUrl, origin);
    if (parsed.origin !== origin) return null;
    if (parsed.protocol === 'mailto:' || parsed.protocol === 'tel:' || parsed.protocol === 'javascript:') {
      return null;
    }
    parsed.hash = '';
    const path = parsed.pathname.replace(/\/$/, '') || '/';
    return `${parsed.origin}${path}${parsed.search}`;
  } catch {
    return null;
  }
}

function extractDiscoveredUrlsFromHtml(html: string, origin: string, limit = 50): string[] {
  const hrefPattern = /href\s*=\s*["']([^"'#]+)["']/gi;
  const discovered: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null = null;

  while ((match = hrefPattern.exec(html)) && discovered.length < limit) {
    const normalized = normalizeSameOriginUrl(match[1] || '', origin);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    discovered.push(normalized);
  }

  return discovered;
}

function extractUrlsFromSitemap(xml: string, origin: string, limit = 200): string[] {
  const locPattern = /<loc>([^<]+)<\/loc>/gi;
  const urls: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null = null;

  while ((match = locPattern.exec(xml)) && urls.length < limit) {
    const normalized = normalizeSameOriginUrl(match[1] || '', origin);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }

  return urls;
}

async function fetchTextWithTimeout(
  url: string,
  timeoutMs: number
): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'create-something-template-review/1.0'
      }
    });
    return {
      status: response.status,
      text: await response.text()
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runPublishedFetchProbe(
  publishedUrl: string,
  timeoutMs: number,
  classifyUrls: ClassifyPublishedUrls
): Promise<PublishedSitePrecheckResult> {
  const origin = new URL(publishedUrl).origin;
  const startUrl = normalizeSameOriginUrl(publishedUrl, origin) || `${origin}/`;
  const errors: string[] = [];
  const discovered = new Set<string>([startUrl]);
  let homepageFetchOk = false;

  try {
    const homepage = await fetchTextWithTimeout(startUrl, timeoutMs);
    if (homepage.status >= 400) {
      errors.push(`Homepage returned status ${homepage.status}`);
    } else {
      homepageFetchOk = true;
    }
    for (const url of extractDiscoveredUrlsFromHtml(homepage.text, origin, 50)) {
      discovered.add(url);
    }
  } catch (error) {
    errors.push(`Homepage fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const sitemapCandidates = [`${origin}/sitemap.xml`, `${origin}/sitemap-index.xml`];

  const sitemapPromise = (async () => {
    let sitemap: PublishedSitePrecheckResult['sitemap'] = {
      ok: false,
      error: 'Sitemap not found'
    };
    for (const candidate of sitemapCandidates) {
      try {
        const response = await fetchTextWithTimeout(candidate, timeoutMs);
        if (response.status >= 400) continue;
        const urls = extractUrlsFromSitemap(response.text, origin);
        if (urls.length === 0) continue;
        for (const url of urls) discovered.add(url);
        sitemap = { ok: true, count: urls.length, source: candidate };
        break;
      } catch {
        // Try the next sitemap candidate.
      }
    }
    return sitemap;
  })();

  const homepageUrls = Array.from(discovered).slice(0, 200);
  const classifyPromise = classifyUrls(homepageUrls, startUrl);

  const [sitemap, initialClassified] = await Promise.all([sitemapPromise, classifyPromise]);

  const discoveredUrls = Array.from(discovered).slice(0, 200);
  const newFromSitemap = discoveredUrls.filter((url) => !homepageUrls.includes(url));
  let classifiedUrls = initialClassified;

  if (newFromSitemap.length > 0) {
    const extraClassified = await classifyUrls(newFromSitemap, startUrl);
    classifiedUrls = [...initialClassified, ...extraClassified];
  }

  const hasClassification = (type: string) =>
    classifiedUrls.some((candidate) => candidate.classification === type);

  return {
    startUrl,
    origin,
    discoveredUrls,
    classifiedUrls,
    probe: {
      surface: 'fetch-precheck',
      homepageFetchOk,
      sitemapUsed: sitemap.ok === true,
      discoveredUrlCount: discoveredUrls.length,
      classifiedUrlCount: classifiedUrls.length
    },
    requiredPages: {
      licenses: hasClassification('utility:license'),
      instructions: hasClassification('utility:instructions'),
      changelog: hasClassification('utility:changelog')
    },
    sitemap,
    errors
  };
}
