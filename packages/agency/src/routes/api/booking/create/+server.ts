import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import {
	recordServerConversion,
	upsertWarmLead,
	type ServerConversionInput
} from '@create-something/canon/analytics';
import { createLogger } from '@create-something/canon/utils';
import { getLinkId, SAVVYCAL_API_BASE } from '$lib/utils/savvycal';

const logger = createLogger('BookingCreateAPI');
const validSourceProperties = new Set(['space', 'io', 'agency', 'ltd', 'lms']);

interface CreateEventRequest {
	start_at: string;
	end_at: string;
	name: string;
	email: string;
	timezone: string;
	company?: string;
	notes?: string;
	experiment_id?: string;
	tag_id?: string;
	session_id?: string;
	source_property?: string;
	source?: string;
	intent?: string;
	lane?: string;
	atlas_warmup?: string;
	atlas_session_id?: string;
	atlas_readiness?: string;
	atlas_score?: number;
	atlas_agent_messages?: number;
	landing_url?: string;
	referrer?: string;
}

interface SavvyCalEvent {
	id: string;
	start_at: string;
	end_at: string;
	display_name: string;
	email: string;
	time_zone: string;
}

function normalizeSourceProperty(value: string | undefined): ServerConversionInput['sourceProperty'] {
	return value && validSourceProperties.has(value)
		? (value as ServerConversionInput['sourceProperty'])
		: undefined;
}

function normalizeOptionalToken(value: string | undefined, max = 120): string | undefined {
	const normalized = (value ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, max);

	return normalized || undefined;
}

function normalizeOptionalNumber(value: number | undefined, max: number): number | undefined {
	if (!Number.isFinite(value)) return undefined;
	return Math.max(0, Math.min(max, Math.round(Number(value))));
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const apiKey = platform?.env?.SAVVYCAL_API_KEY ?? env.SAVVYCAL_API_KEY;

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
	const {
		start_at,
		end_at,
		name,
		email,
		timezone,
		company,
		notes,
		experiment_id,
		tag_id,
		session_id,
		source_property,
		source = 'book',
		intent = 'workflow-mapping',
		lane = 'not_sure',
		atlas_warmup,
		atlas_session_id,
		atlas_readiness,
		atlas_score,
		atlas_agent_messages,
		landing_url,
		referrer
	} = body;

	if (!start_at || !end_at || !name || !email || !timezone) {
		throw error(400, 'Missing required fields: start_at, end_at, name, email, timezone');
	}

	// Basic email validation
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw error(400, 'Invalid email address');
	}

	const atlasMetadata = {
		warmup: normalizeOptionalToken(atlas_warmup),
		sessionId: normalizeOptionalToken(atlas_session_id),
		readiness: normalizeOptionalToken(atlas_readiness),
		score: normalizeOptionalNumber(atlas_score, 100),
		agentMessages: normalizeOptionalNumber(atlas_agent_messages, 200)
	};
	const hasAtlasMetadata = Object.values(atlasMetadata).some((value) => value !== undefined);

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
				await recordServerConversion(
					platform.env.DB,
					{
						property: 'agency',
						action: 'booking_completed',
						sessionId: session_id,
						sourceProperty: normalizeSourceProperty(source_property),
						url: landing_url || 'https://createsomething.agency/book',
						referrer,
						target: '/book',
						metadata: {
							eventId: event.id,
							source,
							intent,
							lane,
							...(hasAtlasMetadata && { atlas: atlasMetadata }),
							experimentId: experiment_id,
							tagId: tag_id,
							companyProvided: Boolean(company)
						}
					},
					{
						userAgent: request.headers.get('user-agent') || undefined,
						ipCountry: request.headers.get('cf-ipcountry') || undefined
					}
				);

				await upsertWarmLead(platform.env.DB, {
					name,
					email,
					company,
					source: 'website',
					sourceDetail: `booking:${source}:${intent}:${lane}${
						atlasMetadata.readiness ? `:${atlasMetadata.readiness}` : ''
					}`,
					campaign: tag_id,
					stage: 'decision',
					serviceInterest: lane,
					discoveryCallAt: event.start_at,
					notes,
					touchedAt: new Date().toISOString()
				});

				await platform.env.DB.prepare(
					`INSERT INTO analytics_events (event_type, property, path, experiment_id, tag_id, metadata, created_at)
					 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
				)
					.bind(
						'booking_completed',
						'agency',
						'/book',
						experiment_id || null,
						tag_id || null,
						JSON.stringify({
							event_id: event.id,
							email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Partial redaction
							...(hasAtlasMetadata && {
								atlas_session_id: atlasMetadata.sessionId,
								atlas_readiness: atlasMetadata.readiness,
								atlas_score: atlasMetadata.score,
								atlas_agent_messages: atlasMetadata.agentMessages
							})
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
