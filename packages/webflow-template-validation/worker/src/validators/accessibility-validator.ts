/**
 * Accessibility Validator - WCAG compliance and accessibility analysis
 *
 * Validates:
 * - Color contrast ratios (WCAG AA/AAA)
 * - Alt text coverage and quality
 * - Heading structure and hierarchy
 * - Form labels and accessibility
 * - Focus management
 */

import {
	AccessibilityAnalysisResult,
	ValidationIssue,
	AccessibilityAudit,
	ContrastAudit,
	ParsedHTML
} from '../types';
import { fetchHTML, parseHTML } from '../utils/fetch-utils';

const WCAG_CONTRAST_RATIOS = {
	AA_NORMAL: 4.5,
	AA_LARGE: 3.0,
	AAA_NORMAL: 7.0,
	AAA_LARGE: 4.5
};

type StyleDeclarationMap = Record<string, string>;

type ParsedStyleRule = {
	selector: string;
	declarations: StyleDeclarationMap;
	specificity: number;
	order: number;
};

type SimpleSelector = {
	tag?: string;
	id?: string;
	classes: string[];
};

type RgbaColor = {
	r: number;
	g: number;
	b: number;
	a: number;
};

const TEXT_ELEMENT_REGEX = /<(p|h1|h2|h3|h4|h5|h6|a|button|label|li|small|strong|em|figcaption|blockquote|span|div)\b([^>]*)>([\s\S]*?)<\/\1>/gi;

const NAMED_COLORS: Record<string, string> = {
	black: '#000000',
	white: '#ffffff',
	gray: '#808080',
	grey: '#808080',
	silver: '#c0c0c0',
	red: '#ff0000',
	maroon: '#800000',
	yellow: '#ffff00',
	olive: '#808000',
	lime: '#00ff00',
	green: '#008000',
	aqua: '#00ffff',
	teal: '#008080',
	blue: '#0000ff',
	navy: '#000080',
	fuchsia: '#ff00ff',
	purple: '#800080',
	orange: '#ffa500',
	pink: '#ffc0cb',
	brown: '#a52a2a',
	transparent: 'rgba(0, 0, 0, 0)'
};

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
				contrastViolations: 0,
				missingAltText: 0,
				headingStructureErrors: 0,
				wcagComplianceScore: 0
			},
			audit: createEmptyAudit()
		};
	}
}

async function performAccessibilityAudit(parsedHTML: ParsedHTML): Promise<AccessibilityAudit> {
	// Analyze color contrast (simplified - would need computed styles in full implementation)
	const colorContrast = await analyzeColorContrast(parsedHTML);

	// Analyze alt text coverage
	const altTextCoverage = analyzeAltTextCoverage(parsedHTML);

	// Analyze heading structure
	const headingStructure = analyzeHeadingStructure(parsedHTML);

	// Analyze form labels
	const formLabels = analyzeFormLabels(parsedHTML);

	// Analyze focus management
	const focusManagement = analyzeFocusManagement(parsedHTML);

	return {
		colorContrast,
		altTextCoverage,
		headingStructure,
		formLabels,
		focusManagement
	};
}

