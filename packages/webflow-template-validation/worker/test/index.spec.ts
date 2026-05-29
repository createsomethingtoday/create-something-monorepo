import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('../src/utils/fetch-utils', () => {
	const fetchHTML = vi.fn(async (url: string) => ({
		html: '<!doctype html><html><head><title>Test</title></head><body></body></html>',
		status: 200,
		headers: {},
		size: 0,
		loadTime: 0
	}));

	const parseHTML = vi.fn(() => ({
		rawHtml: '<!doctype html><html><head><title>Test</title></head><body></body></html>',
		document: {
			querySelector: (selector: string) => {
				if (selector === 'title') return { textContent: 'Test' };
				return null;
			},
			querySelectorAll: () => [],
			body: { textContent: '', innerHTML: '' }
		},
		images: [],
		links: [],
		forms: [],
		headings: [],
		scripts: [],
		stylesheets: []
	}));

	return { fetchHTML, parseHTML };
});

import { validateDesignerData } from '../src/validators/designer-validator';
import { generateContentIssues, validateContent } from '../src/validators/content-validator';
import { validateAccessibility } from '../src/validators/accessibility-validator';
import { validateInteractions } from '../src/validators/interactions-validator';
import { fetchHTML, parseHTML } from '../src/utils/fetch-utils';
import worker from '../src/index';

function createParsedHTML(overrides: Partial<any> = {}) {
	return {
		rawHtml: '<!doctype html><html><head><title>Test</title></head><body></body></html>',
		document: {
			querySelector: (selector: string) => {
				if (selector === 'title') return { textContent: 'Test' };
				return null;
			},
			querySelectorAll: () => [],
			body: { textContent: '', innerHTML: '' }
		},
		images: [],
		links: [],
		forms: [],
		headings: [],
		scripts: [],
		stylesheets: [],
		...overrides
	};
}

