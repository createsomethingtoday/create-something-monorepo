/**
 * Interactions Validator - Webflow Interactions / GSAP policy checks
 *
 * Validates:
 * - Legacy IX2 interaction markers are not present on submitted templates
 */

import { CmsTemplateCoverage, InteractionsAnalysisResult, ValidationIssue } from '../types';
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

export type CmsTemplateHint = {
	templateSlug: string;
	publishPath?: string | null;
	collectionId?: string | null;
	collectionName?: string | null;
	collectionSlug?: string | null;
};

type InteractionsValidationOptions = {
	maxPages?: number;
	cmsTemplateHints?: CmsTemplateHint[];
};

type PageValidationTarget = {
	url: string;
	source: 'page' | 'cms-item';
	cmsTemplateSlug?: string;
	discoverySource?: 'sitemap' | 'link';
};

type Ix2AnalyzedPage = Ix2PageResult & {
	source: PageValidationTarget['source'];
	cmsTemplateSlug?: string;
	discoverySource?: PageValidationTarget['discoverySource'];
};

type PageUrlBuildResult = {
	targets: PageValidationTarget[];
	skippedCmsTemplateSlugs: string[];
	cmsTemplateCoverage: CmsTemplateCoverage[];
	cmsItemUrlsDiscovered: number;
};

const DISCOVERY_TIMEOUT = 5000;
const MAX_DISCOVERY_TEXT_SIZE = 2 * 1024 * 1024;
const MAX_CMS_ITEM_URLS_PER_TEMPLATE = 1;
const WEBFLOW_ECOMMERCE_TEMPLATE_ROOTS = new Set(['/product', '/sku', '/category']);

export async function validateInteractions(
	siteUrl: string,
	pageSlugs?: string[],
	options?: InteractionsValidationOptions
): Promise<InteractionsAnalysisResult> {
	console.log(`Starting interactions validation for ${siteUrl}`);

	try {
		const {
			targets,
			skippedCmsTemplateSlugs,
			cmsTemplateCoverage,
			cmsItemUrlsDiscovered
		} = await buildPageTargets(siteUrl, pageSlugs, options);
		const pageResults = await Promise.all(
			targets.map(async (target) => {
				try {
					const value: Ix2AnalyzedPage = {
						...(await analyzeInteractionsPage(target.url)),
						source: target.source
					};
					if (target.cmsTemplateSlug) value.cmsTemplateSlug = target.cmsTemplateSlug;
					if (target.discoverySource) value.discoverySource = target.discoverySource;
					return {
						status: 'fulfilled' as const,
						value
					};
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					return { status: 'rejected' as const, reason: { url: target.url, error: message } };
				}
			})
		);
		const pages = pageResults
			.filter((result): result is { status: 'fulfilled'; value: Ix2AnalyzedPage } => result.status === 'fulfilled')
			.map((result) => result.value);
		const failedPages = pageResults
			.filter((result): result is { status: 'rejected'; reason: FailedPageResult } => result.status === 'rejected')
			.map((result) => result.reason);
		const pagesWithLegacyIx2 = pages.filter((page) => page.legacyIx2Detected);
		const legacyIx2Count = pagesWithLegacyIx2.reduce((total, page) => total + page.legacyIx2Count, 0);
		const cmsItemUrlsValidated = pages.filter((page) => page.source === 'cms-item').length;
		const issues = [
			...generateInteractionIssues(pagesWithLegacyIx2, legacyIx2Count),
			...generateIncompleteAnalysisIssues(failedPages)
		];

		return {
			issues,
			stats: {
				legacyIx2Detected: pages.length === 0 ? null : pagesWithLegacyIx2.length > 0,
				legacyIx2Count,
				pagesRequested: targets.length,
				pagesAnalyzed: pages.length,
				pagesFailed: failedPages.length,
				pagesSkipped: skippedCmsTemplateSlugs.length,
				pagesWithLegacyIx2: pagesWithLegacyIx2.length,
				analysisComplete: failedPages.length === 0,
				analysisStatus: failedPages.length === 0 ? 'completed' : pages.length > 0 ? 'partial' : 'failed',
				errorMessage: failedPages.length > 0 ? `${failedPages.length} page(s) could not be analyzed` : undefined,
				skippedCmsTemplateSlugs,
				cmsItemUrlsDiscovered,
				cmsItemUrlsValidated,
				cmsTemplateCoverageStatus: getCmsTemplateCoverageStatus(cmsTemplateCoverage),
				cmsTemplateCoverage
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
				pagesSkipped: 0,
				pagesWithLegacyIx2: 0,
				analysisComplete: false,
				analysisStatus: 'failed',
				errorMessage: message,
				cmsItemUrlsDiscovered: 0,
				cmsItemUrlsValidated: 0,
				cmsTemplateCoverageStatus: 'none',
				cmsTemplateCoverage: []
			},
			pages: []
		};
	}
}

