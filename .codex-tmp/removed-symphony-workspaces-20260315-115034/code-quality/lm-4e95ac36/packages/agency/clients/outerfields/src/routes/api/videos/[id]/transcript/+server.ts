import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getTranscript,
	hasTranscript,
	upsertTranscript,
	type TranscriptSegment
} from '$lib/server/db/transcripts';

/**
 * GET /api/videos/[id]/transcript
 * Returns transcript for a video (if available)
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
	const db = platform?.env.DB;

	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	const { id: videoId } = params;

	if (!videoId) {
		return json({ success: false, error: 'Video ID is required' }, { status: 400 });
	}

	try {
		const transcript = await getTranscript(db, videoId);

		if (!transcript) {
			return json({
				success: true,
				data: null,
				message: 'No transcript available for this video'
			});
		}

		// Check membership for full transcript access
		const user = locals.user;
		const isMember = user?.membership ?? false;

		// Non-members get a preview (first 5 segments)
		if (!isMember) {
			return json({
				success: true,
				data: {
					...transcript,
					segments: transcript.segments.slice(0, 5),
					preview: true,
					totalSegments: transcript.segments.length
				}
			});
		}

		return json({
			success: true,
			data: {
				...transcript,
				preview: false,
				totalSegments: transcript.segments.length
			}
		});
	} catch (err) {
		console.error('Error fetching transcript:', err);
		return json({ success: false, error: 'Failed to fetch transcript' }, { status: 500 });
	}
};

/**
 * POST /api/videos/[id]/transcript
 * Create or update transcript (admin only or internal use)
 */
export const POST: RequestHandler = async ({ params, platform, request, locals }) => {
	const db = platform?.env.DB;

	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	const { id: videoId } = params;

	if (!videoId) {
		return json({ success: false, error: 'Video ID is required' }, { status: 400 });
	}

	// Check for admin or API key (for automated transcript generation)
	const user = locals.user;
	const apiKey = request.headers.get('X-API-Key');
	const isAdmin = user?.role === 'admin';
	const hasValidApiKey = apiKey === platform?.env.TRANSCRIPT_API_KEY;

	if (!isAdmin && !hasValidApiKey) {
		return json({ success: false, error: 'Not authorized' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { segments, language } = body as { 
			segments: TranscriptSegment[]; 
			language?: string 
		};

		if (!segments || !Array.isArray(segments)) {
			return json({ success: false, error: 'Segments array is required' }, { status: 400 });
		}

		// Validate segment structure
		for (const seg of segments) {
			if (typeof seg.start !== 'number' || typeof seg.end !== 'number' || typeof seg.text !== 'string') {
				return json({ 
					success: false, 
					error: 'Invalid segment format. Each segment must have start, end (numbers) and text (string)' 
				}, { status: 400 });
			}
		}

		const transcript = await upsertTranscript(db, videoId, segments, language);

		return json({
			success: true,
			data: transcript
		}, { status: 201 });
	} catch (err) {
		console.error('Error creating transcript:', err);
		return json({ success: false, error: 'Failed to create transcript' }, { status: 500 });
	}
};

/**
 * HEAD /api/videos/[id]/transcript
 * Check if transcript exists
 */
export const HEAD: RequestHandler = async ({ params, platform }) => {
	const db = platform?.env.DB;

	if (!db) {
		return new Response(null, { status: 500 });
	}

	const { id: videoId } = params;

	if (!videoId) {
		return new Response(null, { status: 400 });
	}

	try {
		const exists = await hasTranscript(db, videoId);
		return new Response(null, { 
			status: exists ? 200 : 404,
			headers: {
				'X-Transcript-Available': exists ? 'true' : 'false'
			}
		});
	} catch {
		return new Response(null, { status: 500 });
	}
};
