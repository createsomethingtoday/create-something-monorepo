import { describe, expect, it } from 'vitest';
import type { McpClient } from '../src/mcp/client.ts';
import { collectDesignerData } from '../../spike/headless-collector/collect.ts';

const PAGES = [
	{ id: 'page-about', title: 'About', slug: 'about', publishedPath: '/about' },
	{ id: 'page-home', title: 'Home', publishedPath: '/' },
	{ id: 'page-404', title: '404', slug: '404', publishedPath: '/404' }
];

const tree = (heading: number) => ({
	id: { component: 'page', element: 'body' },
	type: 'Body',
	children: [{ id: { component: 'page', element: 'h' }, type: 'Heading', settings: { tag: `h${heading}`, headingLevel: heading } }]
});

/**
 * A fake MCP client that answers each Webflow tool call the collector makes.
 * `elementPayload(pageId)` decides what get_all_elements returns.
 */
function fakeClient(elementPayload: (pageId: string) => unknown) {
	const elementPages: string[] = [];
	const answer = (name: string, args: Record<string, unknown>): unknown => {
		const action = (args.actions as Array<Record<string, any>>)[0];
		const wrap = (result: unknown) => ({ label: action.label, action: Object.keys(action).find((k) => k !== 'label'), result });
		if (name === 'data_sites_tool') return wrap({ id: 'site-1', displayName: 'Fixture Site', shortName: 'fixture-site' });
		if (name === 'data_pages_tool') return wrap({ pages: PAGES, pagination: { total: PAGES.length } });
		if (name === 'data_style_tool' || name === 'data_variable_tool' || name === 'data_component_tool') return wrap([]);
		if (name === 'data_element_tool') {
			elementPages.push(String(args.pageId));
			return elementPayload(String(args.pageId));
		}
		throw new Error(`unexpected tool ${name}`);
	};
	const client = {
		callTool: async (name: string, args: Record<string, unknown>) => answer(name, args),
		callToolRaw: async (name: string, args: Record<string, unknown>) => ({ structuredContent: answer(name, args) })
	} as unknown as McpClient;
	return { client, elementPages };
}

const ok = (pageId: string) => ({
	label: 'tree',
	action: 'get_all_elements',
	result: [{ status: 'success', message: 'Elements tree loaded', data: tree(pageId === 'page-home' ? 1 : 3) }]
});

describe('collectDesignerData canvas page', () => {
	it('checks the home page by default, standing in for the page open in the Validator app', async () => {
		const { client, elementPages } = fakeClient(ok);
		const collected = await collectDesignerData({ client, siteId: 'site-1', agentId: 'agent' });
		expect(elementPages).toEqual(['page-home']);
		expect(collected.pageId).toBe('page-home');
		expect(collected.canvas?.result).toMatchObject({ available: true, pageName: 'Home', headingsChecked: 1, headingIssues: [] });
		expect(collected.incomplete).toEqual([]);
	});

	it('checks --page when given', async () => {
		const { client, elementPages } = fakeClient(ok);
		const collected = await collectDesignerData({ client, siteId: 'site-1', pageId: 'page-about', agentId: 'agent' });
		expect(elementPages).toEqual(['page-about']);
		expect(collected.canvas?.result.pageName).toBe('About');
		expect(collected.canvas?.result.headingIssues[0].issue).toBe('First heading on the canvas is H3 — it should be H1');
	});

	it('marks the run incomplete, with no canvas result, when the tree cannot be read', async () => {
		const { client } = fakeClient(() => ({ label: 'tree', action: 'get_all_elements', result: [{ status: 'error', message: 'Page not found' }] }));
		const collected = await collectDesignerData({ client, siteId: 'site-1', agentId: 'agent' });
		expect(collected.canvas).toBeUndefined();
		expect(collected.incomplete).toEqual([
			'canvas checks could not read the page element tree (data_element_tool get_all_elements: error: Page not found)'
		]);
	});

	it('still returns the Designer data the worker needs', async () => {
		const { client } = fakeClient(ok);
		const collected = await collectDesignerData({ client, siteId: 'site-1', agentId: 'agent' });
		expect(collected.designerData.siteInfo).toMatchObject({ id: 'site-1' });
		expect(collected.designerData.pages).toHaveLength(3);
		expect(collected.counts).toMatchObject({ pages: 3, styles: 0, components: 0 });
	});
});
