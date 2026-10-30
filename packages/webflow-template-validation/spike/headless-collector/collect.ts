/**
 * Live headless collector: read a site's design data through the Webflow MCP
 * server (no Designer open) and map it into the worker's DesignerData contract
 * with the mappers in map.ts.
 */

import { payload, textBlocks, type McpClient } from '../../cli/src/mcp/client.ts';
import {
	boundedBreakpointIds,
	toDesignerData,
	type DataApiPage,
	type McpCollection,
	type McpComponent,
	type McpSite,
	type McpStyle,
	type McpVariable
} from './map';
import { withDerivedFields, type HeadlessDesignerData } from './enhance';

const PAGE_LIMIT = 100;
const COMPONENT_QUERY_LIMIT = 200;
// query_components requires keywords (AND substring match on name, group,
// description). One vowel per query, unioned, approximates "all components".
const COMPONENT_KEYWORDS = ['a', 'e', 'i', 'o', 'u'];

export interface CollectResult {
	/** DesignerData plus enhancedValidation and collectionMetadata, like the extension payload. */
	designerData: HeadlessDesignerData;
	/** The page id sent to the style, variable, and component tools. */
	pageId: string;
	/** Raw counts before mapping filters. */
	counts: { styles: number; pages: number; collections: number; variables: number; components: number };
	/** What the server did that a reader should know (truncation, caps, unverified shapes). */
	notes: string[];
	/** Reasons the collection is incomplete (for example a truncated style list). Non-empty means the result must not be treated as a full run. */
	incomplete: string[];
}

/** Every Webflow tool response is { label, action, result }. */
function resultOf<T>(payload: unknown, tool: string): T {
	if (payload && typeof payload === 'object' && 'result' in payload) return (payload as { result: T }).result;
	throw new Error(`${tool}: unexpected payload ${JSON.stringify(payload).slice(0, 300)}`);
}

