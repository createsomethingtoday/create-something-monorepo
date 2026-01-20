/**
 * JavaScript Function-Level Plagiarism Detection
 * 
 * Extracts and compares JavaScript functions/components from templates
 * to catch component-level copying that file-level analysis might miss.
 * 
 * Inspired by packages/ground/src/computations/function_dry.rs
 * Adapted for browser-extracted JavaScript (no tree-sitter in Workers)
 * 
 * Canon: Find the pattern within the pattern.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractedFunction {
  /** Function name (or 'anonymous-N' for unnamed) */
  name: string;
  /** Original source code */
  source: string;
  /** Normalized body (whitespace normalized, comments removed) */
  normalizedBody: string;
  /** Start position in original source */
  startPos: number;
  /** End position in original source */
  endPos: number;
  /** Function type */
  type: 'function' | 'arrow' | 'method' | 'class';
  /** Is async? */
  isAsync: boolean;
  /** Line count */
  lineCount: number;
}

export interface FunctionDuplicate {
  /** Function name */
  name: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** Function from template 1 */
  func1: ExtractedFunction;
  /** Function from template 2 */
  func2: ExtractedFunction;
  /** Evidence of copying */
  evidence: string[];
}

export interface JsAnalysisResult {
  /** Total functions extracted from template 1 */
  template1FunctionCount: number;
  /** Total functions extracted from template 2 */
  template2FunctionCount: number;
  /** Duplicate functions found */
  duplicates: FunctionDuplicate[];
  /** Overall JS similarity score */
  overallSimilarity: number;
  /** Webflow interaction patterns found */
  webflowPatterns: {
    template1: string[];
    template2: string[];
    shared: string[];
  };
}

// =============================================================================
// FUNCTION EXTRACTION (Regex-based for Workers compatibility)
// =============================================================================

/**
 * Extract functions from JavaScript source code.
 * Uses regex patterns since tree-sitter isn't available in Workers.
 */
