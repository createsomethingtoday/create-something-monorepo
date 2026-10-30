/**
 * Designer data enhancements shared by the Designer Extension and the headless
 * (MCP) collector. Pure functions over collected Designer data and a worker
 * result: no Designer API, no DOM, no I/O.
 *
 * - deriveEnhancedValidation / deriveCollectionMetadata compute the flags and
 *   counts the extension sends alongside its DesignerData payload.
 * - enhanceValidationResults appends the client-side categories ("Style
 *   System", canvas checks, republish hints, Page Structure rewrite, Variable
 *   Modes normalization) to a worker result and recomputes the summary.
 *
 * Canvas accessibility needs Designer element access, so it is an input here,
 * not something this module collects.
 */

// --- Result types (shared with extension/src/index.ts) ---

export interface ValidationIssue {
	id: string;
	category: string;
	severity: 'error' | 'warning' | 'info';
	message: string;
	howToFix?: string;
	location?: string;
	details?: {
		howToFix?: string;
		location?: string;
		sample?: string[] | string;
		violations?: Array<string | Record<string, any>>;
		locations?: string[];
		issues?: string[];
		images?: string[];
		samples?: string[];
		[key: string]: any;
	};
}

export interface CategoryResult {
	category: string;
	passed: boolean;
	issues: ValidationIssue[];
	stats?: Record<string, any>;
}

/** The parts of a worker result this module reads and writes. */
export interface EnhanceableResults {
	categories: CategoryResult[];
	summary: {
		passedCategories: number;
		failedCategories: number;
		totalErrors?: number;
		totalWarnings?: number;
		totalInfo?: number;
	};
}

// --- Input types ---

/** Canvas-accurate checks for the current page, collected in the Designer. */
export interface CanvasAccessibilityResult {
	available: boolean;
	reason?: string;
	pageName?: string;
	headingsChecked: number;
	headingIssues: Array<{ issue: string; position: number; level: number; elementKey?: string }>;
	imagesChecked: number;
	imagesMissingAlt: number;
	missingAltElementKeys: string[];
}

export interface EnhancedValidation {
	variableOrganization: {
		hasColorVariables: boolean;
		hasTypographyVariables: boolean;
		hasSpacingVariables: boolean;
		hasOrderedCollections: boolean;
	};
	componentArchitecture: {
		hasNavbarComponent: boolean;
		hasFooterComponent: boolean;
		hasCTAComponents: boolean;
		hasNestedComponents: boolean;
	};
	styleSystem: {
		hasHtmlTagStyles: boolean;
		hasConsistentNaming: boolean;
		usesVariablesInStyles: boolean;
		hasPercentageLineHeights: boolean;
	};
	pageStructure: {
		hasStyleGuidePage: boolean;
		hasInstructionsPage: boolean;
		hasLicensePage: boolean;
		hasTitleCaseNaming: boolean;
		hasMatchingSlugs: boolean;
		pagesNotTitleCase: string[];
		pagesWithMismatchedSlugs: string[];
	};
	seoCompliance: {
		currentPageHasValidTitle: boolean;
		currentPageHasValidDescription: boolean;
		hasOpenGraphData: boolean;
		titleWithinLimits: boolean;
		descriptionWithinLimits: boolean;
	};
}

/**
 * The collected-data fields these functions read. The extension's ProjectData
 * and the worker's DesignerData both satisfy it structurally.
 */
export interface DesignerEnhancementInput {
	variables?: {
		collections: Array<{
			variables: Array<{ name?: string | null }>;
			modes?: unknown[];
		}>;
	};
	components?: Array<{ name?: string | null; isNested?: boolean }>;
	styles?: Array<{
		name?: string | null;
		isHtmlTag?: boolean;
		hasVariables?: boolean;
		properties?: Record<string, any>;
	}>;
	pages?: Array<{
		name: string;
		slug: string;
		isCmsTemplate?: boolean;
		isHomePage?: boolean;
	}>;
	/** Current Designer page SEO. Extension only; absent headlessly. */
	currentPage?: {
		seo: {
			openGraphTitle?: string | null;
			openGraphDescription?: string | null;
			openGraphImage?: string | null;
			titleLength?: number;
			descriptionLength?: number;
			hasValidTitle?: boolean;
			hasValidDescription?: boolean;
		};
	};
	enhancedValidation?: EnhancedValidation;
}

