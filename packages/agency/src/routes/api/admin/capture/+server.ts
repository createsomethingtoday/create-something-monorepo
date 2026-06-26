import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	buildCaptureReview,
	deleteCaptureReviewDecision,
	upsertCaptureReviewDecision,
	type CaptureClassification,
	type CaptureClassificationLabel,
	type CaptureRecommendedAction,
	type CaptureReviewOptions,
	type CaptureSurface,
} from '$lib/server/capture-review';
import { requireAgencyOperator } from '$lib/server/operator-auth';

interface CaptureReviewBody {
	surface?: string;
	source_id?: string;
	email?: string | null;
	email_hash?: string | null;
	classification_label?: string;
	confidence?: string;
	recommended_action?: string;
	notes?: string | null;
	metadata?: Record<string, unknown>;
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	try {
		await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const include = url.searchParams.get('include') ?? '';
		const review = await buildCaptureReview(db, {
			limit: Number.parseInt(url.searchParams.get('limit') ?? '100', 10),
			includeOperational: include === 'all' || include === 'operational',
			surface: url.searchParams.get('surface') as CaptureReviewOptions['surface'],
			classification: url.searchParams.get('classification') as CaptureReviewOptions['classification'],
			action: url.searchParams.get('action') as CaptureReviewOptions['action'],
			reviewed: url.searchParams.get('reviewed') as CaptureReviewOptions['reviewed'],
			query: url.searchParams.get('q') ?? '',
		});

		return json(review);
	} catch (error) {
		return handleError(error);
	}
};

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const operator = await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const body = (await request.json().catch(() => null)) as CaptureReviewBody | null;
		if (!body?.surface || !body.source_id || !body.classification_label || !body.recommended_action) {
			return json(
				{
					error: 'invalid_request',
					message: 'surface, source_id, classification_label, and recommended_action are required',
				},
				{ status: 400 }
			);
		}

		const decision = await upsertCaptureReviewDecision(db, {
			surface: body.surface as CaptureSurface,
			sourceId: body.source_id,
			email: body.email,
			emailHash: body.email_hash,
			classificationLabel: body.classification_label as CaptureClassificationLabel,
			confidence: body.confidence as CaptureClassification['confidence'] | undefined,
			recommendedAction: body.recommended_action as CaptureRecommendedAction,
			notes: body.notes,
			reviewedBy: operator.email,
			metadata: {
				updated_via: 'agency_capture_review_api',
				operator_id: operator.id,
				...(body.metadata ?? {}),
			},
		});

		return json({ decision });
	} catch (error) {
		return handleError(error);
	}
};

export const DELETE: RequestHandler = async ({ request, url, cookies, platform }) => {
	try {
		await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const body = (await request.json().catch(() => null)) as CaptureReviewBody | null;
		const surface = body?.surface ?? url.searchParams.get('surface');
		const sourceId = body?.source_id ?? url.searchParams.get('source_id');
		if (!surface || !sourceId) {
			return json(
				{ error: 'invalid_request', message: 'surface and source_id are required' },
				{ status: 400 }
			);
		}

		const result = await deleteCaptureReviewDecision(db, {
			surface: surface as CaptureSurface,
			sourceId,
		});

		return json(result);
	} catch (error) {
		return handleError(error);
	}
};

function handleError(error: unknown) {
	if (error && typeof error === 'object' && 'status' in error && 'body' in error) {
		const kitError = error as { status: number; body?: { message?: string } };
		return json(
			{ error: 'request_failed', message: kitError.body?.message ?? 'Request failed' },
			{ status: kitError.status }
		);
	}

	return json(
		{ error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error' },
		{ status: 500 }
	);
}
