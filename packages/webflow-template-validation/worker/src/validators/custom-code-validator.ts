import { analyzeCustomCodeHtml, createCustomCodeSurfaceHash, CUSTOM_CODE_POLICY_VERSION } from '../../../policy/custom-code-policy.js';
import type { CustomCodeAnalysisResult, ValidationIssue } from '../types';
import { fetchHTML } from '../utils/fetch-utils';

type CustomCodeValidationOptions = {
	maxPages?: number;
};

const WEBFLOW_ECOMMERCE_TEMPLATE_ROOTS = new Set(['/product', '/sku', '/category']);

export async function validateCustomCode(
	siteUrl: string,
	pageSlugs?: string[],
	options: CustomCodeValidationOptions = {},
): Promise<CustomCodeAnalysisResult> {
	const targets = buildPageTargets(siteUrl, pageSlugs, options.maxPages ?? 25);
	const rootUrl = targets[0];
	const results = await Promise.all(
		targets.map(async (url) => {
			try {
				const response = await fetchHTML(url);
				const analysis = analyzeCustomCodeHtml(response.html, url);
				return {
					url,
					analysis,
					surfaceHash: url === rootUrl ? await createCustomCodeSurfaceHash(response.html, url) : undefined,
				};
			} catch (error) {
				return {
					url,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}),
	);

	const issues: ValidationIssue[] = [];
	let externalScriptCount = 0;
	let inlineScriptCount = 0;
	let rejectedScriptCount = 0;
	let pagesAnalyzed = 0;
	let pagesFailed = 0;
	let homepageSurfaceHash: string | undefined;

	for (const result of results) {
		if ('error' in result) {
			pagesFailed += 1;
			issues.push({
				id: 'custom-code.analysis-incomplete',
				category: 'Custom Code & Site Settings',
				severity: 'error',
				message: 'Published custom code could not be verified',
				description: `The Validator could not inspect ${result.url}: ${result.error}`,
				howToFix: 'Publish the latest site, confirm every submitted page is publicly accessible, and rerun validation.',
				location: result.url,
				details: {
					policyVersion: CUSTOM_CODE_POLICY_VERSION,
					errorMessage: result.error,
				},
			});
			continue;
		}

		pagesAnalyzed += 1;
		externalScriptCount += result.analysis.stats.externalScriptCount;
		inlineScriptCount += result.analysis.stats.inlineScriptCount;
		rejectedScriptCount += result.analysis.stats.rejectedScriptCount;
		if (result.surfaceHash) homepageSurfaceHash = result.surfaceHash;

		for (const finding of result.analysis.findings) {
			issues.push({
				id: finding.policy,
				category: 'Custom Code & Site Settings',
				severity: 'error',
				message: finding.message,
				description:
					finding.kind === 'external'
						? `Prohibited external script found on ${result.url}.`
						: `Prohibited inline script found on ${result.url}.`,
				howToFix: 'Remove the custom code, publish again, and rerun the Webflow Way Validator.',
				location: result.url,
				details: {
					policyVersion: result.analysis.policyVersion,
					kind: finding.kind,
					source: finding.source,
					excerpt: finding.excerpt,
				},
			});
		}
	}

	return {
		issues,
		policyVersion: CUSTOM_CODE_POLICY_VERSION,
		homepageSurfaceHash,
		stats: {
			externalScriptCount,
			inlineScriptCount,
			rejectedScriptCount,
			pagesRequested: targets.length,
			pagesAnalyzed,
			pagesFailed,
			analysisComplete: pagesFailed === 0,
		},
		pages: results.map((result) => ({
			url: result.url,
			passed: !('error' in result) && result.analysis.passed,
			rejectedScriptCount: 'error' in result ? 0 : result.analysis.stats.rejectedScriptCount,
			errorMessage: 'error' in result ? result.error : undefined,
		})),
	};
}

function buildPageTargets(siteUrl: string, pageSlugs: string[] | undefined, maxPages: number) {
	const rootUrl = normalizePageUrl(siteUrl, siteUrl);
	const rootOrigin = new URL(rootUrl).origin;
	const targets = [rootUrl];
	const seen = new Set(targets);

	for (const slug of pageSlugs || []) {
		if (typeof slug !== 'string' || slug.trim() === '') continue;
		let url: string;
		try {
			url = normalizePageUrl(slug, rootUrl);
		} catch {
			continue;
		}
		const parsed = new URL(url);
		if (parsed.origin !== rootOrigin || isInternalTemplatePath(parsed.pathname)) continue;
		if (seen.has(url)) continue;
		seen.add(url);
		targets.push(url);
		if (targets.length >= maxPages) break;
	}

	return targets;
}

function isInternalTemplatePath(pathname: string) {
	const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
	return /^\/detail_[^/]+$/i.test(normalized) || WEBFLOW_ECOMMERCE_TEMPLATE_ROOTS.has(normalized.toLowerCase());
}

function normalizePageUrl(value: string, siteUrl: string) {
	const base = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
	return new URL(value, base).href;
}