async function analyzeColorContrast(parsedHTML: ParsedHTML): Promise<ContrastAudit[]> {
	const rawHtml = parsedHTML.rawHtml || parsedHTML.document.body?.innerHTML || '';
	if (!rawHtml) {
		return [];
	}

	const contrastHtml = stripIgnoredContrastContent(rawHtml);
	const rules = parseCssRules(rawHtml);
	const baseStyles = resolveBaseStyles(rawHtml, rules);
	const audits: ContrastAudit[] = [];
	const seen = new Set<string>();
	let match: RegExpExecArray | null;
	TEXT_ELEMENT_REGEX.lastIndex = 0;

	while ((match = TEXT_ELEMENT_REGEX.exec(contrastHtml)) !== null) {
		const tag = match[1].toLowerCase();
		const attrs = parseAttributeString(match[2] || '');
		const innerHtml = match[3] || '';
		if (shouldSkipContrastElement(tag, attrs, innerHtml)) continue;

		const text = stripTags(innerHtml).replace(/\s+/g, ' ').trim();

		if (!text) continue;
		if ((tag === 'div' || tag === 'span') && !attrs.style && !attrs.class && !attrs.id) continue;

		const computedStyles = resolveComputedStyles(tag, attrs, rules, baseStyles);
		const backgroundColor = resolveBackgroundColor(computedStyles, baseStyles);
		const textColor = resolveTextColor(computedStyles, baseStyles);

		if (!textColor || !backgroundColor) continue;

		const effectiveBackground = backgroundColor.a < 1
			? compositeColor(backgroundColor, FALLBACK_BACKGROUND_COLOR)
			: backgroundColor;
		const effectiveText = textColor.a < 1
			? compositeColor(textColor, effectiveBackground)
			: textColor;

		const contrastRatio = roundContrast(calculateContrastRatio(effectiveText, effectiveBackground));
		const fontSizePx = toPx(computedStyles['font-size'] || computedStyles.fontSize);
		const fontWeight = parseFontWeight(computedStyles['font-weight'] || computedStyles.fontWeight);
		const isLargeText = fontSizePx !== null &&
			(fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700));
		const aaThreshold = isLargeText ? WCAG_CONTRAST_RATIOS.AA_LARGE : WCAG_CONTRAST_RATIOS.AA_NORMAL;
		const aaaThreshold = isLargeText ? WCAG_CONTRAST_RATIOS.AAA_LARGE : WCAG_CONTRAST_RATIOS.AAA_NORMAL;
		const wcagLevel = contrastRatio >= aaaThreshold ? 'AAA' : contrastRatio >= aaThreshold ? 'AA' : 'FAIL';

		if (wcagLevel !== 'FAIL') continue;

		const selector = buildElementSelector(tag, attrs);
		const dedupeKey = `${selector}:${formatColor(effectiveText)}:${formatColor(effectiveBackground)}`;
		if (seen.has(dedupeKey)) continue;
		seen.add(dedupeKey);

		audits.push({
			selector,
			textColor: formatColor(effectiveText),
			backgroundColor: formatColor(effectiveBackground),
			contrastRatio,
			wcagLevel,
			recommendation: `Increase contrast to at least ${aaThreshold}:1 for ${isLargeText ? 'large' : 'normal'} text.`
		});

		if (audits.length >= 25) break;
	}

	return audits;
}

function stripIgnoredContrastContent(html: string): string {
	return html
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
		.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
		.replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, ' ')
		.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, ' ')
		.replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, ' ');
}