export function extractFunctions(js: string): ExtractedFunction[] {
  const functions: ExtractedFunction[] = [];
  let anonymousCounter = 0;

  // Pattern 1: Named function declarations
  // function name(...) { ... }
  const funcDeclRegex = /\b(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/g;
  extractWithRegex(js, funcDeclRegex, functions, (match) => ({
    name: match[2],
    type: 'function' as const,
    isAsync: !!match[1]
  }));

  // Pattern 2: Arrow functions assigned to variables
  // const name = (...) => { ... } or const name = async (...) => { ... }
  const arrowRegex = /\b(const|let|var)\s+(\w+)\s*=\s*(async\s*)?\([^)]*\)\s*=>/g;
  extractWithRegex(js, arrowRegex, functions, (match) => ({
    name: match[2],
    type: 'arrow' as const,
    isAsync: !!match[3]
  }));

  // Pattern 3: Method definitions in objects/classes
  // name(...) { ... } or async name(...) { ... }
  const methodRegex = /^\s*(async\s+)?(\w+)\s*\([^)]*\)\s*\{/gm;
  extractWithRegex(js, methodRegex, functions, (match) => ({
    name: match[2],
    type: 'method' as const,
    isAsync: !!match[1]
  }));

  // Pattern 4: Class declarations
  const classRegex = /\bclass\s+(\w+)\s*(extends\s+\w+)?\s*\{/g;
  extractWithRegex(js, classRegex, functions, (match) => ({
    name: match[1],
    type: 'class' as const,
    isAsync: false
  }));

  // Extract function bodies and deduplicate
  const seen = new Set<string>();
  return functions.filter(f => {
    const key = `${f.name}:${f.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractWithRegex(
  js: string,
  regex: RegExp,
  results: ExtractedFunction[],
  parseMeta: (match: RegExpMatchArray) => { name: string; type: ExtractedFunction['type']; isAsync: boolean }
): void {
  let match;
  while ((match = regex.exec(js)) !== null) {
    const startPos = match.index;
    const meta = parseMeta(match);
    
    // Find matching closing brace
    const body = extractBody(js, startPos);
    if (!body) continue;

    const source = js.slice(startPos, startPos + body.length);
    const normalized = normalizeCode(source);
    const lineCount = (source.match(/\n/g) || []).length + 1;

    // Skip very short functions (likely getters/setters)
    if (lineCount < 3) continue;

    results.push({
      name: meta.name,
      source,
      normalizedBody: normalized,
      startPos,
      endPos: startPos + body.length,
      type: meta.type,
      isAsync: meta.isAsync,
      lineCount
    });
  }
}

/**
 * Extract function body by matching braces.
 */
function extractBody(js: string, startPos: number): string | null {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;
  let started = false;
  let endPos = startPos;

  for (let i = startPos; i < js.length && i < startPos + 50000; i++) {
    const char = js[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (inString) {
      if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '{') {
      if (!started) started = true;
      depth++;
    } else if (char === '}') {
      depth--;
      if (started && depth === 0) {
        endPos = i + 1;
        break;
      }
    }
  }

  if (!started || depth !== 0) return null;
  return js.slice(startPos, endPos);
}

/**
 * Normalize code for comparison.
 */
function normalizeCode(code: string): string {
  return code
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove string literals (replace with placeholder)
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .replace(/`[^`]*`/g, '``')
    // Normalize numbers
    .replace(/\b\d+\.?\d*\b/g, 'NUM')
    .trim();
}

// =============================================================================
// WEBFLOW-SPECIFIC PATTERNS
// =============================================================================

/**
 * Extract Webflow interaction patterns from JavaScript.
 */
export function extractWebflowPatterns(js: string): string[] {
  const patterns: string[] = [];
  
  // IX2 interactions
  const ix2Matches = js.match(/Webflow\.require\(['"]ix2['"]\)/g) || [];
  if (ix2Matches.length > 0) {
    patterns.push(`ix2_interactions:${ix2Matches.length}`);
  }

  // Animation triggers
  const triggerPatterns = [
    /\bscroll\s*:/gi,
    /\bmouseover\s*:/gi,
    /\bclick\s*:/gi,
    /\bhover\s*:/gi,
    /\bload\s*:/gi
  ];
  for (const pattern of triggerPatterns) {
    const matches = js.match(pattern) || [];
    if (matches.length > 0) {
      const name = pattern.source.replace(/\\b|\\s\*:|/gi, '').toLowerCase();
      patterns.push(`trigger_${name}:${matches.length}`);
    }
  }

  // Specific animation functions
  const animPatterns = [
    { regex: /gsap\./gi, name: 'gsap' },
    { regex: /ScrollTrigger/gi, name: 'scrolltrigger' },
    { regex: /timeline\(\)/gi, name: 'timeline' },
    { regex: /\.to\s*\(/gi, name: 'tween_to' },
    { regex: /\.from\s*\(/gi, name: 'tween_from' },
    { regex: /\.fromTo\s*\(/gi, name: 'tween_fromTo' },
    { regex: /Lenis|locomotive/gi, name: 'smooth_scroll' },
    { regex: /IntersectionObserver/gi, name: 'intersection_observer' },
    { regex: /requestAnimationFrame/gi, name: 'raf' }
  ];

  for (const { regex, name } of animPatterns) {
    const matches = js.match(regex) || [];
    if (matches.length > 0) {
      patterns.push(`${name}:${matches.length}`);
    }
  }

  // Webflow form handlers
  if (js.includes('Webflow.push')) {
    patterns.push('webflow_push');
  }

  // E-commerce patterns
  if (js.includes('Webflow.commerce')) {
    patterns.push('webflow_commerce');
  }

  return patterns;
}

/**
 * Extract GSAP animation configurations as fingerprints.
 */
export function extractAnimationFingerprints(js: string): string[] {
  const fingerprints: string[] = [];

  // GSAP .to/.from/.fromTo patterns with properties
  const tweenRegex = /\.(to|from|fromTo)\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = tweenRegex.exec(js)) !== null) {
    const [, method, selector, props] = match;
    
    // Extract property names from the config
    const propNames = props.match(/\b(opacity|x|y|scale|rotation|duration|ease|stagger)\b/gi) || [];
    if (propNames.length > 0) {
      fingerprints.push(`tween:${method}:${propNames.sort().join(',')}`);
    }
  }

  // ScrollTrigger configurations
  const stRegex = /ScrollTrigger\.create\s*\(\s*\{([^}]+)\}/g;
  while ((match = stRegex.exec(js)) !== null) {
    const config = match[1];
    const triggers = config.match(/trigger\s*:\s*["'`]([^"'`]+)["'`]/);
    const scrub = config.includes('scrub');
    const pin = config.includes('pin');
    
    if (triggers) {
      fingerprints.push(`st:${triggers[1]}:scrub=${scrub}:pin=${pin}`);
    }
  }

  return [...new Set(fingerprints)];
}

// =============================================================================
// COMPARISON
// =============================================================================

/**
 * Compare two functions for similarity.
 */
export function compareFunctions(a: ExtractedFunction, b: ExtractedFunction): number {
  const tokensA = a.normalizedBody.split(/\s+/);
  const tokensB = b.normalizedBody.split(/\s+/);
  
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // Token-based similarity
  let matches = 0;
  const maxLen = Math.max(tokensA.length, tokensB.length);
  
  for (let i = 0; i < Math.min(tokensA.length, tokensB.length); i++) {
    if (tokensA[i] === tokensB[i]) matches++;
  }
  
  const tokenSim = matches / maxLen;
  
  // Length penalty
  const lenDiff = Math.abs(tokensA.length - tokensB.length);
  const lenPenalty = 1 - Math.min(1, lenDiff / maxLen);
  
  // Jaccard similarity of token sets
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  const jaccard = union > 0 ? intersection / union : 0;
  
  // Weighted combination
  return tokenSim * 0.4 + lenPenalty * 0.2 + jaccard * 0.4;
}

/**
 * Find function evidence for why they're similar.
 */
function findFunctionEvidence(a: ExtractedFunction, b: ExtractedFunction): string[] {
  const evidence: string[] = [];
  
  // Check for identical normalized body
  if (a.normalizedBody === b.normalizedBody) {
    evidence.push('Identical normalized code');
  }
  
  // Check line count similarity
  const lineDiff = Math.abs(a.lineCount - b.lineCount);
  if (lineDiff === 0) {
    evidence.push('Same line count');
  } else if (lineDiff <= 2) {
    evidence.push('Very similar line count');
  }
  
  // Check for same function type
  if (a.type === b.type) {
    evidence.push(`Same function type: ${a.type}`);
  }
  
  // Check for same async pattern
  if (a.isAsync === b.isAsync && a.isAsync) {
    evidence.push('Both async functions');
  }
  
  // Extract common API calls
  const apiCalls = a.normalizedBody.match(/\.\w+\s*\(/g) || [];
  const apiCallsB = b.normalizedBody.match(/\.\w+\s*\(/g) || [];
  const commonApis = apiCalls.filter(api => apiCallsB.includes(api));
  if (commonApis.length > 3) {
    evidence.push(`${commonApis.length} shared API calls`);
  }
  
  return evidence;
}

// =============================================================================
// MAIN ANALYSIS
// =============================================================================

/**
 * Compare JavaScript from two templates for function-level plagiarism.
 */
export function analyzeJsPlagiarism(
  js1: string,
  js2: string,
  threshold: number = 0.7,
  minLines: number = 5
): JsAnalysisResult {
  // Extract functions
  const funcs1 = extractFunctions(js1).filter(f => f.lineCount >= minLines);
  const funcs2 = extractFunctions(js2).filter(f => f.lineCount >= minLines);
  
  // Find duplicates
  const duplicates: FunctionDuplicate[] = [];
  
  for (const f1 of funcs1) {
    for (const f2 of funcs2) {
      // Only compare same-named functions or anonymous functions
      const nameMatch = f1.name === f2.name || 
        (f1.name.startsWith('anonymous') && f2.name.startsWith('anonymous'));
      
      if (!nameMatch) continue;
      
      const similarity = compareFunctions(f1, f2);
      
      if (similarity >= threshold) {
        duplicates.push({
          name: f1.name,
          similarity,
          func1: f1,
          func2: f2,
          evidence: findFunctionEvidence(f1, f2)
        });
      }
    }
  }
  
  // Extract Webflow patterns
  const patterns1 = extractWebflowPatterns(js1);
  const patterns2 = extractWebflowPatterns(js2);
  const sharedPatterns = patterns1.filter(p => patterns2.includes(p));
  
  // Calculate overall similarity
  const funcSim = funcs1.length > 0 && funcs2.length > 0
    ? duplicates.length / Math.max(funcs1.length, funcs2.length)
    : 0;
  
  const patternSim = patterns1.length > 0 || patterns2.length > 0
    ? sharedPatterns.length / Math.max(patterns1.length, patterns2.length, 1)
    : 0;
  
  const overallSimilarity = funcSim * 0.6 + patternSim * 0.4;
  
  return {
    template1FunctionCount: funcs1.length,
    template2FunctionCount: funcs2.length,
    duplicates,
    overallSimilarity,
    webflowPatterns: {
      template1: patterns1,
      template2: patterns2,
      shared: sharedPatterns
    }
  };
}

/**
 * Quick JS similarity check (for pre-screening).
 */
export function quickJsSimilarity(js1: string, js2: string): number {
  // Extract animation fingerprints
  const fp1 = extractAnimationFingerprints(js1);
  const fp2 = extractAnimationFingerprints(js2);
  
  if (fp1.length === 0 && fp2.length === 0) {
    // Fall back to pattern matching
    const patterns1 = extractWebflowPatterns(js1);
    const patterns2 = extractWebflowPatterns(js2);
    const shared = patterns1.filter(p => patterns2.includes(p));
    return shared.length / Math.max(patterns1.length, patterns2.length, 1);
  }
  
  // Jaccard similarity of fingerprints
  const set1 = new Set(fp1);
  const set2 = new Set(fp2);
  const intersection = [...set1].filter(f => set2.has(f)).length;
  const union = new Set([...fp1, ...fp2]).size;
  
  return union > 0 ? intersection / union : 0;
}
