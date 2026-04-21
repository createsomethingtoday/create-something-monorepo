type LaneVisibilityInput = {
	status: string;
	metadata: Record<string, unknown>;
};

const HIDDEN_SURFACE_TOKENS = new Set([
	'all',
	'hub',
	'hubs',
	'mcp_access',
	'mcp-access',
	'mcp_tools',
	'mcp-tools',
	'tools',
]);
const TOOLKIT_ONLY_SURFACE_MODES = new Set(['toolkit_only', 'toolkit-only', 'single_toolkit', 'single-toolkit']);

function asObject(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeSurfaceToken(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
	return normalized || null;
}

function readStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function hasArchivedMetadata(metadata: Record<string, unknown>): boolean {
	if (metadata.archived === true) return true;
	if (typeof metadata.archived_at === 'string' && metadata.archived_at.trim().length > 0) return true;
	const archive = asObject(metadata.archive);
	if (archive?.present === true || archive?.archived === true) return true;
	const archiveState = normalizeSurfaceToken(metadata.archive_state ?? metadata.archiveStatus ?? archive?.state);
	return archiveState === 'archived';
}

function isToolkitOnlySurface(metadata: Record<string, unknown>): boolean {
	const surfaceMode = normalizeSurfaceToken(
		metadata.surface_mode ?? metadata.surfaceMode ?? metadata.access_mode ?? metadata.accessMode,
	);
	return surfaceMode !== null && TOOLKIT_ONLY_SURFACE_MODES.has(surfaceMode);
}

function isSurfaceHidden(metadata: Record<string, unknown>): boolean {
	const hiddenFromSurfaces = [
		...readStringArray(metadata.hidden_from_surfaces),
		...readStringArray(metadata.hidden_surfaces),
	]
		.map(normalizeSurfaceToken)
		.filter((value): value is string => Boolean(value));
	if (hiddenFromSurfaces.some((token) => HIDDEN_SURFACE_TOKENS.has(token))) {
		return true;
	}

	const surfaces = asObject(metadata.surfaces) ?? asObject(metadata.surface_visibility);
	if (surfaces) {
		for (const key of ['hub', 'hubs', 'mcp_access', 'mcp_tools', 'tools']) {
			if (surfaces[key] === false) {
				return true;
			}
		}
	}

	return metadata.portal_visible === false || metadata.hub_visible === false || metadata.mcp_access_visible === false;
}

export function shouldSurfacePartnerLaneInMcpAccess(input: LaneVisibilityInput): boolean {
	if (input.status !== 'active') {
		return false;
	}
	if (hasArchivedMetadata(input.metadata)) {
		return false;
	}
	if (isToolkitOnlySurface(input.metadata)) {
		return false;
	}
	if (isSurfaceHidden(input.metadata)) {
		return false;
	}
	return true;
}
