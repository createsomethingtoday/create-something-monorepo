/**
 * POST /api/analytics
 *
 * Track analytics events (client-side)
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { trackEvent, type AnalyticsEvent, type EventType } from '$lib/services/analytics';

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env.DB) {
		throw error(500, 'Database not configured');
	}

	try {
		const body = await request.json() as {
			eventType?: string;
			templateId?: string;
			tenantId?: string;
			source?: string;
			metadata?: Record<string, unknown>;
		};
		const { eventType, templateId, tenantId, source, metadata } = body;

		if (!eventType) {
			return json({ success: false, error: 'eventType is required' }, { status: 400 });
		}

		const event: AnalyticsEvent = {
			eventType: eventType as EventType,
			templateId,
			tenantId,
			source,
			metadata,
			referrer: request.headers.get('referer') || undefined,
			userAgent: request.headers.get('user-agent') || undefined,
			ipCountry: request.headers.get('cf-ipcountry') || undefined
		};

		const eventId = await trackEvent(platform.env.DB, event);

		return json({ success: true, eventId });
	} catch (err) {
		console.error('Analytics tracking error:', err);
		return json({ success: false, error: 'Failed to track event' }, { status: 500 });
	}
};
