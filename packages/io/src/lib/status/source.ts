export type PublicStatusState = 'operational' | 'degraded' | 'outage' | 'unknown';

export interface PropertyStatus {
	domain: string;
	healthy: boolean;
	status_code: number;
	down_since: string | null;
	error: string | null;
	checked_at: string;
}

export interface Incident {
	timestamp: string;
	message: string;
}

export interface PublicStatus {
	status: PublicStatusState;
	all_healthy: boolean;
	properties: PropertyStatus[];
	incidents: Incident[];
	incidentSource: { state: 'available' | 'unavailable' };
	updated_at: string;
}

interface LoadOptions {
	now?: () => Date;
	timeoutMs?: number;
}

const PROPERTY_URLS = [
	'https://createsomething.io',
	'https://createsomething.space',
	'https://createsomething.agency',
	'https://createsomething.ltd'
] as const;

const INCIDENT_URL = 'https://createsomethingtoday--cs-agents-status.modal.run';

async function fetchWithTimeout(
	fetchImpl: typeof fetch,
	url: string,
	timeoutMs: number
): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetchImpl(url, { signal: controller.signal });
	} finally {
		clearTimeout(timeout);
	}
}

function isIncident(value: unknown): value is Incident {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	return typeof candidate.timestamp === 'string' && typeof candidate.message === 'string';
}

export async function loadPublicStatus(
	fetchImpl: typeof fetch,
	options: LoadOptions = {}
): Promise<PublicStatus> {
	const now = options.now ?? (() => new Date());
	const timeoutMs = options.timeoutMs ?? 5_000;
	const updatedAt = now().toISOString();

	const propertyPromise = Promise.all(
		PROPERTY_URLS.map(async (url): Promise<PropertyStatus> => {
			const domain = new URL(url).hostname;
			try {
				const response = await fetchWithTimeout(fetchImpl, url, timeoutMs);
				return {
					domain,
					healthy: response.ok,
					status_code: response.status,
					down_since: null,
					error: response.ok ? null : `HTTP ${response.status}`,
					checked_at: updatedAt
				};
			} catch {
				return {
					domain,
					healthy: false,
					status_code: 0,
					down_since: null,
					error: 'No response before the check ended',
					checked_at: updatedAt
				};
			}
		})
	);

	const incidentPromise = (async (): Promise<{
		incidents: Incident[];
		incidentSource: PublicStatus['incidentSource'];
	}> => {
		try {
			const response = await fetchWithTimeout(fetchImpl, INCIDENT_URL, timeoutMs);
			if (response.ok) {
				const payload = (await response.json()) as { incidents?: unknown };
				return {
					incidents: Array.isArray(payload.incidents) ? payload.incidents.filter(isIncident) : [],
					incidentSource: { state: 'available' }
				};
			}
		} catch {
			// Current property checks remain useful even when incident history is unavailable.
		}
		return { incidents: [], incidentSource: { state: 'unavailable' } };
	})();

	const [propertyResults, incidentResult] = await Promise.all([propertyPromise, incidentPromise]);

	const healthyCount = propertyResults.filter((property) => property.healthy).length;
	const responseCount = propertyResults.filter((property) => property.status_code > 0).length;
	const status: PublicStatusState =
		healthyCount === propertyResults.length
			? 'operational'
			: healthyCount > 0
				? 'degraded'
				: responseCount === 0
					? 'unknown'
					: 'outage';

	return {
		status,
		all_healthy: status === 'operational',
		properties: propertyResults,
		incidents: incidentResult.incidents,
		incidentSource: incidentResult.incidentSource,
		updated_at: updatedAt
	};
}