async function buildPageTargets(
	siteUrl: string,
	pageSlugs?: string[],
	options: InteractionsValidationOptions = {}
): Promise<PageUrlBuildResult> {
	const maxPages = options.maxPages ?? 25;
	const targets: PageValidationTarget[] = [];
	const targetUrls = new Set<string>();
	const cmsTemplateHints = collectCmsTemplateHints(pageSlugs, options.cmsTemplateHints);
	const skippedCmsTemplateSlugs = cmsTemplateHints.map((hint) => hint.templateSlug);

	addPageTarget(targets, targetUrls, {
		url: normalizePageUrl(siteUrl, siteUrl),
		source: 'page'
	});

	if (Array.isArray(pageSlugs)) {
		pageSlugs.forEach((slug) => {
			if (typeof slug !== 'string' || slug.trim() === '') return;
			if (isInternalCmsTemplateSlug(slug)) return;
			addPageTarget(targets, targetUrls, {
				url: normalizePageUrl(slug, siteUrl),
				source: 'page'
			});
		});
	}

	const remainingSlots = Math.max(0, maxPages - targets.length);
	const { coverage, cmsTargets } = await discoverCmsTemplateCoverage(
		siteUrl,
		cmsTemplateHints,
		targetUrls,
		remainingSlots
	);
	cmsTargets.forEach((target) => addPageTarget(targets, targetUrls, target));

	return {
		targets: targets.slice(0, maxPages),
		skippedCmsTemplateSlugs,
		cmsTemplateCoverage: coverage,
		cmsItemUrlsDiscovered: coverage.reduce((total, item) => total + item.discoveredUrls.length, 0)
	};
}

function addPageTarget(targets: PageValidationTarget[], seen: Set<string>, target: PageValidationTarget) {
	if (seen.has(target.url)) return;
	seen.add(target.url);
	targets.push(target);
}

function collectCmsTemplateHints(pageSlugs?: string[], hints?: CmsTemplateHint[]): CmsTemplateHint[] {
	const bySlug = new Map<string, CmsTemplateHint>();

	const addHint = (hint: CmsTemplateHint) => {
		const templateSlug = normalizeCmsTemplateSlug(hint.templateSlug || hint.publishPath || '');
		if (!isInternalCmsTemplateSlug(templateSlug)) return;
		const existing = bySlug.get(templateSlug);
		bySlug.set(templateSlug, {
			...existing,
			...hint,
			templateSlug,
			collectionId: hint.collectionId || existing?.collectionId,
			collectionName: hint.collectionName || existing?.collectionName,
			publishPath: hint.publishPath || existing?.publishPath
		});
	};

	if (Array.isArray(pageSlugs)) {
		pageSlugs.forEach((slug) => {
			if (typeof slug === 'string' && isInternalCmsTemplateSlug(slug)) {
				addHint({ templateSlug: slug });
			}
		});
	}

	if (Array.isArray(hints)) {
		hints.forEach((hint) => addHint(hint));
	}

	return Array.from(bySlug.values());
}

async function discoverCmsTemplateCoverage(
	siteUrl: string,
	hints: CmsTemplateHint[],
	existingUrls: Set<string>,
	remainingSlots: number
): Promise<{ coverage: CmsTemplateCoverage[]; cmsTargets: PageValidationTarget[] }> {
	if (hints.length === 0) {
		return { coverage: [], cmsTargets: [] };
	}

	const sitemapUrls = await fetchSitemapUrls(siteUrl);
	const linkUrls = await fetchHomepageLinks(siteUrl);
	const cmsTargets: PageValidationTarget[] = [];
	let slots = remainingSlots;

	const coverage = hints.map((hint): CmsTemplateCoverage => {
		const candidateSlugs = getCandidateCollectionSlugs(hint);
		const sitemapMatches = findCmsItemUrlMatches(siteUrl, sitemapUrls, candidateSlugs);
		const linkMatches = sitemapMatches.length > 0
			? []
			: findCmsItemUrlMatches(siteUrl, linkUrls, candidateSlugs);
		const source = sitemapMatches.length > 0
			? 'sitemap'
			: linkMatches.length > 0
				? 'link'
				: undefined;
		const discoveredUrls = dedupeStrings([
			...(source === 'sitemap' ? sitemapMatches : linkMatches)
		]).slice(0, 10);
		const selectedUrls = slots > 0
			? discoveredUrls.filter((url) => !existingUrls.has(url)).slice(0, Math.min(MAX_CMS_ITEM_URLS_PER_TEMPLATE, slots))
			: [];
		slots -= selectedUrls.length;

		selectedUrls.forEach((url) => {
			cmsTargets.push({
				url,
				source: 'cms-item',
				cmsTemplateSlug: hint.templateSlug,
				discoverySource: source
			});
		});

		return {
			templateSlug: hint.templateSlug,
			collectionId: hint.collectionId || undefined,
			collectionName: hint.collectionName || undefined,
			candidateSlugs,
			discoveredUrls,
			validatedUrls: selectedUrls,
			status: selectedUrls.length > 0 ? 'covered' : 'uncovered',
			source
		};
	});

	return { coverage, cmsTargets };
}

