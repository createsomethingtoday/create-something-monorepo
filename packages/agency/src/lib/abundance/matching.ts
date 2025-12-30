/**
 * Abundance Network: Matching Algorithm
 *
 * Subtractive approach: Simple tag-based matching with weighted scoring.
 * Complex archetype matrices and AI re-ranking earned through iteration.
 *
 * Fit Score = (Skills Match × 0.4) + (Budget Match × 0.3) + (Availability × 0.3)
 */

import type { Talent, MatchRequest, MatchResult, FitBreakdown } from '../types/abundance';

/**
 * Calculate fit score between a job request and a talent
 */
export function calculateFitScore(request: MatchRequest, talent: Talent): MatchResult {
	const skillsScore = calculateSkillsMatch(request.required_skills || [], talent.skills);
	const budgetScore = calculateBudgetMatch(request.budget, talent.hourly_rate_min, talent.hourly_rate_max);
	const availabilityScore = calculateAvailabilityScore(talent.availability);

	// Weighted combination
	const fitScore = Math.round(
		skillsScore * 0.4 +
		budgetScore * 0.3 +
		availabilityScore * 0.3
	);

	const fitBreakdown: FitBreakdown = {
		skills: Math.round(skillsScore),
		budget: Math.round(budgetScore),
		availability: Math.round(availabilityScore)
	};

	return {
		talent,
		fit_score: fitScore,
		fit_breakdown: fitBreakdown
	};
}

/**
 * Calculate skills match (0-100)
 * Simple overlap scoring with bonus for exact matches
 */
function calculateSkillsMatch(requiredSkills: string[], talentSkills: string[]): number {
	if (requiredSkills.length === 0) {
		// No specific skills required, base score on talent having skills
		return talentSkills.length > 0 ? 70 : 50;
	}

	const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
	const normalizedTalent = talentSkills.map(s => s.toLowerCase().trim());

	let matchCount = 0;
	for (const skill of normalizedRequired) {
		if (normalizedTalent.some(t => t.includes(skill) || skill.includes(t))) {
			matchCount++;
		}
	}

	const matchRatio = matchCount / normalizedRequired.length;

	// Scale: 0 matches = 20, all matches = 100
	return 20 + (matchRatio * 80);
}

/**
 * Calculate budget match (0-100)
 * Perfect match = 100, within range = 80, outside = scaled down
 */
function calculateBudgetMatch(
	budget: number | undefined,
	talentMin: number | undefined,
	talentMax: number | undefined
): number {
	// No budget specified = neutral score
	if (!budget) return 70;

	// Talent has no rates = neutral score
	if (!talentMin && !talentMax) return 70;

	const min = talentMin || 0;
	const max = talentMax || min * 2 || budget * 2;

	// Perfect fit: budget is within talent's range
	if (budget >= min && budget <= max) {
		return 100;
	}

	// Budget too low
	if (budget < min) {
		const ratio = budget / min;
		return Math.max(20, ratio * 80);
	}

	// Budget higher than max (talent might stretch)
	if (budget > max) {
		const ratio = max / budget;
		return Math.max(60, ratio * 100); // Higher budget is less penalized
	}

	return 70;
}

/**
 * Calculate availability score (0-100)
 */
function calculateAvailabilityScore(availability: string): number {
	switch (availability) {
		case 'available':
			return 100;
		case 'busy':
			return 50;
		case 'unavailable':
			return 10;
		default:
			return 50;
	}
}

/**
 * Find and rank matches for a job request
 */
export function findMatches(
	request: MatchRequest,
	talents: Talent[],
	limit: number = 5
): MatchResult[] {
	// Filter to only active, available talent
	const eligibleTalent = talents.filter(t =>
		t.status === 'active' &&
		t.availability !== 'unavailable'
	);

	// Score each talent
	const scored = eligibleTalent.map(talent => calculateFitScore(request, talent));

	// Sort by fit score descending
	scored.sort((a, b) => b.fit_score - a.fit_score);

	// Return top matches
	return scored.slice(0, limit);
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Safely parse JSON from D1 database fields
 * Returns defaultValue if parsing fails, logs error for debugging
 */
export function safeJsonParse<T>(
	value: unknown,
	defaultValue: T,
	fieldName?: string
): T {
	if (value === null || value === undefined) {
		return defaultValue;
	}

	try {
		const stringValue = typeof value === 'string' ? value : String(value);
		return JSON.parse(stringValue) as T;
	} catch (err) {
		console.error('JSON parse error:', {
			field: fieldName || 'unknown',
			error: err instanceof Error ? err.message : String(err),
			valuePreview: String(value).substring(0, 100)
		});
		return defaultValue;
	}
}
