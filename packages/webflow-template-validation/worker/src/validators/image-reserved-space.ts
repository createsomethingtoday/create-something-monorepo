/**
 * Does the published CSS reserve an image's space before the image loads?
 *
 * The image size check exists to stop layout shift. Width and height
 * attributes are one way to reserve the space; CSS is the other. The Designer
 * API cannot write the attributes (width and height are reserved attribute
 * names), so a creator whose classes already fix the image size would
 * otherwise type the same numbers into every image by hand.
 *
 * This is a static read of the cascade, not a layout engine. It answers yes
 * only when the declarations that apply to the image settle the question:
 *
 *   - a definite width and a definite height, or
 *   - an aspect ratio with a definite width or height, or
 *   - position absolute or fixed (the image is out of flow and cannot move
 *     other content).
 *
 * A percentage height counts only when an ancestor gives it something to
 * resolve against. A percentage width counts only when its container does not
 * take its own width from its content. Variables are resolved from :root,
 * html and body. Anything the read cannot settle (flex or grid stretch,
 * heights that come from content, variables set per element) answers no, and
 * the image then needs the attributes as before.
 *
 * Checked against Chrome with image downloads held pending (4 templates, 6
 * pages, 376 images, 1440px and 375px): no image passed here that changed
 * size on load; 15 that kept their size were not passed.
 */

import { parseDocument } from 'htmlparser2';
import { compile } from 'css-select';
import { parse as parseSelector, type Selector } from 'css-what';

/** The subset of a domhandler element this module reads. */
export interface StyledNode {
	type: string;
	name?: string;
	attribs?: Record<string, string>;
	children?: StyledNode[];
	parent?: StyledNode | null;
	data?: string;
}

type Property =
	| 'width'
	| 'height'
	| 'aspect-ratio'
	| 'position'
	| 'display'
	| 'float'
	| 'flex'
	| 'flex-grow'
	| 'flex-direction'
	| 'flex-flow';
const PROPERTIES: ReadonlySet<string> = new Set([
	'width',
	'height',
	'aspect-ratio',
	'position',
	'display',
	'float',
	'flex',
	'flex-grow',
	'flex-direction',
	'flex-flow'
]);
/** Elements that are inline unless a rule says otherwise; an inline box shrinks to its content. */
const INLINE_TAGS = new Set(['a', 'span', 'picture', 'label', 'em', 'strong', 'b', 'i', 'small', 'button', 'u', 's', 'sub', 'sup', 'abbr', 'cite', 'code', 'mark', 'q', 'time']);
const MAX_PERCENT_WIDTH_DEPTH = 8;

interface Declaration {
	value: string;
	important: boolean;
}

interface StyleRule {
	matches: (node: StyledNode) => boolean;
	/** Classes and tag the subject of the selector must have; a cheap test before `matches`. */
	subjectClasses: string[];
	subjectTag: string | null;
	specificity: number;
	declarations: Partial<Record<Property, Declaration>>;
	/** The enclosing @media or @container conditions, or null for rules that always apply. */
	condition: string | null;
	order: number;
}

export interface PageStyles {
	rules: StyleRule[];
	/** Custom properties set on :root, html or body. */
	variables: Record<string, string>;
	/** null (no condition) first, then each distinct @media or @container condition. */
	conditions: Array<string | null>;
}

/** Selectors that depend on visitor interaction; their declarations are not the resting layout. */
const STATE_PSEUDOS = new Set(['hover', 'focus', 'active', 'visited', 'focus-within', 'focus-visible', 'target', 'checked']);
const COMBINATORS = new Set(['descendant', 'child', 'sibling', 'adjacent', 'parent', 'column-combinator']);
const NOT_DEFINITE = /^(auto|initial|inherit|unset|revert|revert-layer|none|normal|stretch|min-content|max-content|fit-content|-webkit-fill-available|-moz-available)$/;
const MAX_STYLESHEETS_PER_PAGE = 6;
const MAX_STYLESHEET_BYTES = 4 * 1024 * 1024;
const MAX_PERCENT_HEIGHT_DEPTH = 4;
const SHEET_CACHE_LIMIT = 16;

