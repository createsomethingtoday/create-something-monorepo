import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { fetchGameBoxScore, fetchLiveGames, fetchRecentHistory } from './api';

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

	it('maps recent archive slates with per-game analysis capability', async () => {
		globalThis.fetch = async (input) => {
			assert.match(input.toString(), /\/games\/recent\?before=2026-07-16&limit=3$/);
			return Response.json({
				success: true,
				data: {
					source: 'archive',
					degraded: false,
					stale: false,
					fetchedAt: '2026-06-14T07:00:03.584Z',
					slates: [{
						date: '2026-06-13',
						games: [{
							gameId: '0042500405',
							gameStatus: 3,
							gameStatusText: 'Final',
							period: 4,
							gameClock: '0.0',
							gameTimeUTC: '2026-06-14T00:30:00Z',
							homeTeam: { teamId: 24, teamName: 'Spurs', teamCity: 'San Antonio', teamTricode: 'SAS', score: 90 },
							awayTeam: { teamId: 18, teamName: 'Knicks', teamCity: 'New York', teamTricode: 'NYK', score: 94 },
							capabilities: { playByPlay: true, boxScore: true, advancedAnalytics: true },
						}],
					}],
				},
			});
		};

		const result = await fetchRecentHistory('2026-07-16', 3);

		assert.equal(result.success, true);
		if (!result.success) return;
		assert.equal(result.data.source, 'archive');
		assert.equal(result.data.slates[0]?.games[0]?.id, '0042500405');
		assert.equal(result.data.slates[0]?.games[0]?.analyticsAvailable, true);
		assert.equal(result.data.slates[0]?.games[0]?.dataProvider, 'archive');
	});

	it('uses the configured proxy for archived box scores', async () => {
		console.error = () => undefined;
		globalThis.fetch = async (input) => {
			assert.equal(input.toString(), 'http://127.0.0.1:8792/game/0042500405/boxscore');
			return Response.json({ success: false, error: 'expected test response' }, { status: 503 });
		};

		const result = await fetchGameBoxScore('0042500405', 'http://127.0.0.1:8792');
		assert.equal(result.success, false);
	});
});
