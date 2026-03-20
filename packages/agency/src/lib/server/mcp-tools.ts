import hubRegistryRaw from '../../../../../config/mcp-hub/registry.json';
import { getComposioClient, normalizeToolkitSlug } from '$lib/server/partner-auth';
import type { McpAccessAssignment } from '$lib/server/mcp-access-assignments';

const COMPOSIO_SERVER_PREFIX = 'composio-toolkit-';
const REGISTRY_SNAPSHOT_ID = `registry-v${String((hubRegistryRaw as { version?: number }).version ?? 1)}`;
const REGISTRY_LOADED_AT = new Date().toISOString();
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;
const LIVE_TOOL_FETCH_LIMIT = 300;

type RegistryCatalogEntry = {
	include?: boolean;
	name?: string;
	slug?: string;
	category?: string;
	requiresAuth?: boolean;
	authType?: string;
	transports?: string[];
};

type RegistryServerEntry = {
	transport?: string;
	url?: string;
	description?: string;
	tags?: string[];
	catalog?: RegistryCatalogEntry;
	catalog_exposure_mode?: string;
	estimated_tool_count?: number;
};

type RegistryData = {
	version?: number;
	servers?: Record<string, RegistryServerEntry>;
};

type ComposioRawTool = {
	slug: string;
	name: string;
	description: string;
	app: string;
	parameters: {
		type: 'object';
		properties: Record<string, unknown>;
		required?: string[];
	};
};

export type ComposioCatalogToolkit = {
	serverName: string;
	slug: string;
	name: string;
	description: string;
	category: string | null;
	requiresAuth: boolean;
	estimatedToolCount: number;
	tags: string[];
	endpoint: string | null;
};

export type ComposioCatalogTool = {
	id: string;
	toolkit: string;
	slug: string;
	name: string;
	description: string;
	authRequired: boolean | null;
	proxyToolName: string;
};

export type ComposioCatalogPayload = {
	snapshot: {
		id: string;
		fetchedAt: string;
		stale: boolean;
		source: 'registry_json';
		totalToolkits: number;
		totalEstimatedTools: number;
	};
	filters: {
		query: string | null;
		toolkit: string | null;
		cursor: string | null;
		limit: number;
	};
	selectedToolkit: ComposioCatalogToolkit | null;
	toolkits: ComposioCatalogToolkit[];
	tools: ComposioCatalogTool[];
	total: number;
	nextCursor: string | null;
	warnings: string[];
};

export type HubConnectionStatus = 'active' | 'not_connected' | 'unknown' | 'not_required';

export type HubServiceSummary = {
	toolkit: string;
	serverName: string;
	name: string;
	authorized: boolean;
	registered: boolean;
	requiresAuth: boolean;
	connectionStatus: HubConnectionStatus;
	readyByPolicy: boolean;
	estimatedToolCount: number;
};

export type HubToolAvailabilityRow = {
	id: string;
	toolkit: string;
	slug: string;
	name: string;
	description: string;
	proxyToolName: string;
	serverName: string;
	authorized: boolean;
	registered: boolean;
	visibility: 'unverified';
	connectionStatus: HubConnectionStatus;
	readyByPolicy: boolean;
	reason:
		| 'ready_by_policy'
		| 'needs_connection'
		| 'out_of_scope'
		| 'not_registered'
		| 'connection_unknown';
};

export type HubToolAvailabilityPayload = {
	hub: McpAccessAssignment;
	summary: {
		scopedToolkits: number;
		connectedToolkits: number;
		readyToolkits: number;
		estimatedToolsInScope: number;
		visibility: 'unverified';
	};
	selectedToolkit: {
		toolkit: string;
		authorized: boolean;
		registered: boolean;
		requiresAuth: boolean;
		connectionStatus: HubConnectionStatus;
		readyByPolicy: boolean;
		estimatedToolCount: number;
	} | null;
	services: HubServiceSummary[];
	tools: HubToolAvailabilityRow[];
	checkedAt: string;
	total: number;
	nextCursor: string | null;
	warnings: string[];
};

const hubRegistry = hubRegistryRaw as RegistryData;

