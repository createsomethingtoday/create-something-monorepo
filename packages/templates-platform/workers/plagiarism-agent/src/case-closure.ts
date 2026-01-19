/**
 * Case Closure & Airtable Integration for Plagiarism Detection
 *
 * Handles finalizing cases and syncing results to Airtable.
 */

import type { Env, PlagiarismCase, FinalDecision } from './types';
import { capitalizeFirst } from './utils';

// =============================================================================
// CONSTANTS
// =============================================================================

export const DECISION_TO_AIRTABLE: Record<FinalDecision, string> = {
	'no_violation': 'No violation',
	'minor': 'Minor violation',
	'major': 'Major violation'
};

export const DECISION_TO_OUTCOME: Record<FinalDecision, string> = {
	'no_violation': '',
	'minor': 'Notified Creator(s)',
	'major': 'Delisted template'
};

export const AIRTABLE_FIELDS = {
	DECISION: 'Decision',
	OUTCOME: 'Outcome',
	EXTENT: '✏️ Extent of copied content',
	TRANSFORMATION: '✏️ Level of Transformation & Originality Added',
	IMPORTANCE: '✏️ Importance of overall work',
	IMPACT: '✏️ Marketplace Impact & Intent'
} as const;

// Confidence threshold for auto-action on major violations
export const MAJOR_VIOLATION_CONFIDENCE_THRESHOLD = 0.9;

// =============================================================================
// CASE CLOSURE
// =============================================================================

/**
 * Unified case closure function with confidence threshold for major violations.
 *
 * For major violations with confidence < 0.9, flags for human review instead
 * of auto-delisting. This prevents Enframing (automation replacing judgment).
 */
export async function closeCase(
	plagiarismCase: PlagiarismCase,
	decision: FinalDecision,
	result: any,
	env: Env
): Promise<void> {
	// Update database with final decision
	await env.DB.prepare(`
		UPDATE plagiarism_cases
		SET final_decision = ?, status = 'completed', completed_at = ?
		WHERE id = ?
	`).bind(decision, Date.now(), plagiarismCase.id).run();

	// Prepare Airtable fields
	const fields: Record<string, string> = {
		[AIRTABLE_FIELDS.DECISION]: DECISION_TO_AIRTABLE[decision]
	};

	// Check confidence threshold for major violations
	const confidence = result?.confidence ?? 1.0;
	const requiresHumanReview = decision === 'major' && confidence < MAJOR_VIOLATION_CONFIDENCE_THRESHOLD;

	if (requiresHumanReview) {
		// Flag for human review instead of auto-delisting
		fields[AIRTABLE_FIELDS.OUTCOME] = `Flagged for review (confidence: ${(confidence * 100).toFixed(0)}%)`;
		console.log(`[Case Closure] ${plagiarismCase.id}: Major violation flagged for human review (confidence: ${confidence})`);
	} else {
		// High confidence or non-major decision: auto-action
		const outcome = DECISION_TO_OUTCOME[decision];
		if (outcome) {
			fields[AIRTABLE_FIELDS.OUTCOME] = outcome;
		}
	}

	// Add editorial scores if available (Tier 2 results)
	if (result?.extent) {
		fields[AIRTABLE_FIELDS.EXTENT] = capitalizeFirst(result.extent);
	}
	if (result?.transformation) {
		fields[AIRTABLE_FIELDS.TRANSFORMATION] = capitalizeFirst(result.transformation);
	}
	if (result?.importance) {
		fields[AIRTABLE_FIELDS.IMPORTANCE] = capitalizeFirst(result.importance);
	}
	if (result?.impact) {
		fields[AIRTABLE_FIELDS.IMPACT] = capitalizeFirst(result.impact);
	}

	await updateAirtable(env, plagiarismCase.airtableRecordId, fields);

	console.log(`[Case Closure] ${plagiarismCase.id}: ${decision} (confidence: ${confidence})`);
}

// =============================================================================
// AIRTABLE API
// =============================================================================

/**
 * Update an Airtable record with the given fields.
 */
export async function updateAirtable(
	env: Env,
	recordId: string,
	fields: Record<string, string>
): Promise<boolean> {
	const response = await fetch(
		`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_ID}/${recordId}`,
		{
			method: 'PATCH',
			headers: {
				'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ fields })
		}
	);

	if (!response.ok) {
		console.error(`[Airtable] Update failed: ${await response.text()}`);
		return false;
	}

	return true;
}

/**
 * Get a record from Airtable.
 */
export async function getAirtableRecord(
	env: Env,
	recordId: string
): Promise<any | null> {
	const response = await fetch(
		`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_ID}/${recordId}`,
		{
			headers: {
				'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`
			}
		}
	);

	if (!response.ok) {
		console.error(`[Airtable] Get failed: ${await response.text()}`);
		return null;
	}

	return response.json();
}

/**
 * Create a new record in Airtable.
 */
export async function createAirtableRecord(
	env: Env,
	fields: Record<string, unknown>
): Promise<string | null> {
	const response = await fetch(
		`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_ID}`,
		{
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ fields })
		}
	);

	if (!response.ok) {
		console.error(`[Airtable] Create failed: ${await response.text()}`);
		return null;
	}

	const result = await response.json() as { id: string };
	return result.id;
}
