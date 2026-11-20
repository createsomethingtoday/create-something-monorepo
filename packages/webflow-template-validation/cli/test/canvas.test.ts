import { describe, expect, it, vi } from 'vitest';
import type { McpClient } from '../src/mcp/client.ts';
import { collectCanvasAccessibility } from '../../spike/headless-collector/canvas.ts';
import {
	CANVAS_CHECKS_CATEGORY,
	addCanvasChecksCategory,
	evaluateCanvasAccessibility,
	type EnhanceableResults
} from '../../shared/designer-enhancements.ts';

const emptyResults = (): EnhanceableResults => ({ categories: [], summary: { passedCategories: 0, failedCategories: 0 } });

describe('evaluateCanvasAccessibility (shared with the extension)', () => {
	const headings = (...levels: number[]) => levels.map((level, i) => ({ level, ref: `h${i + 1}` }));

	it('requires the first heading to be H1', () => {
		const { result, elementRefs } = evaluateCanvasAccessibility({ pageName: 'Home', headings: headings(2, 3), images: [] });
		expect(result.headingIssues).toEqual([
			{ issue: 'First heading on the canvas is H2 — it should be H1', position: 1, level: 2, elementKey: 'canvas-heading-1' }
		]);
		expect(elementRefs.get('canvas-heading-1')).toBe('h1');
	});

	it('flags a skipped level but allows going back up', () => {
		const { result } = evaluateCanvasAccessibility({ pageName: 'Home', headings: headings(1, 2, 4, 2, 3, 1, 2), images: [] });
		expect(result.headingsChecked).toBe(7);
		expect(result.headingIssues.map((i) => i.issue)).toEqual(['H4 follows H2, skipping H3']);
		expect(result.headingIssues[0].position).toBe(3);
	});

	it('skips headings without a level, as the extension does', () => {
		const { result } = evaluateCanvasAccessibility({ pageName: 'Home', headings: [{ level: 0, ref: 'x' }, ...headings(1, 2)], images: [] });
		expect(result.headingsChecked).toBe(2);
		expect(result.headingIssues).toEqual([]);
	});

	it('counts empty and whitespace-only alt text as missing, and keys at most 10 images', () => {
		const images = Array.from({ length: 13 }, (_, i) => ({ altText: i === 0 ? 'A chair' : i % 2 ? '' : '  ', ref: `img${i}` }));
		images.push({ altText: null as unknown as string, ref: 'img13' });
		const { result, elementRefs } = evaluateCanvasAccessibility({ pageName: 'Home', headings: [], images });
		expect(result.imagesChecked).toBe(14);
		expect(result.imagesMissingAlt).toBe(13);
		expect(result.missingAltElementKeys).toHaveLength(10);
		expect(result.missingAltElementKeys[0]).toBe('canvas-image-1');
		expect(elementRefs.get('canvas-image-1')).toBe('img1');
	});
});

describe('addCanvasChecksCategory (submission gate behavior)', () => {
	it('fails the category on a heading warning, which fails a recorded run', () => {
		const { result } = evaluateCanvasAccessibility({ pageName: 'Home', headings: [{ level: 3, ref: 'x' }], images: [] });
		const results = emptyResults();
		addCanvasChecksCategory(results, result);
		const category = results.categories[0];
		expect(category.category).toBe(CANVAS_CHECKS_CATEGORY);
		expect(category.passed).toBe(false);
		expect(category.issues[0]).toMatchObject({ id: 'canvas-heading-1', severity: 'warning' });
	});

	it('reports missing alt text as info and keeps the category passing', () => {
		const { result } = evaluateCanvasAccessibility({ pageName: 'Home', headings: [{ level: 1, ref: 'x' }], images: [{ altText: '', ref: 'y' }] });
		const results = emptyResults();
		addCanvasChecksCategory(results, result);
		expect(results.categories[0].passed).toBe(true);
		expect(results.categories[0].issues).toEqual([expect.objectContaining({ id: 'canvas-images-missing-alt', severity: 'info' })]);
	});

	it('reports an uncollected canvas as a passing info item, and an unavailable one as nothing', () => {
		const missing = emptyResults();
		addCanvasChecksCategory(missing, undefined);
		expect(missing.categories[0]).toMatchObject({ passed: true, issues: [expect.objectContaining({ id: 'canvas-checks-unavailable', severity: 'info' })] });

		const unavailable = emptyResults();
		addCanvasChecksCategory(unavailable, { available: false, headingsChecked: 0, headingIssues: [], imagesChecked: 0, imagesMissingAlt: 0, missingAltElementKeys: [] });
		expect(unavailable.categories).toEqual([]);
	});
});

