/**
 * Agent-Native Algorithms for Plagiarism Detection
 * 
 * Classic CS algorithms exposed as MCP tools for team distribution:
 * - LSH for JS Functions: O(1) similar function lookup (MinHash + LSH banding)
 * - PageRank for Template Authority: Graph-based originality ranking
 * - Framework Pattern Detection: Regex-based library fingerprinting
 * - Bayesian Confidence: Probabilistic multi-signal scoring
 * 
 * "Agent-native" = designed for team AI agents to invoke via MCP.
 * Any team member's agent can use these tools for template analysis.
 * 
 * Canon: Tools serve the team; algorithms do the work.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface MinHashSignature {
  /** Template or function ID */
  id: string;
  /** MinHash signature values */
  signature: number[];
  /** LSH band hashes for O(1) lookup */
  bandHashes: string[];
}

export interface PageRankResult {
  /** Template ID */
  templateId: string;
  /** PageRank score (higher = more authoritative/original) */
  score: number;
  /** Number of templates linking TO this one (copied from) */
  inDegree: number;
  /** Number of templates this links TO (copied to) */
  outDegree: number;
  /** Authority classification */
  classification: 'original' | 'derivative' | 'isolated';
}

export interface FrameworkFingerprint {
  /** Framework name */
  name: string;
  /** Version hint if detectable */
  version?: string;
  /** Specific features detected */
  features: string[];
  /** Confidence score 0-1 */
  confidence: number;
}

export interface BayesianConfidence {
  /** Overall plagiarism probability */
  probability: number;
  /** Prior probability (base rate) */
  prior: number;
  /** Likelihood given evidence */
  likelihood: number;
  /** Contributing factors */
  factors: Array<{
    name: string;
    weight: number;
    value: number;
    contribution: number;
  }>;
  /** Classification */
  verdict: 'no_plagiarism' | 'possible' | 'likely' | 'definite';
}

// =============================================================================
// LSH FOR JS FUNCTIONS
// =============================================================================

/**
 * MinHash parameters for JS function similarity
 */
const MINHASH_PERMUTATIONS = 128;  // Number of hash functions
const LSH_BANDS = 16;              // Number of bands for LSH
const LSH_ROWS_PER_BAND = 8;       // Rows per band (128/16)

/**
 * Generate MinHash signature for a normalized function body.
 * Uses character-level 3-grams (shingles) for similarity.
 */
export function generateFunctionMinHash(normalizedBody: string): number[] {
  // Generate shingles (character 3-grams)
  const shingles = new Set<string>();
  for (let i = 0; i <= normalizedBody.length - 3; i++) {
    shingles.add(normalizedBody.substring(i, i + 3));
  }

  if (shingles.size === 0) {
    return new Array(MINHASH_PERMUTATIONS).fill(0);
  }

  // Generate MinHash signature using hash permutations
  const signature: number[] = [];
  
  for (let perm = 0; perm < MINHASH_PERMUTATIONS; perm++) {
    let minHash = Infinity;
    
    for (const shingle of shingles) {
      // Hash with permutation seed
      const hash = hashWithSeed(shingle, perm);
      if (hash < minHash) {
        minHash = hash;
      }
    }
    
    signature.push(minHash);
  }

  return signature;
}

/**
 * Generate LSH band hashes for O(1) candidate lookup.
 * Templates/functions with matching band hashes are likely similar.
 */
export function generateLSHBandHashes(signature: number[]): string[] {
  const bandHashes: string[] = [];
  
  for (let band = 0; band < LSH_BANDS; band++) {
    const start = band * LSH_ROWS_PER_BAND;
    const end = start + LSH_ROWS_PER_BAND;
    const bandValues = signature.slice(start, end);
    
    // Hash the band values to create a bucket key
    const bandKey = `b${band}:${hashArray(bandValues)}`;
    bandHashes.push(bandKey);
  }
  
  return bandHashes;
}

/**
 * Estimate Jaccard similarity from MinHash signatures.
 */
