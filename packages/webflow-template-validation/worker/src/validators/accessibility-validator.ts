/**
 * Accessibility Validator - WCAG compliance and accessibility analysis
 *
 * Validates:
 * - Alt text coverage and quality
 * - Heading structure and hierarchy
 * - Form labels and accessibility
 * - Focus management
 */

import {
	AccessibilityAnalysisResult,
	ValidationIssue,
	AccessibilityAudit,
	ParsedHTML
} from '../types';
import { fetchHTML, isPlatformManagedHeading, parseHTML } from '../utils/fetch-utils';
import { analyzeHeadingSequence, extractDocumentOutline, visibleOutlineHeadings } from '../utils/document-outline';

export async function validateAccessibility(siteUrl: string): Promise<AccessibilityAnalysisResult> {
	console.log(`Starting accessibility validation for ${siteUrl}`);

	try {
		// Fetch and parse the homepage
		const htmlResult = await fetchHTML(siteUrl);
		const parsedHTML = parseHTML(htmlResult.html);

		// Perform comprehensive accessibility audit
		const audit = await performAccessibilityAudit(parsedHTML);

		// Generate accessibility issues
		const issues = generateAccessibilityIssues(audit, parsedHTML);

		// Calculate accessibility statistics
		const stats = calculateAccessibilityStats(audit);

		return {
			issues,
			stats,
			audit
		};

	} catch (error) {
		console.error('Accessibility validation error:', error);
		return {
			issues: [{
				id: 'accessibility-analysis-failed',
				category: 'Accessibility & WCAG',
				severity: 'warning',
				message: 'Accessibility analysis could not be completed',
				description: `Error analyzing accessibility: ${error instanceof Error ? error.message : 'Unknown error'}`,
				howToFix: 'Check that the site URL is accessible for accessibility analysis'
			}],
			stats: {
				missingAltText: 0,
				headingStructureErrors: 0,
				wcagComplianceScore: 0
			},
			audit: createEmptyAudit()
		};
	}
}

async function performAccessibilityAudit(parsedHTML: ParsedHTML): Promise<AccessibilityAudit> {
	// Analyze alt text coverage
	const altTextCoverage = analyzeAltTextCoverage(parsedHTML);

	// Analyze heading structure
	const headingStructure = await analyzeHeadingStructure(parsedHTML);

	// Analyze form labels
	const formLabels = analyzeFormLabels(parsedHTML);

	// Analyze focus management
	const focusManagement = analyzeFocusManagement(parsedHTML);

	return {
		altTextCoverage,
		headingStructure,
		formLabels,
		focusManagement
	};
}

function analyzeAltTextCoverage(parsedHTML: ParsedHTML): any {
	let totalImages = 0;
	let imagesWithAlt = 0;
	const imagesWithoutAlt: Array<{ src: string; context: string; isDecorative: boolean; selector?: string }> = [];

	parsedHTML.images.forEach((img, index) => {
		if (shouldIgnoreImageForAltAudit(img)) return;

		totalImages++;
		const alt = img.getAttribute('alt');
		const src = getImageSource(img);

		if (alt !== null) {
			imagesWithAlt++;
		} else {
			// Determine if image might be decorative
			const isDecorative = isLikelyDecorativeImage(img);

			imagesWithoutAlt.push({
				src: src.substring(0, 100), // Truncate long URLs
				context: determineImageContext(img, index),
				isDecorative,
				selector: buildImageSelector(img, index)
			});
		}
	});

	const coveragePercentage = totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 100;

	return {
		totalImages,
		imagesWithAlt,
		imagesWithoutAlt,
		coveragePercentage
	};
}

