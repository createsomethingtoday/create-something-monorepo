import puppeteer from '@cloudflare/puppeteer';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { imagesScript } from '../src/scripts/images.js';
import { performanceScript } from '../src/scripts/performance.js';
import { seoScript } from '../src/scripts/seo.js';
import { structureScript } from '../src/scripts/structure.js';
import { touchpointScript } from '../src/scripts/touchpoints.js';
import { getWebflowPolicySnapshot, refreshWebflowPolicySnapshot } from '../src/policy/index.js';

interface Env {
  BROWSER?: Fetcher;
  MCP_API_KEY?: string;
  WEBFLOW_SITE_ANALYZER_MCP_API_TOKEN?: string;
  WEBFLOW_SITE_ANALYZER_MCP_API_KEY?: string;
}

type AnalyzeOptions = {
  waitForSelector?: string;
  timeout?: number;
  viewport?: {
    width?: number;
    height?: number;
  };
  fullPage?: boolean;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
};

type SeoMetaTag = {
  name?: string;
  property?: string;
  content: string;
};

type SeoHeading = {
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  text: string;
  level: number;
  order: number;
};

type SeoIssue = {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  element?: string;
};

type SeoAnalysis = {
  url: string;
  timestamp: string;
  title: string;
  description: string;
  canonical: string | null;
  metaTags: SeoMetaTag[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  headings: SeoHeading[];
  h1Count: number;
  internalLinks: number;
  externalLinks: number;
  brokenLinks: string[];
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  hasRobotsMeta: boolean;
  isIndexable: boolean;
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  score: number;
  issues: SeoIssue[];
  recommendations: string[];
};

type ImageInfo = {
  src: string;
  alt: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  loading: 'lazy' | 'eager' | 'auto';
  format: string;
  isOptimized: boolean;
  issues: string[];
};

type ImageAnalysis = {
  url: string;
  timestamp: string;
  totalImages: number;
  images: ImageInfo[];
  byFormat: Record<string, number>;
  totalEstimatedSize: number;
  optimizationScore: number;
  recommendations: string[];
  analysisMode?: 'html_fetch' | 'browser';
};

type Touchpoint = {
  id: string;
  type: 'link' | 'button' | 'input' | 'select' | 'textarea' | 'form' | 'interactive' | 'navigation' | 'cta';
  tag: string;
  selector: string;
  text: string;
  href?: string | null;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes: Record<string, string>;
  isVisible: boolean;
  isAboveFold: boolean;
  zIndex: number;
  webflowClass?: string | null;
  webflowInteraction?: string | null;
};

type TouchpointAnalysis = {
  url: string;
  timestamp: string;
  totalCount: number;
  byType: Record<string, number>;
  touchpoints: Touchpoint[];
  warnings: string[];
  analysisMode?: 'html_fetch' | 'browser';
};

type PageSection = {
  id: string;
  tag: string;
  className: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  depth: number;
  children: PageSection[];
  webflowSymbol?: string | null;
  isNavbar?: boolean;
  isFooter?: boolean;
  isHero?: boolean;
};

type PageStructure = {
  url: string;
  timestamp: string;
  viewport: { width: number; height: number };
  documentHeight: number;
  sections: PageSection[];
  navbar?: PageSection | null;
  footer?: PageSection | null;
  mainContent?: PageSection | null;
  analysisMode?: 'html_fetch' | 'browser';
};

const SERVER_NAME = 'webflow-site-analyzer-mcp';
const SERVER_VERSION = '1.0.0';
const PRIMARY_API_TOKEN_ENV_VAR = 'WEBFLOW_SITE_ANALYZER_MCP_API_TOKEN';
const DEFAULT_TIMEOUT_MS = 60000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 120000;
const DEFAULT_VIEWPORT = { width: 1440, height: 960 };
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-Requested-With, X-API-Key',
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return withCors(
    new Response(JSON.stringify(payload, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );
}

function configuredApiKey(env: Env): string | null {
  const candidate =
    env.WEBFLOW_SITE_ANALYZER_MCP_API_TOKEN?.trim() ||
    env.WEBFLOW_SITE_ANALYZER_MCP_API_KEY?.trim() ||
    env.MCP_API_KEY?.trim() ||
    '';
  return candidate.length > 0 ? candidate : null;
}

function requestToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  const match = auth?.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) return match[1].trim();

  const xApiKey = request.headers.get('x-api-key')?.trim();
  if (xApiKey) return xApiKey;

  return new URL(request.url).searchParams.get('token')?.trim() ?? null;
}