export async function buildComposioCatalogPayload(input: {
	env?: App.Platform['env'];
	toolkit?: string | null;
	query?: string | null;
	cursor?: string | null;
	limit?: number;
}): Promise<ComposioCatalogPayload> {
	const query = cleanQuery(input.query);
	const toolkit = normalizeToolkitSlug(input.toolkit ?? '');
	const limit = clampPageLimit(input.limit);
	const cursor = input.cursor?.trim() || null;
	const warnings: string[] = [];

	const allToolkits = listComposioToolkitsFromRegistry();
	const filteredToolkits = allToolkits.filter((entry) => matchesToolkitSearch(entry, query));
	const { page, nextCursor } = paginate(filteredToolkits, cursor, limit);
	const selectedToolkit = toolkit ? allToolkits.find((entry) => entry.slug === toolkit) ?? null : null;

	let tools: ComposioCatalogTool[] = [];
	if (toolkit) {
		if (!selectedToolkit) {
			warnings.push(`Toolkit "${toolkit}" is not present in the current MCP registry snapshot.`);
		} else {
			const liveTools = await fetchComposioToolkitTools(input.env, toolkit, query, warnings);
			tools = liveTools.map((tool) => ({
				id: `${toolkit}:${tool.slug}`,
				toolkit,
				slug: tool.slug,
				name: normalizeToolDisplayName(tool),
				description: tool.description,
				authRequired: selectedToolkit.requiresAuth,
				proxyToolName: buildProxyToolName(toolkit, tool.slug),
			}));
			if (
				selectedToolkit.estimatedToolCount > 0 &&
				tools.length >= LIVE_TOOL_FETCH_LIMIT &&
				selectedToolkit.estimatedToolCount > tools.length
			) {
				warnings.push(
					`Selected toolkit returned ${tools.length} live tools, but the registry estimates ${selectedToolkit.estimatedToolCount}. The live list may be incomplete.`,
				);
			}
		}
	}

	return {
		snapshot: {
			id: REGISTRY_SNAPSHOT_ID,
			fetchedAt: REGISTRY_LOADED_AT,
			stale: false,
			source: 'registry_json',
			totalToolkits: allToolkits.length,
			totalEstimatedTools: allToolkits.reduce((sum, entry) => sum + entry.estimatedToolCount, 0),
		},
		filters: {
			query,
			toolkit: toolkit || null,
			cursor,
			limit,
		},
		selectedToolkit,
		toolkits: page,
		tools,
		total: filteredToolkits.length,
		nextCursor,
		warnings,
	};
}

export async function buildHubToolAvailabilityPayload(input: {
	db: D1Database;
	env?: App.Platform['env'];
	assignment: McpAccessAssignment;
	toolkit?: string | null;
	query?: string | null;
	cursor?: string | null;
	limit?: number;
}): Promise<HubToolAvailabilityPayload> {
	const selectedToolkitSlug = normalizeToolkitSlug(input.toolkit ?? '');
	const query = cleanQuery(input.query);
	const limit = clampPageLimit(input.limit);
	const cursor = input.cursor?.trim() || null;
	const warnings = [
		'Live Hub discovery visibility is unverified in v1. This view combines lane authorization, registry registration, and client-scoped Composio connection state.',
	];

	const registryToolkits = new Map(listComposioToolkitsFromRegistry().map((entry) => [entry.slug, entry]));
	const scopedToolkits = listScopedToolkits(input.assignment);
	const connectionStatusByToolkit = await loadConnectionStatusByToolkit(input.db, input.assignment);

	const services = scopedToolkits
		.map((toolkit) => {
			const registryEntry = registryToolkits.get(toolkit);
			const requiresAuth = registryEntry?.requiresAuth ?? true;
			const connectionStatus = resolveToolkitConnectionStatus(toolkit, registryEntry, connectionStatusByToolkit);
			const registered = Boolean(registryEntry);
			const authorized = isToolkitAuthorized(input.assignment, toolkit);
			return {
				toolkit,
				serverName: registryEntry?.serverName ?? `${COMPOSIO_SERVER_PREFIX}${toolkit}`,
				name: registryEntry?.name ?? titleizeSlug(toolkit),
				authorized,
				registered,
				requiresAuth,
				connectionStatus,
				readyByPolicy: authorized && registered && isConnectionSatisfied(connectionStatus),
				estimatedToolCount: registryEntry?.estimatedToolCount ?? 0,
			} satisfies HubServiceSummary;
		})
		.sort((a, b) => a.toolkit.localeCompare(b.toolkit));

	const selectedToolkit = selectedToolkitSlug
		? buildSelectedToolkitSummary(
				selectedToolkitSlug,
				input.assignment,
				registryToolkits,
				connectionStatusByToolkit,
			)
		: null;

	let tools: HubToolAvailabilityRow[] = [];
	let nextCursor: string | null = null;
	let total = 0;

	if (selectedToolkitSlug) {
		const liveCatalog = await buildComposioCatalogPayload({
			env: input.env,
			toolkit: selectedToolkitSlug,
			query,
			limit: LIVE_TOOL_FETCH_LIMIT,
		});
		warnings.push(...liveCatalog.warnings);
		const allRows = liveCatalog.tools.map((tool) =>
			toHubToolAvailabilityRow(tool, selectedToolkit, input.assignment),
		);
		total = allRows.length;
		const paged = paginate(allRows, cursor, limit);
		tools = paged.page;
		nextCursor = paged.nextCursor;
	}

	return {
		hub: input.assignment,
		summary: {
			scopedToolkits: services.length,
			connectedToolkits: services.filter((service) => service.connectionStatus === 'active').length,
			readyToolkits: services.filter((service) => service.readyByPolicy).length,
			estimatedToolsInScope: services.reduce((sum, service) => sum + service.estimatedToolCount, 0),
			visibility: 'unverified',
		},
		selectedToolkit,
		services,
		tools,
		checkedAt: new Date().toISOString(),
		total,
		nextCursor,
		warnings,
	};
}

