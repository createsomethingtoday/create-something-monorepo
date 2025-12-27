import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SAVVYCAL_API_BASE = 'https://api.savvycal.com/v1';
const LINK_SLUG = 'createsomething/together';

interface SavvyCalSlot {
	start_at: string;
	end_at: string;
}

interface SlotsResponse {
	data: SavvyCalSlot[];
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const apiKey = platform?.env?.SAVVYCAL_API_KEY;

	if (!apiKey) {
		throw error(500, 'SavvyCal API key not configured');
	}

	// Get query params
	const startDate = url.searchParams.get('start_date');
	const endDate = url.searchParams.get('end_date');
	const timezone = url.searchParams.get('timezone') || 'America/Los_Angeles';

	if (!startDate || !endDate) {
		throw error(400, 'start_date and end_date are required');
	}

	try {
		const params = new URLSearchParams({
			start_date: startDate,
			end_date: endDate,
			timezone
		});

		const response = await fetch(
			`${SAVVYCAL_API_BASE}/links/${LINK_SLUG}/slots?${params}`,
			{
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				}
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('SavvyCal API error:', response.status, errorText);
			throw error(response.status, 'Failed to fetch available slots');
		}

		const data: SlotsResponse = await response.json();

		// Transform to simpler format
		const slots = data.data.map((slot) => ({
			start_at: slot.start_at,
			end_at: slot.end_at,
			duration_minutes: Math.round(
				(new Date(slot.end_at).getTime() - new Date(slot.start_at).getTime()) / 60000
			)
		}));

		return json({
			slots,
			timezone
		});
	} catch (err) {
		console.error('Error fetching slots:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to fetch available slots');
	}
};
