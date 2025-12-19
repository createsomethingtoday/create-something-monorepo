/**
 * Analysis Tools
 *
 * Tools for analyzing user behavior and identifying product opportunities.
 */

export {
	// Types
	type Property,
	type SignalCategory,
	type BehavioralSignal,
	type AbusePattern,
	type UserIntent,
	type ProductDirection,
	type LatentDemandAnalysis,
	// Constants
	KNOWN_ABUSE_PATTERNS,
	KNOWN_USER_INTENTS,
	PROPOSED_DIRECTIONS,
	// Functions
	generateAnalysis,
	getPatternsByImportance,
	getIntentsBySupportLevel,
	getPrioritizedDirections,
	getDirectionsByTimeline,
	formatAnalysisReport,
} from './latent-demand.js';
