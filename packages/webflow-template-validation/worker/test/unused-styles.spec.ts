import { describe, expect, it } from 'vitest';
import {
	collectClassUsage,
	createClassUsage,
	extractStyleChains,
	findUnusedStyles,
	generateUnusedStyleIssues,
	uncrawledItemPages,
	UNUSED_STYLES_BLOCK_THRESHOLD
} from '../src/validators/unused-styles';

const SHEET = 'https://cdn.prod.website-files.com/0123456789abcdef01234567/css/site.webflow.shared.abc.css';
const SITE_JS = 'https://cdn.prod.website-files.com/0123456789abcdef01234567/js/webflow.schunk.abc.js';

function page(body: string, head = '') {
	return `<!DOCTYPE html><html><head><link href="${SHEET}" rel="stylesheet"/>${head}</head><body>${body}</body></html>`;
}

function unusedNames(css: string, pages: string[], siteScripts: string[] = []) {
	const usage = createClassUsage();
	for (const html of pages) collectClassUsage(html, usage);
	return findUnusedStyles(css, usage, siteScripts).unused.map((style) => style.name);
}

describe('Unused styles', () => {
	it('reads class chains from selectors, media queries and descendant selectors', () => {
		const css = `
			/* .comment-class { } */
			.card { color: red; }
			.card.is-dark:hover .title, .nav-link.w--current { color: blue; }
			@media screen and (max-width: 991px) { .card.is-dark { padding: 0; } .hero { margin: 0; } }
			@keyframes spin { from { opacity: 0.5; } to { opacity: 1; } }
			.w-nav .w-nav-link { color: inherit; }
			a[href$=".pdf"] { color: green; }
		`;
		expect([...extractStyleChains(css).keys()].sort()).toEqual(['card', 'card is-dark', 'hero', 'nav-link', 'title']);
	});

	it('reads a class that starts with a digit, which CSS writes as a hex escape', () => {
		expect([...extractStyleChains('.\\32 -column{a:b}.card.\\31 0px .title{a:b}').keys()].sort()).toEqual(['10px card', '2-column', 'title']);
		expect(unusedNames('.\\32 -column{a:b}', [page('<div class="2-column"></div>'), page('')])).toEqual([]);
	});

	it('reports a class that no page uses, and a combo whose classes never meet on one element', () => {
		const css = '.card{a:b}.card.is-dark{a:b}.title{a:b}.leftover{a:b}.title.is-dark{a:b}';
		const pages = [page('<div class="card is-dark"><h2 class="title">x</h2></div>'), page('<div class="card"></div>')];
		expect(unusedNames(css, pages)).toEqual(['leftover', 'title is-dark']);
	});

	it('does not report a combo when its base class is unused too', () => {
		expect(unusedNames('.old{a:b}.old.is-big{a:b}', [page('<p class="text">x</p>'), page('')])).toEqual(['old']);
	});

	it('keeps Webflow platform classes and state classes out of the result', () => {
		const css = '.w-widget-map .gm-style-iw{a:b}.w-commerce-commercecheckoutcardnumber.-wfp-focus{a:b}.tab.w--current{a:b}.form.w-form{a:b}';
		expect(unusedNames(css, [page('<a class="tab w-tab-link">x</a><div class="form w-form"></div>'), page('')])).toEqual([]);
	});

	it('reports a custom class that is named like a platform class (published as _w-form)', () => {
		expect(unusedNames('.contact-form._w-form{a:b}', [page('<div class="contact-form w-form"></div>'), page('')])).toEqual(['contact-form _w-form']);
	});

	it('treats a class as used when a page script, an inline attribute or the site JavaScript names it', () => {
		const css = '.menu.is-open{a:b}.faq.is-active{a:b}.panel.is-shown{a:b}.leftover{a:b}';
		const pages = [
			page('<div class="menu"></div><div class="faq" data-toggle-class="is-active"></div><div class="panel"></div><script>document.querySelector(".menu").classList.toggle("is-open")</script>'),
			page('')
		];
		expect(unusedNames(css, pages, ['{"className":"is-shown"}'])).toEqual(['leftover']);
	});

	it('ignores JSON data blocks when it looks for class names in scripts', () => {
		const pages = [page('<script type="application/ld+json">{"name":"leftover"}</script>'), page('')];
		expect(unusedNames('.leftover{a:b}', pages)).toEqual(['leftover']);
	});

	it('records the site stylesheet and site scripts, and no third-party files', () => {
		const usage = createClassUsage();
		collectClassUsage(page('', `<link href="https://fonts.googleapis.com/css?family=Inter" rel="stylesheet"/><script src="${SITE_JS}"></script><script src="https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js"></script>`), usage);
		expect([...usage.stylesheetUrls]).toEqual([SHEET]);
		expect([...usage.scriptUrls]).toEqual([SITE_JS]);
		expect(usage.pageCount).toBe(1);
	});

	it('picks up to two unread item pages for each CMS collection path', () => {
		const usage = createClassUsage();
		collectClassUsage(page('<a href="/blog/a">a</a><a href="/blog/b">b</a><a href="/blog/c">c</a><a href="/work/x#top">x</a><a href="/about">About</a><a href="https://other.example/blog/z">z</a><a href="/files/guide.pdf">pdf</a>'), usage);
		const site = 'https://example-template.webflow.io';
		// /blog/a is read already, so one more blog item is enough.
		const result = uncrawledItemPages(usage, site, [site, `${site}/about`, `${site}/blog/a`]);
		const pages = result.pages.sort();
		expect(result.truncated).toBe(false);
		expect(pages).toHaveLength(2);
		expect(pages[0]).toMatch(/\/blog\/[bc]$/);
		expect(pages[1]).toBe(`${site}/work/x`);
	});

	it('blocks only when the list is longer than the threshold', () => {
		const usage = createClassUsage();
		collectClassUsage(page('<div class="card"></div>'), usage);
		collectClassUsage(page(''), usage);
		const sheet = (count: number) => Array.from({ length: count }, (_, i) => `.old-${i}{a:b}`).join('');
		const severity = (count: number) => generateUnusedStyleIssues(findUnusedStyles(sheet(count), usage), usage.pageCount)[0].severity;
		expect(severity(UNUSED_STYLES_BLOCK_THRESHOLD)).toBe('warning');
		expect(severity(UNUSED_STYLES_BLOCK_THRESHOLD + 1)).toBe('error');
	});

	it('says when the limit leaves a collection out', () => {
		const usage = createClassUsage();
		collectClassUsage(page('<a href="/blog/a">a</a><a href="/work/x">x</a><a href="/team/y">y</a>'), usage);
		const result = uncrawledItemPages(usage, 'https://example-template.webflow.io', [], 2, 2);
		expect(result.pages).toHaveLength(2);
		expect(result.truncated).toBe(true);
	});

	it('makes one warning that lists the styles, and none when every style is used', () => {
		const usage = createClassUsage();
		collectClassUsage(page('<div class="card"></div>'), usage);
		collectClassUsage(page(''), usage);
		expect(generateUnusedStyleIssues(findUnusedStyles('.card{a:b}', usage), usage.pageCount)).toEqual([]);

		const [issue, ...rest] = generateUnusedStyleIssues(findUnusedStyles('.card{a:b}.old{a:b}.card.is-x{a:b}', usage), usage.pageCount);
		expect(rest).toEqual([]);
		expect(issue).toMatchObject({ id: 'unused-styles', severity: 'warning', message: '2 style(s) are not used on any published page' });
		expect(issue.details).toMatchObject({ unusedStyles: ['.card.is-x', '.old'], pagesChecked: 2, stylesChecked: 3 });
	});
});
