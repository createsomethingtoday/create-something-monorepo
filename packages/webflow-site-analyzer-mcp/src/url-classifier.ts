/**
 * URL Classification Module
 *
 * Hybrid approach: deterministic pattern matching as fast fallback,
 * with optional LLM agent classification for ambiguous URLs.
 *
 * The deterministic classifier handles ~80% of cases (standard Webflow
 * naming conventions).  The LLM classifier handles edge cases like
 * non-standard paths, non-English templates, and creative naming.
 */

import type { ClassifiedUrl, PageClassification } from './types.js';

// =============================================================================
// Deterministic classifier (fast, free, testable)
// =============================================================================

interface PatternRule {
  pattern: RegExp;
  classification: PageClassification;
  priority: ClassifiedUrl['priority'];
}

const PATTERN_RULES: PatternRule[] = [
  // Error pages
  { pattern: /\/404\/?$/i, classification: 'error-page', priority: 'low' },
  { pattern: /\/password\/?$/i, classification: 'error-page', priority: 'low' },

  // Utility pages (critical for review)
  { pattern: /\/licens/i, classification: 'utility:license', priority: 'critical' },
  { pattern: /\/legal/i, classification: 'utility:license', priority: 'critical' },
  { pattern: /\/terms/i, classification: 'utility:license', priority: 'critical' },
  { pattern: /\/instruction/i, classification: 'utility:instructions', priority: 'critical' },
  { pattern: /\/guide/i, classification: 'utility:instructions', priority: 'critical' },
  { pattern: /\/change-?log/i, classification: 'utility:changelog', priority: 'critical' },
  { pattern: /\/release-notes/i, classification: 'utility:changelog', priority: 'critical' },
  { pattern: /\/style-?guide/i, classification: 'utility:style-guide', priority: 'critical' },
  { pattern: /\/styleguide/i, classification: 'utility:style-guide', priority: 'critical' },
  { pattern: /\/coming-soon/i, classification: 'utility:other', priority: 'low' },
  { pattern: /\/search\/?$/i, classification: 'utility:other', priority: 'low' },

  // CMS patterns (slug-based detail pages)
  { pattern: /\/[^/]+\/[^/]+-[^/]+$/i, classification: 'cms-detail', priority: 'normal' },

  // Ecommerce
  { pattern: /\/products?\//i, classification: 'ecommerce', priority: 'normal' },
  { pattern: /\/cart\/?$/i, classification: 'ecommerce', priority: 'normal' },
  { pattern: /\/checkout/i, classification: 'ecommerce', priority: 'normal' },
  { pattern: /\/shop/i, classification: 'ecommerce', priority: 'normal' },
];

/**
 * Classify a single URL using deterministic pattern matching.
 * Returns confidence 0.7 for pattern matches, 0.5 for default fallback.
 */
export function classifyUrlDeterministic(url: string, isHomepage: boolean): ClassifiedUrl {
  if (isHomepage) {
    return { url, classification: 'homepage', confidence: 1.0, priority: 'critical' };
  }

  for (const rule of PATTERN_RULES) {
    const path = new URL(url).pathname;
    if (rule.pattern.test(path)) {
      return {
        url,
        classification: rule.classification,
        confidence: 0.7,
        priority: rule.priority
      };
    }
  }

  return { url, classification: 'content', confidence: 0.5, priority: 'normal' };
}

/**
 * Classify all discovered URLs using deterministic patterns.
 */
export function classifyUrlsDeterministic(
  urls: string[],
  startUrl: string
): ClassifiedUrl[] {
  return urls.map((url) => classifyUrlDeterministic(url, url === startUrl));
}

// =============================================================================
// LLM classifier (accurate, handles edge cases, costs ~$0.001)
// =============================================================================

const CLASSIFICATION_PROMPT = `Classify each URL into exactly one category. Return JSON array.

Categories:
- homepage: The main landing page
- content: Regular content pages (about, contact, pricing, FAQ, etc.)
- utility:license: License/terms/legal pages
- utility:instructions: Instructions/setup/guide pages
- utility:changelog: Changelog/release notes pages
- utility:style-guide: Style guide/design system pages
- utility:other: Other utility pages (coming soon, search, etc.)
- cms-listing: CMS collection list pages (blog index, events index)
- cms-detail: CMS collection detail pages (individual blog post, event)
- ecommerce: Shopping/cart/checkout pages
- error-page: 404, password, error pages
- other: Uncategorizable

For each URL, return: {"url": "...", "classification": "...", "confidence": 0.0-1.0}

URLs to classify:
`;

export interface LLMClassifierOptions {
  /** API key. If not provided, falls back to deterministic. */
  apiKey?: string;
  /** Model to use. Default: llama-3.3-70b-versatile (Groq) or gpt-4o-mini (OpenAI). */
  model?: string;
  /** API base URL. Default: Groq if GROQ_API_KEY set, else OpenAI. */
  baseUrl?: string;
  /** Timeout in ms. Default: 10000 (Groq is fast enough for 10s). */
  timeout?: number;
}

/**
 * Classify URLs using an LLM for higher accuracy on ambiguous paths.
 * Uses OpenAI API (gpt-4o-mini by default).
 * Falls back to deterministic classification on any error.
 */
export async function classifyUrlsWithLLM(
  urls: string[],
  startUrl: string,
  options: LLMClassifierOptions = {}
): Promise<ClassifiedUrl[]> {
  // Prefer Groq (fast, cheap) → OpenAI fallback → deterministic
  const groqKey = process.env.WEBFLOW_GROQ_API_KEY;
  const openaiKey = process.env.WEBFLOW_OPENAI_API_KEY;
  const apiKey = options.apiKey || groqKey || openaiKey;
  if (!apiKey || urls.length === 0) {
    return classifyUrlsDeterministic(urls, startUrl);
  }

  const useGroq = !options.baseUrl && (options.apiKey === groqKey || (!options.apiKey && groqKey));
  const baseUrl = options.baseUrl || (useGroq
    ? 'https://api.groq.com/openai/v1'
    : 'https://api.openai.com/v1');
  const model = options.model || (useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');
  const timeout = options.timeout || 10000;

  // Only send paths (not full URLs) to minimize tokens
  const origin = new URL(startUrl).origin;
  const paths = urls.map((u) => {
    try { return new URL(u).pathname; }
    catch { return u; }
  });

  const prompt = CLASSIFICATION_PROMPT + paths.map((p) => `- ${p}`).join('\n');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        temperature: 0,
        // Groq supports json_mode on llama models
        ...(useGroq
          ? { response_format: { type: 'json_object' } }
          : { response_format: { type: 'json_object' } }),
        messages: [
          {
            role: 'system',
            content: 'You classify website URLs into page categories. Always respond with valid JSON containing a "urls" array.'
          },
          { role: 'user', content: prompt }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`URL classifier LLM returned ${response.status}, falling back to deterministic`);
      return classifyUrlsDeterministic(urls, startUrl);
    }

    const result = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const text = result.choices?.[0]?.message?.content || '';
    // OpenAI with json_object mode returns {"urls": [...]} or just [...]
    const jsonObj = JSON.parse(text);
    const parsedArray = Array.isArray(jsonObj) ? jsonObj : (jsonObj.urls || []);
    if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
      return classifyUrlsDeterministic(urls, startUrl);
    }

    const parsed = parsedArray as Array<{
      url?: string;
      classification?: string;
      confidence?: number;
    }>;

    // Map LLM results back to full URLs with priority inference
    const validClassifications = new Set<PageClassification>([
      'homepage', 'content', 'utility:license', 'utility:instructions',
      'utility:changelog', 'utility:style-guide', 'utility:other',
      'cms-listing', 'cms-detail', 'ecommerce', 'error-page', 'other'
    ]);

    return urls.map((url, index) => {
      const path = paths[index];
      const llmResult = parsed.find(
        (r) => r.url === path || r.url === url
      ) || parsed[index];

      if (!llmResult || !validClassifications.has(llmResult.classification as PageClassification)) {
        // LLM didn't classify this URL — fall back
        return classifyUrlDeterministic(url, url === startUrl);
      }

      const classification = llmResult.classification as PageClassification;
      const confidence = typeof llmResult.confidence === 'number'
        ? Math.min(1, Math.max(0, llmResult.confidence))
        : 0.8;

      const priority: ClassifiedUrl['priority'] =
        classification.startsWith('utility:') && classification !== 'utility:other'
          ? 'critical'
          : classification === 'homepage' ? 'critical'
          : classification === 'error-page' ? 'low'
          : 'normal';

      return { url, classification, confidence, priority };
    });
  } catch (error) {
    console.warn('URL classifier LLM failed, falling back to deterministic:', error);
    return classifyUrlsDeterministic(urls, startUrl);
  }
}

// =============================================================================
// Hybrid classifier (public API)
// =============================================================================

export interface ClassifyOptions extends LLMClassifierOptions {
  /** Use LLM classification. Default: true if API key available. */
  useLLM?: boolean;
}

/**
 * Classify URLs using the best available method.
 * LLM (OpenAI gpt-4o-mini) if API key is available; deterministic otherwise.
 */
export async function classifyUrls(
  urls: string[],
  startUrl: string,
  options: ClassifyOptions = {}
): Promise<ClassifiedUrl[]> {
  const useLLM = options.useLLM ?? Boolean(
    options.apiKey || process.env.WEBFLOW_GROQ_API_KEY || process.env.WEBFLOW_OPENAI_API_KEY
  );

  if (useLLM) {
    return classifyUrlsWithLLM(urls, startUrl, options);
  }

  return classifyUrlsDeterministic(urls, startUrl);
}
