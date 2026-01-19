/**
 * Tier Analysis Functions for Plagiarism Detection
 * 
 * Three-tier hybrid analysis system:
 * - Tier 1: Workers AI screening (free) - fast initial triage
 * - Tier 2: Claude Haiku analysis ($0.02) - editorial scoring
 * - Tier 3: Claude Sonnet judgment ($0.15) - final decision with code analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import puppeteer from '@cloudflare/puppeteer';
import type { Env, PlagiarismCase, FinalDecision } from './types';
import { TIER_COSTS } from './constants';
import { storeEvidence } from './evidence';
import { extractJSON, sanitizeUrl, extractAllUrls } from './utils';
import { captureAndStoreScreenshots, getVisionAnalysis } from './screenshots';
import { runMinHashPreScreening, formatMinHashSummary } from './pre-screening';
import { analyzeVectorSimilarity, type VectorSimilarity } from './vector-similarity';
import { findSimilarTemplates } from './indexer';

// =============================================================================
// TIER 1: Workers AI Screening
// =============================================================================

/**
 * Tier 1: Fast initial screening using Workers AI and MinHash.
 * Free tier - runs for every case.
 */
export async function runTier1Screening(
	plagiarismCase: PlagiarismCase,
	env: Env
): Promise<void> {
	// MinHash Pre-Screening (runs in parallel with screenshots)
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
	const minhashSummary = formatMinHashSummary(minhashResults);

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

	// ALWAYS escalate to Tier 2 for proper analysis
	await env.CASE_QUEUE.send({ caseId: plagiarismCase.id, tier: 2 });

	console.log(`[Tier 1] ${plagiarismCase.id}: ${result.decision} (escalating to Tier 2)`);
}

// =============================================================================
// TIER 2: Claude Haiku Analysis
// =============================================================================

/**
 * Tier 2: Editorial scoring using Claude Haiku.
 * Cost: $0.02 per case.
 */
