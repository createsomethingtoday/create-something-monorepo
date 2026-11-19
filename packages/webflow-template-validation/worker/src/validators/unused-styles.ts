/**
 * Unused styles (guideline design-systems-21): classes and combo classes that
 * the published stylesheet defines but no published page uses. Reviewers ask
 * creators to run "Clean up" in the Style selectors panel for these.
 *
 * The Designer API cannot answer "is this style used anywhere on the site"
 * without switching through every page, so the check reads the published
 * site: every class selector in the site stylesheet against the class lists
 * of every element on every crawled page.
 *
 * This is not the Designer's "Clean up" list. Measured on 66 submitted
 * templates (2026-11-19), the Designer keeps some styles that no published
 * page uses, and it lists combo classes that have no CSS of their own, which
 * the published site cannot show. So a short list is a warning, and only a
 * list above UNUSED_STYLES_BLOCK_THRESHOLD blocks the submission.
 *
 * A class counts as used when a page script, an inline attribute or the
 * site's own JavaScript (which holds the interaction data) names it.
 */

import { parseDocument } from 'htmlparser2';
import type { ValidationIssue } from '../types';

interface Node {
	type: string;
	name?: string;
	attribs?: Record<string, string>;
	children?: Node[];
	data?: string;
}

/** Class lists and script text collected from every crawled page. */
export interface ClassUsage {
	/** Unique class lists, one per distinct `class` attribute value. */
	classLists: Map<string, string[]>;
	/** Every class seen on any element. */
	classes: Set<string>;
	/** Inline script text and other places that can name a class at runtime. */
	scriptText: string[];
	stylesheetUrls: Set<string>;
	/** The site's own Webflow JavaScript, which holds the interaction data. */
	scriptUrls: Set<string>;
	/** Raw `href` values of every link, so the caller can reach CMS item pages. */
	linkHrefs: Set<string>;
	/** Set by the caller when a page it meant to read did not load. */
	incomplete: boolean;
	pageCount: number;
}

export interface UnusedStyle {
	/** Class chain as the stylesheet writes it, for example "card is-dark". */
	name: string;
	classes: string[];
	isCombo: boolean;
}

export interface UnusedStylesResult {
	unused: UnusedStyle[];
	stylesChecked: number;
}

/** Fewer pages than this is not enough evidence to call a style unused. */
export const MIN_PAGES_FOR_UNUSED_STYLES = 2;
/**
 * More unused styles than this is an error. Of 47 templates that the Designer
 * called clean, 40 had 5 or fewer and 42 had 10 or fewer (2026-11-19).
 */
