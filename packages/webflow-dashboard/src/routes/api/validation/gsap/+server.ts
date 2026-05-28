/**
 * GSAP Validation API Endpoint
 *
 * Calls the Cloudflare Worker for GSAP template validation.
 * Worker capabilities:
 * - Site crawling up to 50 pages
 * - Code pattern analysis
 * - Security risk detection
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type {
	WorkerResponse,
	ValidationResult,
	PageResult,
	CommonIssue,
	Recommendation,
	FlaggedCode
} from '$lib/types/validation';

interface ValidationRequest {
	url: string;
}

const WORKER_URL = 'https://gsap-validation-worker.createsomething.workers.dev/crawlWebsite';
const WORKER_TIMEOUT_MS = 30_000;

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const debugLogs = platform?.env?.DEBUG_LOGS === 'true';
	const debugLog = (...args: unknown[]) => {
		if (debugLogs) {
			console.log(...args);
		}
	};

	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const body = (await request.json()) as ValidationRequest;
	const { url } = body;

	if (!url) {
		throw error(400, 'URL is required');
	}

	// Validate URL format
	if (!url.startsWith('https://') || !url.includes('.webflow.io')) {
		throw error(400, 'URL must be a Webflow site (https://...webflow.io)');
	}

	try {
		debugLog(`[Validation] Validating URL: ${url}`);
		const abortController = new AbortController();
		const timeoutId = setTimeout(() => abortController.abort(), WORKER_TIMEOUT_MS);

		// Call the external GSAP validation worker
		let response: Response;
		try {
			response = await fetch(WORKER_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					url,
					maxDepth: 1,
					maxPages: 50
				}),
				signal: abortController.signal
			});
		} finally {
			clearTimeout(timeoutId);
		}

		if (!response.ok) {
			console.error(`[Validation] Worker error: ${response.status} ${response.statusText}`);

			if (response.status === 502 || response.status === 503) {
				throw error(
					503,
					'Validation service temporarily unavailable. Please try again in a few moments.'
				);
			}

			if (response.status === 429) {
				throw error(429, 'Too many validation requests. Please wait a moment before trying again.');
			}

			throw error(500, 'Validation service error. Please try again later.');
		}

		const workerData = (await response.json()) as WorkerResponse;
		const pageResults = Array.isArray(workerData.pageResults) ? workerData.pageResults : [];
		const analyzedCount =
			workerData.siteResults?.analyzedCount ?? pageResults.filter((page) => page.success !== false).length;
		const passedCount =
			workerData.siteResults?.passedCount ??
			pageResults.filter((page) => page.success !== false && page.passed).length;
		const requestFailureCount =
			workerData.siteResults?.requestFailureCount ??
			pageResults.filter((page) => page.success === false).length;
		const validationFailureCount =
			workerData.siteResults?.validationFailureCount ??
			pageResults.filter((page) => page.success !== false && !page.passed).length;
		const failedCount =
			workerData.siteResults?.failedCount ?? requestFailureCount + validationFailureCount;
		const totalPages = workerData.siteResults?.pageCount ?? pageResults.length;
		const normalizedSuccess =
			workerData.success === true &&
			(!workerData.error || workerData.error.length === 0) &&
			totalPages > 0;
		const normalizedPassed =
			normalizedSuccess &&
			failedCount === 0 &&
			analyzedCount === totalPages &&
			totalPages > 0;

		if (!normalizedSuccess) {
			throw error(
				502,
				workerData.error || workerData.message || 'Validation service returned an invalid response.'
			);
		}

		// Process and format the validation results
		const result: ValidationResult = {
			url: workerData.url,
			success: normalizedSuccess,
			passed: normalizedPassed,
			timestamp: new Date().toISOString(),
			summary: {
				totalPages,
				analyzedPages: analyzedCount,
				passedPages: passedCount,
				failedPages: failedCount,
				passRate: totalPages > 0 ? Math.round((passedCount / totalPages) * 100) : 0
			},
			issues: {
				totalFlaggedCode:
					pageResults.reduce((total, page) => total + (page.flaggedCodeCount || 0), 0),
				totalSecurityRisks:
					pageResults.reduce(
						(total, page) => total + (page.summary?.securityRiskCount || 0),
						0
					),
				totalValidGsap:
					pageResults.reduce(
						(total, page) => total + (page.summary?.validGsapCount || 0),
						0
					),
				commonIssues: extractCommonIssues(pageResults)
			},
			pageResults: pageResults.map(
				(page): PageResult => ({
					url: page.url,
					title: page.title || page.url,
					passed: page.success !== false && page.passed,
					flaggedCodeCount: page.flaggedCodeCount || 0,
					securityRiskCount: page.summary?.securityRiskCount || 0,
					validGsapCount: page.summary?.validGsapCount || 0,
					mainIssues: (page.details?.flaggedCode?.slice(0, 3) || []).map((issue) => ({
						type: issue.message,
						preview: issue.flaggedCode?.[0]?.substring(0, 100) || '',
						fullDetails: issue.flaggedCode || []
					})),
					allFlaggedCode: page.details?.flaggedCode || []
				})
			),
			crawlStats: workerData.crawlStats,
			recommendations: generateRecommendations(workerData)
		};

		debugLog(`[Validation] Completed for ${url}. Pass rate: ${result.summary.passRate}%`);

		return json(result);
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') {
			throw error(504, 'Validation timed out. Please try again.');
		}

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Validation] Error:', err);
		throw error(500, 'An unexpected error occurred during validation.');
	}
};

/**
 * Extract the top 5 most common issues across all pages
 */