export async function collectDesignerData(params: {
	client: McpClient;
	siteId: string;
	pageId?: string;
	agentId: string;
	onProgress?: (message: string) => void;
}): Promise<CollectResult> {
	const { client, siteId, agentId, onProgress } = params;
	const notes: string[] = [];
	const call = async (tool: string, args: Record<string, unknown>, context: string) =>
		resultOf<any>(await client.callTool(tool, args, { agentId, context }), tool);

	onProgress?.('MCP get_site');
	const site = (await call(
		'data_sites_tool',
		{ actions: [{ label: 'site', get_site: { site_id: siteId } }] },
		'A template validation command line client reads site details so the validator report can name the template site it reviewed.'
	)) as McpSite;

	const pages: DataApiPage[] = [];
	for (let offset = 0; ; offset += PAGE_LIMIT) {
		onProgress?.(`MCP list_pages offset ${offset}`);
		const page = (await call(
			'data_pages_tool',
			{ actions: [{ label: 'pages', list_pages: { site_id: siteId, limit: PAGE_LIMIT, offset } }] },
			'A template validation command line client lists every page on the template site to check page settings and search metadata.'
		)) as { pages?: DataApiPage[]; pagination?: { total?: number } };
		const batch = page.pages ?? [];
		pages.push(...batch);
		const total = page.pagination?.total ?? pages.length;
		if (batch.length < PAGE_LIMIT || pages.length >= total) break;
	}

	const pageId = params.pageId ?? pages[0]?.id;
	if (!pageId) throw new Error(`site ${siteId} has no pages; the style, variable, and component tools need a pageId`);
	const scoped = { siteId, pageId };

	onProgress?.('MCP get_styles (with breakpoints)');
	const breakpoints = boundedBreakpointIds();
	const stylesRaw = await client.callToolRaw(
		'data_style_tool',
		{
			...scoped,
			actions: [{ label: 'styles', get_styles: { query: 'all', include_properties: true, include_breakpoints: breakpoints } }]
		},
		{
			agentId,
			context:
				'A template validation command line client reads all class styles with responsive width overrides to check the template design system.'
		}
	);
	const styleTruncation = truncationNotes('get_styles', stylesRaw);
	notes.push(...styleTruncation);
	const styles = resultOf<McpStyle[]>(payload(stylesRaw), 'data_style_tool');
	const withOverrides = styles.filter((s) => breakpoints.some((bp) => s.properties?.breakpoints?.[bp])).length;
	notes.push(
		`get_styles include_breakpoints [${breakpoints.join(', ')}]: ${styles.length} style(s), ${withOverrides} with a breakpoint override key, response ${JSON.stringify(stylesRaw).length} bytes`
	);

	onProgress?.('MCP get_variable_collections');
	const collections = (await call(
		'data_variable_tool',
		{ ...scoped, actions: [{ label: 'collections', get_variable_collections: { query: 'all' } }] },
		'A template validation command line client lists variable collections and modes to check how the template organizes design tokens.'
	)) as McpCollection[];
	const variablesByCollection: Record<string, McpVariable[]> = {};
	for (const c of collections) {
		onProgress?.(`MCP get_variables ${c.name}`);
		variablesByCollection[c.id] = (await call(
			'data_variable_tool',
			{ ...scoped, actions: [{ label: 'variables', get_variables: { variable_collection_id: c.id } }] },
			'A template validation command line client reads the variables in one collection to check naming and token usage in the template.'
		)) as McpVariable[];
	}

	onProgress?.('MCP get_all_components');
	const components = (await call(
		'data_component_tool',
		{ ...scoped, actions: [{ label: 'components', get_all_components: { options: { includeInstanceCount: true } } }] },
		'A template validation command line client lists component definitions with instance counts to check reuse across the template pages.'
	)) as McpComponent[];

	onProgress?.('MCP query_components (library, code flags)');
	const flagQueries = (['isLibrary', 'isCodeComponent'] as const).flatMap((flag) =>
		COMPONENT_KEYWORDS.map((k) => ({ label: `${flag}:${k}`, keywords: [k], [flag]: true, limit: COMPONENT_QUERY_LIMIT }))
	);
	const flagResults = (await call(
		'data_component_tool',
		{ ...scoped, actions: [{ label: 'flags', query_components: { queries: flagQueries } }] },
		'A template validation command line client finds which components come from a library or are code components to judge component architecture.'
	)) as Array<{ label: string; total_matches?: number; matches?: Array<{ id?: string }> }>;
	const componentFlags = { library: new Set<string>(), code: new Set<string>() };
	for (const r of flagResults) {
		const target = r.label.startsWith('isLibrary') ? componentFlags.library : componentFlags.code;
		for (const m of r.matches ?? []) if (m.id) target.add(m.id);
		if ((r.total_matches ?? 0) > COMPONENT_QUERY_LIMIT) notes.push(`query_components ${r.label}: ${r.total_matches} matches, capped at ${COMPONENT_QUERY_LIMIT} (no offset paging)`);
	}

	const designerData = withDerivedFields(toDesignerData({
		styles,
		collections,
		variablesByCollection,
		components,
		componentFlags: { library: [...componentFlags.library], code: [...componentFlags.code] },
		pages,
		site
	}));
	return {
		designerData,
		pageId,
		counts: {
			styles: styles.length,
			pages: pages.length,
			collections: collections.length,
			variables: Object.values(variablesByCollection).reduce((n, v) => n + v.length, 0),
			components: components.length
		},
		notes,
		incomplete: styleTruncation.map((marker) => `style collection truncated by the MCP server (${marker})`)
	};
}

/**
 * The server may cut a large get_styles response. No paging fallback exists:
 * query_styles has no offset, and get_styles filter_ids needs ids we would only
 * learn from the full list. So keep what came back and report the marker.
 */
function truncationNotes(action: string, raw: Record<string, unknown>): string[] {
	const markers = textBlocks(raw).filter((t) => !isJson(t) && !t.includes('session_id') && /truncat|too large|exceed|omitted/i.test(t));
	const body = payload(raw);
	if (body && typeof body === 'object' && Object.keys(body).some((k) => /truncat/i.test(k))) markers.push('payload has a truncation key');
	return markers.map((m) => `${action} truncation marker: ${m.slice(0, 200)}`);
}

function isJson(text: string): boolean {
	try {
		JSON.parse(text);
		return true;
	} catch {
		return false;
	}
}
