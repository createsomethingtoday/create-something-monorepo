import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SAVVYCAL_API_BASE = 'https://api.savvycal.com/v1';
const LINK_SLUG = 'createsomething/together';

interface CreateEventRequest {
	start_at: string;
	end_at: string;
	name: string;
	email: string;
	timezone: string;
	company?: string;
	notes?: string;
}

interface SavvyCalEvent {
	id: string;
	start_at: string;
	end_at: string;
	name: string;
	email: string;
	timezone: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const apiKey = platform?.env?.SAVVYCAL_API_KEY;

	if (!apiKey) {
		throw error(500, 'SavvyCal API key not configured');
	}

	let body: CreateEventRequest;

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Validate required fields
	const { start_at, end_at, name, email, timezone, company, notes } = body;

	if (!start_at || !end_at || !name || !email || !timezone) {
		throw error(400, 'Missing required fields: start_at, end_at, name, email, timezone');
	}

	// Basic email validation
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw error(400, 'Invalid email address');
	}

	try {
		// Build questions object for additional fields
		const questions: Record<string, string> = {};
		if (company) {
			questions.company = company;
		}
		if (notes) {
			questions.notes = notes;
		}

		const eventData = {
			start_at,
			end_at,
			name,
			email,
			timezone,
			...(Object.keys(questions).length > 0 && { questions })
		};

		const response = await fetch(`${SAVVYCAL_API_BASE}/links/${LINK_SLUG}/events`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(eventData)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('SavvyCal API error:', response.status, errorText);

			if (response.status === 409) {
				throw error(409, 'This time slot is no longer available');
			}

			throw error(response.status, 'Failed to create booking');
		}

		const data: { data: SavvyCalEvent } = await response.json();

		// Track booking completion
		if (platform?.env?.DB) {
			try {
				await platform.env.DB.prepare(
					`INSERT INTO analytics_events (event_type, property, path, metadata, created_at)
					 VALUES (?, ?, ?, ?, datetime('now'))`
				)
					.bind(
						'booking_completed',
						'agency',
						'/book',
						JSON.stringify({
							event_id: data.data.id,
							email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Partial redaction
						})
					)
					.run();
			} catch (analyticsError) {
				// Don't fail booking if analytics fails
				console.error('Analytics tracking error:', analyticsError);
			}
		}

		return json({
			success: true,
			event: {
				id: data.data.id,
				start_at: data.data.start_at,
				end_at: data.data.end_at,
				name: data.data.name,
				timezone: data.data.timezone
			}
		});
	} catch (err) {
		console.error('Error creating booking:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to create booking');
	}
};
