/**
 * Pure decisions behind `wf-template-validate validate`: how an issue is
 * bucketed, which checks run, whether a result may be recorded, and the exit
 * code. Kept apart from cli.ts (which runs on import) so they can be tested.
 */

import { getSlugPathname, isInternalCmsTemplateSlug } from '../../extension/src/utils.ts';
import { DEFAULT_WORKER_BASE, PUBLISHED_SITE_CHECKS, type ValidationIssue } from './worker-client.ts';

export type Bucket = 'blocker' | 'warning' | 'info';

/** Same rule as the extension: any error, or any issue with a policy tag (for example ix2-rejected), blocks. */
export function bucketOf(issue: ValidationIssue): Bucket {
	if (issue.severity === 'error' || typeof issue.details?.policy === 'string') return 'blocker';
	return issue.severity === 'warning' ? 'warning' : 'info';
}

export function howToFix(issue: ValidationIssue): string | undefined {
	const value = issue.details?.howToFix ?? issue.howToFix;
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Parse --checks. Undefined means every published-site check. Throws on unknown or empty lists. */
export function parseChecks(value: string | undefined): string[] {
	if (!value) return [...PUBLISHED_SITE_CHECKS];
	const requested = value.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
	const allowed = new Set<string>(PUBLISHED_SITE_CHECKS);
	const bad = requested.filter((c) => !allowed.has(c));
	if (bad.length > 0 || requested.length === 0) {
		const extra = bad.includes('designer')
			? ' The designer check needs Designer data; run `wf-template-validate login`, then pass --site <siteId>, or run the Template Validator app.'
			: '';
		throw new Error(`Unknown or unsupported check(s): ${bad.join(', ') || '(none)'}. Allowed: ${PUBLISHED_SITE_CHECKS.join(', ')}.${extra}`);
	}
	return [...new Set(requested)];
}

/**
 * Why a run with Designer data must not be recorded, or null when it may be.
 * Recording posts the creator's Webflow access token as evidence, so a
 * non-default worker needs --trust-worker.
 */
export function recordSkipReason(params: {
	mode: 'async' | 'legacy';
	collectionIncomplete: string[];
	workerBase: string;
	trustWorker: boolean;
	resultIncomplete?: string[];
}): string | null {
	const { mode, collectionIncomplete, workerBase, trustWorker, resultIncomplete = [] } = params;
	if (mode !== 'async') return 'the /validate fallback does not run the Designer checks, so this result was not recorded';
	if (resultIncomplete.length > 0) return `the worker result was incomplete, so it was not recorded (${resultIncomplete.join('; ')})`;
	if (collectionIncomplete.length > 0) {
		return `the Designer data collection was incomplete, so this result was not recorded (${collectionIncomplete.join('; ')})`;
	}
	if (workerBase !== DEFAULT_WORKER_BASE && !trustWorker) {
		return `recording sends your Webflow access token to the worker; pass --trust-worker to allow it for ${workerBase}`;
	}
	return null;
}

/**
 * Reasons the run is incomplete: a declared step (the GSAP crawl, the
 * Designer checks, the Designer data collection, or the recording) did not
 * finish, so a clean result must not read as a pass.
 */
export function incompleteReasons(params: {
	gsap: { status: string; reason?: string };
	designerCollected: boolean;
	mode: 'async' | 'legacy';
	collectionIncomplete: string[];
	recordFailed: boolean;
	resultIncomplete?: string[];
}): string[] {
	const { gsap, designerCollected, mode, collectionIncomplete, recordFailed, resultIncomplete = [] } = params;
	return [
		...resultIncomplete,
		...(gsap.status !== 'complete' ? [`GSAP crawl ${gsap.status}${gsap.reason ? `: ${gsap.reason}` : ''}`] : []),
		...(designerCollected && mode !== 'async' ? ['Designer checks did not run: the worker fell back to /validate'] : []),
		...collectionIncomplete,
		...(recordFailed ? ['recording failed'] : [])
	];
}

type DesignerPage = {
	publishPath?: string | null;
	path?: string | null;
	slug?: string | null;
	isHomePage?: boolean;
	isCmsTemplate?: boolean;
	isDraft?: boolean;
	collectionId?: string | null;
	collectionName?: string | null;
};

/**
 * Published pages to check, from the Designer page list. Same rule as the
 * Validator app (getPageSlugScope in extension/src/index.ts): the first usable
 * path of each page, without CMS template pages, drafts, or repeats. Page
 * discovery from the published site finds only linked pages, so a run with
 * Designer data must not use it. The home page is left out: it is the site
 * URL, which the worker always checks, and the worker does not remove a
 * repeated '/' (it would report each home page finding twice).
 */
export function pageSlugsFromDesigner(pages: DesignerPage[]): string[] {
	const slugs = new Set<string>();
	for (const page of pages) {
		const first = [page.publishPath, page.isHomePage ? '/' : null, page.path, page.slug].find(
			(value): value is string => typeof value === 'string' && value.trim() !== ''
		);
		if (!first) continue;
		const pathname = getSlugPathname(first);
		const cmsTemplate =
			page.isCmsTemplate ||
			page.collectionId ||
			page.collectionName ||
			[pathname, page.publishPath, page.path, page.slug].some((value) => Boolean(value) && isInternalCmsTemplateSlug(value as string));
		if (cmsTemplate || page.isDraft || pathname === '/') continue;
		slugs.add(pathname);
	}
	return [...slugs];
}

/**
 * Categories the worker marked as failed although none of their issues is a
 * blocker (the canvas checks fail on warnings). The submission form needs
 * every category to pass, so these block too.
 */
export function failedWithoutBlocker(categories: { category: string; passed: boolean; issues?: ValidationIssue[] }[]): string[] {
	return categories
		.filter((cat) => cat.passed === false && !(cat.issues ?? []).some((issue) => bucketOf(issue) === 'blocker'))
		.map((cat) => cat.category);
}

/** Why a worker result cannot be trusted as complete: no categories at all, or none for a requested check. */
export function missingResults(checks: string[], categories: { category: string }[]): string[] {
	if (categories.length === 0) return ['the worker returned no check results'];
	const present = new Set(categories.map((cat) => cat.category));
	const expected: [string, string][] = [
		['assets', 'Assets & Images'],
		['content', 'Content & Accessibility']
	];
	const missing = expected.filter(([check, name]) => checks.includes(check) && !present.has(name)).map(([, name]) => name);
	return missing.length > 0 ? [`the worker result has no ${missing.join(' or ')} category`] : [];
}

/** 2 when the run is incomplete, 1 when every step ran and blockers were found, else 0. */
export function exitCodeFor(incomplete: string[], blockers: number): 0 | 1 | 2 {
	return incomplete.length > 0 ? 2 : blockers > 0 ? 1 : 0;
}
