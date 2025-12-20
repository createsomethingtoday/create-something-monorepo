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

export const POST: RequestHandler = async ({ request, locals }) => {
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
		console.log(`[Validation] Validating URL: ${url}`);

		// Call the external GSAP validation worker
		const response = await fetch(WORKER_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				url,
				maxDepth: 1,
				maxPages: 50
			})
		});

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

		// Process and format the validation results
		const result: ValidationResult = {
			url: workerData.url,
			success: workerData.success,
			passed: workerData.passed,
			timestamp: new Date().toISOString(),
			summary: {
				totalPages: workerData.siteResults?.pageCount || 0,
				analyzedPages: workerData.siteResults?.analyzedCount || 0,
				passedPages: workerData.siteResults?.passedCount || 0,
				failedPages: workerData.siteResults?.failedCount || 0,
				passRate: workerData.siteResults?.pageCount
					? Math.round(
							(workerData.siteResults.passedCount / workerData.siteResults.pageCount) * 100
						)
					: 0
			},
			issues: {
				totalFlaggedCode:
					workerData.pageResults?.reduce((total, page) => total + (page.flaggedCodeCount || 0), 0) ||
					0,
				totalSecurityRisks:
					workerData.pageResults?.reduce(
						(total, page) => total + (page.summary?.securityRiskCount || 0),
						0
					) || 0,
				totalValidGsap:
					workerData.pageResults?.reduce(
						(total, page) => total + (page.summary?.validGsapCount || 0),
						0
					) || 0,
				commonIssues: extractCommonIssues(workerData.pageResults || [])
			},
			pageResults: (workerData.pageResults || []).map(
				(page): PageResult => ({
					url: page.url,
					title: page.title,
					passed: page.passed,
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

		console.log(`[Validation] Completed for ${url}. Pass rate: ${result.summary.passRate}%`);

		return json(result);
	} catch (err) {
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
			title: 'Template Failed Validation',
			description: 'This template contains code that violates Webflow template guidelines.',
			action: 'Review and fix all flagged code before submission.',
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
			title: 'Template Validation Passed',
			description: 'All pages comply with Webflow template guidelines.',
			action: 'Template is ready for submission to the marketplace.',
			required: false,
			priority: 3
		});
	}

	return recommendations.sort((a, b) => (a.priority || 99) - (b.priority || 99));
}