function validateApiKey(request: Request, env: Env): Response | null {
  const expected = configuredApiKey(env);
  if (!expected) {
    return jsonResponse(
      {
        error: `${PRIMARY_API_TOKEN_ENV_VAR} is not configured for this deployment.`,
      },
      503,
    );
  }

  if (requestToken(request) !== expected) {
    return jsonResponse(
      {
        error: `Unauthorized. Provide Authorization: Bearer <${PRIMARY_API_TOKEN_ENV_VAR}>.`,
      },
      401,
    );
  }

  return null;
}

function ensureBrowserBinding(env: Env): Fetcher {
  if (!env.BROWSER) {
    throw new Error('Cloudflare Browser Rendering binding "BROWSER" is required for this deployment.');
  }
  return env.BROWSER;
}

function isWebflowPreview(url: string): boolean {
  return url.includes('preview.webflow.com/preview/');
}

function normalizeViewport(input?: AnalyzeOptions['viewport']): { width: number; height: number } {
  return {
    width: input?.width && input.width > 0 ? Math.floor(input.width) : DEFAULT_VIEWPORT.width,
    height: input?.height && input.height > 0 ? Math.floor(input.height) : DEFAULT_VIEWPORT.height,
  };
}

function resolveTimeoutMs(timeout?: number): number {
  if (!Number.isFinite(timeout)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(Math.max(Math.floor(timeout as number), MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
}

async function settle(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtmlTags(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(input: string): string {
  const decoded = input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return decoded
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

function cleanHtmlText(input: string): string {
  return decodeHtmlEntities(normalizeWhitespace(stripHtmlTags(input)));
}

function getImageFormat(src: string): string {
  const url = src.toLowerCase();

  if (!url) return 'unknown';
  if (url.includes('.webp')) return 'webp';
  if (url.includes('.avif')) return 'avif';
  if (url.includes('.jpg') || url.includes('.jpeg')) return 'jpeg';
  if (url.includes('.png')) return 'png';
  if (url.includes('.gif')) return 'gif';
  if (url.includes('.svg')) return 'svg';
  if (url.includes('data:image/')) {
    const match = url.match(/data:image\/(\w+)/);
    return match ? match[1] : 'data-uri';
  }

  return 'unknown';
}

function resolveAbsoluteUrl(value: string | null, baseUrl: URL): string {
  if (!value) return '';
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function parseDimension(value: string | null): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getClassList(tag: string): string[] {
  const classAttr = readAttribute(tag, 'class');
  return classAttr ? classAttr.split(/\s+/).filter(Boolean) : [];
}

function summarizeSelector(tagName: string, tag: string, classes: string[], id: string | null): string {
  if (id) return `#${id}`;
  const webflowClass = classes.find((entry) => entry.startsWith('w-'));
  if (webflowClass) return `.${webflowClass}`;
  if (classes.length > 0) return `${tagName}.${classes[0]}`;
  return tagName;
}

function readAttribute(tag: string, attributeName: string): string | null {
  const pattern = new RegExp(
    `${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + '`' + `]+))`,
    'i',
  );
  const match = pattern.exec(tag);
  const value = match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
  return value ? decodeHtmlEntities(value.trim()) : null;
}

async function fetchHtmlWithTimeout(url: string, timeoutMs: number): Promise<{ finalUrl: string; html: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'create-something-webflow-site-analyzer/1.0',
        accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`SEO fetch failed for ${url}: HTTP ${response.status}`);
    }

    return {
      finalUrl: response.url || url,
      html: await response.text(),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`SEO fetch for ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function collectStructuredDataTypes(rawJson: string): string[] {
  try {
    const parsed = JSON.parse(rawJson);
    const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
    const types: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') {
        continue;
      }

      const record = current as Record<string, unknown>;
      const typeValue = record['@type'];
      if (typeof typeValue === 'string') {
        types.push(typeValue);
      } else if (Array.isArray(typeValue)) {
        for (const item of typeValue) {
          if (typeof item === 'string') {
            types.push(item);
          }
        }
      }

      for (const value of Object.values(record)) {
        if (Array.isArray(value)) {
          for (const entry of value) queue.push(entry);
        } else if (value && typeof value === 'object') {
          queue.push(value);
        }
      }
    }

    return types;
  } catch {
    return [];
  }
}

function scoreSeoAnalysis(input: Omit<SeoAnalysis, 'score' | 'issues' | 'recommendations'>): SeoAnalysis {
  const issues: SeoIssue[] = [];
  const recommendations: string[] = [];

  if (!input.title) {
    issues.push({ severity: 'error', code: 'MISSING_TITLE', message: 'Page has no title tag' });
  } else if (input.title.length < 30) {
    issues.push({
      severity: 'warning',
      code: 'SHORT_TITLE',
      message: 'Title is too short (< 30 chars)',
      element: input.title,
    });
  } else if (input.title.length > 60) {
    issues.push({
      severity: 'warning',
      code: 'LONG_TITLE',
      message: 'Title is too long (> 60 chars)',
      element: input.title,
    });
  }

  if (!input.description) {
    issues.push({ severity: 'error', code: 'MISSING_DESCRIPTION', message: 'Page has no meta description' });
  } else if (input.description.length < 70) {
    issues.push({ severity: 'warning', code: 'SHORT_DESCRIPTION', message: 'Meta description is too short (< 70 chars)' });
  } else if (input.description.length > 160) {
    issues.push({ severity: 'warning', code: 'LONG_DESCRIPTION', message: 'Meta description is too long (> 160 chars)' });
  }

  if (input.h1Count === 0) {
    issues.push({ severity: 'error', code: 'MISSING_H1', message: 'Page has no H1 heading' });
  } else if (input.h1Count > 1) {
    issues.push({
      severity: 'warning',
      code: 'MULTIPLE_H1',
      message: `Page has multiple H1 headings (${input.h1Count})`,
    });
  }

  if (!input.canonical) {
    issues.push({ severity: 'info', code: 'MISSING_CANONICAL', message: 'Page has no canonical URL' });
    recommendations.push('Add a canonical URL to prevent duplicate content issues');
  }

  if (input.imagesWithoutAlt > 0) {
    issues.push({
      severity: 'warning',
      code: 'IMAGES_WITHOUT_ALT',
      message: `${input.imagesWithoutAlt} image(s) missing alt text`,
    });
  }

  if (!input.openGraph.title || !input.openGraph.description || !input.openGraph.image) {
    issues.push({
      severity: 'warning',
      code: 'INCOMPLETE_OG',
      message:
        'Open Graph tags are incomplete (missing ' +
        [!input.openGraph.title && 'title', !input.openGraph.description && 'description', !input.openGraph.image && 'image']
          .filter(Boolean)
          .join(', ') +
        ')',
    });
    recommendations.push('Complete Open Graph tags for better social sharing');
  }

  if (!input.hasStructuredData) {
    recommendations.push('Add structured data (JSON-LD) for rich search results');
  }

  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        score -= 15;
        break;
      case 'warning':
        score -= 5;
        break;
      case 'info':
        score -= 2;
        break;
    }
  }

  return {
    ...input,
    score: Math.max(0, score),
    issues,
    recommendations,
  };
}

async function extractSeoFromHtml(url: string, timeoutMs: number): Promise<SeoAnalysis> {
  const { finalUrl, html } = await fetchHtmlWithTimeout(url, timeoutMs);
  const baseUrl = new URL(finalUrl);

  const title = cleanHtmlText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');

  const metaTags: SeoMetaTag[] = [];
  const openGraph: Record<string, string> = {};
  const twitterCard: Record<string, string> = {};
  let description = '';
  let canonical: string | null = null;
  let hasRobotsMeta = false;
  let robotsContent = '';

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = readAttribute(tag, 'name');
    const property = readAttribute(tag, 'property');
    const content = readAttribute(tag, 'content') ?? '';

    if (!name && !property) {
      continue;
    }

    metaTags.push({
      ...(name ? { name } : {}),
      ...(property ? { property } : {}),
      content,
    });

    const lowerName = name?.toLowerCase();
    const lowerProperty = property?.toLowerCase();
    if (lowerName === 'description') {
      description = content;
    }
    if (lowerName === 'robots') {
      hasRobotsMeta = true;
      robotsContent = content.toLowerCase();
    }
    if (lowerProperty?.startsWith('og:')) {
      openGraph[lowerProperty.slice(3)] = content;
    }
    if (lowerName?.startsWith('twitter:')) {
      twitterCard[lowerName.slice(8)] = content;
    }
  }

  canonical = readAttribute(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0] ?? '', 'href');

  const headings: SeoHeading[] = [];
  let order = 0;
  for (const match of html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const tag = match[1].toLowerCase() as SeoHeading['tag'];
    headings.push({
      tag,
      text: cleanHtmlText(match[2]).slice(0, 200),
      level: Number.parseInt(tag.slice(1), 10),
      order: order++,
    });
  }

  let internalLinks = 0;
  let externalLinks = 0;
  const brokenLinks: string[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>` + '`' + `]+))[^>]*>/gi)) {
    const href = decodeHtmlEntities((match[1] ?? match[2] ?? match[3] ?? '').trim());
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
      continue;
    }

    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname === baseUrl.hostname || !resolved.hostname) {
        internalLinks += 1;
      } else {
        externalLinks += 1;
      }
    } catch {
      brokenLinks.push(href);
    }
  }

  let imagesWithAlt = 0;
  let imagesWithoutAlt = 0;
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const alt = readAttribute(match[0], 'alt');
    if (alt && alt.trim()) {
      imagesWithAlt += 1;
    } else {
      imagesWithoutAlt += 1;
    }
  }

  const structuredDataTypes = Array.from(
    new Set(
      Array.from(html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
        .flatMap((match) => collectStructuredDataTypes(match[1] ?? '')),
    ),
  );

  return scoreSeoAnalysis({
    url: finalUrl,
    timestamp: new Date().toISOString(),
    title,
    description,
    canonical,
    metaTags,
    openGraph,
    twitterCard,
    headings,
    h1Count: headings.filter((heading) => heading.tag === 'h1').length,
    internalLinks,
    externalLinks,
    brokenLinks,
    imagesWithAlt,
    imagesWithoutAlt,
    hasRobotsMeta,
    isIndexable: !robotsContent.includes('noindex'),
    hasStructuredData: structuredDataTypes.length > 0,
    structuredDataTypes,
  });
}

async function analyzeImagesFromHtml(url: string, timeoutMs: number): Promise<ImageAnalysis> {
  const { finalUrl, html } = await fetchHtmlWithTimeout(url, timeoutMs);
  const baseUrl = new URL(finalUrl);
  const images: ImageInfo[] = [];

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = resolveAbsoluteUrl(
      readAttribute(tag, 'src') ?? readAttribute(tag, 'data-src') ?? readAttribute(tag, 'srcset')?.split(',')[0]?.trim().split(/\s+/)[0] ?? '',
      baseUrl,
    );
    const alt = readAttribute(tag, 'alt') ?? '';
    const loading = ((readAttribute(tag, 'loading') ?? 'auto').toLowerCase() as ImageInfo['loading']) || 'auto';
    const width = parseDimension(readAttribute(tag, 'width'));
    const height = parseDimension(readAttribute(tag, 'height'));
    const format = getImageFormat(src);
    const issues: string[] = [];

    if (!['webp', 'avif', 'svg'].includes(format) && format !== 'unknown') {
      issues.push('Not using modern format (WebP/AVIF)');
    }
    if (!width || !height) {
      issues.push('No explicit dimensions (possible layout shift)');
    }
    if (loading !== 'lazy') {
      issues.push('Not explicitly lazy loaded');
    }

    images.push({
      src,
      alt,
      width,
      height,
      naturalWidth: width,
      naturalHeight: height,
      loading,
      format,
      isOptimized: issues.length === 0,
      issues,
    });
  }

  const byFormat = images.reduce<Record<string, number>>((acc, image) => {
    acc[image.format] = (acc[image.format] || 0) + 1;
    return acc;
  }, {});

  const estimateSize = (image: ImageInfo): number => {
    const pixels = Math.max(image.naturalWidth || image.width, 1) * Math.max(image.naturalHeight || image.height, 1);
    const bytesPerPixel: Record<string, number> = {
      webp: 0.1,
      avif: 0.08,
      jpeg: 0.2,
      png: 0.5,
      gif: 0.3,
      svg: 0.01,
      unknown: 0.2,
    };
    return Math.round(pixels * (bytesPerPixel[image.format] || 0.2));
  };

  const nonModernFormats = images.filter((image) => !['webp', 'avif', 'svg'].includes(image.format) && image.format !== 'unknown');
  const noLazyLoad = images.filter((image) => image.loading !== 'lazy');
  const missingAlt = images.filter((image) => !image.alt.trim());
  const missingDimensions = images.filter((image) => image.width === 0 || image.height === 0);
  const recommendations: string[] = [];

  if (nonModernFormats.length > 0) {
    recommendations.push(`Convert ${nonModernFormats.length} image(s) to WebP or AVIF for better compression`);
  }
  if (noLazyLoad.length > 0) {
    recommendations.push(`Review lazy loading for ${noLazyLoad.length} image(s)`);
  }
  if (missingAlt.length > 0) {
    recommendations.push(`Add alt text to ${missingAlt.length} image(s) for accessibility`);
  }
  if (missingDimensions.length > 0) {
    recommendations.push(`Add explicit dimensions to ${missingDimensions.length} image(s) to reduce layout shift`);
  }

  return {
    url: finalUrl,
    timestamp: new Date().toISOString(),
    totalImages: images.length,
    images,
    byFormat,
    totalEstimatedSize: images.reduce((sum, image) => sum + estimateSize(image), 0),
    optimizationScore: images.length > 0 ? Math.round((images.filter((image) => image.isOptimized).length / images.length) * 100) : 100,
    recommendations,
    analysisMode: 'html_fetch',
  };
}

function categorizeTouchpoint(tagName: string, classes: string[], role: string | null, text: string): Touchpoint['type'] {
  const lowerText = text.toLowerCase();
  const ctaPatterns = ['get started', 'sign up', 'subscribe', 'contact', 'book', 'schedule', 'demo', 'free trial'];

  if (tagName === 'nav' || classes.some((entry) => entry.includes('w-nav') || entry.includes('nav'))) {
    return 'navigation';
  }
  if (ctaPatterns.some((pattern) => lowerText.includes(pattern))) {
    return 'cta';
  }
  if (tagName === 'a') return 'link';
  if (tagName === 'button' || role === 'button' || classes.includes('w-button')) return 'button';
  if (tagName === 'form' || classes.includes('w-form')) return 'form';
  if (tagName === 'input') return 'input';
  if (tagName === 'select') return 'select';
  if (tagName === 'textarea') return 'textarea';
  return 'interactive';
}

async function analyzeTouchpointsFromHtml(url: string, timeoutMs: number): Promise<TouchpointAnalysis> {
  const { finalUrl, html } = await fetchHtmlWithTimeout(url, timeoutMs);
  const baseUrl = new URL(finalUrl);
  const touchpoints: Touchpoint[] = [];
  const seenKeys = new Set<string>();
  let idCounter = 0;

  const pairedTags = ['a', 'button', 'form', 'select', 'textarea'];
  for (const tagName of pairedTags) {
    const pattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
    for (const match of html.matchAll(pattern)) {
      const tag = `<${tagName}${match[1]}>`;
      const text = cleanHtmlText(match[2]).slice(0, 200);
      const classes = getClassList(tag);
      const id = readAttribute(tag, 'id');
      const role = readAttribute(tag, 'role');
      const href = tagName === 'a' ? resolveAbsoluteUrl(readAttribute(tag, 'href'), baseUrl) : null;
      const key = `${tagName}:${href ?? text}:${id ?? ''}:${classes.join('.')}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const attributes: Record<string, string> = {};
      for (const attr of ['action', 'data-action', 'data-track', 'data-analytics', 'aria-label', 'title', 'name', 'type', 'target', 'data-w-id', 'data-wf-page', 'data-ix']) {
        const value = readAttribute(tag, attr);
        if (value) attributes[attr] = value;
      }

      touchpoints.push({
        id: id || `touchpoint-${++idCounter}`,
        type: categorizeTouchpoint(tagName, classes, role, text),
        tag: tagName,
        selector: summarizeSelector(tagName, tag, classes, id),
        text,
        href,
        position: { x: 0, y: idCounter, width: 0, height: 0 },
        attributes,
        isVisible: true,
        isAboveFold: false,
        zIndex: 0,
        webflowClass: classes.find((entry) => entry.startsWith('w-')) || null,
        webflowInteraction: readAttribute(tag, 'data-w-id') ?? readAttribute(tag, 'data-ix'),
      });
    }
  }

  for (const match of html.matchAll(/<(input)\b([^>]*)>/gi)) {
    const tagName = match[1].toLowerCase();
    const tag = `<${tagName}${match[2]}>`;
    const classes = getClassList(tag);
    const id = readAttribute(tag, 'id');
    const typeAttr = readAttribute(tag, 'type') ?? '';
    const key = `${tagName}:${typeAttr}:${id ?? ''}:${classes.join('.')}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const attributes: Record<string, string> = {};
    for (const attr of ['aria-label', 'title', 'name', 'type', 'data-w-id', 'data-ix']) {
      const value = readAttribute(tag, attr);
      if (value) attributes[attr] = value;
    }

    touchpoints.push({
      id: id || `touchpoint-${++idCounter}`,
      type: 'input',
      tag: tagName,
      selector: summarizeSelector(tagName, tag, classes, id),
      text: '',
      href: null,
      position: { x: 0, y: idCounter, width: 0, height: 0 },
      attributes,
      isVisible: true,
      isAboveFold: false,
      zIndex: 0,
      webflowClass: classes.find((entry) => entry.startsWith('w-')) || null,
      webflowInteraction: readAttribute(tag, 'data-w-id') ?? readAttribute(tag, 'data-ix'),
    });
  }

  const byType = touchpoints.reduce<Record<string, number>>((acc, touchpoint) => {
    acc[touchpoint.type] = (acc[touchpoint.type] || 0) + 1;
    return acc;
  }, {});

  const warnings: string[] = ['HTML fallback mode used; viewport-specific touchpoint placement checks were skipped.'];
  if (!touchpoints.some((touchpoint) => touchpoint.type === 'cta')) {
    warnings.push('No CTA found in static markup');
  }
  const formsWithoutAction = touchpoints.filter(
    (touchpoint) =>
      touchpoint.type === 'form' &&
      !touchpoint.attributes.action &&
      !touchpoint.attributes['data-w-id'],
  );
  if (formsWithoutAction.length > 0) {
    warnings.push(`Form(s) found without action or Webflow handling: ${formsWithoutAction.length}`);
  }

  return {
    url: finalUrl,
    timestamp: new Date().toISOString(),
    totalCount: touchpoints.length,
    byType,
    touchpoints,
    warnings,
    analysisMode: 'html_fetch',
  };
}

async function getPageStructureFromHtml(url: string, timeoutMs: number): Promise<PageStructure> {
  const { finalUrl, html } = await fetchHtmlWithTimeout(url, timeoutMs);
  const sections: PageSection[] = [];
  let sectionCounter = 0;

  const pattern = /<(header|nav|main|footer|section|article|aside)\b([^>]*)>/gi;
  for (const match of html.matchAll(pattern)) {
    const tagName = match[1].toLowerCase();
    const tag = `<${tagName}${match[2]}>`;
    const classes = getClassList(tag);
    const id = readAttribute(tag, 'id');
    const section: PageSection = {
      id: id || `section-${++sectionCounter}`,
      tag: tagName,
      className: classes.join(' ').slice(0, 200),
      position: { x: 0, y: sectionCounter, width: 0, height: 0 },
      depth: 0,
      children: [],
      webflowSymbol: readAttribute(tag, 'data-w-id'),
      isNavbar: tagName === 'nav' || classes.some((entry) => entry.includes('navbar') || entry.includes('w-nav')),
      isFooter: tagName === 'footer' || classes.some((entry) => entry.includes('footer')),
      isHero: classes.some((entry) => entry.includes('hero')),
    };
    sections.push(section);
  }

  const navbar = sections.find((section) => section.isNavbar) || null;
  const footer = sections.find((section) => section.isFooter) || null;
  const mainContent = sections.find((section) => section.tag === 'main') || null;

  return {
    url: finalUrl,
    timestamp: new Date().toISOString(),
    viewport: { width: 0, height: 0 },
    documentHeight: 0,
    sections,
    navbar,
    footer,
    mainContent,
    analysisMode: 'html_fetch',
  };
}

async function withOperationTimeout<T>(
  label: string,
  timeoutMs: number,
  operation: () => Promise<T>,
  onTimeout?: () => Promise<void> | void,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const operationPromise = operation().catch((error) => {
    if (timedOut) {
      return new Promise<T>(() => {});
    }
    throw error;
  });

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      Promise.resolve(onTimeout?.())
        .catch(() => undefined)
        .finally(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        });
    }, timeoutMs);
  });

  try {
    return await Promise.race([operationPromise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function evaluateScript<T>(
  env: Env,
  url: string,
  script: string,
  options?: AnalyzeOptions,
  navigation: 'domcontentloaded' | 'networkidle0' = 'domcontentloaded',
): Promise<T> {
  const timeoutMs = resolveTimeoutMs(options?.timeout);
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    return await withOperationTimeout(
      `Analysis for ${url}`,
      timeoutMs,
      async () => {
        browser = await puppeteer.launch(ensureBrowserBinding(env), {
          keep_alive: 60_000,
        });
        const page = await browser.newPage();
        await page.setViewport(normalizeViewport(options?.viewport));
        await page.goto(url, {
          waitUntil: navigation,
          timeout: timeoutMs,
        });

        if (options?.waitForSelector) {
          await page.waitForSelector(options.waitForSelector, {
            timeout: timeoutMs,
          });
        }

        await settle(1000);

        if (isWebflowPreview(url)) {
          await page.waitForSelector('#site-iframe-next', {
            timeout: timeoutMs,
          });
          await settle(2500);
          const iframeHandle = await page.$('#site-iframe-next');
          if (!iframeHandle) {
            throw new Error('Webflow preview iframe not found.');
          }
          const frame = await iframeHandle.contentFrame();
          if (!frame) {
            throw new Error('Could not access Webflow preview iframe content.');
          }
          await frame.waitForSelector('body', { timeout: 10_000 });
          return await (frame as unknown as { evaluate(source: string): Promise<T> }).evaluate(script);
        }

        return await (page as unknown as { evaluate(source: string): Promise<T> }).evaluate(script);
      },
      async () => {
        try {
          await browser?.close();
        } catch {
          // Best-effort cleanup after timeout.
        }
      },
    );
  } finally {
    try {
      await browser?.close();
    } catch {
      // Browser may already be closed during timeout cleanup.
    }
  }
}

async function captureScreenshot(
  env: Env,
  url: string,
  options?: AnalyzeOptions,
): Promise<{ screenshot: string; format: 'png' | 'jpeg' }> {
  const timeoutMs = resolveTimeoutMs(options?.timeout);
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    return await withOperationTimeout(
      `Screenshot for ${url}`,
      timeoutMs,
      async () => {
        browser = await puppeteer.launch(ensureBrowserBinding(env), {
          keep_alive: 60_000,
        });
        const page = await browser.newPage();
        await page.setViewport(normalizeViewport(options?.viewport));
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: timeoutMs,
        });

        if (options?.waitForSelector) {
          await page.waitForSelector(options.waitForSelector, {
            timeout: timeoutMs,
          });
        }

        const requestedFormat = options?.format === 'jpeg' ? 'jpeg' : 'png';
        const screenshot = await page.screenshot({
          fullPage: options?.fullPage ?? true,
          type: requestedFormat,
          quality: requestedFormat === 'jpeg' ? (options?.quality ?? 80) : undefined,
        });

        return {
          screenshot: Buffer.from(screenshot).toString('base64'),
          format: requestedFormat,
        };
      },
      async () => {
        try {
          await browser?.close();
        } catch {
          // Best-effort cleanup after timeout.
        }
      },
    );
  } finally {
    try {
      await browser?.close();
    } catch {
      // Browser may already be closed during timeout cleanup.
    }
  }
}

async function getProviderStatus(env: Env): Promise<Record<string, unknown>> {
  ensureBrowserBinding(env);
  const [limits, sessions] = await Promise.all([puppeteer.limits(env.BROWSER!), puppeteer.sessions(env.BROWSER!)]);
  return {
    provider: 'cloudflare-browser-rendering',
    configured: true,
    limits,
    sessions,
  };
}

function buildServer(env: Env): Server {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'analyze_touchpoints',
        description: 'Extract interactive elements, CTA presence, and navigation touchpoints from a Webflow page.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL of the page to analyze.' },
            waitForSelector: { type: 'string', description: 'Optional selector to wait for before extraction.' },
            timeout: { type: 'number', description: 'Timeout in milliseconds.' },
          },
          required: ['url'],
        },
      },
      {
        name: 'extract_seo',
        description: 'Extract SEO metadata, heading structure, links, and image alt-text coverage.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to analyze.' },
            timeout: { type: 'number', description: 'Timeout in milliseconds.' },
          },
          required: ['url'],
        },
      },
      {
        name: 'get_page_structure',
        description: 'Extract structural sections including navbar, footer, and hero candidates.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to analyze.' },
            timeout: { type: 'number', description: 'Timeout in milliseconds.' },
          },
          required: ['url'],
        },
      },
      {
        name: 'analyze_images',
        description: 'Analyze image formats, dimensions, lazy loading, and alt text coverage.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to analyze.' },
            timeout: { type: 'number', description: 'Timeout in milliseconds.' },
          },
          required: ['url'],
        },
      },
      {
        name: 'get_performance',
        description: 'Get client-side load, paint, and resource timing metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to analyze.' },
            timeout: { type: 'number', description: 'Timeout in milliseconds.' },
          },
          required: ['url'],
        },
      },
      {
        name: 'capture_screenshot',
        description: 'Capture a screenshot of a page.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to capture.' },
            fullPage: { type: 'boolean', description: 'Capture full page or viewport only.' },
            viewport: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
            format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
            quality: { type: 'number', description: 'Quality 0-100 for jpeg screenshots.' },
          },
          required: ['url'],
        },
      },
      {
        name: 'get_provider_status',
        description: 'Get Browser Rendering quota and session status.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_webflow_review_policy',
        description: 'Fetch and normalize the Webflow submission guidelines and grading rubric.',
        inputSchema: {
          type: 'object',
          properties: {
            refresh: { type: 'boolean', description: 'Force a fresh fetch instead of cached data.' },
          },
        },
      },
      {
        name: 'refresh_webflow_review_policy',
        description: 'Force refresh policy ingestion from canonical Webflow pages.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = (args as Record<string, unknown> | undefined) || {};

    try {
      let result: unknown;

      switch (name) {
        case 'analyze_touchpoints':
          if (isWebflowPreview(safeArgs.url as string)) {
            result = await evaluateScript(
              env,
              safeArgs.url as string,
              touchpointScript,
              {
                waitForSelector: safeArgs.waitForSelector as string | undefined,
                timeout: safeArgs.timeout as number | undefined,
              },
            );
          } else {
            result = await analyzeTouchpointsFromHtml(
              safeArgs.url as string,
              resolveTimeoutMs(safeArgs.timeout as number | undefined),
            );
          }
          break;
        case 'extract_seo':
          if (isWebflowPreview(safeArgs.url as string)) {
            result = await evaluateScript(env, safeArgs.url as string, seoScript, {
              timeout: safeArgs.timeout as number | undefined,
            });
          } else {
            result = await extractSeoFromHtml(
              safeArgs.url as string,
              resolveTimeoutMs(safeArgs.timeout as number | undefined),
            );
          }
          break;
        case 'get_page_structure':
          if (isWebflowPreview(safeArgs.url as string)) {
            result = await evaluateScript(env, safeArgs.url as string, structureScript, {
              timeout: safeArgs.timeout as number | undefined,
            });
          } else {
            result = await getPageStructureFromHtml(
              safeArgs.url as string,
              resolveTimeoutMs(safeArgs.timeout as number | undefined),
            );
          }
          break;
        case 'analyze_images':
          if (isWebflowPreview(safeArgs.url as string)) {
            result = await evaluateScript(env, safeArgs.url as string, imagesScript, {
              timeout: safeArgs.timeout as number | undefined,
            });
          } else {
            result = await analyzeImagesFromHtml(
              safeArgs.url as string,
              resolveTimeoutMs(safeArgs.timeout as number | undefined),
            );
          }
          break;
        case 'get_performance':
          result = await evaluateScript(
            env,
            safeArgs.url as string,
            performanceScript,
            {
              timeout: safeArgs.timeout as number | undefined,
            },
            'networkidle0',
          );
          break;
        case 'capture_screenshot':
          result = await captureScreenshot(env, safeArgs.url as string, {
            timeout: safeArgs.timeout as number | undefined,
            fullPage: safeArgs.fullPage as boolean | undefined,
            format: safeArgs.format as 'png' | 'jpeg' | 'webp' | undefined,
            quality: safeArgs.quality as number | undefined,
            viewport: safeArgs.viewport as AnalyzeOptions['viewport'],
          });
          break;
        case 'get_provider_status':
          result = await getProviderStatus(env);
          break;
        case 'get_webflow_review_policy':
          result = await getWebflowPolicySnapshot(Boolean(safeArgs.refresh));
          break;
        case 'refresh_webflow_review_policy':
          result = await refreshWebflowPolicySnapshot();
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message, tool: name, arguments: safeArgs }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      let provider: Record<string, unknown> | undefined;
      if (env.BROWSER) {
        try {
          provider = await getProviderStatus(env);
        } catch {
          provider = { provider: 'cloudflare-browser-rendering', configured: true, status: 'unavailable' };
        }
      }

      return jsonResponse({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        endpoints: {
          mcp: '/mcp',
          health: '/health',
        },
        auth: {
          configured: Boolean(configuredApiKey(env)),
          header: `Authorization: Bearer <${PRIMARY_API_TOKEN_ENV_VAR}>`,
        },
        provider: provider ?? { provider: 'cloudflare-browser-rendering', configured: false },
      });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (request.method === 'GET') {
        return withCors(
          new Response(
            JSON.stringify(
              {
                error: 'GET event streams are not supported on this deployment. Use POST JSON-RPC on /mcp.',
              },
              null,
              2,
            ),
            {
              status: 405,
              headers: {
                'Allow': 'POST, OPTIONS',
                'Content-Type': 'application/json',
              },
            },
          ),
        );
      }

      const authError = validateApiKey(request, env);
      if (authError) return authError;

      const server = buildServer(env);
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      await server.connect(transport);
      return withCors(await transport.handleRequest(request));
    }

    return withCors(new Response('Not found', { status: 404 }));
  },
};
