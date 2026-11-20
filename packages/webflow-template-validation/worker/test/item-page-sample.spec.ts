import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/fetch-utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('../src/utils/fetch-utils')>()),
	fetchHTML: vi.fn()
}));

import { fetchHTML } from '../src/utils/fetch-utils';
import { unsupportedSocialImageFormat, validateContent } from '../src/validators/content-validator';

const SITE = 'https://example-template.webflow.io';
const CDN = 'https://cdn.prod.website-files.com/0123456789abcdef01234567';
const DESCRIPTION = 'A long enough description of this page of the template, written so that the length check for meta descriptions passes with room to spare here.';

function page(body: string, head: { description?: string; ogImage?: string } = {}) {
	return `<!doctype html><html><head><title>A page title of a sensible length</title>
<meta name="description" content="${head.description ?? DESCRIPTION}"/>
<meta property="og:title" content="Title"/><meta property="og:image" content="${head.ogImage ?? `${CDN}/share.png`}"/>
</head><body><h1>Heading</h1><p>${'Body copy for the page. '.repeat(30)}</p>${body}</body></html>`;
}

const SIZED = `<img src="${CDN}/a.jpg" alt="A" width="800" height="600"/>`;
const UNSIZED = `<img src="${CDN}/cover.jpg" alt="Cover"/>`;
const STORY_LINKS = ['one', 'two', 'three', 'four', 'five'].map((slug) => `<a href="/stories/${slug}">${slug}</a>`).join('');

function site(storyBody: string, storyHead: { description?: string; ogImage?: string } = {}) {
	const pages: Record<string, string> = {
		'/': page(`${SIZED}<a href="/stories">Stories</a><a href="/about">About</a>`),
		'/about': page(SIZED),
		'/stories': page(`${SIZED}${STORY_LINKS}`)
	};
	for (const slug of ['one', 'two', 'three', 'four', 'five']) pages[`/stories/${slug}`] = page(storyBody, storyHead);
	return pages;
}

function serve(pages: Record<string, string>, broken: string[] = []) {
	const fetched: string[] = [];
	vi.mocked(fetchHTML).mockImplementation(async (url: string) => {
		const path = new URL(url).pathname;
		fetched.push(path);
		if (broken.includes(path)) throw new Error('Request timeout');
		const html = pages[path];
		if (!html) throw new Error('HTTP 404: Not Found');
		return { html, status: 200, headers: { 'content-type': 'text/html' }, size: html.length, loadTime: 0 };
	});
	// Link checks and stylesheet reads: every other request answers with an empty body.
	vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
	return fetched;
}

const STATIC_PAGES = ['about', 'stories'];
/** Paths of the sampled item pages. Which three of the five are read depends on the link order the parser gives. */
const sampledPaths = (result: Awaited<ReturnType<typeof validateContent>>) =>
	result.pages.filter((p) => p.isCmsItemSample).map((p) => new URL(p.url).pathname).sort();