interface ParsedSheet {
	rules: Array<Omit<StyleRule, 'order'>>;
	variables: Record<string, string>;
}
const MAX_VARIABLE_DEPTH = 8;
const sheetCache = new Map<string, Promise<ParsedSheet | null>>();

export type StylesheetFetcher = (url: string) => Promise<string | null>;

/**
 * Read the stylesheets a page uses. Returns null when one of the site's own
 * stylesheets cannot be read; the caller then judges images on their
 * attributes alone.
 */
export async function loadPageStyles(
	rawHtml: string,
	pageUrl: string,
	fetcher: StylesheetFetcher = fetchStylesheet
): Promise<PageStyles | null> {
	const sources = collectStyleSources(parseDocument(rawHtml) as unknown as StyledNode, pageUrl);
	const sheets: ParsedSheet[] = [];
	let linked = 0;

	for (const source of sources) {
		if (source.kind === 'inline') {
			sheets.push(parseStylesheet(source.css));
			continue;
		}
		if (linked >= MAX_STYLESHEETS_PER_PAGE) return null;
		linked += 1;
		const sheet = await cachedSheet(source.url, fetcher);
		if (!sheet) return null;
		sheets.push(sheet);
	}

	const rules: StyleRule[] = [];
	const variables: Record<string, string> = {};
	const conditions = new Set<string>();
	let order = 0;
	for (const sheet of sheets) {
		Object.assign(variables, sheet.variables);
		for (const rule of sheet.rules) {
			rules.push({ ...rule, order: order++ });
			if (rule.condition) conditions.add(rule.condition);
		}
	}
	return { rules, variables, conditions: [null, ...conditions] };
}

/** True when the cascade reserves the image's space in every condition the stylesheets define. */
export function imageSpaceReserved(img: StyledNode, styles: PageStyles): boolean {
	return styles.conditions.every((condition) => reservedIn(img, styles, condition));
}

function reservedIn(img: StyledNode, styles: PageStyles, condition: string | null): boolean {
	const style = cascade(img, styles, condition, true);
	const position = style.position?.trim().toLowerCase();
	if (position === 'absolute' || position === 'fixed') return true;

	const hasWidth = widthIsDefinite(img, style.width, styles, condition);
	const hasHeight = heightIsDefinite(img, style.height, styles, condition, 0);
	if (hasWidth && hasHeight) return true;
	return isRatio(style['aspect-ratio']) && (hasWidth || hasHeight);
}

function heightIsDefinite(
	node: StyledNode,
	height: string | undefined,
	styles: PageStyles,
	condition: string | null,
	depth: number
): boolean {
	const kind = sizeKind(height);
	if (kind === 'length') return true;
	if (kind !== 'percent') return false;
	// A percentage height resolves only against a parent whose own height is settled.
	const parent = node.parent;
	if (!parent || parent.type !== 'tag' || depth >= MAX_PERCENT_HEIGHT_DEPTH) return false;
	const parentStyle = cascade(parent, styles, condition, false);
	if (isRatio(parentStyle['aspect-ratio'])) return true;
	return heightIsDefinite(parent, parentStyle.height, styles, condition, depth + 1);
}

/** A length is definite. A percentage is definite only when the box it resolves against does not take its width from its content. */
function widthIsDefinite(img: StyledNode, width: string | undefined, styles: PageStyles, condition: string | null): boolean {
	const kind = sizeKind(width);
	if (kind === 'length') return true;
	if (kind !== 'percent') return false;
	return containerWidthIsDefinite(img.parent, styles, condition, 0);
}

/**
 * Does this box get its width from outside (its own width, or by filling its
 * container) rather than from its content? Inline boxes, floats, positioned
 * boxes and flex items that do not grow all shrink to their content; an
 * unloaded image inside one has no width to take a percentage of.
 */
