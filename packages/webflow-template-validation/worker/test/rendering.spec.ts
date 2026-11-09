import { describe, expect, it } from 'vitest';
import {
	RENDERING_CATEGORY,
	generateRenderingIssues,
	isIgnoredPageError,
	scriptSourceFromStack,
	summarizeRendering,
	type PageRenderObservation,
	type ViewportObservation
} from '../src/validators/rendering-validator';
import { renderTargets } from '../src/utils/browser-rendering';

const SITE = 'https://example-template.webflow.io';

function viewports(overflow: Partial<Record<375 | 768 | 1440, number>> = {}): ViewportObservation[] {
	return ([
		['mobile', 375],
		['tablet', 768],
		['desktop', 1440]
	] as const).map(([viewport, width]) => ({
		viewport,
		width,
		overflowPx: overflow[width] ?? 0,
		offenders: overflow[width] ? [{ label: 'div.hero-image', right: width + (overflow[width] ?? 0) }] : []
	}));
}

function page(path: string, extra: Partial<PageRenderObservation> = {}): PageRenderObservation {
	return { url: `${SITE}${path}`, status: 'ok', viewports: viewports(), uncaughtErrors: [], ...extra };
}

describe('generateRenderingIssues', () => {
	it('passes clean pages', () => {
		expect(generateRenderingIssues([page('/'), page('/about')], { pagesRequested: 2 })).toEqual([]);
	});

	it('blocks on uncaught errors and names the page, message, and script', () => {
		const issues = generateRenderingIssues(
			[
				page('/'),
				page('/about', {
					uncaughtErrors: [{ message: "Cannot read properties of null (reading 'addEventListener')", source: `${SITE}/js/custom.js` }]
				})
			],
			{ pagesRequested: 2 }
		);
		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({ id: 'rendering-uncaught-errors', severity: 'error', category: RENDERING_CATEGORY });
		expect(issues[0].message).toBe('1 page throws uncaught JavaScript errors.');
		expect(issues[0].details?.locations).toEqual([
			`/about — Cannot read properties of null (reading 'addEventListener') (${SITE}/js/custom.js)`
		]);
	});

	it('blocks on horizontal overflow and lists each failing width', () => {
		const issues = generateRenderingIssues([page('/', { viewports: viewports({ 375: 48, 768: 12 }) }), page('/contact')], {
			pagesRequested: 2
		});
		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({ id: 'rendering-horizontal-overflow', severity: 'error' });
		expect(issues[0].message).toBe('1 page scrolls sideways at 375px, 768px.');
		expect(issues[0].details?.locations).toEqual([
			'/ — 375px: scrolls 48px sideways (widest: div.hero-image)',
			'/ — 768px: scrolls 12px sideways (widest: div.hero-image)'
		]);
	});

	it('ignores sub-pixel overflow', () => {
		expect(generateRenderingIssues([page('/', { viewports: viewports({ 375: 1 }) })], { pagesRequested: 1 })).toEqual([]);
	});

	it('warns, without blocking, when some pages did not load', () => {
		const issues = generateRenderingIssues([page('/'), page('/blog', { status: 'failed', error: 'HTTP 404', viewports: [] })], {
			pagesRequested: 2
		});
		expect(issues.map((issue) => [issue.id, issue.severity])).toEqual([['rendering-pages-not-checked', 'warning']]);
		expect(issues[0].details?.locations).toEqual(['/blog — HTTP 404']);
	});

	it('blocks when no page loaded, because nothing was checked', () => {
		const issues = generateRenderingIssues([page('/', { status: 'failed', error: 'net::ERR_NAME_NOT_RESOLVED', viewports: [] })], {
			pagesRequested: 1
		});
		expect(issues.map((issue) => [issue.id, issue.severity])).toEqual([['rendering-unavailable', 'error']]);
	});

	it('blocks when the browser is unavailable', () => {
		const issues = generateRenderingIssues([], { pagesRequested: 3, unavailableReason: 'The browser did not start: 429' });
		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({ id: 'rendering-unavailable', severity: 'error' });
		expect(issues[0].description).toContain('429');
	});
});

describe('summarizeRendering', () => {
	it('counts rendered, failed, and capped pages', () => {
		const result = summarizeRendering(
			[
				page('/', { viewports: viewports({ 375: 30 }) }),
				page('/about', { uncaughtErrors: [{ message: 'x is not defined' }] }),
				page('/blog', { status: 'failed', error: 'HTTP 500', viewports: [] })
			],
			{ pagesRequested: 14 }
		);
		expect(result.stats).toEqual({
			analysisComplete: true,
			pagesRequested: 14,
			pagesRendered: 2,
			pagesFailed: 1,
			pagesNotRendered: 11,
			viewports: '375px, 768px, 1440px',
			pagesWithUncaughtErrors: 1,
			pagesWithHorizontalOverflow: 1
		});
		expect(result.issues.map((issue) => issue.id)).toEqual([
			'rendering-uncaught-errors',
			'rendering-horizontal-overflow',
			'rendering-pages-not-checked'
		]);
	});

	it('marks the analysis incomplete when the browser did not run', () => {
		expect(summarizeRendering([], { pagesRequested: 1, unavailableReason: 'no binding' }).stats.analysisComplete).toBe(false);
	});
});

describe('page error helpers', () => {
	it('ignores ResizeObserver loop notices only', () => {
		expect(isIgnoredPageError('ResizeObserver loop completed with undelivered notifications.')).toBe(true);
		expect(isIgnoredPageError('gsap is not defined')).toBe(false);
	});

	it('reads the throwing script from a V8 stack', () => {
		const stack = `TypeError: Cannot read properties of null (reading 'style')\n    at HTMLDocument.<anonymous> (${SITE}/js/custom.js:12:9)\n    at https://cdn.prod.website-files.com/js/webflow.js:1:200`;
		expect(scriptSourceFromStack(stack)).toBe(`${SITE}/js/custom.js`);
		expect(scriptSourceFromStack(`ReferenceError: gsap is not defined\n    at ${SITE}/:123:5`)).toBe(`${SITE}/`);
		expect(scriptSourceFromStack('ReferenceError: x is not defined')).toBeUndefined();
		expect(scriptSourceFromStack(undefined)).toBeUndefined();
	});
});

describe('renderTargets', () => {
	it('dedupes URLs, drops fragments, keeps crawl order, and skips non-URLs', () => {
		expect(renderTargets([`${SITE}/`, `${SITE}/about#team`, `${SITE}/about`, 'not a url', `${SITE}/contact`])).toEqual([
			`${SITE}/`,
			`${SITE}/about`,
			`${SITE}/contact`
		]);
	});
});
