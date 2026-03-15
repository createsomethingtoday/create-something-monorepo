/**
 * TEND SDK: Automation Builder
 *
 * defineAutomation() — the core primitive for data transforms.
 * Code-first, version controlled, testable.
 */

import type { AutomationDefinition, SourceType } from './types.js';

/**
 * Define an automation.
 *
 * @example
 * ```typescript
 * export default defineAutomation({
 *   name: 'gmail-inbox-sync',
 *   source: 'gmail',
 *
 *   transform: (email) => ({
 *     title: email.subject,
 *     body: email.body,
 *     sourceType: 'gmail',
 *     sourceItemId: email.id,
 *     sourceTimestamp: new Date(email.internalDate),
 *     metadata: {
 *       from: email.from,
 *       labels: email.labelIds,
 *     },
 *     score: 0.5,
 *     scoreBreakdown: {},
 *   }),
 *
 *   score: (item, context) => {
 *     let score = 0.5;
 *     if (context.vipSenders.includes(item.metadata.from as string)) {
 *       score += 0.3;
 *     }
 *     return score;
 *   },
 *
 *   notify: (item) => item.score > 0.8,
 * });
 * ```
 */
export function defineAutomation<T = unknown>(
	definition: AutomationDefinition<T>
): AutomationDefinition<T> {
	// Validate required fields
	if (!definition.name) {
		throw new Error('Automation name is required');
	}
	if (!definition.source) {
		throw new Error('Automation source is required');
	}

	// Normalize source to array
	const sources: SourceType[] = Array.isArray(definition.source)
		? definition.source
		: [definition.source];

	return {
		...definition,
		source: sources.length === 1 ? sources[0] : sources,
	};
}

/**
 * Run an automation's score function against an item.
 * Returns the computed score and breakdown.
 */
export function computeScore<T = unknown>(
	automation: AutomationDefinition<T>,
	item: Parameters<NonNullable<AutomationDefinition<T>['score']>>[0],
	context: Parameters<NonNullable<AutomationDefinition<T>['score']>>[1]
): { score: number; breakdown: Record<string, number> } {
	if (!automation.score) {
		return { score: 0.5, breakdown: {} };
	}

	const score = automation.score(item, context);

	// Clamp to valid range
	const clampedScore = Math.max(0, Math.min(1, score));

	return {
		score: clampedScore,
		breakdown: {}, // TODO: Track individual score components
	};
}

/**
 * Run an automation's filter function against an item.
 */
export function shouldInclude<T = unknown>(
	automation: AutomationDefinition<T>,
	item: Parameters<NonNullable<AutomationDefinition<T>['filter']>>[0],
	context: Parameters<NonNullable<AutomationDefinition<T>['filter']>>[1]
): boolean {
	if (!automation.filter) {
		return true; // Include by default
	}
	return automation.filter(item, context);
}

/**
 * Run an automation's notify function against an item.
 */
export function shouldNotify<T = unknown>(
	automation: AutomationDefinition<T>,
	item: Parameters<NonNullable<AutomationDefinition<T>['notify']>>[0],
	context: Parameters<NonNullable<AutomationDefinition<T>['notify']>>[1]
): boolean {
	if (!automation.notify) {
		return false; // Don't notify by default
	}
	return automation.notify(item, context);
}
