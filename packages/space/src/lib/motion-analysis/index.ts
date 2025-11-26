/**
 * Motion Ontology Analysis
 *
 * Der hermeneutische Zirkel der Bewegungsanalyse
 * (The Hermeneutic Circle of Motion Analysis)
 *
 * This module provides a complete framework for analyzing UI motion
 * through Heidegger's phenomenological lens. The structure reflects
 * the hermeneutic circle: understanding the whole through parts,
 * and parts through the whole.
 *
 * STRUCTURE:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                        SEIN (Being)                             │
 * │           What is the animation? (Technical Layer)              │
 * │                                                                 │
 * │  ┌─────────────────────────────────────────────────────────┐   │
 * │  │                    ALETHEIA (Truth)                      │   │
 * │  │       What does motion disclose? (Phenomenological)      │   │
 * │  │                                                          │   │
 * │  │   ┌─────────────────────────────────────────────────┐   │   │
 * │  │   │              URTEIL (Judgment)                   │   │   │
 * │  │   │    How should motion dwell? (Recommendation)     │   │   │
 * │  │   └─────────────────────────────────────────────────┘   │   │
 * │  └─────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * USAGE:
 *
 * ```typescript
 * import { analyzeMotion } from '$lib/motion-analysis';
 *
 * const result = await analyzeMotion(env, {
 *   url: 'https://example.com',
 *   trigger: { type: 'click', selector: 'button' }
 * });
 *
 * // result.technical - SEIN: What the animation IS
 * // result.phenomenological - ALETHEIA: What it DISCLOSES
 * // result.phenomenological.recommendation - URTEIL: How it should BE
 * ```
 */

// ============================================================================
// Types (Das Wesen - The Essence)
// ============================================================================

export type {
	// Technical types (Sein - Being)
	AnimationData,
	KeyframeData,
	TransitionData,
	TechnicalAnalysis,
	TimingProfile,

	// Phenomenological types (Aletheia - Truth)
	OntologicalMode,
	MotionJudgment,
	DisclosureType,
	PhenomenologicalAnalysis,
	MotionRecommendation,

	// Request/Response types (Verkehr - Commerce/Exchange)
	TriggerType,
	TriggerConfig,
	AnalysisRequest,
	AnalysisOptions,
	MotionAnalysisResult,
	AnalysisMetadata,

	// Storage types (Bewahrung - Preservation)
	CorpusEntry,
	CorpusStats,

	// Environment types
	MotionAnalysisEnv
} from './types';

// ============================================================================
// Framework (Das Gestell - The Framework/Enframing)
// ============================================================================

export {
	// Ontological criteria
	DISCLOSURE_PATTERNS,
	DECORATION_PATTERNS,
	ONTOLOGICAL_QUESTIONS,
	JUSTIFICATION_QUESTIONS,

	// Technical thresholds
	DURATION_THRESHOLDS,
	EASING_ASSOCIATIONS,
	PROPERTY_ASSOCIATIONS,

	// AI prompt
	PHENOMENOLOGICAL_SYSTEM_PROMPT,
	formatTechnicalContext
} from './heideggerian-framework';

// ============================================================================
// Phenomenological Interpretation (Auslegung - Interpretation)
// ============================================================================

export { interpretMotion, interpretMotionBatch } from './phenomenological';
export type { InterpretationResult } from './phenomenological';

// ============================================================================
// Technical Extraction (imported from server)
// ============================================================================

// Note: MotionExtractor is in lib/server/ as it requires server-side execution
// Import directly: import { MotionExtractor } from '$lib/server/motion-extractor'

// ============================================================================
// Unified Analysis Function (Verstehen - Understanding)
// ============================================================================

// Note: MotionExtractor is dynamically imported to avoid build-time issues
// with Cloudflare-specific imports. Use analyzeMotion() or extractMotion()
// which handle the dynamic import internally.

import { interpretMotion } from './phenomenological';
import type {
	AnalysisRequest,
	MotionAnalysisResult,
	MotionAnalysisEnv,
	TechnicalAnalysis
} from './types';

/**
 * Analyze motion holistically
 *
 * Vereinigung von Sein und Sinn
 * (Unification of Being and Meaning)
 *
 * This function performs the complete hermeneutic circle:
 * 1. Extract technical data (SEIN - what IS)
 * 2. Interpret phenomenologically (ALETHEIA - what DISCLOSES)
 * 3. Produce judgment (URTEIL - what SHOULD BE)
 */
export async function analyzeMotion(
	env: MotionAnalysisEnv,
	request: AnalysisRequest
): Promise<MotionAnalysisResult> {
	const startTime = Date.now();

	// Dynamic import to avoid build-time issues with cloudflare: protocol
	const { MotionExtractor } = await import('$lib/server/motion-extractor');

	// SEIN: Extract technical being of the animation
	const extractor = new MotionExtractor(env.BROWSER);
	const extraction = await extractor.extract(request.url, request.trigger, request.options);

	if (!extraction.success || !extraction.technical) {
		throw new Error(`Technical extraction failed: ${extraction.error}`);
	}

	// ALETHEIA: Interpret what motion discloses
	const interpretation = await interpretMotion(
		env.AI,
		extraction.technical,
		extraction.screenshot!,
		request.url
	);

	if (!interpretation.success || !interpretation.analysis) {
		throw new Error(`Phenomenological interpretation failed: ${interpretation.error}`);
	}

	// Return unified analysis
	return {
		technical: extraction.technical,
		phenomenological: interpretation.analysis,
		metadata: {
			url: request.url,
			analyzedAt: new Date().toISOString(),
			duration: Date.now() - startTime
		}
	};
}

/**
 * Extract technical data only (without interpretation)
 *
 * For batch processing or when only technical analysis is needed.
 */
export async function extractMotion(
	env: Pick<MotionAnalysisEnv, 'BROWSER'>,
	request: AnalysisRequest
): Promise<TechnicalAnalysis> {
	// Dynamic import to avoid build-time issues with cloudflare: protocol
	const { MotionExtractor } = await import('$lib/server/motion-extractor');

	const extractor = new MotionExtractor(env.BROWSER);
	const result = await extractor.extract(request.url, request.trigger, request.options);

	if (!result.success || !result.technical) {
		throw new Error(`Extraction failed: ${result.error}`);
	}

	return result.technical;
}
