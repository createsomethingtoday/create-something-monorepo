import { describe, expect, it } from 'vitest';
import { auditReviewerStandards } from '../src/validators/reviewer-standards';
import { generateReviewNoteIssues, uncheckedInternalTargets, type ReviewNoteContext } from '../src/validators/review-note-checks';

const SITE = 'https://example-template.webflow.io';
const SITE_ID = 'a'.repeat(24);
const NAV = '<div class="navbar w-nav"><nav class="w-nav-menu"><a href="/">Home</a><a href="/about">About</a></nav></div>';
const FOOTER = '<footer class="footer"><a href="/licenses">Licenses</a> Powered by <a href="https://webflow.com">Webflow</a></footer>';
const NOW = new Date('2026-11-25T12:00:00Z');

function page(path: string, body: string, head = '') {
	const html = `<!DOCTYPE html><html data-wf-site="${SITE_ID}"><head><title>t</title>${head}</head><body>${body}</body></html>`;
	return auditReviewerStandards(html, new URL(path, SITE).href)!;
}

function issues(audits: ReturnType<typeof page>[], context: ReviewNoteContext = {}) {
	return generateReviewNoteIssues(audits, { now: NOW, ...context });
}

function detail(id: string, audits: ReturnType<typeof page>[], context: ReviewNoteContext = {}) {
	return issues(audits, context).find((issue) => issue.id === id)?.details?.pages as Array<{ url: string; detail: string }> | undefined;
}

