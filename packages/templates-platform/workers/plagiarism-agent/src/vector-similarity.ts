/**
 * Vector Similarity Analysis for Plagiarism Detection
 * 
 * Uses embeddings to detect structural/semantic code similarity
 * that pattern matching might miss (renamed classes, refactored code, etc.)
 * 
 * Canon: Embeddings capture meaning; regex captures form.
 */

import OpenAI from 'openai';

// =============================================================================
// TYPES
// =============================================================================

export interface CodeFeatures {
  html_structure: string;
  css_patterns: string;
  js_logic: string;
  webflow_interactions: string;
  dom_hierarchy: string;
}

export interface VectorSimilarity {
  html_similarity: number;
  css_similarity: number;
  js_similarity: number;
  webflow_similarity: number;
  dom_similarity: number;
  overall: number;
  verdict: 'high_similarity' | 'moderate_similarity' | 'low_similarity';
}

// =============================================================================
// URL NORMALIZATION
// =============================================================================

/**
 * Convert Webflow preview URLs to published URLs
 * 
 * Preview URLs require authentication and may not be accessible.
 * Published URLs are publicly available and more reliable for analysis.
 */
export function normalizeWebflowUrl(url: string): string {
  // Handle preview.webflow.com URLs
  const previewMatch = url.match(/preview\.webflow\.com\/preview\/([^?]+)/);
  if (previewMatch) {
    const siteName = previewMatch[1];
    return `https://${siteName}.webflow.io/`;
  }

  // Handle template showcase URLs
  const templateMatch = url.match(/webflow\.com\/templates\/html\/([^?]+)/);
  if (templateMatch) {
    const templateName = templateMatch[1].replace(/-website-template$/, '');
    return `https://${templateName}.webflow.io/`;
  }

  // Already a published URL or other format
  return url;
}

/**
 * Extract multiple URLs from a field (handles newline-separated URLs)
 */
export function extractUrls(urlField: string): string[] {
  return urlField
    .split(/[\n,]/)
    .map(url => url.trim())
    .filter(url => url.length > 0)
    .map(url => normalizeWebflowUrl(url));
}

// =============================================================================
// CONTENT FETCHING
// =============================================================================

export interface FetchedContent {
  html: string;
  css: string;
  javascript: string;
  url: string;
}

/**
 * Fetch published content from URL with error handling
 */