async function fetchSitemapUrls(siteUrl: string): Promise<string[]> {
	const sitemapUrl = new URL('/sitemap.xml', siteUrl).toString();
	const rootSitemap = await fetchDiscoveryText(sitemapUrl, 'sitemap');
	if (!rootSitemap) return [];

	const locs = extractSitemapLocs(rootSitemap);
	const nestedSitemaps = locs.filter((url) => /\.xml(?:$|[?#])/i.test(new URL(url, siteUrl).pathname)).slice(0, 5);
	const pageUrls = locs.filter((url) => !/\.xml(?:$|[?#])/i.test(new URL(url, siteUrl).pathname));

	for (const nestedUrl of nestedSitemaps) {
		const nested = await fetchDiscoveryText(nestedUrl, 'sitemap');
		if (nested) {
			pageUrls.push(...extractSitemapLocs(nested));
		}
	}

	return dedupeStrings(pageUrls);
}

async function fetchHomepageLinks(siteUrl: string): Promise<string[]> {
	const html = await fetchDiscoveryText(siteUrl, 'html');
	if (!html) return [];
	const urls: string[] = [];
	const hrefPattern = /\shref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
	let match: RegExpExecArray | null;

	while ((match = hrefPattern.exec(html)) !== null) {
		const href = match[1] || match[2] || match[3];
		if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) continue;
		try {
			const url = new URL(href, siteUrl);
			url.hash = '';
			url.search = '';
			if (url.hostname === new URL(siteUrl).hostname) {
				urls.push(url.toString());
			}
		} catch {
			// Ignore malformed hrefs.
		}
	}

	return dedupeStrings(urls);
}

async function fetchDiscoveryText(url: string, kind: 'sitemap' | 'html'): Promise<string | null> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				Accept: kind === 'sitemap' ? 'application/xml,text/xml,text/plain,*/*' : 'text/html,*/*',
				'User-Agent': 'WebflowWayValidator/1.0'
			}
		});
		if (!response.ok) return null;

		const contentType = response.headers.get('content-type') || '';
		if (kind === 'html' && !/text\/html/i.test(contentType)) return null;

		const text = await response.text();
		return text.length > MAX_DISCOVERY_TEXT_SIZE ? text.slice(0, MAX_DISCOVERY_TEXT_SIZE) : text;
	} catch {
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}

function extractSitemapLocs(xml: string): string[] {
	return dedupeStrings(
		Array.from(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi))
			.map((match) => decodeHtmlEntities(match[1].trim()))
			.filter((url) => /^https?:\/\//i.test(url))
	);
}

function findCmsItemUrlMatches(siteUrl: string, urls: string[], candidateSlugs: string[]): string[] {
	const originHost = new URL(siteUrl).hostname;
	const normalizedCandidates = candidateSlugs.map(slugify).filter(Boolean);
	if (normalizedCandidates.length === 0) return [];

	return urls.filter((url) => {
		try {
			const parsed = new URL(url, siteUrl);
			if (parsed.hostname !== originHost) return false;
			const segments = parsed.pathname
				.split('/')
				.map((segment) => slugify(decodeURIComponent(segment)))
				.filter(Boolean);

			return normalizedCandidates.some((candidate) => {
				const index = segments.indexOf(candidate);
				return index >= 0 && segments.length > index + 1;
			});
		} catch {
			return false;
		}
	});
}

function getCandidateCollectionSlugs(hint: CmsTemplateHint): string[] {
	const candidates: string[] = [];
	const detailSlug = normalizeCmsTemplateSlug(hint.templateSlug).replace(/^\/detail_/i, '');
	if (detailSlug) candidates.push(detailSlug);
	if (hint.collectionSlug) candidates.push(hint.collectionSlug);
	if (hint.collectionName) candidates.push(slugify(hint.collectionName));
	if (hint.publishPath && !isInternalCmsTemplateSlug(hint.publishPath)) {
		const firstSegment = getPathname(hint.publishPath).split('/').filter(Boolean)[0];
		if (firstSegment) candidates.push(firstSegment);
	}

	return expandCandidateSlugVariants(candidates);
}

function expandCandidateSlugVariants(candidates: string[]): string[] {
	const variants: string[] = [];

	for (const candidate of candidates.map(slugify).filter(Boolean)) {
		variants.push(candidate);
		if (candidate.endsWith('ies') && candidate.length > 4) {
			variants.push(`${candidate.slice(0, -3)}y`);
		} else if (candidate.endsWith('s') && !candidate.endsWith('ss') && candidate.length > 3) {
			variants.push(candidate.slice(0, -1));
		}
	}

	return dedupeStrings(variants);
}

function getCmsTemplateCoverageStatus(coverage: CmsTemplateCoverage[]): 'none' | 'covered' | 'partial' | 'uncovered' {
	if (coverage.length === 0) return 'none';
	const covered = coverage.filter((item) => item.status === 'covered').length;
	if (covered === coverage.length) return 'covered';
	if (covered > 0) return 'partial';
	return 'uncovered';
}

function dedupeStrings(values: string[]): string[] {
	return Array.from(new Set(values.filter((value) => typeof value === 'string' && value.trim() !== '')));
}

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/_/g, '-')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function normalizePageUrl(value: string, baseUrl: string): string {
	const trimmed = value.trim();
	const path = trimmed.startsWith('/') || trimmed.startsWith('http') ? trimmed : `/${trimmed}`;
	const url = new URL(path, baseUrl);
	url.hash = '';
	return url.toString();
}

