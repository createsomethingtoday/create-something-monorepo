import type { Game } from './types';

export type ScoreboardViewState =
	| 'live'
	| 'pregame'
	| 'complete'
	| 'off_day'
	| 'stale'
	| 'unavailable';

export type DateRelation = 'past' | 'today' | 'future';

export interface ScoreboardViewInput {
	games: Game[];
	error: string | null;
	stale: boolean;
	currentDate: string;
	nbaToday: string;
}

export interface ScoreboardView {
	state: ScoreboardViewState;
	dateRelation: DateRelation;
	nextGame: Game | null;
	liveCount: number;
	scheduledCount: number;
	finalCount: number;
}

export function formatNbaDate(date: Date): string {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Los_Angeles',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(date);
	const value = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value;

	return `${value('year')}-${value('month')}-${value('day')}`;
}

export function shiftNbaDate(date: string, offset: number): string {
	const [year, month, day] = date.split('-').map(Number);
	const shifted = new Date(Date.UTC(year, month - 1, day + offset));
	return shifted.toISOString().slice(0, 10);
}

export function compareNbaDates(date: string, nbaToday: string): DateRelation {
	if (date === nbaToday) return 'today';
	return date < nbaToday ? 'past' : 'future';
}

export function deriveScoreboardView(input: ScoreboardViewInput): ScoreboardView {
	const liveCount = input.games.filter((game) => game.status === 'live').length;
	const scheduled = input.games
		.filter((game) => game.status === 'scheduled')
		.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
	const finalCount = input.games.filter((game) => game.status === 'final').length;

	let state: ScoreboardViewState;
	if (input.error) state = 'unavailable';
	else if (input.stale) state = 'stale';
	else if (liveCount > 0) state = 'live';
	else if (scheduled.length > 0) state = 'pregame';
	else if (finalCount > 0) state = 'complete';
	else state = 'off_day';

	return {
		state,
		dateRelation: compareNbaDates(input.currentDate, input.nbaToday),
		nextGame: scheduled[0] ?? null,
		liveCount,
		scheduledCount: scheduled.length,
		finalCount,
	};
}