function containerWidthIsDefinite(
	node: StyledNode | null | undefined,
	styles: PageStyles,
	condition: string | null,
	depth: number
): boolean {
	if (!node || node.type !== 'tag' || node.name === 'body' || node.name === 'html') return true;
	if (depth >= MAX_PERCENT_WIDTH_DEPTH) return false;
	const style = cascade(node, styles, condition, false);
	const kind = sizeKind(style.width);
	if (kind === 'length') return true;

	const position = keyword(style.position);
	if (position === 'absolute' || position === 'fixed') return false;
	const float = keyword(style.float);
	if (float === 'left' || float === 'right') return false;
	const display = keyword(style.display) || (INLINE_TAGS.has(node.name ?? '') ? 'inline' : 'block');
	if (display.startsWith('inline') || display === 'contents' || display === 'none') return false;
	if (display.startsWith('table')) return false;

	const parent = node.parent;
	const parentStyle = parent && parent.type === 'tag' ? cascade(parent, styles, condition, false) : {};
	const parentDisplay = keyword(parentStyle.display);
	if (parentDisplay === 'flex' || parentDisplay === 'inline-flex') {
		const direction = `${parentStyle['flex-direction'] ?? ''} ${parentStyle['flex-flow'] ?? ''}`.toLowerCase();
		const rowAxis = !direction.includes('column');
		// In a row, an item is as wide as its content unless it has a width or grows.
		if (rowAxis && kind !== 'percent' && !flexGrows(style)) return false;
	}
	return containerWidthIsDefinite(parent, styles, condition, depth + 1);
}

function keyword(value: string | undefined): string {
	return (value ?? '').trim().toLowerCase();
}

function flexGrows(style: Partial<Record<Property, string>>): boolean {
	const grow = keyword(style['flex-grow']);
	if (grow) return parseFloat(grow) > 0;
	const flex = keyword(style.flex);
	if (!flex || flex === 'none' || flex === 'initial') return false;
	if (flex === 'auto') return true;
	return parseFloat(flex.split(/\s+/)[0]) > 0;
}

function sizeKind(value: string | undefined): 'none' | 'length' | 'percent' {
	const text = value?.trim().toLowerCase();
	if (!text || NOT_DEFINITE.test(text) || text.startsWith('fit-content(')) return 'none';
	return text.includes('%') ? 'percent' : 'length';
}

function isRatio(value: string | undefined): boolean {
	const text = value?.trim().toLowerCase();
	// "auto 16 / 9" still reserves 16 / 9 until the image loads.
	return !!text && !NOT_DEFINITE.test(text);
}

/** The winning value of each property for one element, with rules in `condition` layered over the unconditional ones. */
function cascade(
	node: StyledNode,
	styles: PageStyles,
	condition: string | null,
	useSizeAttributes: boolean
): Partial<Record<Property, string>> {
	const classes = new Set((node.attribs?.class ?? '').split(/\s+/).filter(Boolean));
	const winners: Partial<Record<Property, { value: string; rank: number[] }>> = {};
	const offer = (property: Property, value: string, rank: number[]) => {
		const current = winners[property];
		if (!current || compareRank(rank, current.rank) >= 0) winners[property] = { value, rank };
	};

	// Width and height attributes are presentational hints: below every author rule.
	if (useSizeAttributes) {
		for (const property of ['width', 'height'] as const) {
			const attribute = (node.attribs?.[property] ?? '').trim();
			if (/^[1-9]\d*$/.test(attribute)) offer(property, `${attribute}px`, [0, -1, 0]);
		}
	}

	for (const rule of styles.rules) {
		if (rule.condition !== null && rule.condition !== condition) continue;
		if (rule.subjectTag && rule.subjectTag !== node.name) continue;
		if (!rule.subjectClasses.every((name) => classes.has(name))) continue;
		if (!rule.matches(node)) continue;
		for (const [property, declaration] of Object.entries(rule.declarations) as Array<[Property, Declaration]>) {
			offer(property, declaration.value, [declaration.important ? 1 : 0, rule.specificity, rule.order]);
		}
	}

	for (const [property, declaration] of Object.entries(parseDeclarations(node.attribs?.style ?? '')) as Array<[Property, Declaration]>) {
		offer(property, declaration.value, [declaration.important ? 1 : 0, Number.MAX_SAFE_INTEGER, 0]);
	}

	const out: Partial<Record<Property, string>> = {};
	for (const [property, winner] of Object.entries(winners)) {
		out[property as Property] = resolveVariables(winner.value, styles.variables, 0);
	}
	return out;
}

/**
 * Replace var() with the value set on :root, html or body. A variable the
 * read cannot resolve (set per element, or per variable mode) leaves the
 * value not definite: "auto".
 */