describe('CMS item pages in the content crawl', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reads up to three item pages of a collection and reports the number', async () => {
		const fetched = serve(site(SIZED));
		const result = await validateContent(SITE, STATIC_PAGES);
		const items = sampledPaths(result);
		expect(items).toHaveLength(3);
		expect(items.every((path) => path.startsWith('/stories/'))).toBe(true);
		expect(result.stats.cmsItemPagesChecked).toBe(3);
		expect(fetched.filter((path) => path.startsWith('/stories/')).sort()).toEqual(items);
		expect(result.issues.find((issue) => issue.id === 'images-missing-dimensions')).toBeUndefined();
	});

	it('blocks on an image without width and height that only an item page shows', async () => {
		serve(site(UNSIZED));
		const result = await validateContent(SITE, STATIC_PAGES);
		const issue = result.issues.find((entry) => entry.id === 'images-missing-dimensions');
		expect(issue?.severity).toBe('error');
		const urls = (issue?.details?.pagesWithIssues as Array<{ url: string }>).map((entry) => new URL(entry.url).pathname).sort();
		expect(urls).toEqual(sampledPaths(result));
		expect(urls).toHaveLength(3);
	});

	it('warns on a short meta description and a WebP Open Graph image of an item page', async () => {
		serve(site(SIZED, { description: 'Too short.', ogImage: `${CDN}/cover.webp` }));
		const result = await validateContent(SITE, STATIC_PAGES);
		const item = sampledPaths(result)[0];
		const ids = result.issues.filter((issue) => issue.location?.endsWith(item)).map((issue) => issue.id);
		expect(ids.some((id) => id.startsWith('description-too-short-'))).toBe(true);
		expect(ids.some((id) => id.startsWith('og-image-format-'))).toBe(true);
		expect(result.issues.find((issue) => issue.id.startsWith('og-image-format'))?.severity).toBe('warning');
	});

	it('does not count an image in a Rich Text element, which has no size settings', async () => {
		serve(site(`<div class="post-body w-richtext"><figure class="w-richtext-figure-type-image"><div><img src="${CDN}/body.jpg" alt="Body"/></div></figure></div>`));
		const result = await validateContent(SITE, STATIC_PAGES);
		expect(result.stats.cmsItemPagesChecked).toBe(3);
		expect(result.issues.find((issue) => issue.id === 'images-missing-dimensions')).toBeUndefined();
	});

	it('reads no item page when the run has a page limit', async () => {
		const fetched = serve(site(UNSIZED));
		const result = await validateContent(SITE, STATIC_PAGES, { maxPages: 20 });
		expect(result.stats.cmsItemPagesChecked).toBe(0);
		expect(fetched.some((path) => path.startsWith('/stories/'))).toBe(false);
		expect(result.issues.find((issue) => issue.id === 'images-missing-dimensions')).toBeUndefined();
	});

	it('skips an item page that does not load and keeps the others', async () => {
		serve(site(UNSIZED));
		const all = sampledPaths(await validateContent(SITE, STATIC_PAGES));
		serve(site(UNSIZED), [all[1]]);
		const result = await validateContent(SITE, STATIC_PAGES);
		expect(sampledPaths(result)).toEqual([all[0], all[2]]);
		expect(result.issues.find((issue) => issue.id === 'images-missing-dimensions')?.severity).toBe('error');
	});

	it('does not sample a page that the run excludes or a page in the page list', async () => {
		const pages = site(SIZED);
		pages['/'] = page(`${SIZED}<a href="/info/style-guide">Guide</a><a href="/info/licenses">Licenses</a><a href="/stories">Stories</a>`);
		pages['/info/style-guide'] = page(UNSIZED);
		pages['/info/licenses'] = page(SIZED);
		const fetched = serve(pages);
		const result = await validateContent(SITE, [...STATIC_PAGES, 'info/licenses'], { excludePageSlugs: ['/info/style-guide'] });
		expect(fetched).not.toContain('/info/style-guide');
		expect(fetched.filter((path) => path === '/info/licenses')).toHaveLength(1);
		expect(result.stats.cmsItemPagesChecked).toBe(3);
	});
});

describe('unsupportedSocialImageFormat', () => {
	it('names WebP and AVIF files, with or without a query', () => {
		expect(unsupportedSocialImageFormat(`${CDN}/share.webp`)).toBe('WebP');
		expect(unsupportedSocialImageFormat(`${CDN}/share.AVIF?v=2`)).toBe('AVIF');
	});

	it('accepts JPEG, PNG, a missing image and a URL that only mentions the format', () => {
		expect(unsupportedSocialImageFormat(`${CDN}/share.png`)).toBeNull();
		expect(unsupportedSocialImageFormat(`${CDN}/share.jpg?format=webp`)).toBeNull();
		expect(unsupportedSocialImageFormat(`${CDN}/webp-guide.jpeg`)).toBeNull();
		expect(unsupportedSocialImageFormat(null)).toBeNull();
	});
});

describe('item page sample order', () => {
	it('gives the same sample when the links arrive in a different order', async () => {
		const { uncrawledItemPages, createClassUsage } = await import('../src/validators/unused-styles');
		const links = ['/work/e', '/work/b', '/work/d', '/work/a', '/work/c'];
		const sample = (order: string[]) => {
			const usage = createClassUsage();
			for (const href of order) usage.linkHrefs.add(href);
			return uncrawledItemPages(usage, 'https://example.webflow.io', ['https://example.webflow.io/'], 3, 15).pages;
		};
		expect(sample(links)).toEqual(sample([...links].reverse()));
		expect(sample(links).map((url) => new URL(url).pathname)).toEqual(['/work/a', '/work/b', '/work/c']);
	});
});