export function estimateJaccardFromMinHash(sig1: number[], sig2: number[]): number {
  if (sig1.length !== sig2.length) return 0;
  
  let matches = 0;
  for (let i = 0; i < sig1.length; i++) {
    if (sig1[i] === sig2[i]) matches++;
  }
  
  return matches / sig1.length;
}

/**
 * Create a complete MinHash signature with LSH bands.
 */
export function createFunctionSignature(
  functionId: string,
  normalizedBody: string
): MinHashSignature {
  const signature = generateFunctionMinHash(normalizedBody);
  const bandHashes = generateLSHBandHashes(signature);
  
  return {
    id: functionId,
    signature,
    bandHashes
  };
}

// =============================================================================
// PAGERANK FOR TEMPLATE AUTHORITY
// =============================================================================

/**
 * Template temporal data for directed PageRank.
 */
export interface TemplateDate {
  id: string;
  effectiveDate?: string | null; // ISO date string or null
}

/**
 * Build similarity graph from template similarity data.
 * 
 * If templateDates is provided, creates a DIRECTED graph where:
 * - Edges point from NEWER template to OLDER template
 * - This makes older templates accumulate more PageRank (more authoritative)
 * 
 * If templateDates is not provided, creates an UNDIRECTED graph (bidirectional edges).
 * 
 * Returns adjacency list representation.
 */
export function buildSimilarityGraph(
  similarities: Array<{
    template1: string;
    template2: string;
    similarity: number;
  }>,
  threshold: number = 0.6,
  templateDates?: Map<string, string | null> // Map of templateId -> effectiveDate
): Map<string, Map<string, number>> {
  const graph = new Map<string, Map<string, number>>();
  
  for (const { template1, template2, similarity } of similarities) {
    if (similarity < threshold) continue;
    
    // Ensure both nodes exist in the graph
    if (!graph.has(template1)) {
      graph.set(template1, new Map());
    }
    if (!graph.has(template2)) {
      graph.set(template2, new Map());
    }
    
    // Determine edge direction based on dates
    if (templateDates) {
      const date1 = templateDates.get(template1);
      const date2 = templateDates.get(template2);
      
      if (date1 && date2) {
        // Directed: edge from newer to older (older accumulates authority)
        if (date1 > date2) {
          // template1 is newer, edge points to template2 (older)
          graph.get(template1)!.set(template2, similarity);
        } else if (date2 > date1) {
          // template2 is newer, edge points to template1 (older)
          graph.get(template2)!.set(template1, similarity);
        } else {
          // Same date: bidirectional
          graph.get(template1)!.set(template2, similarity);
          graph.get(template2)!.set(template1, similarity);
        }
      } else {
        // Missing date for one or both: bidirectional
        graph.get(template1)!.set(template2, similarity);
        graph.get(template2)!.set(template1, similarity);
      }
    } else {
      // No dates provided: undirected graph (bidirectional edges)
      graph.get(template1)!.set(template2, similarity);
      graph.get(template2)!.set(template1, similarity);
    }
  }
  
  return graph;
}

/**
 * Compute PageRank scores for templates.
 * Higher scores indicate more "authoritative" templates (likely originals).
 * 
 * The algorithm:
 * 1. Start with equal probability for all nodes
 * 2. Iteratively distribute probability based on incoming links
 * 3. Apply damping factor (probability of random jump)
 * 4. Converge to stationary distribution
 */