async function analyzeHeadingStructure(parsedHTML: ParsedHTML): Promise<any> {
	// Prefer the visible document outline (hidden-ancestor aware); fall back
	// to the flat regex-extracted list when HTMLRewriter is unavailable.
	const outline = await extractDocumentOutline(parsedHTML.rawHtml);
	const headings = outline && outline.length > 0
		? visibleOutlineHeadings(outline).map(heading => ({ level: heading.level, text: heading.text }))
		: parsedHTML.headings
			.filter(h => !isPlatformManagedHeading(h))
			.map(h => ({
				level: parseInt(h.tagName.substring(1), 10),
				text: h.textContent?.trim() || ''
			}));

	const errors: Array<{ type: string; description: string; element: string }> = [];
	const sequence = analyzeHeadingSequence(headings);

	// Check for multiple H1s
	if (sequence.h1Count > 1) {
		errors.push({
			type: 'multiple_h1',
			description: `Found ${sequence.h1Count} H1 elements (should have exactly 1)`,
			element: 'h1'
		});
	} else if (sequence.h1Count === 0) {
		errors.push({
			type: 'multiple_h1',
			description: 'No H1 element found (should have exactly 1)',
			element: 'h1'
		});
	}

	// Check for skipped heading levels
	for (const skip of sequence.skips) {
		errors.push({
			type: 'skipped_level',
			description: `Heading level ${skip.toLevel} follows level ${skip.fromLevel} (skipped level ${skip.missingLevel})`,
			element: `h${skip.toLevel}`
		});
	}

	// Check for empty headings
	headings.forEach(heading => {
		if (!heading.text || heading.text.length === 0) {
			errors.push({
				type: 'empty_heading',
				description: 'Heading element has no text content',
				element: `h${heading.level}`
			});
		}
	});

	return {
		isValid: errors.length === 0,
		errors
	};
}

function analyzeFormLabels(parsedHTML: ParsedHTML): any {
	const forms = parsedHTML.forms;
	let totalInputs = 0;
	let inputsWithLabels = 0;
	const unlabeledInputs: Array<{ type: string; id?: string; placeholder?: string }> = [];

	forms.forEach(form => {
		const inputs = Array.from(form.querySelectorAll<HTMLElement>('input, textarea, select'));

		inputs.forEach(input => {
			const id = input.getAttribute('id');
			const type = (input.getAttribute('type') || 'text').toLowerCase();
			const placeholder = input.getAttribute('placeholder');
			if (input.tagName.toLowerCase() === 'input' && isNonLabelableInputType(type)) {
				return;
			}

			totalInputs++;

			// Check for associated label
			const hasLabel = id && form.querySelector(`label[for="${id}"]`) !== null;

			// Check for aria-label or aria-labelledby
			const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');

			if (hasLabel || hasAriaLabel) {
				inputsWithLabels++;
			} else {
				unlabeledInputs.push({
					type,
					id: id || undefined,
					placeholder: placeholder || undefined
				});
			}
		});
	});

	return {
		totalInputs,
		inputsWithLabels,
		unlabeledInputs
	};
}

function isNonLabelableInputType(type: string): boolean {
	return ['button', 'hidden', 'image', 'reset', 'submit'].includes(type);
}

function analyzeFocusManagement(parsedHTML: ParsedHTML): any {
	// Get all potentially focusable elements
	const focusableSelectors = [
		'a[href]',
		'button',
		'input',
		'textarea',
		'select',
		'[tabindex]'
	];

	let focusableElements = 0;
	let elementsWithoutFocusStyles = 0;
	const tabOrderIssues: Array<{ element: string; issue: string }> = [];

	focusableSelectors.forEach(selector => {
		const elements = Array.from(parsedHTML.document.querySelectorAll<HTMLElement>(selector));
		focusableElements += elements.length;

		elements.forEach(element => {
			const tabIndex = element.getAttribute('tabindex');

			// Check for problematic tabindex values
			if (tabIndex && parseInt(tabIndex) > 0) {
				tabOrderIssues.push({
					element: selector,
					issue: `Positive tabindex (${tabIndex}) disrupts natural tab order`
				});
			}

			// In a full implementation, you'd check computed styles for focus indicators
			// For now, we'll estimate based on common patterns
			const hasCustomFocusStyle = element.getAttribute('class')?.includes('focus') ||
				element.hasAttribute('style');

			if (!hasCustomFocusStyle) {
				elementsWithoutFocusStyles++;
			}
		});
	});

	return {
		focusableElements,
		elementsWithoutFocusStyles,
		tabOrderIssues
	};
}

