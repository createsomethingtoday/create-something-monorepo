/**
 * Interactions Validator - Webflow Interactions / GSAP policy checks
 *
 * Validates:
 * - Legacy IX2 interaction markers are not present on submitted templates
 */

import { InteractionsAnalysisResult, ValidationIssue } from '../types';
import { fetchHTML } from '../utils/fetch-utils';

const IX2_REJECTION_MESSAGE =
	'Legacy Webflow IX2 interactions detected. As of May 1, 2026, Marketplace templates submitted with IX2 interactions are rejected.';
const LOTTIE_IX2_ACTION_TYPES = new Set([
	'GENERAL_START_ACTION',
	'PLUGIN_LOTTIE',
	'PLUGIN_LOTTIE_EFFECT'
]);

type Ix2Match = {
	label: string;
	count: number;
	strong: boolean;
};

type Ix2PageResult = {
	url: string;
	legacyIx2Detected: boolean;
	legacyIx2Count: number;
	matches: Array<{
		label: string;
		count: number;
	}>;
};

type FailedPageResult = {
	url: string;
	error: string;
};

export async function validateInteractions(
	siteUrl: string,
	pageSlugs?: string[],
	options?: { maxPages?: number }
): Promise<InteractionsAnalysisResult> {
	console.log(`Starting interactions validation for ${siteUrl}`);

	try {
		const urls = buildPageUrls(siteUrl, pageSlugs, options?.maxPages);
		const pageResults = await Promise.all(
			urls.map(async (url) => {
				try {
					return { status: 'fulfilled' as const, value: await analyzeInteractionsPage(url) };
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					return { status: 'rejected' as const, reason: { url, error: message } };
				}
			})
		);
		const pages = pageResults
			.filter((result): result is { status: 'fulfilled'; value: Ix2PageResult } => result.status === 'fulfilled')
			.map((result) => result.value);
		const failedPages = pageResults
			.filter((result): result is { status: 'rejected'; reason: FailedPageResult } => result.status === 'rejected')
			.map((result) => result.reason);
		const pagesWithLegacyIx2 = pages.filter((page) => page.legacyIx2Detected);
		const legacyIx2Count = pagesWithLegacyIx2.reduce((total, page) => total + page.legacyIx2Count, 0);
		const issues = [
			...generateInteractionIssues(pagesWithLegacyIx2, legacyIx2Count),
			...generateIncompleteAnalysisIssues(failedPages, pagesWithLegacyIx2.length > 0)
		];

		return {
			issues,
			stats: {
				legacyIx2Detected: pages.length === 0 ? null : pagesWithLegacyIx2.length > 0,
				legacyIx2Count,
				pagesRequested: urls.length,
				pagesAnalyzed: pages.length,
				pagesFailed: failedPages.length,
				pagesWithLegacyIx2: pagesWithLegacyIx2.length,
				analysisComplete: failedPages.length === 0,
				analysisStatus: failedPages.length === 0 ? 'completed' : pages.length > 0 ? 'partial' : 'failed',
				errorMessage: failedPages.length > 0 ? `${failedPages.length} page(s) could not be analyzed` : undefined
			},
			pages
		};
	} catch (error) {
		console.error('Interactions validation error:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return {
			issues: [{
				id: 'interactions-analysis-failed',
				category: 'Interactions and GSAP',
				severity: 'error',
				message: 'Interactions and GSAP could not be verified',
				description: `The published site could not be analyzed for legacy IX2 interactions: ${message}`,
				howToFix: 'Publish the latest site, confirm the published URL is accessible, and rerun validation. If the template uses legacy IX2 interactions, rebuild them with Webflow Interactions powered by GSAP before submission.',
				details: {
					howToFix: 'Publish the latest site, confirm the published URL is accessible, and rerun validation. If the template uses legacy IX2 interactions, rebuild them with Webflow Interactions powered by GSAP before submission.',
					analysisStatus: 'failed',
					errorMessage: message
				}
			}],
			stats: {
				legacyIx2Detected: null,
				legacyIx2Count: 0,
				pagesRequested: 0,
				pagesAnalyzed: 0,
				pagesFailed: 0,
				pagesWithLegacyIx2: 0,
				analysisComplete: false,
				analysisStatus: 'failed',
				errorMessage: message
			},
			pages: []
		};
	}
}

function buildPageUrls(siteUrl: string, pageSlugs?: string[], maxPages = 25): string[] {
	const urls = new Set<string>([normalizePageUrl(siteUrl, siteUrl)]);

	if (Array.isArray(pageSlugs)) {
		pageSlugs.forEach((slug) => {
			if (typeof slug !== 'string' || slug.trim() === '') return;
			urls.add(normalizePageUrl(slug, siteUrl));
		});
	}

	return Array.from(urls).slice(0, maxPages);
}

function normalizePageUrl(value: string, baseUrl: string): string {
	const trimmed = value.trim();
	const path = trimmed.startsWith('/') || trimmed.startsWith('http') ? trimmed : `/${trimmed}`;
	const url = new URL(path, baseUrl);
	url.hash = '';
	return url.toString();
}

async function analyzeInteractionsPage(url: string): Promise<Ix2PageResult> {
	const htmlResult = await fetchHTML(url);
	const detection = detectIx2Interactions(htmlResult.html);

	return {
		url,
		legacyIx2Detected: detection.detected,
		legacyIx2Count: detection.count,
		matches: detection.matches.map(({ label, count }) => ({ label, count }))
	};
}