export function computePageRank(
  graph: Map<string, Map<string, number>>,
  damping: number = 0.85,
  iterations: number = 50,
  tolerance: number = 1e-6
): Map<string, number> {
  const nodes = Array.from(graph.keys());
  const n = nodes.length;
  
  if (n === 0) return new Map();
  
  // Initialize with uniform probability
  const ranks = new Map<string, number>();
  for (const node of nodes) {
    ranks.set(node, 1 / n);
  }
  
  // Iterate until convergence
  for (let iter = 0; iter < iterations; iter++) {
    const newRanks = new Map<string, number>();
    let maxDelta = 0;
    
    for (const node of nodes) {
      // Sum of incoming PageRank contributions
      let incomingSum = 0;
      const neighbors = graph.get(node) || new Map();
      
      for (const [neighbor, weight] of neighbors) {
        const neighborOutDegree = graph.get(neighbor)?.size || 1;
        const neighborRank = ranks.get(neighbor) || 0;
        // Weight the contribution by similarity and divide by out-degree
        incomingSum += (neighborRank * weight) / neighborOutDegree;
      }
      
      // PageRank formula with damping
      const newRank = (1 - damping) / n + damping * incomingSum;
      newRanks.set(node, newRank);
      
      // Track convergence
      const delta = Math.abs(newRank - (ranks.get(node) || 0));
      if (delta > maxDelta) maxDelta = delta;
    }
    
    // Update ranks
    for (const [node, rank] of newRanks) {
      ranks.set(node, rank);
    }
    
    // Check convergence
    if (maxDelta < tolerance) {
      console.log(`[PageRank] Converged after ${iter + 1} iterations`);
      break;
    }
  }
  
  return ranks;
}

/**
 * Classify templates based on PageRank and graph structure.
 */