function generateAccessibilityIssues(audit: AccessibilityAudit, parsedHTML: ParsedHTML): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Alt text issues
	if (audit.altTextCoverage.imagesWithoutAlt.length > 0) {
		const criticalImages = audit.altTextCoverage.imagesWithoutAlt.filter(img => !img.isDecorative);

		if (criticalImages.length > 0) {
			issues.push({
				id: 'missing-alt-text-critical',
				category: 'Accessibility & WCAG',
				severity: 'error',
				message: `${criticalImages.length} images missing alt text (${audit.altTextCoverage.coveragePercentage}% coverage)`,
				description: 'Images without alt text are inaccessible to screen readers and other assistive technologies.',
				howToFix: 'Add descriptive alt text to all content images. Use alt="" for decorative images.',
				details: {
					imagesWithoutAlt: criticalImages.slice(0, 10), // Limit for readability
					totalImages: audit.altTextCoverage.totalImages,
					coveragePercentage: audit.altTextCoverage.coveragePercentage
				}
			});
		}
	}

	// Heading structure issues
	if (!audit.headingStructure.isValid) {
		const severity = audit.headingStructure.errors.some(e => e.type === 'multiple_h1') ? 'error' : 'warning';

		issues.push({
			id: 'heading-structure-errors',
			category: 'Accessibility & WCAG',
			severity,
			message: `${audit.headingStructure.errors.length} heading structure error(s)`,
			description: 'Proper heading hierarchy is essential for screen reader navigation and SEO.',
			howToFix: 'Use exactly one H1 per page and follow sequential heading levels (H1 → H2 → H3, etc.)',
			details: {
				errors: audit.headingStructure.errors
			}
		});
	}

	// Form label issues
	if (audit.formLabels.unlabeledInputs.length > 0) {
		issues.push({
			id: 'form-labels-missing',
			category: 'Accessibility & WCAG',
			severity: 'error',
			message: `${audit.formLabels.unlabeledInputs.length} form inputs missing labels`,
			description: 'Form inputs without labels are inaccessible to screen reader users.',
			howToFix: 'Add <label> elements for all form inputs, or use aria-label attributes',
			details: {
				unlabeledInputs: audit.formLabels.unlabeledInputs,
				totalInputs: audit.formLabels.totalInputs,
				labelCoverage: Math.round((audit.formLabels.inputsWithLabels / audit.formLabels.totalInputs) * 100)
			}
		});
	}

	// Focus management issues
	if (audit.focusManagement.tabOrderIssues.length > 0) {
		issues.push({
			id: 'tab-order-issues',
			category: 'Accessibility & WCAG',
			severity: 'warning',
			message: `${audit.focusManagement.tabOrderIssues.length} tab order issue(s)`,
			description: 'Improper tab order makes keyboard navigation difficult.',
			howToFix: 'Avoid positive tabindex values; use logical source order instead',
			details: {
				tabOrderIssues: audit.focusManagement.tabOrderIssues
			}
		});
	}

	return issues;
}

function calculateAccessibilityStats(audit: AccessibilityAudit) {
	const missingAltText = audit.altTextCoverage.imagesWithoutAlt.filter(img => !img.isDecorative).length;
	const headingStructureErrors = audit.headingStructure.errors.length;

	// Calculate overall WCAG compliance score (simplified)
	const totalChecks = 7; // Remaining deterministic accessibility checks performed
	let passedChecks = totalChecks;

	if (missingAltText > 0) passedChecks -= 2; // Moderate deduction
	if (headingStructureErrors > 0) passedChecks -= 2; // Moderate deduction
	if (audit.formLabels.unlabeledInputs.length > 0) passedChecks -= 2; // Moderate deduction
	if (audit.focusManagement.tabOrderIssues.length > 0) passedChecks -= 1; // Minor deduction

	const wcagComplianceScore = Math.max(0, Math.round((passedChecks / totalChecks) * 100));

	return {
		missingAltText,
		headingStructureErrors,
		wcagComplianceScore
	};
}

const VIDEO_FALLBACK_ANCESTOR_SELECTOR = [
	'.w-background-video',
	'.w-video',
	'[data-video-urls]',
	'[data-video-url]',
	'[data-poster-url]'
].join(', ');

