/**
 * Constants and configuration for Plagiarism Detection Agent
 */

import type { FinalDecision } from './types';

// =============================================================================
// Cost Configuration
// =============================================================================

export const TIER_COSTS = {
	TIER1: 0.0,  // Workers AI (free)
	TIER2: 0.02, // Claude Haiku
	TIER3: 0.15  // Claude Sonnet
} as const;

// =============================================================================
// Thresholds
// =============================================================================

/**
 * Confidence threshold for auto-action on major violations.
 * Below this threshold, flag for human review instead of auto-delisting.
 */
export const MAJOR_VIOLATION_CONFIDENCE_THRESHOLD = 0.9;

/**
 * Tier 2 → Tier 3 escalation threshold.
 * Cases with confidence below this get code-level analysis.
 */
export const TIER3_ESCALATION_THRESHOLD = 0.75;

// =============================================================================
// Airtable Field Mappings
// =============================================================================

export const DECISION_TO_AIRTABLE: Record<FinalDecision, string> = {
	'no_violation': 'No violation',
	'minor': 'Minor violation',
	'major': 'Major violation'
};

export const DECISION_TO_OUTCOME: Record<FinalDecision, string> = {
	'no_violation': '',
	'minor': 'Notified Creator(s)',
	'major': 'Delisted template'
};

export const AIRTABLE_FIELDS = {
	DECISION: 'Decision',
	OUTCOME: 'Outcome',
	EXTENT: '✏️ Extent of copied content',
	TRANSFORMATION: '✏️ Level of Transformation & Originality Added',
	IMPORTANCE: '✏️ Importance of overall work',
	IMPACT: '✏️ Marketplace Impact & Intent'
} as const;

// =============================================================================
// TF-IDF Configuration
// =============================================================================

/**
 * Common words to filter out (stopwords + common web terms)
 */
export const STOPWORDS = new Set([
	// English stopwords
	'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
	'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
	'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
	'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our',
	'you', 'your', 'he', 'she', 'him', 'her', 'his', 'i', 'me', 'my', 'not', 'no', 'yes',
	'all', 'any', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
	'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'when', 'where', 'why',
	'how', 'what', 'which', 'who', 'whom', 'whose', 'if', 'then', 'else', 'so', 'because',
	// Common web/Webflow terms (too generic to be distinctive)
	'div', 'span', 'section', 'container', 'wrapper', 'block', 'item', 'list', 'link',
	'button', 'text', 'image', 'icon', 'logo', 'nav', 'menu', 'header', 'footer', 'main',
	'content', 'page', 'home', 'about', 'contact', 'services', 'blog', 'news', 'faq',
	'class', 'style', 'width', 'height', 'color', 'background', 'padding', 'margin',
	'flex', 'grid', 'display', 'position', 'top', 'left', 'right', 'bottom', 'center',
	'auto', 'none', 'hidden', 'visible', 'scroll', 'fixed', 'absolute', 'relative',
	'px', 'em', 'rem', 'vh', 'vw', 'rgb', 'rgba', 'hex', 'url', 'http', 'https', 'www',
	'webflow', 'wf', 'work', 'our', 'single', 'details', 'description', 'title',
	'new', 'get', 'see', 'view', 'read', 'more', 'click', 'learn', 'start', 'join',
	'row', 'col', 'column', 'box', 'area', 'zone', 'inner', 'outer', 'small', 'large',
	'medium', 'big', 'full', 'half', 'third', 'quarter', 'first', 'last', 'next', 'prev'
]);

/**
 * IDF values for common template terms (pre-computed from corpus).
 * Higher = more distinctive, Lower = more common
 */
export const IDF_BASELINE: Record<string, number> = {
	// Very common (low IDF)
	'hero': 0.5, 'cta': 0.6, 'card': 0.5, 'feature': 0.6, 'pricing': 0.7,
	'testimonial': 0.8, 'team': 0.7, 'portfolio': 0.8, 'gallery': 0.7,
	// Moderately common
	'dashboard': 1.2, 'saas': 1.3, 'startup': 1.1, 'agency': 1.0, 'creative': 1.0,
	'minimal': 1.1, 'modern': 0.9, 'dark': 1.2, 'light': 0.8, 'gradient': 1.3,
	// Distinctive (high IDF)
	'fintech': 2.0, 'crypto': 2.1, 'nft': 2.2, 'ai': 1.8, 'machine': 1.9,
	'healthcare': 2.0, 'medical': 1.9, 'legal': 2.1, 'law': 2.0, 'fitness': 1.8,
	'restaurant': 1.9, 'food': 1.7, 'recipe': 2.0, 'travel': 1.8, 'hotel': 2.0,
	'real-estate': 2.1, 'property': 1.9, 'architecture': 2.0, 'interior': 1.9,
	'fashion': 1.8, 'clothing': 1.9, 'ecommerce': 1.5, 'shop': 1.3, 'store': 1.2,
	'podcast': 2.0, 'music': 1.8, 'video': 1.5, 'streaming': 2.0, 'gaming': 2.1,
	'education': 1.7, 'course': 1.8, 'learning': 1.7, 'school': 1.9, 'university': 2.0,
	// Style keywords
	'glassmorphism': 2.5, 'neumorphism': 2.5, 'brutalist': 2.4, 'retro': 2.0,
	'neon': 2.2, 'cyberpunk': 2.5, 'vintage': 2.0, 'futuristic': 2.1,
	'parallax': 1.8, 'animated': 1.5, 'interactive': 1.6, '3d': 1.9, 'isometric': 2.3,
	// Color keywords
	'monochrome': 2.0, 'pastel': 1.9, 'vibrant': 1.8, 'muted': 1.7, 'earth': 1.9,
	'warm': 1.5, 'cool': 1.5, 'bold': 1.4, 'soft': 1.4, 'contrast': 1.6,
	// Additional industry keywords
	'payments': 2.0, 'payment': 1.9, 'banking': 2.1, 'finance': 1.8, 'insurance': 2.0,
	'consulting': 1.7, 'marketing': 1.5, 'photography': 1.8, 'film': 1.9,
	'freelance': 1.8, 'nonprofit': 2.0, 'charity': 2.0, 'church': 2.1,
	'event': 1.6, 'wedding': 2.0, 'beauty': 1.8, 'salon': 2.0, 'spa': 2.0,
	'wellness': 1.9, 'yoga': 2.1
};

// =============================================================================
// Version
// =============================================================================

export const AGENT_VERSION = '2.1.0';

// =============================================================================
// Sketch Configuration (Bloom Filter & HyperLogLog)
// =============================================================================

/**
 * Expected number of templates for Bloom filter sizing.
 * Bloom filter is optimized for this capacity with 1% false positive rate.
 */
export const BLOOM_EXPECTED_TEMPLATES = 50000;

/**
 * HyperLogLog precision for template counting.
 * 14 bits = ~0.8% error, 16KB memory
 */
export const HLL_PRECISION = 14;

/**
 * Minimum JS function lines for component-level detection.
 * Smaller functions (getters/setters) are skipped.
 */
export const MIN_JS_FUNCTION_LINES = 5;

/**
 * Similarity threshold for JS function duplicate detection.
 */
export const JS_FUNCTION_SIMILARITY_THRESHOLD = 0.7;