export function classifyTemplates(
  graph: Map<string, Map<string, number>>,
  ranks: Map<string, number>,
  creationDates?: Map<string, number>
): PageRankResult[] {
  const results: PageRankResult[] = [];
  const maxRank = Math.max(...ranks.values());
  
  for (const [templateId, score] of ranks) {
    const neighbors = graph.get(templateId) || new Map();
    const inDegree = neighbors.size;
    
    // Count out-degree (how many templates link TO this one)
    let outDegree = 0;
    for (const [_, edges] of graph) {
      if (edges.has(templateId)) outDegree++;
    }
    
    // Classify based on normalized rank and degree
    const normalizedRank = maxRank > 0 ? score / maxRank : 0;
    let classification: 'original' | 'derivative' | 'isolated';
    
    if (inDegree === 0 && outDegree === 0) {
      classification = 'isolated';
    } else if (normalizedRank > 0.7 || (inDegree > outDegree * 2)) {
      // High PageRank or more incoming than outgoing = likely original
      classification = 'original';
    } else {
      classification = 'derivative';
    }
    
    results.push({
      templateId,
      score,
      inDegree,
      outDegree,
      classification
    });
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

/**
 * Find potential originals for a given template based on PageRank.
 */
export function findPotentialOriginals(
  templateId: string,
  graph: Map<string, Map<string, number>>,
  ranks: Map<string, number>,
  topK: number = 5
): Array<{ templateId: string; score: number; similarity: number }> {
  const neighbors = graph.get(templateId) || new Map();
  
  // Find neighbors with higher PageRank (potential originals)
  const myRank = ranks.get(templateId) || 0;
  const candidates: Array<{ templateId: string; score: number; similarity: number }> = [];
  
  for (const [neighborId, similarity] of neighbors) {
    const neighborRank = ranks.get(neighborId) || 0;
    if (neighborRank > myRank) {
      candidates.push({
        templateId: neighborId,
        score: neighborRank,
        similarity
      });
    }
  }
  
  // Sort by rank and return top K
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, topK);
}

// =============================================================================
// FRAMEWORK PATTERN DETECTION
// =============================================================================

/**
 * Comprehensive framework detection patterns.
 */
const FRAMEWORK_PATTERNS: Record<string, {
  detect: (js: string, css?: string) => { features: string[]; confidence: number; version?: string };
}> = {
  // Animation Libraries
  gsap: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      let version: string | undefined;
      
      // Core GSAP
      if (/gsap\s*\./i.test(js) || /TweenMax|TweenLite/i.test(js)) {
        features.push('core');
        confidence += 0.4;
      }
      
      // ScrollTrigger
      if (/ScrollTrigger/i.test(js)) {
        features.push('scrolltrigger');
        confidence += 0.2;
      }
      
      // SplitText
      if (/SplitText/i.test(js)) {
        features.push('splittext');
        confidence += 0.1;
      }
      
      // DrawSVG
      if (/DrawSVGPlugin/i.test(js)) {
        features.push('drawsvg');
        confidence += 0.1;
      }
      
      // MorphSVG
      if (/MorphSVGPlugin/i.test(js)) {
        features.push('morphsvg');
        confidence += 0.1;
      }
      
      // Flip
      if (/Flip\s*\./i.test(js)) {
        features.push('flip');
        confidence += 0.1;
      }
      
      // Version detection
      const versionMatch = js.match(/gsap.*?(\d+\.\d+\.\d+)/i);
      if (versionMatch) version = versionMatch[1];
      
      return { features, confidence: Math.min(1, confidence), version };
    }
  },
  
  lenis: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/new\s+Lenis/i.test(js) || /lenis\.scrollTo/i.test(js)) {
        features.push('smooth-scroll');
        confidence = 0.9;
      }
      
      if (/lenis\.on\s*\(\s*['"]scroll/i.test(js)) {
        features.push('scroll-events');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      return { features, confidence };
    }
  },
  
  locomotive: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/LocomotiveScroll/i.test(js) || /locomotive-scroll/i.test(js)) {
        features.push('smooth-scroll');
        confidence = 0.9;
      }
      
      if (/data-scroll-speed/i.test(js)) {
        features.push('parallax');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      return { features, confidence };
    }
  },
  
  barba: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/barba\.init/i.test(js) || /barba\.use/i.test(js)) {
        features.push('page-transitions');
        confidence = 0.9;
      }
      
      if (/barba\.hooks/i.test(js)) {
        features.push('hooks');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      return { features, confidence };
    }
  },
  
  swiper: {
    detect: (js, css) => {
      const features: string[] = [];
      let confidence = 0;
      let version: string | undefined;
      
      if (/new\s+Swiper/i.test(js) || /swiper-container/i.test(js)) {
        features.push('carousel');
        confidence = 0.8;
      }
      
      if (/swiper-pagination/i.test(js) || /pagination:/i.test(js)) {
        features.push('pagination');
      }
      
      if (/swiper-button/i.test(js) || /navigation:/i.test(js)) {
        features.push('navigation');
      }
      
      if (/autoplay:/i.test(js)) {
        features.push('autoplay');
      }
      
      // Version detection
      const versionMatch = js.match(/Swiper.*?(\d+\.\d+)/i);
      if (versionMatch) version = versionMatch[1];
      
      return { features, confidence, version };
    }
  },
  
  splide: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/new\s+Splide/i.test(js) || /splide-track/i.test(js)) {
        features.push('carousel');
        confidence = 0.8;
      }
      
      if (/AutoScroll/i.test(js)) {
        features.push('autoscroll');
      }
      
      return { features, confidence };
    }
  },
  
  // UI Frameworks
  webflow: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/Webflow\.require/i.test(js)) {
        features.push('ix2');
        confidence += 0.5;
      }
      
      if (/Webflow\.push/i.test(js)) {
        features.push('ready');
        confidence += 0.2;
      }
      
      if (/Webflow\.commerce/i.test(js)) {
        features.push('ecommerce');
        confidence += 0.2;
      }
      
      if (/w-form|w-input|w-select/i.test(js)) {
        features.push('forms');
        confidence += 0.1;
      }
      
      return { features, confidence: Math.min(1, confidence) };
    }
  },
  
  finsweet: {
    detect: (js, css) => {
      const features: string[] = [];
      let confidence = 0;
      
      // Core detection
      if (/FsLibrary|fs-/i.test(js) || /finsweet/i.test(js)) {
        confidence = 0.7;
      }
      
      // Finsweet Attributes (data-* patterns)
      if (/fs-cmsfilter|data-fs-cmsfilter/i.test(js)) {
        features.push('cms-filter');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      if (/fs-cmsnest|data-fs-cmsnest/i.test(js)) {
        features.push('cms-nest');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      if (/fs-cmsload|data-fs-cmsload/i.test(js)) {
        features.push('cms-load');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      if (/fs-cmssort|data-fs-cmssort/i.test(js)) {
        features.push('cms-sort');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      if (/fs-attributes|data-fs-/i.test(js)) {
        features.push('attributes');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      // Cookie/Storage
      if (/fs-cc|data-fs-cc/i.test(js)) {
        features.push('cookie-consent');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      // Form utilities
      if (/fs-form|data-fs-form/i.test(js)) {
        features.push('form-utilities');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      return { features, confidence };
    }
  },
  
  // Utility Libraries
  intersection_observer: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/IntersectionObserver/i.test(js)) {
        features.push('visibility-detection');
        confidence = 0.7;
      }
      
      if (/isIntersecting/i.test(js)) {
        features.push('entry-tracking');
        confidence = Math.min(1, confidence + 0.2);
      }
      
      return { features, confidence };
    }
  },
  
  resize_observer: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/ResizeObserver/i.test(js)) {
        features.push('resize-tracking');
        confidence = 0.7;
      }
      
      return { features, confidence };
    }
  },
  
  mutation_observer: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/MutationObserver/i.test(js)) {
        features.push('dom-mutation-tracking');
        confidence = 0.7;
      }
      
      return { features, confidence };
    }
  },
  
  // Animation Utilities
  animate_css: {
    detect: (js, css) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (css && /animate__/i.test(css)) {
        confidence = 0.8;
        features.push('css-animations');
      }
      
      return { features, confidence };
    }
  },
  
  aos: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/AOS\.init/i.test(js) || /data-aos=/i.test(js)) {
        features.push('scroll-animations');
        confidence = 0.8;
      }
      
      return { features, confidence };
    }
  },
  
  // 3D/WebGL
  three_js: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/THREE\./i.test(js) || /new\s+Scene/i.test(js)) {
        features.push('3d-graphics');
        confidence = 0.8;
      }
      
      if (/WebGLRenderer/i.test(js)) {
        features.push('webgl');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      return { features, confidence };
    }
  },
  
  spline: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/spline-viewer|@splinetool/i.test(js)) {
        features.push('3d-embed');
        confidence = 0.9;
      }
      
      return { features, confidence };
    }
  },
  
  // Design Systems (Webflow-specific)
  client_first: {
    detect: (js, css) => {
      const features: string[] = [];
      let confidence = 0;
      
      // Client-First naming conventions
      if (css) {
        // State classes
        if (/\.is-[a-z-]+/i.test(css)) {
          features.push('state-classes');
          confidence += 0.2;
        }
        
        // Component classes with cc- prefix
        if (/\.cc-[a-z-]+/i.test(css)) {
          features.push('component-classes');
          confidence += 0.3;
        }
        
        // Utility tokens (margin/padding)
        if (/\.margin-[a-z]+|\.padding-[a-z]+/i.test(css)) {
          features.push('spacing-tokens');
          confidence += 0.2;
        }
        
        // Section/container patterns
        if (/\.section_[a-z-]+|\.container_[a-z-]+/i.test(css)) {
          features.push('layout-components');
          confidence += 0.2;
        }
        
        // Header/footer patterns
        if (/\.header_|\.footer_|\.navbar_/i.test(css)) {
          features.push('navigation-components');
          confidence += 0.1;
        }
      }
      
      return { features, confidence: Math.min(1, confidence) };
    }
  },
  
  relume: {
    detect: (js, css) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (css) {
        // Relume-specific class patterns
        if (/\.rl-[a-z-]+/i.test(css)) {
          features.push('relume-classes');
          confidence += 0.5;
        }
        
        // Relume component patterns (common naming)
        if (/\.hero-[a-z0-9]+|\.cta-[a-z0-9]+|\.testimonial-[a-z0-9]+/i.test(css)) {
          features.push('component-library');
          confidence += 0.2;
        }
        
        // Layout grid patterns
        if (/\.layout[0-9]+|\.grid-[a-z0-9]+/i.test(css)) {
          features.push('layout-system');
          confidence += 0.2;
        }
        
        // CMS integration patterns
        if (/\.cms-item|\.cms-list/i.test(css)) {
          features.push('cms-integration');
          confidence += 0.1;
        }
      }
      
      return { features, confidence: Math.min(1, confidence) };
    }
  },
  
  lumos: {
    detect: (js, css) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (css) {
        // Lumos-specific patterns
        if (/\.lumos-[a-z-]+/i.test(css)) {
          features.push('lumos-classes');
          confidence += 0.6;
        }
        
        // Design token patterns
        if (/--lumos-|--lm-/i.test(css)) {
          features.push('design-tokens');
          confidence += 0.3;
        }
        
        // Component patterns
        if (/\.lm-[a-z-]+/i.test(css)) {
          features.push('component-system');
          confidence += 0.1;
        }
      }
      
      return { features, confidence: Math.min(1, confidence) };
    }
  },
  
  // Webflow Cloneable Patterns (generic design systems)
  wized: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/Wized|wized\.request|wized\.data/i.test(js)) {
        features.push('data-binding');
        confidence = 0.9;
      }
      
      if (/wized-element/i.test(js)) {
        features.push('element-binding');
        confidence = Math.min(1, confidence + 0.1);
      }
      
      return { features, confidence };
    }
  },
  
  memberstack: {
    detect: (js) => {
      const features: string[] = [];
      let confidence = 0;
      
      if (/memberstack|ms-hide|ms-show/i.test(js)) {
        features.push('membership');
        confidence = 0.9;
      }
      
      return { features, confidence };
    }
  }
};

