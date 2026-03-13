/**
 * Motion Analysis Types
 *
 * Types for the motion ontology experiment—analyzing UI animations
 * through Heidegger's phenomenological framework.
 */

// ============================================================================
// Technical Layer Types
// ============================================================================

export interface AnimationData {
	name: string;
	duration: number;
	easing: string;
	delay: number;
	iterations: number;
	fillMode: string;
	keyframes: KeyframeData[];
	targetSelector?: string;
}

export interface KeyframeData {
	offset: number;
	properties: Record<string, string>;
}

export interface TransitionData {
	property: string;
	duration: number;
	easing: string;
	delay: number;
}

export interface TimingProfile {
	totalDuration: number;
	longestAnimation: number;
	shortestAnimation: number;
	averageDuration: number;
	parallelAnimations: number;
	sequentialChains: number;
}

export interface CSSDefinition {
	type: 'keyframes' | 'rule';
	name?: string;
	selector?: string;
	keyframes?: Array<{ offset: string; style: string }>;
	animation?: string | null;
	animationName?: string | null;
	animationDuration?: string | null;
	transition?: string | null;
	transitionProperty?: string | null;
	transitionDuration?: string | null;
	transform?: string | null;
}

export interface WebflowIXData {
	hasData?: boolean;
	siteId?: string;
	eventCount?: number;
	actionCount?: number;
	events?: string[];
	sampleAction?: unknown;
}

export interface ExtractionDebug {
	// Puppeteer Worker debug info
	elementFound?: boolean;
	hoverTriggered?: boolean;
	animationsBeforeHover?: number;
	animationsAfterHover?: number;
	captureTime?: number;
	puppeteerUsed?: boolean;
	realHoverTriggered?: boolean;
	// Legacy REST API debug info (deprecated)
	animationsError?: string;
	transitionsError?: string;
	cssDefinitionsError?: string;
	webflowError?: string;
	webflowInteractionElements?: number;
	sampleIxIds?: Array<{ id: string; tag: string; classes: string }>;
}

export interface TechnicalAnalysis {
	animations: AnimationData[];
	transitions: TransitionData[];
	timing: TimingProfile;
	propertiesAnimated: string[];
	triggerType: TriggerType;
	extractedAt: string;
	// Extended data
	cssDefinitions?: CSSDefinition[];
	webflowIX?: WebflowIXData | null;
	debug?: ExtractionDebug;
}

// ============================================================================
// Phenomenological Layer Types
// ============================================================================

/**
 * Heideggerian modes of being for motion
 *
 * Zuhandenheit (ready-to-hand): Motion recedes, supports intention
 * Vorhandenheit (present-at-hand): Motion obstructs, demands attention
 */
export type OntologicalMode = 'zuhandenheit' | 'vorhandenheit';

/**
 * Motion judgment based on CREATE SOMETHING ethos
 *
 * functional: Motion discloses something necessary
 * decorative: Motion exists for visual interest only
 * ambiguous: Unclear whether motion serves function
 */
export type MotionJudgment = 'functional' | 'decorative' | 'ambiguous';

/**
 * What the motion reveals to the user
 */
export type DisclosureType =
	| 'state_transition'
	| 'spatial_relationship'
	| 'user_confirmation'
	| 'hierarchy_reveal'
	| 'temporal_sequence'
	| 'none';

export interface PhenomenologicalAnalysis {
	disclosure: DisclosureType;
	disclosureDescription: string;
	mode: OntologicalMode;
	modeRationale: string;
	judgment: MotionJudgment;
	justification: string;
	recommendation: MotionRecommendation;
	confidence: number;
}

export interface MotionRecommendation {
	action: 'keep' | 'modify' | 'remove';
	reasoning: string;
	modification?: string;
}

// ============================================================================
// Analysis Request/Response Types
// ============================================================================

export type TriggerType = 'load' | 'click' | 'hover' | 'scroll' | 'focus';

export interface TriggerConfig {
	type: TriggerType;
	selector?: string;
	scrollPosition?: number;
	delay?: number;
}

export interface AnalysisRequest {
	url: string;
	trigger: TriggerConfig;
	options?: AnalysisOptions;
}

export interface AnalysisOptions {
	captureScreenshot?: boolean;
	waitForAnimations?: boolean;
	timeout?: number;
}

export interface MotionAnalysisResult {
	technical: TechnicalAnalysis;
	phenomenological: PhenomenologicalAnalysis;
	metadata: AnalysisMetadata;
}

export interface AnalysisMetadata {
	url: string;
	analyzedAt: string;
	duration: number;
	screenshotKey?: string;
}

// ============================================================================
// Corpus Types (for storage)
// ============================================================================

export interface CorpusEntry {
	id: string;
	url: string;
	technical_data: string; // JSON stringified TechnicalAnalysis
	phenomenological_data: string; // JSON stringified PhenomenologicalAnalysis
	screenshot_key: string | null;
	trigger_config: string; // JSON stringified TriggerConfig
	created_at: string;
	updated_at: string;
}

export interface CorpusStats {
	totalEntries: number;
	byJudgment: Record<MotionJudgment, number>;
	byMode: Record<OntologicalMode, number>;
	byDisclosure: Record<DisclosureType, number>;
	commonEasings: Array<{ easing: string; count: number }>;
	averageDuration: number;
}

// ============================================================================
// Environment Types
// ============================================================================

export interface MotionAnalysisEnv {
	AI: Ai;
	DB: D1Database;
	STORAGE: R2Bucket;
	CACHE: KVNamespace;
	// Note: CF_ACCOUNT_ID and CF_API_TOKEN no longer needed
	// Technical extraction now happens via Puppeteer Worker which handles auth internally
}
