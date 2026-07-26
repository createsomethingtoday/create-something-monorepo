import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	READINESS_CACHE_KEY,
	fetchScoreboardForDate,
	type ScoreboardCache,
} from './scoreboard';

class MemoryCache implements ScoreboardCache {
	private values = new Map<string, string>();

	async get(key: string): Promise<string | null> {
		return this.values.get(key) ?? null;
	}

	async put(key: string, value: string): Promise<void> {
		this.values.set(key, value);
	}

	delete(key: string): void {
		this.values.delete(key);
	}
}

function espnEvent() {
	return {
		id: '401810357',
		date: '2026-01-06T00:00:00Z',
		status: {
			displayClock: '0:00',
			period: 4,
			type: { state: 'post', completed: true, description: 'Final' },
		},
		competitions: [
			{
				venue: { fullName: 'Little Caesars Arena' },
				competitors: [
					{
						id: '8',
						homeAway: 'home',
						score: '121',
						team: { id: '8', location: 'Detroit', name: 'Pistons', abbreviation: 'DET' },
					},
					{
						id: '18',
						homeAway: 'away',
						score: '90',
						team: { id: '18', location: 'New York', name: 'Knicks', abbreviation: 'NYK' },
					},
				],
			},
		],
	};
}

describe('scoreboard provider fallback', () => {
	it('returns a truthful empty slate when the NBA CDN fails and ESPN has no games', async () => {
		const calls: string[] = [];
		const fetchImpl: typeof fetch = async (input) => {
			const url = input.toString();
			calls.push(url);
			if (url.includes('cdn.nba.com')) return new Response('forbidden', { status: 403 });
			return Response.json({ events: [] });
		};

		const result = await fetchScoreboardForDate('2026-07-16', {
			today: '2026-07-16',
			cache: new MemoryCache(),
			fetchImpl,
			nbaApiBaseUrl: 'https://cdn.nba.com/static/json',
			espnApiBaseUrl: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba',
			now: () => new Date('2026-07-17T03:30:00Z'),
		});

		assert.equal(result.data.scoreboard.games.length, 0);
		assert.equal(result.metadata.source, 'espn');
		assert.equal(result.metadata.degraded, true);
		assert.equal(result.metadata.capabilities.advancedAnalytics, false);
		assert.match(result.metadata.primaryError ?? '', /403/);
		assert.equal(calls.length, 2);
	});

	it('adapts a completed ESPN slate without claiming NBA analytics capability', async () => {
		const result = await fetchScoreboardForDate('2026-01-05', {
			today: '2026-07-16',
			cache: new MemoryCache(),
			fetchImpl: async () => Response.json({ events: [espnEvent()] }),
			nbaApiBaseUrl: 'https://cdn.nba.com/static/json',
			espnApiBaseUrl: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba',
			now: () => new Date('2026-07-17T03:30:00Z'),
		});

		assert.equal(result.data.scoreboard.gameDate, '2026-01-05');
		assert.equal(result.data.scoreboard.games[0]?.gameStatus, 3);
		assert.equal(result.data.scoreboard.games[0]?.homeTeam.teamTricode, 'DET');
		assert.equal(result.metadata.source, 'espn');
		assert.equal(result.metadata.capabilities.playByPlay, false);
	});

	it('normalizes provider abbreviations to NBA tricodes', async () => {
		const event = espnEvent();
		event.competitions[0].competitors[1].team.abbreviation = 'NY';
		const result = await fetchScoreboardForDate('2026-01-05', {
			today: '2026-07-16',
			cache: new MemoryCache(),
			fetchImpl: async () => Response.json({ events: [event] }),
			nbaApiBaseUrl: 'https://cdn.nba.com/static/json',
			espnApiBaseUrl: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba',
		});

		assert.equal(result.data.scoreboard.games[0]?.awayTeam.teamTricode, 'NYK');
	});

	it('keeps readiness scoped to the current slate when historical dates are requested', async () => {
		const cache = new MemoryCache();
		let now = new Date('2026-07-17T03:30:00Z');
		const dependencies = {
			today: '2026-07-16',
			cache,
			fetchImpl: async (input: RequestInfo | URL) =>
				input.toString().includes('cdn.nba.com')
					? new Response('forbidden', { status: 403 })
					: Response.json({ events: [] }),
			nbaApiBaseUrl: 'https://cdn.nba.com/static/json',
			espnApiBaseUrl: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba',
			now: () => now,
		};

		await fetchScoreboardForDate('2026-07-16', dependencies);
		now = new Date('2026-07-17T04:00:00Z');
		await fetchScoreboardForDate('2026-01-05', dependencies);

		const readiness = JSON.parse((await cache.get(READINESS_CACHE_KEY)) ?? '{}') as {
			checkedAt?: string;
			primary?: string;
			servingSource?: string;
		};
		assert.equal(readiness.checkedAt, '2026-07-17T03:30:00.000Z');
		assert.equal(readiness.primary, 'unavailable');
		assert.equal(readiness.servingSource, 'espn');
	});

	it('serves last-known-good data as stale when both providers fail', async () => {
		const cache = new MemoryCache();
		const dependencies = {
			today: '2026-07-16',
			cache,
			nbaApiBaseUrl: 'https://cdn.nba.com/static/json',
			espnApiBaseUrl: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba',
			now: () => new Date('2026-07-17T03:30:00Z'),
		};

		await fetchScoreboardForDate('2026-07-16', {
			...dependencies,
			fetchImpl: async (input) =>
				input.toString().includes('cdn.nba.com')
					? new Response('forbidden', { status: 403 })
					: Response.json({ events: [] }),
		});
		cache.delete('nba:scoreboard:v2:2026-07-16');

		const stale = await fetchScoreboardForDate('2026-07-16', {
			...dependencies,
			fetchImpl: async () => new Response('down', { status: 503 }),
		});

		assert.equal(stale.metadata.stale, true);
		assert.equal(stale.metadata.degraded, true);
		assert.match(stale.metadata.primaryError ?? '', /503/);
		const readiness = JSON.parse((await cache.get(READINESS_CACHE_KEY)) ?? '{}') as {
			status?: string;
		};
		assert.equal(readiness.status, 'degraded');
	});
});
