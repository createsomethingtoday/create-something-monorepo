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
 * size on load; 16 that kept their size were not passed.
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
	| 'min-width'
	| 'max-width'
	| 'min-height'
	| 'max-height'
	| 'aspect-ratio'
	| 'position'
	| 'display'
	| 'float'
	| 'flex'
	| 'flex-grow'
	| 'flex-direction'
	| 'flex-flow'
	| 'all';
const PROPERTIES: ReadonlySet<string> = new Set([
	'width',
	'height',
	'min-width',
	'max-width',
	'min-height',
	'max-height',
	'aspect-ratio',
	'position',
	'display',
	'float',
	'flex',
	'flex-grow',
	'flex-direction',
	'flex-flow',
	// "all" resets every other property; the read does not model it, so a box that uses it settles nothing.
	'all'
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
	/** The cascade layer the rule is in, or null for unlayered rules. */
	layer: string | null;
	order: number;
}

export interface PageStyles {
	rules: StyleRule[];
	/** Custom properties set on :root, html or body. */
	variables: Record<string, string>;
	/** Custom properties also set somewhere else (another selector, a media query, an inline style); their global value may not apply. */
	overriddenVariables: ReadonlySet<string>;
	/** Sets of @media and @container conditions that can be active at the same time; the image must pass in each. */
	scenarios: Array<ReadonlySet<string>>;
	matched: WeakMap<StyledNode, StyleRule[]>;
	/** Position of each cascade layer; later layers win over earlier ones. */
	layerOrder: Map<string, number>;
}

/** Selectors that depend on visitor interaction; their declarations are not the resting layout. */
const STATE_PSEUDOS = new Set(['hover', 'focus', 'active', 'visited', 'focus-within', 'focus-visible', 'target', 'checked']);
const COMBINATORS = new Set(['descendant', 'child', 'sibling', 'adjacent', 'parent', 'column-combinator']);
const NOT_DEFINITE = /^(auto|initial|inherit|unset|revert|revert-layer|none|normal|stretch|min-content|max-content|fit-content|-webkit-fill-available|-moz-available)$/;
const SIZE_VALUE = /^(?:[+-]?\d*\.?\d+(?:px|r?em|v[wh]|vmin|vmax|[sld]v[wh]|ch|ex|cm|mm|in|pt|pc|%)|[+-]?0+(?:\.0+)?|(?:calc|min|max|clamp)\(.*\))$/;
/** Logical sizes, read as their physical side: templates are horizontal. */
const PROPERTY_ALIASES: Record<string, string> = {
	'inline-size': 'width', 'block-size': 'height',
	'min-inline-size': 'min-width', 'max-inline-size': 'max-width',
	'min-block-size': 'min-height', 'max-block-size': 'max-height'
};
/** These constraints can take their size from the image's pixels once it loads. */
const INTRINSIC_SIZE = /\b(?:min-content|max-content|fit-content|content|contain)\b/i;
const SIZE_CONSTRAINTS = ['min-width', 'max-width', 'min-height', 'max-height'] as const;
const MAX_STYLESHEETS_PER_PAGE = 6;
const MAX_STYLESHEET_BYTES = 4 * 1024 * 1024;
const MAX_PERCENT_HEIGHT_DEPTH = 4;
const SHEET_CACHE_LIMIT = 16;

interface ParsedSheet {
	rules: Array<Omit<StyleRule, 'order'>>;
	/** Custom properties set on :root, html or body outside any condition. */
	variables: Record<string, string>;
	/** Custom properties set anywhere else. */
	overriddenVariables: Set<string>;
	/** Cascade layers in the order the stylesheet first names them. */
	layers: string[];
	/** URLs of @import rules, as written. */
	imports: string[];
}
const MAX_VARIABLE_DEPTH = 8;
/** Matches the edge cache on the fetch: a republished stylesheet is read again within a minute. */
const SHEET_CACHE_TTL_MS = 60_000;
const sheetCache = new Map<string, { sheet: Promise<ParsedSheet | null>; at: number }>();

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
	const document = parseDocument(rawHtml) as unknown as StyledNode;
	const sources = collectStyleSources(document, pageUrl);
	const sheets: ParsedSheet[] = [];
	let linked = 0;

	for (const source of sources) {
		let sheet: ParsedSheet | null;
		if (source.kind === 'inline') {
			sheet = parseStylesheet(source.css, source.media);
		} else {
			if (linked >= MAX_STYLESHEETS_PER_PAGE) return null;
			linked += 1;
			sheet = await cachedSheet(source.url, source.media, fetcher);
			if (!sheet) return null;
		}
		// An imported site stylesheet is not read; without it the cascade is incomplete.
		const base = source.kind === 'link' ? source.url : pageUrl;
		if (sheet.imports.some((href) => resolveSiteStylesheet(href, base) !== null)) return null;
		sheets.push(sheet);
	}

	const rules: StyleRule[] = [];
	const variables: Record<string, string> = {};
	const overridden = new Set<string>();
	const conditions = new Set<string>();
	const layerOrder = new Map<string, number>();
	let order = 0;
	for (const sheet of sheets) {
		for (const name of sheet.layers) {
			if (!layerOrder.has(name)) layerOrder.set(name, layerOrder.size);
		}
		mergeGlobalVariables(variables, sheet.variables, overridden);
		for (const name of sheet.overriddenVariables) overridden.add(name);
		for (const rule of sheet.rules) {
			rules.push({ ...rule, order: order++ });
			if (rule.condition) conditions.add(rule.condition);
		}
	}
	for (const name of inlineCustomProperties(document)) overridden.add(name);
	return { rules, variables, overriddenVariables: overridden, scenarios: buildScenarios([...conditions]), matched: new WeakMap(), layerOrder };
}