function shouldSkipContrastElement(
	tag: string,
	attrs: Record<string, string>,
	innerHtml: string
): boolean {
	if (tag === 'pre' || tag === 'code') return true;
	if (/<(?:pre|code)\b/i.test(innerHtml)) return true;

	const className = attrs.class || '';
	return /\b(w-code-block|hljs|language-[^\s]+|token|code-block|install-code-block)\b/i.test(className);
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

function analyzeHeadingStructure(parsedHTML: ParsedHTML): any {
	const headings = parsedHTML.headings;
	const errors: Array<{ type: string; description: string; element: string }> = [];

	// Check for multiple H1s
	const h1Count = headings.filter(h => h.tagName.toLowerCase() === 'h1').length;
	if (h1Count > 1) {
		errors.push({
			type: 'multiple_h1',
			description: `Found ${h1Count} H1 elements (should have exactly 1)`,
			element: 'h1'
		});
	} else if (h1Count === 0) {
		errors.push({
			type: 'multiple_h1',
			description: 'No H1 element found (should have exactly 1)',
			element: 'h1'
		});
	}

	// Check for skipped heading levels
	const headingLevels = headings.map(h => parseInt(h.tagName.substring(1)));
	for (let i = 1; i < headingLevels.length; i++) {
		const current = headingLevels[i];
		const previous = headingLevels[i - 1];

		if (current > previous + 1) {
			errors.push({
				type: 'skipped_level',
				description: `Heading level ${current} follows level ${previous} (skipped level ${previous + 1})`,
				element: `h${current}`
			});
		}
	}

	// Check for empty headings
	headings.forEach(heading => {
		const text = heading.textContent?.trim();
		if (!text || text.length === 0) {
			errors.push({
				type: 'empty_heading',
				description: 'Heading element has no text content',
				element: heading.tagName.toLowerCase()
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

	// Color contrast issues
	const contrastViolations = audit.colorContrast.filter(c => c.wcagLevel === 'FAIL');
	if (contrastViolations.length > 0) {
		issues.push({
			id: 'color-contrast-violations',
			category: 'Accessibility & WCAG',
			severity: 'error',
			message: `${contrastViolations.length} color contrast violations (WCAG AA)`,
			description: 'Insufficient color contrast makes text difficult to read for users with visual impairments.',
			howToFix: 'Increase contrast by using darker text colors or lighter background colors',
			details: {
				violations: contrastViolations.map(v => ({
					selector: v.selector,
					contrastRatio: v.contrastRatio,
					required: WCAG_CONTRAST_RATIOS.AA_NORMAL,
					recommendation: v.recommendation
				}))
			}
		});
	}

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
	const contrastViolations = audit.colorContrast.filter(c => c.wcagLevel === 'FAIL').length;
	const missingAltText = audit.altTextCoverage.imagesWithoutAlt.filter(img => !img.isDecorative).length;
	const headingStructureErrors = audit.headingStructure.errors.length;

	// Calculate overall WCAG compliance score (simplified)
	const totalChecks = 10; // Total accessibility checks performed
	let passedChecks = totalChecks;

	if (contrastViolations > 0) passedChecks -= 3; // Major deduction
	if (missingAltText > 0) passedChecks -= 2; // Moderate deduction
	if (headingStructureErrors > 0) passedChecks -= 2; // Moderate deduction
	if (audit.formLabels.unlabeledInputs.length > 0) passedChecks -= 2; // Moderate deduction
	if (audit.focusManagement.tabOrderIssues.length > 0) passedChecks -= 1; // Minor deduction

	const wcagComplianceScore = Math.max(0, Math.round((passedChecks / totalChecks) * 100));

	return {
		contrastViolations,
		missingAltText,
		headingStructureErrors,
		wcagComplianceScore
	};
}

const FALLBACK_TEXT_COLOR: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };
const FALLBACK_BACKGROUND_COLOR: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };

function parseCssRules(rawHtml: string): ParsedStyleRule[] {
	const styleBlocks = Array.from(rawHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
		.map((match) => match[1] || '');
	const css = styleBlocks
		.map((block) => block.replace(/\/\*[\s\S]*?\*\//g, ' '))
		.join('\n');
	const rules: ParsedStyleRule[] = [];
	const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
	let match: RegExpExecArray | null;
	let order = 0;

	while ((match = ruleRegex.exec(css)) !== null) {
		const selectorList = match[1]?.split(',').map((selector) => selector.trim()).filter(Boolean) || [];
		const declarations = parseStyleDeclarations(match[2] || '');
		if (Object.keys(declarations).length === 0) continue;

		for (const selector of selectorList) {
			const parsedSelector = parseSimpleSelector(selector);
			if (!parsedSelector) continue;

			rules.push({
				selector,
				declarations,
				specificity: calculateSpecificity(parsedSelector),
				order: order++
			});
		}
	}

	return rules;
}

function parseStyleDeclarations(styleText: string): StyleDeclarationMap {
	return styleText
		.split(';')
		.map((declaration) => declaration.trim())
		.filter(Boolean)
		.reduce<StyleDeclarationMap>((styles, declaration) => {
			const separatorIndex = declaration.indexOf(':');
			if (separatorIndex === -1) return styles;

			const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
			const value = declaration.slice(separatorIndex + 1).trim();
			if (!property || !value) return styles;

			styles[property] = value;
			return styles;
		}, {});
}

function parseSimpleSelector(selector: string): SimpleSelector | null {
	const normalized = selector.trim();
	if (!normalized) return null;
	if (/[ >+~:[\]]/.test(normalized)) return null;

	const tagMatch = normalized.match(/^[a-z][a-z0-9-]*/i);
	const idMatches = Array.from(normalized.matchAll(/#([a-z0-9_-]+)/gi)).map((match) => match[1]);
	if (idMatches.length > 1) return null;

	return {
		tag: tagMatch ? tagMatch[0].toLowerCase() : undefined,
		id: idMatches[0],
		classes: Array.from(normalized.matchAll(/\.([a-z0-9_-]+)/gi)).map((match) => match[1])
	};
}

function calculateSpecificity(selector: SimpleSelector): number {
	return (selector.id ? 100 : 0) + selector.classes.length * 10 + (selector.tag ? 1 : 0);
}

function resolveBaseStyles(rawHtml: string, rules: ParsedStyleRule[]): StyleDeclarationMap {
	const baseStyles: StyleDeclarationMap = {
		color: '#000000',
		'background-color': '#ffffff'
	};
	const bodyAttrs = parseElementAttributes(rawHtml.match(/<body([^>]*)>/i)?.[1] || '');
	const htmlAttrs = parseElementAttributes(rawHtml.match(/<html([^>]*)>/i)?.[1] || '');

	for (const tag of ['html', 'body']) {
		const matchingRules = rules
			.filter((rule) => matchesSelector(parseSimpleSelector(rule.selector), tag, tag === 'body' ? bodyAttrs : htmlAttrs))
			.sort((left, right) => left.specificity - right.specificity || left.order - right.order);

		for (const rule of matchingRules) {
			Object.assign(baseStyles, rule.declarations);
		}
	}

	Object.assign(baseStyles, parseStyleDeclarations(htmlAttrs.style || ''));
	Object.assign(baseStyles, parseStyleDeclarations(bodyAttrs.style || ''));
	return baseStyles;
}

function resolveComputedStyles(
	tag: string,
	attrs: Record<string, string>,
	rules: ParsedStyleRule[],
	baseStyles: StyleDeclarationMap
): StyleDeclarationMap {
	const resolvedStyles: StyleDeclarationMap = { ...baseStyles };
	const matchingRules = rules
		.filter((rule) => matchesSelector(parseSimpleSelector(rule.selector), tag, attrs))
		.sort((left, right) => left.specificity - right.specificity || left.order - right.order);

	for (const rule of matchingRules) {
		Object.assign(resolvedStyles, rule.declarations);
	}

	Object.assign(resolvedStyles, parseStyleDeclarations(attrs.style || ''));
	return resolvedStyles;
}

function matchesSelector(
	selector: SimpleSelector | null,
	tag: string,
	attrs: Record<string, string>
): boolean {
	if (!selector) return false;
	if (selector.tag && selector.tag !== tag) return false;
	if (selector.id && selector.id !== attrs.id) return false;

	const elementClasses = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
	return selector.classes.every((className) => elementClasses.has(className));
}

function resolveTextColor(styles: StyleDeclarationMap, baseStyles: StyleDeclarationMap): RgbaColor | null {
	return parseCssColor(styles.color) || parseCssColor(baseStyles.color) || FALLBACK_TEXT_COLOR;
}

function resolveBackgroundColor(styles: StyleDeclarationMap, baseStyles: StyleDeclarationMap): RgbaColor | null {
	return (
		parseCssColor(styles['background-color']) ||
		parseCssColor(styles.background) ||
		parseCssColor(baseStyles['background-color']) ||
		parseCssColor(baseStyles.background) ||
		FALLBACK_BACKGROUND_COLOR
	);
}

function parseElementAttributes(attrText: string): Record<string, string> {
	return parseAttributeString(attrText || '');
}

function parseAttributeString(attrText: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const attrRegex = /([A-Za-z_:][-A-Za-z0-9_:.]*)=["']([^"']*)["']/g;
	let match: RegExpExecArray | null;

	while ((match = attrRegex.exec(attrText)) !== null) {
		attrs[match[1].toLowerCase()] = match[2];
	}

	return attrs;
}

function parseCssColor(value: string | undefined): RgbaColor | null {
	if (!value) return null;
	const normalized = value.trim().toLowerCase();
	if (!normalized) return null;

	if (normalized in NAMED_COLORS) {
		return parseCssColor(NAMED_COLORS[normalized]);
	}

	if (normalized === 'currentcolor' || normalized === 'inherit' || normalized === 'initial') {
		return null;
	}

	if (normalized.startsWith('#')) {
		return parseHexColor(normalized);
	}

	if (normalized.startsWith('rgb')) {
		return parseRgbColor(normalized);
	}

	if (normalized.startsWith('hsl')) {
		return parseHslColor(normalized);
	}

	const tokenMatch = normalized.match(/(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|\b[a-z]+\b)/i);
	if (tokenMatch && tokenMatch[1] !== normalized) {
		return parseCssColor(tokenMatch[1]);
	}

	return null;
}

function parseHexColor(value: string): RgbaColor | null {
	const hex = value.replace('#', '');
	if (![3, 4, 6, 8].includes(hex.length)) return null;

	const expand = (segment: string) => segment.length === 1 ? `${segment}${segment}` : segment;
	const r = parseInt(expand(hex.slice(0, hex.length <= 4 ? 1 : 2)), 16);
	const g = parseInt(expand(hex.slice(hex.length <= 4 ? 1 : 2, hex.length <= 4 ? 2 : 4)), 16);
	const b = parseInt(expand(hex.slice(hex.length <= 4 ? 2 : 4, hex.length <= 4 ? 3 : 6)), 16);
	const alphaHex = hex.length === 4 ? expand(hex.slice(3, 4)) : hex.length === 8 ? hex.slice(6, 8) : 'ff';

	return { r, g, b, a: parseInt(alphaHex, 16) / 255 };
}

function parseRgbColor(value: string): RgbaColor | null {
	const match = value.match(/rgba?\(([^)]+)\)/i);
	if (!match) return null;
	const parts = match[1].split(',').map((part) => part.trim());
	if (parts.length < 3) return null;

	const [r, g, b] = parts.slice(0, 3).map(parseRgbChannel);
	const a = parts[3] !== undefined ? clamp(parseFloat(parts[3]), 0, 1) : 1;
	if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;

	return { r, g, b, a };
}

function parseHslColor(value: string): RgbaColor | null {
	const match = value.match(/hsla?\(([^)]+)\)/i);
	if (!match) return null;
	const parts = match[1].split(',').map((part) => part.trim().replace('%', ''));
	if (parts.length < 3) return null;

	const h = ((parseFloat(parts[0]) % 360) + 360) % 360;
	const s = clamp(parseFloat(parts[1]) / 100, 0, 1);
	const l = clamp(parseFloat(parts[2]) / 100, 0, 1);
	const a = parts[3] !== undefined ? clamp(parseFloat(parts[3]), 0, 1) : 1;
	const chroma = (1 - Math.abs(2 * l - 1)) * s;
	const huePrime = h / 60;
	const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
	let r1 = 0;
	let g1 = 0;
	let b1 = 0;

	if (huePrime >= 0 && huePrime < 1) [r1, g1, b1] = [chroma, x, 0];
	else if (huePrime < 2) [r1, g1, b1] = [x, chroma, 0];
	else if (huePrime < 3) [r1, g1, b1] = [0, chroma, x];
	else if (huePrime < 4) [r1, g1, b1] = [0, x, chroma];
	else if (huePrime < 5) [r1, g1, b1] = [x, 0, chroma];
	else [r1, g1, b1] = [chroma, 0, x];

	const matchLightness = l - chroma / 2;
	return {
		r: Math.round((r1 + matchLightness) * 255),
		g: Math.round((g1 + matchLightness) * 255),
		b: Math.round((b1 + matchLightness) * 255),
		a
	};
}

function parseRgbChannel(value: string): number {
	if (value.endsWith('%')) {
		return Math.round(clamp(parseFloat(value) / 100, 0, 1) * 255);
	}
	return Math.round(clamp(parseFloat(value), 0, 255));
}

function compositeColor(foreground: RgbaColor, background: RgbaColor): RgbaColor {
	const alpha = foreground.a + background.a * (1 - foreground.a);
	if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };

	return {
		r: Math.round(((foreground.r * foreground.a) + (background.r * background.a * (1 - foreground.a))) / alpha),
		g: Math.round(((foreground.g * foreground.a) + (background.g * background.a * (1 - foreground.a))) / alpha),
		b: Math.round(((foreground.b * foreground.a) + (background.b * background.a * (1 - foreground.a))) / alpha),
		a: alpha
	};
}

function calculateContrastRatio(foreground: RgbaColor, background: RgbaColor): number {
	const foregroundLuminance = relativeLuminance(foreground);
	const backgroundLuminance = relativeLuminance(background);
	const lighter = Math.max(foregroundLuminance, backgroundLuminance);
	const darker = Math.min(foregroundLuminance, backgroundLuminance);

	return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color: RgbaColor): number {
	const transform = (channel: number) => {
		const normalized = channel / 255;
		return normalized <= 0.03928
			? normalized / 12.92
			: Math.pow((normalized + 0.055) / 1.055, 2.4);
	};

	return (0.2126 * transform(color.r)) + (0.7152 * transform(color.g)) + (0.0722 * transform(color.b));
}

function toPx(value: string | undefined): number | null {
	if (!value) return null;
	const normalized = value.trim().toLowerCase();
	if (!normalized) return null;

	if (normalized.endsWith('px')) {
		const parsed = parseFloat(normalized);
		return Number.isFinite(parsed) ? parsed : null;
	}

	if (/^\d+(\.\d+)?$/.test(normalized)) {
		return parseFloat(normalized);
	}

	return null;
}

function parseFontWeight(value: string | undefined): number {
	if (!value) return 400;
	const normalized = value.trim().toLowerCase();
	if (normalized === 'bold') return 700;
	if (normalized === 'normal') return 400;

	const parsed = parseInt(normalized, 10);
	return Number.isFinite(parsed) ? parsed : 400;
}

function buildElementSelector(tag: string, attrs: Record<string, string>): string {
	const id = attrs.id ? `#${attrs.id}` : '';
	const classNames = (attrs.class || '').split(/\s+/).filter(Boolean).slice(0, 2).map((name) => `.${name}`).join('');
	return `${tag}${id}${classNames}`;
}

function stripTags(html: string): string {
	return html.replace(/<[^>]*>/g, ' ');
}

function formatColor(color: RgbaColor): string {
	const toHex = (value: number) => value.toString(16).padStart(2, '0');
	return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function roundContrast(value: number): number {
	return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.min(Math.max(value, min), max);
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
		colorContrast: [],
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