export async function fetchPublishedContent(url: string): Promise<FetchedContent | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PlagiarismDetectionBot/1.0 (Webflow Template Review)'
      }
    });

    if (!response.ok) {
      console.log(`[Vector] Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract CSS links from HTML
    const cssLinks = extractCssLinks(html, url);
    const cssContents = await Promise.all(
      cssLinks.slice(0, 3).map(link => fetchCss(link)) // Limit to 3 main CSS files
    );
    const css = cssContents.filter(c => c).join('\n\n');

    // Extract inline scripts
    const javascript = extractInlineScripts(html);

    return { html, css, javascript, url };
  } catch (error) {
    console.log(`[Vector] Error fetching ${url}:`, error);
    return null;
  }
}

function extractCssLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkRegex = /<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    // Convert relative URLs to absolute
    if (href.startsWith('//')) {
      href = 'https:' + href;
    } else if (href.startsWith('/')) {
      const base = new URL(baseUrl);
      href = base.origin + href;
    } else if (!href.startsWith('http')) {
      const base = new URL(baseUrl);
      href = base.origin + '/' + href;
    }
    links.push(href);
  }

  return links;
}

async function fetchCss(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.log(`[Vector] Failed to fetch CSS: ${url}`);
  }
  return '';
}

function extractInlineScripts(html: string): string {
  const scripts: string[] = [];
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1].trim();
    if (content && !content.startsWith('http')) {
      scripts.push(content);
    }
  }

  return scripts.join('\n\n');
}

// =============================================================================
// FEATURE EXTRACTION
// =============================================================================

/**
 * Extract meaningful features from code for embedding
 */
export function extractCodeFeatures(content: FetchedContent): CodeFeatures {
  return {
    html_structure: extractHtmlStructure(content.html),
    css_patterns: extractCssPatterns(content.css),
    js_logic: extractJsLogic(content.javascript),
    webflow_interactions: extractWebflowInteractions(content.html),
    dom_hierarchy: extractDomHierarchy(content.html)
  };
}

function extractHtmlStructure(html: string): string {
  // Extract element hierarchy and class patterns
  const elements: string[] = [];
  
  // Get structural elements
  const structuralTags = ['nav', 'header', 'main', 'section', 'article', 'aside', 'footer'];
  for (const tag of structuralTags) {
    const count = (html.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;
    if (count > 0) {
      elements.push(`${tag}:${count}`);
    }
  }

  // Get common class patterns
  const classMatches = html.match(/class=["']([^"']+)["']/gi) || [];
  const classes = classMatches
    .map(m => m.match(/class=["']([^"']+)["']/)?.[1])
    .filter(Boolean)
    .slice(0, 50); // Limit to avoid token bloat

  // Get layout patterns
  const gridCount = (html.match(/grid|Grid/g) || []).length;
  const flexCount = (html.match(/flex|Flex/g) || []).length;

  return `Structure: ${elements.join(', ')}. Layout: grid(${gridCount}) flex(${flexCount}). Classes: ${classes.slice(0, 20).join(' ')}`;
}

function extractCssPatterns(css: string): string {
  if (!css) return 'No CSS';

  const patterns: string[] = [];

  // Extract selector patterns
  const selectors = css.match(/[.#][\w-]+/g) || [];
  const uniqueSelectors = [...new Set(selectors)].slice(0, 50);
  patterns.push(`Selectors: ${uniqueSelectors.slice(0, 30).join(' ')}`);

  // Extract common property patterns
  const propertyPatterns = [
    { name: 'grid', regex: /display:\s*grid/gi },
    { name: 'flex', regex: /display:\s*flex/gi },
    { name: 'absolute', regex: /position:\s*absolute/gi },
    { name: 'fixed', regex: /position:\s*fixed/gi },
    { name: 'transform', regex: /transform:/gi },
    { name: 'transition', regex: /transition:/gi }
  ];

  const propertyCounts = propertyPatterns.map(p => ({
    name: p.name,
    count: (css.match(p.regex) || []).length
  }));

  patterns.push(
    `Properties: ${propertyCounts.filter(p => p.count > 0).map(p => `${p.name}(${p.count})`).join(' ')}`
  );

  // Extract @keyframes
  const keyframes = css.match(/@keyframes\s+[\w-]+/gi) || [];
  if (keyframes.length > 0) {
    patterns.push(`Animations: ${keyframes.slice(0, 10).join(' ')}`);
  }

  return patterns.join('. ');
}

function extractJsLogic(js: string): string {
  if (!js || js.length < 50) return 'No significant JavaScript';

  const patterns: string[] = [];

  // Extract function patterns
  const functionMatches = js.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || [];
  if (functionMatches.length > 0) {
    patterns.push(`Functions: ${functionMatches.length}`);
  }

  // Extract common API usage
  const apis = ['addEventListener', 'querySelector', 'fetch', 'setTimeout', 'setInterval'];
  const apiUsage = apis
    .map(api => ({ api, count: (js.match(new RegExp(api, 'g')) || []).length }))
    .filter(a => a.count > 0);
  
  if (apiUsage.length > 0) {
    patterns.push(`APIs: ${apiUsage.map(a => `${a.api}(${a.count})`).join(' ')}`);
  }

  return patterns.join('. ');
}

function extractWebflowInteractions(html: string): string {
  const patterns: string[] = [];

  // Webflow IX2 interactions
  const dataWIds = html.match(/data-w-id="[^"]+"/g) || [];
  if (dataWIds.length > 0) {
    patterns.push(`IX2 IDs: ${dataWIds.length}`);
  }

  // Webflow node IDs (unique fingerprints)
  const nodeIds = html.match(/w-node-[a-f0-9-]+/g) || [];
  const uniqueNodeIds = [...new Set(nodeIds)];
  if (uniqueNodeIds.length > 0) {
    patterns.push(`Node IDs: ${uniqueNodeIds.slice(0, 10).join(' ')}`);
  }

  // Webflow-specific classes
  const wClasses = html.match(/w-[\w-]+/g) || [];
  const uniqueWClasses = [...new Set(wClasses)];
  if (uniqueWClasses.length > 0) {
    patterns.push(`W-Classes: ${uniqueWClasses.slice(0, 15).join(' ')}`);
  }

  return patterns.length > 0 ? patterns.join('. ') : 'No Webflow interactions';
}

function extractDomHierarchy(html: string): string {
  // Simplified DOM hierarchy extraction
  const hierarchy: string[] = [];

  // Common patterns
  const patterns = [
    'nav > ul > li',
    'header > div',
    'section > div',
    'article > div',
    'footer > div'
  ];

  for (const pattern of patterns) {
    const parts = pattern.split(' > ');
    let regex = html;
    let found = true;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const current = parts[i];
      const next = parts[i + 1];
      if (!regex.includes(`<${current}`) || !regex.includes(`<${next}`)) {
        found = false;
        break;
      }
    }
    
    if (found) {
      hierarchy.push(pattern);
    }
  }

  return hierarchy.length > 0 ? `Hierarchy: ${hierarchy.join(', ')}` : 'Simple structure';
}

// =============================================================================
// VECTOR EMBEDDINGS
// =============================================================================

/**
 * Compute embeddings using OpenAI
 */
export async function computeEmbeddings(
  features: CodeFeatures,
  apiKey: string
): Promise<Record<keyof CodeFeatures, number[]>> {
  const openai = new OpenAI({ apiKey });

  try {
    // Batch embedding request for efficiency
    const texts = [
      `[HTML] ${features.html_structure}`,
      `[CSS] ${features.css_patterns}`,
      `[JS] ${features.js_logic}`,
      `[Webflow] ${features.webflow_interactions}`,
      `[DOM] ${features.dom_hierarchy}`
    ];

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Cheaper, still effective
      input: texts,
      dimensions: 512 // Reduced dimensions for cost savings
    });

    return {
      html_structure: response.data[0].embedding,
      css_patterns: response.data[1].embedding,
      js_logic: response.data[2].embedding,
      webflow_interactions: response.data[3].embedding,
      dom_hierarchy: response.data[4].embedding
    };
  } catch (error) {
    console.error('[Vector] Embedding error:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// =============================================================================
// MAIN ANALYSIS
// =============================================================================

/**
 * Perform complete vector similarity analysis
 */
export async function analyzeVectorSimilarity(
  originalUrl: string,
  copyUrl: string,
  apiKey: string
): Promise<VectorSimilarity | null> {
  console.log(`[Vector] Analyzing similarity: ${originalUrl} vs ${copyUrl}`);

  // 1. Fetch content
  const [originalContent, copyContent] = await Promise.all([
    fetchPublishedContent(originalUrl),
    fetchPublishedContent(copyUrl)
  ]);

  if (!originalContent || !copyContent) {
    console.log('[Vector] Failed to fetch content for comparison');
    return null;
  }

  // 2. Extract features
  const originalFeatures = extractCodeFeatures(originalContent);
  const copyFeatures = extractCodeFeatures(copyContent);

  console.log('[Vector] Features extracted');

  // 3. Compute embeddings
  const [originalEmbeddings, copyEmbeddings] = await Promise.all([
    computeEmbeddings(originalFeatures, apiKey),
    computeEmbeddings(copyFeatures, apiKey)
  ]);

  console.log('[Vector] Embeddings computed');

  // 4. Calculate similarities
  const html_similarity = cosineSimilarity(
    originalEmbeddings.html_structure,
    copyEmbeddings.html_structure
  );

  const css_similarity = cosineSimilarity(
    originalEmbeddings.css_patterns,
    copyEmbeddings.css_patterns
  );

  const js_similarity = cosineSimilarity(
    originalEmbeddings.js_logic,
    copyEmbeddings.js_logic
  );

  const webflow_similarity = cosineSimilarity(
    originalEmbeddings.webflow_interactions,
    copyEmbeddings.webflow_interactions
  );

  const dom_similarity = cosineSimilarity(
    originalEmbeddings.dom_hierarchy,
    copyEmbeddings.dom_hierarchy
  );

  // 5. Weighted overall similarity
  const overall = (
    html_similarity * 0.25 +
    css_similarity * 0.30 +
    js_similarity * 0.15 +
    webflow_similarity * 0.20 +
    dom_similarity * 0.10
  );

  // 6. Determine verdict
  let verdict: VectorSimilarity['verdict'];
  if (overall >= 0.85) {
    verdict = 'high_similarity';
  } else if (overall >= 0.70) {
    verdict = 'moderate_similarity';
  } else {
    verdict = 'low_similarity';
  }

  const result = {
    html_similarity,
    css_similarity,
    js_similarity,
    webflow_similarity,
    dom_similarity,
    overall,
    verdict
  };

  console.log('[Vector] Analysis complete:', result);
  
  return result;
}
