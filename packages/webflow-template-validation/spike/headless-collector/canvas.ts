/**
 * Headless canvas checks: read one page's element tree through the MCP
 * data_element_tool (no Designer open) and evaluate heading order and image
 * alt text with the extension's shared logic (evaluateCanvasAccessibility).
 *
 * Parity with the extension: webflow.getAllElements() returns the current
 * page's own elements and treats a component instance as one element, so this
 * walk does not enter component definitions either. The element tree reflects
 * the saved Designer state, including changes that are not published yet.
 */

import type { McpClient } from '../../cli/src/mcp/client.ts';
import {
	evaluateCanvasAccessibility,
	type CanvasAccessibilityResult,
	type CanvasHeadingInput,
	type CanvasImageInput
} from '../../shared/designer-enhancements';

/** One node of a get_all_elements tree, as the Webflow MCP server returns it. */
interface McpElement {
	id?: { component?: string; element?: string };
	type?: string;
	styleNames?: string[];
	settings?: { tag?: unknown; headingLevel?: unknown; altText?: unknown };
	children?: McpElement[];
	hasMoreChildren?: boolean;
}

export interface CanvasCollectResult {
	result: CanvasAccessibilityResult;
	pageId: string;
	/** elementKey (from the canvas issues) to a label a creator can find in the Navigator. */
	elements: Record<string, string>;
	notes: string[];
}

/**
 * Throws when the server returns an error or a truncated tree. A partial tree
 * could hide the page's H1 or a missing alt text, so the caller must treat a
 * throw as an incomplete run, not as a pass.
 */
export async function collectCanvasAccessibility(params: {
	client: McpClient;
	siteId: string;
	pageId: string;
	pageName: string;
	agentId: string;
}): Promise<CanvasCollectResult> {
	const { client, siteId, pageId, pageName, agentId } = params;
	const response = await client.callTool(
		'data_element_tool',
		{ siteId, pageId, actions: [{ label: 'tree', get_all_elements: { depth: -1 } }] },
		{
			agentId,
			context: 'A template validation command line client reads one page element tree to check heading order and image alt text in the Designer.'
		}
	);
	const root = treeOf(response);

	const headings: Array<CanvasHeadingInput<McpElement>> = [];
	const images: Array<CanvasImageInput<McpElement>> = [];
	let boundAltText = 0;
	const walk = (node: McpElement) => {
		if (node.hasMoreChildren) throw new Error(`element tree for page ${pageId} is truncated (hasMoreChildren on ${labelOf(node)})`);
		if (node.type === 'Heading') {
			const level = headingLevelOf(node);
			if (level) headings.push({ level, ref: node });
		} else if (node.type === 'Image') {
			const alt = node.settings?.altText;
			if (alt !== null && alt !== undefined && typeof alt !== 'string') {
				// Bound to a CMS field or a component property: the value is not
				// known at design time, so count it as set rather than missing.
				boundAltText++;
				images.push({ altText: '[bound]', ref: node });
			} else {
				images.push({ altText: alt, ref: node });
			}
		}
		for (const child of node.children ?? []) walk(child);
	};
	walk(root);

	const { result, elementRefs } = evaluateCanvasAccessibility({ pageName, headings, images });
	const elements: Record<string, string> = {};
	for (const [elementKey, node] of elementRefs) elements[elementKey] = labelOf(node);
	const notes = boundAltText > 0 ? [`${boundAltText} image(s) take alt text from a binding; counted as set`] : [];
	return { result, pageId, elements, notes };
}

/** get_all_elements returns [{ status, message, data }] where data is the Body element. */
function treeOf(response: unknown): McpElement {
	const result = response && typeof response === 'object' && 'result' in response ? (response as { result: unknown }).result : undefined;
	const first = Array.isArray(result) ? result[0] : undefined;
	if (!first || typeof first !== 'object') throw new Error(`data_element_tool: unexpected payload ${JSON.stringify(response).slice(0, 300)}`);
	const { status, message, data } = first as { status?: string; message?: string; data?: McpElement };
	if (status !== 'success' || !data) throw new Error(`data_element_tool get_all_elements: ${status ?? 'no status'}: ${message ?? 'no message'}`);
	return data;
}

/** Same rule as the extension: the heading level, else the number in an h1 to h6 tag. */
function headingLevelOf(node: McpElement): number | null {
	const level = node.settings?.headingLevel;
	if (typeof level === 'number' && level > 0) return level;
	const tag = node.settings?.tag;
	const match = typeof tag === 'string' ? /^h(\d)$/i.exec(tag) : null;
	return match ? Number(match[1]) : null;
}

function labelOf(node: McpElement): string {
	const tag = typeof node.settings?.tag === 'string' ? ` ${node.settings.tag}` : '';
	const classes = node.styleNames?.length ? ` .${node.styleNames.join('.')}` : '';
	return `${node.type ?? 'Element'}${tag}${classes} (element ${node.id?.element ?? '?'})`;
}
