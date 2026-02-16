import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createGeneratedVideo } from '$lib/server/db/videos';
import { upsertSeries } from '$lib/server/db/series';

interface GeneratedIngestRequest {
	title: string;
	category: string;
	description?: string;
	episodeNumber?: number | null;
	tier?: 'free' | 'preview' | 'gated';
	seriesId?: string;
	seriesSlug?: string;
	seriesTitle?: string;
	streamUid: string;
	durationSeconds?: number;
	sourceBytes?: number;
	playbackPolicy?: 'private' | 'public';
}

function hasValidIngestToken(request: Request, token?: string): boolean {
	if (!token) return false;
	const authHeader = request.headers.get('authorization');
	if (!authHeader?.startsWith('Bearer ')) return false;
	return authHeader.slice('Bearer '.length).trim() === token;
}

/**
 * POST /api/v1/uploads/generated
 * Registers generated videos against the same ingest table/fields as creator uploads.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	const authorized = !!locals.user || hasValidIngestToken(request, platform?.env.VIDEO_INGEST_API_TOKEN);
	if (!authorized) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	let payload: GeneratedIngestRequest;
	try {
		payload = (await request.json()) as GeneratedIngestRequest;
	} catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!payload.title?.trim()) {
		return json({ success: false, error: 'title is required' }, { status: 400 });
	}
	if (!payload.category?.trim()) {
		return json({ success: false, error: 'category is required' }, { status: 400 });
	}
	if (!payload.streamUid?.trim()) {
		return json({ success: false, error: 'streamUid is required' }, { status: 400 });
	}

	let seriesId = payload.seriesId?.trim() || null;
	if (!seriesId && payload.seriesSlug?.trim() && payload.seriesTitle?.trim()) {
		const series = await upsertSeries(db, {
			slug: payload.seriesSlug,
			title: payload.seriesTitle,
			description: payload.description
		});
		seriesId = series.id;
	}

	const video = await createGeneratedVideo(db, {
		title: payload.title.trim(),
		category: payload.category.trim(),
		description: payload.description,
		episodeNumber: payload.episodeNumber,
		tier: payload.tier,
		seriesId,
		playbackPolicy: payload.playbackPolicy ?? 'private',
		ingestSource: 'generated',
		streamUid: payload.streamUid.trim(),
		durationSeconds: payload.durationSeconds,
		sourceBytes: payload.sourceBytes
	});

	return json({
		success: true,
		data: {
			videoId: video.id,
			streamUid: video.stream_uid,
			ingestStatus: video.ingest_status,
			seriesId: video.series_id
		}
	});
};
