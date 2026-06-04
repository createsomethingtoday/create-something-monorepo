/**
 * Content Validator - Comprehensive content analysis for Webflow templates
 *
 * Validates:
 * - Lorem Ipsum and placeholder text detection
 * - Heading hierarchy (H1-H6 structure)
 * - Alt text coverage and appropriateness
 * - Content quality and consistency
 */

import {
	ContentAnalysisResult,
	ValidationIssue,
	AnalyzedPage,
	HeadingHierarchy,
	ParsedHTML,
	PageSEOData,
	LinkAnalysis,
	ContentQualityAnalysis,
	ValidationOptions
} from '../types';
import { fetchHTML, parseHTML } from '../utils/fetch-utils';

const LOREM_IPSUM_PATTERNS = [
	/lorem\s+ipsum/i,
	/dolor\s+sit\s+amet/i,
	/consectetur\s+adipiscing/i,
	/sed\s+do\s+eiusmod/i,
	/tempor\s+incididunt/i,
	/ut\s+labore\s+et\s+dolore/i,
	/mauris\s+blandit\s+aliquet/i,
	/suspendisse\s+potenti/i,
	/vestibulum\s+ante\s+ipsum/i,
	/faucibus\s+orci\s+luctus/i
];

const PLACEHOLDER_PATTERNS = [
	/your\s+(text|content|heading|title|description|story|message)\s+here/i,
	/placeholder\s+(text|content|image|description)/i,
	/sample\s+(text|content|description|heading)/i,
	/dummy\s+(text|content|data|info)/i,
	/type\s+here/i,
	/headline\s+goes\s+here/i,
	/subtitle\s+goes\s+here/i,
	/description\s+goes\s+here/i,
	/add\s+your\s+(text|content|description|story)/i,
	/click\s+to\s+edit/i,
	/edit\s+this\s+(text|content)/i,
	/replace\s+this\s+(text|content)/i,
	/example\s+(text|content|description)/i,
	/write\s+your\s+(text|content|description)/i,
	/enter\s+your\s+(text|content|description)/i,
	/\[your\s+(text|content|title|name)\]/i,
	/\{your\s+(text|content|title|name)\}/i,
	/change\s+this\s+(text|content)/i,
	/default\s+(text|content|description)/i,
	/template\s+(text|content|description)/i
];

const GENERIC_CONTENT_PATTERNS = [
	/^(text|content|heading|title|description)$/i,
	/^(item\s+\d+|section\s+\d+|page\s+\d+)$/i,
	/^(test|testing|demo|example)$/i,
	/^(coming\s+soon|under\s+construction|work\s+in\s+progress)$/i,
	/^(todo|fixme|update|change)$/i
];

const WEBFLOW_DEFAULT_PATTERNS = [
	/this\s+is\s+some\s+text\s+inside\s+of\s+a\s+div\s+block/i,
	/this\s+is\s+a\s+paragraph/i,
	/link\s+text/i,
	/button\s+text/i,
	/heading\s+\d+/i,
	/rich\s+text\s+element/i,
	/text\s+block/i
];

type ImageAltDetail = {
	src: string;
	context: string;
	selector?: string;
};

const SEARCH_TEXT_IGNORE_SELECTORS = [
	'script',
	'style',
	'noscript',
	'template',
	'input',
	'textarea',
	'select',
	'[role="search"]',
	'[data-wf-search]',
	'[data-wf-search-results]',
	'[data-search-result]',
	'.w-search',
	'.w-search-results',
	'.w-search-result',
	'.search-results',
	'.search-result',
	'.search-snippet',
	'.search-summary',
	'.search-description'
];

const SEARCH_TEXT_CONTAINER_ATTRIBUTE_PATTERN =
	/\s(?:class|id|role|aria-label|data-[A-Za-z0-9_-]+)=["'][^"']*(?:w-search|search-results?|search-snippet|search-summary|search-description|wf-search)[^"']*["']/i;

const VIDEO_FALLBACK_ANCESTOR_SELECTOR = [
	'.w-background-video',
	'.w-video',
	'[data-video-urls]',
	'[data-video-url]',
	'[data-poster-url]'
].join(', ');

function normalizeSlugForComparison(slugOrUrl: string): string | null {
	if (!slugOrUrl) return null;
	let s = String(slugOrUrl).trim();
	if (!s) return null;

	// If a full URL is provided, compare by pathname.
	try {
		if (/^https?:\/\//i.test(s)) {
			s = new URL(s).pathname || '';
		}
	} catch { /* ignore */ }

	if (!s.startsWith('/')) s = `/${s}`;
	if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);

	const lower = s.toLowerCase();
	if (lower === '/' || lower === '') return null; // root/non-excludable
	return lower;
}

function getExcludedSlugSet(options?: ValidationOptions): Set<string> {
	const set = new Set<string>();
	const slugs = options?.excludePageSlugs;
	if (!Array.isArray(slugs)) return set;

	for (const slug of slugs) {
		const norm = normalizeSlugForComparison(typeof slug === 'string' ? slug : '');
		if (norm) set.add(norm);
	}

	return set;
}

