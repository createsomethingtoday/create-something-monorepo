import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fetchRecentHistory, readArchivedGamePayload } from './archive';

function archiveDatabase(payload: unknown, table = 'pbp_archive'): D1Database {
	return {
		prepare(query: string) {
			assert.match(query, new RegExp(table));
			return {
				bind(gameId: string) {
					assert.equal(gameId, '0042500405');
					return {
						async first() {
							return {
								payload_json: JSON.stringify(payload),
								archived_at: 1781420403584,
							};
						},
					};
				},
			};
		},
	} as unknown as D1Database;
}

describe('NBA historical archive', () => {
	it('reads archived play-by-play through the public archive boundary', async () => {
		const payload = { game: { gameId: '0042500405', actions: [{ actionNumber: 1 }] } };
		const archived = await readArchivedGamePayload(
			archiveDatabase(payload),
			'0042500405',
			'play-by-play'
		);

		assert.deepEqual(archived, {
			data: payload,
			archivedAt: '2026-06-14T07:00:03.584Z',
		});
	});

	it('reads archived box scores through the same public boundary', async () => {
		const payload = { game: { gameId: '0042500405', homeTeam: { score: 90 } } };
		const archived = await readArchivedGamePayload(
			archiveDatabase(payload, 'boxscore_archive'),
			'0042500405',
			'box-score'
		);

		assert.deepEqual(archived?.data, payload);
	});

	it('returns the newest archived slates with per-game archive capabilities', async () => {
		const snapshot = (date: string, gameId: string) => ({
			date,
			captured_at: Date.parse(`${date}T10:00:00Z`),
			scoreboard_json: JSON.stringify({
				scoreboard: {
					gameDate: date,
					games: [
						{
							gameId,
							gameStatus: 3,
							gameStatusText: 'Final',
							period: 4,
							gameClock: '0.0',
							gameTimeUTC: `${date}T23:00:00Z`,
							homeTeam: { teamId: 1, teamName: 'Spurs', teamCity: 'San Antonio', teamTricode: 'SAS', score: 90 },
							awayTeam: { teamId: 2, teamName: 'Knicks', teamCity: 'New York', teamTricode: 'NYK', score: 94 },
						},
					],
				},
			}),
		});
		const database = {
			prepare(query: string) {
				if (query.includes('game_snapshots')) {
					return {
						bind(before: string, limit: number) {
							assert.equal(before, '2026-07-16');
							assert.equal(limit, 2);
							return {
								async all() {
									return {
										results: [snapshot('2026-06-10', 'game-4'), snapshot('2026-06-13', 'game-5')],
									};
								},
							};
						},
					};
				}
				assert.match(query, /archive_metadata/);
				return {
					bind() {
						return {
							async all() {
								return {
									results: [
										{ game_id: 'game-5', has_pbp: 1, has_boxscore: 1 },
										{ game_id: 'game-4', has_pbp: 1, has_boxscore: 0 },
									],
								};
							},
						};
					},
				};
			},
		} as unknown as D1Database;

		const history = await fetchRecentHistory(database, {
			before: '2026-07-16',
			limit: 2,
			fetchImpl: async () => {
				throw new Error('archive result must not call ESPN');
			},
			espnApiBaseUrl: 'https://example.test/nba',
			now: () => new Date('2026-07-17T04:00:00Z'),
		});

		assert.equal(history.source, 'archive');
		assert.deepEqual(history.slates.map((slate) => slate.date), ['2026-06-13', '2026-06-10']);
		assert.deepEqual(history.slates[0]?.games[0]?.capabilities, {
			playByPlay: true,
			boxScore: true,
			advancedAnalytics: true,
		});
		assert.equal(history.slates[1]?.games[0]?.capabilities.advancedAnalytics, false);
	});

	it('falls back to bounded ESPN discovery without claiming archive analytics', async () => {
		const database = {
			prepare(query: string) {
				assert.match(query, /game_snapshots/);
				return {
					bind() {
						return { async all() { return { results: [] }; } };
					},
				};
			},
		} as unknown as D1Database;
		let requestedUrl = '';
		const history = await fetchRecentHistory(database, {
			before: '2026-07-16',
			limit: 3,
			fetchImpl: async (input) => {
				requestedUrl = input.toString();
				return Response.json({
					events: [
						{
							id: '401859967',
							date: '2026-06-14T00:30:00Z',
							status: { period: 4, displayClock: '0.0', type: { state: 'post', completed: true, description: 'Final' } },
							competitions: [{
								competitors: [
									{ id: '24', homeAway: 'home', score: '90', team: { id: '24', location: 'San Antonio', name: 'Spurs', abbreviation: 'SA' } },
									{ id: '18', homeAway: 'away', score: '94', team: { id: '18', location: 'New York', name: 'Knicks', abbreviation: 'NY' } },
								],
							}],
						},
					],
				});
			},
			espnApiBaseUrl: 'https://example.test/nba',
			now: () => new Date('2026-07-17T04:00:00Z'),
		});

		assert.equal(requestedUrl, 'https://example.test/nba/scoreboard?dates=20260117-20260715&limit=1000');
		assert.equal(history.source, 'espn');
		assert.equal(history.degraded, true);
		assert.equal(history.slates[0]?.date, '2026-06-13');
		assert.equal(history.slates[0]?.games[0]?.awayTeam.teamTricode, 'NYK');
		assert.equal(history.slates[0]?.games[0]?.capabilities.advancedAnalytics, false);
	});

	it('uses the same bounded fallback when D1 history is unavailable', async () => {
		const database = {
			prepare() {
				throw new Error('D1 unavailable');
			},
		} as unknown as D1Database;
		let fetched = false;
		const history = await fetchRecentHistory(database, {
			before: '2026-07-16',
			limit: 3,
			fetchImpl: async () => {
				fetched = true;
				return Response.json({ events: [] });
			},
			espnApiBaseUrl: 'https://example.test/nba',
		});

		assert.equal(fetched, true);
		assert.equal(history.source, 'espn');
		assert.deepEqual(history.slates, []);
	});

	it('skips malformed archive rows instead of presenting fabricated history', async () => {
		const database = {
			prepare(query: string) {
				assert.match(query, /game_snapshots/);
				return {
					bind() {
						return {
							async all() {
								return { results: [{ date: '2026-06-13', scoreboard_json: '{broken', captured_at: 1 }] };
							},
						};
					},
				};
			},
		} as unknown as D1Database;
		const history = await fetchRecentHistory(database, {
			before: '2026-07-16',
			limit: 3,
			fetchImpl: async () => Response.json({ events: [] }),
			espnApiBaseUrl: 'https://example.test/nba',
		});

		assert.equal(history.source, 'espn');
		assert.deepEqual(history.slates, []);
	});
});
