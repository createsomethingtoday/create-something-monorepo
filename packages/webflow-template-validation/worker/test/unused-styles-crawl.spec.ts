import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/fetch-utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('../src/utils/fetch-utils')>()),
	fetchHTML: vi.fn()
}));

import { fetchHTML } from '../src/utils/fetch-utils';
import { validateContent } from '../src/validators/content-validator';

const SITE = 'https://example-template.webflow.io';
const SHEET = 'https://cdn.prod.website-files.com/0123456789abcdef01234567/css/site.webflow.shared.abc.css';
const LEFTOVERS = Array.from({ length: 11 }, (_, i) => `.old-${i}{a:b}`).join('');
const CSS = `.hero{a:b}.guide-swatch{a:b}.post-body{a:b}.contact-map{a:b}.author-bio{a:b}${LEFTOVERS}`;

function page(body: string) {
	return `<!doctype html><html><head><title>Page</title><link href="${SHEET}" rel="stylesheet"/></head><body>${body}</body></html>`;
}

const PAGES: Record<string, string> = {
	'/': page('<div class="hero"></div><a href="/blog/one">One</a><a href="/blog/two">Two</a><a href="/contact">Contact</a>'),
	'/contact': page('<div class="contact-map"></div>'),
	'/style-guide': page('<div class="guide-swatch"></div>'),
	// The Authors collection is linked from item pages only.
	'/blog/one': page('<div class="post-body"></div><a href="/authors/ann">Ann</a>'),
	'/authors/ann': page('<div class="author-bio"></div>'),
	'/blog/two': page('<div class="post-body"></div><a href="/authors/ann">Ann</a>')
};

/** Serve PAGES; every other path answers HTTP 404, and `broken` paths time out. */
function serve(broken: string[] = []) {
	vi.mocked(fetchHTML).mockImplementation(async (url: string) => {
		const path = new URL(url).pathname;
		if (broken.includes(path)) throw new Error('Request timeout');
		const html = PAGES[path];
		if (!html) throw new Error('HTTP 404: Not Found');
		return { html, status: 200, headers: { 'content-type': 'text/html' }, size: html.length, loadTime: 0 };
	});
	vi.stubGlobal('fetch', vi.fn(async () => new Response(CSS, { status: 200 })));
}

async function unusedStyles(pageSlugs: string[] | undefined, options: Record<string, unknown> = {}) {
	const result = await validateContent(SITE, pageSlugs, { excludePageSlugs: ['/style-guide', '/styleguide'], pageListComplete: true, ...options });
	return result.issues.find((issue) => issue.id === 'unused-styles');
}

describe('Unused styles in the content crawl', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('runs with the default exclusion list, where one style guide path does not exist', async () => {
		serve();
		const issue = await unusedStyles(['contact']);
		expect(issue?.severity).toBe('error');
		// Styles of the excluded Style Guide and of the CMS item pages are in use.
		expect(issue?.details?.unusedStyles).toEqual(Array.from({ length: 11 }, (_, i) => `.old-${i}`).sort());
	});

	it('reports nothing when an excluded page that exists does not load', async () => {
		serve(['/style-guide']);
		expect(await unusedStyles(['contact'])).toBeUndefined();
	});

	it('still reports when one item page of a collection fails and another loads', async () => {
		serve(['/blog/one']);
		expect((await unusedStyles(['contact']))?.details?.unusedStyles).toHaveLength(11);
	});

	it('reports nothing when no item page of a collection loads', async () => {
		serve(['/blog/one', '/blog/two']);
		expect(await unusedStyles(['contact'])).toBeUndefined();
	});

	it('reports nothing without the page list from the Designer, or with a page limit', async () => {
		serve();
		expect(await unusedStyles(undefined)).toBeUndefined();
		expect(await unusedStyles([])).toBeUndefined();
		expect(await unusedStyles(['contact'], { maxPages: 20 })).toBeUndefined();
		// A CLI run without Designer data builds its list from the sitemap.
		expect(await unusedStyles(['contact'], { pageListComplete: false })).toBeUndefined();
	});

	describe('with a preview link', () => {
		const PREVIEW = 'https://preview.webflow.com/preview/example-template?preview=0123456789abcdef0123456789abcdef';
		const SITE_DATA_PATH = '/site-data/{site}?preview={token}';
		const siteData = {
			pages: [{ _id: 'home' }],
			domNodes: [],
			symbols: [],
			styles: {
				blocks: [
					{ _id: '00000000-0000-4000-8000-000000000001', data: { type: 'class', name: 'hero', sel: '.hero', children: [], affects: { home: 1 } } },
					{ _id: '00000000-0000-4000-8000-000000000002', data: { type: 'class', name: 'leftover', sel: '.leftover', children: [], affects: {} } }
				]
			}
		};

		/** Serve PAGES and the stylesheet, and answer the preview host with `preview`. */
		function serveWithPreview(preview: () => Response) {
			serve();
			vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).startsWith('https://preview.webflow.com/') ? preview() : new Response(CSS, { status: 200 }))));
		}

		it('reports the Designer list and does not need the page list', async () => {
			serveWithPreview(() => Response.json(siteData));
			const issue = await unusedStyles(undefined, { previewUrl: PREVIEW, previewSiteDataPath: SITE_DATA_PATH, pageListComplete: false });
			expect(issue?.severity).toBe('warning');
			expect(issue?.details).toMatchObject({ unusedStyles: ['.leftover'], source: 'designer' });
		});

		it('compares the published pages when the preview link is expired', async () => {
			serveWithPreview(() => new Response('Not found', { status: 404 }));
			const issue = await unusedStyles(['contact'], { previewUrl: PREVIEW, previewSiteDataPath: SITE_DATA_PATH });
			expect(issue?.details).toMatchObject({ source: 'published' });
			expect(issue?.details?.unusedStyles).toHaveLength(11);
		});

		it('compares the published pages when the worker has no site data path', async () => {
			const fetchMock = vi.fn(async () => new Response(CSS, { status: 200 }));
			serve();
			vi.stubGlobal('fetch', fetchMock);
			const issue = await unusedStyles(['contact'], { previewUrl: PREVIEW });
			expect(issue?.details).toMatchObject({ source: 'published' });
			expect(fetchMock.mock.calls.some(([url]) => String(url).includes('preview.webflow.com'))).toBe(false);
		});

		it('does not ask another host for a link that is not a Webflow preview link', async () => {
			serve();
			const fetchMock = vi.fn(async () => new Response(CSS, { status: 200 }));
			vi.stubGlobal('fetch', fetchMock);
			await unusedStyles(['contact'], { previewUrl: 'https://example.com/preview/example-template?preview=0123456789abcdef0123456789abcdef', previewSiteDataPath: SITE_DATA_PATH });
			expect(fetchMock.mock.calls.some(([url]) => String(url).includes('example.com'))).toBe(false);
		});
	});
});