/**
 * Detect all frameworks used in a template.
 */
export function detectFrameworks(js: string, css?: string): FrameworkFingerprint[] {
  const detected: FrameworkFingerprint[] = [];
  
  for (const [name, { detect }] of Object.entries(FRAMEWORK_PATTERNS)) {
    const result = detect(js, css);
    
    if (result.confidence > 0.5 || result.features.length > 0) {
      detected.push({
        name,
        version: result.version,
        features: result.features,
        confidence: result.confidence
      });
    }
  }
  
  // Sort by confidence descending
  detected.sort((a, b) => b.confidence - a.confidence);
  
  return detected;
}

/**
 * Generate a framework fingerprint string for comparison.
 */
export function generateFrameworkFingerprint(frameworks: FrameworkFingerprint[]): string {
  // Sort for consistency
  const sorted = [...frameworks].sort((a, b) => a.name.localeCompare(b.name));
  
  return sorted
    .filter(f => f.confidence >= 0.7)
    .map(f => `${f.name}:${f.features.sort().join(',')}`)
    .join('|');
}

/**
 * Compare framework fingerprints between two templates.
 */
export function compareFrameworkFingerprints(
  fp1: FrameworkFingerprint[],
  fp2: FrameworkFingerprint[]
): {
  similarity: number;
  sharedFrameworks: string[];
  uniqueToFirst: string[];
  uniqueToSecond: string[];
} {
  const names1 = new Set(fp1.map(f => f.name));
  const names2 = new Set(fp2.map(f => f.name));
  
  const sharedFrameworks = [...names1].filter(n => names2.has(n));
  const uniqueToFirst = [...names1].filter(n => !names2.has(n));
  const uniqueToSecond = [...names2].filter(n => !names1.has(n));
  
  // Jaccard similarity
  const union = new Set([...names1, ...names2]);
  const similarity = union.size > 0 ? sharedFrameworks.length / union.size : 0;
  
  return {
    similarity,
    sharedFrameworks,
    uniqueToFirst,
    uniqueToSecond
  };
}