beforeEach(() => {
	vi.mocked(fetchHTML).mockResolvedValue({
		html: '<!doctype html><html><head><title>Test</title></head><body></body></html>',
		status: 200,
		headers: {},
		size: 0,
		loadTime: 0
	});
	vi.mocked(parseHTML).mockReturnValue(createParsedHTML());
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function createExecutionContext() {
	return {
		waitUntil: vi.fn(),
		passThroughOnException: vi.fn()
	} as unknown as ExecutionContext;
}

async function sha256ForTest(value: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

describe('Designer Validator', () => {
	it('reports missing core designer primitives instead of skipping the categories', async () => {
		const result = await validateDesignerData({
			variables: undefined,
			components: [],
			styles: [],
			pages: [],
			assets: []
		} as any);

		expect(result.categories.find((category) => category.category === 'Variables')?.issues.some((issue) => issue.id === 'variables.none')).toBe(true);
		expect(result.categories.find((category) => category.category === 'Components')?.issues.some((issue) => issue.id === 'components.none')).toBe(true);
		expect(result.categories.find((category) => category.category === 'Styles')?.issues.some((issue) => issue.id === 'styles.missing-typography')).toBe(true);
		expect(result.categories.find((category) => category.category === 'Required Pages')?.issues.some((issue) => issue.id === 'required-pages.missing-style-guide')).toBe(true);
		expect(result.categories.find((category) => category.category === 'Page Structure')?.issues.some((issue) => issue.id === 'pages.no-pages')).toBe(true);
	});

	it('accepts Title Case variables with "/" grouping and numeric tokens (including 2XLarge)', async () => {
		const result = await validateDesignerData({
			variables: {
				collections: [
					{
						id: 'col_colors',
						name: 'Colors',
						variables: [
							{ id: 'v1', name: 'Primary 100', type: 'color', value: null },
							{ id: 'v2', name: 'Primary 200', type: 'color', value: null },
							{ id: 'v3', name: 'Primary 300', type: 'color', value: null }
						]
					},
					{
						id: 'col_typo',
						name: 'Typography',
						variables: [
							{ id: 'v4', name: 'Typography/Body Font', type: 'string', value: null },
							{ id: 'v5', name: 'Heading Size/2XLarge', type: 'string', value: null }
						]
					}
				]
			},
			components: [],
			styles: [],
			pages: [],
			assets: []
		});

		const variablesCategory = result.categories.find(c => c.category === 'Variables');
		expect(variablesCategory).toBeTruthy();
		const namingIssue = variablesCategory!.issues.find(i => i.id === 'variables.naming');
		expect(namingIssue).toBeUndefined();
	});

	it('accepts common Webflow class naming formats (combo-like, acronyms, numeric modifiers)', async () => {
		const result = await validateDesignerData({
			variables: undefined,
			components: [],
			styles: [
				{ id: 's_body', name: 'Body', type: 'style' },
				{ id: 's_heading', name: 'Heading', type: 'style' },
				{ id: 's_combo', name: 'CTA Image 3rd', type: 'style' },
				{ id: 's_width', name: 'Max Width 30', type: 'style' },
				{ id: 's_state', name: 'Is 1st', type: 'style' },
				{ id: 's_clientfirst', name: 'section testimonials dark', type: 'style' },
				{ id: 's_bem', name: 'block__element--modifier', type: 'style' },
				{ id: 's_camel', name: 'heroContainerElement', type: 'style' },
				{ id: 's_pascal', name: 'HeroContainerElement', type: 'style' }
			] as any,
			pages: [],
			assets: []
		} as any);

		const stylesCategory = result.categories.find(c => c.category === 'Styles');
		expect(stylesCategory).toBeTruthy();
		const namingIssue = stylesCategory!.issues.find(i => i.id === 'styles.naming-inconsistent');
		expect(namingIssue).toBeUndefined();
	});

	it('rejects class names that encode literal units (e.g., 30px, 2rem)', async () => {
		const result = await validateDesignerData({
			variables: undefined,
			components: [],
			styles: [
				{ id: 's_body', name: 'Body', type: 'style' },
				{ id: 's_heading', name: 'Heading', type: 'style' },
				{ id: 's_bad_px', name: 'Max Width 30px', type: 'style' },
				{ id: 's_bad_rem', name: 'Padding 2rem', type: 'style' },
				{ id: 's_ok', name: 'Max Width 30', type: 'style' }
			] as any,
			pages: [],
			assets: []
		} as any);

		const stylesCategory = result.categories.find(c => c.category === 'Styles');
		expect(stylesCategory).toBeTruthy();
		const namingIssue = stylesCategory!.issues.find(i => i.id === 'styles.naming-inconsistent');
		expect(namingIssue).toBeTruthy();
		const sample = (namingIssue as any).details?.sample || [];
		expect(sample.join(' ')).toMatch(/Max Width 30px|Padding 2rem/);
	});

	it('rejects non-compliant variable names (lowercase, underscores)', async () => {
		const result = await validateDesignerData({
			variables: {
				collections: [
					{
						id: 'col_colors',
						name: 'Colors',
						variables: [
							{ id: 'v1', name: 'Primary_Color', type: 'color', value: null },
							{ id: 'v2', name: 'primary color', type: 'color', value: null },
							{ id: 'v3', name: 'Primary 100', type: 'color', value: null }
						]
					}
				]
			},
			components: [],
			styles: [],
			pages: [],
			assets: []
		});

		const variablesCategory = result.categories.find(c => c.category === 'Variables');
		expect(variablesCategory).toBeTruthy();
		const namingIssue = variablesCategory!.issues.find(i => i.id === 'variables.naming');
		expect(namingIssue).toBeTruthy();
		const sample = (namingIssue as any).details?.sample || [];
		expect(sample.join(' ')).toMatch(/Primary_Color|primary color/);
	});
});

describe('Content Validator', () => {
	it('detects placeholder content consistently across repeated runs', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><head><title>Repeated Placeholder Test</title></head><body><main><h1>Lorem Ipsum</h1><p>Lorem ipsum dolor sit amet.</p></main></body></html>',
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Repeated Placeholder Test' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Lorem Ipsum Lorem ipsum dolor sit amet.',
					innerHTML: '<main><h1>Lorem Ipsum</h1><p>Lorem ipsum dolor sit amet.</p></main>'
				}
			},
			headings: [{ tagName: 'H1', textContent: 'Lorem Ipsum' }]
		}));

		const first = await validateContent('https://example.com');
		const second = await validateContent('https://example.com/about');

		expect(first.issues.some((issue) => issue.id === 'lorem-ipsum-detected')).toBe(true);
		expect(second.issues.some((issue) => issue.id === 'lorem-ipsum-detected')).toBe(true);
	});

	it('does not flag decorative images that use empty alt text', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><head><title>Decorative Image Test</title><meta name="description" content="A sufficiently long meta description for testing content analysis behavior without accessibility false positives."></head><body><h1>Decorative Image Test</h1><img src="/decorative-divider.svg" alt="" /></body></html>',
			document: {
				querySelector: (selector: string) => {
					if (selector === 'title') return { textContent: 'Decorative Image Test' };
					if (selector === 'meta[name="description"]') return { getAttribute: () => 'A sufficiently long meta description for testing content analysis behavior without accessibility false positives.' };
					return null;
				},
				querySelectorAll: () => [],
				body: {
					textContent: 'Decorative Image Test meaningful content for validation.',
					innerHTML: '<h1>Decorative Image Test</h1><img src="/decorative-divider.svg" alt="" />'
				}
			},
			images: [{ getAttribute: (name: string) => name === 'alt' ? '' : name === 'src' ? '/decorative-divider.svg' : null }],
			headings: [{ tagName: 'H1', textContent: 'Decorative Image Test' }]
		}));

		const result = await validateContent('https://example.com');

		expect(result.issues.some((issue) => issue.id === 'missing-alt-text')).toBe(false);
	});

	it('can run only the alt text check', () => {
		const pages: any[] = [{
			url: 'https://example.com/',
			title: 'Home',
			hasLoremIpsum: true,
			headingHierarchy: { h1Count: 0, hasSkippedLevels: true, structure: [] },
			imageCount: 2,
			imagesWithoutAlt: 1,
			seo: {
				title: null,
				titleLength: 0,
				metaDescription: null,
				metaDescriptionLength: 0,
				hasValidTitle: false,
				hasValidDescription: false,
				openGraph: { title: null, description: null, image: null, url: null },
				twitterCard: { title: null, description: null, image: null },
				canonical: null,
				robots: null
			},
			links: {
				totalLinks: 1,
				internalLinks: 0,
				externalLinks: 1,
				brokenLinks: [{ href: 'javascript:alert(1)', text: 'x', status: 'suspicious', error: 'Potentially unsafe link type' }],
				emailLinks: 0,
				phoneLinks: 0,
				anchorLinks: 0,
				downloadLinks: 0,
				socialMediaLinks: 0
			},
			contentQuality: {
				hasPlaceholderContent: true,
				hasLoremIpsum: true,
				hasWebflowDefaults: false,
				hasGenericContent: false,
				contentScore: 10,
				issues: [],
				wordCount: 10,
				duplicateContent: []
			}
		}];

		const issues = generateContentIssues(pages as any, {
			lorem: false,
			headings: false,
			altText: true,
			seo: false,
			links: false,
			contentQuality: false
		});

		expect(issues.map(i => i.id)).toEqual(['missing-alt-text']);
	});

	it('can run only the lorem/placeholder check', () => {
		const pages: any[] = [{
			url: 'https://example.com/',
			title: 'Home',
			hasLoremIpsum: true,
			headingHierarchy: { h1Count: 1, hasSkippedLevels: false, structure: [] },
			imageCount: 0,
			imagesWithoutAlt: 0,
			seo: {
				title: 'Ok Title',
				titleLength: 8,
				metaDescription: 'Ok desc',
				metaDescriptionLength: 7,
				hasValidTitle: true,
				hasValidDescription: true,
				openGraph: { title: null, description: null, image: null, url: null },
				twitterCard: { title: null, description: null, image: null },
				canonical: null,
				robots: null
			},
			links: {
				totalLinks: 0,
				internalLinks: 0,
				externalLinks: 0,
				brokenLinks: [],
				emailLinks: 0,
				phoneLinks: 0,
				anchorLinks: 0,
				downloadLinks: 0,
				socialMediaLinks: 0
			},
			contentQuality: {
				hasPlaceholderContent: false,
				hasLoremIpsum: true,
				hasWebflowDefaults: false,
				hasGenericContent: false,
				contentScore: 80,
				issues: [],
				wordCount: 100,
				duplicateContent: []
			}
		}];

		const issues = generateContentIssues(pages as any, {
			lorem: true,
			headings: false,
			altText: false,
			seo: false,
			links: false,
			contentQuality: false
		});

		expect(issues.map(i => i.id)).toEqual(['lorem-ipsum-detected']);
	});

	it('pageScope=current analyzes only the current page URL and does not crawl slugs', async () => {
		(fetchHTML as any).mockClear();

		await validateContent(
			'https://example.com',
			['/a', '/b', '/c'],
			{
				pageScope: 'current',
				currentPageSlug: '/about',
				contentChecks: { lorem: false, headings: false, altText: false, seo: false, links: false, contentQuality: false }
			} as any
		);

		expect(fetchHTML).toHaveBeenCalledTimes(1);
		expect((fetchHTML as any).mock.calls[0][0]).toBe('https://example.com/about');
	});

	it('excludePageSlugs filters out provided slugs when pageScope=all', async () => {
		(fetchHTML as any).mockClear();

		await validateContent(
			'https://example.com',
			['/style-guide', '/about'],
			{
				excludePageSlugs: ['/style-guide'],
				contentChecks: { lorem: false, headings: false, altText: false, seo: false, links: false, contentQuality: false }
			} as any
		);

		expect(fetchHTML).toHaveBeenCalledTimes(2);
		const calledUrls = (fetchHTML as any).mock.calls.map((c: any[]) => c[0]);
		expect(calledUrls).toEqual(['https://example.com', 'https://example.com/about']);
	});

	it('pageScope=current returns warning without fetching when current page is excluded', async () => {
		(fetchHTML as any).mockClear();

		const result = await validateContent(
			'https://example.com',
			undefined,
			{
				pageScope: 'current',
				currentPageSlug: '/style-guide',
				excludePageSlugs: ['/style-guide'],
				contentChecks: { lorem: false, headings: false, altText: false, seo: false, links: false, contentQuality: false }
			} as any
		);

		expect(fetchHTML).toHaveBeenCalledTimes(0);
		expect(result.issues[0]?.id).toBe('content-excluded-page');
		expect(result.issues[0]?.severity).toBe('warning');
	});
});