/** True when the cascade reserves the image's space at every viewport width the stylesheets distinguish. */
export function imageSpaceReserved(img: StyledNode, styles: PageStyles): boolean {
	return styles.scenarios.every((active) => reservedIn(img, styles, active));
}

function reservedIn(img: StyledNode, styles: PageStyles, active: ReadonlySet<string>): boolean {
	const style = cascade(img, styles, active, true);
	if (style.all) return false;
	const position = style.position?.trim().toLowerCase();
	if (position === 'absolute' || position === 'fixed') return true;
	// Definite preferred dimensions do not defeat intrinsic min/max constraints.
	if (SIZE_CONSTRAINTS.some((property) => INTRINSIC_SIZE.test(style[property] ?? '') || /\bunresolved\b/.test(style[property] ?? ''))) return false;

	const hasWidth = widthIsDefinite(img, style.width, styles, active);
	const hasHeight = heightIsDefinite(img, style.height, styles, active, 0);
	if (hasWidth && hasHeight) return true;
	// "auto 16 / 9" hands over to the image's own ratio once it loads, so it does not fix the missing side.
	return isRatio(style['aspect-ratio'], false) && (hasWidth || hasHeight);
}

function heightIsDefinite(
	node: StyledNode,
	height: string | undefined,
	styles: PageStyles,
	active: ReadonlySet<string>,
	depth: number
): boolean {
	const kind = sizeKind(height);
	if (kind === 'length') return true;
	if (kind !== 'percent') return false;
	// A percentage height resolves only against a parent whose own height is settled.
	const parent = node.parent;
	if (!parent || parent.type !== 'tag' || depth >= MAX_PERCENT_HEIGHT_DEPTH) return false;
	const parentStyle = cascade(parent, styles, active, false);
	if (parentStyle.all) return false;
	// Height and aspect-ratio do not apply to an inline box, so it settles nothing.
	const parentDisplay = boxDisplay(parent, parentStyle);
	if (parentDisplay === 'inline' || parentDisplay === 'contents' || parentDisplay === 'none') return false;
	// A box that is not an image has no ratio of its own, so "auto 16 / 9" is 16 / 9.
	if (isRatio(parentStyle['aspect-ratio'], true)) return true;
	return heightIsDefinite(parent, parentStyle.height, styles, active, depth + 1);
}

