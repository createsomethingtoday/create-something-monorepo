import { describe, expect, it, vi } from 'vitest';
import { getReviewCommentsClient } from './review-comments';

const ENV = { REVIEW_COMMENTS_URL: 'https://comments.example/', REVIEW_COMMENTS_API_KEY: 'service-key' };

function reply(data: unknown, status = 200) {
	const success = status < 400;
	return new Response(JSON.stringify(success ? { success, data } : { success, error: data }), { status });
}

const summary = {
	versionRef: 'recVer2',
	assetRef: 'recAsset1',
	setAt: '2026-11-18T10:00:00.000Z',
	outcome: 'changes_requested',
	qualityRating: '🥇Exceptional',
	improvementAreas: [],
	creatorTrustLevel: 3,
	assetType: 'Template',
	text: {
		before: ['We have reviewed your Template.'],
		areasLabel: null,
		areas: [],
		after: ['Please review the feedback above.'],
		links: [{ phrase: 'quality rubric', url: 'https://webflow.com/templates/grading-rubric' }]
	}
};

describe('listSummariesByAsset', () => {
	it('reads the summaries as the creator and drops fields the card never shows', async () => {
		const fetcher = vi.fn().mockResolvedValue(reply([summary]));
		const client = getReviewCommentsClient(ENV, fetcher as never)!;

		const result = await client.listSummariesByAsset('recAsset1', 'creator@example.com');

		const [url, init] = fetcher.mock.calls[0];
		expect(url).toBe('https://comments.example/v1/assets/recAsset1/summaries');
		expect(init.headers).toMatchObject({
			Authorization: 'Bearer service-key',
			'X-Actor-Email': 'creator@example.com',
			'X-Actor-Role': 'creator'
		});
		expect(result).toHaveLength(1);
		expect(result[0].qualityRating).toBe('🥇Exceptional');
		expect(JSON.stringify(result)).not.toMatch(/creatorTrustLevel|assetType/);
	});

	it('returns no summaries, and does not throw, when the service fails', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		for (const fetcher of [
			vi.fn().mockResolvedValue(reply('internal error', 500)),
			vi.fn().mockRejectedValue(new Error('offline')),
			vi.fn().mockResolvedValue(new Response('not json', { status: 200 }))
		]) {
			const client = getReviewCommentsClient(ENV, fetcher as never)!;
			await expect(client.listSummariesByAsset('recAsset1', 'creator@example.com')).resolves.toEqual([]);
		}
		expect(log).toHaveBeenCalledTimes(3);
		log.mockRestore();
	});

	it('tolerates a malformed summary body', async () => {
		const fetcher = vi.fn().mockResolvedValue(reply([{ versionRef: 'recVer2', text: null }]));
		const client = getReviewCommentsClient(ENV, fetcher as never)!;
		const [result] = await client.listSummariesByAsset('recAsset1', 'creator@example.com');
		expect(result.text).toEqual({ before: [], areasLabel: null, areas: [], after: [], links: [] });
	});
});

describe('listEventsByAsset', () => {
	const started = { id: 'e1', versionRef: 'recVer2', assetRef: 'recAsset1', kind: 'review_started', occurredAt: '2026-11-24T20:00:00.000Z' };

	it('reads the events as the creator and keeps only the version, the kind and the time', async () => {
		const fetcher = vi.fn().mockResolvedValue(reply([{ ...started, email: 'sent', emailSentAt: started.occurredAt }]));
		const client = getReviewCommentsClient(ENV, fetcher as never)!;

		const result = await client.listEventsByAsset('recAsset1', 'creator@example.com');

		const [url, init] = fetcher.mock.calls[0];
		expect(url).toBe('https://comments.example/v1/assets/recAsset1/events');
		expect(init.headers).toMatchObject({ 'X-Actor-Email': 'creator@example.com', 'X-Actor-Role': 'creator' });
		expect(result).toEqual([{ versionRef: 'recVer2', kind: 'review_started', occurredAt: '2026-11-24T20:00:00.000Z' }]);
	});

	it('drops events of an unknown kind or with no valid time', async () => {
		const fetcher = vi.fn().mockResolvedValue(
			reply([null, { ...started, kind: 'something_else' }, { ...started, occurredAt: 'soon' }, { id: 'c1', versionRef: 'recVer2', body: 'a comment' }, started])
		);
		const client = getReviewCommentsClient(ENV, fetcher as never)!;
		expect(await client.listEventsByAsset('recAsset1', 'creator@example.com')).toHaveLength(1);
	});

	it('returns no events, and does not throw, when the service fails', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		for (const fetcher of [
			vi.fn().mockResolvedValue(reply('internal error', 500)),
			vi.fn().mockRejectedValue(new Error('offline')),
			vi.fn().mockResolvedValue(reply({ not: 'a list' }))
		]) {
			const client = getReviewCommentsClient(ENV, fetcher as never)!;
			await expect(client.listEventsByAsset('recAsset1', 'creator@example.com')).resolves.toEqual([]);
		}
		expect(log).toHaveBeenCalledTimes(2);
		log.mockRestore();
	});
});
