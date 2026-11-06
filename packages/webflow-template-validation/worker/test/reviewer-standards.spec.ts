import { describe, expect, it } from 'vitest';
import { auditReviewerStandards, generateReviewerStandardIssues } from '../src/validators/reviewer-standards';

const SITE = 'https://example-template.webflow.io';
const NAV = '<div class="navbar w-nav"><nav class="w-nav-menu"><a href="/">Home</a></nav></div>';
const FOOTER = '<footer class="footer"><a href="/licenses">Licenses</a><a href="/changelog">Changelog</a></footer>';
const HEAD = '<link href="https://cdn.example.com/site/icon.png" rel="shortcut icon"/><link href="https://cdn.example.com/site/clip.png" rel="apple-touch-icon"/>';

function html(body: string, head = HEAD) {
	return `<!DOCTYPE html><html><head><title>t</title>${head}</head><body>${body}</body></html>`;
}

function audit(path: string, body: string, head = HEAD) {
	return auditReviewerStandards(html(body, head), new URL(path, SITE).href)!;
}

function issues(...audits: ReturnType<typeof audit>[]) {
	return generateReviewerStandardIssues(audits);
}

function pagesOf(id: string, ...audits: ReturnType<typeof audit>[]) {
	return issues(...audits).find((issue) => issue.id === id)?.details?.pages;
}

function webflowForm(dataName: string, done: string, fail: string, fields = '<input name="Email" data-name="Email" type="email"/>') {
	return `<div class="w-form"><form id="f" name="f" data-name="${dataName}">${fields}<input type="submit" value="Send"/></form>` +
		`<div class="w-form-done"><div>${done}</div></div><div class="w-form-fail"><div>${fail}</div></div></div>`;
}

