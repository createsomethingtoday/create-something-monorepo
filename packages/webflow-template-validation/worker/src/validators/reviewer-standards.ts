/**
 * Reviewer standards: published-site items that Marketplace template
 * reviewers ask creators to fix again and again (Airtable 📝Review Feedback,
 * July–November 2026). Each one blocks the submission gate, so creators fix
 * them before review instead of in a feedback round. Where the
 * template-preflight skill has a rule, these checks use the same rule (form
 * default names, footer detection).
 */

import { parseDocument } from 'htmlparser2';
import type { ReviewerPageAudit, ReviewerStandardId, ValidationIssue } from '../types';

/** The subset of a domhandler node that the checks read. */
interface Node {
	type: string;
	name?: string;
	attribs?: Record<string, string>;
	children?: Node[];
	parent?: Node | null;
	data?: string;
}

interface Standard {
	message: (pageCount: number) => string;
	description: string;
	howToFix: string;
}

const CATEGORY = 'Content & Accessibility';

const STANDARDS: Record<ReviewerStandardId, Standard> = {
	'form-default-messages': {
		message: (n) => `Forms show Webflow's default success or error message on ${n} page(s)`,
		description: 'The default "Thank you! Your submission has been received!" and "Oops! Something went wrong" messages are still in place.',
		howToFix: 'Write a success message and an error message that fit the template, and style both states.'
	},
	'form-default-names': {
		message: (n) => `Forms or fields keep a default Webflow name on ${n} page(s)`,
		description: 'Default names such as "Email Form" or "Field 2" show up in every form submission the buyer receives.',
		howToFix: 'Give each form and field a descriptive name in its settings, for example "Contact Form" or "Password Form".'
	},
	'video-play-pause': {
		message: (n) => `Autoplay videos have no play/pause control on ${n} page(s)`,
		description: 'Visitors must be able to pause video that plays on its own.',
		howToFix: 'Add the play/pause button to each Background Video, and give other autoplay videos visible controls.'
	},
	'404-navigation': {
		message: () => 'The 404 page has no navbar or footer',
		description: 'Without the site navbar and footer, visitors who reach the 404 page cannot get back into the site.',
		howToFix: 'Add the site navbar and footer to the 404 page.'
	},
	'licenses-footer-link': {
		message: (n) => `The footer does not link to the Licenses page on ${n} page(s)`,
		description: 'The Licenses page must be linked from the footer on every page.',
		howToFix: 'Add a Licenses link to the footer component so it shows on every page.'
	},
	'default-favicon': {
		message: () => "The favicon or webclip is missing or still Webflow's default",
		description: 'Templates need their own favicon and webclip.',
		howToFix: 'Upload a favicon and a webclip in Site settings.'
	},
	'trademark-symbols': {
		message: (n) => `The copy uses ® or ™ symbols on ${n} page(s)`,
		description: 'Template brands are fictional, and the symbols claim a registered trademark.',
		howToFix: 'Remove the ® and ™ symbols from the copy.'
	}
};

const DEFAULT_SUCCESS = 'thank you! your submission has been received!';
const DEFAULT_ERROR = 'oops! something went wrong while submitting the form';
const DEFAULT_NAME = /^(?:field(?:[- ]\d+)?|email[- ]form(?:[- ]\d+)?|name[- ]\d+|form[- ]\d+)$/i;
const FIELD_TAGS = new Set(['input', 'select', 'textarea']);
const NON_FIELD_INPUT_TYPES = new Set(['hidden', 'submit', 'reset', 'button', 'image']);
const FOOTER_TOKEN = /(?:^|[\s_-])footer(?:$|[\s_-])/i;
const DEFAULT_ICON_PATH = /^\/img\/(?:favicon\.ico|webclip\.png)$/i;
const NO_TEXT_TAGS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head']);
const LICENSES_PATH = '/licenses';
/** Utility pages: the password page has no site chrome, and the 404 page has its own navbar/footer check. */
const NO_FOOTER_LINK_PATHS = new Set(['/401', '/404']);

/** Paths the content crawl may not reach but the standards need. */
export const REVIEWER_UTILITY_PATHS = ['/404', '/401'];