function buildSelectedToolkitSummary(
	toolkit: string,
	assignment: McpAccessAssignment,
	registryToolkits: Map<string, ComposioCatalogToolkit>,
	connectionStatusByToolkit: Map<string, HubConnectionStatus>,
) {
	const registryEntry = registryToolkits.get(toolkit);
	const authorized = isToolkitAuthorized(assignment, toolkit);
	const connectionStatus = resolveToolkitConnectionStatus(toolkit, registryEntry, connectionStatusByToolkit);
	return {
		toolkit,
		authorized,
		registered: Boolean(registryEntry),
		requiresAuth: registryEntry?.requiresAuth ?? true,
		connectionStatus,
		readyByPolicy: authorized && Boolean(registryEntry) && isConnectionSatisfied(connectionStatus),
		estimatedToolCount: registryEntry?.estimatedToolCount ?? 0,
	};
}

function toHubToolAvailabilityRow(
	tool: ComposioCatalogTool,
	selectedToolkit: HubToolAvailabilityPayload['selectedToolkit'],
	assignment: McpAccessAssignment,
): HubToolAvailabilityRow {
	const authorized = selectedToolkit?.authorized ?? isToolkitAuthorized(assignment, tool.toolkit);
	const registered = selectedToolkit?.registered ?? false;
	const connectionStatus = selectedToolkit?.connectionStatus ?? 'unknown';
	const readyByPolicy = Boolean(selectedToolkit?.readyByPolicy);
	return {
		id: tool.id,
		toolkit: tool.toolkit,
		slug: tool.slug,
		name: tool.name,
		description: tool.description,
		proxyToolName: tool.proxyToolName,
		serverName: `${COMPOSIO_SERVER_PREFIX}${tool.toolkit}`,
		authorized,
		registered,
		visibility: 'unverified',
		connectionStatus,
		readyByPolicy,
		reason: resolveAvailabilityReason({
			authorized,
			registered,
			connectionStatus,
			readyByPolicy,
		}),
	};
}

function resolveAvailabilityReason(input: {
	authorized: boolean;
	registered: boolean;
	connectionStatus: HubConnectionStatus;
	readyByPolicy: boolean;
}): HubToolAvailabilityRow['reason'] {
	if (!input.registered) return 'not_registered';
	if (!input.authorized) return 'out_of_scope';
	if (input.readyByPolicy) return 'ready_by_policy';
	if (input.connectionStatus === 'not_connected') return 'needs_connection';
	return 'connection_unknown';
}

