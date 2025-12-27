import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SAVVYCAL_API_BASE = 'https://api.savvycal.com/v1';
const TARGET_LINK_SLUG = 'together'; // The slug part of the link URL

interface SavvyCalSlot {
	start_at: string;
	end_at: string;
}

interface SavvyCalLink {
	id: string;
	slug: string;
	name: string;
}

// Cache the link ID to avoid repeated lookups
let cachedLinkId: string | null = null;

async function getLinkId(apiKey: string): Promise<string | null> {
	if (cachedLinkId) return cachedLinkId;

	const response = await fetch(`${SAVVYCAL_API_BASE}/links`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		console.error('Failed to fetch links:', response.status);
		return null;
	}

	const data = (await response.json()) as { entries?: SavvyCalLink[] };
	console.log('SavvyCal links:', JSON.stringify(data).slice(0, 500));

	const links = data.entries || [];
	const targetLink = links.find((link) => link.slug === TARGET_LINK_SLUG);

	if (targetLink) {
		cachedLinkId = targetLink.id;
		console.log('Found link ID:', cachedLinkId, 'for slug:', TARGET_LINK_SLUG);
		return cachedLinkId;
	}

	console.error('Link not found for slug:', TARGET_LINK_SLUG);
	return null;
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
		// Get the link ID first
		const linkId = await getLinkId(apiKey);
		if (!linkId) {
			console.error('Could not find SavvyCal link');
			return json({ slots: [], timezone });
		}

		const params = new URLSearchParams({
			start_date: startDate,
			end_date: endDate,
			timezone
		});

		const apiUrl = `${SAVVYCAL_API_BASE}/links/${linkId}/slots?${params}`;
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