describe('Review-note checks', () => {
	it('reports nothing on a clean site', () => {
		const home = page('/', `${NAV}<a href="/about" class="button w-button">Read more</a>${FOOTER}`);
		const licenses = page('/licenses', `${NAV}<p>Photos: Unsplash license. Fonts: Open Font License.</p>${FOOTER}`);
		expect(issues([home, licenses], { missingPaths: [], notFoundTargets: [] })).toEqual([]);
	});

	it('reports every finding as a warning, never as an error', () => {
		const home = page('/', `${NAV}<a href="#" class="button w-button">Get started</a><a href="${SITE}/about">About</a><footer class="footer"><a href="https://webflow.com/templates">Powered by Webflow</a></footer>`);
		const result = issues([home]);
		expect(result.map((issue) => issue.id)).toEqual(['links-placeholder-href', 'links-own-domain-absolute', 'powered-by-webflow-target']);
		expect(result.every((issue) => issue.severity === 'warning' && issue.category === 'Content & Accessibility')).toBe(true);
	});

	describe('links-placeholder-href', () => {
		it('groups "#" links by where they are', () => {
			const home = page(
				'/',
				`<div class="w-nav"><a href="#">Pricing</a></div><a href="#" class="cta-button w-inline-block">Book a call</a>` +
					`<a href="#" class="card-link w-inline-block">Case study</a><footer class="footer"><a href="#" class="footer-social-link" aria-label="Instagram"></a><a href="#">Careers</a></footer>`
			);
			const [entry] = detail('links-placeholder-href', [home])!;
			expect(entry.detail).toContain('1 navigation link(s)');
			expect(entry.detail).toContain('1 button link(s)');
			expect(entry.detail).toContain('1 other link(s)');
			expect(entry.detail).toContain('1 social link(s)');
			expect(entry.detail).toContain('1 footer link(s)');
		});

		it('does not count controls, hidden links or a link back to the top', () => {
			const controls = [
				'<a href="#" class="w-inline-block w-lightbox">Open</a>',
				'<a href="#" data-w-tab="Tab 1" class="w-inline-block w-tab-link">Plan</a>',
				'<a href="#" data-wf-target="[[&quot;x&quot;]]" class="w-inline-block">Details</a>',
				'<a href="#" role="button" class="w-inline-block">Details</a>',
				'<a href="#" aria-controls="menu" class="w-inline-block">Details</a>',
				'<a href="#" class="w-commerce-commercecartopenlink">Cart</a>',
				'<a href="#" class="mobile-menu-button w-inline-block"></a>',
				'<a href="#" class="w-inline-block">Close</a>',
				'<a href="#" class="w-inline-block">Add to cart</a>',
				'<a href="#" class="w-inline-block">Back to top</a>',
				'<div class="w-condition-invisible"><a href="#">Hidden by a condition</a></div>',
				'<a href="#" aria-hidden="true">Decoration</a>'
			].join('');
			expect(detail('links-placeholder-href', [page('/', NAV + controls + FOOTER)])).toBeUndefined();
		});

		it('does not read the Style Guide, where links are samples', () => {
			expect(detail('links-placeholder-href', [page('/style-guide', '<a href="#" class="button w-button">Button</a>')])).toBeUndefined();
		});

		it('does not count a link to a section of the page', () => {
			expect(detail('links-placeholder-href', [page('/', '<a href="#pricing" class="button w-button">Pricing</a>')])).toBeUndefined();
		});
	});

	describe('links-own-domain-absolute and links-other-webflow-site', () => {
		it('reports a link that holds the full address of the template site', () => {
			const home = page('/', `${NAV}<a href="${SITE}/contact">Contact</a><a href="/pricing">Pricing</a>${FOOTER}`);
			expect(detail('links-own-domain-absolute', [home])![0].detail).toBe(`${SITE}/contact`);
		});

		it('reports a link to a different webflow.io site', () => {
			const home = page('/', `${NAV}<a href="https://another-template.webflow.io/services">Services</a>${FOOTER}`);
			expect(detail('links-other-webflow-site', [home])![0].detail).toBe('another-template.webflow.io');
		});

		it('allows the one "Designed by" credit in the footer to open the creator\'s site', () => {
			const home = page('/', `${NAV}<footer class="footer"><div>Designed &amp; Developed by <a href="https://studio-name.webflow.io">Studio Name</a></div> Powered by <a href="https://webflow.com">Webflow</a></footer>`);
			expect(detail('links-other-webflow-site', [home])).toBeUndefined();
		});
	});

	describe('links-internal-not-found', () => {
		it('lists the internal targets a run did not read, without the error pages', () => {
			const home = page('/', `${NAV}<a href="/services/design">Design</a><a href="/404">404</a><a href="/401">Password</a><a href="https://example.com/x">Out</a>${FOOTER}`);
			const about = page('/about', NAV + FOOTER);
			expect(uncheckedInternalTargets([home, about], 10)).toEqual(['/licenses', '/services/design']);
			expect(uncheckedInternalTargets([home, about], 1)).toEqual(['/licenses']);
		});

		it('reports a target the site answered with 404, and the pages that link to it', () => {
			const home = page('/', `${NAV}<a href="/services/design">Design</a>${FOOTER}`);
			const [entry] = detail('links-internal-not-found', [home], { notFoundTargets: ['/services/design'] })!;
			expect(entry.url).toBe(`${SITE}/services/design`);
			expect(entry.detail).toBe('linked from /');
		});
	});

	describe('cms-collection-over-item-limit', () => {
		const list = (collection: string, count: number) =>
			`<div class="w-dyn-list"><div class="w-dyn-items">${Array.from({ length: count }, (_, i) => `<div class="w-dyn-item"><a href="/${collection}/item-${i}">Item ${i}</a></div>`).join('')}</div></div>`;

		it('reports a collection with more than 7 different items on the site', () => {
			const home = page('/', NAV + list('blog', 5) + FOOTER);
			const blog = page('/blog', NAV + list('blog', 8) + FOOTER);
			const [entry] = detail('cms-collection-over-item-limit', [home, blog])!;
			expect(entry.url).toBe(`${SITE}/blog`);
			expect(entry.detail).toBe('at least 8 items');
		});

		it('accepts 7 items, and does not count static links', () => {
			const home = page('/', `${NAV}${list('blog', 7)}${Array.from({ length: 9 }, (_, i) => `<a href="/services/s-${i}">S</a>`).join('')}${FOOTER}`);
			expect(detail('cms-collection-over-item-limit', [home])).toBeUndefined();
		});
	});

	describe('changelog-future-date', () => {
		it('reports a date later than tomorrow, in the usual formats', () => {
			for (const written of ['December 23, 2026', 'Dec 23, 2026', '23 December 2026', '2026-12-23', 'Nov 27, 2026']) {
				const changelog = page('/changelog', `<h2>v1.0</h2><p>${written}</p><p>First release.</p>`);
				expect(detail('changelog-future-date', [changelog])?.[0].detail, written).toBe(`"${written}"`);
			}
		});

		it('accepts today, tomorrow and past dates, and reads only the Changelog page', () => {
			const changelog = page('/changelog', '<p>November 25, 2026</p><p>Nov 26, 2026</p><p>2026-10-01</p>');
			const blog = page('/blog', '<p>Join us on December 23, 2026</p>');
			expect(detail('changelog-future-date', [changelog, blog])).toBeUndefined();
		});
	});

	describe('powered-by-webflow-target', () => {
		const home = (footer: string) => page('/', `${NAV}<footer class="footer">${footer}</footer>`);

		it('reports a credit that opens another page of webflow.com or another address', () => {
			expect(detail('powered-by-webflow-target', [home('<a href="https://webflow.com/templates">Powered by Webflow</a>')])![0].detail).toContain('webflow.com/templates');
			expect(detail('powered-by-webflow-target', [home('Powered by <a href="https://www.webflow.co">Webflow</a>')])![0].detail).toContain('www.webflow.co');
		});

		it('reports a footer whose only webflow.com link is a designer profile', () => {
			expect(detail('powered-by-webflow-target', [home('Designed by <a href="https://webflow.com/templates/designers/studio">Studio</a> - Powered by Webflow')])).toBeDefined();
		});

		it('accepts a credit to the home page, with a profile link next to it and with a tracking query', () => {
			expect(detail('powered-by-webflow-target', [home('Designed by <a href="https://webflow.com/templates/designers/studio">Studio</a>. Powered by <a href="https://webflow.com/?utm_source=template">Webflow</a>')])).toBeUndefined();
			expect(detail('powered-by-webflow-target', [home('<a href="https://www.webflow.com/">Powered by Webflow</a>')])).toBeUndefined();
		});
	});

	describe('gsap-interactions-instructions-page', () => {
		const gsap = '<script src="https://cdn.prod.website-files.com/gsap/3.13.0/gsap.min.js" type="text/javascript"></script>';

		it('reports a site that loads GSAP and has no Instructions page', () => {
			expect(detail('gsap-interactions-instructions-page', [page('/', NAV + FOOTER + gsap)], { missingPaths: ['/instructions'] })).toBeDefined();
		});

		it('says nothing when the page exists, when its status is unknown, or when the blocking check already reports inline GSAP', () => {
			const home = page('/', NAV + FOOTER + gsap);
			expect(detail('gsap-interactions-instructions-page', [home, page('/instructions', '<h1>How to edit</h1>')], { missingPaths: [] })).toBeUndefined();
			expect(detail('gsap-interactions-instructions-page', [home])).toBeUndefined();
			const inline = page('/', `${NAV}${FOOTER}${gsap}<script>gsap.to('.hero', { opacity: 1 });</script>`);
			expect(detail('gsap-interactions-instructions-page', [inline], { missingPaths: ['/instructions'] })).toBeUndefined();
		});

		it('does not read a file that only has "gsap" inside another word', () => {
			const home = page('/', `${NAV}${FOOTER}<script src="https://cdn.example.com/js/logsapp.js"></script>`);
			expect(detail('gsap-interactions-instructions-page', [home], { missingPaths: ['/instructions'] })).toBeUndefined();
		});
	});

	describe('Licenses page text', () => {
		const video = '<div class="hero w-background-video"><video autoplay muted></video></div>';
		const lottie = '<div data-animation-type="lottie" data-src="https://cdn.example.com/a.json"></div>';

		it('reports a video or a Lottie animation that the Licenses page does not name', () => {
			const home = page('/', NAV + video + lottie + FOOTER);
			const licenses = page('/licenses', '<p>Photos: Unsplash license. Fonts: Open Font License.</p>');
			expect(detail('licenses-asset-type-not-listed', [home, licenses])![0].detail).toContain('video, Lottie animation');
		});

		it('accepts a Licenses page that names them', () => {
			const home = page('/', NAV + video + lottie + FOOTER);
			const licenses = page('/licenses', '<p>Hero footage: Pexels license. Animations: LottieFiles Simple License.</p>');
			expect(detail('licenses-asset-type-not-listed', [home, licenses])).toBeUndefined();
		});

		it('reports Flaticon with no attribution and no Premium license', () => {
			expect(detail('licenses-flaticon-attribution', [page('/licenses', '<p>All icons are from Flaticon.</p>')])).toBeDefined();
			expect(detail('licenses-flaticon-attribution', [page('/licenses', '<p>Icons from Flaticon, used under a Flaticon Premium license.</p>')])).toBeUndefined();
			expect(detail('licenses-flaticon-attribution', [page('/licenses', '<p>Icons made by Sample Author from www.flaticon.com</p>')])).toBeUndefined();
			expect(detail('licenses-flaticon-attribution', [page('/licenses', '<p>Flaticon free license, attribution below.</p>')])).toBeUndefined();
		});

		it('reports an AI image source that the page does not identify as AI', () => {
			expect(detail('licenses-ai-not-identified', [page('/licenses', '<p>All images are sourced from Lummi and Unsplash.</p>')])![0].detail).toContain('"Lummi"');
			expect(detail('licenses-ai-not-identified', [page('/licenses', '<p>Images: Unsplash and ChatGPT.</p>')])).toBeDefined();
		});

		it('accepts a page that says the images are AI-generated, in the words creators use', () => {
			for (const sentence of [
				'Hero images are AI-generated with Lummi.',
				'Photography was generated with Lummi.',
				'Every sample image was made by the template author with Nano Banana.',
				'The portraits are AI images from Midjourney.'
			]) {
				expect(detail('licenses-ai-not-identified', [page('/licenses', `<p>${sentence}</p>`)]), sentence).toBeUndefined();
			}
		});

		it('does not read a font or a brand name as an AI image source', () => {
			expect(detail('licenses-ai-not-identified', [page('/licenses', '<p>Fonts: Sora and Flux Grotesk, Open Font License. OpenAI is a trademark of OpenAI.</p>')])).toBeUndefined();
		});
	});

	describe('assets-other-project', () => {
		const img = (prefix: string) => `<img src="https://cdn.prod.website-files.com/${prefix}/${prefix}_photo.webp" alt="Photo"/>`;
		const CMS = 'c'.repeat(24);
		const OTHER = 'd'.repeat(24);

		it('reports an asset folder that is neither the site nor the CMS database', () => {
			const home = page('/', `${NAV}${img(SITE_ID)}<div class="w-dyn-item">${img(CMS)}</div>${img(OTHER)}${FOOTER}`);
			const result = detail('assets-other-project', [home])!;
			expect(result).toHaveLength(1);
			expect(result[0].detail).toContain(`cdn.prod.website-files.com/${OTHER}/`);
		});

		it('accepts CMS images shown outside a list when another page shows that folder in a list, and the platform video control', () => {
			const home = page('/', `${NAV}${img(SITE_ID)}${img(CMS)}${img('6022af993a6b2191db3ed10c')}${FOOTER}`);
			const blog = page('/blog', `<div class="w-dyn-item">${img(CMS)}</div>`);
			expect(detail('assets-other-project', [home, blog])).toBeUndefined();
		});
	});
});