function isInternalCmsTemplateSlug(value: string): boolean {
	const pathname = getPathname(value);
	const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
	return /^\/detail_[^/]+\/?$/i.test(pathname) || WEBFLOW_ECOMMERCE_TEMPLATE_ROOTS.has(normalizedPathname.toLowerCase());
}

function normalizeCmsTemplateSlug(value: string): string {
	const pathname = getPathname(value);
	return pathname || value.trim();
}

function getPathname(value: string): string {
	const trimmed = value.trim();
	if (trimmed === '') return '';

	try {
		const path = trimmed.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `/${trimmed}`;
		return new URL(path, 'https://example.com').pathname;
	} catch {
		const withoutQuery = trimmed.split(/[?#]/, 1)[0] || '';
		return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
	}
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
	const nonLottieActionTypeCount = countNonLottieIx2ActionTypes(html);
	const matches: Ix2Match[] = [
		{
			label: 'data-w-id attributes',
			count: dataWIdCount,
			strong: false
		},
		{
			label: 'data-is-ix2-target attributes',
			count: dataIsIx2TargetCount,
			strong: false
		},
		{
			label: 'Webflow IX2 runtime calls',
			count: ix2RuntimeCallCount,
			strong: true
		},
		{
			label: 'non-Lottie IX2 action types',
			count: nonLottieActionTypeCount,
			strong: true
		},
		{
			label: 'w-mod-ix CSS/runtime markers',
			count: countPatternMatches(html, /w-mod-ix/gi),
			strong: false
		}
	].filter((item) => item.count > 0);
	const strongMatches = matches.filter((item) => item.strong);
	const detected = strongMatches.length > 0;

	return {
		detected,
		count: detected ? strongMatches.reduce((total, item) => total + item.count, nonLottieElementMarkerCount) : 0,
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
	return countNonLottieIx2ActionTypes(html) > 0;
}

function countNonLottieIx2ActionTypes(html: string) {
	return Array.from(html.matchAll(/["']?actionTypeId["']?\s*:\s*["']([^"']+)["']/gi)).filter(
		([, actionTypeId]) => !LOTTIE_IX2_ACTION_TYPES.has(actionTypeId)
	).length;
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

function generateIncompleteAnalysisIssues(failedPages: FailedPageResult[]): ValidationIssue[] {
	if (failedPages.length === 0) {
		return [];
	}

	return [{
		id: 'interactions-analysis-incomplete',
		category: 'Interactions and GSAP',
		severity: 'warning',
		message: `${failedPages.length} page${failedPages.length === 1 ? '' : 's'} could not be checked for Interactions and GSAP`,
		description: 'Interactions validation could not verify every page. This does not block submission unless legacy IX2 interactions are detected on a page that was checked.',
		howToFix: 'Publish all template pages, confirm each published URL is accessible, and rerun validation to complete the IX2 policy check.',
		details: {
			howToFix: 'Publish all template pages, confirm each published URL is accessible, and rerun validation to complete the IX2 policy check.',
			affectedPages: failedPages.map((page) => ({
				url: page.url,
				error: page.error
			})),
			issues: failedPages.map((page) => `${page.url}: ${page.error}`)
		}
	}];
}
