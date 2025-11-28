/**
 * Configuration Management
 *
 * Supports .triad-audit.json config files and baseline tracking.
 */

import fs from 'fs';
import path from 'path';
import type { AuditConfig, AuditResult } from './types/index.js';

const CONFIG_FILENAME = '.triad-audit.json';
const HISTORY_DIR = '.triad-audit';
const HISTORY_FILENAME = 'history.json';
const BASELINE_FILENAME = 'baseline.json';

export interface AuditHistory {
	timestamp: string;
	commit?: string;
	scores: {
		dry: number;
		rams: number;
		heidegger: number;
		overall: number;
	};
	violations: {
		total: number;
		critical: number;
		high: number;
		medium: number;
		low: number;
	};
}

export interface ScoreDelta {
	dry: number;
	rams: number;
	heidegger: number;
	overall: number;
	improved: boolean;
	degraded: boolean;
}

/**
 * Load config from .triad-audit.json if it exists
 */
export function loadConfig(rootPath: string): Partial<AuditConfig> | null {
	const configPath = path.join(rootPath, CONFIG_FILENAME);

	if (!fs.existsSync(configPath)) {
		return null;
	}

	try {
		const content = fs.readFileSync(configPath, 'utf-8');
		return JSON.parse(content);
	} catch {
		console.warn(`Warning: Could not parse ${CONFIG_FILENAME}`);
		return null;
	}
}

/**
 * Save audit result to history
 */
export function saveToHistory(rootPath: string, result: AuditResult): void {
	const historyDir = path.join(rootPath, HISTORY_DIR);
	const historyPath = path.join(historyDir, HISTORY_FILENAME);

	// Ensure directory exists
	if (!fs.existsSync(historyDir)) {
		fs.mkdirSync(historyDir, { recursive: true });
	}

	// Load existing history
	let history: AuditHistory[] = [];
	if (fs.existsSync(historyPath)) {
		try {
			history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
		} catch {
			history = [];
		}
	}

	// Get git commit if available
	let commit: string | undefined;
	try {
		const { execSync } = require('child_process');
		commit = execSync('git rev-parse --short HEAD', {
			cwd: rootPath,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe']
		}).trim();
	} catch {
		// Not a git repo or git not available
	}

	// Add new entry
	const entry: AuditHistory = {
		timestamp: result.timestamp,
		commit,
		scores: result.scores,
		violations: {
			total: result.summary.totalViolations,
			critical: result.summary.criticalCount,
			high: result.summary.highCount,
			medium: result.summary.mediumCount,
			low: result.summary.lowCount
		}
	};

	history.push(entry);

	// Keep last 100 entries
	if (history.length > 100) {
		history = history.slice(-100);
	}

	fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
}

/**
 * Save current result as baseline
 */
export function saveBaseline(rootPath: string, result: AuditResult): void {
	const historyDir = path.join(rootPath, HISTORY_DIR);
	const baselinePath = path.join(historyDir, BASELINE_FILENAME);

	if (!fs.existsSync(historyDir)) {
		fs.mkdirSync(historyDir, { recursive: true });
	}

	const baseline: AuditHistory = {
		timestamp: result.timestamp,
		scores: result.scores,
		violations: {
			total: result.summary.totalViolations,
			critical: result.summary.criticalCount,
			high: result.summary.highCount,
			medium: result.summary.mediumCount,
			low: result.summary.lowCount
		}
	};

	fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2), 'utf-8');
}

/**
 * Load baseline for comparison
 */
export function loadBaseline(rootPath: string): AuditHistory | null {
	const baselinePath = path.join(rootPath, HISTORY_DIR, BASELINE_FILENAME);

	if (!fs.existsSync(baselinePath)) {
		return null;
	}

	try {
		return JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
	} catch {
		return null;
	}
}

/**
 * Compare current result to baseline
 */
export function compareToBaseline(result: AuditResult, baseline: AuditHistory): ScoreDelta {
	const delta: ScoreDelta = {
		dry: Math.round((result.scores.dry - baseline.scores.dry) * 10) / 10,
		rams: Math.round((result.scores.rams - baseline.scores.rams) * 10) / 10,
		heidegger: Math.round((result.scores.heidegger - baseline.scores.heidegger) * 10) / 10,
		overall: Math.round((result.scores.overall - baseline.scores.overall) * 10) / 10,
		improved: false,
		degraded: false
	};

	delta.improved = delta.overall > 0;
	delta.degraded = delta.overall < -0.5; // Allow small fluctuations

	return delta;
}

/**
 * Get recent history for trend display
 */
export function getRecentHistory(rootPath: string, limit: number = 10): AuditHistory[] {
	const historyPath = path.join(rootPath, HISTORY_DIR, HISTORY_FILENAME);

	if (!fs.existsSync(historyPath)) {
		return [];
	}

	try {
		const history: AuditHistory[] = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
		return history.slice(-limit);
	} catch {
		return [];
	}
}

/**
 * Generate example config file
 */
export function generateExampleConfig(): string {
	const config = {
		$schema: 'https://createsomething.io/schemas/triad-audit.json',
		ignore: [
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/.git/**',
			'**/*.min.js'
		],
		focus: ['src/**', 'packages/**'],
		thresholds: {
			dry: { min: 6, warn: 7 },
			rams: { min: 6, warn: 7 },
			heidegger: { min: 5, warn: 6 }
		},
		sdkPaths: ['packages/sdk/src'],
		skipPatterns: {
			deadExports: ['packages/sdk/**'],
			orphanedFiles: ['examples/**', '**/*.config.*'],
			largeFiles: ['**/*.d.ts', '**/generated/**']
		}
	};

	return JSON.stringify(config, null, 2);
}
