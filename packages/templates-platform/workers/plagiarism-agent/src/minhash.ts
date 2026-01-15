/**
 * MinHash Implementation for CSS/HTML Plagiarism Detection
 * 
 * MinHash provides locality-sensitive hashing that allows efficient
 * estimation of Jaccard similarity between large documents.
 * 
 * Advantages over embeddings:
 * - No token limits (handles 200KB+ files)
 * - Deterministic (same input = same output)
 * - $0 cost (no API calls)
 * - Proven accuracy (used by Google, academia)
 * 
 * Canon: Convergence through structure, not semantics.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

// Number of hash functions (more = higher accuracy, larger signature)
// 128 gives ~98% accuracy for Jaccard estimation
const NUM_HASHES = 128;

// Shingle size (number of characters per shingle)
// 5-9 is typical for code; 7 balances granularity vs noise
const SHINGLE_SIZE = 7;

// Large prime for hash function
const PRIME = 4294967311n; // 2^32 + 15, a prime

// Maximum hash value (2^32)
const MAX_HASH = 4294967295n;

// =============================================================================
// TYPES
// =============================================================================

export interface MinHashSignature {
  signature: number[];
  numShingles: number;
  documentType: 'css' | 'html' | 'js' | 'combined';
}

export interface SimilarityResult {
  jaccardEstimate: number;
  confidence: 'high' | 'medium' | 'low';
  shingleOverlapEstimate: number;
}

// =============================================================================
// HASH FUNCTIONS
// =============================================================================

// Pre-computed random coefficients for hash functions
// Using deterministic "random" values for reproducibility
const hashCoefficients: Array<{ a: bigint; b: bigint }> = [];

function initializeHashFunctions(): void {
  if (hashCoefficients.length > 0) return;
  
  // Use a simple PRNG seeded with a fixed value for reproducibility
  let seed = 42n;
  const nextRandom = (): bigint => {
    seed = (seed * 1103515245n + 12345n) % (2n ** 31n);
    return seed;
  };
  
  for (let i = 0; i < NUM_HASHES; i++) {
    hashCoefficients.push({
      a: (nextRandom() % (PRIME - 1n)) + 1n, // a must be non-zero
      b: nextRandom() % PRIME
    });
  }
}

/**
 * Compute hash for a shingle using the i-th hash function
 * Uses the formula: h(x) = (a*x + b) mod p
 */
function computeHash(shingleHash: bigint, index: number): number {
  const { a, b } = hashCoefficients[index];
  const result = ((a * shingleHash + b) % PRIME) % MAX_HASH;
  return Number(result);
}

/**
 * Convert a string shingle to a numeric hash
 */
function shingleToHash(shingle: string): bigint {
  let hash = 0n;
  for (let i = 0; i < shingle.length; i++) {
    hash = (hash * 31n + BigInt(shingle.charCodeAt(i))) % PRIME;
  }
  return hash;
}

// =============================================================================
// SHINGLING
// =============================================================================

/**
 * Create character-level shingles from text
 */
function createShingles(text: string, size: number = SHINGLE_SIZE): Set<string> {
  const shingles = new Set<string>();
  
  // Normalize: lowercase, collapse whitespace
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  
  for (let i = 0; i <= normalized.length - size; i++) {
    shingles.add(normalized.slice(i, i + size));
  }
  
  return shingles;
}

/**
 * Create token-level shingles (for CSS selectors)
 * This captures structural patterns better than character shingles
 */
function createTokenShingles(tokens: string[], size: number = 3): Set<string> {
  const shingles = new Set<string>();
  
  for (let i = 0; i <= tokens.length - size; i++) {
    shingles.add(tokens.slice(i, i + size).join('|'));
  }
  
  return shingles;
}

// =============================================================================
// CSS-SPECIFIC EXTRACTION
// =============================================================================

/**
 * Extract meaningful tokens from CSS for shingling
 * Focuses on selectors and property patterns
 */