function detectIx2Interactions(html: string) {
	const htmlWithoutLottieElements = stripLottieElementTags(html);
	const dataWIdCount = countPatternMatches(htmlWithoutLottieElements, /\sdata-w-id\s*=/gi);
	const dataIsIx2TargetCount = countPatternMatches(
		htmlWithoutLottieElements,
		/\sdata-is-ix2-target\s*=/gi
	);
	const nonLottieElementMarkerCount = dataWIdCount + dataIsIx2TargetCount;
	const ix2RuntimeCallCount = countLegacyIx2RuntimeCalls(html, nonLottieElementMarkerCount > 0);
	const matches: Ix2Match[] = [
		{
			label: 'data-w-id attributes',
			count: dataWIdCount,
			strong: true
		},
		{
			label: 'data-is-ix2-target attributes',
			count: dataIsIx2TargetCount,
			strong: true
		},
		{
			label: 'Webflow IX2 runtime calls',
			count: ix2RuntimeCallCount,
			strong: true
		},
		{
			label: 'w-mod-ix CSS/runtime markers',
			count: countPatternMatches(html, /w-mod-ix/gi),
			strong: false
		}
	].filter((item) => item.count > 0);
	const strongMatches = matches.filter((item) => item.strong);

	return {
		detected: strongMatches.length > 0,
		count: strongMatches.reduce((total, item) => total + item.count, 0),
		matches
	};
}

function stripLottieElementTags(html: string) {
	return html.replace(
		/<[^>]*\sdata-animation-type\s*=\s*(?:"lottie"|'lottie'|lottie(?=[\s>]))[^>]*>/gi,
		''
	);
}

function countLegacyIx2RuntimeCalls(html: string, hasNonLottieElementMarkers: boolean) {
	const runtimeCallCount = countPatternMatches(
		html,
		/Webflow\.require\s*\(\s*["']ix2["']\s*\)/gi
	);
	if (runtimeCallCount === 0) {
		return 0;
	}

	if (hasNonLottieElementMarkers) {
		return runtimeCallCount;
	}

	if (hasLottieIx2Usage(html) && !hasNonLottieIx2ActionTypes(html)) {
		return 0;
	}

	return runtimeCallCount;
}

function hasLottieIx2Usage(html: string) {
	return (
		/PLUGIN_LOTTIE/i.test(html) ||
		/<[^>]*\sdata-animation-type\s*=\s*(?:"lottie"|'lottie'|lottie(?=[\s>]))[^>]*>/i.test(html)
	);
}

function hasNonLottieIx2ActionTypes(html: string) {
	return Array.from(html.matchAll(/["']?actionTypeId["']?\s*:\s*["']([^"']+)["']/gi)).some(
		([, actionTypeId]) => !LOTTIE_IX2_ACTION_TYPES.has(actionTypeId)
	);
}

function countPatternMatches(value: string, pattern: RegExp): number {
	const matches = value.match(pattern);
	return matches ? matches.length : 0;
}

function generateInteractionIssues(pagesWithLegacyIx2: Ix2PageResult[], legacyIx2Count: number): ValidationIssue[] {
	if (pagesWithLegacyIx2.length === 0) {
		return [];
	}

	return [{
		id: 'legacy-ix2-interactions-detected',
		category: 'Interactions and GSAP',
		severity: 'error',
		message: IX2_REJECTION_MESSAGE,
		description: 'The May 1, 2026 Marketplace policy requires templates submitted from that date forward to avoid legacy IX2 interactions.',
		howToFix: 'Rebuild these interactions with Webflow Interactions powered by GSAP (IX3), publish the site again, and rerun validation.',
		details: {
			howToFix: 'Rebuild these interactions with Webflow Interactions powered by GSAP (IX3), publish the site again, and rerun validation.',
			policy: 'ix2-rejected',
			effectiveDate: 'May 1, 2026',
			legacyIx2Count,
			affectedPages: pagesWithLegacyIx2.map((page) => ({
				url: page.url,
				legacyIx2Count: page.legacyIx2Count,
				matches: page.matches
			})),
			issues: pagesWithLegacyIx2.flatMap((page) =>
				page.matches.map((match) => `${page.url}: ${match.label} (${match.count})`)
			),
			matchedPatterns: pagesWithLegacyIx2.flatMap((page) =>
				page.matches.map((match) => `${page.url}: ${match.label} (${match.count})`)
			)
		}
	}];
}

function generateIncompleteAnalysisIssues(
	failedPages: FailedPageResult[],
	hasLegacyIx2Rejection: boolean
): ValidationIssue[] {
	if (failedPages.length === 0) {
		return [];
	}

	return [{
		id: 'interactions-analysis-incomplete',
		category: 'Interactions and GSAP',
		severity: hasLegacyIx2Rejection ? 'warning' : 'error',
		message: `${failedPages.length} page${failedPages.length === 1 ? '' : 's'} could not be checked for Interactions and GSAP`,
		description: 'Interactions validation now continues when individual pages fail, but every submitted page still needs a verified IX2 policy check.',
		howToFix: 'Publish all template pages, confirm each published URL is accessible, and rerun validation.',
		details: {
			howToFix: 'Publish all template pages, confirm each published URL is accessible, and rerun validation.',
			affectedPages: failedPages.map((page) => ({
				url: page.url,
				error: page.error
			})),
			issues: failedPages.map((page) => `${page.url}: ${page.error}`)
		}
	}];
}