describe('Accessibility Validator', () => {
	it('does not invent contrast findings when no real contrast data exists', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><head><title>Plain Page</title></head><body><h1>Plain Page</h1><p>Normal readable text.</p></body></html>',
			document: {
				querySelector: () => null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Plain Page Normal readable text.',
					innerHTML: '<h1>Plain Page</h1><p>Normal readable text.</p>'
				}
			},
			headings: [{ tagName: 'H1', textContent: 'Plain Page' }]
		}));

		const result = await validateAccessibility('https://example.com');

		expect(result.stats.contrastViolations).toBe(0);
		expect(result.issues.some((issue) => issue.id === 'color-contrast-violations')).toBe(false);
	});
});

describe('Interactions Validator', () => {
	it('detects IX2 on accessible pages even when another page fails', async () => {
		vi.mocked(fetchHTML).mockImplementation(async (url: string) => {
			if (url.endsWith('/missing')) {
				throw new Error('HTTP 404: Not Found');
			}

			return {
				html: '<!doctype html><html><body><div data-w-id="abc"></div><script>Webflow.require("ix2").init({})</script></body></html>',
				status: 200,
				headers: { 'content-type': 'text/html' },
				size: 0,
				loadTime: 0
			};
		});

		const result = await validateInteractions('https://example.com', ['/missing']);

		expect(result.stats.legacyIx2Detected).toBe(true);
		expect(result.stats.legacyIx2Count).toBe(2);
		expect(result.stats.pagesAnalyzed).toBe(1);
		expect(result.stats.pagesFailed).toBe(1);
		expect(result.stats.analysisStatus).toBe('partial');
		expect(result.issues.some((issue) => issue.id === 'legacy-ix2-interactions-detected' && issue.severity === 'error')).toBe(true);
		expect(result.issues.some((issue) => issue.id === 'interactions-analysis-incomplete' && issue.severity === 'warning')).toBe(true);
	});

	it('does not treat Webflow Lottie element markers as legacy IX2', async () => {
		vi.mocked(fetchHTML).mockResolvedValue({
			html: `<!doctype html><html><body>
				<div data-w-id="lottie-1" data-is-ix2-target="0" data-animation-type="lottie" data-src="/animation.json" data-renderer="svg" data-default-duration="0"></div>
				<script>Webflow.require("ix2").init({ events: { "e-1": { action: { actionTypeId: "PLUGIN_LOTTIE_EFFECT" } } }, actionLists: { pluginLottie: { actionItemGroups: [{ actionItems: [{ actionTypeId: "PLUGIN_LOTTIE" }] }] } } })</script>
			</body></html>`,
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});

		const result = await validateInteractions('https://example.com');

		expect(result.stats.legacyIx2Detected).toBe(false);
		expect(result.stats.legacyIx2Count).toBe(0);
		expect(result.issues.some((issue) => issue.id === 'legacy-ix2-interactions-detected')).toBe(false);
	});

	it('does not reject bare Webflow DOM markers without IX2 runtime or action evidence', async () => {
		vi.mocked(fetchHTML).mockResolvedValue({
			html: '<!doctype html><html class="w-mod-js w-mod-ix"><body><div data-w-id="decorative-motion"></div></body></html>',
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});

		const result = await validateInteractions('https://example.com');

		expect(result.stats.legacyIx2Detected).toBe(false);
		expect(result.stats.legacyIx2Count).toBe(0);
		expect(result.issues.some((issue) => issue.id === 'legacy-ix2-interactions-detected')).toBe(false);
	});

	it('still detects non-Lottie IX2 markers on pages that also include Lottie', async () => {
		vi.mocked(fetchHTML).mockResolvedValue({
			html: `<!doctype html><html><body>
				<div data-w-id="lottie-1" data-is-ix2-target="0" data-animation-type="lottie" data-src="/animation.json" data-renderer="svg" data-default-duration="0"></div>
				<div data-w-id="legacy-card"></div>
				<script>Webflow.require("ix2").init({})</script>
			</body></html>`,
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});

		const result = await validateInteractions('https://example.com');

		expect(result.stats.legacyIx2Detected).toBe(true);
		expect(result.stats.legacyIx2Count).toBe(2);
		expect(result.issues.some((issue) => issue.id === 'legacy-ix2-interactions-detected')).toBe(true);
	});

	it('blocks validation when no pages can be checked for IX2', async () => {
		vi.mocked(fetchHTML).mockRejectedValue(new Error('HTTP 404: Not Found'));

		const result = await validateInteractions('https://example.com', ['/missing']);

		expect(result.stats.legacyIx2Detected).toBeNull();
		expect(result.stats.pagesAnalyzed).toBe(0);
		expect(result.stats.pagesFailed).toBe(2);
		expect(result.stats.analysisStatus).toBe('failed');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'interactions-analysis-incomplete',
					severity: 'error'
				})
			])
		);
	});
});

