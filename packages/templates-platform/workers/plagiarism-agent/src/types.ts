/**
 * Type definitions for Plagiarism Detection Agent
 */

// =============================================================================
// Environment Types
// =============================================================================

export interface Env {
	DB: D1Database;
	SCREENSHOTS: R2Bucket;
	CASE_QUEUE: Queue;
	AI: any;
	BROWSER: any;
	VECTORIZE: VectorizeIndex;
	ANTHROPIC_API_KEY: string;
	OPENAI_API_KEY: string;
	AIRTABLE_API_KEY: string;
	AIRTABLE_BASE_ID: string;
	AIRTABLE_TABLE_ID: string;
}

// =============================================================================
// Case Types
// =============================================================================

export interface PlagiarismCase {
	id: string;
	airtableRecordId: string;
	reporterEmail: string;
	originalUrl: string;
	allegedCopyUrl: string;
	complaintText: string;
	allegedCreator: string;
	status: 'pending' | 'processing' | 'completed';
	createdAt: number;
}

export type FinalDecision = 'no_violation' | 'minor' | 'major';

export interface QueueMessage {
	caseId: string;
	tier: 1 | 2 | 3;
}

// =============================================================================
// Analysis Types
// =============================================================================

export interface Tier1Decision {
	decision: 'obvious_not' | 'obvious_yes' | 'needs_analysis';
	reasoning: string;
}

export interface Tier2Result {
	decision: FinalDecision;
	reasoning: string;
	confidence: number;
}

export interface Tier3Result {
	decision: FinalDecision;
	reasoning: string;
	confidence: number;
}

export interface MinHashPreScreenResult {
	cssSimilarity: number;
	classOverlap: number;
	propertySimilarity: number;
	similarCount: number;
	verdict: string;
	topMatches?: Array<{ id: string; name: string; similarity: number }>;
}

// =============================================================================
// Comparison Types
// =============================================================================

export interface PatternMatch {
	type: 'class' | 'property' | 'animation' | 'color' | 'gradient' | 'variable' | 'structure';
	value: string;
	context?: string;
}

export interface IdenticalRule {
	selector: string;
	properties: string[];
	similarity: number;
	depth?: number;
	scope?: 'page' | 'section' | 'component' | 'element';
}

export interface StructuralMatch {
	level: 'page' | 'section' | 'component' | 'element';
	tag: string;
	depth: number;
	childSignature: string;
	weight: number;
}

export interface VisualEvidence {
	selector: string;
	css: string;
	html1: string;
	html2: string;
	properties: string[];
}

export interface ComparisonBreakdown {
	cssClasses: { similarity: number; shared: string[]; unique1: string[]; unique2: string[] };
	cssProperties: { similarity: number; shared: PatternMatch[] };
	animations: { similarity: number; shared: string[] };
	colors: { similarity: number; shared: string[] };
	structure: { similarity: number; patterns: string[] };
}

export interface ComparisonResult {
	template1: { id: string; name: string; url: string };
	template2: { id: string; name: string; url: string };
	overallSimilarity: number;
	identicalRules: IdenticalRule[];
	propertyCombinations: Array<{ selector: string; props: string[]; weight: number }>;
	visualEvidence: VisualEvidence[];
	structuralMatches: {
		score: number;
		matches: Array<{ pattern: string; level: string; weight: number; count: number }>;
	};
	breakdown: ComparisonBreakdown;
	evidence: {
		matchingPatterns: PatternMatch[];
		codeExcerpts: Array<{ label: string; code1: string; code2: string; similarity: number }>;
	};
}

// =============================================================================
// Keyword Extraction Types
// =============================================================================

export interface KeywordResult {
	url: string;
	keywords: Array<{
		term: string;
		score: number;
		category: 'industry' | 'style' | 'feature' | 'color' | 'technical';
	}>;
	categories: {
		industry: string[];
		style: string[];
		features: string[];
		colors: string[];
	};
	summary: string;
}

// =============================================================================
// Code Analysis Types
// =============================================================================

export interface CodePatterns {
	cssAnimations: number;
	cssTransitions: number;
	cssAnimationSamples: string[];
	gridLayouts: number;
	flexLayouts: number;
	sections: number;
	headers: number;
	navs: number;
	jsLibraries: string[];
	animationCalls: number;
	webflowPatterns: {
		interactions: number;
		ixData: boolean;
		animations: number;
		triggers: number;
	};
	isWebflow: boolean;
}

export interface CodeMetrics {
	copyUrl: string;
	copyPatterns: CodePatterns;
	originals: Array<{
		originalUrl: string;
		originalPatterns: CodePatterns;
		deltas: {
			cssAnimationsDiff: number;
			sectionsDiff: number;
			gridLayoutsDiff: number;
			sharedLibraries: string[];
		};
	}>;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiErrorResponse {
	error: string;
}

export interface HealthResponse {
	status: 'healthy' | 'unhealthy';
	timestamp: number;
	stats?: {
		templatesIndexed: number;
		casesProcessed: number;
		lshBands: number;
	};
	error?: string;
	version: string;
}

export interface CaseStatusResponse {
	case_id: string;
	status: string;
	tier1_decision?: string;
	tier1_reasoning?: string;
	tier2_decision?: string;
	tier2_reasoning?: string;
	tier3_decision?: string;
	tier3_reasoning?: string;
	cost_usd?: number;
	created_at: number;
}

// =============================================================================
// Template Types
// =============================================================================

export interface TemplateCluster {
	representative: string;
	templates: Array<{ id: string; similarity: number }>;
	averageSimilarity: number;
}

export interface TemplateData {
	id: string;
	name: string;
	url: string;
	css_classes: string;
	css_signature: string;
	html_signature: string;
	combined_signature: string;
	created_at: number;
}