export const UNUSED_STYLES_BLOCK_THRESHOLD = 10;
const MAX_LISTED = 40;
const SITE_SCRIPT = /^https:\/\/(?:cdn\.prod\.website-files\.com|assets\.website-files\.com|assets-global\.website-files\.com|uploads-ssl\.webflow\.com)\/[0-9a-f]{24}\/js\/[^?#]+\.js(?:[?#].*)?$/i;
const SITE_STYLESHEET = /^https:\/\/(?:cdn\.prod\.website-files\.com|assets\.website-files\.com|assets-global\.website-files\.com|uploads-ssl\.webflow\.com)\/[^?#]+\.css(?:[?#].*)?$/i;

export function createClassUsage(): ClassUsage {
	return { classLists: new Map(), classes: new Set(), scriptText: [], stylesheetUrls: new Set(), scriptUrls: new Set(), linkHrefs: new Set(), incomplete: false, pageCount: 0 };
}

/** Add one page's elements, scripts and stylesheet links to the usage record. */
export function collectClassUsage(html: string, usage: ClassUsage): void {
	if (!html) return;
	usage.pageCount += 1;
	const stack: Node[] = [parseDocument(html) as unknown as Node];
	while (stack.length > 0) {
		const node = stack.pop()!;
		if (node.type === 'script') {
			if (SITE_SCRIPT.test(node.attribs?.src || '')) usage.scriptUrls.add(node.attribs!.src);
			// JSON data blocks cannot change a class list.
			const type = (node.attribs?.type || '').toLowerCase();
			if (!type.includes('json')) {
				const code = (node.children || []).map((child) => child.data || '').join('');
				if (code.trim()) usage.scriptText.push(code);
			}
		}
		const attribs = node.attribs;
		if (attribs) {
			const classValue = attribs.class;
			if (classValue && !usage.classLists.has(classValue)) {
				const list = classValue.split(/\s+/).filter(Boolean);
				usage.classLists.set(classValue, list);
				for (const name of list) usage.classes.add(name);
			}
			if (node.name === 'a' && attribs.href) usage.linkHrefs.add(attribs.href);
			if (node.name === 'link' && /\bstylesheet\b/i.test(attribs.rel || '') && SITE_STYLESHEET.test(attribs.href || '')) {
				usage.stylesheetUrls.add(attribs.href);
			}
			// Inline handlers and data attributes can name a class that a
			// script or an interaction adds later.
			for (const [name, value] of Object.entries(attribs)) {
				if (!value || name === 'class' || name === 'style' || name === 'href' || name === 'src' || name === 'srcset') continue;
				if (name.startsWith('on') || name.startsWith('data-')) usage.scriptText.push(value);
			}
		}
		if (node.children) for (const child of node.children) stack.push(child);
	}
}

/**
 * Every distinct class chain in the stylesheet's selectors, without Webflow's
 * own `w-` classes. `.card.is-dark:hover .title` yields "card is-dark" and
 * "title".
 */
export function extractStyleChains(css: string): Map<string, string[]> {
	const chains = new Map<string, string[]>();
	for (const selector of selectorsOf(css)) {
		for (const match of selector.matchAll(/(?:\.(?:\\[0-9a-fA-F]{1,6}\s?|\\.|[\w-]|[^\x00-\x7f])+)+/g)) {
			const all = match[0].split(/(?<!\\)\./).filter(Boolean).map(unescapeIdent);
			// State classes (w--current, w--open) are set by Webflow at runtime.
			const classes = [...new Set(all.filter((name) => !name.startsWith('w--')))];
			if (classes.length === 0 || classes.every(isPlatformClass)) continue;
			const key = [...classes].sort().join(' ');
			if (!chains.has(key)) chains.set(key, classes);
		}
	}
	return chains;
}

/**
 * @param siteScripts Text of the files in `usage.scriptUrls`, fetched by the caller.
 */
export function findUnusedStyles(css: string, usage: ClassUsage, siteScripts: string[] = []): UnusedStylesResult {
	const chains = extractStyleChains(css);
	// Every word a script holds. A class that a script names can be added at runtime.
	const scriptWords = new Set<string>();
	for (const code of [...usage.scriptText, ...siteScripts]) {
		for (const word of code.match(/[\w-]+/g) || []) scriptWords.add(word);
	}
	const isNamedInScript = (name: string): boolean => scriptWords.has(name);

	const lists = [...usage.classLists.values()];
	const unused: UnusedStyle[] = [];
	for (const classes of chains.values()) {
		const siteClasses = classes.filter((name) => !isPlatformClass(name));
		// A script can add any of these classes, so the chain may match at runtime.
		if (siteClasses.some(isNamedInScript)) continue;
		if (siteClasses.some((name) => !usage.classes.has(name))) {
			unused.push({ name: classes.join(' '), classes, isCombo: classes.length > 1 });
			continue;
		}
		if (classes.length === 1) continue;
		// Platform classes (w-form, w-button) come from the element type, so a
		// chain is used when one element carries all of its site classes.
		if (!lists.some((list) => siteClasses.every((name) => list.includes(name)))) {
			unused.push({ name: classes.join(' '), classes, isCombo: true });
		}
	}

	// A combo is only worth listing when its base class is in use; when the
	// base is unused, deleting the base removes the combo as well.
	const unusedSingles = new Set(unused.filter((style) => !style.isCombo).map((style) => style.classes[0]));
	const reported = unused.filter((style) => !style.isCombo || !style.classes.some((name) => unusedSingles.has(name)));
	reported.sort((a, b) => a.name.localeCompare(b.name));
	return { unused: reported, stylesChecked: chains.size };
}

/**
 * @param source `published` (default): the list comes from the published
 *   pages, and `pageCount` is the number of pages read. `designer`: the list
 *   comes from the Designer's site data (`designer-unused-styles.ts`), which
 *   is the list that the Clean up panel shows.
 */
export function generateUnusedStyleIssues(result: UnusedStylesResult, pageCount: number, source: 'published' | 'designer' = 'published'): ValidationIssue[] {
	if (result.unused.length === 0) return [];
	const names = result.unused.map((style) => style.classes.map((name) => `.${name}`).join(''));
	const listed = names.slice(0, MAX_LISTED);
	const more = names.length - listed.length;
	const list = `${listed.join(', ')}${more > 0 ? `, and ${more} more` : ''}`;
	const base = {
		id: 'unused-styles',
		category: 'Content & Accessibility',
		severity: names.length > UNUSED_STYLES_BLOCK_THRESHOLD ? 'error' : 'warning'
	} as const;
	if (source === 'designer') {
		return [{
			...base,
			message: `${names.length} style(s) are not used on any element`,
			description: `The Designer's "Clean up" list has these classes and combo classes. No element on a page or in a component uses them: ${list}.`,
			howToFix: 'Open the Style selectors panel, select "Clean up", and delete the unused styles. Then run the Validator again.',
			details: { unusedStyles: names, stylesChecked: result.stylesChecked, source }
		}];
	}
	return [{
		...base,
		message: `${names.length} style(s) are not used on any published page`,
		description: `These classes and combo classes are in the site's stylesheet, but no element on the ${pageCount} published page(s) uses them: ${list}. A style on an element that shows only in some states (an empty state, a pagination button) can be in this list.`,
		howToFix: 'Open the Style selectors panel, select "Clean up", and delete the unused styles. Then check this list for styles that Clean up kept, and remove the ones the template does not need. Publish the site and run the Validator again.',
		details: { unusedStyles: names, stylesChecked: result.stylesChecked, pagesChecked: pageCount, source }
	}];
}

/** Classes that Webflow's own CSS and widgets define (forms, maps, checkout fields). */
/**
 * CMS item pages that the crawl has not read: up to `perCollection` linked
 * pages for each parent path (`/blog/a` and `/blog/b` share `/blog`). A CMS
 * template has its own elements and styles, and only an item page shows them.
 * `truncated` is true when the limit left a wanted page out.
 */
export function uncrawledItemPages(usage: ClassUsage, siteUrl: string, crawledUrls: string[], perCollection = 2, limit = 30): { pages: string[]; truncated: boolean } {
	const site = new URL(siteUrl);
	const pathOf = (url: URL) => url.pathname.replace(/\/+$/, '') || '/';
	const crawled = new Set<string>();
	for (const url of crawledUrls) {
		try { crawled.add(pathOf(new URL(url, site))); } catch { /* not a URL */ }
	}
	const perParent = new Map<string, number>();
	for (const path of crawled) {
		const parent = path.slice(0, path.lastIndexOf('/'));
		if (parent) perParent.set(parent, (perParent.get(parent) || 0) + 1);
	}
	const pages: string[] = [];
	let truncated = false;
	for (const href of usage.linkHrefs) {
		let url: URL;
		try { url = new URL(href, site); } catch { continue; }
		const path = pathOf(url);
		const parent = path.slice(0, path.lastIndexOf('/'));
		if (url.origin !== site.origin || !parent || crawled.has(path) || /\.[a-z0-9]{2,5}$/i.test(path)) continue;
		const count = perParent.get(parent) || 0;
		if (count >= perCollection) continue;
		// A page that is wanted but does not fit leaves its collection unread.
		if (pages.length >= limit) { truncated = true; break; }
		perParent.set(parent, count + 1);
		crawled.add(path);
		pages.push(new URL(path, site).href);
	}
	return { pages, truncated };
}

function isPlatformClass(name: string): boolean {
	return name.startsWith('w-') || name.startsWith('wf-') || name.startsWith('-wfp-') || name.startsWith('gm-style');
}

/** Selectors of every style rule, including rules inside @media and @supports. */
function selectorsOf(css: string): string[] {
	const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
	const selectors: string[] = [];
	// Block kinds: true = holds rules (top level, @media), false = holds declarations.
	const stack: boolean[] = [true];
	let prelude = '';
	let quote = '';
	for (let i = 0; i < source.length; i++) {
		const char = source[i];
		if (quote) {
			if (char === '\\') { prelude += char + (source[i + 1] ?? ''); i++; continue; }
			if (char === quote) quote = '';
			prelude += char;
			continue;
		}
		if (char === '"' || char === "'") { quote = char; prelude += char; continue; }
		if (char === '{') {
			const head = prelude.trim();
			const holdsRules = stack[stack.length - 1];
			if (!holdsRules) {
				stack.push(false);
			} else if (head.startsWith('@')) {
				stack.push(/^@(?:media|supports|layer|container|document)\b/i.test(head));
			} else {
				if (head) selectors.push(...splitSelectorList(head));
				stack.push(false);
			}
			prelude = '';
			continue;
		}
		if (char === '}') {
			if (stack.length > 1) stack.pop();
			prelude = '';
			continue;
		}
		if (char === ';') { prelude = ''; continue; }
		prelude += char;
	}
	return selectors;
}

function splitSelectorList(head: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of head) {
		if (char === '(' || char === '[') depth++;
		else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
		if (char === ',' && depth === 0) { parts.push(current); current = ''; continue; }
		current += char;
	}
	parts.push(current);
	// Attribute values and strings can hold dots that are not class selectors.
	// A class inside :not() is one the element must not have, so it is not a
	// style the selector needs.
	return parts
		.map((part) => withoutNegations(part.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"|'[^']*'/g, '')).trim())
		.filter(Boolean);
}

/** Remove every `:not(...)`, with nested parentheses. */
function withoutNegations(selector: string): string {
	let result = '';
	for (let i = 0; i < selector.length; i++) {
		if (selector.startsWith(':not(', i)) {
			let depth = 0;
			for (i += 4; i < selector.length; i++) {
				if (selector[i] === '(') depth++;
				else if (selector[i] === ')' && --depth === 0) break;
			}
			continue;
		}
		result += selector[i];
	}
	return result;
}

function unescapeIdent(name: string): string {
	return name
		.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/\\(.)/g, '$1');
}
