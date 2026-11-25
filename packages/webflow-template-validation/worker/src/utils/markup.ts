/**
 * Read helpers for a parsed published page (htmlparser2 / domhandler tree).
 * The reviewer standards and the review-note checks read pages the same way,
 * so one check never counts text or a footer that the other one does not.
 */

/** The subset of a domhandler node that the checks read. */
export interface MarkupNode {
	type: string;
	name?: string;
	attribs?: Record<string, string>;
	children?: MarkupNode[];
	parent?: MarkupNode | null;
	data?: string;
}

const FOOTER_TOKEN = /(?:^|[\s_-])footer(?:$|[\s_-])/i;
const NO_TEXT_TAGS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head']);
const INERT_TAGS = new Set(['template', 'noscript']);
const BLOCK_TAGS = new Set([
	'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'details', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
	'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section',
	'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
]);

/**
 * Element descendants a browser renders. Comments and script text are not
 * elements in the parsed tree; <template> content and <noscript> fallbacks
 * never render, so unused markup there cannot fail or satisfy a check.
 */
export function renderedDescendants(node: MarkupNode): MarkupNode[] {
	const out: MarkupNode[] = [];
	const walk = (parent: MarkupNode) => {
		for (const child of parent.children ?? []) {
			if (!child.name || INERT_TAGS.has(child.name)) continue;
			out.push(child);
			walk(child);
		}
	};
	walk(node);
	return out;
}

export function ancestors(node: MarkupNode): MarkupNode[] {
	const out: MarkupNode[] = [];
	for (let parent = node.parent; parent; parent = parent.parent) out.push(parent);
	return out;
}

/**
 * Text a visitor could read, without script, style, SVG, or head content.
 * Inline elements join without a gap, as a browser renders them
 * ("specific <strong>asset</strong>, please" reads "specific asset, please");
 * block elements and <br> are separated by a space. CSS-hidden text is included.
 * `skip` leaves out the subtrees it matches, for example the navbar and the footer.
 */
export function text(node: MarkupNode, skip?: (node: MarkupNode) => boolean): string {
	if (node.type === 'text') return node.data ?? '';
	if (node.name && NO_TEXT_TAGS.has(node.name)) return '';
	if (skip?.(node)) return ' ';
	const inner = (node.children ?? []).map((child) => text(child, skip)).join('');
	return node.name && BLOCK_TAGS.has(node.name) ? ` ${inner} ` : inner;
}

/** Raw text of a script element (its contents are not parsed as markup). */
export function rawText(node: MarkupNode): string {
	return (node.children ?? []).map((child) => child.data ?? '').join('');
}

export function attr(node: MarkupNode, name: string): string {
	return node.attribs?.[name] ?? '';
}

export function classes(node: MarkupNode): string[] {
	return attr(node, 'class').split(/\s+/).filter(Boolean);
}

export function normalize(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

export function isNav(node: MarkupNode): boolean {
	return node.name === 'nav' || attr(node, 'role') === 'navigation' || classes(node).includes('w-nav');
}

/** Same footer rule as the template-preflight skill: a footer element, role contentinfo, or a footer class or id token. */
export function isFooter(node: MarkupNode): boolean {
	return node.name === 'footer' || attr(node, 'role') === 'contentinfo' || FOOTER_TOKEN.test(`${attr(node, 'class')} ${attr(node, 'id')}`);
}
