import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createLogger } from '@create-something/components/utils';

const logger = createLogger('BookingCreateAPI');
const SAVVYCAL_API_BASE = 'https://api.savvycal.com/v1';
const TARGET_LINK_SLUG = 'together';

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
	display_name: string;
	email: string;
	time_zone: string;
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
		logger.error('Failed to fetch SavvyCal links', { status: response.status });
		return null;
	}

	const data = (await response.json()) as { entries?: SavvyCalLink[] };
	const links = data.entries || [];
	const targetLink = links.find((link) => link.slug === TARGET_LINK_SLUG);

	if (targetLink) {
		cachedLinkId = targetLink.id;
		return cachedLinkId;
	}

	logger.error('SavvyCal link not found', { slug: TARGET_LINK_SLUG });
	return null;
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

		// Get the link ID first
		const linkId = await getLinkId(apiKey);
		if (!linkId) {
			throw error(500, 'Booking service temporarily unavailable');
		}

		const eventData = {
			start_at,
			end_at,
			display_name: name,
			email,
			time_zone: timezone,
			...(Object.keys(questions).length > 0 && { questions })
		};

		const response = await fetch(`${SAVVYCAL_API_BASE}/links/${linkId}/events`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(eventData)
		});

		if (!response.ok) {
			const errorText = await response.text();
			logger.error('SavvyCal API error', { 
				status: response.status, 
				error: errorText,
				linkId,
				email 
			});

			if (response.status === 409) {
				throw error(409, 'This time slot is no longer available');
			}
			if (response.status === 422) {
				throw error(422, `Invalid booking data: ${errorText}`);
			}

			throw error(response.status, `Failed to create booking: ${errorText}`);
		}

		const rawResponse = (await response.json()) as Record<string, unknown>;
		logger.debug('SavvyCal response received', { eventId: rawResponse.id || rawResponse.uuid });

		// Handle different response formats
		const responseEvent = (rawResponse.data || rawResponse.event || rawResponse) as Record<string, unknown>;
		const event: SavvyCalEvent = {
			id: String(responseEvent.id || responseEvent.uuid || 'unknown'),
			start_at: String(responseEvent.start_at || start_at),
			end_at: String(responseEvent.end_at || end_at),
			display_name: String(responseEvent.display_name || responseEvent.name || name),
			email: String(responseEvent.email || email),
			time_zone: String(responseEvent.time_zone || responseEvent.timezone || timezone)
		};

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
							event_id: event.id,
							email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Partial redaction
						})
					)
					.run();
			} catch (analyticsError) {
				// Don't fail booking if analytics fails
				logger.warn('Analytics tracking failed', { error: analyticsError });
			}
		}

		logger.info('Booking created successfully', { eventId: event.id, email });

		return json({
			success: true,
			event: {
				id: event.id,
				start_at: event.start_at,
				end_at: event.end_at,
				name: event.display_name,
				timezone: event.time_zone
			}
		});
	} catch (err: unknown) {
		// Re-throw SvelteKit HttpErrors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		logger.error('Error creating booking', { error: err });
		const errMsg = err instanceof Error ? err.message : String(err);
		throw error(500, `Failed to create booking: ${errMsg}`);
	}
};