export async function validateContent(
	siteUrl: string,
	pageSlugs?: string[],
	options?: ValidationOptions
): Promise<ContentAnalysisResult> {
	console.log(`Starting content validation for ${siteUrl}`);

	try {
		const resolvedChecks = options?.contentChecks;
		const pageScope = options?.pageScope || 'all';
		const excludedSlugs = getExcludedSlugSet(options);

		// Current page only: analyze just the target slug (or homepage fallback).
		if (pageScope === 'current') {
			const currentSlug = (options?.currentPageSlug || '').trim();
			const normalizedCurrentSlug = normalizeSlugForComparison(currentSlug);
			if (normalizedCurrentSlug && excludedSlugs.has(normalizedCurrentSlug)) {
				return {
					issues: [{
						id: 'content-excluded-page',
						category: 'Content & Accessibility',
						severity: 'warning',
						message: `Skipped content validation for excluded page: ${normalizedCurrentSlug}`,
						description: 'This page was excluded from content validation.',
						howToFix: 'Disable Style Guide exclusion (or remove this slug from excludePageSlugs) to validate it.'
					}],
					stats: {
						totalPages: 0,
						pagesWithLoremIpsum: 0,
						headingHierarchyErrors: 0,
						altTextCoverage: 0,
						seoComplianceScore: 0,
						pagesWithSEOIssues: 0,
						averageContentScore: 0,
						pagesWithContentIssues: 0,
						totalLinks: 0,
						totalBrokenLinks: 0,
						averageLinksPerPage: 0
					},
					pages: []
				};
			}
			const pageUrl = currentSlug && currentSlug !== '/' ? new URL(currentSlug.startsWith('/') ? currentSlug : `/${currentSlug}`, siteUrl).href : siteUrl;

			const htmlResult = await fetchHTML(pageUrl);
			const parsedHTML = parseHTML(htmlResult.html);
			const pageAnalysis = await analyzePage(pageUrl, parsedHTML);

			const issues = generateContentIssues([pageAnalysis], resolvedChecks);
			const stats = calculateContentStats([pageAnalysis]);

			return { issues, stats, pages: [pageAnalysis] };
		}

		// Default: homepage + additional pages (provided slugs or discovery)
		const htmlResult = await fetchHTML(siteUrl);
		const parsedHTML = parseHTML(htmlResult.html);
		const pageAnalysis = await analyzePage(siteUrl, parsedHTML);

		const maxPages = typeof options?.maxPages === 'number' && Number.isFinite(options.maxPages)
			? Math.max(1, Math.floor(options.maxPages))
			: undefined;
		const maxAdditionalPages = maxPages ? Math.max(0, maxPages - 1) : undefined;

		const filteredPageSlugs = Array.isArray(pageSlugs) && excludedSlugs.size > 0
			? pageSlugs.filter(slug => {
				const norm = normalizeSlugForComparison(slug);
				return !(norm && excludedSlugs.has(norm));
			})
			: pageSlugs;

		const additionalPages = maxAdditionalPages === 0
			? []
			: await discoverAdditionalPages(parsedHTML, siteUrl, filteredPageSlugs, maxAdditionalPages, excludedSlugs);

		const combinedPages = [pageAnalysis, ...additionalPages];
		const allPages = excludedSlugs.size > 0
			? combinedPages.filter(p => {
				const norm = normalizeSlugForComparison(p.url);
				return !(norm && excludedSlugs.has(norm));
			})
			: combinedPages;

		// Generate content validation issues
		const issues = generateContentIssues(allPages, resolvedChecks);

		// Calculate content statistics
		const stats = calculateContentStats(allPages);

		return {
			issues,
			stats,
			pages: allPages
		};

	} catch (error) {
		console.error('Content validation error:', error);
		return {
			issues: [{
				id: 'content-analysis-failed',
				category: 'Content & Accessibility',
				severity: 'warning',
				message: 'Content analysis could not be completed',
				description: `Error analyzing content: ${error instanceof Error ? error.message : 'Unknown error'}`,
				howToFix: 'Check that the site URL is accessible and contains content to analyze'
			}],
			stats: {
				totalPages: 0,
				pagesWithLoremIpsum: 0,
				headingHierarchyErrors: 0,
				altTextCoverage: 0,
				seoComplianceScore: 0,
				pagesWithSEOIssues: 0,
				averageContentScore: 0,
				pagesWithContentIssues: 0,
				totalLinks: 0,
				totalBrokenLinks: 0,
				averageLinksPerPage: 0
			},
			pages: []
		};
	}
}

async function analyzePage(url: string, parsedHTML: ParsedHTML): Promise<AnalyzedPage> {
	// Extract page title
	const titleElement = parsedHTML.document.querySelector('title');
	const title = titleElement?.textContent || 'Untitled Page';

	// Check for Lorem Ipsum content
	const hasLoremIpsum = checkForLoremIpsum(parsedHTML);

	// Analyze heading hierarchy
	const headingHierarchy = analyzeHeadingHierarchy(parsedHTML.headings);

	// Count images and alt text coverage
	const imageAltAudit = analyzeContentImages(parsedHTML);
	const imageCount = imageAltAudit.totalImages;
	const imagesWithoutAlt = imageAltAudit.imagesWithoutAlt.length;

	// Extract comprehensive SEO data
	const seo = extractSEOData(parsedHTML);

	// Analyze links
	const links = await analyzeLinks(parsedHTML, url);

	// Analyze content quality
	const contentQuality = analyzeContentQuality(parsedHTML, url);

	return {
		url,
		title,
		hasLoremIpsum,
		headingHierarchy,
		imageCount,
		imagesWithoutAlt,
		imagesWithoutAltDetails: imageAltAudit.imagesWithoutAlt,
		seo,
		links,
		contentQuality
	};
}

