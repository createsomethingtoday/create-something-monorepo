import type { PageServerLoad } from './$types';

const STATUS_URL = 'https://createsomethingtoday--cs-agents-status.modal.run';

interface PropertyStatus {
	domain: string;
	healthy: boolean;
	status_code: number;
	down_since: string | null;
}

interface Incident {
	timestamp: string;
	message: string;
}

interface StatusResponse {
	status: 'operational' | 'degraded' | 'outage';
	all_healthy: boolean;
	properties: PropertyStatus[];
	incidents: Incident[];
	updated_at: string;
}

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const response = await fetch(STATUS_URL);
		if (!response.ok) {
			throw new Error(`Status fetch failed: ${response.status}`);
		}
		const data: StatusResponse = await response.json();
		return {
			status: data,
			error: null,
		};
	} catch (err) {
		return {
			status: null,
			error: err instanceof Error ? err.message : 'Failed to fetch status',
		};
	}
};
