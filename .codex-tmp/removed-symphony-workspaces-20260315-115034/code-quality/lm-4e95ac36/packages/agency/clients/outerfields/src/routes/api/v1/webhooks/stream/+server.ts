import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { applyStreamWebhookUpdate } from '$lib/server/db/videos';
import { type StreamWebhookPayload, verifyStreamWebhookSignature } from '$lib/server/stream';
import { resolveRuntimeEnv } from '$lib/server/env';

function normalizeState(payload: StreamWebhookPayload): 'processing' | 'ready' | 'failed' {
	const state = payload.status?.state?.toLowerCase();

	if (payload.readyToStream || state === 'ready') {
		return 'ready';
	}

	if (state === 'error' || state === 'failed') {
		return 'failed';
	}

	return 'processing';
}

/**
 * POST /api/v1/webhooks/stream
 * Handles Cloudflare Stream lifecycle updates.
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);
	if (!runtimeEnv.CLOUDFLARE_STREAM_WEBHOOK_SECRET) {
		return json({ success: false, error: 'Webhook secret is not configured' }, { status: 500 });
	}

	const rawBody = await request.text();
	const signatureHeader = request.headers.get('webhook-signature');
	const isValid = await verifyStreamWebhookSignature(
		signatureHeader,
		rawBody,
		runtimeEnv.CLOUDFLARE_STREAM_WEBHOOK_SECRET
	);

	if (!isValid) {
		return json({ success: false, error: 'Invalid webhook signature' }, { status: 401 });
	}

	let payload: StreamWebhookPayload;
	try {
		payload = JSON.parse(rawBody) as StreamWebhookPayload;
	} catch {
		return json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
	}

	if (!payload.uid) {
		return json({ success: false, error: 'Missing Stream UID' }, { status: 400 });
	}

	const state = normalizeState(payload);
	const failureReason = payload.status?.errorReasonText || payload.status?.errorReasonCode || null;

	const updatedVideo = await applyStreamWebhookUpdate(db, {
		streamUid: payload.uid,
		state,
		durationSeconds: payload.duration ? Math.round(payload.duration) : null,
		sourceBytes: payload.size ?? null,
		failureReason
	});

	if (!updatedVideo) {
		return json({ success: true, ignored: true, reason: 'stream_uid not found' }, { status: 202 });
	}

	return json({
		success: true,
		data: {
			videoId: updatedVideo.id,
			streamUid: payload.uid,
			ingestStatus: updatedVideo.ingest_status
		}
	});
};
