import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SAVVYCAL_API_BASE = 'https://api.savvycal.com/v1';
const LINK_SLUG = 'createsomething/together';

interface SavvyCalSlot {
	start_at: string;
	end_at: string;
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const apiKey = platform?.env?.SAVVYCAL_API_KEY;

	if (!apiKey) {
		console.error('SAVVYCAL_API_KEY not found in environment');
		throw error(500, 'Booking service temporarily unavailable');
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

		const apiUrl = `${SAVVYCAL_API_BASE}/links/${LINK_SLUG}/slots?${params}`;
		console.log('Fetching SavvyCal slots:', apiUrl);

		const response = await fetch(apiUrl, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('SavvyCal API error:', response.status, errorText);

			// Return empty slots instead of error for better UX
			if (response.status === 404) {
				return json({ slots: [], timezone });
			}

			throw error(response.status, 'Failed to fetch available slots');
		}

		const rawData = (await response.json()) as
			| SavvyCalSlot[]
			| { data?: SavvyCalSlot[]; slots?: SavvyCalSlot[] };
		console.log('SavvyCal response:', JSON.stringify(rawData).slice(0, 200));

		// Handle different response formats
		let slotsArray: SavvyCalSlot[] = [];

		if (Array.isArray(rawData)) {
			slotsArray = rawData;
		} else if (rawData.data && Array.isArray(rawData.data)) {
			slotsArray = rawData.data;
		} else if (rawData.slots && Array.isArray(rawData.slots)) {
			slotsArray = rawData.slots;
		}

		// Transform to simpler format
		const slots = slotsArray.map((slot: SavvyCalSlot) => ({
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
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to fetch available slots');
	}
};