// --- Headless collector over a synthetic get_all_elements tree ---

type Node = Record<string, unknown>;
const el = (element: string, type: string, extra: Node = {}): Node => ({ id: { component: 'page-1', element }, type, ...extra });
const treePayload = (data: Node) => ({ label: 'tree', action: 'get_all_elements', result: [{ status: 'success', message: 'Elements tree loaded', data }] });
const stubClient = (payload: unknown) => {
	const callTool = vi.fn(async () => payload);
	return { client: { callTool } as unknown as McpClient, callTool };
};
const collect = (client: McpClient) => collectCanvasAccessibility({ client, siteId: 'site-1', pageId: 'page-1', pageName: 'Home', agentId: 'agent' });

const sampleTree = () =>
	el('body', 'Body', {
		children: [
			el('nav', 'ComponentInstance', { instanceDetails: { name: 'Navbar', props: [], slots: [] } }),
			el('section', 'Section', {
				settings: { tag: 'div' },
				children: [
					el('h-first', 'Heading', { styleNames: ['hero_title'], settings: { tag: 'h2', headingLevel: 2 } }),
					el('rt', 'RichText', {
						children: [el('h-rt', 'Heading', { settings: { tag: 'h4' } }), el('p', 'Paragraph', { settings: {} })]
					}),
					el('img-ok', 'Image', { settings: { altText: 'A chair' } }),
					el('img-missing', 'Image', { styleNames: ['card_photo'], settings: { assetId: 'asset-1' } }),
					el('img-blank', 'Image', { settings: { altText: '   ' } }),
					el('img-bound', 'Image', { settings: { altText: { type: 'binding', source: 'cms' } } })
				]
			})
		]
	});

describe('collectCanvasAccessibility', () => {
	it('reads one page tree with depth -1 and nothing else', async () => {
		const { client, callTool } = stubClient(treePayload(sampleTree()));
		await collect(client);
		expect(callTool).toHaveBeenCalledTimes(1);
		const [tool, args] = callTool.mock.calls[0] as unknown as [string, Record<string, unknown>];
		expect(tool).toBe('data_element_tool');
		expect(args).toEqual({ siteId: 'site-1', pageId: 'page-1', actions: [{ label: 'tree', get_all_elements: { depth: -1 } }] });
	});

	it('walks headings in document order, including Rich Text, and reads the level from the tag when needed', async () => {
		const { client } = stubClient(treePayload(sampleTree()));
		const { result, elements } = await collect(client);
		expect(result.headingsChecked).toBe(2);
		expect(result.headingIssues.map((i) => i.issue)).toEqual([
			'First heading on the canvas is H2 — it should be H1',
			'H4 follows H2, skipping H3'
		]);
		expect(elements['canvas-heading-1']).toBe('Heading h2 .hero_title (element h-first)');
		expect(elements['canvas-heading-2']).toBe('Heading h4 (element h-rt)');
	});

	it('does not count component contents, matching the extension', async () => {
		const { client } = stubClient(treePayload(sampleTree()));
		const { result } = await collect(client);
		expect(result.imagesChecked).toBe(4);
	});

	it('counts missing and blank alt text, and treats bound alt text as set', async () => {
		const { client } = stubClient(treePayload(sampleTree()));
		const { result, elements, notes } = await collect(client);
		expect(result.imagesMissingAlt).toBe(2);
		expect(Object.values(elements)).toContain('Image .card_photo (element img-missing)');
		expect(notes).toEqual(['1 image(s) take alt text from a binding; counted as set']);
	});

	it('passes an empty page with zero counts, as the extension would', async () => {
		const { client } = stubClient(treePayload(el('body', 'Body')));
		const { result } = await collect(client);
		expect(result).toMatchObject({ available: true, pageName: 'Home', headingsChecked: 0, imagesChecked: 0, headingIssues: [] });
	});

	it('throws on a truncated tree instead of passing a partial page', async () => {
		const tree = sampleTree();
		(tree.children as Node[])[1].hasMoreChildren = true;
		const { client } = stubClient(treePayload(tree));
		await expect(collect(client)).rejects.toThrow(/truncated \(hasMoreChildren on Section div \(element section\)\)/);
	});

	it('throws on an error status or an unexpected payload', async () => {
		const error = { label: 'tree', action: 'get_all_elements', result: [{ status: 'error', message: 'Page not found' }] };
		await expect(collect(stubClient(error).client)).rejects.toThrow('data_element_tool get_all_elements: error: Page not found');
		const rejected = { label: 'tree', action: 'get_all_elements', error: { name: 'Error', message: 'NotFoundError' } };
		await expect(collect(stubClient(rejected).client)).rejects.toThrow(/unexpected payload/);
	});
});