/** A length is definite. A percentage is definite only when the box it resolves against does not take its width from its content. */
function widthIsDefinite(img: StyledNode, width: string | undefined, styles: PageStyles, active: ReadonlySet<string>): boolean {
	const kind = sizeKind(width);
	if (kind === 'length') return true;
	if (kind !== 'percent') return false;
	return containerWidthIsDefinite(img.parent, styles, active, 0);
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
	active: ReadonlySet<string>,
	depth: number,
	traversed = 0
): boolean {
	if (!node || node.type !== 'tag') return true;
	if (traversed >= MAX_PERCENT_WIDTH_DEPTH + 2) return false;
	const isPageRoot = node.name === 'body' || node.name === 'html';
	// Root boxes still need inspection, but do not consume the ancestor budget.
	if (!isPageRoot && depth >= MAX_PERCENT_WIDTH_DEPTH) return false;
	const style = cascade(node, styles, active, false);
	if (style.all) return false;
	const kind = sizeKind(style.width);
	if (kind === 'length') return true;
	if (INTRINSIC_SIZE.test(style.width ?? '')) return false;

	const position = keyword(style.position);
	if (position === 'absolute' || position === 'fixed') return false;
	const float = keyword(style.float);
	if (float === 'left' || float === 'right') return false;
	const display = boxDisplay(node, style);
	if (display.startsWith('inline') || display === 'contents' || display === 'none') return false;
	if (display.startsWith('table')) return false;

	const parent = node.parent;
	const parentStyle = parent && parent.type === 'tag' ? cascade(parent, styles, active, false) : {};
	const parentDisplay = keyword(parentStyle.display);
	if (parentDisplay === 'flex' || parentDisplay === 'inline-flex') {
		const direction = `${parentStyle['flex-direction'] ?? ''} ${parentStyle['flex-flow'] ?? ''}`.toLowerCase();
		const rowAxis = !direction.includes('column');
		// In a row, an item is as wide as its content unless it has a width or grows.
		if (rowAxis && kind !== 'percent' && !flexGrows(style)) return false;
	}
	return containerWidthIsDefinite(parent, styles, active, depth + (isPageRoot ? 0 : 1), traversed + 1);
}

/** The display value, or the element's default when no rule sets one. */
function boxDisplay(node: StyledNode, style: Partial<Record<Property, string>>): string {
	return keyword(style.display) || (INLINE_TAGS.has(node.name ?? '') ? 'inline' : 'block');
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
	// Only a value the browser would accept as a size counts: a number with a unit, zero, or a math function.
	if (!SIZE_VALUE.test(text)) return 'none';
	return text.includes('%') ? 'percent' : 'length';
}

function isRatio(value: string | undefined, allowAuto: boolean): boolean {
	const text = value?.trim().toLowerCase();
	if (!text || NOT_DEFINITE.test(text)) return false;
	// Only a plain positive ratio counts; "0", "1 / 0" and values the read cannot evaluate do not.
	const ratio = /^(auto\s+)?(\d*\.?\d+)(?:\s*\/\s*(\d*\.?\d+))?(\s+auto)?$/.exec(text);
	if (!ratio || parseFloat(ratio[2]) <= 0 || (ratio[3] !== undefined && parseFloat(ratio[3]) <= 0)) return false;
	return allowAuto || !(ratio[1] || ratio[4]);
}

/** The winning value of each property for one element, with rules in `condition` layered over the unconditional ones. */
function cascade(
	node: StyledNode,
	styles: PageStyles,
	active: ReadonlySet<string>,
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
			if (/^[1-9]\d*$/.test(attribute)) offer(property, `${attribute}px`, [0, -1, -1, 0]);
		}
	}

	let matched = styles.matched.get(node);
	if (!matched) {
		matched = styles.rules.filter(
			(rule) =>
				(!rule.subjectTag || rule.subjectTag === node.name) &&
				rule.subjectClasses.every((name) => classes.has(name)) &&
				rule.matches(node)
		);
		styles.matched.set(node, matched);
	}
	for (const rule of matched) {
		if (rule.condition !== null && !active.has(rule.condition)) continue;
		for (const [property, declaration] of Object.entries(rule.declarations) as Array<[Property, Declaration]>) {
			offer(property, declaration.value, [
				declaration.important ? 1 : 0,
				layerRank(rule.layer, declaration.important, styles.layerOrder),
				rule.specificity,
				rule.order
			]);
		}
	}

	for (const [property, declaration] of Object.entries(parseDeclarations(node.attribs?.style ?? '')) as Array<[Property, Declaration]>) {
		offer(property, declaration.value, [declaration.important ? 1 : 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0]);
	}

	const out: Partial<Record<Property, string>> = {};
	for (const [property, winner] of Object.entries(winners)) {
		out[property as Property] = resolveVariables(winner.value, styles, 0, SIZE_CONSTRAINTS.includes(property as typeof SIZE_CONSTRAINTS[number]) ? 'unresolved' : 'auto');
	}
	return out;
}

