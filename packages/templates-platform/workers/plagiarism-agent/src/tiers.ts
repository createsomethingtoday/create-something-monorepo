/**
 * Tier Analysis Functions for Plagiarism Detection
 *
 * Three-tier hybrid system:
 * - Tier 1: Workers AI screening (free)
 * - Tier 2: Claude Haiku analysis ($0.02/case)
 * - Tier 3: Claude Sonnet judgment ($0.15/case)
 */

import Anthropic from '@anthropic-ai/sdk';
import puppeteer from '@cloudflare/puppeteer';
import type { Env, PlagiarismCase, FinalDecision, MinHashPreScreenResult } from './types';
import { extractJSON, sanitizeUrl, extractAllUrls } from './utils';
import { storeEvidence } from './evidence';
import {
	fetchPublishedContent,
	analyzeVectorSimilarity,
	type VectorSimilarity
} from './vector-similarity';
import { findSimilarTemplates } from './indexer';
import {
	computeCssMinHash,
	computeHtmlMinHash,
	computeCombinedMinHash,
	estimateSimilarity,
	deserializeSignatureCompact,
	extractCustomClasses,
	compareProperties,
	computeLSHBandHashes
} from './minhash';

// =============================================================================
// CONSTANTS
// =============================================================================

export const TIER_COSTS = {
	TIER1: 0.0,  // Workers AI (free)
	TIER2: 0.02, // Claude Haiku
	TIER3: 0.15  // Claude Sonnet
} as const;

// Tier 2 → Tier 3 escalation threshold
export const TIER3_ESCALATION_THRESHOLD = 0.75;

// =============================================================================
// MINHASH PRE-SCREENING
// =============================================================================

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
		let verdict = 'inconclusive';
		if (cssSimilarity > 0.35 && classOverlap < 0.1) {
			verdict = 'likely_plagiarism'; // High CSS similarity but different class names = renamed
		} else if (cssSimilarity > 0.35 && classOverlap > 0.25) {
			verdict = 'same_creator_or_clone'; // High similarity with shared classes = same creator
		} else if (cssSimilarity < 0.25 && classOverlap < 0.05) {
			verdict = 'likely_unrelated'; // Low similarity on all metrics
		} else if (propertySimilarity > 0.25) {
			verdict = 'suspicious_patterns'; // Similar CSS properties even if classes differ
		}

		const result: MinHashPreScreenResult & { topMatches: typeof topMatches } = {
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

// =============================================================================
// TIER 1: Workers AI Screening
// =============================================================================

export async function runTier1Screening(
	plagiarismCase: PlagiarismCase,
	env: Env,
	captureAndStoreScreenshots: (caseId: string, url1: string, url2: string, env: Env) => Promise<void>,
	getVisionAnalysis: (caseId: string, env: Env) => Promise<string | null>
): Promise<void> {
	// --- STEP 1: MinHash Pre-Screening (runs in parallel with screenshots) ---
	const minhashPromise = runMinHashPreScreening(plagiarismCase, env);

	// Check if screenshots already exist in R2 (from Airtable submission)
	const existingScreenshots = await Promise.all([
		env.SCREENSHOTS.head(`${plagiarismCase.id}/original.jpg`),
		env.SCREENSHOTS.head(`${plagiarismCase.id}/copy.jpg`)
	]);

	const hasProvidedScreenshots = existingScreenshots[0] && existingScreenshots[1];

	// Only capture new screenshots if submitter didn't provide them
	if (!hasProvidedScreenshots) {
		console.log('[Tier 1] No provided screenshots found, capturing via Browser Rendering');
		await captureAndStoreScreenshots(
			plagiarismCase.id,
			plagiarismCase.originalUrl,
			plagiarismCase.allegedCopyUrl,
			env
		);
	} else {
		console.log('[Tier 1] Using submitter-provided screenshots');
	}

	// Wait for MinHash results
	const minhashResults = await minhashPromise;
	const minhashSummary = minhashResults
		? `\nMinHash Code Analysis:\n- CSS Similarity: ${(minhashResults.cssSimilarity * 100).toFixed(1)}%\n- Class Overlap: ${(minhashResults.classOverlap * 100).toFixed(1)}%\n- Property Similarity: ${(minhashResults.propertySimilarity * 100).toFixed(1)}%\n- Similar Templates Found: ${minhashResults.similarCount}\n- Verdict: ${minhashResults.verdict}`
		: '';

	// Get vision analysis if screenshots available
	let visionAnalysis: string | null = null;
	try {
		visionAnalysis = await getVisionAnalysis(plagiarismCase.id, env);
		if (visionAnalysis) {
			console.log(`[Tier 1] Vision analysis: ${visionAnalysis.substring(0, 200)}...`);
		}
	} catch (error) {
		console.log('[Tier 1] Proceeding without vision analysis:', error);
	}

	const prompt = `Analyze this plagiarism complaint:

Reporter: ${plagiarismCase.reporterEmail}
Original: ${plagiarismCase.originalUrl}
Alleged copy: ${plagiarismCase.allegedCopyUrl}
Complaint: ${plagiarismCase.complaintText}

${visionAnalysis ? `\nVisual Analysis:\n${visionAnalysis}\n` : ''}
${minhashSummary}

Decide:
- "obvious_not": Clearly not plagiarism (MinHash shows low similarity, no shared patterns)
- "obvious_yes": Clear plagiarism (MinHash shows high CSS similarity with low class overlap - indicates renamed classes)
- "needs_analysis": Requires detailed review

IMPORTANT: Return ONLY valid JSON, nothing else. No markdown, no formatting, no explanatory text.
Format: {"decision": "...", "reasoning": "..."}`;

	const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
		messages: [{ role: 'user', content: prompt }]
	});

	const result = extractJSON(response.response);

	await env.DB.prepare(`
		UPDATE plagiarism_cases
		SET tier1_decision = ?, tier1_reasoning = ?, status = 'processing'
		WHERE id = ?
	`).bind(result.decision, result.reasoning, plagiarismCase.id).run();

	// ALWAYS escalate to Tier 2 for proper analysis, even for "obvious" cases
	await env.CASE_QUEUE.send({ caseId: plagiarismCase.id, tier: 2 });

	console.log(`[Tier 1] ${plagiarismCase.id}: ${result.decision} (escalating to Tier 2)`);
}

