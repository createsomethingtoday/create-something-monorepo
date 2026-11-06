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
export interface MarkupNode {
	type: string;
	name?: string;
	attribs?: Record<string, string>;
	children?: Node[];
	parent?: Node | null;
	data?: string;
}

type Node = MarkupNode;

interface Standard {
	message: (pageCount: number) => string;
	description: string;
	howToFix: string;
}

const CATEGORY = 'Content & Accessibility';
const LICENSES_BOILERPLATE =
	"All graphical assets in this template are licensed for personal and commercial use. If you'd like to use a specific asset, please check the license below.";

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
	'licenses-link': {
		message: (n) => `The Licenses page is not linked from the footer or navigation on ${n} page(s)`,
		description: 'Link the Licenses page from the footer or a utility navigation, so buyers can find it from every page.',
		howToFix: 'Add a Licenses link to the footer component (or the navbar\'s utility menu) so it shows on every page.'
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
	},
	'self-promotion': {
		message: (n) => `Links promote the creator or other templates on ${n} page(s)`,
		description: 'Buyers publish the template as their own site, so "Buy template", "Get template" and "More templates" links ship to their visitors. One "Designed by" credit in the footer is allowed.',
		howToFix: 'Remove buy, get and more-templates links and links to template stores. Keep at most one "Designed by" credit in the footer.'
	},
	'licenses-boilerplate': {
		message: () => 'The Licenses page is missing the required opening text',
		description: `The Licenses page must start with this exact text: "${LICENSES_BOILERPLATE}"`,
		howToFix: 'Paste the exact text at the top of the Licenses page, then list each asset with its license link.'
	},
	'gsap-instructions-page': {
		message: () => 'GSAP is used in custom code, but there is no Instructions page',
		description: 'When custom code uses GSAP, buyers need an Instructions page at /instructions with a "How to Edit GSAP Animations" section.',
		howToFix: 'Create a page at /instructions with a "How to Edit GSAP Animations" section that lists the animated selectors and how to change or remove them.'
	}
};

