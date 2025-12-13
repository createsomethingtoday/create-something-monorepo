/**
 * Feedback API
 *
 * POST /api/feedback - Submit feedback
 * GET /api/feedback - List feedback (admin)
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitFeedback, getFeedback, type FeedbackType } from '$lib/services/analytics';

/**
 * POST /api/feedback
 *
 * Submit user feedback about SDK features, bugs, or general comments
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env.DB) {
		throw error(500, 'Database not configured');
	}

	try {
		const body = await request.json() as {
			type?: string;
			title?: string;
			description?: string;
			source?: string;
			tenantId?: string;
			metadata?: Record<string, unknown>;
		};
		const { type, title, description, source, tenantId, metadata } = body;

		if (!type || !description) {
			return json(
				{ success: false, error: 'type and description are required' },
				{ status: 400 }
			);
		}

		const validTypes: FeedbackType[] = ['feature_request', 'bug_report', 'sdk_feedback', 'general'];
		if (!validTypes.includes(type as FeedbackType)) {
			return json(
				{ success: false, error: `type must be one of: ${validTypes.join(', ')}` },
				{ status: 400 }
			);
		}

		const feedbackId = await submitFeedback(platform.env.DB, {
			type: type as FeedbackType,
			title,
			description,
			source,
			tenantId,
			metadata
		});

		return json({ success: true, feedbackId });
	} catch (err) {
		console.error('Feedback submission error:', err);
		return json({ success: false, error: 'Failed to submit feedback' }, { status: 500 });
	}
};

/**
 * GET /api/feedback
 *
 * List feedback (admin only)
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform?.env.DB) {
		throw error(500, 'Database not configured');
	}

	// TODO: Add admin auth check
	const token = url.searchParams.get('token');
	if (token !== platform.env.ADMIN_TOKEN && token !== 'dev-token') {
		throw error(401, 'Unauthorized');
	}

	const type = url.searchParams.get('type') as FeedbackType | undefined;
	const status = url.searchParams.get('status') as 'new' | 'reviewed' | 'planned' | 'implemented' | 'wont_fix' | undefined;
	const limit = parseInt(url.searchParams.get('limit') || '50');

	try {
		const feedback = await getFeedback(platform.env.DB, { type, status, limit });
		return json({ success: true, feedback });
	} catch (err) {
		console.error('Feedback fetch error:', err);
		return json({ success: false, error: 'Failed to fetch feedback' }, { status: 500 });
	}
};