function isLikelyDecorativeImage(img: any): boolean {
	// Heuristics to determine if image is likely decorative
	const src = getImageSource(img);
	const className = img.getAttribute('class') || '';

	// Check for common decorative patterns
	const decorativePatterns = [
		/decoration/i,
		/ornament/i,
		/divider/i,
		/spacer/i,
		/bg-/i,
		/background/i
	];

	return decorativePatterns.some(pattern =>
		pattern.test(src) || pattern.test(className)
	);
}

function shouldIgnoreImageForAltAudit(img: any): boolean {
	const alt = img.getAttribute?.('alt');
	if (typeof alt === 'string' && alt.trim() === '') return true;

	const role = (img.getAttribute?.('role') || '').toLowerCase();
	if (role === 'presentation' || role === 'none') return true;

	if ((img.getAttribute?.('aria-hidden') || '').toLowerCase() === 'true') return true;

	return isLikelyPlatformVideoFallbackImage(img);
}

function isLikelyPlatformVideoFallbackImage(img: any): boolean {
	if (typeof img.closest === 'function' && img.closest(VIDEO_FALLBACK_ANCESTOR_SELECTOR)) {
		return true;
	}

	const className = String(img.getAttribute?.('class') || img.className || '').toLowerCase();
	const src = getImageSource(img).toLowerCase();
	const attrs = [
		img.getAttribute?.('data-wf-bgvideo-fallback-img'),
		img.getAttribute?.('data-poster-url'),
		img.getAttribute?.('data-video-urls'),
		img.getAttribute?.('data-video-url')
	].filter(Boolean).join(' ').toLowerCase();

	return (
		/\b(w-background-video|w-video|video-fallback|fallback-image|poster-image)\b/.test(className) ||
		/\b(video-fallback|fallback-image|poster-image)\b/.test(src) ||
		isWebflowGeneratedVideoPosterSource(src) ||
		attrs.length > 0
	);
}

function isWebflowGeneratedVideoPosterSource(src: string): boolean {
	return /(?:^|[/_-])[^/?#]*(?:[_-]poster|poster)\.\d+\.(?:jpe?g|png|webp|avif)(?:$|[?#])/.test(src);
}

function determineImageContext(img: any, index: number): string {
	const src = getImageSource(img);
	const className = String(img.getAttribute?.('class') || img.className || '').toLowerCase();

	if (src.includes('hero') || className.includes('hero') || index === 0) return 'hero-image';
	if (src.includes('logo') || className.includes('logo')) return 'logo';
	if (src.includes('thumb') || src.includes('preview') || className.includes('thumb')) return 'thumbnail';

	return 'content-image';
}

function getImageSource(img: any): string {
	return img.getAttribute?.('src') || img.getAttribute?.('data-src') || img.src || 'unknown';
}

function buildImageSelector(img: any, index: number): string {
	const id = img.getAttribute?.('id');
	if (id) return `#${id}`;

	const className = String(img.getAttribute?.('class') || '').trim();
	if (className) {
		const firstClass = className.split(/\s+/).find(Boolean);
		if (firstClass) return `img.${firstClass}`;
	}

	const src = getImageSource(img);
	if (src && src !== 'unknown') return `img[src*="${getAssetNameFromUrl(src)}"]`;

	return `img:nth-of-type(${index + 1})`;
}

function getAssetNameFromUrl(value: string): string {
	try {
		const pathname = new URL(value, 'https://example.com').pathname;
		return pathname.split('/').pop() || value;
	} catch {
		return value.split('/').pop() || value;
	}
}

function createEmptyAudit(): AccessibilityAudit {
	return {
		altTextCoverage: {
			totalImages: 0,
			imagesWithAlt: 0,
			imagesWithoutAlt: [],
			coveragePercentage: 100
		},
		headingStructure: {
			isValid: true,
			errors: []
		},
		formLabels: {
			totalInputs: 0,
			inputsWithLabels: 0,
			unlabeledInputs: []
		},
		focusManagement: {
			focusableElements: 0,
			elementsWithoutFocusStyles: 0,
			tabOrderIssues: []
		}
	};
}
