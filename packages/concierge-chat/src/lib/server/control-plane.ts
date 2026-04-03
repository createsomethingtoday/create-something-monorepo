import { CONTROL_PLANE_SURFACES, type ControlPlaneSurface } from '$lib/control-plane';

const DEFAULT_AGENCY_BASE_URL = 'https://createsomething.agency';

export function resolveAgencyBaseUrl(platform?: App.Platform) {
	const configuredValue = platform?.env?.AGENCY_BASE_URL?.trim();

	if (!configuredValue) {
		return DEFAULT_AGENCY_BASE_URL;
	}

	try {
		return new URL(configuredValue).toString();
	} catch {
		return DEFAULT_AGENCY_BASE_URL;
	}
}

export function buildAgencyControlPlaneUrl(
	surface: ControlPlaneSurface,
	requestUrl: URL,
	platform?: App.Platform
) {
	const target = new URL(CONTROL_PLANE_SURFACES[surface].path, resolveAgencyBaseUrl(platform));
	const forwardedParams = ['source', 'threadId', 'tool'] as const;

	for (const key of forwardedParams) {
		const value = requestUrl.searchParams.get(key);
		if (value) {
			target.searchParams.set(key, value);
		}
	}

	if (!target.searchParams.has('source')) {
		target.searchParams.set('source', 'abundance-concierge');
	}

	return target;
}