function listComposioToolkitsFromRegistry(): ComposioCatalogToolkit[] {
	const servers = hubRegistry.servers ?? {};
	return Object.entries(servers)
		.filter(([serverName]) => serverName.startsWith(COMPOSIO_SERVER_PREFIX))
		.map(([serverName, entry]) => {
			const catalog = entry.catalog ?? {};
			const slug = normalizeToolkitSlug(catalog.slug ?? serverName.slice(COMPOSIO_SERVER_PREFIX.length));
			return {
				serverName,
				slug,
				name: catalog.name?.trim() || titleizeSlug(slug),
				description: entry.description?.trim() || `${titleizeSlug(slug)} via Composio`,
				category: catalog.category?.trim() || null,
				requiresAuth: catalog.requiresAuth !== false,
				estimatedToolCount: Math.max(0, Math.trunc(entry.estimated_tool_count ?? 0)),
				tags: Array.isArray(entry.tags)
					? entry.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
					: [],
				endpoint: entry.url?.trim() || null,
			} satisfies ComposioCatalogToolkit;
		})
		.sort((a, b) => a.slug.localeCompare(b.slug));
}

async function fetchComposioToolkitTools(
	env: App.Platform['env'] | undefined,
	toolkit: string,
	query: string | null,
	warnings: string[],
): Promise<ComposioRawTool[]> {
	if (!env?.COMPOSIO_API_KEY?.trim()) {
		warnings.push('COMPOSIO_API_KEY is not configured for the Agency app. Live tool names are unavailable.');
		return [];
	}

	try {
		const composio = getComposioClient(env);
		const response = await (
			composio.tools as unknown as {
				getRawComposioTools: (args: Record<string, unknown>) => Promise<unknown>;
			}
		).getRawComposioTools({
			toolkits: [toolkit],
			limit: LIVE_TOOL_FETCH_LIMIT,
			...(query ? { search: query } : {}),
		});
		const items = Array.isArray(response)
			? response.filter((item): item is Record<string, unknown> => isRecord(item))
			: Array.isArray((response as { items?: unknown[] })?.items)
				? (response as { items: unknown[] }).items.filter((item): item is Record<string, unknown> => isRecord(item))
				: [];
		return items
			.map((item) => normalizeComposioTool(toolkit, item))
			.filter((item): item is ComposioRawTool => Boolean(item))
			.sort((a, b) => normalizeToolDisplayName(a).localeCompare(normalizeToolDisplayName(b)));
	} catch (error) {
		warnings.push(
			`Failed to fetch live tools for toolkit "${toolkit}": ${error instanceof Error ? error.message : String(error)}`,
		);
		return [];
	}
}

function normalizeComposioTool(toolkit: string, rawTool: Record<string, unknown>): ComposioRawTool | null {
	const slug = String(rawTool.slug ?? rawTool.enum ?? '').trim();
	if (!slug) return null;
	return {
		slug,
		name: String(rawTool.name ?? rawTool.displayName ?? '').trim() || titleizeSlug(normalizeToolName(slug)),
		description: String(rawTool.description ?? '').trim(),
		app: String(
			(rawTool.toolkit as Record<string, unknown> | undefined)?.name ??
				(rawTool.toolkit as Record<string, unknown> | undefined)?.slug ??
				rawTool.appName ??
				rawTool.app ??
				toolkit,
		).trim(),
		parameters: normalizeParameters(rawTool.inputParameters ?? rawTool.parameters),
	};
}

function normalizeParameters(raw: unknown): ComposioRawTool['parameters'] {
	if (!isRecord(raw)) {
		return { type: 'object', properties: {} };
	}
	const properties = isRecord(raw.properties) ? raw.properties : {};
	const required = Array.isArray(raw.required)
		? raw.required.filter((value): value is string => typeof value === 'string')
		: undefined;
	return {
		type: 'object',
		properties,
		...(required && required.length > 0 ? { required } : {}),
	};
}

async function loadConnectionStatusByToolkit(
	db: D1Database,
	assignment: McpAccessAssignment,
): Promise<Map<string, HubConnectionStatus>> {
	const map = new Map<string, HubConnectionStatus>();
	if (!assignment.partnerClientId) {
		return map;
	}

	type ToolkitConnectionRow = {
		toolkit: string;
		connection_status: string;
		status: string;
	};

	const result = await db
		.prepare(
			`SELECT toolkit, connection_status, status
			 FROM partner_auth_toolkit_accounts
			 WHERE partner_client_id = ?`,
		)
		.bind(assignment.partnerClientId)
		.all<ToolkitConnectionRow>();

	const grouped = new Map<string, ToolkitConnectionRow[]>();
	for (const row of result.results ?? []) {
		const toolkit = normalizeToolkitSlug(row.toolkit);
		const rows = grouped.get(toolkit) ?? [];
		rows.push(row);
		grouped.set(toolkit, rows);
	}

	for (const [toolkit, rows] of grouped) {
		map.set(toolkit, summarizeToolkitConnectionRows(rows));
	}

	return map;
}

