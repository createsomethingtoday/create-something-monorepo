import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createLogger } from '@create-something/canon/utils';
import { getLinkId, SAVVYCAL_API_BASE } from '$lib/utils/savvycal';

const logger = createLogger('BookingSlotsAPI');

interface SavvyCalSlot {
	start_at: string;
	end_at: string;
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const apiKey = platform?.env?.SAVVYCAL_API_KEY;

	if (!apiKey) {
		logger.error('SAVVYCAL_API_KEY not configured');
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
		// Get the link ID first
		const linkId = await getLinkId(apiKey);
		if (!linkId) {
			logger.warn('Could not find SavvyCal link, returning empty slots');
			return json({ slots: [], timezone });
		}

		const params = new URLSearchParams({
			start_date: startDate,
			end_date: endDate,
			timezone
		});

		const apiUrl = `${SAVVYCAL_API_BASE}/links/${linkId}/slots?${params}`;
		logger.debug('Fetching SavvyCal slots', { startDate, endDate, timezone });

		const response = await fetch(apiUrl, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			logger.error('SavvyCal API error', { status: response.status, error: errorText });

			// Return empty slots instead of error for better UX
			if (response.status === 404) {
				return json({ slots: [], timezone });
			}

			throw error(response.status, 'Failed to fetch available slots');
		}

		const rawData = (await response.json()) as
			| SavvyCalSlot[]
			| { data?: SavvyCalSlot[]; slots?: SavvyCalSlot[] };

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

		logger.info('Slots fetched', { count: slots.length, startDate, endDate });
		return json({
			slots,
			timezone
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		logger.error('Error fetching slots', { error: err });
		throw error(500, 'Failed to fetch available slots');
	}
};
