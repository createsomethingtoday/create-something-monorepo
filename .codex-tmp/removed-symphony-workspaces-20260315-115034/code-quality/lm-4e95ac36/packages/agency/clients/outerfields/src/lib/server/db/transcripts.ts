import type { D1Database } from '@cloudflare/workers-types';

export interface TranscriptSegment {
	start: number; // seconds
	end: number; // seconds
	text: string;
}

export interface Transcript {
	id: string;
	video_id: string;
	segments: TranscriptSegment[];
	language: string;
	generated_at: number;
	word_count: number | null;
	duration_covered: number | null;
}

interface TranscriptRow {
	id: string;
	video_id: string;
	segments: string; // JSON string
	language: string;
	generated_at: number;
	word_count: number | null;
	duration_covered: number | null;
}

/**
 * Get transcript for a video
 */
export async function getTranscript(db: D1Database, videoId: string): Promise<Transcript | null> {
	const result = await db
		.prepare('SELECT * FROM transcripts WHERE video_id = ?')
		.bind(videoId)
		.first<TranscriptRow>();

	if (!result) return null;

	return {
		...result,
		segments: JSON.parse(result.segments) as TranscriptSegment[]
	};
}

/**
 * Check if a transcript exists for a video
 */
export async function hasTranscript(db: D1Database, videoId: string): Promise<boolean> {
	const result = await db
		.prepare('SELECT 1 FROM transcripts WHERE video_id = ? LIMIT 1')
		.bind(videoId)
		.first();

	return result !== null;
}

/**
 * Create or update a transcript
 */
export async function upsertTranscript(
	db: D1Database,
	videoId: string,
	segments: TranscriptSegment[],
	language = 'en'
): Promise<Transcript> {
	const id = `trx_${videoId}`;
	const now = Math.floor(Date.now() / 1000);
	const segmentsJson = JSON.stringify(segments);
	
	// Calculate stats
	const wordCount = segments.reduce((acc, seg) => {
		return acc + seg.text.split(/\s+/).filter(Boolean).length;
	}, 0);
	
	const durationCovered = segments.length > 0
		? Math.ceil(segments[segments.length - 1].end - segments[0].start)
		: 0;

	await db
		.prepare(`
			INSERT INTO transcripts (id, video_id, segments, language, generated_at, word_count, duration_covered)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(video_id) DO UPDATE SET
				segments = excluded.segments,
				language = excluded.language,
				generated_at = excluded.generated_at,
				word_count = excluded.word_count,
				duration_covered = excluded.duration_covered
		`)
		.bind(id, videoId, segmentsJson, language, now, wordCount, durationCovered)
		.run();

	return {
		id,
		video_id: videoId,
		segments,
		language,
		generated_at: now,
		word_count: wordCount,
		duration_covered: durationCovered
	};
}

/**
 * Delete a transcript
 */
export async function deleteTranscript(db: D1Database, videoId: string): Promise<boolean> {
	const result = await db
		.prepare('DELETE FROM transcripts WHERE video_id = ?')
		.bind(videoId)
		.run();

	return result.meta.changes > 0;
}

/**
 * Search within transcripts
 */
export async function searchTranscripts(
	db: D1Database,
	query: string,
	limit = 20
): Promise<{ video_id: string; matches: TranscriptSegment[] }[]> {
	// Get all transcripts that might contain the query
	const results = await db
		.prepare(`
			SELECT video_id, segments 
			FROM transcripts 
			WHERE segments LIKE ?
			LIMIT ?
		`)
		.bind(`%${query}%`, limit * 2) // Over-fetch since we'll filter
		.all<{ video_id: string; segments: string }>();

	if (!results.results) return [];

	const searchResults: { video_id: string; matches: TranscriptSegment[] }[] = [];
	const lowerQuery = query.toLowerCase();

	for (const row of results.results) {
		const segments = JSON.parse(row.segments) as TranscriptSegment[];
		const matches = segments.filter(seg => 
			seg.text.toLowerCase().includes(lowerQuery)
		);

		if (matches.length > 0) {
			searchResults.push({
				video_id: row.video_id,
				matches
			});
		}

		if (searchResults.length >= limit) break;
	}

	return searchResults;
}

/**
 * Get segment at a specific time
 */
export function getSegmentAtTime(segments: TranscriptSegment[], time: number): TranscriptSegment | null {
	return segments.find(seg => time >= seg.start && time <= seg.end) || null;
}

/**
 * Get segments in a time range
 */
export function getSegmentsInRange(
	segments: TranscriptSegment[],
	startTime: number,
	endTime: number
): TranscriptSegment[] {
	return segments.filter(seg => 
		(seg.start >= startTime && seg.start <= endTime) ||
		(seg.end >= startTime && seg.end <= endTime) ||
		(seg.start <= startTime && seg.end >= endTime)
	);
}