// =============================================================================
// BAYESIAN CONFIDENCE SCORING
// =============================================================================

/**
 * Default prior probability of plagiarism (base rate).
 * Based on industry estimates of template copying.
 */
const DEFAULT_PRIOR = 0.15;

/**
 * Verdict thresholds for Bayesian confidence.
 * Calibrated based on accuracy report (Jan 2026):
 * - Raised from 0.3/0.5/0.75 to 0.4/0.65/0.75 to reduce false positives
 */
const VERDICT_THRESHOLDS = {
  no_plagiarism: 0.4,   // Below this = no_plagiarism
  possible: 0.65,       // Below this = possible, above = likely
  definite: 0.75        // Above this = definite
};

/**
 * Evidence weights for Bayesian calculation.
 */
const EVIDENCE_WEIGHTS: Record<string, { weight: number; threshold: number }> = {
  cssSimilarity: { weight: 0.25, threshold: 0.7 },
  jsSimilarity: { weight: 0.20, threshold: 0.6 },
  structuralSimilarity: { weight: 0.15, threshold: 0.7 },
  frameworkMatch: { weight: 0.15, threshold: 0.8 },
  animationMatch: { weight: 0.10, threshold: 0.5 },
  colorMatch: { weight: 0.05, threshold: 0.8 },
  pageRankDiff: { weight: 0.10, threshold: 0.3 }
};