describe('Validation Submission Endpoint', () => {
	it('serves the published review snippet asset with permissive CORS headers', async () => {
		const assetFetch = vi.fn(async () =>
			new Response('// review snippet', {
				status: 200,
				headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
			})
		);

		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js', {
				method: 'GET',
				headers: {
					Origin: 'https://clone-galleries-webflow-template-brix-t.webflow.io'
				}
			}),
			{ ASSETS: { fetch: assetFetch } } as any,
			createExecutionContext()
		);

		expect(response.status).toBe(200);
		expect(await response.text()).toContain('review snippet');
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(assetFetch).toHaveBeenCalledTimes(1);
	});

	it('verifies a manually published bridge snippet and promotes status to active', async () => {
		const installResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/install', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_manual_verify',
					siteName: 'Manual Verify',
					installTarget: 'head',
					mode: 'manual-fallback'
				})
			}),
			{} as any,
			createExecutionContext()
		);

		expect(installResponse.status).toBe(200);
		const installPayload = await installResponse.json() as any;
		expect(installPayload.status).toBe('pending_manual');

		vi.mocked(fetchHTML).mockResolvedValueOnce({
			html: `<!doctype html><html><head><script>window.__WF_REVIEW_BRIDGE = { marker: "__wf_review_snippet_v1", bridgeToken: "${installPayload.bridgeToken}" };</script><script src="https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"></script></head><body></body></html>`,
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});

		const statusResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/status?siteId=site_manual_verify&siteUrl=https%3A%2F%2Fexample.com', {
				method: 'GET',
				headers: {
					Origin: 'https://designer.webflow-ext.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(statusResponse.status).toBe(200);
		const statusPayload = await statusResponse.json() as any;
		expect(statusPayload.status).toBe('active');
		expect(statusPayload.installed).toBe(true);
		expect(statusPayload.message).toContain('published-site audits');
	});

	it('keeps manual status pending when the bridge token is present but the review script is missing', async () => {
		const installResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/install', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_missing_review_surface',
					siteName: 'Missing Review Surface',
					installTarget: 'head',
					mode: 'manual-fallback'
				})
			}),
			{} as any,
			createExecutionContext()
		);

		const installPayload = await installResponse.json() as any;

		vi.mocked(fetchHTML).mockResolvedValueOnce({
			html: `<!doctype html><html><head><script>window.__WF_REVIEW_BRIDGE = { marker: "__wf_review_snippet_v1", bridgeToken: "${installPayload.bridgeToken}" };</script></head><body></body></html>`,
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});

		const statusResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/status?siteId=site_missing_review_surface&siteUrl=https%3A%2F%2Fexample.com', {
				method: 'GET',
				headers: {
					Origin: 'https://designer.webflow-ext.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(statusResponse.status).toBe(200);
		const statusPayload = await statusResponse.json() as any;
		expect(statusPayload.status).toBe('pending_manual');
		expect(statusPayload.message).toContain('review script is missing');
	});

	it('resets manual bridge status after token rotation until the new snippet is republished', async () => {
		const installResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/install', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_manual_rotate',
					siteName: 'Manual Rotate',
					installTarget: 'head',
					mode: 'manual-fallback'
				})
			}),
			{} as any,
			createExecutionContext()
		);
		const installPayload = await installResponse.json() as any;

		vi.mocked(fetchHTML).mockResolvedValueOnce({
			html: `<!doctype html><html><head><script>window.__WF_REVIEW_BRIDGE = { marker: "__wf_review_snippet_v1", bridgeToken: "${installPayload.bridgeToken}" };</script><script src="https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"></script></head><body></body></html>`,
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});
		await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/status?siteId=site_manual_rotate&siteUrl=https%3A%2F%2Fexample.com', {
				method: 'GET',
				headers: {
					Origin: 'https://designer.webflow-ext.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		const rotateResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/rotate-token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_manual_rotate',
					siteName: 'Manual Rotate'
				})
			}),
			{} as any,
			createExecutionContext()
		);

		expect(rotateResponse.status).toBe(200);
		const rotatePayload = await rotateResponse.json() as any;
		expect(rotatePayload.status).toBe('pending_manual');
		expect(rotatePayload.installed).toBe(false);
		expect(rotatePayload.bridgeToken).not.toBe(installPayload.bridgeToken);
		expect(rotatePayload.message).toContain('Publish the updated bridge and review surface');
	});

	it('allows webflow-ext.com origins for worker bridge routes', async () => {
		const origin = 'https://designer.webflow-ext.com';
		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/status?siteId=site_bridge', {
				method: 'GET',
				headers: {
					Origin: origin
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
	});

	it('exposes latest submitted Validator result by site ID and bridge token hash', async () => {
		const installResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/install', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_latest_result',
					siteName: 'Latest Result',
					installTarget: 'head',
					mode: 'manual-fallback'
				})
			}),
			{} as any,
			createExecutionContext()
		);
		const installPayload = await installResponse.json() as any;
		const bridgeTokenSha256 = await sha256ForTest(installPayload.bridgeToken);

		const submitResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com'
				},
				body: JSON.stringify({
					siteId: 'site_latest_result',
					siteName: 'Latest Result',
					siteUrl: 'https://latest-result.webflow.io',
					validationResults: {
						url: 'https://latest-result.webflow.io',
						summary: { totalErrors: 0, totalWarnings: 1, passedCategories: 4, failedCategories: 0 },
						categories: [
							{ category: 'Assets & Images', passed: true, issues: [] },
							{ category: 'Content & Accessibility', passed: true, issues: [] },
							{ category: 'Interactions and GSAP', passed: true, issues: [] },
							{ category: 'Designer Structure', passed: true, issues: [] }
						]
					}
				})
			}),
			{} as any,
			createExecutionContext()
		);
		expect(submitResponse.status).toBe(200);

		const bySiteResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submission/latest?siteId=site_latest_result', {
				method: 'GET',
				headers: {
					Origin: 'https://webflow.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);
		const byTokenResponse = await worker.fetch(
			new Request(`https://validation-worker.createsomething.workers.dev/app-validator/submission/latest?bridgeTokenSha256=${bridgeTokenSha256}`, {
				method: 'GET',
				headers: {
					Origin: 'https://webflow.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(bySiteResponse.status).toBe(200);
		expect(byTokenResponse.status).toBe(200);
		const byTokenPayload = await byTokenResponse.json() as any;
		expect(byTokenPayload.status).toBe('available');
		expect(byTokenPayload.passed).toBe(true);
		expect(byTokenPayload.summary.score).toBe(100);
		expect(byTokenPayload.summary.totalCategories).toBe(4);
		expect(byTokenPayload.rawBridgeTokenStored).toBe(false);
		expect(JSON.stringify(byTokenPayload)).not.toContain(installPayload.bridgeToken);
	});

	it('marks latest Validator result as failed when errors or failed categories remain', async () => {
		await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com'
				},
				body: JSON.stringify({
					siteId: 'site_latest_failed_result',
					siteName: 'Latest Failed Result',
					validationResults: {
						summary: { totalErrors: 1, totalWarnings: 0, passedCategories: 3, failedCategories: 1 },
						categories: [
							{
								category: 'Assets & Images',
								passed: false,
								issues: [{ severity: 'error', message: 'Image exceeds the maximum size.' }]
							}
						]
					}
				})
			}),
			{} as any,
			createExecutionContext()
		);

		const latestResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submission/latest?siteId=site_latest_failed_result', {
				method: 'GET',
				headers: {
					Origin: 'https://webflow.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(latestResponse.status).toBe(200);
		const payload = await latestResponse.json() as any;
		expect(payload.passed).toBe(false);
		expect(payload.summary.failedCategories).toBe(1);
		expect(payload.summary.totalErrors).toBe(1);
	});

	it('returns missing when no latest Validator result has been submitted', async () => {
		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submission/latest?siteId=site_no_latest_result', {
				method: 'GET',
				headers: {
					Origin: 'https://webflow.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(response.status).toBe(404);
		const payload = await response.json() as any;
		expect(payload.status).toBe('missing');
		expect(payload.rawBridgeTokenStored).toBe(false);
	});

	it('accepts submissions for sites that are not in Airtable without failing the client flow', async () => {
		const fetchMock = vi.fn(async () =>
			new Response(JSON.stringify({ records: [] }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		vi.stubGlobal('fetch', fetchMock);

		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com',
					'CF-Connecting-IP': '203.0.113.20'
				},
				body: JSON.stringify({
					siteId: 'site_missing_record',
					siteName: 'Missing Record',
					validationResults: {
						url: 'https://example.com',
						summary: { totalErrors: 2, totalWarnings: 1, passedCategories: 3, failedCategories: 1 },
						categories: []
					}
				})
			}),
			{ AIRTABLE_API_KEY: 'test_airtable_key' } as any,
			createExecutionContext()
		);

		expect(response.status).toBe(200);
		const payload = await response.json() as any;
		expect(payload.accepted).toBe(true);
		expect(payload.persisted).toBe(false);
		expect(payload.reason).toBe('record_not_found');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('persists sanitized validation result artifacts when R2 binding is configured', async () => {
		const putMock = vi.fn(async () => undefined);

		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com',
					'CF-Connecting-IP': '203.0.113.22'
				},
				body: JSON.stringify({
					siteId: 'site_artifact',
					siteName: 'Artifact Site',
					siteUrl: 'https://artifact.example.com',
					validationResults: {
						url: 'https://artifact.example.com',
						summary: { totalErrors: 1, totalWarnings: 0, passedCategories: 1, failedCategories: 1 },
						categories: [
							{
								category: 'Assets & Images',
								passed: false,
								issues: [
									{
										severity: 'error',
										message: 'Oversized asset found',
										details: { bridgeToken: 'wfbt_should_not_persist' }
									}
								]
							}
						]
					}
				})
			}),
			{
				VALIDATOR_RESULT_ARTIFACTS: { put: putMock }
			} as any,
			createExecutionContext()
		);

		expect(response.status).toBe(200);
		const payload = await response.json() as any;
		expect(payload.accepted).toBe(true);
		expect(payload.persisted).toBe(false);
		expect(payload.reason).toBe('airtable_not_configured');
		expect(payload.artifact.persisted).toBe(true);
		expect(payload.artifact.key).toContain('validator-app-results/site=site_artifact/');
		expect(payload.artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
		expect(putMock).toHaveBeenCalledTimes(1);

		const [key, body, options] = putMock.mock.calls[0];
		expect(key).toContain('validator-app-results/site=site_artifact/');
		expect(options.httpMetadata.contentType).toBe('application/json');
		expect(options.customMetadata.siteId).toBe('site_artifact');
		expect(body).not.toContain('wfbt_should_not_persist');
		expect(body).toContain('"raw_bridge_token_stored": false');
		expect(body).toContain('Oversized asset found');
	});

	it('rate limits repeated submissions per site', async () => {
		const responseOne = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com',
					'CF-Connecting-IP': '203.0.113.21'
				},
				body: JSON.stringify({
					siteId: 'site_rate_limit',
					validationResults: {
						summary: { totalErrors: 0, totalWarnings: 0, passedCategories: 1, failedCategories: 0 },
						categories: []
					}
				})
			}),
			{
				VALIDATION_SUBMIT_MAX_PER_WINDOW: '2',
				VALIDATION_SUBMIT_WINDOW_MS: '600000'
			} as any,
			createExecutionContext()
		);

		const responseTwo = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com',
					'CF-Connecting-IP': '203.0.113.21'
				},
				body: JSON.stringify({
					siteId: 'site_rate_limit',
					validationResults: {
						summary: { totalErrors: 0, totalWarnings: 0, passedCategories: 1, failedCategories: 0 },
						categories: []
					}
				})
			}),
			{
				VALIDATION_SUBMIT_MAX_PER_WINDOW: '2',
				VALIDATION_SUBMIT_WINDOW_MS: '600000'
			} as any,
			createExecutionContext()
		);

		const responseThree = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com',
					'CF-Connecting-IP': '203.0.113.21'
				},
				body: JSON.stringify({
					siteId: 'site_rate_limit',
					validationResults: {
						summary: { totalErrors: 0, totalWarnings: 0, passedCategories: 1, failedCategories: 0 },
						categories: []
					}
				})
			}),
			{
				VALIDATION_SUBMIT_MAX_PER_WINDOW: '2',
				VALIDATION_SUBMIT_WINDOW_MS: '600000'
			} as any,
			createExecutionContext()
		);

		expect(responseOne.status).toBe(200);
		expect(responseTwo.status).toBe(200);
		expect(responseThree.status).toBe(429);
		const payload = await responseThree.json() as any;
		expect(payload.reason).toBe('rate_limited');
		expect(payload.limit.remaining).toBe(0);
	});
});
