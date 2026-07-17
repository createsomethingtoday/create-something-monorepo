import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { fetchLiveGames } from './api';

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;

afterEach(() => {
	globalThis.fetch = originalFetch;
	console.error = originalConsoleError;
});

describe('NBA API diagnostics', () => {
	it('preserves the proxy error and correlation ID on non-2xx responses', async () => {
		console.error = () => undefined;
		globalThis.fetch = async () =>
			Response.json(
				{
					success: false,
					error: 'Scoreboard unavailable: HTTP 403',
					correlationId: 'nba-test-correlation',
				},
				{ status: 503 }
			);

		const result = await fetchLiveGames('2026-07-16');

		assert.equal(result.success, false);
		if (result.success) return;
		assert.equal(result.error.message, 'Scoreboard unavailable: HTTP 403');
		assert.equal(result.error.correlationId, 'nba-test-correlation');
		assert.equal(result.error.retryable, true);
	});
});