export function extractCssTokens(css: string): string[] {
  const tokens: string[] = [];
  
  // ==========================================================================
  // HIGHEST WEIGHT: Property-value declarations (the design fingerprint)
  // ==========================================================================
  
  // Normalize CSS for consistent extraction
  const normalizedCss = css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Extract full property-value pairs (HIGHEST SIGNAL)
  // These define the actual visual output - class names can change but values persist
  const declarationRegex = /([\w-]+)\s*:\s*([^;{}]+)/g;
  let match;
  while ((match = declarationRegex.exec(normalizedCss)) !== null) {
    const prop = match[1].toLowerCase().trim();
    const value = match[2].trim();
    
    // Skip Webflow internals and common resets
    if (prop.startsWith('-webkit-') || prop.startsWith('-moz-') || prop.startsWith('-ms-')) continue;
    if (value === 'inherit' || value === 'initial' || value === 'unset') continue;
    
    // HIGH PRIORITY: Design-defining properties (add multiple times for weight)
    const highPriorityProps = [
      'transform', 'box-shadow', 'text-shadow', 'background', 'background-image',
      'border-radius', 'filter', 'backdrop-filter', 'clip-path', 'animation',
      'transition', 'gradient', 'linear-gradient', 'radial-gradient'
    ];
    
    const isHighPriority = highPriorityProps.some(hp => prop.includes(hp) || value.includes(hp));
    
    // Create property-value token
    const declToken = `DECL:${prop}:${value}`;
    tokens.push(declToken);
    
    // Add extra weight for design-defining properties
    if (isHighPriority) {
      tokens.push(declToken);
      tokens.push(declToken);
    }
  }
  
  // ==========================================================================
  // HIGH WEIGHT: Specific value patterns (numeric fingerprints)
  // ==========================================================================
  
  // Extract transform values (unique design choices)
  const transformMatches = normalizedCss.match(/transform\s*:\s*([^;]+)/gi) || [];
  for (const t of transformMatches) {
    // Extract individual transform functions
    const funcs = t.match(/(translate|rotate|scale|skew|matrix)[XYZ23d]*\([^)]+\)/gi) || [];
    funcs.forEach(f => tokens.push(`TRANSFORM:${f.toLowerCase()}`));
  }
  
  // Extract timing functions (animation personality)
  const timingMatches = normalizedCss.match(/(\d+\.?\d*m?s|cubic-bezier\([^)]+\)|ease-in-out|ease-in|ease-out|ease|linear)/gi) || [];
  timingMatches.forEach(t => tokens.push(`TIMING:${t.toLowerCase()}`));
  
  // Extract specific numeric patterns (design dimensions)
  const numericPatterns = normalizedCss.match(/:\s*(-?\d+\.?\d*)(px|rem|em|%|vh|vw|deg)/gi) || [];
  numericPatterns.forEach(n => {
    const normalized = n.replace(/^:\s*/, '').toLowerCase();
    // Only include distinctive values (not common ones like 0, 100%, etc)
    if (!['0px', '0', '100%', '50%', '1', '1px'].includes(normalized)) {
      tokens.push(`NUM:${normalized}`);
    }
  });
  
  // Extract color values (palette fingerprint)
  const hexColors = normalizedCss.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g) || [];
  hexColors.forEach(c => {
    const color = c.toLowerCase();
    // Skip very common colors
    if (!['#fff', '#ffffff', '#000', '#000000', '#333', '#333333', '#666', '#999', '#ccc', '#eee'].includes(color)) {
      tokens.push(`COLOR:${color}`);
      tokens.push(`COLOR:${color}`); // Double weight for colors
    }
  });
  
  const rgbColors = normalizedCss.match(/rgba?\([^)]+\)/gi) || [];
  rgbColors.forEach(c => tokens.push(`COLOR:${c.toLowerCase().replace(/\s/g, '')}`));
  
  // Extract gradient definitions (complex design element)
  const gradients = normalizedCss.match(/(linear|radial|conic)-gradient\([^)]+\)/gi) || [];
  gradients.forEach(g => {
    tokens.push(`GRADIENT:${g.slice(0, 100)}`); // Truncate but keep signature
    tokens.push(`GRADIENT:${g.slice(0, 100)}`);
    tokens.push(`GRADIENT:${g.slice(0, 100)}`); // Triple weight for gradients
  });
  
  // ==========================================================================
  // MEDIUM WEIGHT: Layout configurations
  // ==========================================================================
  
  // Flexbox configurations
  const flexPatterns = normalizedCss.match(/display\s*:\s*flex|flex-direction\s*:\s*\w+|justify-content\s*:\s*[\w-]+|align-items\s*:\s*[\w-]+|flex-wrap\s*:\s*\w+|gap\s*:\s*[^;]+/gi) || [];
  flexPatterns.forEach(f => tokens.push(`LAYOUT:${f.toLowerCase().replace(/\s+/g, '')}`));
  
  // Grid configurations
  const gridPatterns = normalizedCss.match(/display\s*:\s*grid|grid-template-columns\s*:\s*[^;]+|grid-template-rows\s*:\s*[^;]+|grid-gap\s*:\s*[^;]+/gi) || [];
  gridPatterns.forEach(g => tokens.push(`LAYOUT:${g.slice(0, 80).toLowerCase().replace(/\s+/g, '')}`));
  
  // Position patterns
  const positionPatterns = normalizedCss.match(/position\s*:\s*(absolute|fixed|sticky)|top\s*:\s*[^;]+|left\s*:\s*[^;]+|right\s*:\s*[^;]+|bottom\s*:\s*[^;]+/gi) || [];
  positionPatterns.forEach(p => tokens.push(`POSITION:${p.toLowerCase().replace(/\s+/g, '')}`));
  
  // ==========================================================================
  // LOW WEIGHT: Structural elements (can inform but not definitive)
  // ==========================================================================
  
  // @keyframes animation definitions (unique fingerprint)
  const keyframeBlocks = normalizedCss.match(/@keyframes\s+[\w-]+\s*\{[^}]+\}/gi) || [];
  keyframeBlocks.forEach(k => {
    // Extract keyframe percentages and properties
    const keyframeName = k.match(/@keyframes\s+([\w-]+)/i)?.[1] || '';
    tokens.push(`KEYFRAME:${keyframeName}`);
    
    // Extract the animation steps
    const steps = k.match(/(\d+%|from|to)\s*\{[^}]+\}/gi) || [];
    steps.forEach(s => tokens.push(`ANIM_STEP:${s.slice(0, 60).replace(/\s+/g, ' ')}`));
  });
  
  // CSS custom properties (variable definitions - design system fingerprint)
  const cssVars = normalizedCss.match(/--[\w-]+\s*:\s*[^;]+/g) || [];
  cssVars.forEach(v => tokens.push(`VAR:${v.replace(/\s+/g, '')}`));
  
  // Media query breakpoints (responsive design fingerprint)
  const mediaQueries = normalizedCss.match(/@media[^{]+/g) || [];
  mediaQueries.forEach(m => tokens.push(`MEDIA:${m.replace(/\s+/g, ' ').trim()}`));
  
  // ==========================================================================
  // VERY LOW WEIGHT: Class names (easily changed, minimal signal)
  // Only include very specific/unique looking class names
  // ==========================================================================
  
  // Don't extract generic class names - they're noise
  // Only extract class names that look like they have semantic meaning
  // and aren't obviously framework-generated
  const meaningfulClassPattern = /\.(hero|banner|cta|testimonial|pricing|feature|portfolio|gallery|modal|sidebar|navbar|footer-\w+|header-\w+|section-\w+|card-\w+|btn-\w+)/gi;
  const meaningfulClasses = normalizedCss.match(meaningfulClassPattern) || [];
  meaningfulClasses.forEach(c => tokens.push(`CLASS:${c.toLowerCase()}`));
  
  return tokens;
}

