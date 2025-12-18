/**
 * Subtractive Triad Audit Types
 *
 * The triad operates at three levels:
 * - DRY (Implementation): "Have I built this before?" → Unify
 * - Rams (Artifact): "Does this earn its existence?" → Remove
 * - Heidegger (System): "Does this serve the whole?" → Reconnect
 */

// Import and re-export base types (shared primitives)
import type { Severity, Violation, Commendation } from './base.js';
export type { Severity, Violation, Commendation } from './base.js';

// DRY Level: "Have I built this before?"
export interface DuplicateBlock {
	files: string[];
	lines: number;
	fragment: string;
}

export interface SimilarFile {
	fileA: string;
	fileB: string;
	similarity: number;
}

export interface DRYMetrics {
	duplicateBlocks: DuplicateBlock[];
	similarFiles: SimilarFile[];
	duplicateConstants: { name: string; locations: string[] }[];
	score: number;
	violations: Violation[];
}

// Rams Level: "Does this earn its existence?"
export interface DeadExport {
	file: string;
	export: string;
}

export interface UnusedDependency {
	name: string;
	type: 'dependency' | 'devDependency';
}

export interface LargeFile {
	file: string;
	lines: number;
	suggestion: string;
}

export interface RamsMetrics {
	deadExports: DeadExport[];
	unusedDependencies: UnusedDependency[];
	largeFiles: LargeFile[];
	emptyFiles: string[];
	score: number;
	violations: Violation[];
}

// Heidegger Level: "Does this serve the whole?"
export interface PackageCompleteness {
	package: string;
	hasSrc: boolean;
	hasTests: boolean;
	hasReadme: boolean;
	hasPackageJson: boolean;
	completeness: number;
}

export interface OrphanedFile {
	file: string;
	reason: string;
}

export interface CircularDependency {
	cycle: string[];
}

export interface HeideggerMetrics {
	packageCompleteness: PackageCompleteness[];
	orphanedFiles: OrphanedFile[];
	circularDependencies: CircularDependency[];
	missingDocumentation: string[];
	score: number;
	violations: Violation[];
}

// Combined Audit Result
export interface AuditResult {
	timestamp: string;
	project: string;
	path: string;
	scores: {
		dry: number;
		rams: number;
		heidegger: number;
		overall: number;
	};
	dry: DRYMetrics;
	rams: RamsMetrics;
	heidegger: HeideggerMetrics;
	commendations: Commendation[];
	summary: {
		totalViolations: number;
		criticalCount: number;
		highCount: number;
		mediumCount: number;
		lowCount: number;
	};
}

// Configuration
export interface AuditConfig {
	path: string;
	ignore: string[];
	focus: string[];
	thresholds: {
		dry: { min: number; warn: number };
		rams: { min: number; warn: number };
		heidegger: { min: number; warn: number };
	};
	output: 'json' | 'markdown' | 'both';
}

export const DEFAULT_CONFIG: AuditConfig = {
	path: '.',
	ignore: [
		'**/node_modules/**',
		'**/dist/**',
		'**/build/**',
		'**/.git/**',
		'**/*.min.js',
		'**/*.map',
		'**/.svelte-kit/**',
		'**/coverage/**'
	],
	focus: ['src/**', 'packages/**', 'lib/**'],
	thresholds: {
		dry: { min: 6, warn: 7 },
		rams: { min: 6, warn: 7 },
		heidegger: { min: 5, warn: 6 }
	},
	output: 'both'
};

// =============================================================================
// ARCHITECTURE DOMAIN
// =============================================================================

export * from './architecture.js';

// =============================================================================
// PR FEEDBACK PATTERNS
// =============================================================================

export * from './feedback.js';
