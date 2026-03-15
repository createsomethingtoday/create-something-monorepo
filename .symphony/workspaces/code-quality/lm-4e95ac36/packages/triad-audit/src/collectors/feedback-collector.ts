/**
 * PR Feedback Pattern Collector
 *
 * Tracks repeated feedback patterns in PR comments to identify
 * opportunities for automated lint rules.
 *
 * Philosophy: "If you say it twice, automate it."
 * - Boris Cherny
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
	FeedbackEntry,
	FeedbackPattern,
	FeedbackCategory,
	FeedbackThresholds,
	FeedbackTrackerState,
	PatternAnalysisResult
} from '../types/feedback.js';
import {
	DEFAULT_FEEDBACK_THRESHOLDS,
	KNOWN_FEEDBACK_PATTERNS
} from '../types/feedback.js';

// =============================================================================
// FEEDBACK COLLECTOR
// =============================================================================

export class FeedbackCollector {
	private state: FeedbackTrackerState;
	private storagePath: string;

	constructor(
		storagePath: string = '.triad-audit/feedback.json',
		thresholds: Partial<FeedbackThresholds> = {}
	) {
		this.storagePath = storagePath;
		this.state = this.loadState(thresholds);
	}

	// ===========================================================================
	// STATE MANAGEMENT
	// ===========================================================================

	private loadState(thresholds: Partial<FeedbackThresholds>): FeedbackTrackerState {
		try {
			if (fs.existsSync(this.storagePath)) {
				const data = fs.readFileSync(this.storagePath, 'utf-8');
				const saved = JSON.parse(data) as FeedbackTrackerState;
				return {
					...saved,
					thresholds: { ...DEFAULT_FEEDBACK_THRESHOLDS, ...thresholds }
				};
			}
		} catch {
			// Fall through to default
		}

		return {
			entries: [],
			patterns: [],
			lastAnalysis: new Date().toISOString(),
			thresholds: { ...DEFAULT_FEEDBACK_THRESHOLDS, ...thresholds }
		};
	}

	public save(): void {
		const dir = path.dirname(this.storagePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(this.storagePath, JSON.stringify(this.state, null, 2));
	}

	// ===========================================================================
	// FEEDBACK ENTRY MANAGEMENT
	// ===========================================================================

	/**
	 * Add a new feedback entry
	 */
	public addFeedback(entry: Omit<FeedbackEntry, 'id' | 'timestamp' | 'automated'>): FeedbackEntry {
		const fullEntry: FeedbackEntry = {
			...entry,
			id: this.generateId(),
			timestamp: new Date().toISOString(),
			automated: false
		};

		// Auto-detect pattern from known patterns
		if (!fullEntry.pattern) {
			const detected = this.detectKnownPattern(fullEntry.comment);
			if (detected) {
				fullEntry.pattern = detected.name;
				fullEntry.category = detected.category;
			}
		}

		this.state.entries.push(fullEntry);
		return fullEntry;
	}

	/**
	 * Bulk import feedback entries (e.g., from GitHub API)
	 */
	public importFeedback(
		entries: Array<Omit<FeedbackEntry, 'id' | 'timestamp' | 'automated'>>
	): number {
		let added = 0;
		for (const entry of entries) {
			// Dedupe by PR + comment similarity
			const isDupe = this.state.entries.some(
				(e) =>
					e.prId === entry.prId &&
					this.calculateSimilarity(e.comment, entry.comment) > 0.9
			);

			if (!isDupe) {
				this.addFeedback(entry);
				added++;
			}
		}
		return added;
	}

	// ===========================================================================
	// PATTERN DETECTION
	// ===========================================================================

	/**
	 * Analyze all feedback entries and detect patterns
	 */
	public analyze(): PatternAnalysisResult {
		const result: PatternAnalysisResult = {
			newPatterns: [],
			readyForAutomation: [],
			updatedPatterns: [],
			stats: {
				totalEntries: this.state.entries.length,
				totalPatterns: 0,
				automatedCount: 0,
				pendingAutomation: 0,
				categoryCounts: {} as Record<FeedbackCategory, number>
			}
		};

		// Group entries by detected pattern
		const patternGroups = new Map<string, FeedbackEntry[]>();

		for (const entry of this.state.entries) {
			const patternKey = entry.pattern || this.inferPatternKey(entry.comment);
			const group = patternGroups.get(patternKey) || [];
			group.push(entry);
			patternGroups.set(patternKey, group);
		}

		// Convert groups to patterns
		for (const [patternKey, entries] of patternGroups) {
			if (entries.length < this.state.thresholds.minOccurrences) {
				continue; // Not enough occurrences yet
			}

			const existing = this.state.patterns.find((p) => p.id === patternKey);
			const pattern = this.createOrUpdatePattern(patternKey, entries, existing);

			if (existing) {
				if (pattern.occurrences > existing.occurrences) {
					result.updatedPatterns.push(pattern);
				}
			} else {
				result.newPatterns.push(pattern);
				this.state.patterns.push(pattern);
			}

			// Check if ready for automation
			if (
				!pattern.automated &&
				pattern.occurrences >= this.state.thresholds.minOccurrences
			) {
				result.readyForAutomation.push(pattern);
			}
		}

		// Calculate stats
		result.stats.totalPatterns = this.state.patterns.length;
		result.stats.automatedCount = this.state.patterns.filter((p) => p.automated).length;
		result.stats.pendingAutomation = result.readyForAutomation.length;

		// Category counts
		for (const entry of this.state.entries) {
			const cat = entry.category;
			result.stats.categoryCounts[cat] = (result.stats.categoryCounts[cat] || 0) + 1;
		}

		this.state.lastAnalysis = new Date().toISOString();
		return result;
	}

	/**
	 * Detect if comment matches a known pattern
	 */
	private detectKnownPattern(
		comment: string
	): { name: string; category: FeedbackCategory } | null {
		for (const known of KNOWN_FEEDBACK_PATTERNS) {
			if (known.pattern.test(comment)) {
				return { name: known.name, category: known.category };
			}
		}
		return null;
	}

	/**
	 * Infer a pattern key from comment text
	 */
	private inferPatternKey(comment: string): string {
		// Normalize: lowercase, remove punctuation, collapse whitespace
		const normalized = comment
			.toLowerCase()
			.replace(/[^\w\s]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();

		// Extract key phrases (first 5 significant words)
		const words = normalized.split(' ').filter((w) => w.length > 2);
		const key = words.slice(0, 5).join('-');

		return key || 'uncategorized';
	}

	/**
	 * Create or update a pattern from grouped entries
	 */
	private createOrUpdatePattern(
		id: string,
		entries: FeedbackEntry[],
		existing?: FeedbackPattern
	): FeedbackPattern {
		const sorted = entries.sort(
			(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		);

		// Find known pattern for automation suggestion
		const knownMatch = KNOWN_FEEDBACK_PATTERNS.find(
			(k) => k.name === id || entries.some((e) => k.pattern.test(e.comment))
		);

		const pattern: FeedbackPattern = {
			id,
			name: existing?.name || this.humanizeName(id),
			description:
				existing?.description ||
				`Feedback pattern detected from ${entries.length} occurrences`,
			category: entries[0]?.category || 'other',
			occurrences: entries.length,
			feedbackIds: entries.map((e) => e.id),
			examples: this.selectExamples(entries, 3),
			firstSeen: sorted[0]?.timestamp || new Date().toISOString(),
			lastSeen: sorted[sorted.length - 1]?.timestamp || new Date().toISOString(),
			automated: existing?.automated || false,
			automationRef: existing?.automationRef,
			automationSuggestion: knownMatch?.automationSuggestion || existing?.automationSuggestion
		};

		// Update existing pattern in state
		if (existing) {
			const idx = this.state.patterns.findIndex((p) => p.id === id);
			if (idx >= 0) {
				this.state.patterns[idx] = pattern;
			}
		}

		return pattern;
	}

	/**
	 * Select diverse example comments for a pattern
	 */
	private selectExamples(entries: FeedbackEntry[], count: number): string[] {
		if (entries.length <= count) {
			return entries.map((e) => e.comment);
		}

		// Select spread across time range
		const result: string[] = [];
		const step = Math.floor(entries.length / count);

		for (let i = 0; i < count; i++) {
			const idx = Math.min(i * step, entries.length - 1);
			result.push(entries[idx].comment);
		}

		return result;
	}

	/**
	 * Convert pattern key to human-readable name
	 */
	private humanizeName(key: string): string {
		return key
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// ===========================================================================
	// SIMILARITY CALCULATION
	// ===========================================================================

	/**
	 * Calculate Jaccard similarity between two strings
	 */
	private calculateSimilarity(a: string, b: string): number {
		const wordsA = new Set(a.toLowerCase().split(/\s+/));
		const wordsB = new Set(b.toLowerCase().split(/\s+/));

		const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
		const union = new Set([...wordsA, ...wordsB]);

		return intersection.size / union.size;
	}

	// ===========================================================================
	// UTILITY
	// ===========================================================================

	private generateId(): string {
		return `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
	}

	// ===========================================================================
	// QUERIES
	// ===========================================================================

	/**
	 * Get patterns ready for automation
	 */
	public getPatternsReadyForAutomation(): FeedbackPattern[] {
		return this.state.patterns.filter(
			(p) => !p.automated && p.occurrences >= this.state.thresholds.minOccurrences
		);
	}

	/**
	 * Get patterns by category
	 */
	public getPatternsByCategory(category: FeedbackCategory): FeedbackPattern[] {
		return this.state.patterns.filter((p) => p.category === category);
	}

	/**
	 * Get recent feedback entries
	 */
	public getRecentFeedback(days: number = 30): FeedbackEntry[] {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - days);

		return this.state.entries.filter(
			(e) => new Date(e.timestamp) > cutoff
		);
	}

	/**
	 * Mark a pattern as automated
	 */
	public markAutomated(patternId: string, automationRef: string): boolean {
		const pattern = this.state.patterns.find((p) => p.id === patternId);
		if (!pattern) return false;

		pattern.automated = true;
		pattern.automationRef = automationRef;

		// Also mark related entries
		for (const entry of this.state.entries) {
			if (pattern.feedbackIds.includes(entry.id)) {
				entry.automated = true;
			}
		}

		return true;
	}

	/**
	 * Get full state (for reporting)
	 */
	public getState(): FeedbackTrackerState {
		return { ...this.state };
	}

	/**
	 * Get statistics summary
	 */
	public getStats(): PatternAnalysisResult['stats'] {
		const categoryCounts: Record<string, number> = {};
		for (const entry of this.state.entries) {
			categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
		}

		return {
			totalEntries: this.state.entries.length,
			totalPatterns: this.state.patterns.length,
			automatedCount: this.state.patterns.filter((p) => p.automated).length,
			pendingAutomation: this.getPatternsReadyForAutomation().length,
			categoryCounts: categoryCounts as Record<FeedbackCategory, number>
		};
	}
}

// =============================================================================
// EXPORTS
// =============================================================================

export { DEFAULT_FEEDBACK_THRESHOLDS, KNOWN_FEEDBACK_PATTERNS };
