import type { McpAccessAssignment } from './mcp-access-assignments.js';

function normalizeLegacyIdentifier(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function normalizeToolkitSlug(raw: string): string {
	return raw
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 64);
}

export function normalizeLegacyLaneKey(value: string): string {
	return normalizeLegacyIdentifier(value);
}

export function hasLegacySelfServeToolkitScope(
	assignment: Pick<McpAccessAssignment, 'source' | 'toolkitProfile'> | null | undefined,
): boolean {
	return Boolean(assignment && assignment.source === 'legacy' && assignment.toolkitProfile.length > 0);
}

export function buildLegacyToolkitBindingId(assignment: Pick<McpAccessAssignment, 'laneKey'> | string): string {
	const laneKey = typeof assignment === 'string' ? assignment : assignment.laneKey;
	return `legacy_lane_${normalizeLegacyLaneKey(laneKey) || 'unknown'}`;
}

export function buildLegacyToolkitBindingSlug(assignment: Pick<McpAccessAssignment, 'laneKey'> | string): string {
	const laneKey = typeof assignment === 'string' ? assignment : assignment.laneKey;
	return `legacy-${(normalizeLegacyLaneKey(laneKey) || 'unknown').replace(/_/g, '-')}`;
}

export function isToolkitAuthorizedForAssignment(
	assignment: Pick<McpAccessAssignment, 'toolkitProfile' | 'allowedToolPrefixes'>,
	toolkit: string,
): boolean {
	const normalizedToolkit = normalizeToolkitSlug(toolkit);
	if (!normalizedToolkit) return false;
	if (assignment.toolkitProfile.some((candidate) => normalizeToolkitSlug(candidate) === normalizedToolkit)) {
		return true;
	}
	return assignment.allowedToolPrefixes.some(
		(prefix) => prefix.trim() === `composio-toolkit-${normalizedToolkit}__`,
	);
}