function checkForLoremIpsum(parsedHTML: ParsedHTML): boolean {
	const textContent = getScannableContentText(parsedHTML);

	// Check for Lorem Ipsum patterns
	const hasLorem = LOREM_IPSUM_PATTERNS.some(pattern => pattern.test(textContent));

	// Check for placeholder patterns
	const hasPlaceholders = PLACEHOLDER_PATTERNS.some(pattern => pattern.test(textContent));

	// Check for generic content patterns
	const hasGenericContent = GENERIC_CONTENT_PATTERNS.some(pattern => pattern.test(textContent));

	// Check for Webflow default patterns
	const hasWebflowDefaults = WEBFLOW_DEFAULT_PATTERNS.some(pattern => pattern.test(textContent));

	return hasLorem || hasPlaceholders || hasGenericContent || hasWebflowDefaults;
}

function analyzeContentImages(parsedHTML: ParsedHTML): { totalImages: number; imagesWithoutAlt: ImageAltDetail[] } {
	const imagesWithoutAlt: ImageAltDetail[] = [];
	let totalImages = 0;

	parsedHTML.images.forEach((img, index) => {
		if (shouldIgnoreImageForAltAudit(img)) return;

		totalImages++;
		const alt = img.getAttribute('alt');
		if (alt === null) {
			imagesWithoutAlt.push({
				src: getImageSource(img),
				context: determineImageContext(img, index),
				selector: buildImageSelector(img, index)
			});
		}
	});

	return { totalImages, imagesWithoutAlt };
}

function shouldIgnoreImageForAltAudit(img: HTMLImageElement | any): boolean {
	const alt = img.getAttribute?.('alt');
	if (typeof alt === 'string' && alt.trim() === '') return true;

	const role = (img.getAttribute?.('role') || '').toLowerCase();
	if (role === 'presentation' || role === 'none') return true;

	if ((img.getAttribute?.('aria-hidden') || '').toLowerCase() === 'true') return true;

	return isLikelyPlatformVideoFallbackImage(img);
}