function resolveVariables(value: string, variables: Record<string, string>, depth: number): string {
	if (!value.includes('var(')) return value;
	if (depth >= MAX_VARIABLE_DEPTH) return 'auto';
	let unresolved = false;
	let out = '';
	let index = 0;
	while (index < value.length) {
		const start = value.indexOf('var(', index);
		if (start === -1) {
			out += value.slice(index);
			break;
		}
		out += value.slice(index, start);
		let level = 0;
		let end = -1;
		for (let i = start + 3; i < value.length; i += 1) {
			if (value[i] === '(') level += 1;
			else if (value[i] === ')') {
				level -= 1;
				if (level === 0) {
					end = i;
					break;
				}
			}
		}
		if (end === -1) return 'auto';
		const inner = value.slice(start + 4, end);
		const comma = scanToWithBrackets(inner, 0);
		const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
		const fallback = comma === -1 ? null : inner.slice(comma + 1).trim();
		const found = variables[name] ?? fallback;
		if (found === null || found === undefined || found === '') {
			unresolved = true;
			break;
		}
		out += resolveVariables(found, variables, depth + 1);
		index = end + 1;
	}
	return unresolved ? 'auto' : out.trim();
}

function compareRank(a: number[], b: number[]): number {
	for (let i = 0; i < a.length; i += 1) {
		if (a[i] !== b[i]) return a[i] - b[i];
	}
	return 0;
}

// ---------------------------------------------------------------------------
// Stylesheet sources
// ---------------------------------------------------------------------------

type StyleSource = { kind: 'inline'; css: string } | { kind: 'link'; url: string };

function collectStyleSources(root: StyledNode, pageUrl: string): StyleSource[] {
	const sources: StyleSource[] = [];
	const walk = (parent: StyledNode) => {
		for (const child of parent.children ?? []) {
			if (child.name === 'template' || child.name === 'noscript') continue;
			if (child.name === 'style') {
				const media = (child.attribs?.media ?? '').trim().toLowerCase();
				if (media && media !== 'all' && media !== 'screen') continue;
				sources.push({ kind: 'inline', css: (child.children ?? []).map((node) => node.data ?? '').join('') });
				continue;
			}
			if (child.name === 'link' && /\bstylesheet\b/i.test(child.attribs?.rel ?? '') && child.attribs?.href) {
				const media = (child.attribs.media ?? '').trim().toLowerCase();
				const url = resolveSiteStylesheet(child.attribs.href, pageUrl);
				if (url && (!media || media === 'all' || media === 'screen')) sources.push({ kind: 'link', url });
				continue;
			}
			walk(child);
		}
	};
	walk(root);
	return sources;
}

/** Stylesheets the template controls: the page's origin and Webflow's asset hosts. Font and widget CSS from other hosts cannot size template images. */
function resolveSiteStylesheet(href: string, pageUrl: string): string | null {
	try {
		const url = new URL(href, pageUrl);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
		const host = url.hostname.toLowerCase();
		const ownHost = host === new URL(pageUrl).hostname.toLowerCase();
		const webflowHost = /(^|\.)(website-files\.com|webflow\.com|webflow\.io)$/.test(host);
		return ownHost || webflowHost ? url.toString() : null;
	} catch {
		return null;
	}
}

function cachedSheet(url: string, fetcher: StylesheetFetcher): Promise<ParsedSheet | null> {
	const cached = sheetCache.get(url);
	if (cached) return cached;
	const pending = fetcher(url)
		.then((css) => (css === null ? null : parseStylesheet(css)))
		.catch(() => null);
	sheetCache.set(url, pending);
	// A failed read must not stick: the next run tries again.
	void pending.then((sheet) => {
		if (!sheet && sheetCache.get(url) === pending) sheetCache.delete(url);
	});
	if (sheetCache.size > SHEET_CACHE_LIMIT) {
		const oldest = sheetCache.keys().next().value;
		if (oldest !== undefined) sheetCache.delete(oldest);
	}
	return pending;
}

async function fetchStylesheet(url: string): Promise<string | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10_000);
	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: { 'User-Agent': 'WebflowWayValidator/1.0' },
			cf: { cacheTtl: 60, cacheEverything: true }
		} as RequestInit);
		if (!response.ok) return null;
		const css = await response.text();
		return css.length > MAX_STYLESHEET_BYTES ? null : css;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/** Test hook: forget fetched stylesheets. */
