import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPreviewSiteData, findUnusedStylesInSiteData, parsePreviewLink, previewSiteDataUrl } from '../src/validators/designer-unused-styles';
import { generateUnusedStyleIssues } from '../src/validators/unused-styles';

const TOKEN = '0123456789abcdef0123456789abcdef';
// A stand-in: the real path is the worker secret PREVIEW_SITE_DATA_PATH.
const PATH = '/site-data/{site}?preview={token}';
const LINK = { siteSlug: 'my-template', token: TOKEN };
const PAGE = 'page-home';
let nextId = 0;
const id = () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`;

function style(sel: string, extra: { children?: string[]; onPage?: boolean; id?: string } = {}) {
	return {
		_id: extra.id ?? id(),
		data: { type: 'class', name: sel, sel, comb: sel.lastIndexOf('.') > 0 ? '&' : '', children: extra.children ?? [], affects: extra.onPage ? { [PAGE]: 1 } : {} }
	};
}

function site(blocks: ReturnType<typeof style>[], rest: Record<string, unknown> = {}) {
	return { styles: { blocks: [{ _id: 'default-body', data: { type: 'tag', name: 'body', sel: 'body', children: [], affects: {} } }, ...blocks] }, pages: [{ _id: PAGE }], domNodes: [], symbols: [], ...rest };
}

const names = (data: unknown) => findUnusedStylesInSiteData(data)?.unused.map((entry) => entry.classes.join('.'));

describe('parsePreviewLink', () => {
	it('reads the site and token from a Webflow preview link', () => {
		expect(parsePreviewLink(`https://preview.webflow.com/preview/my-template?utm_medium=preview_link&preview=${TOKEN}&workflow=preview`)).toEqual({ siteSlug: 'my-template', token: TOKEN });
	});

	it('rejects every other host, scheme and shape', () => {
		for (const value of [
			`https://example.com/preview/my-template?preview=${TOKEN}`,
			`https://preview.webflow.com.example.com/preview/my-template?preview=${TOKEN}`,
			`http://preview.webflow.com/preview/my-template?preview=${TOKEN}`,
			`https://user@preview.webflow.com/preview/my-template?preview=${TOKEN}`,
			`https://preview.webflow.com/preview/my-template/../../api?preview=${TOKEN}`,
			'https://preview.webflow.com/preview/my-template?preview=short',
			'https://my-template.webflow.io/',
			'',
			undefined,
			42
		]) {
			expect(parsePreviewLink(value)).toBeNull();
		}
	});
});

describe('findUnusedStylesInSiteData', () => {
	it('lists a class that no page, element or component uses', () => {
		expect(names(site([style('.hero', { onPage: true }), style('.old')]))).toEqual(['old']);
	});

	it('counts a class on a component element as used', () => {
		const footer = style('.footer');
		expect(names(site([style('.hero', { onPage: true }), footer], { symbols: [{ _id: id(), classes: [footer._id] }] }))).toEqual([]);
	});

	it('counts a class that only an interaction target names as used', () => {
		const open = style('.is-open');
		expect(names(site([style('.hero', { onPage: true }), open], { interactions: { targets: [['wf:class', [open._id]]] } }))).toEqual([]);
	});

	it('counts the parent of a used combo class as used', () => {
		const combo = style('.card.is-dark', { onPage: true });
		expect(names(site([style('.card', { children: [combo._id] }), combo]))).toEqual([]);
	});

	it('lists an unused combo class when its parent is used', () => {
		const combo = style('.card.is-dark');
		expect(names(site([style('.card', { children: [combo._id], onPage: true }), combo]))).toEqual(['card.is-dark']);
	});

	it('counts a global class as used when a used combo class has its name', () => {
		expect(names(site([style('.nav-link.gap-8', { onPage: true }), style('.gap-8')]))).toEqual([]);
	});

	it('counts a second style with the selector of a used style as used', () => {
		expect(names(site([style('.avatar-row', { onPage: true }), style('.avatar-row')]))).toEqual([]);
	});

	it('counts the same combo classes in a different order as used', () => {
		expect(names(site([style('.text.uppercase.white', { onPage: true }), style('.text.white.uppercase')]))).toEqual([]);
	});

	it('reads an older style whose ID is its class name', () => {
		const data = site([style('.hero', { onPage: true }), style('.utility-wrap', { id: 'utility-wrap' }), style('.wrap', { id: 'wrap' })], {
			interactions: { targets: [['wf:class', ['utility-wrap']]] }
		});
		expect(names(data)).toEqual(['wrap']);
	});

	it('gives no answer for data in an unknown shape', () => {
		expect(findUnusedStylesInSiteData(null)).toBeNull();
		expect(findUnusedStylesInSiteData({ styles: {} })).toBeNull();
		expect(findUnusedStylesInSiteData({ ...site([style('.hero', { onPage: true })]), pages: [] })).toBeNull();
		// No style in use at all: the usage data is missing, not the usage.
		expect(findUnusedStylesInSiteData(site([style('.a'), style('.b')]))).toBeNull();
	});
});

describe('generateUnusedStyleIssues with the Designer source', () => {
	it('names the Clean up list and keeps the block threshold', () => {
		const few = findUnusedStylesInSiteData(site([style('.hero', { onPage: true }), style('.old')]))!;
		const [warning] = generateUnusedStyleIssues(few, 0, 'designer');
		expect(warning).toMatchObject({ id: 'unused-styles', severity: 'warning', details: { unusedStyles: ['.old'], source: 'designer' } });
		expect(warning.description).toContain('Clean up');

		const many = findUnusedStylesInSiteData(site([style('.hero', { onPage: true }), ...Array.from({ length: 11 }, (_, i) => style(`.old-${i}`))]))!;
		expect(generateUnusedStyleIssues(many, 0, 'designer')[0].severity).toBe('error');
	});
});

describe('fetchPreviewSiteData', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('asks only the Webflow preview host and gives null for an expired link', async () => {
		const fetchMock = vi.fn(async () => new Response('Not found', { status: 404 }));
		vi.stubGlobal('fetch', fetchMock);
		expect(await fetchPreviewSiteData(LINK, PATH)).toBeNull();
		expect(fetchMock.mock.calls[0][0]).toBe(`https://preview.webflow.com/site-data/my-template?preview=${TOKEN}`);
	});

	it('does not ask anything without the path secret, or with a path that names a host', async () => {
		const fetchMock = vi.fn(async () => Response.json({}));
		vi.stubGlobal('fetch', fetchMock);
		for (const path of [undefined, '', '/site-data/{site}', 'https://example.com/{site}?preview={token}', '//example.com/{site}?preview={token}', '/\\example.com/{site}?preview={token}', '@example.com/{site}?preview={token}']) {
			expect(previewSiteDataUrl(LINK, path)).toBeNull();
			expect(await fetchPreviewSiteData(LINK, path)).toBeNull();
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('uses only fetch options that Cloudflare Workers accept, and does not follow a redirect', async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://example.com/' } }));
		vi.stubGlobal('fetch', fetchMock);
		expect(await fetchPreviewSiteData(LINK, PATH)).toBeNull();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		// Workers throw on `redirect: 'error'`.
		expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].redirect).toBe('manual');
	});

	it('gives null when the answer is not JSON', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('<html></html>', { status: 200 })));
		expect(await fetchPreviewSiteData(LINK, PATH)).toBeNull();
	});

	it('returns the parsed site data', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => Response.json({ styles: { blocks: [] } })));
		expect(await fetchPreviewSiteData(LINK, PATH)).toEqual({ styles: { blocks: [] } });
	});
});
