import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ValidationRequest {
	url: string;
}

interface ValidationResult {
	url: string;
	status: 'pass' | 'warning' | 'fail';
	summary: {
		totalPages: number;
		pagesWithGsap: number;
		hasGsapClub: boolean;
		hasCustomCode: boolean;
	};
	findings: Array<{
		type: 'gsap' | 'custom_code' | 'warning';
		severity: 'info' | 'warning' | 'error';
		message: string;
		page?: string;
		details?: string;
	}>;
	recommendations: string[];
}

/**
 * GSAP Validation API
 *
 * Note: Full URL crawling requires server-side capabilities (Puppeteer/Playwright).
 * This is a placeholder implementation that performs basic URL validation
 * and returns mock results for the UI to display.
 *
 * In production, this would:
 * 1. Crawl the Webflow site to discover all pages
 * 2. Fetch and parse each page's HTML
 * 3. Detect GSAP usage and custom code patterns
 * 4. Return detailed validation results
 */
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
		throw error(400, 'Please enter a valid Webflow site URL (https://...webflow.io)');
	}

	try {
		// In a full implementation, this would crawl the site
		// For now, return a placeholder response that shows the UI works
		const result: ValidationResult = {
			url,
			status: 'pass',
			summary: {
				totalPages: 1,
				pagesWithGsap: 0,
				hasGsapClub: false,
				hasCustomCode: false
			},
			findings: [
				{
					type: 'warning',
					severity: 'info',
					message:
						'This is a placeholder validation. Full URL crawling requires server-side implementation.',
					details:
						'The validation API endpoint is ready but needs Puppeteer or Playwright for full site analysis.'
				}
			],
			recommendations: [
				'Ensure GSAP is loaded from a CDN, not self-hosted',
				'Register for GSAP Club if using premium plugins',
				'Avoid custom code that modifies core Webflow functionality',
				'Test all animations work in all browsers'
			]
		};

		return json(result);
	} catch (err) {
		console.error('Validation error:', err);
		throw error(500, 'Validation failed');
	}
};