// --- Collection-time derivations ---

/** Totals the extension reports in `collectionMetadata`. */
export function deriveCollectionMetadata(data: DesignerEnhancementInput): Record<string, number> {
	const metadata: Record<string, number> = {
		variableCollections: 0,
		totalVariables: 0,
		totalComponents: data.components?.length ?? 0,
		totalStyles: data.styles?.length ?? 0,
		totalPages: data.pages?.length ?? 0,
		totalAssets: 0,
		totalFonts: 0,
		totalCollections: 0
	};
	const collections = data.variables?.collections ?? [];
	if (collections.length > 0) {
		metadata.variableCollections = collections.length;
		metadata.totalVariables = collections.reduce((n, c) => n + c.variables.length, 0);
		// Collections without mode data (older runtimes) contribute no modes.
		metadata.totalVariableModes = collections.reduce((n, c) => n + (Array.isArray(c.modes) ? c.modes.length : 0), 0);
	}
	return metadata;
}

/** Webflow Way flags computed from collected variables, components, styles, pages, and current-page SEO. */
export function deriveEnhancedValidation(data: DesignerEnhancementInput): EnhancedValidation {
	const result: EnhancedValidation = {
		variableOrganization: {
			hasColorVariables: false,
			hasTypographyVariables: false,
			hasSpacingVariables: false,
			hasOrderedCollections: false
		},
		componentArchitecture: {
			hasNavbarComponent: false,
			hasFooterComponent: false,
			hasCTAComponents: false,
			hasNestedComponents: false
		},
		styleSystem: {
			hasHtmlTagStyles: false,
			hasConsistentNaming: false,
			usesVariablesInStyles: false,
			hasPercentageLineHeights: false
		},
		pageStructure: {
			hasStyleGuidePage: false,
			hasInstructionsPage: false,
			hasLicensePage: false,
			hasTitleCaseNaming: false,
			hasMatchingSlugs: false,
			pagesNotTitleCase: [],
			pagesWithMismatchedSlugs: []
		},
		seoCompliance: {
			currentPageHasValidTitle: false,
			currentPageHasValidDescription: false,
			hasOpenGraphData: false,
			titleWithinLimits: false,
			descriptionWithinLimits: false
		}
	};

	const variableOrganization = result.variableOrganization;
	for (const collection of data.variables?.collections ?? []) {
		for (const variable of collection.variables) {
			if (!variable.name) continue;
			const lowerName = variable.name.toLowerCase();
			if (lowerName.includes('color') || lowerName.includes('bg') || lowerName.includes('text') || lowerName.includes('primary') || lowerName.includes('secondary')) {
				variableOrganization.hasColorVariables = true;
			}
			if (lowerName.includes('font') || lowerName.includes('text') || lowerName.includes('heading') || lowerName.includes('body') || lowerName.includes('size')) {
				variableOrganization.hasTypographyVariables = true;
			}
			if (lowerName.includes('space') || lowerName.includes('margin') || lowerName.includes('padding') || lowerName.includes('gap')) {
				variableOrganization.hasSpacingVariables = true;
			}
		}
	}

	const componentArchitecture = result.componentArchitecture;
	for (const component of data.components ?? []) {
		if (!component.name) continue;
		const lowerName = component.name.toLowerCase();
		if (lowerName.includes('nav') || lowerName.includes('header') || lowerName.includes('menu')) {
			componentArchitecture.hasNavbarComponent = true;
		}
		if (lowerName.includes('footer')) {
			componentArchitecture.hasFooterComponent = true;
		}
		if (lowerName.includes('cta') || lowerName.includes('button') || lowerName.includes('call')) {
			componentArchitecture.hasCTAComponents = true;
		}
		if (component.isNested) {
			componentArchitecture.hasNestedComponents = true;
		}
	}

	const styleSystem = result.styleSystem;
	for (const style of data.styles ?? []) {
		if (style.isHtmlTag) styleSystem.hasHtmlTagStyles = true;
		if (style.hasVariables) styleSystem.usesVariablesInStyles = true;
		// Percentage or unitless line heights (Webflow Way requirement)
		const lineHeightValue = style.properties?.['line-height'];
		if (lineHeightValue) {
			const lineHeight = String(lineHeightValue);
			if (lineHeight.includes('%') || (!lineHeight.includes('px') && !lineHeight.includes('rem') && !isNaN(parseFloat(lineHeight)))) {
				styleSystem.hasPercentageLineHeights = true;
			}
		}
	}
	styleSystem.hasConsistentNaming = hasConsistentNaming(data);

	const pageStructure = result.pageStructure;
	const pages = data.pages ?? [];
	for (const page of pages) {
		const { name, slug } = page;
		const lowerName = name.toLowerCase();
		const lowerSlug = slug.toLowerCase();

		if (lowerName.includes('style guide') || lowerSlug.includes('style-guide') || lowerSlug.includes('styleguide')) {
			pageStructure.hasStyleGuidePage = true;
		}
		if (lowerName.includes('instructions') || lowerSlug.includes('instructions')) {
			pageStructure.hasInstructionsPage = true;
		}
		if (lowerName.includes('license') || lowerSlug.includes('license') || slug === '/licenses') {
			pageStructure.hasLicensePage = true;
		}

		// Title Case naming (Webflow Way requirement) per page
		const isTitleCase = /^[A-Z][a-z]*(?:\s[A-Z][a-z]*)*$/.test(name) ||
			name.split(' ').every((word: string) => word.charAt(0) === word.charAt(0).toUpperCase());
		if (!isTitleCase) {
			pageStructure.pagesNotTitleCase.push(name);
		}

		// Page name matches slug (Webflow Way requirement) per page.
		// CMS template pages have fixed collection slugs; skip them.
		const expectedSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
		const actualSlug = slug.replace(/^\//, '').toLowerCase();
		if (!page.isCmsTemplate && expectedSlug !== actualSlug && !(page.isHomePage && actualSlug === '')) {
			pageStructure.pagesWithMismatchedSlugs.push(`${name} (/${actualSlug})`);
		}
	}
	// "All collected pages pass" semantics: one well-named page must not mask
	// badly-named ones.
	pageStructure.hasTitleCaseNaming = pages.length > 0 && pageStructure.pagesNotTitleCase.length === 0;
	pageStructure.hasMatchingSlugs = pages.length > 0 && pageStructure.pagesWithMismatchedSlugs.length === 0;

	const seo = data.currentPage?.seo;
	if (seo) {
		const seoCompliance = result.seoCompliance;
		seoCompliance.currentPageHasValidTitle = seo.hasValidTitle || false;
		seoCompliance.currentPageHasValidDescription = seo.hasValidDescription || false;
		seoCompliance.titleWithinLimits = (seo.titleLength || 0) <= 60;
		seoCompliance.descriptionWithinLimits =
			(seo.descriptionLength || 0) >= 150 && (seo.descriptionLength || 0) <= 160;
		seoCompliance.hasOpenGraphData = !!(seo.openGraphTitle || seo.openGraphDescription || seo.openGraphImage);
	}

	return result;
}

/**
 * Naming consistency across components, non-tag styles, and variables: true
 * when one pattern covers 80% or more of all names. Unnamed entries count
 * toward the total but match no pattern.
 */
function hasConsistentNaming(data: DesignerEnhancementInput): boolean {
	const allNames: Array<string | null | undefined> = [];
	if (data.components) {
		allNames.push(...data.components.map((c) => c.name));
	}
	if (data.styles) {
		allNames.push(...data.styles.filter((s) => !s.isHtmlTag).map((s) => s.name));
	}
	for (const collection of data.variables?.collections ?? []) {
		allNames.push(...collection.variables.map((v) => v.name));
	}
	if (allNames.length === 0) return false;

	const namingPatterns = {
		titleCase: 0,
		camelCase: 0,
		pascalCase: 0,
		snakeCase: 0,
		kebabCase: 0,
		bem: 0
	};

	for (const name of allNames) {
		if (!name) continue;
		if (/^[A-Z][a-z]*(?:\s[A-Z][a-z]*)*$/.test(name)) {
			namingPatterns.titleCase++; // "Hero Container Element"
		} else if (/^[a-z][a-zA-Z0-9]*$/.test(name)) {
			namingPatterns.camelCase++; // "heroContainerElement"
		} else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
			namingPatterns.pascalCase++; // "HeroContainerElement"
		} else if (/^[a-z][a-z0-9_]*$/.test(name)) {
			namingPatterns.snakeCase++; // "hero_container_element"
		} else if (/^[a-z][a-z0-9-]*$/.test(name)) {
			namingPatterns.kebabCase++; // "hero-container-element"
		} else if (/^[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$/.test(name)) {
			namingPatterns.bem++; // "block__element--modifier"
		}
	}

	const totalNames = allNames.length;
	return Object.values(namingPatterns).some((count) => count / totalNames >= 0.8);
}

// --- Result enhancements ---

/** Title Case with spaces; numbers and acronyms allowed, underscores and dashes not. */
function isStrictTitleCase(name: string): boolean {
	if (!name || /[_-]/.test(name)) return false;
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return false;
	return parts.every((p) => /^[A-Z][A-Za-z0-9]*$/.test(p));
}

function hasNoErrors(issues: ValidationIssue[]): boolean {
	return issues.filter((i) => i.severity === 'error').length === 0;
}

/** Merge issues and stats into an existing category, or add a new one. */
function upsertCategory(
	results: EnhanceableResults,
	category: string,
	issues: ValidationIssue[],
	stats: Record<string, any>
): void {
	const existing = results.categories.find((cat) => cat.category === category);
	if (!existing) {
		results.categories.push({ category, passed: hasNoErrors(issues), issues, stats });
		return;
	}
	existing.issues.push(...issues);
	existing.passed = hasNoErrors(existing.issues);
	existing.stats = stats;
}

/**
 * Variables: Title Case naming and color, typography, spacing categories.
 * Not called by enhanceValidationResults: it duplicates the worker's
 * "Variables" category.
 */
export function addVariableValidation(results: EnhanceableResults, data: DesignerEnhancementInput): void {
	const issues: ValidationIssue[] = [];
	const allVariables: Array<{ name?: string | null }> = [];
	for (const collection of data.variables?.collections ?? []) {
		if (Array.isArray(collection.variables)) allVariables.push(...collection.variables);
	}

	const hasColorVars = allVariables.some((v) => /color|bg|background|primary|secondary|accent|neutral/i.test(v.name || ''));
	const hasTypographyVars = allVariables.some((v) => /font|text|heading|body|size|weight|line/i.test(v.name || ''));
	const hasSpacingVars = allVariables.some((v) => /space|spacing|margin|padding|gap|gutter/i.test(v.name || ''));

	if (allVariables.length > 0) {
		const nonTitleCaseVars = allVariables.filter((v) => v.name && !isStrictTitleCase(v.name));
		if (nonTitleCaseVars.length > 0) {
			issues.push({
				id: 'variables-title-case',
				category: 'Design System',
				severity: 'error',
				message: `${nonTitleCaseVars.length} variables don't use Title Case naming convention`,
				details: {
					howToFix: 'Rename variables to use Title Case (e.g., "Primary Color", "Body Font Size")',
					samples: nonTitleCaseVars.slice(0, 5).map((v) => v.name as string)
				}
			});
		}
		if (!hasColorVars) {
			issues.push({
				id: 'missing-color-variables',
				category: 'Design System',
				severity: 'error',
				message: 'No color variables defined',
				details: { howToFix: 'Create color variables for primary, secondary, background, and text colors' }
			});
		}
		if (!hasTypographyVars) {
			issues.push({
				id: 'missing-typography-variables',
				category: 'Design System',
				severity: 'error',
				message: 'No typography variables defined',
				details: { howToFix: 'Create typography variables for font sizes, weights, and line heights' }
			});
		}
		if (!hasSpacingVars) {
			issues.push({
				id: 'missing-spacing-variables',
				category: 'Design System',
				severity: 'error',
				message: 'No spacing variables defined',
				details: { howToFix: 'Create spacing variables for consistent margins, padding, and gaps' }
			});
		}
	}

	upsertCategory(results, 'Design System', issues, {
		totalVariables: allVariables.length,
		withTitleCase: allVariables.filter((v) => isStrictTitleCase(v.name || '')).length,
		hasColorVars,
		hasTypographyVars,
		hasSpacingVars
	});
}

const REQUIRED_COMPONENTS = [
	{ name: 'nav', display: 'Navigation', patterns: ['nav', 'navbar', 'navigation', 'header'] },
	{ name: 'footer', display: 'Footer', patterns: ['footer'] },
	{ name: 'cta', display: 'CTA', patterns: ['cta', 'call to action', 'button'] }
];

/**
 * Navigation, Footer, and CTA components with Title Case names.
 * Not called by enhanceValidationResults: it duplicates the worker's
 * "Components" category.
 */
export function addComponentValidation(results: EnhanceableResults, data: DesignerEnhancementInput): void {
	const issues: ValidationIssue[] = [];
	const components = data.components;
	const findRequired = (patterns: string[]) =>
		components?.find((c) => patterns.some((pattern) => c.name?.toLowerCase().includes(pattern)));

	if (Array.isArray(components)) {
		for (const req of REQUIRED_COMPONENTS) {
			const found = findRequired(req.patterns);
			if (!found) {
				issues.push({
					id: `missing-${req.name}-component`,
					category: 'Component Architecture',
					severity: 'error',
					message: `Missing required ${req.display} component`,
					details: { howToFix: `Create a ${req.display} component with Title Case naming` }
				});
			} else if (found.name && !isStrictTitleCase(found.name)) {
				issues.push({
					id: `${req.name}-component-naming`,
					category: 'Component Architecture',
					severity: 'error',
					message: `${req.display} component "${found.name}" doesn't use Title Case naming`,
					details: { howToFix: `Rename to use Title Case (e.g., "Main Navigation", "Site Footer", "Primary CTA")` }
				});
			}
		}
	}

	upsertCategory(results, 'Component Architecture', issues, {
		totalComponents: components?.length || 0,
		requiredComponents: {
			found: REQUIRED_COMPONENTS.filter((req) => findRequired(req.patterns)).length,
			total: REQUIRED_COMPONENTS.length
		},
		componentsWithTitleCase: components?.filter((c) => isStrictTitleCase(c.name || '')).length || 0
	});
}

const REQUIRED_TAGS = ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a'];

/** "Style System": base styles for HTML tags and variable usage in styles. */
export function addStyleSystemValidation(results: EnhanceableResults, data: DesignerEnhancementInput): void {
	const issues: ValidationIssue[] = [];
	const styles = data.styles;

	if (Array.isArray(styles)) {
		const existingTagStyles: string[] = [];
		const tagStylesWithVariables: string[] = [];

		for (const style of styles) {
			const styleName = style.name?.toLowerCase() || '';
			for (const tag of REQUIRED_TAGS) {
				if (styleName === tag || styleName === `all ${tag}`) {
					existingTagStyles.push(tag);
					if (style.hasVariables) tagStylesWithVariables.push(tag);
				}
			}
		}

		const missingTags = REQUIRED_TAGS.filter((tag) => !existingTagStyles.includes(tag));
		if (missingTags.length > 0) {
			issues.push({
				id: 'missing-html-tag-styles',
				category: 'Style System',
				severity: 'error',
				message: `Missing base styles for HTML tags: ${missingTags.join(', ')}`,
				details: {
					howToFix: 'Create base styles for all HTML tags (body, h1-h6, p, a)',
					samples: missingTags
				}
			});
		}

		const tagsWithoutVariables = existingTagStyles.filter((tag) => !tagStylesWithVariables.includes(tag));
		if (tagsWithoutVariables.length > 0) {
			issues.push({
				id: 'html-tags-without-variables',
				category: 'Style System',
				severity: 'error',
				message: `HTML tag styles not using variables: ${tagsWithoutVariables.join(', ')}`,
				details: {
					howToFix: 'Update HTML tag styles to use variables for colors, typography, and spacing',
					samples: tagsWithoutVariables
				}
			});
		}

		const totalStyles = styles.length;
		const stylesWithVariables = styles.filter((s) => s.hasVariables).length;
		const variableUsagePercent = totalStyles > 0 ? Math.round((stylesWithVariables / totalStyles) * 100) : 0;
		if (variableUsagePercent < 50) {
			issues.push({
				id: 'low-variable-usage',
				category: 'Style System',
				severity: 'warning',
				message: `Only ${variableUsagePercent}% of styles use variables (${stylesWithVariables}/${totalStyles})`,
				details: {
					howToFix: 'Increase variable usage in styles for better maintainability (aim for 80%+)'
				}
			});
		}
	}

	const totalStyles = styles?.length || 0;
	const stylesWithVariables = styles?.filter((s) => s.hasVariables).length || 0;
	upsertCategory(results, 'Style System', issues, {
		totalStyles,
		htmlTagStyles: {
			found: styles?.filter((s) => s.isHtmlTag).length || 0,
			required: REQUIRED_TAGS.length
		},
		stylesWithVariables,
		variableUsagePercent: totalStyles > 0 ? Math.round((stylesWithVariables / totalStyles) * 100) : 0
	});
}

/** Turn the worker's name-only "no responsive modes" warning into an info when modes exist. */
export function normalizeVariableModesCategory(results: EnhanceableResults): void {
	const variableModesCategory = results.categories.find((cat) => cat.category === 'Variable Modes');
	if (!variableModesCategory?.stats) return;

	const totalModes = typeof variableModesCategory.stats.totalModes === 'number'
		? variableModesCategory.stats.totalModes
		: 0;
	if (totalModes <= 0) return;

	let convertedWarning = false;
	variableModesCategory.issues = (variableModesCategory.issues || []).map((issue): ValidationIssue => {
		const isNameOnlyModeWarning =
			issue.id === 'modes.no-responsive' ||
			/modes found, but none appear to be for responsive breakpoints/i.test(issue.message || '');

		if (!isNameOnlyModeWarning) return issue;
		convertedWarning = true;

		return {
			...issue,
			id: 'modes.good',
			severity: 'info',
			message: `${totalModes} modes configured across ${variableModesCategory.stats?.collectionsWithModes || 1} collections.`,
			howToFix: undefined
		};
	});

	if (convertedWarning) {
		variableModesCategory.passed = true;
		variableModesCategory.stats.modeDataAvailable = true;
	}
}

export const CANVAS_CHECKS_CATEGORY = 'Canvas Checks (Current Page)';

/** Reason reported when no canvas result was collected (headless runs). */
export const CANVAS_NOT_COLLECTED_REASON =
	'Canvas checks need the Webflow Designer. This run read site data without a Designer canvas, so heading order and image alt text on the current page were not checked.';

/**
 * Canvas checks reflect the current Designer state (including unpublished
 * edits), complementing the published-site checks which lag behind edits.
 *
 * - `canvas` undefined (no Designer): adds the category as unavailable with
 *   one info issue that states the reason.
 * - `canvas.available` false (Designer without canvas access): adds nothing,
 *   as the extension always has.
 */
export function addCanvasChecksCategory(results: EnhanceableResults, canvas: CanvasAccessibilityResult | undefined): void {
	if (!canvas) {
		results.categories.push({
			category: CANVAS_CHECKS_CATEGORY,
			passed: true,
			issues: [{
				id: 'canvas-checks-unavailable',
				category: CANVAS_CHECKS_CATEGORY,
				severity: 'info',
				message: CANVAS_NOT_COLLECTED_REASON,
				details: {
					howToFix: 'Run the Validator app in the Designer to check the current page canvas.'
				}
			}],
			stats: { available: false, reason: CANVAS_NOT_COLLECTED_REASON }
		});
		return;
	}
	if (!canvas.available) return;

	const issues: ValidationIssue[] = [];

	for (const headingIssue of canvas.headingIssues) {
		issues.push({
			id: `canvas-heading-${headingIssue.position}`,
			category: CANVAS_CHECKS_CATEGORY,
			severity: 'warning',
			message: headingIssue.issue,
			details: {
				howToFix: 'Adjust the heading level in the element settings so levels increase one step at a time.',
				location: `${canvas.pageName} — heading ${headingIssue.position} of ${canvas.headingsChecked}`,
				canvasElementKeys: headingIssue.elementKey ? [headingIssue.elementKey] : undefined
			}
		});
	}

	if (canvas.imagesMissingAlt > 0) {
		issues.push({
			id: 'canvas-images-missing-alt',
			category: CANVAS_CHECKS_CATEGORY,
			severity: 'info',
			message: `${canvas.imagesMissingAlt} of ${canvas.imagesChecked} image(s) on this page have no alt text in the Designer.`,
			details: {
				howToFix: 'Add descriptive alt text in each image\'s settings, or mark purely decorative images as decorative.',
				canvasElementKeys: canvas.missingAltElementKeys.length > 0 ? canvas.missingAltElementKeys : undefined
			}
		});
	}

	results.categories.push({
		category: CANVAS_CHECKS_CATEGORY,
		passed: issues.filter((issue) => issue.severity === 'error' || issue.severity === 'warning').length === 0,
		issues,
		stats: {
			page: canvas.pageName,
			headingsChecked: canvas.headingsChecked,
			imagesChecked: canvas.imagesChecked,
			note: 'Reflects current Designer state, including unpublished changes'
		}
	});
}

/**
 * Published-site checks lag behind Designer edits. When the canvas passes a
 * dimension the published site fails, the creator has almost certainly fixed
 * it without republishing, so say so on the published issue.
 */
export function addRepublishHints(results: EnhanceableResults, canvas: CanvasAccessibilityResult | undefined): void {
	if (!canvas || !canvas.available) return;

	const hint = (dimension: string) =>
		`The current page's canvas passes the ${dimension} check — if you've already fixed this in the Designer, republish the site and re-run validation to update this result.`;

	const headingIssueIds = new Set(['heading-hierarchy-errors', 'heading-structure-errors']);
	const altIssueIds = new Set(['missing-alt-text-critical', 'missing-alt-text', 'images-missing-alt']);

	for (const category of results.categories) {
		for (const issue of category.issues || []) {
			if (issue.id.startsWith('canvas-')) continue;
			if (canvas.headingsChecked > 0 && canvas.headingIssues.length === 0 && headingIssueIds.has(issue.id)) {
				issue.details = { ...issue.details, republishHint: hint('heading hierarchy') };
			}
			if (canvas.imagesChecked > 0 && canvas.imagesMissingAlt === 0 && altIssueIds.has(issue.id)) {
				issue.details = { ...issue.details, republishHint: hint('image alt text') };
			}
		}
	}
}

/** Replace the worker's "Page Structure" issues with per-page naming and slug findings. */
function rewritePageStructureCategory(results: EnhanceableResults, data: DesignerEnhancementInput): void {
	const pageStructureCategory = results.categories.find((cat) => cat.category === 'Page Structure');
	const pages = data.pages;
	if (!pageStructureCategory || !pages || pages.length === 0) return;

	const hasHomePage = pages.some((p) => p.slug === '/' || p.isHomePage);
	if (pageStructureCategory.stats) {
		pageStructureCategory.stats.totalPages = pages.length;
		pageStructureCategory.stats.totalFolders = 0; // Folders are not tracked
		pageStructureCategory.stats.hasHomePage = hasHomePage;
	} else {
		pageStructureCategory.stats = { totalPages: pages.length, totalFolders: 0, hasHomePage };
	}

	// Style Guide, Instructions, and License page checks are handled by the
	// worker's "Required Pages" category.
	const issues: ValidationIssue[] = [];
	const pageStructure = data.enhancedValidation?.pageStructure;
	if (pageStructure) {
		const pagesNotTitleCase = pageStructure.pagesNotTitleCase || [];
		if (pagesNotTitleCase.length > 0) {
			issues.push({
				id: 'page-naming',
				category: 'Page Structure',
				severity: 'warning',
				message: `${pagesNotTitleCase.length} page(s) don't use Title Case naming convention.`,
				details: {
					howToFix: 'Use Title Case for page names (e.g., "Style Guide", "Contact Us")',
					samples: pagesNotTitleCase.slice(0, 10)
				}
			});
		}

		const pagesWithMismatchedSlugs = pageStructure.pagesWithMismatchedSlugs || [];
		if (pagesWithMismatchedSlugs.length > 0) {
			issues.push({
				id: 'page-slug-mismatch',
				category: 'Page Structure',
				severity: 'warning',
				message: `${pagesWithMismatchedSlugs.length} page(s) have slugs that don't match their names.`,
				details: {
					howToFix: 'Keep page slugs aligned with page names (e.g., "Style Guide" → /style-guide)',
					samples: pagesWithMismatchedSlugs.slice(0, 10)
				}
			});
		}
	}

	pageStructureCategory.issues = issues;
	pageStructureCategory.passed = hasNoErrors(issues);
}

/** Failed categories with errors first, then warnings, then the rest. Stable within a tier. */
function sortCategories(results: EnhanceableResults): void {
	results.categories.sort((a, b) => {
		const aErrors = a.issues?.filter((i) => i.severity === 'error').length || 0;
		const bErrors = b.issues?.filter((i) => i.severity === 'error').length || 0;
		const aWarnings = a.issues?.filter((i) => i.severity === 'warning').length || 0;
		const bWarnings = b.issues?.filter((i) => i.severity === 'warning').length || 0;

		if (aErrors > 0 && bErrors === 0) return -1;
		if (aErrors === 0 && bErrors > 0) return 1;

		if (aErrors === 0 && bErrors === 0) {
			if (aWarnings > 0 && bWarnings === 0) return -1;
			if (aWarnings === 0 && bWarnings > 0) return 1;
		}

		if (!a.passed && b.passed) return -1;
		if (a.passed && !b.passed) return 1;

		return 0;
	});
}

/**
 * Append the client-side categories to a worker result, rewrite Page
 * Structure, sort categories, and recompute summary totals. Mutates `results`.
 *
 * `canvasAccessibility` is the Designer canvas result; pass undefined when no
 * Designer is open (the canvas category then reports itself as unavailable).
 */
export function enhanceValidationResults(
	results: EnhanceableResults,
	data: DesignerEnhancementInput,
	canvasAccessibility: CanvasAccessibilityResult | undefined
): void {
	// addVariableValidation and addComponentValidation are not run: they
	// duplicate the worker's "Variables" and "Components" categories.
	addStyleSystemValidation(results, data);
	normalizeVariableModesCategory(results);
	addCanvasChecksCategory(results, canvasAccessibility);
	addRepublishHints(results, canvasAccessibility);
	rewritePageStructureCategory(results, data);
	sortCategories(results);

	const allIssues = results.categories.flatMap((cat) => cat.issues || []);
	results.summary.totalErrors = allIssues.filter((issue) => issue.severity === 'error').length;
	results.summary.totalWarnings = allIssues.filter((issue) => issue.severity === 'warning').length;
	results.summary.totalInfo = allIssues.filter((issue) => issue.severity === 'info').length;
	results.summary.passedCategories = results.categories.filter((c) => c.passed).length;
	results.summary.failedCategories = results.categories.filter((c) => !c.passed).length;
}