/**
 * Extract meaningful tokens from HTML for shingling
 * Focus on STRUCTURE over class names (class names can be renamed)
 */
export function extractHtmlTokens(html: string): string[] {
  const tokens: string[] = [];
  
  // Normalize HTML
  const normalizedHtml = html
    .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
    .replace(/\s+/g, ' ')
    .trim();
  
  // ==========================================================================
  // HIGH WEIGHT: Page structure patterns
  // ==========================================================================
  
  // Extract nested structure patterns (the skeleton)
  // e.g., "section>div>div>h2+p" style patterns
  const structurePattern = extractDomStructure(normalizedHtml);
  if (structurePattern.length > 0) {
    structurePattern.forEach(s => tokens.push(`STRUCT:${s}`));
  }
  
  // Section count and layout inference
  const sectionCount = (normalizedHtml.match(/<section/gi) || []).length;
  const articleCount = (normalizedHtml.match(/<article/gi) || []).length;
  const divDepth = estimateNestingDepth(normalizedHtml);
  tokens.push(`LAYOUT:sections=${sectionCount}`);
  tokens.push(`LAYOUT:articles=${articleCount}`);
  tokens.push(`LAYOUT:depth=${divDepth}`);
  
  // ==========================================================================
  // MEDIUM WEIGHT: Semantic elements and patterns
  // ==========================================================================
  
  // Extract semantic landmarks
  const landmarks = ['nav', 'header', 'main', 'footer', 'aside', 'article', 'section'];
  for (const landmark of landmarks) {
    const count = (normalizedHtml.match(new RegExp(`<${landmark}`, 'gi')) || []).length;
    if (count > 0) {
      tokens.push(`LANDMARK:${landmark}=${count}`);
    }
  }
  
  // Form structure (indicates functionality)
  const formPatterns = normalizedHtml.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
  formPatterns.forEach((f, i) => {
    const inputCount = (f.match(/<input/gi) || []).length;
    const selectCount = (f.match(/<select/gi) || []).length;
    const textareaCount = (f.match(/<textarea/gi) || []).length;
    tokens.push(`FORM:${i}:inputs=${inputCount},selects=${selectCount},textareas=${textareaCount}`);
  });
  
  // Link patterns (navigation structure)
  const navLinks = normalizedHtml.match(/<nav[^>]*>[\s\S]*?<\/nav>/gi) || [];
  navLinks.forEach((nav, i) => {
    const linkCount = (nav.match(/<a /gi) || []).length;
    tokens.push(`NAV:${i}:links=${linkCount}`);
  });
  
  // ==========================================================================
  // MEDIUM WEIGHT: Content structure patterns
  // ==========================================================================
  
  // Heading hierarchy (content structure fingerprint)
  const headingPattern = extractHeadingPattern(normalizedHtml);
  if (headingPattern) {
    tokens.push(`HEADINGS:${headingPattern}`);
  }
  
  // Image patterns (visual content structure)
  const imgTags = normalizedHtml.match(/<img[^>]+>/gi) || [];
  tokens.push(`IMAGES:count=${imgTags.length}`);
  
  // Extract image dimensions/aspect ratios if specified
  imgTags.forEach(img => {
    const width = img.match(/width=["']?(\d+)/i)?.[1];
    const height = img.match(/height=["']?(\d+)/i)?.[1];
    if (width && height) {
      const aspect = Math.round((parseInt(width) / parseInt(height)) * 10) / 10;
      tokens.push(`IMG_ASPECT:${aspect}`);
    }
  });
  
  // Video/iframe patterns (media embeds)
  const videoCount = (normalizedHtml.match(/<video/gi) || []).length;
  const iframeCount = (normalizedHtml.match(/<iframe/gi) || []).length;
  if (videoCount > 0) tokens.push(`MEDIA:video=${videoCount}`);
  if (iframeCount > 0) tokens.push(`MEDIA:iframe=${iframeCount}`);
  
  // ==========================================================================
  // LOW WEIGHT: Data attributes (often framework-specific)
  // ==========================================================================
  
  // Webflow-specific patterns (indicates same platform, not plagiarism)
  // Extract non-Webflow data attributes only
  const dataAttrs = normalizedHtml.match(/data-(?!w-|wf-|animation)[\w-]+/g) || [];
  const uniqueDataAttrs = [...new Set(dataAttrs)].slice(0, 20);
  uniqueDataAttrs.forEach(d => tokens.push(`DATA:${d}`));
  
  // ==========================================================================
  // VERY LOW WEIGHT: Class names (easily changed)
  // Only extract semantic/meaningful class patterns, not generic
  // ==========================================================================
  
  // Skip class extraction entirely - it's noise for plagiarism detection
  // The CSS property values already capture what matters
  
  return tokens;
}

/**
 * Extract simplified DOM structure patterns
 */
function extractDomStructure(html: string): string[] {
  const patterns: string[] = [];
  
  // Find major sections and their immediate child structure
  const sectionRegex = /<(section|article|div)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  let count = 0;
  
  while ((match = sectionRegex.exec(html)) !== null && count < 10) {
    const content = match[2];
    // Count immediate children types
    const h1Count = (content.match(/<h1/gi) || []).length;
    const h2Count = (content.match(/<h2/gi) || []).length;
    const pCount = (content.match(/<p[^>]*>/gi) || []).length;
    const imgCount = (content.match(/<img/gi) || []).length;
    const linkCount = (content.match(/<a /gi) || []).length;
    
    patterns.push(`BLOCK:h1=${h1Count},h2=${h2Count},p=${pCount},img=${imgCount},a=${linkCount}`);
    count++;
  }
  
  return patterns;
}

/**
 * Estimate DOM nesting depth
 */
function estimateNestingDepth(html: string): number {
  let maxDepth = 0;
  let currentDepth = 0;
  const tagRegex = /<\/?div[^>]*>/gi;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    if (match[0].startsWith('</')) {
      currentDepth--;
    } else {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
  }
  
  return Math.min(maxDepth, 20); // Cap at 20 for sanity
}

/**
 * Extract heading hierarchy pattern
 */
function extractHeadingPattern(html: string): string {
  const headings: string[] = [];
  const headingRegex = /<h([1-6])[^>]*>/gi;
  let match;
  
  while ((match = headingRegex.exec(html)) !== null && headings.length < 20) {
    headings.push(`h${match[1]}`);
  }
  
  return headings.join(',');
}

// =============================================================================
// MINHASH COMPUTATION
// =============================================================================

/**
 * Compute MinHash signature for a set of shingles
 */
export function computeMinHash(shingles: Set<string>): MinHashSignature {
  initializeHashFunctions();
  
  // Initialize signature with max values
  const signature = new Array(NUM_HASHES).fill(Number.MAX_SAFE_INTEGER);
  
  // For each shingle, update the signature
  for (const shingle of shingles) {
    const shingleHash = shingleToHash(shingle);
    
    for (let i = 0; i < NUM_HASHES; i++) {
      const hash = computeHash(shingleHash, i);
      if (hash < signature[i]) {
        signature[i] = hash;
      }
    }
  }
  
  return {
    signature,
    numShingles: shingles.size,
    documentType: 'combined'
  };
}

/**
 * Compute MinHash signature specifically for CSS content
 */
export function computeCssMinHash(css: string): MinHashSignature {
  // Use both character shingles and token shingles for robustness
  const charShingles = createShingles(css, SHINGLE_SIZE);
  const tokens = extractCssTokens(css);
  const tokenShingles = createTokenShingles(tokens, 3);
  
  // Combine both shingle sets
  const combined = new Set([...charShingles, ...tokenShingles]);
  
  const result = computeMinHash(combined);
  result.documentType = 'css';
  
  return result;
}

/**
 * Compute MinHash signature specifically for HTML content
 */
export function computeHtmlMinHash(html: string): MinHashSignature {
  const charShingles = createShingles(html, SHINGLE_SIZE);
  const tokens = extractHtmlTokens(html);
  const tokenShingles = createTokenShingles(tokens, 3);
  
  const combined = new Set([...charShingles, ...tokenShingles]);
  
  const result = computeMinHash(combined);
  result.documentType = 'html';
  
  return result;
}

/**
 * Compute MinHash for combined HTML + CSS + JS
 */
export function computeCombinedMinHash(
  html: string,
  css: string,
  js: string
): MinHashSignature {
  // Extract tokens from each content type
  const htmlTokens = extractHtmlTokens(html);
  const cssTokens = extractCssTokens(css);
  
  // Combine everything
  const combined = `${html}\n${css}\n${js}`;
  const charShingles = createShingles(combined, SHINGLE_SIZE);
  const tokenShingles = createTokenShingles([...htmlTokens, ...cssTokens], 3);
  
  const allShingles = new Set([...charShingles, ...tokenShingles]);
  
  const result = computeMinHash(allShingles);
  result.documentType = 'combined';
  
  return result;
}

// =============================================================================
// SIMILARITY COMPUTATION
// =============================================================================

/**
 * Estimate Jaccard similarity from two MinHash signatures
 * 
 * The Jaccard similarity J(A,B) = |A ∩ B| / |A ∪ B|
 * MinHash estimates this as the fraction of hash functions
 * where the signatures agree.
 */
export function estimateSimilarity(
  sig1: MinHashSignature,
  sig2: MinHashSignature
): SimilarityResult {
  if (sig1.signature.length !== sig2.signature.length) {
    throw new Error('Signature lengths must match');
  }
  
  let matches = 0;
  for (let i = 0; i < sig1.signature.length; i++) {
    if (sig1.signature[i] === sig2.signature[i]) {
      matches++;
    }
  }
  
  const jaccardEstimate = matches / sig1.signature.length;
  
  // Confidence based on number of shingles
  // More shingles = more reliable estimate
  const minShingles = Math.min(sig1.numShingles, sig2.numShingles);
  let confidence: 'high' | 'medium' | 'low';
  if (minShingles > 1000) {
    confidence = 'high';
  } else if (minShingles > 100) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  // Estimate number of overlapping shingles
  const avgShingles = (sig1.numShingles + sig2.numShingles) / 2;
  const shingleOverlapEstimate = Math.round(
    jaccardEstimate * avgShingles / (1 + jaccardEstimate)
  );
  
  return {
    jaccardEstimate,
    confidence,
    shingleOverlapEstimate
  };
}

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Serialize signature to a compact string for storage
 */
export function serializeSignature(sig: MinHashSignature): string {
  return JSON.stringify({
    s: sig.signature,
    n: sig.numShingles,
    t: sig.documentType
  });
}

/**
 * Deserialize signature from storage
 */
export function deserializeSignature(data: string): MinHashSignature {
  const parsed = JSON.parse(data);
  return {
    signature: parsed.s,
    numShingles: parsed.n,
    documentType: parsed.t
  };
}

/**
 * Serialize signature to a compact binary format (for Vectorize metadata)
 * Returns base64 string of packed 32-bit integers
 */
export function serializeSignatureCompact(sig: MinHashSignature): string {
  const buffer = new ArrayBuffer(sig.signature.length * 4);
  const view = new DataView(buffer);
  
  for (let i = 0; i < sig.signature.length; i++) {
    view.setUint32(i * 4, sig.signature[i], true); // little-endian
  }
  
  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Deserialize compact signature
 */
export function deserializeSignatureCompact(
  base64: string,
  numShingles: number,
  documentType: MinHashSignature['documentType']
): MinHashSignature {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  const view = new DataView(bytes.buffer);
  const signature: number[] = [];
  
  for (let i = 0; i < bytes.length / 4; i++) {
    signature.push(view.getUint32(i * 4, true));
  }
  
  return { signature, numShingles, documentType };
}

// =============================================================================
// TOKEN-ONLY COMPARISON (Better for Webflow templates)
// =============================================================================

/**
 * Extract ONLY custom class names (filter out Webflow framework classes)
 * This gives much better discrimination for plagiarism detection
 */
export function extractCustomClasses(css: string): string[] {
  const allClasses = css.match(/\.[a-zA-Z][\w-]*/g) || [];
  
  // Filter out Webflow framework classes
  const customClasses = allClasses.filter(cls => 
    !cls.match(/^\.(w-|wf-|w--|webflow)/) // Webflow framework
  );
  
  return [...new Set(customClasses)]; // Dedupe
}

// =============================================================================
// PROPERTY-BASED COMPARISON (Catches renamed classes)
// =============================================================================

/**
 * Extract CSS declaration blocks (the properties, not the selectors)
 * This catches plagiarism even when class names are changed
 * 
 * Example:
 *   .hero { display: flex; padding: 100px; } → "display:flex;padding:100px"
 */
export function extractDeclarationBlocks(css: string): string[] {
  const blocks: string[] = [];
  
  // Match CSS rule blocks: selector { properties }
  const ruleRegex = /[^{}]+\{([^{}]+)\}/g;
  let match;
  
  while ((match = ruleRegex.exec(css)) !== null) {
    const declarations = match[1];
    
    // Normalize the declaration block
    const normalized = normalizeDeclarations(declarations);
    
    // Only include non-trivial blocks (more than 2 properties)
    if (normalized.split(';').filter(d => d.trim()).length >= 2) {
      blocks.push(normalized);
    }
  }
  
  return blocks;
}

/**
 * Normalize CSS declarations for comparison
 * - Removes whitespace
 * - Sorts properties alphabetically
 * - Normalizes values (lowercase, trim)
 */
function normalizeDeclarations(declarations: string): string {
  const props = declarations
    .split(';')
    .map(d => d.trim())
    .filter(d => d.length > 0)
    .map(d => {
      const [prop, ...valueParts] = d.split(':');
      const value = valueParts.join(':').trim().toLowerCase();
      return `${prop.trim().toLowerCase()}:${value}`;
    })
    .sort(); // Alphabetical order for consistent comparison
  
  return props.join(';');
}

/**
 * Extract unique property combinations (fingerprints of style patterns)
 * Groups of 3-5 properties that appear together
 */
export function extractPropertyFingerprints(css: string): string[] {
  const fingerprints: string[] = [];
  const blocks = extractDeclarationBlocks(css);
  
  for (const block of blocks) {
    const props = block.split(';').filter(p => p.trim());
    
    // Create fingerprints from property combinations
    // Use sliding window of 3 properties
    if (props.length >= 3) {
      for (let i = 0; i <= props.length - 3; i++) {
        const fingerprint = props.slice(i, i + 3).join('|');
        fingerprints.push(fingerprint);
      }
    }
    
    // Also add the full block as a fingerprint if it's unique enough
    if (props.length >= 4) {
      fingerprints.push(block);
    }
  }
  
  return [...new Set(fingerprints)];
}

/**
 * Extract specific high-value CSS patterns that indicate copying
 */
export function extractCSSPatterns(css: string): {
  colors: string[];
  gradients: string[];
  animations: string[];
  customProperties: string[];
  mediaQueries: string[];
  keyframes: string[];
} {
  return {
    // Extract color values (hex, rgb, hsl)
    colors: [...new Set(
      (css.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/g) || [])
        .map(c => c.toLowerCase())
    )],
    
    // Extract gradient definitions
    gradients: [...new Set(
      (css.match(/linear-gradient\([^)]+\)|radial-gradient\([^)]+\)/g) || [])
        .map(g => g.toLowerCase())
    )],
    
    // Extract animation names and durations
    animations: [...new Set(
      (css.match(/animation:\s*[^;]+/g) || [])
        .map(a => a.toLowerCase().trim())
    )],
    
    // Extract custom CSS properties (variables)
    customProperties: [...new Set(
      (css.match(/--[\w-]+:\s*[^;]+/g) || [])
        .map(p => p.toLowerCase().trim())
    )],
    
    // Extract media query breakpoints
    mediaQueries: [...new Set(
      (css.match(/@media[^{]+/g) || [])
        .map(m => m.replace(/\s+/g, ' ').trim())
    )],
    
    // Extract @keyframes definitions
    keyframes: [...new Set(
      (css.match(/@keyframes\s+[\w-]+\s*\{[^}]+\}/g) || [])
        .map(k => k.replace(/\s+/g, ' ').trim())
    )]
  };
}

/**
 * Compare two templates using property-based analysis
 * This catches plagiarism even when class names are changed
 */
export function compareProperties(
  css1: string,
  css2: string
): {
  declarationSimilarity: number;
  fingerprintSimilarity: number;
  patternMatches: {
    colors: number;
    gradients: number;
    animations: number;
    customProperties: number;
    keyframes: number;
  };
  sharedDeclarations: string[];
  sharedFingerprints: string[];
} {
  // Extract declaration blocks
  const blocks1 = new Set(extractDeclarationBlocks(css1));
  const blocks2 = new Set(extractDeclarationBlocks(css2));
  
  const sharedBlocks = [...blocks1].filter(b => blocks2.has(b));
  const unionBlocks = new Set([...blocks1, ...blocks2]);
  const declarationSimilarity = sharedBlocks.length / unionBlocks.size;
  
  // Extract property fingerprints
  const fp1 = new Set(extractPropertyFingerprints(css1));
  const fp2 = new Set(extractPropertyFingerprints(css2));
  
  const sharedFp = [...fp1].filter(f => fp2.has(f));
  const unionFp = new Set([...fp1, ...fp2]);
  const fingerprintSimilarity = sharedFp.length / unionFp.size;
  
  // Extract and compare specific patterns
  const patterns1 = extractCSSPatterns(css1);
  const patterns2 = extractCSSPatterns(css2);
  
  const colorOverlap = patterns1.colors.filter(c => patterns2.colors.includes(c)).length;
  const gradientOverlap = patterns1.gradients.filter(g => patterns2.gradients.includes(g)).length;
  const animationOverlap = patterns1.animations.filter(a => patterns2.animations.includes(a)).length;
  const customPropOverlap = patterns1.customProperties.filter(p => patterns2.customProperties.includes(p)).length;
  const keyframeOverlap = patterns1.keyframes.filter(k => patterns2.keyframes.includes(k)).length;
  
  return {
    declarationSimilarity,
    fingerprintSimilarity,
    patternMatches: {
      colors: colorOverlap,
      gradients: gradientOverlap,
      animations: animationOverlap,
      customProperties: customPropOverlap,
      keyframes: keyframeOverlap
    },
    sharedDeclarations: sharedBlocks.slice(0, 10),
    sharedFingerprints: sharedFp.slice(0, 10)
  };
}

/**
 * Compute MinHash using ONLY custom tokens (no character shingles)
 * This eliminates Webflow boilerplate noise
 */
export function computeTokenOnlyMinHash(
  cssTokens: string[],
  htmlTokens: string[] = []
): MinHashSignature {
  // Create shingles from token sequences (n-grams of tokens)
  const allTokens = [...cssTokens, ...htmlTokens];
  const tokenShingles = createTokenShingles(allTokens, 2); // Pairs of adjacent tokens
  
  // Also add individual tokens as shingles
  for (const token of allTokens) {
    tokenShingles.add(token);
  }
  
  const result = computeMinHash(tokenShingles);
  result.documentType = 'combined';
  
  return result;
}

/**
 * Compare two templates using ONLY custom class names
 * This is the recommended method for Webflow plagiarism detection
 */
export function compareCustomClasses(
  css1: string,
  css2: string
): SimilarityResult & { 
  uniqueToFirst: string[];
  uniqueToSecond: string[];
  shared: string[];
} {
  const classes1 = extractCustomClasses(css1);
  const classes2 = extractCustomClasses(css2);
  
  const set1 = new Set(classes1);
  const set2 = new Set(classes2);
  
  // Compute actual Jaccard (not estimated) since we have the full sets
  const intersection = classes1.filter(c => set2.has(c));
  const union = new Set([...classes1, ...classes2]);
  
  const jaccard = intersection.length / union.size;
  
  // Also get the differences for analysis
  const uniqueToFirst = classes1.filter(c => !set2.has(c)).slice(0, 20);
  const uniqueToSecond = classes2.filter(c => !set1.has(c)).slice(0, 20);
  const shared = intersection.slice(0, 20);
  
  // Determine confidence based on set sizes
  const minSize = Math.min(classes1.length, classes2.length);
  let confidence: 'high' | 'medium' | 'low';
  if (minSize > 100) confidence = 'high';
  else if (minSize > 30) confidence = 'medium';
  else confidence = 'low';
  
  return {
    jaccardEstimate: jaccard,
    confidence,
    shingleOverlapEstimate: intersection.length,
    uniqueToFirst,
    uniqueToSecond,
    shared
  };
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick similarity check between two CSS strings
 */
export function compareCss(css1: string, css2: string): SimilarityResult {
  const sig1 = computeCssMinHash(css1);
  const sig2 = computeCssMinHash(css2);
  return estimateSimilarity(sig1, sig2);
}

/**
 * Quick similarity check between two HTML strings
 */
export function compareHtml(html1: string, html2: string): SimilarityResult {
  const sig1 = computeHtmlMinHash(html1);
  const sig2 = computeHtmlMinHash(html2);
  return estimateSimilarity(sig1, sig2);
}

/**
 * Compare full template (HTML + CSS + JS)
 */
export function compareTemplates(
  template1: { html: string; css: string; js: string },
  template2: { html: string; css: string; js: string }
): SimilarityResult {
  const sig1 = computeCombinedMinHash(template1.html, template1.css, template1.js);
  const sig2 = computeCombinedMinHash(template2.html, template2.css, template2.js);
  return estimateSimilarity(sig1, sig2);
}

// =============================================================================
// LSH BANDING (Locality-Sensitive Hashing)
// =============================================================================

/**
 * LSH Configuration
 * 
 * With b bands of r rows each (b * r = NUM_HASHES):
 * - Probability of collision for similarity s: 1 - (1 - s^r)^b
 * 
 * For b=16, r=8 (128 hashes):
 * - s=0.5: 73% chance of collision (catches partial copies)
 * - s=0.8: 99.97% chance of collision (catches near-duplicates)
 * - s=0.2: 6% chance of collision (low false positives)
 */
const LSH_BANDS = 16;
const LSH_ROWS_PER_BAND = NUM_HASHES / LSH_BANDS; // 8 rows per band

export interface LSHBucket {
  bandIndex: number;
  hash: string;
  templateIds: string[];
}

/**
 * Compute LSH band hashes from a MinHash signature
 * Returns an array of band hashes that can be used for bucketing
 */
export function computeLSHBands(signature: number[]): string[] {
  const bandHashes: string[] = [];
  
  for (let band = 0; band < LSH_BANDS; band++) {
    const start = band * LSH_ROWS_PER_BAND;
    const end = start + LSH_ROWS_PER_BAND;
    const bandValues = signature.slice(start, end);
    
    // Hash the band values into a single string
    // Using simple string concatenation - could use proper hash for production
    const bandHash = `b${band}_${bandValues.join('_')}`;
    bandHashes.push(bandHash);
  }
  
  return bandHashes;
}

/**
 * More efficient band hash using numeric hashing
 */
export function computeLSHBandHashes(signature: number[]): number[] {
  const bandHashes: number[] = [];
  
  for (let band = 0; band < LSH_BANDS; band++) {
    const start = band * LSH_ROWS_PER_BAND;
    const end = start + LSH_ROWS_PER_BAND;
    
    // Combine band values into a single hash
    let hash = 0;
    for (let i = start; i < end; i++) {
      hash = ((hash << 5) - hash + signature[i]) | 0; // | 0 keeps it 32-bit
    }
    bandHashes.push(hash >>> 0); // Ensure unsigned
  }
  
  return bandHashes;
}

/**
 * Check if two signatures are LSH candidates (share any band hash)
 * This is O(b) where b is number of bands, vs O(n) for full comparison
 */
export function areLSHCandidates(sig1: number[], sig2: number[]): boolean {
  const bands1 = computeLSHBandHashes(sig1);
  const bands2 = computeLSHBandHashes(sig2);
  
  for (let i = 0; i < LSH_BANDS; i++) {
    if (bands1[i] === bands2[i]) {
      return true; // At least one band matches - potential similar pair
    }
  }
  
  return false;
}

/**
 * Serialize LSH band hashes for storage
 */
export function serializeLSHBands(bandHashes: number[]): string {
  return bandHashes.map(h => h.toString(36)).join(',');
}

/**
 * Deserialize LSH band hashes
 */
export function deserializeLSHBands(serialized: string): number[] {
  return serialized.split(',').map(h => parseInt(h, 36));
}

// =============================================================================
// BATCH OPERATIONS WITH LSH
// =============================================================================

/**
 * Find similar templates using LSH pre-filtering
 * Much faster than comparing all pairs for large datasets
 */
export function findSimilarWithLSH(
  querySignature: MinHashSignature,
  candidates: Array<{ id: string; signature: MinHashSignature }>,
  threshold: number = 0.5
): Array<{ id: string; similarity: number; lshCandidate: boolean }> {
  const queryBands = computeLSHBandHashes(querySignature.signature);
  const results: Array<{ id: string; similarity: number; lshCandidate: boolean }> = [];
  
  for (const candidate of candidates) {
    const candidateBands = computeLSHBandHashes(candidate.signature.signature);
    
    // Check if LSH candidate (any band matches)
    let isLSHCandidate = false;
    for (let i = 0; i < LSH_BANDS; i++) {
      if (queryBands[i] === candidateBands[i]) {
        isLSHCandidate = true;
        break;
      }
    }
    
    // Only compute exact similarity for LSH candidates
    if (isLSHCandidate) {
      const similarity = estimateSimilarity(querySignature, candidate.signature);
      if (similarity.jaccardEstimate >= threshold) {
        results.push({
          id: candidate.id,
          similarity: similarity.jaccardEstimate,
          lshCandidate: true
        });
      }
    }
  }
  
  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Find similar templates from a set of signatures (original method, kept for compatibility)
 */
export function findSimilar(
  querySignature: MinHashSignature,
  candidates: Array<{ id: string; signature: MinHashSignature }>,
  threshold: number = 0.5
): Array<{ id: string; similarity: number }> {
  const results: Array<{ id: string; similarity: number }> = [];
  
  for (const candidate of candidates) {
    const similarity = estimateSimilarity(querySignature, candidate.signature);
    if (similarity.jaccardEstimate >= threshold) {
      results.push({
        id: candidate.id,
        similarity: similarity.jaccardEstimate
      });
    }
  }
  
  return results.sort((a, b) => b.similarity - a.similarity);
}