/** Audit one published page. Returns null for an empty document. */
export function auditReviewerStandards(html: string, pageUrl: string): ReviewerPageAudit | null {
	if (!html || !html.trim()) return null;
	const url = new URL(pageUrl);
	const path = url.pathname.replace(/\/+$/, '') || '/';
	const root = parseDocument(html) as unknown as Node;
	const elements = descendants(root);
	const findings: ReviewerPageAudit['findings'] = {};
	const record = (id: ReviewerStandardId, detail: string | null) => {
		if (detail) findings[id] = detail;
	};

	record('form-default-messages', formMessagesDetail(elements));
	record('form-default-names', formNamesDetail(elements));
	record('video-play-pause', videoControlsDetail(elements));
	if (!NO_FOOTER_LINK_PATHS.has(path)) record('licenses-footer-link', licensesLinkDetail(elements, url));
	if (path === '/') record('default-favicon', faviconDetail(elements, url));
	if (path !== LICENSES_PATH) record('trademark-symbols', trademarksDetail(elements, root));

	return { url: url.href, path, findings, hasNav: elements.some(isNav), hasFooter: elements.some(isFooter) };
}

/** One blocking issue per standard, listing every page that fails it. */
export function generateReviewerStandardIssues(audits: ReviewerPageAudit[]): ValidationIssue[] {
	const byPath = new Map(audits.map((audit) => [audit.path, audit]));
	const home = byPath.get('/');
	const notFound = byPath.get('/404');
	const pages = new Map<ReviewerStandardId, Array<{ url: string; detail: string }>>();
	const add = (id: ReviewerStandardId, url: string, detail: string) => pages.set(id, [...(pages.get(id) ?? []), { url, detail }]);

	for (const audit of byPath.values()) {
		for (const [id, detail] of Object.entries(audit.findings) as Array<[ReviewerStandardId, string]>) add(id, audit.url, detail);
	}
	if (home && notFound) {
		const missing = [...(home.hasNav && !notFound.hasNav ? ['navbar'] : []), ...(home.hasFooter && !notFound.hasFooter ? ['footer'] : [])];
		if (missing.length) add('404-navigation', notFound.url, `no ${missing.join(' or ')}, but the home page has one`);
	}

	return (Object.keys(STANDARDS) as ReviewerStandardId[]).flatMap((id) => {
		const failing = pages.get(id);
		if (!failing?.length) return [];
		const standard = STANDARDS[id];
		return [
			{
				id,
				category: CATEGORY,
				severity: 'error' as const,
				message: standard.message(failing.length),
				description: standard.description,
				howToFix: standard.howToFix,
				details: { pages: failing }
			}
		];
	});
}

function formMessagesDetail(elements: Node[]): string | null {
	let success = 0;
	let error = 0;
	for (const form of elements.filter((el) => el.name === 'form')) {
		const container = ancestors(form).find((el) => classes(el).includes('w-form')) ?? form.parent ?? form;
		const content = normalize(text(container)).toLowerCase();
		if (content.includes(DEFAULT_SUCCESS)) success++;
		if (content.includes(DEFAULT_ERROR)) error++;
	}
	const parts = [
		...(success ? [`default success message on ${success} form(s)`] : []),
		...(error ? [`default error message on ${error} form(s)`] : [])
	];
	return parts.length ? parts.join(', ') : null;
}

function formNamesDetail(elements: Node[]): string | null {
	const names: string[] = [];
	for (const el of elements) {
		const isForm = el.name === 'form';
		// The password page's own input is platform markup (data-name "field" on every site); its form name is the creator's.
		const isField =
			FIELD_TAGS.has(el.name ?? '') &&
			!NON_FIELD_INPUT_TYPES.has((attr(el, 'type') || 'text').toLowerCase()) &&
			!classes(el).includes('w-password-page');
		if (!isForm && !isField) continue;
		const value = [attr(el, 'data-name'), attr(el, 'name')].find((name) => DEFAULT_NAME.test(name.trim()));
		if (value) names.push(`${isForm ? 'form' : 'field'} "${value.trim()}"`);
	}
	const unique = [...new Set(names)];
	return unique.length ? unique.join(', ') : null;
}

