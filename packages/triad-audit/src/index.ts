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
	collectHeideggerMetrics
} from './collectors/index.js';

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
	CircularDependency
} from './types/index.js';

export type { AuditHistory, ScoreDelta } from './config.js';

export { DEFAULT_CONFIG } from './types/index.js';