function summarizeToolkitConnectionRows(
	rows: Array<{ connection_status: string; status: string }>,
): HubConnectionStatus {
	const activeRows = rows.filter((row) => String(row.status).toLowerCase() === 'active');
	if (activeRows.some((row) => ['ACTIVE', 'CONNECTED'].includes(String(row.connection_status).toUpperCase()))) {
		return 'active';
	}
	if (activeRows.some((row) => ['INITIATED', 'UNKNOWN'].includes(String(row.connection_status).toUpperCase()))) {
		return 'unknown';
	}
	return 'not_connected';
}

function resolveToolkitConnectionStatus(
	toolkit: string,
	registryEntry: ComposioCatalogToolkit | undefined,
	connectionStatusByToolkit: Map<string, HubConnectionStatus>,
): HubConnectionStatus {
	if (registryEntry && !registryEntry.requiresAuth) {
		return 'not_required';
	}
	return connectionStatusByToolkit.get(toolkit) ?? 'not_connected';
}

function listScopedToolkits(assignment: McpAccessAssignment): string[] {
	const toolkits = new Set<string>();
	for (const toolkit of assignment.toolkitProfile) {
		const normalized = normalizeToolkitSlug(toolkit);
		if (normalized) toolkits.add(normalized);
	}
	for (const prefix of assignment.allowedToolPrefixes) {
		const toolkit = toolkitFromPrefix(prefix);
		if (toolkit) toolkits.add(toolkit);
	}
	return [...toolkits].sort();
}

function toolkitFromPrefix(prefix: string): string | null {
	const match = prefix.trim().match(/^composio-toolkit-(.+)__$/);
	return match?.[1] ? normalizeToolkitSlug(match[1]) : null;
}

export function isToolkitAuthorized(assignment: McpAccessAssignment, toolkit: string): boolean {
	const normalizedToolkit = normalizeToolkitSlug(toolkit);
	if (!normalizedToolkit) return false;
	if (assignment.toolkitProfile.some((candidate) => normalizeToolkitSlug(candidate) === normalizedToolkit)) {
		return true;
	}
	const expectedPrefix = `${COMPOSIO_SERVER_PREFIX}${normalizedToolkit}__`;
	return assignment.allowedToolPrefixes.some((prefix) => prefix.trim() === expectedPrefix);
}

function buildProxyToolName(toolkit: string, toolSlug: string): string {
	return `${COMPOSIO_SERVER_PREFIX}${toolkit}__${normalizeToolName(toolSlug)}`;
}

function normalizeToolName(slug: string): string {
	return slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function normalizeToolDisplayName(tool: Pick<ComposioRawTool, 'name' | 'slug'>): string {
	return tool.name.trim() || titleizeSlug(normalizeToolName(tool.slug));
}

function matchesToolkitSearch(toolkit: ComposioCatalogToolkit, query: string | null): boolean {
	if (!query) return true;
	const haystack = [toolkit.slug, toolkit.name, toolkit.description, toolkit.category ?? '', ...toolkit.tags]
		.join(' ')
		.toLowerCase();
	return haystack.includes(query.toLowerCase());
}

function paginate<T>(items: T[], cursor: string | null, limit: number): { page: T[]; nextCursor: string | null } {
	const start = Number.isFinite(Number(cursor)) ? Math.max(0, Math.trunc(Number(cursor))) : 0;
	const page = items.slice(start, start + limit);
	return {
		page,
		nextCursor: start + page.length < items.length ? String(start + page.length) : null,
	};
}

function clampPageLimit(limit: number | undefined): number {
	return Math.max(1, Math.min(MAX_PAGE_LIMIT, Math.trunc(limit ?? DEFAULT_PAGE_LIMIT)));
}

function cleanQuery(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

function titleizeSlug(value: string): string {
	return value
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function isConnectionSatisfied(status: HubConnectionStatus): boolean {
	return status === 'active' || status === 'not_required';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