function extractCommonIssues(
	pageResults: { details?: { flaggedCode?: FlaggedCode[] } }[]
): CommonIssue[] {
	const issueMap = new Map<string, number>();

	for (const page of pageResults) {
		if (page.details?.flaggedCode) {
			for (const issue of page.details.flaggedCode) {
				const key = issue.message;
				issueMap.set(key, (issueMap.get(key) || 0) + 1);
			}
		}
	}

	return Array.from(issueMap.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([issue, count]) => ({ issue, count }));
}

/**
 * Generate smart recommendations based on validation results
 */
function generateRecommendations(data: WorkerResponse): Recommendation[] {
	const recommendations: Recommendation[] = [];

	if (!data.passed) {
		recommendations.push({
			type: 'critical',
			title: 'GSAP Check Failed',
			description:
				'This template contains GSAP, legacy interaction, or custom-code issues that may violate interaction guidelines.',
			action: 'Review and fix all flagged code, then rerun the GSAP check before submission.',
			required: true,
			priority: 1
		});
	}

	const totalFlagged =
		data.pageResults?.reduce((total, page) => total + (page.flaggedCodeCount || 0), 0) || 0;
	if (totalFlagged > 0) {
		recommendations.push({
			type: 'warning',
			title: 'Custom Code Issues Found',
			description: `${totalFlagged} instances of flagged code detected across pages.`,
			action: 'Use only approved GSAP implementations and remove custom CSS animations.',
			required: true,
			priority: 2
		});
	}

	const totalSecurity =
		data.pageResults?.reduce((total, page) => total + (page.summary?.securityRiskCount || 0), 0) ||
		0;
	if (totalSecurity > 0) {
		recommendations.push({
			type: 'critical',
			title: 'Security Risks Detected',
			description: `${totalSecurity} security risks found in custom code.`,
			action: 'Remove all potentially harmful code immediately.',
			required: true,
			priority: 1
		});
	}

	if (data.passed) {
		recommendations.push({
			type: 'success',
			title: 'GSAP Check Passed',
			description:
				'No GSAP, legacy interaction, or custom-code issues were found in the crawled pages.',
			action: 'Run the Webflow Way Validator app for the required full submission pass.',
			required: false,
			priority: 3
		});
	}

	return recommendations.sort((a, b) => (a.priority || 99) - (b.priority || 99));
}
