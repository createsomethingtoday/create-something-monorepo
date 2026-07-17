import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import worker, { type Env } from './index';

describe('NBA history Worker route', () => {
	it('rejects an invalid recent-history date before touching dependencies', async () => {
		const response = await worker.fetch(
			new Request('https://nba.example/games/recent?before=not-a-date&limit=5'),
			{} as Env
		);
		const body = (await response.json()) as { success: boolean; error: string };

		assert.equal(response.status, 400);
		assert.equal(body.success, false);
		assert.match(body.error, /before must be a valid YYYY-MM-DD date/);
	});

	it('rejects an out-of-range history limit', async () => {
		const response = await worker.fetch(
			new Request('https://nba.example/games/recent?before=2026-07-16&limit=50'),
			{} as Env
		);
		const body = (await response.json()) as { error: string };

		assert.equal(response.status, 400);
		assert.match(body.error, /limit must be an integer between 1 and 12/);
	});
});
