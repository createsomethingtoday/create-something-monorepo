/**
 * Subtractive Triad Audit
 *
 * A code analysis tool based on three principles:
 * - DRY (Implementation): "Have I built this before?" → Unify
 * - Rams (Artifact): "Does this earn its existence?" → Remove
 * - Heidegger (System): "Does this serve the whole?" → Reconnect
 *
 * @packageDocumentation
 */

export { runAudit } from './audit.js';

export {
	collectDRYMetrics,
	collectRamsMetrics,
	collectHeideggerMetrics,
	// Architecture domain
	collectArchitectureHeideggerMetrics,
	generateFlowASCII,
	// PR Feedback patterns
	FeedbackCollector,
	DEFAULT_FEEDBACK_THRESHOLDS,
	KNOWN_FEEDBACK_PATTERNS
} from './collectors/index.js';

// Rule generators
export {
	generateRule,
	generateRulesFromPatterns,
	generateEslintConfig,
	suggestCanonEnhancements,
	findCanonPatternMatch,
	generateCanonAuditIntegration,
	suggestIntegrationPoints,
	feedbackToCanonRule,
	CANON_PATTERN_SUGGESTIONS,
} from './generators/index.js';

export {
	formatAsJson,
	writeJsonReport,
	formatAsMarkdown,
	writeMarkdownReport
} from './reporters/index.js';

export {
	loadConfig,
	saveToHistory,
	saveBaseline,
	loadBaseline,
	compareToBaseline,
	getRecentHistory,
	generateExampleConfig
} from './config.js';

export type {
	AuditResult,
	AuditConfig,
	DRYMetrics,
	RamsMetrics,
	HeideggerMetrics,
	Violation,
	Commendation,
	Severity,
	DuplicateBlock,
	DeadExport,
	UnusedDependency,
	PackageCompleteness,
	OrphanedFile,
	CircularDependency,
	// Architecture domain types
	FloorPlan,
	Room,
	Door,
	Wall,
	Point,
	ThresholdZone,
	AccessViolation,
	ZoneCoherenceResult,
	FlowAnalysis,
	ArchitectureHeideggerMetrics,
	ArchitectureAuditResult,
	// PR Feedback pattern types
	FeedbackEntry,
	FeedbackPattern,
	FeedbackCategory,
	FeedbackThresholds,
	FeedbackTrackerState,
	PatternAnalysisResult,
	AutomationSuggestion
} from './types/index.js';

// Rule generator types
export type {
	GeneratedRule,
	RuleGenerationResult,
} from './generators/index.js';

// Architecture domain helpers
export {
	createRoom,
	createDoor,
	createWall,
	ZONE_HIERARCHY,
	ZONE_ADJACENCY
} from './types/architecture.js';

export type { AuditHistory, ScoreDelta } from './config.js';

export { DEFAULT_CONFIG } from './types/index.js';
