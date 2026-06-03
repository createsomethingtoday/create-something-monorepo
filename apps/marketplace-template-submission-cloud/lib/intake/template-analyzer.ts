import {
  CATEGORY_OPTIONS,
  TEMPLATE_STYLES,
  WEBFLOW_FEATURES,
  type PageCountOption
} from './constants';
import { normalizePublishedUrl } from './published-url';
import { sanitizeLongDescriptionHtml } from '@create-something/webflow-dashboard-core/long-description';

const DEFAULT_TEMPLATE_ANALYZER_API_BASE =
  'https://webflow-template-analyzer.createsomething.workers.dev';
const REQUEST_TIMEOUT_MS = 150_000;

interface RawAnalyzerScreenshots {
  primary?: string;
  secondary?: string;
  gallery?: string[];
}

interface RawTemplateAnalyzerPayload {
  template_name?: string;
  short_description?: string;
  long_description?: string;
  categories?: string[];
  pricing?: string;
  page_type?: string;
  webflow_features_cms?: boolean;
  webflow_features_ecommerce?: boolean;
  styles?: string[];
  features?: string[];
  screenshots?: RawAnalyzerScreenshots;
}

export interface TemplateAnalyzerAutofill {
  templateName?: string;
  shortDescription?: string;
  longDescription?: string;
  categories: string[];
  priceModel?: 'Free' | 'Paid';
  pageCount?: PageCountOption;
  typeCms: boolean;
  typeEcommerce: boolean;
  styles: string[];
  featureIds: string[];
}

export interface TemplateAnalyzerResult {
  apiBase: string;
  autofill: TemplateAnalyzerAutofill;
  screenshotCount: number;
  screenshotsDownloadUrl?: string;
}

const CATEGORY_LOOKUP = new Map(CATEGORY_OPTIONS.map((value) => [normalizeToken(value), value]));
const STYLE_LOOKUP = new Map(TEMPLATE_STYLES.map((value) => [normalizeToken(value), value]));
const FEATURE_LOOKUP = new Map<string, string>();

for (const feature of WEBFLOW_FEATURES) {
  FEATURE_LOOKUP.set(normalizeToken(feature.label), feature.id);
}

FEATURE_LOOKUP.set(normalizeToken('Symbols'), 'symbols');
FEATURE_LOOKUP.set(normalizeToken('Components'), 'symbols');

function normalizeApiBase(value: string | undefined): string {
  const base = value?.trim();
  return (base && base.length > 0 ? base : DEFAULT_TEMPLATE_ANALYZER_API_BASE).replace(/\/$/, '');
}

function normalizeToken(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function dedupe<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function mapValues(
  values: readonly string[] | undefined,
  lookup: Map<string, string>,
  maxCount?: number
): string[] {
  if (!Array.isArray(values)) return [];

  const mapped = values
    .map((value) => lookup.get(normalizeToken(value)))
    .filter((value): value is string => Boolean(value));

  return dedupe(mapped).slice(0, maxCount);
}

function mapFeatureIds(values: readonly string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];

  return dedupe(
    values
      .map((value) => FEATURE_LOOKUP.get(normalizeToken(value)))
      .filter((value): value is string => Boolean(value))
  );
}

function mapPriceModel(value: string | undefined): 'Free' | 'Paid' | undefined {
  if (value === 'Free' || value === 'Paid') {
    return value;
  }

  return undefined;
}

function mapPageCount(value: string | undefined): PageCountOption | undefined {
  if (value === 'one_page') return 'One';
  if (value === 'multi_page') return 'Multi';
  if (value === 'multi_layout') return 'Multi-layout';
  return undefined;
}

function toParagraphs(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  return sanitizeLongDescriptionHtml(trimmed);
}

function countScreenshots(screenshots: RawAnalyzerScreenshots | undefined): number {
  if (!screenshots) return 0;

  return [
    screenshots.primary ? 1 : 0,
    screenshots.secondary ? 1 : 0,
    Array.isArray(screenshots.gallery) ? screenshots.gallery.length : 0
  ].reduce((total, count) => total + count, 0);
}

function mapPayload(payload: RawTemplateAnalyzerPayload): TemplateAnalyzerAutofill {
  return {
    templateName: payload.template_name?.trim() || undefined,
    shortDescription: payload.short_description?.trim() || undefined,
    longDescription: toParagraphs(payload.long_description),
    categories: mapValues(payload.categories, CATEGORY_LOOKUP, 2),
    priceModel: mapPriceModel(payload.pricing),
    pageCount: mapPageCount(payload.page_type),
    typeCms: payload.webflow_features_cms === true,
    typeEcommerce: payload.webflow_features_ecommerce === true,
    styles: mapValues(payload.styles, STYLE_LOOKUP, 2),
    featureIds: mapFeatureIds(payload.features)
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function analyzePublishedTemplate(url: string): Promise<TemplateAnalyzerResult> {
  const normalizedUrl = normalizePublishedUrl(url);
  const apiBase = normalizeApiBase(process.env.TEMPLATE_ANALYZER_API_BASE);
  const response = await fetchWithTimeout(
    `${apiBase}/analyze`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalizedUrl })
    },
    REQUEST_TIMEOUT_MS
  );

  const payload = (await response.json().catch(() => ({}))) as
    | RawTemplateAnalyzerPayload
    | { error?: string; detail?: string };

  if (!response.ok) {
    throw new Error(
      'detail' in payload && typeof payload.detail === 'string'
        ? payload.detail
        : 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : `Template analyzer request failed with status ${response.status}`
    );
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Template analyzer returned an invalid response.');
  }

  const rawPayload = payload as RawTemplateAnalyzerPayload;
  const screenshotCount = countScreenshots(rawPayload.screenshots);

  return {
    apiBase,
    autofill: mapPayload(rawPayload),
    screenshotCount,
    screenshotsDownloadUrl: screenshotCount > 0 ? `${apiBase}/screenshots/download` : undefined
  };
}