export function clearStylesheetCache(): void {
	sheetCache.clear();
}

// ---------------------------------------------------------------------------
// CSS parsing: only what the size question needs
// ---------------------------------------------------------------------------

/** Rules that set width, height, aspect-ratio or position, with the @media or @container conditions around them. */
export function parseStylesheet(css: string): ParsedSheet {
	const sheet: ParsedSheet = { rules: [], variables: {} };
	readRules(css.replace(/\/\*[\s\S]*?\*\//g, ''), null, sheet);
	return sheet;
}

function readRules(css: string, condition: string | null, out: ParsedSheet): void {
	let index = 0;
	while (index < css.length) {
		const open = scanTo(css, index, '{', ';');
		if (open === -1) return;
		const prelude = css.slice(index, open).trim();
		if (css[open] === ';') {
			index = open + 1;
			continue;
		}
		const close = matchingBrace(css, open);
		if (close === -1) return;
		const body = css.slice(open + 1, close);
		index = close + 1;

		if (prelude.startsWith('@')) {
			const name = /^@([\w-]+)/.exec(prelude)?.[1]?.toLowerCase() ?? '';
			const params = prelude.slice(name.length + 1).trim().replace(/\s+/g, ' ');
			if (name === 'media' || name === 'container') {
				// "all" and "screen" always apply to the pages the validator reads.
				const always = name === 'media' && /^(all|screen)$/i.test(params);
				readRules(body, always ? condition : [condition, `@${name} ${params}`].filter(Boolean).join(' and '), out);
			} else if (name === 'supports' || name === 'layer') {
				readRules(body, condition, out);
			}
			// @font-face, @keyframes, @page and the rest cannot size an image.
			continue;
		}

		const selectors = prelude ? splitSelectors(prelude) : [];
		if (condition === null && selectors.some((selector) => /^(:root|html|body)$/i.test(selector))) {
			Object.assign(out.variables, parseCustomProperties(body));
		}
		const declarations = parseDeclarations(body);
		if (Object.keys(declarations).length === 0) continue;
		for (const selector of selectors) {
			const compiled = compileSelector(selector);
			if (compiled) out.rules.push({ ...compiled, declarations, condition });
		}
	}
}

/** Next unquoted, unparenthesised occurrence of one of `targets` at or after `from`. */
function scanTo(css: string, from: number, ...targets: string[]): number {
	let depth = 0;
	for (let i = from; i < css.length; i += 1) {
		const char = css[i];
		if (char === '"' || char === "'") {
			i = skipString(css, i);
		} else if (char === '(') {
			depth += 1;
		} else if (char === ')') {
			depth = Math.max(0, depth - 1);
		} else if (depth === 0 && targets.includes(char)) {
			return i;
		}
	}
	return -1;
}

function skipString(css: string, start: number): number {
	const quote = css[start];
	for (let i = start + 1; i < css.length; i += 1) {
		if (css[i] === '\\') i += 1;
		else if (css[i] === quote) return i;
	}
	return css.length;
}

function matchingBrace(css: string, open: number): number {
	let depth = 0;
	for (let i = open; i < css.length; i += 1) {
		const char = css[i];
		if (char === '"' || char === "'") i = skipString(css, i);
		else if (char === '{') depth += 1;
		else if (char === '}') {
			depth -= 1;
			if (depth === 0) return i;
		}
	}
	return -1;
}

function parseDeclarations(body: string): Partial<Record<Property, Declaration>> {
	const out: Partial<Record<Property, Declaration>> = {};
	let index = 0;
	while (index < body.length) {
		const end = scanTo(body, index, ';', '{');
		const stop = end === -1 ? body.length : end;
		if (end !== -1 && body[end] === '{') {
			// A nested rule: its declarations belong to another selector.
			const close = matchingBrace(body, end);
			index = close === -1 ? body.length : close + 1;
			continue;
		}
		const piece = body.slice(index, stop);
		index = stop + 1;
		const colon = piece.indexOf(':');
		if (colon === -1) continue;
		const property = piece.slice(0, colon).trim().toLowerCase();
		if (!PROPERTIES.has(property)) continue;
		const raw = piece.slice(colon + 1).trim();
		const important = /!\s*important\s*$/i.test(raw);
		const value = raw.replace(/!\s*important\s*$/i, '').trim();
		if (!value) continue;
		const current = out[property as Property];
		if (!current || important || !current.important) out[property as Property] = { value, important };
	}
	return out;
}

function parseCustomProperties(body: string): Record<string, string> {
	const out: Record<string, string> = {};
	let index = 0;
	while (index < body.length) {
		const end = scanTo(body, index, ';', '{');
		const stop = end === -1 ? body.length : end;
		if (end !== -1 && body[end] === '{') {
			const close = matchingBrace(body, end);
			index = close === -1 ? body.length : close + 1;
			continue;
		}
		const piece = body.slice(index, stop);
		index = stop + 1;
		const colon = piece.indexOf(':');
		if (colon === -1) continue;
		const name = piece.slice(0, colon).trim();
		if (name.startsWith('--')) out[name] = piece.slice(colon + 1).trim();
	}
	return out;
}

function splitSelectors(prelude: string): string[] {
	const parts: string[] = [];
	let index = 0;
	while (index <= prelude.length) {
		const comma = scanToWithBrackets(prelude, index);
		const stop = comma === -1 ? prelude.length : comma;
		const part = prelude.slice(index, stop).trim();
		if (part) parts.push(part);
		if (comma === -1) break;
		index = comma + 1;
	}
	return parts;
}

/** Next top-level comma: outside quotes, parentheses and attribute brackets. */
function scanToWithBrackets(text: string, from: number): number {
	let depth = 0;
	for (let i = from; i < text.length; i += 1) {
		const char = text[i];
		if (char === '"' || char === "'") i = skipString(text, i);
		else if (char === '(' || char === '[') depth += 1;
		else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
		else if (char === ',' && depth === 0) return i;
	}
	return -1;
}

function compileSelector(selector: string): Pick<StyleRule, 'matches' | 'subjectClasses' | 'subjectTag' | 'specificity'> | null {
	let tokens: Selector[];
	try {
		const parsed = parseSelector(selector);
		if (parsed.length !== 1) return null;
		tokens = parsed[0];
	} catch {
		return null;
	}
	if (tokens.some((token) => token.type === 'pseudo-element')) return null;
	if (tokens.some((token) => token.type === 'pseudo' && STATE_PSEUDOS.has(token.name))) return null;

	let lastCombinator = -1;
	tokens.forEach((token, index) => {
		if (COMBINATORS.has(token.type)) lastCombinator = index;
	});
	const subject = tokens.slice(lastCombinator + 1);
	const subjectClasses = subject.flatMap((token) =>
		token.type === 'attribute' && token.name === 'class' && token.action === 'element' ? [token.value] : []
	);
	const tag = subject.find((token) => token.type === 'tag');
	const subjectTag = tag && tag.type === 'tag' ? tag.name.toLowerCase() : null;

	try {
		const matches = compile<StyledNode, StyledNode>(selector) as (node: StyledNode) => boolean;
		return { matches, subjectClasses, subjectTag, specificity: specificity(tokens) };
	} catch {
		return null;
	}
}

/** Specificity as one number: ids, then classes/attributes/pseudo-classes, then tags. */
function specificity(tokens: Selector[]): number {
	let ids = 0;
	let classes = 0;
	let tags = 0;
	for (const token of tokens) {
		if (token.type === 'attribute') {
			if (token.name === 'id' && token.action === 'equals') ids += 1;
			else classes += 1;
		} else if (token.type === 'tag') {
			tags += 1;
		} else if (token.type === 'pseudo') {
			if (token.name === 'where') continue;
			if (Array.isArray(token.data) && (token.name === 'not' || token.name === 'is' || token.name === 'has' || token.name === 'matches')) {
				const inner = Math.max(0, ...token.data.map((list) => specificity(list)));
				ids += Math.floor(inner / 1_000_000);
				classes += Math.floor((inner % 1_000_000) / 1_000);
				tags += inner % 1_000;
			} else {
				classes += 1;
			}
		}
	}
	return ids * 1_000_000 + Math.min(classes, 999) * 1_000 + Math.min(tags, 999);
}
