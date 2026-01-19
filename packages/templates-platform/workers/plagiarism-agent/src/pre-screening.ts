/**
 * MinHash Pre-Screening for Plagiarism Detection
 * 
 * Fast initial screening using MinHash signatures before
 * escalating to more expensive AI-based analysis.
 */

import type { Env, PlagiarismCase, MinHashPreScreenResult } from './types';
import { storeEvidence } from './evidence';
import { fetchPublishedContent } from './vector-similarity';
import {
	computeCssMinHash,
	computeHtmlMinHash,
	computeCombinedMinHash,
	estimateSimilarity,
	extractCustomClasses,
	compareProperties,
	computeLSHBandHashes,
	deserializeSignatureCompact
} from './minhash';

/**
 * Run MinHash pre-screening for a plagiarism case.
 * 
 * This is a fast initial check that compares CSS signatures,
 * class names, and property patterns before expensive AI analysis.
 */
export async function runMinHashPreScreening(
	plagiarismCase: PlagiarismCase,
	env: Env
): Promise<MinHashPreScreenResult | null> {
	try {
		console.log(`[MinHash] Pre-screening: ${plagiarismCase.originalUrl} vs ${plagiarismCase.allegedCopyUrl}`);

		// Fetch content from both URLs
		const [content1, content2] = await Promise.all([
			fetchPublishedContent(plagiarismCase.originalUrl),
			fetchPublishedContent(plagiarismCase.allegedCopyUrl)
		]);

		if (!content1 || !content2) {
			console.log('[MinHash] Could not fetch content from one or both URLs');
			return null;
		}

		// Compute MinHash signatures
		const cssMinHash1 = computeCssMinHash(content1.css);
		const cssMinHash2 = computeCssMinHash(content2.css);
		const cssSimilarity = estimateSimilarity(cssMinHash1, cssMinHash2);

		// Compare custom classes
		const classes1 = extractCustomClasses(content1.css);
		const classes2 = extractCustomClasses(content2.css);
		const sharedClasses = classes1.filter(c => classes2.includes(c));
		const classOverlap = sharedClasses.length / Math.max(classes1.length, classes2.length, 1);

		// Compare CSS properties
		const propertyComparison = compareProperties(content1.css, content2.css);
		const propertySimilarity = propertyComparison.declarationSimilarity;

		// Check if alleged copy exists in index and find similar templates
		let similarCount = 0;
		let topMatches: Array<{ id: string; name: string; similarity: number }> = [];

		try {
			// Search for templates similar to the alleged copy
			const combinedMinHash = computeCombinedMinHash(content2.html, content2.css, content2.javascript);

			// Query the LSH index for similar templates
			const lshBands = computeLSHBandHashes(combinedMinHash);
			const bandConditions = lshBands.map((_, i) => `(band_id = 'band_${i}' AND hash_value = ?)`).join(' OR ');

			const candidateRows = await env.DB.prepare(`
				SELECT DISTINCT template_id FROM minhash_lsh_bands 
				WHERE ${bandConditions}
			`).bind(...lshBands).all();

			if (candidateRows.results && candidateRows.results.length > 0) {
				const candidateIds = candidateRows.results.map((r: any) => r.template_id);

				// Get signatures for candidates
				const placeholders = candidateIds.map(() => '?').join(',');
				const signatureRows = await env.DB.prepare(`
					SELECT id, name, combined_signature FROM template_minhash 
					WHERE id IN (${placeholders})
				`).bind(...candidateIds).all();

				if (signatureRows.results) {
					const matches = signatureRows.results
						.map((row: any) => {
							const sig = deserializeSignatureCompact(row.combined_signature);
							const similarity = estimateSimilarity(combinedMinHash, sig);
							return { id: row.id, name: row.name, similarity };
						})
						.filter(m => m.similarity > 0.3)
						.sort((a, b) => b.similarity - a.similarity);

					similarCount = matches.length;
					topMatches = matches.slice(0, 5);
				}
			}
		} catch (error) {
			console.log('[MinHash] Error querying index (non-fatal):', error);
		}

		// Determine verdict based on MinHash signals
		const verdict = determineVerdict(cssSimilarity, classOverlap, propertySimilarity);

		const result: MinHashPreScreenResult = {
			cssSimilarity,
			classOverlap,
			propertySimilarity,
			similarCount,
			verdict,
			topMatches
		};

		// Store as evidence
		await storeEvidence(env, plagiarismCase.id, 'minhash_prescreen', result);

		console.log(`[MinHash] Pre-screen: CSS=${(cssSimilarity * 100).toFixed(1)}%, Classes=${(classOverlap * 100).toFixed(1)}%, Verdict=${verdict}`);

		return result;
	} catch (error) {
		console.log('[MinHash] Pre-screening failed (non-fatal):', error);
		return null;
	}
}

/**
 * Determine verdict based on MinHash signals.
 */
function determineVerdict(
	cssSimilarity: number,
	classOverlap: number,
	propertySimilarity: number
): string {
	if (cssSimilarity > 0.35 && classOverlap < 0.1) {
		return 'likely_plagiarism'; // High CSS similarity but different class names = renamed
	} else if (cssSimilarity > 0.35 && classOverlap > 0.25) {
		return 'same_creator_or_clone'; // High similarity with shared classes = same creator
	} else if (cssSimilarity < 0.25 && classOverlap < 0.05) {
		return 'likely_unrelated'; // Low similarity on all metrics
	} else if (propertySimilarity > 0.25) {
		return 'suspicious_patterns'; // Similar CSS properties even if classes differ
	}
	return 'inconclusive';
}

/**
 * Format MinHash results for inclusion in AI prompts.
 */
export function formatMinHashSummary(results: MinHashPreScreenResult | null): string {
	if (!results) return '';

	return `
MinHash Code Analysis:
- CSS Similarity: ${(results.cssSimilarity * 100).toFixed(1)}%
- Class Overlap: ${(results.classOverlap * 100).toFixed(1)}%
- Property Similarity: ${(results.propertySimilarity * 100).toFixed(1)}%
- Similar Templates Found: ${results.similarCount}
- Verdict: ${results.verdict}${results.topMatches.length > 0 ? `
- Top Matches: ${results.topMatches.map(m => `${m.name} (${(m.similarity * 100).toFixed(1)}%)`).join(', ')}` : ''}`;
}