function isLikelyPlatformVideoFallbackImage(img: HTMLImageElement | any): boolean {
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

function getImageSource(img: HTMLImageElement | any): string {
	return img.getAttribute?.('src') || img.getAttribute?.('data-src') || img.src || 'unknown';
}

function determineImageContext(img: HTMLImageElement | any, index: number): string {
	const src = getImageSource(img).toLowerCase();
	const className = String(img.getAttribute?.('class') || img.className || '').toLowerCase();

	if (src.includes('hero') || className.includes('hero') || index === 0) return 'hero-image';
	if (src.includes('logo') || className.includes('logo')) return 'logo';
	if (src.includes('thumb') || src.includes('preview') || className.includes('thumb')) return 'thumbnail';

	return 'content-image';
}

function buildImageSelector(img: HTMLImageElement | any, index: number): string {
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

function getScannableContentText(parsedHTML: ParsedHTML): string {
	const body = parsedHTML.document.body as any;

	if (body && typeof body.cloneNode === 'function') {
		const clonedBody = body.cloneNode(true) as Element;
		for (const selector of SEARCH_TEXT_IGNORE_SELECTORS) {
			clonedBody.querySelectorAll(selector).forEach((node) => node.remove());
		}
		return normalizeText(clonedBody.textContent || '');
	}

	const rawHtml = parsedHTML.rawHtml || body?.innerHTML || body?.textContent || '';
	if (rawHtml && rawHtml.includes('<')) {
		return normalizeText(stripTags(stripIgnoredSearchContent(rawHtml)));
	}

	return normalizeText(String(rawHtml || ''));
}

function stripIgnoredSearchContent(html: string): string {
	let output = html
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
		.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
		.replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, ' ')
		.replace(/<(input|textarea|select)\b[^>]*>[\s\S]*?(?:<\/\1>)?/gi, ' ');

	let previous: string;
	do {
		previous = output;
		output = output.replace(
			new RegExp(`<([a-z][\\w:-]*)\\b(?=[^>]*${SEARCH_TEXT_CONTAINER_ATTRIBUTE_PATTERN.source})[^>]*>[\\s\\S]*?<\\/\\1>`, 'gi'),
			' '
		);
	} while (output !== previous);

	return output;
}

function stripTags(html: string): string {
	return html.replace(/<[^>]*>/g, ' ');
}

function collectPatternMatches(patterns: RegExp[], textContent: string): Array<{ pattern: string; sample: string }> {
	return patterns.flatMap(pattern => {
		const match = textContent.match(pattern);
		if (!match?.[0]) return [];
		return [{
			pattern: pattern.source,
			sample: match[0].trim().slice(0, 120)
		}];
	});
}

function normalizeText(value: string): string {
	return decodeBasicHtmlEntities(value).replace(/\s+/g, ' ').trim();
}

function decodeBasicHtmlEntities(value: string): string {
	return value
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function extractSEOData(parsedHTML: ParsedHTML): PageSEOData {
	const document = parsedHTML.document;

	// Title extraction and validation
	const titleElement = document.querySelector('title');
	const title = titleElement?.textContent?.trim() || null;
	const titleLength = title?.length || 0;
	const hasValidTitle = title !== null && titleLength >= 30 && titleLength <= 60;

	// Meta description extraction and validation
	const metaDescElement = document.querySelector('meta[name="description"]');
	const metaDescription = metaDescElement?.getAttribute('content')?.trim() || null;
	const metaDescriptionLength = metaDescription?.length || 0;
	const hasValidDescription = metaDescription !== null && metaDescriptionLength >= 120 && metaDescriptionLength <= 160;

	// Open Graph data extraction
	const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || null;
	const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || null;
	const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content')?.trim() || null;
	const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content')?.trim() || null;

	// Twitter Card data extraction
	const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')?.trim() || null;
	const twitterDescription = document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')?.trim() || null;
	const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')?.trim() || null;

	// Other SEO elements
	const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() || null;
	const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content')?.trim() || null;

	return {
		title,
		titleLength,
		metaDescription,
		metaDescriptionLength,
		hasValidTitle,
		hasValidDescription,
		openGraph: {
			title: ogTitle,
			description: ogDescription,
			image: ogImage,
			url: ogUrl
		},
		twitterCard: {
			title: twitterTitle,
			description: twitterDescription,
			image: twitterImage
		},
		canonical,
		robots
	};
}

function analyzeHeadingHierarchy(headings: HTMLHeadingElement[]): HeadingHierarchy {
	// Count H1 elements
	const h1Count = headings.filter(h => h.tagName.toLowerCase() === 'h1').length;

	// Build heading structure
	const structure = headings.map((heading, index) => ({
		level: parseInt(heading.tagName.substring(1)),
		text: heading.textContent?.trim() || '',
		position: index + 1
	}));

	// Check for skipped levels
	let hasSkippedLevels = false;
	for (let i = 1; i < structure.length; i++) {
		const currentLevel = structure[i].level;
		const previousLevel = structure[i - 1].level;

		// If we jump more than one level (e.g., H2 to H4), that's a skip
		if (currentLevel > previousLevel + 1) {
			hasSkippedLevels = true;
			break;
		}
	}

	return {
		h1Count,
		hasSkippedLevels,
		structure
	};
}

async function discoverAdditionalPages(
	parsedHTML: ParsedHTML,
	baseUrl: string,
	pageSlugs?: string[],
	maxAdditionalPages?: number,
	excludedSlugs?: Set<string>
): Promise<AnalyzedPage[]> {
	const additionalPages: AnalyzedPage[] = [];
	const discoveredUrls = new Set<string>();
	let urlsToAnalyze: string[] = [];

	// First priority: Use provided page slugs
	if (pageSlugs && pageSlugs.length > 0) {
		console.log(`Using ${pageSlugs.length} provided page slugs for comprehensive validation`);

		// Convert slugs to full URLs
		let slugUrls = pageSlugs
			.filter(slug => slug && slug.trim() !== '')
			.filter(slug => {
				const norm = normalizeSlugForComparison(slug);
				return !(norm && excludedSlugs?.has(norm));
			})
			.map(slug => {
				try {
					// Handle both absolute paths and slugs
					const cleanSlug = slug.startsWith('/') ? slug : `/${slug}`;
					return new URL(cleanSlug, baseUrl).href;
				} catch {
					console.warn(`Invalid slug provided: ${slug}`);
					return null;
				}
			})
			.filter((url): url is string => url !== null);

		if (typeof maxAdditionalPages === 'number') {
			slugUrls = slugUrls.slice(0, Math.max(0, maxAdditionalPages));
		}

		urlsToAnalyze = [...slugUrls];
		console.log(`Analyzing ${urlsToAnalyze.length} pages from provided slugs`);
	} else {
		// Fallback: Auto-discover from navigation links (original behavior)
		console.log('No page slugs provided, using auto-discovery from navigation');

		const navLinks = parsedHTML.links.filter(link => {
			const href = link.getAttribute('href');
			if (!href) return false;

			try {
				const url = new URL(href, baseUrl);
				// Only analyze pages from the same domain
				const isSameDomain = url.hostname === new URL(baseUrl).hostname;
				if (!isSameDomain) return false;

				const isExcluded = (() => {
					const norm = normalizeSlugForComparison(url.pathname);
					return !!(norm && excludedSlugs?.has(norm));
				})();

				return !isExcluded &&
					   !href.includes('#') && // Skip anchor links
					   !href.includes('mailto:') && // Skip email links
					   !href.includes('tel:'); // Skip phone links
			} catch {
				return false;
			}
		});

		const limit = typeof maxAdditionalPages === 'number'
			? Math.min(Math.max(0, maxAdditionalPages), 5)
			: 5;
		// Limit to a small number of pages to avoid excessive requests when auto-discovering
		urlsToAnalyze = navLinks
			.slice(0, limit)
			.map(link => new URL(link.getAttribute('href')!, baseUrl).href)
			.filter(url => !discoveredUrls.has(url));
	}

	for (const pageUrl of urlsToAnalyze) {
		try {
			discoveredUrls.add(pageUrl);
			const htmlResult = await fetchHTML(pageUrl);
			const parsedPageHTML = parseHTML(htmlResult.html);
			const pageAnalysis = await analyzePage(pageUrl, parsedPageHTML);
			additionalPages.push(pageAnalysis);
		} catch (error) {
			console.warn(`Failed to analyze page ${pageUrl}:`, error);
		}
	}

	return additionalPages;
}

export function generateContentIssues(
	pages: AnalyzedPage[],
	checks?: ValidationOptions['contentChecks']
): ValidationIssue[] {
	const resolvedChecks = {
		lorem: checks?.lorem !== false,
		headings: checks?.headings !== false,
		altText: checks?.altText !== false,
		seo: checks?.seo !== false,
		links: checks?.links !== false,
		contentQuality: checks?.contentQuality !== false
	};

	const issues: ValidationIssue[] = [];

	// Check for Lorem Ipsum across all pages
	const pagesWithLorem = pages.filter(page => page.hasLoremIpsum);
	if (resolvedChecks.lorem && pagesWithLorem.length > 0) {
		issues.push({
			id: 'lorem-ipsum-detected',
			category: 'Content & Accessibility',
			severity: 'warning',
			message: `Lorem Ipsum or placeholder text detected on ${pagesWithLorem.length} page(s)`,
			description: 'Webflow Way guidelines require all placeholder text to be replaced with real, relevant content.',
			howToFix: 'Replace all Lorem Ipsum and placeholder text with actual content relevant to the template purpose',
			details: {
				pagesWithLorem: pagesWithLorem.map(page => ({
					title: page.title,
					url: page.url
				}))
			}
		});
	}

	// Check heading hierarchy issues
	let totalH1Errors = 0;
	let totalSkippedLevels = 0;
	const headingIssues: Array<{ page: string, issue: string }> = [];

	if (resolvedChecks.headings) {
		pages.forEach(page => {
		// Multiple H1s
		if (page.headingHierarchy.h1Count > 1) {
			totalH1Errors++;
			headingIssues.push({
				page: page.title,
				issue: `Has ${page.headingHierarchy.h1Count} H1 elements (should have exactly 1)`
			});
		}

		// No H1
		if (page.headingHierarchy.h1Count === 0) {
			totalH1Errors++;
			headingIssues.push({
				page: page.title,
				issue: 'Missing H1 element (should have exactly 1)'
			});
		}

		// Skipped heading levels
		if (page.headingHierarchy.hasSkippedLevels) {
			totalSkippedLevels++;
			headingIssues.push({
				page: page.title,
				issue: 'Has skipped heading levels (e.g., H2 followed by H4)'
			});
		}
		});

		if (headingIssues.length > 0) {
		issues.push({
			id: 'heading-hierarchy-errors',
			category: 'Content & Accessibility',
			severity: 'error',
			message: `Heading hierarchy errors found on ${headingIssues.length} page(s)`,
			description: 'Proper heading hierarchy is essential for accessibility and SEO. Each page should have exactly one H1, and heading levels should not be skipped.',
			howToFix: 'Ensure each page has exactly one H1 element and use heading levels in sequential order (H1 → H2 → H3, etc.)',
			details: {
				headingIssues: headingIssues
			}
		});
		}
	}

	// Generate comprehensive SEO issues
	if (resolvedChecks.seo) {
		const seoIssues = generateSEOIssues(pages);
		issues.push(...seoIssues);
	}

	// Generate content quality issues
	if (resolvedChecks.contentQuality) {
		const contentQualityIssues = generateContentQualityIssues(pages);
		issues.push(...contentQualityIssues);
	}

	// Generate link validation issues
	if (resolvedChecks.links) {
		const linkValidationIssues = generateLinkValidationIssues(pages);
		issues.push(...linkValidationIssues);
	}

	// Check alt text coverage
	const totalImages = pages.reduce((sum, page) => sum + page.imageCount, 0);
	const totalImagesWithoutAlt = pages.reduce((sum, page) => sum + page.imagesWithoutAlt, 0);
	const missingAltImageDetails = pages.flatMap(page =>
		(page.imagesWithoutAltDetails || []).map(image => ({
			...image,
			page: page.title,
			pageUrl: page.url
		}))
	);

	if (resolvedChecks.altText && totalImagesWithoutAlt > 0 && totalImages > 0) {
		const coveragePercentage = Math.round(((totalImages - totalImagesWithoutAlt) / totalImages) * 100);

		issues.push({
			id: 'missing-alt-text',
			category: 'Content & Accessibility',
			severity: 'error',
			message: `${totalImagesWithoutAlt} images missing alt text (${coveragePercentage}% coverage)`,
			description: 'All images must have descriptive alt text for accessibility compliance and SEO.',
			howToFix: 'Add descriptive alt text to all images. Decorative images should have empty alt="" attributes.',
			details: {
				totalImages,
				imagesWithoutAlt: totalImagesWithoutAlt,
				coveragePercentage,
				missingImages: missingAltImageDetails.slice(0, 20),
				pagesWithIssues: pages.filter(p => p.imagesWithoutAlt > 0).map(p => ({
					title: p.title,
					url: p.url,
					imagesWithoutAlt: p.imagesWithoutAlt
				}))
			}
		});
	}

	return issues;
}

function generateSEOIssues(pages: AnalyzedPage[]): ValidationIssue[] {
	const seoIssues: ValidationIssue[] = [];

	pages.forEach(page => {
		const pageName = getPageNameFromUrl(page.url);
		const seo = page.seo;

		// Missing title issues
		if (!seo.title) {
			seoIssues.push({
				id: `missing-title-${generatePageId(page.url)}`,
				category: 'Content & Accessibility',
				severity: 'error',
				message: `"${pageName}" is missing a title tag`,
				description: 'Every page must have a descriptive title tag for SEO and accessibility.',
				howToFix: 'Add a descriptive title tag (30-60 characters) to the page',
				location: page.url,
				details: {
					page: pageName,
					url: page.url,
					currentTitle: seo.title,
					recommendedLength: '30-60 characters'
				}
			});
		} else if (seo.titleLength < 30) {
			seoIssues.push({
				id: `title-too-short-${generatePageId(page.url)}`,
				category: 'Content & Accessibility',
				severity: 'warning',
				message: `"${pageName}" title is too short (${seo.titleLength} characters)`,
				description: 'Title tags should be 30-60 characters for optimal SEO performance.',
				howToFix: 'Expand the title to include more descriptive keywords',
				location: page.url,
				details: {
					page: pageName,
					url: page.url,
					currentLength: seo.titleLength,
					currentTitle: seo.title,
					recommendedLength: '30-60 characters'
				}
			});
		} else if (seo.titleLength > 60) {
			seoIssues.push({
				id: `title-too-long-${generatePageId(page.url)}`,
				category: 'Content & Accessibility',
				severity: 'warning',
				message: `"${pageName}" title is too long (${seo.titleLength} characters)`,
				description: 'Title tags longer than 60 characters may be truncated in search results.',
				howToFix: 'Shorten the title while maintaining descriptive keywords',
				location: page.url,
				details: {
					page: pageName,
					url: page.url,
					currentLength: seo.titleLength,
					currentTitle: seo.title,
					recommendedLength: '30-60 characters'
				}
			});
		}

		// Missing meta description issues
		if (!seo.metaDescription) {
			seoIssues.push({
				id: `missing-description-${generatePageId(page.url)}`,
				category: 'Content & Accessibility',
				severity: 'error',
				message: `"${pageName}" is missing a meta description`,
				description: 'Meta descriptions are essential for SEO and appear in search results.',
				howToFix: 'Add a compelling meta description (120-160 characters) that summarizes the page content',
				location: page.url,
				details: {
					page: pageName,
					url: page.url,
					currentDescription: seo.metaDescription,
					recommendedLength: '120-160 characters'
				}
			});
		} else if (seo.metaDescriptionLength < 120) {
			seoIssues.push({
				id: `description-too-short-${generatePageId(page.url)}`,
				category: 'Content & Accessibility',
				severity: 'warning',
				message: `"${pageName}" meta description is too short (${seo.metaDescriptionLength} characters)`,
				description: 'Meta descriptions should be 120-160 characters for optimal search result display.',
				howToFix: 'Expand the meta description to include more compelling details about the page',
				location: page.url,
				details: {
					page: pageName,
					url: page.url,
					currentLength: seo.metaDescriptionLength,
					currentDescription: seo.metaDescription,
					recommendedLength: '120-160 characters'
				}
			});
		} else if (seo.metaDescriptionLength > 160) {
			seoIssues.push({
				id: `description-too-long-${generatePageId(page.url)}`,
				category: 'Content & Accessibility',
				severity: 'warning',
				message: `"${pageName}" meta description is too long (${seo.metaDescriptionLength} characters)`,
				description: 'Meta descriptions longer than 160 characters may be truncated in search results.',
				howToFix: 'Shorten the meta description while maintaining key information',
				location: page.url,
				details: {
					page: pageName,
					url: page.url,
					currentLength: seo.metaDescriptionLength,
					currentDescription: seo.metaDescription,
					recommendedLength: '120-160 characters'
				}
			});
		}

		// Open Graph validation
		if (!seo.openGraph.title && !seo.openGraph.description && !seo.openGraph.image) {
			seoIssues.push({
				id: `missing-opengraph-${generatePageId(page.url)}`,
				category: 'Content & Accessibility',
				severity: 'info',
				message: `"${pageName}" has no Open Graph meta tags`,
				description: 'Open Graph tags improve how your content appears when shared on social media.',
				howToFix: 'Add Open Graph title, description, and image meta tags',
				location: page.url,
				details: {
					page: pageName,
					url: page.url,
					missingTags: ['og:title', 'og:description', 'og:image']
				}
			});
		}
	});

	return seoIssues;
}

function getPageNameFromUrl(url: string): string {
	try {
		const urlObj = new URL(url);
		const pathname = urlObj.pathname;

		if (pathname === '/' || pathname === '') {
			return 'Home';
		}

		// Extract page name from path
		const segments = pathname.split('/').filter(segment => segment.length > 0);
		const lastSegment = segments[segments.length - 1];

		// Convert slug to title case
		return lastSegment
			.split('-')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	} catch {
		return 'Unknown Page';
	}
}

function generatePageId(url: string): string {
	// Create a simple hash-like ID from URL
	let hash = 0;
	for (let i = 0; i < url.length; i++) {
		const char = url.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(16);
}

async function analyzeLinks(parsedHTML: ParsedHTML, baseUrl: string): Promise<LinkAnalysis> {
	const links = parsedHTML.links;
	const baseHostname = new URL(baseUrl).hostname;

	let internalLinks = 0;
	let externalLinks = 0;
	let emailLinks = 0;
	let phoneLinks = 0;
	let anchorLinks = 0;
	let downloadLinks = 0;
	let socialMediaLinks = 0;
	const brokenLinks: Array<{
		href: string;
		text: string;
		status: 'broken' | 'suspicious' | 'redirect';
		statusCode?: number;
		error?: string;
	}> = [];

	const socialMediaDomains = [
		'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
		'youtube.com', 'tiktok.com', 'pinterest.com', 'snapchat.com',
		'whatsapp.com', 'telegram.org'
	];

	const downloadExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar'];

	for (const link of links) {
		const href = link.getAttribute('href');
		const text = link.textContent?.trim() || '';

		if (!href) continue;

		// Categorize links
		if (href.startsWith('mailto:')) {
			emailLinks++;
		} else if (href.startsWith('tel:')) {
			phoneLinks++;
		} else if (href.startsWith('#')) {
			anchorLinks++;
		} else if (downloadExtensions.some(ext => href.toLowerCase().includes(ext))) {
			downloadLinks++;
		} else {
			try {
				const linkUrl = new URL(href, baseUrl);

				if (linkUrl.hostname === baseHostname) {
					internalLinks++;
				} else {
					externalLinks++;

					// Check if it's a social media link
					if (socialMediaDomains.some(domain => linkUrl.hostname.includes(domain))) {
						socialMediaLinks++;
					}
				}

				// Basic link validation for suspicious patterns
				if (href.includes('javascript:') || href.includes('data:')) {
					brokenLinks.push({
						href,
						text,
						status: 'suspicious',
						error: 'Potentially unsafe link type'
					});
				}

			} catch (error) {
				// Invalid URL
				brokenLinks.push({
					href,
					text,
					status: 'broken',
					error: 'Invalid URL format'
				});
			}
		}
	}

	return {
		totalLinks: links.length,
		internalLinks,
		externalLinks,
		brokenLinks,
		emailLinks,
		phoneLinks,
		anchorLinks,
		downloadLinks,
		socialMediaLinks
	};
}

function analyzeContentQuality(parsedHTML: ParsedHTML, url: string): ContentQualityAnalysis {
	const textContent = getScannableContentText(parsedHTML);
	const issues: Array<{
		type: 'placeholder' | 'lorem' | 'generic' | 'webflow-default' | 'short-content' | 'duplicate-content';
		text: string;
		location: string;
		severity: 'error' | 'warning' | 'info';
		matches?: Array<{ pattern: string; sample: string }>;
	}> = [];

	// Check for different types of problematic content
	let hasPlaceholderContent = false;
	let hasLoremIpsum = false;
	let hasWebflowDefaults = false;
	let hasGenericContent = false;

	// Lorem Ipsum detection
	const loremMatches = LOREM_IPSUM_PATTERNS.filter(pattern => pattern.test(textContent));
	if (loremMatches.length > 0) {
		hasLoremIpsum = true;
		issues.push({
			type: 'lorem',
			text: 'Lorem Ipsum content detected',
			location: url,
			severity: 'warning'
		});
	}

	// Placeholder content detection
	const placeholderMatches = PLACEHOLDER_PATTERNS.filter(pattern => pattern.test(textContent));
	if (placeholderMatches.length > 0) {
		hasPlaceholderContent = true;
		issues.push({
			type: 'placeholder',
			text: 'Placeholder content detected',
			location: url,
			severity: 'warning'
		});
	}

	// Generic content detection
	const genericMatches = GENERIC_CONTENT_PATTERNS.filter(pattern => pattern.test(textContent));
	if (genericMatches.length > 0) {
		hasGenericContent = true;
		issues.push({
			type: 'generic',
			text: 'Generic content detected',
			location: url,
			severity: 'warning'
		});
	}

	// Webflow default content detection
	const webflowMatches = collectPatternMatches(WEBFLOW_DEFAULT_PATTERNS, textContent);
	if (webflowMatches.length > 0) {
		hasWebflowDefaults = true;
		issues.push({
			type: 'webflow-default',
			text: 'Webflow default content detected',
			location: url,
			severity: 'warning',
			matches: webflowMatches
		});
	}

	// Word count and short content detection
	const words = textContent.trim().split(/\s+/).filter((word: string) => word.length > 0);
	const wordCount = words.length;

	if (wordCount < 50) {
		issues.push({
			type: 'short-content',
			text: `Very short content (${wordCount} words)`,
			location: url,
			severity: 'warning'
		});
	}

	// Calculate content quality score (0-100)
	let contentScore = 100;

	if (hasLoremIpsum) contentScore -= 40;
	if (hasPlaceholderContent) contentScore -= 30;
	if (hasWebflowDefaults) contentScore -= 20;
	if (hasGenericContent) contentScore -= 15;
	if (wordCount < 50) contentScore -= 10;
	if (wordCount < 20) contentScore -= 20;

	contentScore = Math.max(0, contentScore);

	return {
		hasPlaceholderContent,
		hasLoremIpsum,
		hasWebflowDefaults,
		hasGenericContent,
		contentScore,
		issues,
		wordCount,
		duplicateContent: [] // TODO: Implement cross-page duplicate detection
	};
}

function generateContentQualityIssues(pages: AnalyzedPage[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Aggregate content quality issues across all pages
	const pagesWithQualityIssues = pages.filter(page =>
		page.contentQuality.contentScore < 70 || page.contentQuality.issues.length > 0
	);

	if (pagesWithQualityIssues.length > 0) {
		// Group by issue type
		const placeholderPages = pages.filter(p => p.contentQuality.hasPlaceholderContent);
		const loremPages = pages.filter(p => p.contentQuality.hasLoremIpsum);
		const webflowDefaultPages = pages.filter(p => p.contentQuality.hasWebflowDefaults);
		const shortContentPages = pages.filter(p => p.contentQuality.wordCount < 50);

		if (placeholderPages.length > 0) {
			issues.push({
				id: 'placeholder-content-detected',
				category: 'Content & Accessibility',
				severity: 'warning',
				message: `Placeholder content detected on ${placeholderPages.length} page(s)`,
				description: 'Placeholder text should be replaced with real, relevant content before publishing.',
				howToFix: 'Replace all placeholder text with actual content that serves your users',
				details: {
					affectedPages: placeholderPages.map(p => ({
						url: p.url,
						pageName: getPageNameFromUrl(p.url),
						contentScore: p.contentQuality.contentScore
					}))
				}
			});
		}

		if (webflowDefaultPages.length > 0) {
			issues.push({
				id: 'webflow-default-content',
				category: 'Content & Accessibility',
				severity: 'warning',
				message: `Webflow default content detected on ${webflowDefaultPages.length} page(s)`,
				description: 'Default Webflow content should be customized to match your brand and message.',
				howToFix: 'Replace default Webflow text with custom content',
				details: {
					affectedPages: webflowDefaultPages.map(p => ({
						url: p.url,
						pageName: getPageNameFromUrl(p.url),
						contentScore: p.contentQuality.contentScore,
						matches: p.contentQuality.issues
							.filter(issue => issue.type === 'webflow-default')
							.flatMap(issue => issue.matches || [])
							.slice(0, 5)
					}))
				}
			});
		}

		if (shortContentPages.length > 0) {
			issues.push({
				id: 'insufficient-content',
				category: 'Content & Accessibility',
				severity: 'warning',
				message: `${shortContentPages.length} page(s) have very little content`,
				description: 'Pages with minimal content may provide poor user experience and SEO performance.',
				howToFix: 'Add more meaningful content to provide value to users and improve SEO',
				details: {
					affectedPages: shortContentPages.map(p => ({
						url: p.url,
						pageName: getPageNameFromUrl(p.url),
						wordCount: p.contentQuality.wordCount
					}))
				}
			});
		}
	}

	return issues;
}

function generateLinkValidationIssues(pages: AnalyzedPage[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Aggregate broken links across all pages
	const allBrokenLinks = pages.flatMap(page =>
		page.links.brokenLinks.map(link => ({
			...link,
			page: getPageNameFromUrl(page.url),
			pageUrl: page.url
		}))
	);

	if (allBrokenLinks.length > 0) {
		issues.push({
			id: 'broken-links-detected',
			category: 'Content & Accessibility',
			severity: 'error',
			message: `${allBrokenLinks.length} broken or suspicious link(s) detected`,
			description: 'Broken links create poor user experience and should be fixed or removed.',
			howToFix: 'Review and fix all broken links, or remove them if no longer needed',
			details: {
				brokenLinks: allBrokenLinks.map(link => ({
					href: link.href,
					text: link.text,
					page: link.page,
					pageUrl: link.pageUrl,
					status: link.status,
					error: link.error
				}))
			}
		});
	}

	// Check for pages with no external links (might indicate poor linking strategy)
	const pagesWithNoExternalLinks = pages.filter(page =>
		page.links.externalLinks === 0 && page.links.totalLinks > 3
	);

	if (pagesWithNoExternalLinks.length > 0) {
		issues.push({
			id: 'no-external-links',
			category: 'Content & Accessibility',
			severity: 'info',
			message: `${pagesWithNoExternalLinks.length} page(s) have no external links`,
			description: 'Strategic external linking can improve SEO and provide value to users.',
			howToFix: 'Consider adding relevant external links to authoritative sources where appropriate',
			details: {
				affectedPages: pagesWithNoExternalLinks.map(p => ({
					url: p.url,
					pageName: getPageNameFromUrl(p.url),
					totalLinks: p.links.totalLinks
				}))
			}
		});
	}

	// Check for pages with too many external links
	const pagesWithTooManyExternalLinks = pages.filter(page =>
		page.links.externalLinks > 20
	);

	if (pagesWithTooManyExternalLinks.length > 0) {
		issues.push({
			id: 'excessive-external-links',
			category: 'Content & Accessibility',
			severity: 'warning',
			message: `${pagesWithTooManyExternalLinks.length} page(s) have excessive external links`,
			description: 'Too many external links can dilute page authority and may appear spammy.',
			howToFix: 'Review external links and remove unnecessary ones, focus on quality over quantity',
			details: {
				affectedPages: pagesWithTooManyExternalLinks.map(p => ({
					url: p.url,
					pageName: getPageNameFromUrl(p.url),
					externalLinks: p.links.externalLinks
				}))
			}
		});
	}

	return issues;
}

function calculateContentStats(pages: AnalyzedPage[]) {
	const totalPages = pages.length;
	const pagesWithLoremIpsum = pages.filter(p => p.hasLoremIpsum).length;
	const headingHierarchyErrors = pages.filter(p =>
		p.headingHierarchy.h1Count !== 1 || p.headingHierarchy.hasSkippedLevels
	).length;

	const totalImages = pages.reduce((sum, page) => sum + page.imageCount, 0);
	const totalImagesWithAlt = pages.reduce((sum, page) => sum + (page.imageCount - page.imagesWithoutAlt), 0);
	const altTextCoverage = totalImages > 0 ? Math.round((totalImagesWithAlt / totalImages) * 100) : 100;

	// SEO statistics
	const pagesWithValidTitles = pages.filter(p => p.seo.hasValidTitle).length;
	const pagesWithValidDescriptions = pages.filter(p => p.seo.hasValidDescription).length;
	const pagesWithSEOIssues = pages.filter(p => !p.seo.hasValidTitle || !p.seo.hasValidDescription).length;

	// Calculate overall SEO compliance score
	const totalSEOChecks = totalPages * 2; // Title + Description for each page
	const passedSEOChecks = pagesWithValidTitles + pagesWithValidDescriptions;
	const seoComplianceScore = totalPages > 0 ? Math.round((passedSEOChecks / totalSEOChecks) * 100) : 100;

	// Content quality metrics
	const averageContentScore = totalPages > 0 ?
		Math.round(pages.reduce((sum, p) => sum + p.contentQuality.contentScore, 0) / totalPages) : 100;
	const pagesWithContentIssues = pages.filter(p => p.contentQuality.contentScore < 70).length;

	// Link analysis metrics
	const totalLinks = pages.reduce((sum, p) => sum + p.links.totalLinks, 0);
	const totalBrokenLinks = pages.reduce((sum, p) => sum + p.links.brokenLinks.length, 0);
	const averageLinksPerPage = totalPages > 0 ? Math.round(totalLinks / totalPages) : 0;

	return {
		totalPages,
		pagesWithLoremIpsum,
		headingHierarchyErrors,
		altTextCoverage,
		seoComplianceScore,
		pagesWithSEOIssues,
		averageContentScore,
		pagesWithContentIssues,
		totalLinks,
		totalBrokenLinks,
		averageLinksPerPage
	};
}