function videoControlsDetail(elements: Node[]): string | null {
	const isControl = (el: Node) =>
		el.attribs?.['data-w-bg-video-control'] !== undefined || classes(el).includes('w-backgroundvideo-backgroundvideoplaypausebutton');
	let background = 0;
	let other = 0;
	for (const el of elements) {
		// Webflow puts the play/pause button inside the Background Video element.
		if (classes(el).includes('w-background-video')) {
			if (!descendants(el).some(isControl)) background++;
		} else if (
			el.name === 'video' &&
			el.attribs?.autoplay !== undefined &&
			el.attribs?.controls === undefined &&
			!ancestors(el).some((parent) => classes(parent).includes('w-background-video'))
		) {
			other++;
		}
	}
	const parts = [
		...(background ? [`${background} background video(s) without a play/pause button`] : []),
		...(other ? [`${other} autoplay video(s) without controls`] : [])
	];
	return parts.length ? parts.join(', ') : null;
}

function licensesLinkDetail(elements: Node[], pageUrl: URL): string | null {
	const links = elements.filter((el) => el.name === 'a' && isLicensesHref(attr(el, 'href'), pageUrl));
	if (links.some((link) => ancestors(link).some(isFooter))) return null;
	const hasFooter = elements.some(isFooter);
	if (!hasFooter && links.length > 0) return null; // No footer found, so its placement cannot be judged.
	return hasFooter ? 'the footer has no Licenses link' : 'no footer and no Licenses link found';
}

function faviconDetail(elements: Node[], pageUrl: URL): string | null {
	const icons = elements.filter((el) => el.name === 'link' && /\bicon\b/i.test(attr(el, 'rel')));
	if (icons.length === 0) return 'no favicon or webclip link';
	const defaults = icons.flatMap((el) => {
		const path = pathnameOf(attr(el, 'href'), pageUrl);
		return path && DEFAULT_ICON_PATH.test(path) ? [path.split('/').pop()!] : [];
	});
	return defaults.length ? `Webflow default ${[...new Set(defaults)].join(' and ')}` : null;
}

function trademarksDetail(elements: Node[], root: Node): string | null {
	const body = elements.find((el) => el.name === 'body') ?? root;
	const content = normalize(text(body));
	const count = content.match(/[®™]/g)?.length ?? 0;
	if (count === 0) return null;
	const index = content.search(/[®™]/);
	const sample = content.slice(Math.max(0, index - 30), index + 10).trim();
	return `${count} symbol(s), for example "…${sample}…"`;
}

function descendants(node: Node): Node[] {
	const out: Node[] = [];
	const walk = (parent: Node) => {
		for (const child of parent.children ?? []) {
			if (child.name) out.push(child);
			walk(child);
		}
	};
	walk(node);
	return out;
}

function ancestors(node: Node): Node[] {
	const out: Node[] = [];
	for (let parent = node.parent; parent; parent = parent.parent) out.push(parent);
	return out;
}

/** Text a visitor could read, without script, style, SVG, or head content. CSS-hidden text is included. */
function text(node: Node): string {
	if (node.type === 'text') return node.data ?? '';
	if (node.name && NO_TEXT_TAGS.has(node.name)) return '';
	return (node.children ?? []).map(text).join(' ');
}

function attr(node: Node, name: string): string {
	return node.attribs?.[name] ?? '';
}

function classes(node: Node): string[] {
	return attr(node, 'class').split(/\s+/).filter(Boolean);
}

function normalize(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

function isNav(node: Node): boolean {
	return node.name === 'nav' || attr(node, 'role') === 'navigation' || classes(node).includes('w-nav');
}

/** Same footer rule as the template-preflight skill: a footer element, role contentinfo, or a footer class or id token. */
function isFooter(node: Node): boolean {
	return node.name === 'footer' || attr(node, 'role') === 'contentinfo' || FOOTER_TOKEN.test(`${attr(node, 'class')} ${attr(node, 'id')}`);
}

function isLicensesHref(href: string, pageUrl: URL): boolean {
	try {
		const url = new URL(href, pageUrl);
		return url.origin === pageUrl.origin && url.pathname.replace(/\/+$/, '') === LICENSES_PATH;
	} catch {
		return false;
	}
}

function pathnameOf(href: string, base: URL): string | null {
	try {
		return new URL(href, base).pathname;
	} catch {
		return null;
	}
}