/**
 * Replace var() with the value set on :root, html or body. A variable that
 * is not set there, or that is also set anywhere else (per element, per
 * variable mode, in a media query), leaves the value not definite: "auto".
 */
function resolveVariables(value: string, styles: Pick<PageStyles, 'variables' | 'overriddenVariables'>, depth: number, unresolvedValue = 'auto'): string {
	if (!value.includes('var(')) return value;
	if (depth >= MAX_VARIABLE_DEPTH) return unresolvedValue;
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
		if (end === -1) return unresolvedValue;
		const inner = value.slice(start + 4, end);
		const comma = scanToWithBrackets(inner, 0);
		const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
		const fallback = comma === -1 ? null : inner.slice(comma + 1).trim();
		// A variable that is also set elsewhere may have another value on this element.
		const found = styles.overriddenVariables.has(name) ? null : (styles.variables[name] ?? fallback);
		if (found === null || found === undefined || found === '') {
			unresolved = true;
			break;
		}
		out += resolveVariables(found, styles, depth + 1, unresolvedValue);
		index = end + 1;
	}
	return unresolved ? unresolvedValue : out.trim();
}

/**
 * Conditions that hold at the same time, for every viewport width the
 * stylesheets distinguish. Width queries are evaluated at each breakpoint and
 * one pixel either side. A condition the read cannot evaluate (orientation,
 * hover, container queries, comma lists) is tried both on and off.
 */
function buildScenarios(conditions: string[]): Array<ReadonlySet<string>> {
	const known: Array<{ condition: string; min: number; max: number }> = [];
	const unknown: string[] = [];
	const widths = new Set<number>([320, 4000]);

	for (const condition of conditions) {
		const range = widthRange(condition);
		if (range === 'never') continue;
		if (range === 'unknown') {
			unknown.push(condition);
			continue;
		}
		known.push({ condition, ...range });
		for (const edge of [range.min, range.max]) {
			if (Number.isFinite(edge)) [edge - 1, edge, edge + 1].forEach((width) => widths.add(width));
		}
	}

	const seen = new Set<string>();
	const scenarios: Array<ReadonlySet<string>> = [];
	const add = (active: string[]) => {
		const key = [...active].sort().join('\n');
		if (seen.has(key)) return;
		seen.add(key);
		scenarios.push(new Set(active));
	};
	for (const width of widths) {
		const active = known.filter((entry) => width >= entry.min && width <= entry.max).map((entry) => entry.condition);
		add(active);
		for (const extra of unknown) add([...active, extra]);
		if (unknown.length > 1) add([...active, ...unknown]);
	}
	return scenarios;
}

/** The viewport widths a condition covers, when it is made only of screen and min/max-width parts. */
function widthRange(condition: string): { min: number; max: number } | 'never' | 'unknown' {
	if (condition.includes('@container') || condition.includes('@supports') || condition.includes(',')) return 'unknown';
	let min = -Infinity;
	let max = Infinity;
	const parts = condition
		.replace(/@media/g, ' and ')
		.split(/\band\b/i)
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);
	for (const part of parts) {
		if (part === 'screen' || part === 'all' || part === 'only screen') continue;
		if (part === 'print' || part === 'only print') return 'never';
		const width = /^\(\s*(min|max)-width\s*:\s*([\d.]+)(px|em|rem)\s*\)$/.exec(part);
		if (!width) return 'unknown';
		const px = parseFloat(width[2]) * (width[3] === 'px' ? 1 : 16);
		if (width[1] === 'min') min = Math.max(min, px);
		else max = Math.min(max, px);
	}
	return min > max ? 'never' : { min, max };
}

