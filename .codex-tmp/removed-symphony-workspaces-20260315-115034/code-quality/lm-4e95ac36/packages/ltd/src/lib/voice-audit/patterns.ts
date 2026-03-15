/**
 * Voice Audit Patterns
 *
 * Machine-readable definitions for Voice compliance checking.
 * Human-readable version: https://createsomething.ltd/voice
 */

// ============================================================================
// FORBIDDEN PATTERNS
// These words should NEVER appear in CREATE SOMETHING content
// ============================================================================

export const FORBIDDEN_PATTERNS = [
	'cutting-edge',
	'revolutionary',
	'game-changing',
	'AI-powered',
	'leverage',
	'synergy',
	'solutions',
	'best-in-class',
	'world-class',
	'industry-leading',
	'next-generation',
	'bleeding-edge',
	'disruptive',
	'innovative', // too vague
	'seamless',
	'robust', // meaningless without specifics
	'scalable', // meaningless without specifics
	'enterprise-grade',
	'turnkey'
] as const;

// ============================================================================
// VAGUE CLAIM PATTERNS
// Flag for manual review - need specific metrics
// ============================================================================

export const VAGUE_PATTERNS: RegExp[] = [
	// Vague improvements
	/significant(ly)?\s+(improve|reduc|increas|faster|better)/i,
	/substantial(ly)?\s+(improve|reduc|increas|savings)/i,
	/dramatic(ally)?\s+(improve|reduc|increas)/i,

	// Vague quantities
	/many\s+(users|customers|clients|teams|companies)/i,
	/numerous\s+(users|customers|clients)/i,
	/various\s+(improvements|benefits|features)/i,
	/multiple\s+(benefits|advantages)/i,

	// Vague performance
	/fast(er)?\s+(load|performance|response)/i,
	/quick(ly|er)?\s+(load|deploy|build)/i,
	/improved?\s+performance/i,

	// Vague time savings
	/saves?\s+time/i,
	/time\s+savings?/i,
	/reduced?\s+(development\s+)?time/i,

	// Vague cost
	/cost[\s-]effective/i,
	/reduces?\s+costs?/i,
	/saves?\s+money/i
];

// ============================================================================
// TERMINOLOGY CORRECTIONS
// Map violations to preferred terms
// ============================================================================

export const TERMINOLOGY_VIOLATIONS: Record<string, string> = {
	// AI terminology
	'AI-assisted': 'AI-native development',
	'AI-powered': 'AI-native development',
	'AI agent': 'agentic system',
	'AI agents': 'agentic systems',

	// Research terminology
	projects: 'experiments',
	'blog post': 'paper',
	'blog posts': 'papers',
	article: 'paper',
	articles: 'papers',
	findings: 'reproducible results',

	// Quality terminology
	'best practices': 'canonical standards',
	'style guide': 'canonical standards',
	functional: 'production-ready',
	working: 'production-ready',
	'enterprise solution': 'business-critical infrastructure',

	// Philosophy terminology
	influences: 'masters',
	inspiration: 'masters',
	properties: 'Modes of Being',
	websites: 'Modes of Being'
};

// ============================================================================
// CASE-INSENSITIVE TERMINOLOGY CHECK
// For matching in content
// ============================================================================

export const TERMINOLOGY_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = Object.entries(
	TERMINOLOGY_VIOLATIONS
).map(([violation, replacement]) => ({
	pattern: new RegExp(`\\b${violation}\\b`, 'gi'),
	replacement
}));

// ============================================================================
// REQUIRED SECTIONS BY CONTENT TYPE
// ============================================================================

export const REQUIRED_SECTIONS = {
	caseStudy: [
		{ name: 'Time metrics', pattern: /\d+\s*(hours?|days?|weeks?|minutes?)/i },
		{ name: 'Cost metrics', pattern: /\$[\d,]+|\d+%\s*(savings?|reduction|improvement)/i },
		{ name: 'What This Proves', pattern: /what\s+this\s+proves/i },
		{ name: 'What This Doesn\'t Prove', pattern: /what\s+this\s+(doesn'?t|does\s+not)\s+prove/i }
	],
	paper: [
		{ name: 'Hypothesis/Question', pattern: /hypothesis|research\s+question/i },
		{ name: 'Methodology', pattern: /methodology|approach|method/i },
		{ name: 'Limitations', pattern: /limitation|caveat|doesn'?t\s+prove/i },
		{ name: 'Reproducibility', pattern: /reproduc|replicate|starting\s+prompt/i }
	],
	educational: [
		{ name: 'Learning objective', pattern: /you('ll)?\s+(learn|understand|discover)/i },
		{ name: 'Prerequisites', pattern: /prerequisite|before\s+you\s+begin|requires?/i }
	]
} as const;

// ============================================================================
// ACCEPTABLE PATTERNS
// Context where forbidden patterns MAY be acceptable
// ============================================================================

export const ACCEPTABLE_CONTEXTS = [
	// Quoting others
	/[""][^""]*[""]/, // Inside quotes
	/<blockquote>.*<\/blockquote>/is,

	// Code examples
	/<code>.*<\/code>/is,
	/```[\s\S]*?```/,

	// Explicitly marking what NOT to do
	/don'?t\s+use/i,
	/avoid/i,
	/forbidden/i,
	/never\s+use/i
];

// ============================================================================
// AUDIT RESULT TYPES
// ============================================================================

export interface VoiceViolation {
	type: 'forbidden' | 'vague' | 'terminology' | 'missing_section';
	line: number;
	column?: number;
	found: string;
	suggestion: string;
	severity: 'error' | 'warning';
}

export interface VoiceAuditResult {
	file: string;
	contentType: 'caseStudy' | 'paper' | 'educational' | 'unknown';
	violations: VoiceViolation[];
	manualReviewRequired: string[];
	score: number; // 0-100
}

// ============================================================================
// CONTENT TYPE DETECTION
// ============================================================================

export function detectContentType(
	filePath: string,
	content: string
): 'caseStudy' | 'paper' | 'educational' | 'unknown' {
	// Path-based detection
	if (filePath.includes('/work/') || filePath.includes('/case-study/')) {
		return 'caseStudy';
	}
	if (filePath.includes('/papers/')) {
		return 'paper';
	}
	if (filePath.includes('/praxis/') || filePath.includes('/learn/') || filePath.includes('/lms/')) {
		return 'educational';
	}

	// Content-based detection
	if (/client|case\s+study|challenge.*solution/i.test(content)) {
		return 'caseStudy';
	}
	if (/hypothesis|methodology|abstract/i.test(content)) {
		return 'paper';
	}
	if (/exercise|tutorial|learn/i.test(content)) {
		return 'educational';
	}

	return 'unknown';
}