describe('Reviewer standards', () => {
	it('passes a page that follows every standard', () => {
		const clean = audit('/', NAV + webflowForm('Contact Form', 'Thanks, we will reply within a day.', 'That did not send. Try again.') + FOOTER);
		expect(clean.findings).toEqual({});
		expect(issues(clean)).toEqual([]);
	});

	it('reports every standard as a blocking Content & Accessibility error, one issue per standard', () => {
		const home = audit('/', '<h1>Home</h1>' + webflowForm('Email Form', 'Thank you! Your submission has been received!', 'Sent?'), '');
		const about = audit('/about', '<p>Acme® builds things.</p>' + webflowForm('Email Form', 'Thank you! Your submission has been received!', 'Sent?'));
		const result = issues(home, about);

		expect(result.map((issue) => issue.id)).toEqual([
			'form-default-messages',
			'form-default-names',
			'licenses-footer-link',
			'default-favicon',
			'trademark-symbols'
		]);
		expect(result.every((issue) => issue.severity === 'error' && issue.category === 'Content & Accessibility')).toBe(true);
		expect(result[0].message).toBe("Forms show Webflow's default success or error message on 2 page(s)");
		expect(result[0].howToFix).toBeTruthy();
	});

	it("flags Webflow's default success and error messages, per form", () => {
		const body = NAV +
			webflowForm('Contact Form', 'Thank you! Your submission has been received!', 'Oops! Something went wrong while submitting the form.') +
			webflowForm('Newsletter', 'Subscribed.', 'Oops!  Something went wrong while submitting the form.') +
			FOOTER;
		expect(pagesOf('form-default-messages', audit('/contact', body))).toEqual([
			{ url: `${SITE}/contact`, detail: 'default success message on 1 form(s), default error message on 2 form(s)' }
		]);
	});

	it('flags default form and field names, but not descriptive names or the password input', () => {
		const fields = '<input name="Field-2" data-name="Field 2" type="text"/><input name="Name" data-name="Name" type="text"/><input type="hidden" name="field"/>';
		const contact = audit('/contact', NAV + webflowForm('Email Form 2', 'Sent.', 'Not sent.', fields) + FOOTER);
		const password = audit(
			'/401',
			'<div class="w-password-page w-form"><form class="w-password-page" name="email-form" data-name="Email Form">' +
				'<input class="w-password-page w-input" name="pass" data-name="field" type="password" id="pass"/></form></div>'
		);
		expect(pagesOf('form-default-names', contact, password)).toEqual([
			{ url: `${SITE}/contact`, detail: 'form "Email Form 2", field "Field 2"' },
			{ url: `${SITE}/401`, detail: 'form "Email Form"' }
		]);
	});

	it('flags background videos without the play/pause button and autoplay videos without controls', () => {
		const withButton =
			'<div class="hero-video w-background-video w-background-video-atom"><video id="v1-video" autoplay="" muted=""></video>' +
			'<div aria-live="polite"><button type="button" data-w-bg-video-control="true" aria-controls="v1-video" class="w-backgroundvideo-backgroundvideoplaypausebutton w-background-video--control"></button></div></div>';
		const withoutButton = '<div class="w-background-video w-background-video-atom"><video id="v2-video" autoplay="" muted=""></video></div>';
		const embedAutoplay = '<video src="/clip.mp4" autoplay muted loop></video>';
		const embedWithControls = '<video src="/clip.mp4" autoplay controls></video><video src="/still.mp4"></video>';

		expect(audit('/', NAV + withButton + embedWithControls + FOOTER).findings['video-play-pause']).toBeUndefined();
		expect(audit('/', NAV + withButton + withoutButton + embedAutoplay + FOOTER).findings['video-play-pause']).toBe(
			'1 background video(s) without a play/pause button, 1 autoplay video(s) without controls'
		);
	});

	it('flags a 404 page without the navbar or footer that the home page has', () => {
		const home = audit('/', NAV + FOOTER);
		expect(pagesOf('404-navigation', home, audit('/404', '<h1>Page not found</h1><a href="/">Go home</a>'))).toEqual([
			{ url: `${SITE}/404`, detail: 'no navbar or footer, but the home page has one' }
		]);
		expect(pagesOf('404-navigation', home, audit('/404', NAV + '<h1>Page not found</h1>' + FOOTER))).toBeUndefined();
		expect(pagesOf('404-navigation', audit('/', '<h1>Home</h1>'), audit('/404', '<h1>Page not found</h1>'))).toBeUndefined();
	});

	it('flags pages whose footer does not link to /licenses, and skips the password and 404 pages', () => {
		const navOnly = audit('/about', `<div class="w-nav"><a href="/licenses">Licenses</a></div><div class="footer_component"><a href="/">Home</a></div>`);
		const absolute = audit('/team', `<div id="site-footer"><a href="${SITE}/licenses/">Licenses</a></div>`);
		const noFooterButLink = audit('/blog', '<main><a href="/licenses">Licenses</a></main>');
		const nothing = audit('/pricing', '<main><h1>Pricing</h1></main>');
		const password = audit('/401', '<form data-name="Password Form"></form>');
		const notFound = audit('/404', '<h1>Page not found</h1>');
		const otherSite = audit('/faq', '<footer><a href="https://other.webflow.io/licenses">Licenses</a></footer>');

		expect(pagesOf('licenses-footer-link', navOnly, absolute, noFooterButLink, nothing, password, notFound, otherSite)).toEqual([
			{ url: `${SITE}/about`, detail: 'the footer has no Licenses link' },
			{ url: `${SITE}/pricing`, detail: 'no footer and no Licenses link found' },
			{ url: `${SITE}/faq`, detail: 'the footer has no Licenses link' }
		]);
	});

	it('flags a missing or Webflow-default favicon and webclip on any CDN host, on the home page only', () => {
		const defaults = '<link href="https://cdn.prod.website-files.com/img/favicon.ico" rel="shortcut icon" type="image/x-icon"/>' +
			'<link href="https://d1example.cloudfront.net/img/webclip.png" rel="apple-touch-icon"/>';
		expect(audit('/', NAV + FOOTER, defaults).findings['default-favicon']).toBe('Webflow default favicon.ico and webclip.png');
		expect(audit('/', NAV + FOOTER, '').findings['default-favicon']).toBe('no favicon or webclip link');
		expect(audit('/about', NAV + FOOTER, '').findings['default-favicon']).toBeUndefined();
		expect(audit('/', NAV + FOOTER).findings['default-favicon']).toBeUndefined();
	});

	it('flags ® and ™ in visible copy, decoding entities, but not in scripts or on the Licenses page', () => {
		const copy = audit('/', `${NAV}<p>Acme&reg; builds things.</p><p>Northwind™ too.</p><script>var x = "®";</script>${FOOTER}`);
		const licenses = audit('/licenses', `${NAV}<p>Webflow® is a trademark of Webflow, Inc.</p>${FOOTER}`);
		expect(copy.findings['trademark-symbols']).toMatch(/^2 symbol\(s\), for example ".*Acme®/);
		expect(licenses.findings['trademark-symbols']).toBeUndefined();
	});

	it('skips an empty document and normalizes the page path', () => {
		expect(auditReviewerStandards('', `${SITE}/about`)).toBeNull();
		expect(audit('/about/', NAV + FOOTER).path).toBe('/about');
	});
});
