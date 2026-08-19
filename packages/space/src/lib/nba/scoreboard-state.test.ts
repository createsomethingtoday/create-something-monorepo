import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Game } from './types';
import {
	deriveScoreboardView,
	formatNbaDate,
	selectDefaultAnalyticsGame,
	shiftNbaDate,
} from './scoreboard-state';

function game(status: Game['status'], startTime = '2026-07-17T00:00:00Z'): Game {
	return {
		id: `${status}-game`,
		homeTeam: { id: '1', name: 'Home', abbreviation: 'HOM', city: 'Home', conference: 'East' },
		awayTeam: { id: '2', name: 'Away', abbreviation: 'AWY', city: 'Away', conference: 'West' },
		homeScore: status === 'scheduled' ? 0 : 100,
		awayScore: status === 'scheduled' ? 0 : 98,
		status,
		quarter: status === 'scheduled' ? 0 : 4,
		gameClock: '',
		startTime,
	};
}

describe('NBA scoreboard view state', () => {
	it('opens the analysis choices for a sole archived game by default', () => {
		const archivedGame = { ...game('final'), analyticsAvailable: true };

		assert.equal(selectDefaultAnalyticsGame([archivedGame], 'past')?.id, archivedGame.id);
		assert.equal(selectDefaultAnalyticsGame([archivedGame], 'today'), null);
		assert.equal(
			selectDefaultAnalyticsGame([archivedGame, { ...archivedGame, id: 'second' }], 'past'),
			null
		);
		assert.equal(
			selectDefaultAnalyticsGame([{ ...archivedGame, analyticsAvailable: false }], 'past'),
			null
		);
	});

	it('distinguishes every user-visible slate state', () => {
		const base = { currentDate: '2026-07-16', nbaToday: '2026-07-16', stale: false };

		assert.equal(deriveScoreboardView({ ...base, games: [], error: 'feed down' }).state, 'unavailable');
		assert.equal(deriveScoreboardView({ ...base, games: [], error: null }).state, 'off_day');
		assert.equal(deriveScoreboardView({ ...base, games: [game('scheduled')], error: null }).state, 'pregame');
		assert.equal(deriveScoreboardView({ ...base, games: [game('live')], error: null }).state, 'live');
		assert.equal(deriveScoreboardView({ ...base, games: [game('final')], error: null }).state, 'complete');
		assert.equal(
			deriveScoreboardView({ ...base, games: [game('final')], error: null, stale: true }).state,
			'stale'
		);
	});

	it('returns the next scheduled game for a pregame slate', () => {
		const later = game('scheduled', '2026-07-17T02:00:00Z');
		const earlier = { ...game('scheduled', '2026-07-17T00:00:00Z'), id: 'earlier' };
		const view = deriveScoreboardView({
			currentDate: '2026-07-16',
			nbaToday: '2026-07-16',
			games: [later, earlier],
			error: null,
			stale: false,
		});

		assert.equal(view.nextGame?.id, 'earlier');
	});

	it('distinguishes past archive dates from future schedule dates', () => {
		const common = { games: [], error: null, stale: false, nbaToday: '2026-07-16' };

		assert.equal(
			deriveScoreboardView({ ...common, currentDate: '2026-01-05' }).dateRelation,
			'past'
		);
		assert.equal(
			deriveScoreboardView({ ...common, currentDate: '2027-01-01' }).dateRelation,
			'future'
		);
	});
});

describe('NBA date semantics', () => {
	it('uses Pacific time at the UTC/local-day boundary', () => {
		assert.equal(formatNbaDate(new Date('2026-07-17T03:30:00Z')), '2026-07-16');
		assert.equal(shiftNbaDate('2026-07-16', -1), '2026-07-15');
		assert.equal(shiftNbaDate('2026-07-16', 1), '2026-07-17');
	});
});