/**
 * Calculate Bayesian confidence for plagiarism.
 * 
 * Uses Bayes' theorem:
 * P(plagiarism|evidence) = P(evidence|plagiarism) * P(plagiarism) / P(evidence)
 */
export function calculateBayesianConfidence(
  evidence: Record<string, number>,
  prior: number = DEFAULT_PRIOR
): BayesianConfidence {
  const factors: BayesianConfidence['factors'] = [];
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [name, config] of Object.entries(EVIDENCE_WEIGHTS)) {
    const value = evidence[name] ?? 0;
    const { weight, threshold } = config;
    
    // Calculate contribution: how much this evidence supports plagiarism
    // Above threshold = positive evidence, below = negative evidence
    const normalizedValue = Math.min(1, value / threshold);
    const contribution = weight * normalizedValue;
    
    factors.push({
      name,
      weight,
      value,
      contribution
    });
    
    totalWeight += weight;
    weightedSum += contribution;
  }
  
  // Normalize weighted sum
  const likelihood = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  // Apply Bayes' theorem (simplified)
  // P(plagiarism|evidence) ∝ likelihood * prior
  // We use a logistic function to bound probability between 0 and 1
  const logOdds = Math.log(prior / (1 - prior)) + 3 * (likelihood - 0.5);
  const probability = 1 / (1 + Math.exp(-logOdds));
  
  // Determine verdict using calibrated thresholds
  let verdict: BayesianConfidence['verdict'];
  if (probability < VERDICT_THRESHOLDS.no_plagiarism) {
    verdict = 'no_plagiarism';
  } else if (probability < VERDICT_THRESHOLDS.possible) {
    verdict = 'possible';
  } else if (probability < VERDICT_THRESHOLDS.definite) {
    verdict = 'likely';
  } else {
    verdict = 'definite';
  }
  
  return {
    probability,
    prior,
    likelihood,
    factors: factors.sort((a, b) => b.contribution - a.contribution),
    verdict
  };
}

/**
 * Aggregate multiple Bayesian scores (e.g., across multiple comparisons).
 */
export function aggregateBayesianScores(
  scores: BayesianConfidence[]
): BayesianConfidence {
  if (scores.length === 0) {
    return {
      probability: 0,
      prior: DEFAULT_PRIOR,
      likelihood: 0,
      factors: [],
      verdict: 'no_plagiarism'
    };
  }
  
  if (scores.length === 1) {
    return scores[0];
  }
  
  // Use maximum probability (most suspicious comparison)
  const maxScore = scores.reduce((max, s) => 
    s.probability > max.probability ? s : max
  );
  
  return maxScore;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * FNV-1a hash with seed for MinHash.
 */
function hashWithSeed(str: string, seed: number): number {
  let hash = 2166136261 ^ seed;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Hash an array of numbers to a string.
 */
function hashArray(arr: number[]): string {
  let hash = 0;
  for (const num of arr) {
    hash = ((hash << 5) - hash + num) | 0;
  }
  return hash.toString(36);
}
