import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

interface ValidationResult {
	url: string;
	valid: boolean;
	issues: ValidationIssue[];
	warnings: ValidationIssue[];
	summary: {
		totalIssues: number;
		totalWarnings: number;
		gsapDetected: boolean;
		scrollTriggerDetected: boolean;
	};
}

interface ValidationIssue {
	type: string;
	message: string;
	severity: 'error' | 'warning' | 'info';
	line?: number;
}

// Patterns to detect GSAP usage
const GSAP_PATTERNS = {
	gsapCore: /gsap\.(to|from|fromTo|set|timeline|registerPlugin)/gi,
	scrollTrigger: /ScrollTrigger/gi,
	scrollSmooth: /ScrollSmoother/gi,
	gsapCdn: /cdnjs\.cloudflare\.com\/ajax\/libs\/gsap/gi,
	gsapNpm: /gsap\/dist\//gi,
	tweenMax: /TweenMax|TweenLite/gi,
	timelineMax: /TimelineMax|TimelineLite/gi
};

// Webflow-specific issues to check
const WEBFLOW_ISSUES = {
	ixTrigger: /data-w-id.*ix-trigger/gi,
	wfAnimation: /\.w-lightbox|\.w-slider|\.w-tabs/gi
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	let body: { url?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const url = body.url?.trim();
	if (!url) {
		throw error(400, 'URL is required');
	}

	// Validate URL format
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			throw new Error('Invalid protocol');
		}
	} catch {
		throw error(400, 'Invalid URL format. Must be a valid HTTP/HTTPS URL.');
	}

	try {
		// Fetch the page HTML
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Webflow-Dashboard-Validator/1.0'
			}
		});

		if (!response.ok) {
			throw error(400, `Failed to fetch URL: ${response.status} ${response.statusText}`);
		}

		const html = await response.text();
		const issues: ValidationIssue[] = [];
		const warnings: ValidationIssue[] = [];

		// Check for GSAP usage
		let gsapDetected = false;
		let scrollTriggerDetected = false;

		if (GSAP_PATTERNS.gsapCore.test(html)) {
			gsapDetected = true;
			issues.push({
				type: 'gsap-detected',
				message: 'GSAP animation library detected. GSAP is not allowed in Webflow Marketplace templates.',
				severity: 'error'
			});
		}

		if (GSAP_PATTERNS.scrollTrigger.test(html)) {
			scrollTriggerDetected = true;
			issues.push({
				type: 'scrolltrigger-detected',
				message: 'GSAP ScrollTrigger plugin detected. This is not allowed in Marketplace templates.',
				severity: 'error'
			});
		}

		if (GSAP_PATTERNS.scrollSmooth.test(html)) {
			issues.push({
				type: 'scrollsmoother-detected',
				message: 'GSAP ScrollSmoother plugin detected. This is not allowed in Marketplace templates.',
				severity: 'error'
			});
		}

		if (GSAP_PATTERNS.gsapCdn.test(html) || GSAP_PATTERNS.gsapNpm.test(html)) {
			gsapDetected = true;
			issues.push({
				type: 'gsap-import',
				message: 'GSAP library import detected via CDN or npm.',
				severity: 'error'
			});
		}

		if (GSAP_PATTERNS.tweenMax.test(html) || GSAP_PATTERNS.timelineMax.test(html)) {
			gsapDetected = true;
			issues.push({
				type: 'gsap-legacy',
				message: 'Legacy GSAP (TweenMax/TimelineMax) detected. These are not allowed.',
				severity: 'error'
			});
		}

		// Check for Webflow Interactions (good practice)
		if (WEBFLOW_ISSUES.ixTrigger.test(html)) {
			warnings.push({
				type: 'webflow-interactions',
				message: 'Webflow Interactions detected. Make sure all animations use native Webflow tools.',
				severity: 'info'
			});
		}

		// Check for potential issues
		if (html.includes('locomotive-scroll') || html.includes('LocomotiveScroll')) {
			warnings.push({
				type: 'locomotive-scroll',
				message: 'Locomotive Scroll detected. Consider using native Webflow scroll animations instead.',
				severity: 'warning'
			});
		}

		if (html.includes('lenis') || html.includes('Lenis')) {
			warnings.push({
				type: 'lenis',
				message: 'Lenis scroll library detected. Verify this is allowed for your template category.',
				severity: 'warning'
			});
		}

		// Check for common performance issues
		if ((html.match(/<script/gi) || []).length > 20) {
			warnings.push({
				type: 'many-scripts',
				message: 'High number of script tags detected. This may affect template performance.',
				severity: 'warning'
			});
		}

		const result: ValidationResult = {
			url,
			valid: issues.length === 0,
			issues,
			warnings,
			summary: {
				totalIssues: issues.length,
				totalWarnings: warnings.length,
				gsapDetected,
				scrollTriggerDetected
			}
		};

		return json(result);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Validation error:', err);
		throw error(500, 'Failed to validate URL');
	}
};