const DEFAULT_SUCCESS = 'thank you! your submission has been received!';
const DEFAULT_ERROR = 'oops! something went wrong while submitting the form';
const DEFAULT_NAME = /^(?:field(?:[- ]\d+)?|email[- ]form(?:[- ]\d+)?|name[- ]\d+|form[- ]\d+)$/i;
const FIELD_TAGS = new Set(['input', 'select', 'textarea']);
const NON_FIELD_INPUT_TYPES = new Set(['hidden', 'submit', 'reset', 'button', 'image']);
const FOOTER_TOKEN = /(?:^|[\s_-])footer(?:$|[\s_-])/i;
const DEFAULT_ICON_PATHS = { favicon: '/img/favicon.ico', webclip: '/img/webclip.png' } as const;
const NO_TEXT_TAGS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head']);
const INERT_TAGS = new Set(['template', 'noscript']);
const BLOCK_TAGS = new Set([
	'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'details', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
	'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section',
	'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
]);
const LICENSES_PATH = '/licenses';
const INSTRUCTIONS_PATH = '/instructions';
/** Calls to buy, get or see more templates (guideline layout-and-content-18). Matched only on links that leave the site. */
const PROMO_LINK_TEXT = /\b(?:buy|get|purchase)\b[^.]{0,20}\btemplates?\b|\b(?:more|all|other|browse|explore)\b[^.]{0,12}\btemplates\b/i;
const TEMPLATE_STORE_HOST = /(?:^|\.)(?:gumroad\.com|lemonsqueezy\.com|themeforest\.net|creativemarket\.com|ui8\.net|templatemonster\.com|envato\.com)$/i;
/** GSAP called from inline custom code. Webflow's own GSAP-powered Interactions do not write these calls inline. */
const CUSTOM_GSAP_CALL = /\bgsap\.(?:to|from|fromTo|timeline|set|registerPlugin|matchMedia|context)\s*\(|\bScrollTrigger\.(?:create|batch)\s*\(/;
/** Utility pages: the guideline asks for the link on the site's pages, and the 404 page has its own navbar/footer check. */
const NO_LICENSES_LINK_PATHS = new Set(['/401', '/404', '/licenses', '/changelog', '/style-guide', '/styleguide', '/instructions']);

/** Paths the content crawl may not reach but the standards need. */
export const REVIEWER_UTILITY_PATHS = ['/404', '/401', LICENSES_PATH, INSTRUCTIONS_PATH];

/** Audit one published page. Returns null for an empty document. */
export function auditReviewerStandards(html: string, pageUrl: string): ReviewerPageAudit | null {
	if (!html || !html.trim()) return null;
	const url = new URL(pageUrl);
	const path = url.pathname.replace(/\/+$/, '') || '/';
	const root = parseDocument(html) as unknown as Node;
	const elements = renderedDescendants(root);
	const findings: ReviewerPageAudit['findings'] = {};
	const record = (id: ReviewerStandardId, detail: string | null) => {
		if (detail) findings[id] = detail;
	};

	record('form-default-messages', formMessagesDetail(elements));
	record('form-default-names', formNamesDetail(elements));
	record('video-play-pause', videoControlsDetail(elements));
	if (!NO_LICENSES_LINK_PATHS.has(path)) record('licenses-link', licensesLinkDetail(elements, url));
	if (path === '/') record('default-favicon', faviconDetail(elements, url));
	if (path !== LICENSES_PATH) record('trademark-symbols', trademarksDetail(elements, root));
	record('self-promotion', selfPromotionDetail(elements, url));
	if (path === LICENSES_PATH) record('licenses-boilerplate', licensesBoilerplateDetail(elements, root));

	return {
		url: url.href,
		path,
		findings,
		hasNav: elements.some(isNav),
		hasFooter: elements.some(isFooter),
		usesCustomGsap: elements.some(
			(el) => el.name === 'script' && !attr(el, 'src') && CUSTOM_GSAP_CALL.test(withoutCommentsAndStrings(rawText(el)))
		)
	};
}

/**
 * One blocking issue per standard, listing every page that fails it.
 * missingPaths: utility paths the site answered with HTTP 404 (known only on a full-site run).
 */
export function generateReviewerStandardIssues(audits: ReviewerPageAudit[], context: { missingPaths?: string[] } = {}): ValidationIssue[] {
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
	if (context.missingPaths?.includes(INSTRUCTIONS_PATH) && !byPath.has(INSTRUCTIONS_PATH)) {
		for (const audit of byPath.values()) {
			if (audit.usesCustomGsap) add('gsap-instructions-page', audit.url, 'GSAP calls in inline custom code; /instructions was not found');
		}
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
			if (!renderedDescendants(el).some(isControl)) background++;
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

/** Guideline required-pages-07: link Licenses from the footer or a utility navigation. */
function licensesLinkDetail(elements: Node[], pageUrl: URL): string | null {
	const links = elements.filter((el) => el.name === 'a' && isLicensesHref(attr(el, 'href'), pageUrl));
	if (links.some((link) => ancestors(link).some((parent) => isFooter(parent) || isNav(parent)))) return null;
	const hasChrome = elements.some((el) => isFooter(el) || isNav(el));
	if (!hasChrome && links.length > 0) return null; // No footer or navbar found, so the link's placement cannot be judged.
	return links.length > 0 ? 'Licenses is linked, but not from the footer or navigation' : 'no Licenses link on the page';
}

/** The favicon (rel "icon" or "shortcut icon") and the webclip (rel "apple-touch-icon") are checked separately. */
function faviconDetail(elements: Node[], pageUrl: URL): string | null {
	const links = elements.filter((el) => el.name === 'link');
	const rels = (el: Node) => attr(el, 'rel').toLowerCase().split(/\s+/);
	const problems = (Object.keys(DEFAULT_ICON_PATHS) as Array<keyof typeof DEFAULT_ICON_PATHS>).flatMap((kind) => {
		const found = links.filter((el) => rels(el).includes(kind === 'favicon' ? 'icon' : 'apple-touch-icon'));
		if (found.length === 0) return [`no ${kind}`];
		const isDefault = (el: Node) => pathnameOf(attr(el, 'href'), pageUrl)?.toLowerCase() === DEFAULT_ICON_PATHS[kind];
		return found.some(isDefault) ? [`Webflow default ${kind}`] : [];
	});
	return problems.length ? problems.join(' and ') : null;
}

/** Guideline layout-and-content-18: promotional links that leave the site, and links to template stores. */
function selfPromotionDetail(elements: Node[], pageUrl: URL): string | null {
	const found = new Set<string>();
	for (const link of elements.filter((el) => el.name === 'a')) {
		let target: URL;
		try {
			target = new URL(attr(link, 'href'), pageUrl);
		} catch {
			continue;
		}
		if (!/^https?:$/.test(target.protocol) || target.origin === pageUrl.origin) continue;
		const label = normalize(text(link));
		if (PROMO_LINK_TEXT.test(label) || TEMPLATE_STORE_HOST.test(target.hostname)) found.add(`"${label.slice(0, 40)}" → ${target.hostname}`);
	}
	return found.size ? [...found].slice(0, 3).join('; ') : null;
}

/** Guideline required-pages-10: the exact opening text, compared without case, spacing or quote-style differences. */
function licensesBoilerplateDetail(elements: Node[], root: Node): string | null {
	const body = elements.find((el) => el.name === 'body') ?? root;
	return comparable(text(body)).includes(comparable(LICENSES_BOILERPLATE)) ? null : 'the exact opening text was not found';
}

function comparable(value: string): string {
	return normalize(value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')).toLowerCase();
}

/** Raw text of a script element (its contents are not parsed as markup). */
function rawText(node: Node): string {
	return (node.children ?? []).map((child) => child.data ?? '').join('');
}

/**
 * JavaScript with comments removed and string and template literals emptied,
 * so a commented-out or quoted `gsap.to(...)` does not count as a call.
 */
function withoutCommentsAndStrings(code: string): string {
	let out = '';
	for (let i = 0; i < code.length; i++) {
		const char = code[i];
		const next = code[i + 1];
		if (char === '/' && next === '/') {
			while (i < code.length && code[i] !== '\n') i++;
			out += '\n';
		} else if (char === '/' && next === '*') {
			const end = code.indexOf('*/', i + 2);
			i = end === -1 ? code.length : end + 1;
			out += ' ';
		} else if (char === '"' || char === "'" || char === '`') {
			for (i++; i < code.length && code[i] !== char; i++) if (code[i] === '\\') i++;
			out += char + char;
		} else {
			out += char;
		}
	}
	return out;
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

/** Elements of an HTML document that a browser renders (template and noscript subtrees are skipped). */
export function parseRenderedElements(html: string): MarkupNode[] {
	return renderedDescendants(parseDocument(html) as unknown as Node);
}

/**
 * Element descendants a browser renders. Comments and script text are not
 * elements in the parsed tree; <template> content and <noscript> fallbacks
 * never render, so unused markup there cannot fail or satisfy a check.
 */
function renderedDescendants(node: Node): Node[] {
	const out: Node[] = [];
	const walk = (parent: Node) => {
		for (const child of parent.children ?? []) {
			if (!child.name || INERT_TAGS.has(child.name)) continue;
			out.push(child);
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

/**
 * Text a visitor could read, without script, style, SVG, or head content.
 * Inline elements join without a gap, as a browser renders them
 * ("specific <strong>asset</strong>, please" reads "specific asset, please");
 * block elements and <br> are separated by a space. CSS-hidden text is included.
 */
function text(node: Node): string {
	if (node.type === 'text') return node.data ?? '';
	if (node.name && NO_TEXT_TAGS.has(node.name)) return '';
	const inner = (node.children ?? []).map(text).join('');
	return node.name && BLOCK_TAGS.has(node.name) ? ` ${inner} ` : inner;
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