// =============================================================================
// TIER 2: Claude Haiku Analysis
// =============================================================================

export async function runTier2Analysis(
	plagiarismCase: PlagiarismCase,
	env: Env,
	getVisionAnalysis: (caseId: string, env: Env) => Promise<string | null>
): Promise<void> {
	const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

	// Get vision analysis if screenshots available
	const visionAnalysis = await getVisionAnalysis(plagiarismCase.id, env);
	if (visionAnalysis) {
		console.log(`[Tier 2] Using vision analysis`);
	} else {
		console.log('[Tier 2] No screenshots available, using text-only analysis');
	}

	const prompt = `Analyze plagiarism between templates:

Original: ${plagiarismCase.originalUrl}
Alleged copy: ${plagiarismCase.allegedCopyUrl}
Complaint: ${plagiarismCase.complaintText}

${visionAnalysis ? `\nVisual Comparison Analysis:\n${visionAnalysis}\n` : ''}

Provide editorial scores:
- extent: minimal | moderate | substantial | extensive
- transformation: none | low | minimal | moderate | high
- importance: peripheral | minor | significant | major
- impact: little/no harm | moderate harm | significant harm

IMPORTANT: Return ONLY valid JSON, nothing else.
{
  "decision": "no_violation" | "minor" | "major" | "unclear",
  "confidence": 0.0-1.0,
  "extent": "...",
  "transformation": "...",
  "importance": "...",
  "impact": "..."
}`;

	const response = await anthropic.messages.create({
		model: 'claude-3-5-haiku-20241022',
		temperature: 0,
		max_tokens: 1000,
		messages: [{ role: 'user', content: prompt }]
	});

	const result = extractJSON(response.content[0].text);

	await env.DB.prepare(`
		UPDATE plagiarism_cases
		SET tier2_decision = ?, tier2_report = ?, tier2_screenshot_ids = ?, cost_usd = ?
		WHERE id = ?
	`).bind(
		result.decision,
		JSON.stringify(result),
		visionAnalysis ? JSON.stringify([`${plagiarismCase.id}/original.jpg`, `${plagiarismCase.id}/copy.jpg`]) : null,
		TIER_COSTS.TIER2,
		plagiarismCase.id
	).run();

	// ALWAYS escalate to Tier 3 for code-level validation
	console.log(`[Tier 2] Escalating to Tier 3 for mandatory code analysis (confidence: ${result.confidence})`);
	await env.CASE_QUEUE.send({ caseId: plagiarismCase.id, tier: 3 });

	console.log(`[Tier 2] ${plagiarismCase.id}: ${result.decision} ($${TIER_COSTS.TIER2})`);
}