export async function runTier2Analysis(
	plagiarismCase: PlagiarismCase,
	env: Env
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
// TIER 3: Claude Sonnet Judgment
// =============================================================================

/**
 * Tier 3: Final judgment using Claude Sonnet with code analysis.
 * Cost: $0.15 per case.
 */
export async function runTier3Judgment(
	plagiarismCase: PlagiarismCase,
	tier2Result: any,
	env: Env,
	closeCase: (plagiarismCase: PlagiarismCase, decision: FinalDecision, result: any, env: Env) => Promise<void>
): Promise<void> {
	const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

	// ALWAYS fetch code comparison
	console.log('[Tier 3] Fetching HTML/CSS/JS for code-level validation');

	// Extract all URLs from Airtable fields
	const originalUrls = extractAllUrls(plagiarismCase.originalUrl);
	const copyUrls = extractAllUrls(plagiarismCase.allegedCopyUrl);

	const cleanOriginalUrls = originalUrls.length > 0
		? originalUrls
		: [sanitizeUrl(plagiarismCase.originalUrl)];
	const cleanCopyUrl = copyUrls.length > 0
		? copyUrls[0]
		: sanitizeUrl(plagiarismCase.allegedCopyUrl);

	console.log(`[Code Analysis] Found ${cleanOriginalUrls.length} original URL(s), comparing against: ${cleanCopyUrl}`);

	// Launch Puppeteer browser for JavaScript rendering
	let browser;
	try {
		browser = await puppeteer.launch(env.BROWSER);
		console.log('[Code Analysis] Puppeteer browser launched successfully');
	} catch (error: any) {
		console.log('[Code Analysis] Puppeteer unavailable, will use plain fetch only:', error.message);
	}

	let codeAnalysis: string | null = null;
	try {
		codeAnalysis = await fetchCodeComparison(cleanOriginalUrls, cleanCopyUrl, browser);
	} finally {
		if (browser) {
			await browser.close();
			console.log('[Code Analysis] Puppeteer browser closed');
		}
	}

	// Persist structured code metrics (if present)
	if (codeAnalysis && codeAnalysis.includes('--- STRUCTURED_CODE_METRICS_JSON ---')) {
		try {
			const parts = codeAnalysis.split('--- STRUCTURED_CODE_METRICS_JSON ---');
			const json = parts[1]?.trim();
			if (json) {
				const structured = JSON.parse(json);
				await storeEvidence(env, plagiarismCase.id, 'tier3_code_metrics', structured);
			}
		} catch (error: any) {
			console.log('[Evidence] Failed to parse/store structured code metrics:', error?.message || String(error));
		}
	}

	// Vector Similarity Analysis
	let vectorAnalysis: VectorSimilarity | null = null;
	if (env.OPENAI_API_KEY) {
		console.log('[Vector] Computing vector similarity...');
		try {
			vectorAnalysis = await analyzeVectorSimilarity(
				cleanOriginalUrls[0],
				cleanCopyUrl,
				env.OPENAI_API_KEY
			);
			console.log('[Vector] Similarity computed:', vectorAnalysis);
		} catch (error: any) {
			console.log('[Vector] Error computing similarity:', error.message);
		}
	}

	if (vectorAnalysis) {
		await storeEvidence(env, plagiarismCase.id, 'tier3_vector_similarity', vectorAnalysis);
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
		console.log('[Vectorize] Neighbor query failed (non-fatal):', error?.message || String(error));
	}

	const prompt = buildTier3Prompt(plagiarismCase, tier2Result, codeAnalysis, vectorAnalysis);

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

	console.log(`[Tier 3] ${plagiarismCase.id}: ${result.decision} ($${TIER_COSTS.TIER3}) (code analysis: ${codeAnalysis ? 'success' : 'failed'})`);
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildTier3Prompt(
	plagiarismCase: PlagiarismCase,
	tier2Result: any,
	codeAnalysis: string | null,
	vectorAnalysis: VectorSimilarity | null
): string {
	return `Make final judgment on plagiarism case:

Original: ${plagiarismCase.originalUrl}
Alleged copy: ${plagiarismCase.allegedCopyUrl}
Complaint: ${plagiarismCase.complaintText}

Tier 2 Visual Analysis: ${JSON.stringify(tier2Result)}

HTML/CSS/JS Code Analysis:
${codeAnalysis || 'Code analysis failed - URLs may be inaccessible'}

${vectorAnalysis ? `
Vector Similarity Analysis (Semantic Code Comparison):
- HTML Structure Similarity: ${(vectorAnalysis.html_similarity * 100).toFixed(1)}%
- CSS Pattern Similarity: ${(vectorAnalysis.css_similarity * 100).toFixed(1)}%
- JavaScript Logic Similarity: ${(vectorAnalysis.js_similarity * 100).toFixed(1)}%
- Webflow Interaction Similarity: ${(vectorAnalysis.webflow_similarity * 100).toFixed(1)}%
- DOM Hierarchy Similarity: ${(vectorAnalysis.dom_similarity * 100).toFixed(1)}%
- Overall Semantic Similarity: ${(vectorAnalysis.overall * 100).toFixed(1)}%
- Verdict: ${vectorAnalysis.verdict}
` : 'Vector analysis not available'}

CRITICAL: Visual similarity can be misleading. The code and vector analyses reveal the truth.

Provide final decision with detailed reasoning and confidence level.

IMPORTANT: Return ONLY valid JSON, nothing else.
{
  "decision": "no_violation" | "minor" | "major",
  "reasoning": "Detailed explanation",
  "confidence": 0.0-1.0
}`;
}

/**
 * Fetch and compare HTML/CSS/JS from URLs.
 */
async function fetchCodeComparison(
	originalUrls: string[],
	copyUrl: string,
	browser?: any
): Promise<string | null> {
	try {
		console.log(`[Code Analysis] Comparing ${copyUrl} against ${originalUrls.length} original URL(s)`);

		const extractPatterns = (html: string) => {
			const cssAnimations = html.match(/@keyframes\s+[\w-]+\s*{[^}]+}/g) || [];
			const cssTransitions = html.match(/transition:\s*[^;]+;/g) || [];
			const gridLayouts = html.match(/display:\s*grid[^}]*}/g) || [];
			const flexLayouts = html.match(/display:\s*flex[^}]*}/g) || [];
			const sections = html.match(/<section[^>]*>/g)?.length || 0;

			const jsLibraries: string[] = [];
			if (html.includes('gsap') || html.includes('GreenSock')) jsLibraries.push('GSAP');
			if (html.includes('framer-motion')) jsLibraries.push('Framer Motion');
			if (html.includes('anime.min.js')) jsLibraries.push('Anime.js');
			if (html.includes('data-aos')) jsLibraries.push('AOS');
			if (html.includes('ScrollTrigger')) jsLibraries.push('ScrollTrigger');
			if (html.includes('lottie')) jsLibraries.push('Lottie');

			const webflowPatterns = {
				interactions: (html.match(/data-w-id="[^"]+"/g) || []).length,
				ixData: html.includes('window.Webflow && window.Webflow.require("ix2")'),
			};

			return {
				cssAnimations: cssAnimations.length,
				cssTransitions: cssTransitions.length,
				cssAnimationSamples: cssAnimations.slice(0, 2),
				gridLayouts: gridLayouts.length,
				flexLayouts: flexLayouts.length,
				sections,
				jsLibraries,
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
		const copyPatterns = extractPatterns(copyHtml);

		const comparisons: string[] = [];
		const originalsMetrics: any[] = [];

		for (let i = 0; i < originalUrls.length; i++) {
			try {
				const originalHtml = await fetchHtml(originalUrls[i]);
				const originalPatterns = extractPatterns(originalHtml);

				const sharedLibraries = originalPatterns.jsLibraries.filter(lib =>
					copyPatterns.jsLibraries.includes(lib)
				);

				originalsMetrics.push({
					originalUrl: originalUrls[i],
					originalPatterns,
					deltas: {
						cssAnimationsDiff: Math.abs(originalPatterns.cssAnimations - copyPatterns.cssAnimations),
						sectionsDiff: Math.abs(originalPatterns.sections - copyPatterns.sections),
						sharedLibraries
					}
				});

				comparisons.push(`
--- Original URL ${i + 1}: ${originalUrls[i]} ---
- CSS Animations: ${originalPatterns.cssAnimations}
- JS Libraries: ${originalPatterns.jsLibraries.join(', ') || 'None'}
- Sections: ${originalPatterns.sections}
- Shared Libraries with Copy: ${sharedLibraries.join(', ') || 'None'}
`);
			} catch (error: any) {
				comparisons.push(`\n--- Original URL ${i + 1}: ${originalUrls[i]} ---\nError: ${error.message}\n`);
			}
		}

		const summary = `
CODE ANALYSIS:

Copy URL: ${copyUrl}
- CSS Animations: ${copyPatterns.cssAnimations}
- JS Libraries: ${copyPatterns.jsLibraries.join(', ') || 'None'}
- Sections: ${copyPatterns.sections}
- Is Webflow: ${copyPatterns.isWebflow ? 'YES' : 'NO'}

${comparisons.join('\n')}
`;

		const structured = { copyUrl, copyPatterns, originals: originalsMetrics };
		return `${summary}\n\n--- STRUCTURED_CODE_METRICS_JSON ---\n${JSON.stringify(structured)}`;
	} catch (error: any) {
		console.error('[Code Analysis] Error:', error?.message);
		return null;
	}
}
