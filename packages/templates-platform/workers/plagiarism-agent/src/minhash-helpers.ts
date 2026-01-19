/**
 * MinHash Helper Functions for Plagiarism Detection
 * 
 * Interpretation and analysis utilities for MinHash similarity results.
 */

import { fetchPublishedContent } from './vector-similarity';

// =============================================================================
// Content Fetching
// =============================================================================

/**
 * Fetch HTML, CSS, and JS content from a template URL
 */
export async function fetchTemplateContent(templateUrl: string): Promise<{
	html: string;
	css: string;
	js: string;
}> {
	const content = await fetchPublishedContent(templateUrl);
	
	if (!content) {
		return { html: '', css: '', js: '' };
	}
	
	return {
		html: content.html || '',
		css: content.css || '',
		js: content.javascript || ''
	};
}

// =============================================================================
// Similarity Interpretation
// =============================================================================

export interface SimilarityVerdict {
	verdict: 'high_similarity' | 'moderate_similarity' | 'low_similarity' | 'distinct';
	description: string;
	recommendation: string;
}

/**
 * Interpret MinHash Jaccard similarity as a plagiarism verdict
 * 
 * Unlike embedding cosine similarity (which has a ~95% baseline for Webflow),
 * Jaccard similarity has a much lower baseline because it measures actual
 * set intersection of shingles.
 */
export function interpretMinHashSimilarity(jaccard: number): SimilarityVerdict {
	if (jaccard >= 0.7) {
		return {
			verdict: 'high_similarity',
			description: `${(jaccard * 100).toFixed(1)}% Jaccard similarity indicates very similar structure`,
			recommendation: 'Strong evidence of copying - recommend MAJOR violation'
		};
	} else if (jaccard >= 0.4) {
		return {
			verdict: 'moderate_similarity',
			description: `${(jaccard * 100).toFixed(1)}% Jaccard similarity indicates significant overlap`,
			recommendation: 'Possible partial copying - recommend manual review'
		};
	} else if (jaccard >= 0.2) {
		return {
			verdict: 'low_similarity',
			description: `${(jaccard * 100).toFixed(1)}% Jaccard similarity indicates some common patterns`,
			recommendation: 'Likely coincidental similarity - recommend MINOR or NO violation'
		};
	} else {
		return {
			verdict: 'distinct',
			description: `${(jaccard * 100).toFixed(1)}% Jaccard similarity indicates distinct templates`,
			recommendation: 'No significant similarity - recommend NO violation'
		};
	}
}

export interface PatternMatches {
	colors: number;
	gradients: number;
	animations: number;
	customProperties: number;
	keyframes: number;
}

export interface CombinedSimilarityResult extends SimilarityVerdict {
	signals: Array<{ name: string; value: string; weight: string }>;
}

/**
 * Combined interpretation using multiple signals
 * 
 * This catches plagiarism even when:
 * - Class names are changed (uses property comparison)
 * - Properties are reordered (uses fingerprints)
 * - Colors/gradients/animations are copied (uses pattern matching)
 */
export function interpretCombinedSimilarity(
	classJaccard: number,
	declarationJaccard: number,
	patternMatches: PatternMatches
): CombinedSimilarityResult {
	// Calculate pattern match score
	const patternScore = (
		(patternMatches.gradients > 0 ? 0.3 : 0) +      // Gradients are highly specific
		(patternMatches.animations > 0 ? 0.2 : 0) +     // Animations are template-specific
		(patternMatches.keyframes > 0 ? 0.2 : 0) +      // Keyframes are template-specific
		(patternMatches.customProperties > 2 ? 0.2 : 0) + // Multiple CSS vars = same design system
		(patternMatches.colors > 5 ? 0.1 : 0)           // Many shared colors
	);
	
	// Weighted combination of signals
	const combinedScore = (
		classJaccard * 0.3 +           // Class names (can be renamed)
		declarationJaccard * 0.4 +     // Property blocks (hard to change)
		patternScore * 0.3             // Specific patterns (very hard to change)
	);
	
	const signals = [
		{ name: 'Class names', value: `${(classJaccard * 100).toFixed(1)}%`, weight: '30%' },
		{ name: 'Property blocks', value: `${(declarationJaccard * 100).toFixed(1)}%`, weight: '40%' },
		{ name: 'Pattern matches', value: `${(patternScore * 100).toFixed(0)}%`, weight: '30%' }
	];
	
	if (combinedScore >= 0.5 || declarationJaccard >= 0.4) {
		return {
			verdict: 'high_similarity',
			description: `Combined score ${(combinedScore * 100).toFixed(1)}% indicates significant structural copying`,
			recommendation: 'Strong evidence of copying - recommend MAJOR violation',
			signals
		};
	} else if (combinedScore >= 0.25 || declarationJaccard >= 0.2) {
		return {
			verdict: 'moderate_similarity',
			description: `Combined score ${(combinedScore * 100).toFixed(1)}% indicates partial copying or shared patterns`,
			recommendation: 'Possible copying - recommend manual review',
			signals
		};
	} else if (combinedScore >= 0.1 || patternScore > 0.3) {
		return {
			verdict: 'low_similarity',
			description: `Combined score ${(combinedScore * 100).toFixed(1)}% indicates some shared elements`,
			recommendation: 'Minor overlap - likely coincidental or common patterns',
			signals
		};
	} else {
		return {
			verdict: 'distinct',
			description: `Combined score ${(combinedScore * 100).toFixed(1)}% indicates distinct templates`,
			recommendation: 'No significant similarity - recommend NO violation',
			signals
		};
	}
}
