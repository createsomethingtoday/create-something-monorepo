/**
 * Document outline extraction with visibility context.
 *
 * The regex-based parser in fetch-utils extracts headings with no ancestor
 * context, so it cannot tell that a heading sits inside a hidden container.
 * That is how Webflow's ecommerce cart modal (display:none on every page)
 * produced false "skipped heading level" errors on every template with a
 * cart element. HTMLRewriter streams the document with element start/end
 * events, letting us track hidden ancestors the way a browser would.
 *
 * Exclusion model (matching Webflow's Audit Panel):
 * - inline `display:none` on the element or any ancestor (modals, cart)
 * - `w-condition-invisible` (CMS conditional visibility) on self or ancestor
 * - `w-commerce-*` headings (fixed-tag platform components creators cannot retag)
 *
 * Interactive-but-visible content (tabs, sliders, dropdown menus) is kept:
 * it is part of the page outline even when toggled.
 */

export interface OutlineHeading {
	level: number;
	text: string;
	className: string;
	position: number;
	hidden: boolean;
	platformManaged: boolean;
}

const VOID_ELEMENTS = new Set([
	'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
	'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const PLATFORM_HEADING_PATTERN = /(?:^|\s)w-commerce-/;
const HIDDEN_CLASS_PATTERN = /(?:^|\s)w-condition-invisible(?:\s|$)/;
const DISPLAY_NONE_PATTERN = /display\s*:\s*none/i;

function isHidingElement(element: { getAttribute(name: string): string | null }): boolean {
	const style = element.getAttribute('style') || '';
	if (DISPLAY_NONE_PATTERN.test(style)) return true;
	const className = element.getAttribute('class') || '';
	return HIDDEN_CLASS_PATTERN.test(className);
}

/**
 * Extract all headings in document order with visibility context.
 * Returns null when HTMLRewriter is unavailable so callers can fall back
 * to the legacy regex-extracted heading list.
 */
export async function extractDocumentOutline(html: string): Promise<OutlineHeading[] | null> {
	if (typeof HTMLRewriter === 'undefined') return null;

	const headings: OutlineHeading[] = [];
	let hiddenDepth = 0;
	let currentHeading: OutlineHeading | null = null;

	try {
		const rewriter = new HTMLRewriter()
			// Registered first so a heading's own hidden state is already counted
			// when the heading handler reads hiddenDepth.
			.on('*', {
				element(element) {
					if (VOID_ELEMENTS.has(element.tagName)) return;
					if (!isHidingElement(element)) return;

					hiddenDepth++;
					try {
						element.onEndTag(() => {
							hiddenDepth = Math.max(0, hiddenDepth - 1);
						});
					} catch {
						// No end tag (self-closing) — undo the increment
						hiddenDepth = Math.max(0, hiddenDepth - 1);
					}
				}
			})
			.on('h1, h2, h3, h4, h5, h6', {
				element(element) {
					const className = element.getAttribute('class') || '';
					const heading: OutlineHeading = {
						level: parseInt(element.tagName.substring(1), 10),
						text: '',
						className,
						position: headings.length + 1,
						hidden: hiddenDepth > 0,
						platformManaged: PLATFORM_HEADING_PATTERN.test(className)
					};
					headings.push(heading);
					currentHeading = heading;
					try {
						element.onEndTag(() => {
							currentHeading = null;
						});
					} catch {
						currentHeading = null;
					}
				},
				text(chunk) {
					if (currentHeading) {
						currentHeading.text += chunk.text;
					}
				}
			});

		// Consume the stream to drive the handlers
		await rewriter.transform(new Response(html)).arrayBuffer();
	} catch (error) {
		console.warn('Document outline extraction failed:', error);
		return null;
	}

	for (const heading of headings) {
		heading.text = heading.text.replace(/\s+/g, ' ').trim();
	}

	return headings;
}

/**
 * Headings that participate in the page outline: visible and creator-controlled.
 */
export function visibleOutlineHeadings(outline: OutlineHeading[]): OutlineHeading[] {
	return outline.filter(heading => !heading.hidden && !heading.platformManaged);
}

// ===== Shared heading-sequence analysis =====
//
// The single sequence walker used by every validator. Each validator maps the
// result to its own issue format; the rules live here once.

export interface HeadingSequenceInput {
	level: number;
	text?: string;
}

export interface HeadingSkip {
	fromLevel: number;
	toLevel: number;
	fromPosition: number;
	toPosition: number;
	fromText: string;
	toText: string;
	missingLevel: number;
}

export interface HeadingSequenceResult {
	h1Count: number;
	hasSkippedLevels: boolean;
	skips: HeadingSkip[];
	firstHeadingLevel: number | null;
}

export function analyzeHeadingSequence(headings: HeadingSequenceInput[]): HeadingSequenceResult {
	const h1Count = headings.filter(h => h.level === 1).length;
	const skips: HeadingSkip[] = [];

	for (let i = 1; i < headings.length; i++) {
		const previous = headings[i - 1];
		const current = headings[i];

		if (current.level > previous.level + 1) {
			skips.push({
				fromLevel: previous.level,
				toLevel: current.level,
				fromPosition: i,
				toPosition: i + 1,
				fromText: previous.text || '',
				toText: current.text || '',
				missingLevel: previous.level + 1
			});
		}
	}

	return {
		h1Count,
		hasSkippedLevels: skips.length > 0,
		skips,
		firstHeadingLevel: headings.length > 0 ? headings[0].level : null
	};
}