/** Custom properties set in style attributes anywhere on the page. */
function inlineCustomProperties(root: StyledNode): string[] {
	const names: string[] = [];
	const walk = (parent: StyledNode) => {
		for (const child of parent.children ?? []) {
			const style = child.attribs?.style;
			if (style && style.includes('--')) names.push(...Object.keys(parseCustomProperties(style)));
			walk(child);
		}
	};
	walk(root);
	return names;
}

/**
 * Unlayered rules win over layered ones, and later layers over earlier ones,
 * whatever the specificity. For !important declarations the order is reversed.
 */
function layerRank(layer: string | null, important: boolean, layerOrder: Map<string, number>): number {
	const index = layer === null ? null : (layerOrder.get(layer) ?? 0);
	if (important) return index === null ? -1 : 1_000_000 - index;
	return index === null ? 1_000_000 : index;
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

type StyleSource = { kind: 'inline'; css: string; media: string | null } | { kind: 'link'; url: string; media: string | null };

/** A media attribute as a condition on every rule in the stylesheet, or null when it always applies. */
function mediaCondition(media: string | undefined): string | null {
	const text = (media ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
	return !text || text === 'all' || text === 'screen' ? null : `@media ${text}`;
}

function collectStyleSources(root: StyledNode, pageUrl: string): StyleSource[] {
	const sources: StyleSource[] = [];
	const walk = (parent: StyledNode) => {
		for (const child of parent.children ?? []) {
			if (child.name === 'template' || child.name === 'noscript') continue;
			if (child.name === 'style') {
				const css = (child.children ?? []).map((node) => node.data ?? '').join('');
				sources.push({ kind: 'inline', css, media: mediaCondition(child.attribs?.media) });
				continue;
			}
			if (child.name === 'link' && /\bstylesheet\b/i.test(child.attribs?.rel ?? '') && child.attribs?.href) {
				const url = resolveSiteStylesheet(child.attribs.href, pageUrl);
				if (url) sources.push({ kind: 'link', url, media: mediaCondition(child.attribs.media) });
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

function cachedSheet(url: string, media: string | null, fetcher: StylesheetFetcher): Promise<ParsedSheet | null> {
	const key = `${media ?? ''}\n${url}`;
	const cached = sheetCache.get(key);
	if (cached && Date.now() - cached.at < SHEET_CACHE_TTL_MS) return cached.sheet;
	sheetCache.delete(key);
	const pending = fetcher(url)
		.then((css) => (css === null ? null : parseStylesheet(css, media)))
		.catch(() => null);
	sheetCache.set(key, { sheet: pending, at: Date.now() });
	// A failed read must not stick: the next run tries again.
	void pending.then((sheet) => {
		if (!sheet && sheetCache.get(key)?.sheet === pending) sheetCache.delete(key);
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
export function parseStylesheet(css: string, condition: string | null = null): ParsedSheet {
	const sheet: ParsedSheet = { rules: [], variables: {}, overriddenVariables: new Set(), layers: [], imports: [] };
	readRules(css.replace(/\/\*[\s\S]*?\*\//g, ''), condition, null, sheet);
	return sheet;
}

function readRules(css: string, condition: string | null, layer: string | null, out: ParsedSheet): void {
	const registerLayer = (name: string) => {
		if (!out.layers.includes(name)) out.layers.push(name);
	};
	let index = 0;
	while (index < css.length) {
		const open = scanTo(css, index, '{', ';');
		if (open === -1) return;
		const prelude = css.slice(index, open).trim();
		if (css[open] === ';') {
			// "@layer base, components;" fixes the order of the layers it names.
			const order = /^@layer\s+(.+)$/i.exec(prelude);
			if (order) {
				for (const name of order[1].split(',')) registerLayer([layer, name.trim()].filter(Boolean).join('.'));
			}
			const imported = /^@import\s+(?:url\(\s*)?["']?([^"')\s]+)/i.exec(prelude);
			if (imported) out.imports.push(imported[1]);
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
				readRules(body, always ? condition : [condition, `@${name} ${params}`].filter(Boolean).join(' and '), layer, out);
			} else if (name === 'supports') {
				// The read does not know which features the visitor's browser has.
				readRules(body, [condition, `@supports ${params}`].filter(Boolean).join(' and '), layer, out);
			} else if (name === 'layer') {
				const inner = [layer, params || `(anonymous ${out.layers.length})`].filter(Boolean).join('.');
				registerLayer(inner);
				readRules(body, condition, inner, out);
			}
			// @font-face, @keyframes, @page and the rest cannot size an image.
			continue;
		}

		const selectors = prelude ? splitSelectors(prelude) : [];
		if (body.includes('--')) {
			const custom = parseCustomProperties(body);
			const global = condition === null && selectors.every((selector) => /^(:root|html|body)$/i.test(selector));
			if (global) mergeGlobalVariables(out.variables, custom, out.overriddenVariables);
			else Object.keys(custom).forEach((name) => out.overriddenVariables.add(name));
		}
		// Declarations after a nested rule come later in the cascade than that rule.
		const nestedRules = selectors.length > 0 ? nestedBlocks(body) : [];
		const split = nestedRules.length > 0 ? nestedRules[0].start : body.length;
		const pushDeclarations = (text: string) => {
			const declarations = parseDeclarations(text);
			if (Object.keys(declarations).length === 0) return;
			for (const selector of selectors) {
				const compiled = compileSelector(selector);
				if (compiled) out.rules.push({ ...compiled, declarations, condition, layer });
			}
		};
		pushDeclarations(body.slice(0, split));
		// Nested rules: read each as a top-level rule on the combined selector.
		for (const nested of nestedRules) {
			if (/^@(media|container|supports)\b/i.test(nested.prelude)) {
				readRules(`${nested.prelude}{${selectors.join(',')}{${nested.body}}}`, condition, layer, out);
			} else if (!nested.prelude.startsWith('@')) {
				const combined = selectors.flatMap((parent) =>
					splitSelectors(nested.prelude).map((inner) =>
						inner.includes('&') ? inner.split('&').join(`:is(${parent})`) : `:is(${parent}) ${inner}`
					)
				);
				readRules(`${combined.join(',')}{${nested.body}}`, condition, layer, out);
			}
		}
		if (nestedRules.length > 0) pushDeclarations(body.slice(split));
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

/** Blocks nested directly inside a rule body, each with the text before its brace. */
function nestedBlocks(body: string): Array<{ prelude: string; body: string; start: number }> {
	const blocks: Array<{ prelude: string; body: string; start: number }> = [];
	let index = 0;
	while (index < body.length) {
		const end = scanTo(body, index, ';', '{');
		if (end === -1) break;
		if (body[end] === ';') {
			index = end + 1;
			continue;
		}
		const close = matchingBrace(body, end);
		if (close === -1) break;
		blocks.push({ prelude: body.slice(index, end).trim(), body: body.slice(end + 1, close), start: index });
		index = close + 1;
	}
	return blocks;
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
		const named = piece.slice(0, colon).trim().toLowerCase();
		const property = PROPERTY_ALIASES[named] ?? named;
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

/**
 * :root, html and body are different elements: a value on body wins for the
 * page content whatever the source order. The read does not model that; a
 * variable given two different global values is treated as overridden.
 */
function mergeGlobalVariables(target: Record<string, string>, source: Record<string, string>, overridden: Set<string>): void {
	for (const [name, value] of Object.entries(source)) {
		if (name in target && target[name] !== value) overridden.add(name);
		target[name] = value;
	}
}

function parseCustomProperties(body: string): Record<string, string> {
	const out: Record<string, string> = {};
	const important = new Set<string>();
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
		if (!name.startsWith('--')) continue;
		const raw = piece.slice(colon + 1).trim();
		const isImportant = /!\s*important\s*$/i.test(raw);
		// An !important value wins over a later normal one in the same block.
		if (important.has(name) && !isImportant) continue;
		if (isImportant) important.add(name);
		out[name] = raw.replace(/!\s*important\s*$/i, '').trim();
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
