export const CONTROL_PLANE_SURFACES = {
	account: {
		path: '/account',
		label: 'Open .agency account'
	},
	dashboard: {
		path: '/dashboard',
		label: 'Open .agency dashboard'
	},
	'mcp-access': {
		path: '/mcp-access',
		label: 'Open .agency MCP access'
	},
	security: {
		path: '/security',
		label: 'Open .agency security posture'
	}
} as const;

export type ControlPlaneSurface = keyof typeof CONTROL_PLANE_SURFACES;

export interface ControlPlaneBridgeOptions {
	source?: string;
	threadId?: string;
	tool?: string;
}

export function isControlPlaneSurface(value: string): value is ControlPlaneSurface {
	return value in CONTROL_PLANE_SURFACES;
}

export function buildControlPlaneBridgeHref(
	surface: ControlPlaneSurface,
	options: ControlPlaneBridgeOptions = {}
) {
	const params = new URLSearchParams();

	params.set('source', options.source ?? 'abundance-concierge');

	if (options.threadId) {
		params.set('threadId', options.threadId);
	}

	if (options.tool) {
		params.set('tool', options.tool);
	}

	const query = params.toString();
	return query ? `/control-plane/${surface}?${query}` : `/control-plane/${surface}`;
}