// =============================================================================
// TIER 3: Code Analysis Helpers
// =============================================================================

/**
 * Fetch and compare HTML/CSS/JS from both URLs using Puppeteer for full rendering.
 */
export async function fetchCodeComparison(
	originalUrls: string[],
	copyUrl: string,
	browser?: any
): Promise<string | null> {
	try {
		console.log(`[Code Analysis] Comparing ${copyUrl} against ${originalUrls.length} original URL(s)`);

		// Extract comprehensive patterns including JavaScript animations
		const extractPatterns = async (html: string, url: string) => {
			const cssAnimations = html.match(/@keyframes\s+[\w-]+\s*{[^}]+}/g) || [];
			const cssTransitions = html.match(/transition:\s*[^;]+;/g) || [];
			const gridLayouts = html.match(/display:\s*grid[^}]*}/g) || [];
			const flexLayouts = html.match(/display:\s*flex[^}]*}/g) || [];
			const sections = html.match(/<section[^>]*>/g)?.length || 0;
			const headers = html.match(/<header[^>]*>/g)?.length || 0;
			const navs = html.match(/<nav[^>]*>/g)?.length || 0;

			const jsLibraries: string[] = [];
			if (html.includes('gsap') || html.includes('GreenSock')) jsLibraries.push('GSAP');
			if (html.includes('framer-motion') || html.includes('motion.')) jsLibraries.push('Framer Motion');
			if (html.includes('anime.min.js') || html.includes('anime(')) jsLibraries.push('Anime.js');
			if (html.includes('aos.js') || html.includes('data-aos')) jsLibraries.push('AOS');
			if (html.includes('scroll-trigger') || html.includes('ScrollTrigger')) jsLibraries.push('ScrollTrigger');
			if (html.includes('lottie') || html.includes('bodymovin')) jsLibraries.push('Lottie');

			const webflowPatterns = {
				interactions: (html.match(/data-w-id="[^"]+"/g) || []).length,
				ixData: html.includes('window.Webflow && window.Webflow.require("ix2")'),
				animations: (html.match(/data-animation="[^"]+"/g) || []).length,
				triggers: (html.match(/data-w-trigger="[^"]+"/g) || []).length
			};

			const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
			let animationCalls = 0;
			for (const script of scriptTags) {
				if (script.match(/\.animate\(|\.transition\(|\.to\(|\.from\(|requestAnimationFrame/)) {
					animationCalls++;
				}
			}

			return {
				cssAnimations: cssAnimations.length,
				cssTransitions: cssTransitions.length,
				cssAnimationSamples: cssAnimations.slice(0, 2),
				gridLayouts: gridLayouts.length,
				flexLayouts: flexLayouts.length,
				sections,
				headers,
				navs,
				jsLibraries,
				animationCalls,
				webflowPatterns,
				isWebflow: html.includes('Webflow') || html.includes('webflow')
			};
		};

		const fetchHtml = async (url: string): Promise<string> => {
			try {
				const response = await fetch(url, {
					headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
				});
				if (response.ok) return await response.text();
			} catch (error) {
				console.log(`[Code Analysis] Plain fetch failed for ${url}`);
			}

			if (browser) {
				try {
					const page = await browser.newPage();
					await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
					const html = await page.content();
					await page.close();
					return html;
				} catch (error: any) {
					console.error(`[Code Analysis] Puppeteer failed:`, error.message);
				}
			}

			throw new Error(`Failed to fetch ${url}`);
		};

		const copyHtml = await fetchHtml(copyUrl);
		const copyPatterns = await extractPatterns(copyHtml, copyUrl);

		const comparisons: string[] = [];
		const originalsMetrics: any[] = [];

		for (let i = 0; i < originalUrls.length; i++) {
			const originalUrl = originalUrls[i];
			try {
				const originalHtml = await fetchHtml(originalUrl);
				const originalPatterns = await extractPatterns(originalHtml, originalUrl);

				const cssAnimSimilarity = Math.abs(originalPatterns.cssAnimations - copyPatterns.cssAnimations) <= 2;
				const sectionSimilarity = Math.abs(originalPatterns.sections - copyPatterns.sections) <= 1;
				const layoutSimilarity = Math.abs(originalPatterns.gridLayouts - copyPatterns.gridLayouts) <= 2;

				const sharedLibraries = originalPatterns.jsLibraries.filter(lib =>
					copyPatterns.jsLibraries.includes(lib)
				);

				originalsMetrics.push({
					originalUrl,
					originalPatterns,
					deltas: {
						cssAnimationsDiff: Math.abs(originalPatterns.cssAnimations - copyPatterns.cssAnimations),
						sectionsDiff: Math.abs(originalPatterns.sections - copyPatterns.sections),
						gridLayoutsDiff: Math.abs(originalPatterns.gridLayouts - copyPatterns.gridLayouts),
						sharedLibraries
					}
				});

				const comparison = `
--- Original URL ${i + 1}: ${originalUrl} ---

Original Patterns:
- CSS Animations: ${originalPatterns.cssAnimations}
- JS Libraries: ${originalPatterns.jsLibraries.join(', ') || 'None'}
- Grid layouts: ${originalPatterns.gridLayouts}
- Sections: ${originalPatterns.sections}
${originalPatterns.isWebflow ? `- Webflow Interactions: ${originalPatterns.webflowPatterns.interactions}` : ''}

Similarity to Copy:
- CSS animation count match: ${cssAnimSimilarity ? 'YES' : 'NO'}
- Section count match: ${sectionSimilarity ? 'YES' : 'NO'}
- Layout patterns match: ${layoutSimilarity ? 'YES' : 'NO'}
- Shared JS Libraries: ${sharedLibraries.join(', ') || 'None'}
`;
				comparisons.push(comparison);
			} catch (error: any) {
				comparisons.push(`\n--- Original URL ${i + 1}: ${originalUrl} ---\nError: ${error.message}\n`);
			}
		}

		const summary = `
CODE ANALYSIS:

Copy URL: ${copyUrl}
- CSS Animations: ${copyPatterns.cssAnimations}
- JS Libraries: ${copyPatterns.jsLibraries.join(', ') || 'None'}
- Grid layouts: ${copyPatterns.gridLayouts}
- Sections: ${copyPatterns.sections}
${copyPatterns.isWebflow ? `- Webflow Interactions: ${copyPatterns.webflowPatterns.interactions}` : ''}

${comparisons.join('\n')}
`;

		const structured = { copyUrl, copyPatterns, originals: originalsMetrics };
		return `${summary}\n\n--- STRUCTURED_CODE_METRICS_JSON ---\n${JSON.stringify(structured)}`;
	} catch (error: any) {
		console.error('[Code Analysis] Error:', error?.message || String(error));
		return null;
	}
}

// =============================================================================
// TIER 3: Claude Sonnet Judgment
// =============================================================================

export async function runTier3Judgment(
	plagiarismCase: PlagiarismCase,
	tier2Result: any,
	env: Env,
	closeCase: (plagiarismCase: PlagiarismCase, decision: FinalDecision, result: any, env: Env) => Promise<void>
): Promise<void> {
	const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

	console.log('[Tier 3] Fetching HTML/CSS/JS for code-level validation');

	const originalUrls = extractAllUrls(plagiarismCase.originalUrl);
	const copyUrls = extractAllUrls(plagiarismCase.allegedCopyUrl);

	const cleanOriginalUrls = originalUrls.length > 0 ? originalUrls : [sanitizeUrl(plagiarismCase.originalUrl)];
	const cleanCopyUrl = copyUrls.length > 0 ? copyUrls[0] : sanitizeUrl(plagiarismCase.allegedCopyUrl);

	let browser;
	try {
		browser = await puppeteer.launch(env.BROWSER);
	} catch (error: any) {
		console.log('[Code Analysis] Puppeteer unavailable:', error.message);
	}

	let codeAnalysis: string | null = null;
	try {
		codeAnalysis = await fetchCodeComparison(cleanOriginalUrls, cleanCopyUrl, browser);
	} finally {
		if (browser) await browser.close();
	}

	// Persist structured code metrics
	if (codeAnalysis?.includes('--- STRUCTURED_CODE_METRICS_JSON ---')) {
		try {
			const parts = codeAnalysis.split('--- STRUCTURED_CODE_METRICS_JSON ---');
			const json = parts[1]?.trim();
			if (json) {
				await storeEvidence(env, plagiarismCase.id, 'tier3_code_metrics', JSON.parse(json));
			}
		} catch (error) {
			console.log('[Evidence] Failed to store structured code metrics');
		}
	}

	// Vector Similarity Analysis
	let vectorAnalysis: VectorSimilarity | null = null;
	if (env.OPENAI_API_KEY) {
		try {
			vectorAnalysis = await analyzeVectorSimilarity(cleanOriginalUrls[0], cleanCopyUrl, env.OPENAI_API_KEY);
			await storeEvidence(env, plagiarismCase.id, 'tier3_vector_similarity', vectorAnalysis);
		} catch (error: any) {
			console.log('[Vector] Error:', error.message);
		}
	}

	// Vectorize nearest neighbors
	try {
		if (env.OPENAI_API_KEY && env.VECTORIZE) {
			const neighbors = await findSimilarTemplates(cleanCopyUrl, env, 10);
			await storeEvidence(env, plagiarismCase.id, 'tier3_vectorize_neighbors', {
				queryUrl: cleanCopyUrl,
				topK: 10,
				neighbors
			});
		}
	} catch (error: any) {
		console.log('[Vectorize] Neighbor query failed:', error?.message);
	}

	const prompt = `Make final judgment on plagiarism case:

Original: ${plagiarismCase.originalUrl}
Alleged copy: ${plagiarismCase.allegedCopyUrl}
Complaint: ${plagiarismCase.complaintText}

Tier 2 Visual Analysis: ${JSON.stringify(tier2Result)}

HTML/CSS/JS Code Analysis:
${codeAnalysis || 'Code analysis failed'}

${vectorAnalysis ? `
Vector Similarity Analysis:
- HTML: ${(vectorAnalysis.html_similarity * 100).toFixed(1)}%
- CSS: ${(vectorAnalysis.css_similarity * 100).toFixed(1)}%
- JS: ${(vectorAnalysis.js_similarity * 100).toFixed(1)}%
- Overall: ${(vectorAnalysis.overall * 100).toFixed(1)}%
- Verdict: ${vectorAnalysis.verdict}
` : ''}

IMPORTANT: Return ONLY valid JSON.
{
  "decision": "no_violation" | "minor" | "major",
  "reasoning": "Detailed explanation",
  "confidence": 0.0-1.0
}`;

	const response = await anthropic.messages.create({
		model: 'claude-3-7-sonnet-20250219',
		temperature: 0,
		max_tokens: 2000,
		messages: [{ role: 'user', content: prompt }]
	});

	const result = extractJSON(response.content[0].text);

	await env.DB.prepare(`
		UPDATE plagiarism_cases
		SET tier3_decision = ?, tier3_reasoning = ?, cost_usd = cost_usd + ?
		WHERE id = ?
	`).bind(result.decision, result.reasoning, TIER_COSTS.TIER3, plagiarismCase.id).run();

	await closeCase(plagiarismCase, result.decision as FinalDecision, result, env);

	console.log(`[Tier 3] ${plagiarismCase.id}: ${result.decision} ($${TIER_COSTS.TIER3})`);
}
