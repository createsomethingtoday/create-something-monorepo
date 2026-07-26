import {
	adaptEspnScoreboard,
	type CanonicalGameSummary,
	type ScoreboardCapabilities,
} from './scoreboard';

export type ArchivedGamePayloadKind = 'play-by-play' | 'box-score';

export interface ArchivedGamePayload {
	data: unknown;
	archivedAt: string;
}

export interface RecentHistoryGame extends CanonicalGameSummary {
	capabilities: ScoreboardCapabilities;
}

export interface RecentHistorySlate {
	date: string;
	games: RecentHistoryGame[];
}

export interface RecentHistoryResult {
	source: 'archive' | 'espn';
	degraded: boolean;
	stale: boolean;
	fetchedAt: string;
	slates: RecentHistorySlate[];
}

export interface RecentHistoryOptions {
	before: string;
	limit: number;
	fetchImpl: typeof fetch;
	espnApiBaseUrl: string;
	now?: () => Date;
}

interface SnapshotRow {
	date: string;
	scoreboard_json: string;
	captured_at: number;
}

interface ArchiveMetadataRow {
	game_id: string;
	has_pbp: number;
	has_boxscore: number;
}

const NO_ARCHIVE_CAPABILITIES: ScoreboardCapabilities = {
	playByPlay: false,
	boxScore: false,
	advancedAnalytics: false,
};

function parseSnapshot(row: SnapshotRow): Omit<RecentHistorySlate, 'games'> & {
	games: CanonicalGameSummary[];
} | null {
	try {
		const parsed = JSON.parse(row.scoreboard_json) as {
			scoreboard?: { games?: CanonicalGameSummary[] };
		};
		if (!Array.isArray(parsed.scoreboard?.games) || parsed.scoreboard.games.length === 0) {
			return null;
		}
		return { date: row.date, games: parsed.scoreboard.games };
	} catch {
		return null;
	}
}

function shiftDate(date: string, days: number): string {
	const shifted = new Date(`${date}T12:00:00Z`);
	shifted.setUTCDate(shifted.getUTCDate() + days);
	return shifted.toISOString().slice(0, 10);
}

function formatPacificDate(date: Date): string {
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

async function fetchEspnRecentHistory(
	options: RecentHistoryOptions,
	limit: number
): Promise<RecentHistoryResult> {
	const start = shiftDate(options.before, -180).replaceAll('-', '');
	const end = shiftDate(options.before, -1).replaceAll('-', '');
	const response = await options.fetchImpl(
		`${options.espnApiBaseUrl}/scoreboard?dates=${start}-${end}&limit=1000`,
		{
			headers: {
				Accept: 'application/json',
				'User-Agent': 'CREATE-SOMETHING-NBA-Proxy/2.0',
			},
		}
	);
	if (!response.ok) {
		throw new Error(`ESPN history error: HTTP ${response.status}`);
	}
	const payload = (await response.json()) as { events?: Array<{ date?: string }> };
	const slatesByDate = new Map<string, RecentHistoryGame[]>();

	for (const event of payload.events ?? []) {
		if (!event.date) continue;
		const date = formatPacificDate(new Date(event.date));
		if (date >= options.before) continue;
		const game = adaptEspnScoreboard({ events: [event] }, date).scoreboard.games[0];
		if (!game) continue;
		const games = slatesByDate.get(date) ?? [];
		games.push({ ...game, capabilities: NO_ARCHIVE_CAPABILITIES });
		slatesByDate.set(date, games);
	}

	return {
		source: 'espn',
		degraded: true,
		stale: false,
		fetchedAt: (options.now?.() ?? new Date()).toISOString(),
		slates: [...slatesByDate.entries()]
			.map(([date, games]) => ({ date, games }))
			.sort((a, b) => b.date.localeCompare(a.date))
			.slice(0, limit),
	};
}

export async function fetchRecentHistory(
	database: D1Database,
	options: RecentHistoryOptions
): Promise<RecentHistoryResult> {
	const limit = Math.max(1, Math.min(Math.trunc(options.limit), 12));
	let snapshotRows: SnapshotRow[] = [];
	try {
		const snapshotResult = await database
			.prepare(
				'SELECT date, scoreboard_json, captured_at FROM game_snapshots WHERE date < ? AND game_count > 0 ORDER BY date DESC LIMIT ?'
			)
			.bind(options.before, limit)
			.all<SnapshotRow>();
		snapshotRows = snapshotResult.results ?? [];
	} catch {
		return fetchEspnRecentHistory(options, limit);
	}
	const parsedSlates = snapshotRows.flatMap((row) => {
		const slate = parseSnapshot(row);
		return slate ? [slate] : [];
	});

	if (parsedSlates.length === 0) {
		return fetchEspnRecentHistory(options, limit);
	}

	const oldestDate = parsedSlates.reduce(
		(oldest, slate) => (slate.date < oldest ? slate.date : oldest),
		parsedSlates[0].date
	);
	let metadataRows: ArchiveMetadataRow[] = [];
	try {
		const metadataResult = await database
			.prepare(
				'SELECT game_id, has_pbp, has_boxscore FROM archive_metadata WHERE game_date >= ? AND game_date < ?'
			)
			.bind(oldestDate, options.before)
			.all<ArchiveMetadataRow>();
		metadataRows = metadataResult.results ?? [];
	} catch {
		// Scoreboards remain useful, but games stay scoreboard-only without capability proof.
	}
	const capabilitiesByGame = new Map(
		metadataRows.map((row) => {
			const playByPlay = Number(row.has_pbp) === 1;
			const boxScore = Number(row.has_boxscore) === 1;
			return [
				row.game_id,
				{
					playByPlay,
					boxScore,
					advancedAnalytics: playByPlay && boxScore,
				} satisfies ScoreboardCapabilities,
			] as const;
		})
	);
	const slates = parsedSlates
		.map((slate) => ({
			date: slate.date,
			games: slate.games.map((game) => ({
				...game,
				capabilities: capabilitiesByGame.get(game.gameId) ?? NO_ARCHIVE_CAPABILITIES,
			})),
		}))
		.sort((a, b) => b.date.localeCompare(a.date));

	return {
		source: 'archive',
		degraded: false,
		stale: false,
		fetchedAt: new Date(Number(snapshotRows[0]?.captured_at ?? Date.now())).toISOString(),
		slates,
	};
}

export async function readArchivedGamePayload(
	database: D1Database,
	gameId: string,
	kind: ArchivedGamePayloadKind
): Promise<ArchivedGamePayload | null> {
	const query =
		kind === 'play-by-play'
			? 'SELECT pbp_json AS payload_json, archived_at FROM pbp_archive WHERE game_id = ?'
			: 'SELECT boxscore_json AS payload_json, archived_at FROM boxscore_archive WHERE game_id = ?';
	const row = await database
		.prepare(query)
		.bind(gameId)
		.first<{ payload_json: string; archived_at: number }>();

	if (!row?.payload_json) return null;

	try {
		return {
			data: JSON.parse(row.payload_json) as unknown,
			archivedAt: new Date(Number(row.archived_at)).toISOString(),
		};
	} catch {
		return null;
	}
}
