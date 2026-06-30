import { intakeGovernanceSourceUpdate } from './governance-source-intake';

export type GovernanceSlackChannelConfig = {
	id: string;
	name: string;
	atlasCanvasId?: string;
	atlasNodeId?: string;
	workspaceUrl?: string;
};

export type GovernanceSlackMonitorConfig = {
	channels: GovernanceSlackChannelConfig[];
	slackBotToken?: string | null;
	workspaceUrl?: string | null;
	limit?: number;
	fetch?: typeof fetch;
};

export type GovernanceSlackChannelResult = {
	channel_id: string;
	channel_name: string;
	fetched: number;
	created: number;
	ignored: number;
	latest_cursor: string | null;
	error: string | null;
};

export type GovernanceSlackMonitorResult = {
	status: 'ok' | 'not_configured';
	channels: GovernanceSlackChannelResult[];
	summary: {
		channels: number;
		fetched: number;
		created: number;
		ignored: number;
		errors: number;
	};
};

type SlackHistoryMessage = {
	type?: string;
	subtype?: string;
	text?: string;
	ts?: string;
	thread_ts?: string;
	user?: string;
	username?: string;
	bot_id?: string;
};

type SlackHistoryResponse = {
	ok?: boolean;
	error?: string;
	messages?: SlackHistoryMessage[];
};

interface D1PreparedStatementLike {
	bind(...values: unknown[]): D1PreparedStatementLike;
	all<T = unknown>(): Promise<{ results?: T[] }>;
	first<T = unknown>(): Promise<T | null>;
	run(): Promise<unknown>;
}

interface D1DatabaseLike {
	prepare(query: string): D1PreparedStatementLike;
}

const DEFAULT_LIMIT = 50;

export async function runGovernanceSlackMonitor(
	db: D1DatabaseLike,
	config: GovernanceSlackMonitorConfig
): Promise<GovernanceSlackMonitorResult> {
	const channels = config.channels;
	const slackBotToken = config.slackBotToken?.trim();
	if (!slackBotToken || channels.length === 0) {
		return buildMonitorResult('not_configured', []);
	}

	await assertCursorTableAvailable(db);
	const results: GovernanceSlackChannelResult[] = [];
	for (const channel of channels) {
		results.push(await runChannelMonitor(db, channel, config));
	}

	return buildMonitorResult('ok', results);
}

export function parseGovernanceSlackChannelsConfig(raw: string | null | undefined): GovernanceSlackChannelConfig[] {
	const value = raw?.trim();
	if (!value) return [];

	if (value.startsWith('[')) {
		const parsed = JSON.parse(value) as unknown;
		if (!Array.isArray(parsed)) {
			throw new Error('GOVERNANCE_SLACK_CHANNELS JSON must be an array.');
		}
		return parsed.map((item) => normalizeChannelConfig(item)).filter(isChannelConfig);
	}

	return value
		.split(',')
		.map((entry) => normalizeDelimitedChannelConfig(entry))
		.filter(isChannelConfig);
}

async function runChannelMonitor(
	db: D1DatabaseLike,
	channel: GovernanceSlackChannelConfig,
	config: GovernanceSlackMonitorConfig
): Promise<GovernanceSlackChannelResult> {
	const fetchImpl = config.fetch ?? fetch;
	const previousCursor = await getSourceCursor(db, 'slack', channel.id);
	const latestCursor = { value: previousCursor };
	const result: GovernanceSlackChannelResult = {
		channel_id: channel.id,
		channel_name: channel.name,
		fetched: 0,
		created: 0,
		ignored: 0,
		latest_cursor: previousCursor,
		error: null
	};

	try {
		const messages = await fetchSlackHistory(fetchImpl, {
			channelId: channel.id,
			token: config.slackBotToken ?? '',
			oldest: previousCursor,
			limit: config.limit
		});
		const orderedMessages = messages
			.filter((message) => message.type === 'message' && typeof message.ts === 'string')
			.sort((left, right) => Number(left.ts) - Number(right.ts));
		result.fetched = orderedMessages.length;

		for (const message of orderedMessages) {
			const ts = message.ts ?? '';
			if (!message.text?.trim()) {
				result.ignored += 1;
				latestCursor.value = maxSlackCursor(latestCursor.value, ts);
				continue;
			}

			const intake = await intakeGovernanceSourceUpdate(db, {
				sourceType: 'slack',
				source: `slack:${channel.name}`,
				channel: channel.name,
				sourceUrl: slackMessageUrl(channel.workspaceUrl ?? config.workspaceUrl, channel.id, ts),
				atlasCanvasId: channel.atlasCanvasId,
				atlasNodeId: channel.atlasNodeId,
				title: slackMessageTitle(message.text),
				summary: message.text,
				text: message.text,
				payload: {
					slack_channel_id: channel.id,
					slack_channel_name: channel.name,
					slack_ts: ts,
					slack_thread_ts: message.thread_ts ?? null,
					slack_user: message.user ?? message.username ?? null,
					slack_bot_id: message.bot_id ?? null
				}
			});

			if (intake.action === 'signal_created') {
				result.created += 1;
			} else {
				result.ignored += 1;
			}
			latestCursor.value = maxSlackCursor(latestCursor.value, ts);
		}

		if (latestCursor.value !== previousCursor) {
			await upsertSourceCursor(db, {
				sourceType: 'slack',
				sourceId: channel.id,
				cursorValue: latestCursor.value,
				metadata: { channel_name: channel.name }
			});
		}
		result.latest_cursor = latestCursor.value;
	} catch (error) {
		result.error = error instanceof Error ? error.message : 'Slack monitor failed.';
	}

	return result;
}

async function fetchSlackHistory(
	fetchImpl: typeof fetch,
	input: { channelId: string; token: string; oldest: string | null; limit?: number }
): Promise<SlackHistoryMessage[]> {
	const url = new URL('https://slack.com/api/conversations.history');
	url.searchParams.set('channel', input.channelId);
	url.searchParams.set('limit', String(normalizeLimit(input.limit)));
	if (input.oldest) {
		url.searchParams.set('oldest', input.oldest);
		url.searchParams.set('inclusive', 'false');
	}

	const response = await fetchImpl(url, {
		headers: {
			authorization: `Bearer ${input.token}`
		}
	});
	if (!response.ok) {
		throw new Error(`Slack history request failed with HTTP ${response.status}.`);
	}

	const payload = (await response.json()) as SlackHistoryResponse;
	if (!payload.ok) {
		throw new Error(`Slack history request failed: ${payload.error ?? 'unknown_error'}.`);
	}

	return Array.isArray(payload.messages) ? payload.messages : [];
}

async function assertCursorTableAvailable(db: D1DatabaseLike): Promise<void> {
	const row = await db
		.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
		.bind('governance_source_cursors')
		.first<{ name: string }>();
	if (!row?.name) {
		throw new Error('governance_source_cursors table is not available; apply migration 0031 first');
	}
}

async function getSourceCursor(
	db: D1DatabaseLike,
	sourceType: string,
	sourceId: string
): Promise<string | null> {
	const row = await db
		.prepare(
			`SELECT cursor_value
			   FROM governance_source_cursors
			  WHERE source_type = ? AND source_id = ?`
		)
		.bind(sourceType, sourceId)
		.first<{ cursor_value: string | null }>();
	return row?.cursor_value ?? null;
}

async function upsertSourceCursor(
	db: D1DatabaseLike,
	input: {
		sourceType: string;
		sourceId: string;
		cursorValue: string | null;
		metadata: Record<string, unknown>;
	}
): Promise<void> {
	const now = new Date().toISOString();
	await db
		.prepare(
			`INSERT INTO governance_source_cursors (
				source_type,
				source_id,
				cursor_value,
				last_seen_at,
				metadata_json,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(source_type, source_id) DO UPDATE SET
				cursor_value = excluded.cursor_value,
				last_seen_at = excluded.last_seen_at,
				metadata_json = excluded.metadata_json,
				updated_at = excluded.updated_at`
		)
		.bind(input.sourceType, input.sourceId, input.cursorValue, now, JSON.stringify(input.metadata), now)
		.run();
}

function buildMonitorResult(
	status: GovernanceSlackMonitorResult['status'],
	channels: GovernanceSlackChannelResult[]
): GovernanceSlackMonitorResult {
	return {
		status,
		channels,
		summary: {
			channels: channels.length,
			fetched: channels.reduce((sum, channel) => sum + channel.fetched, 0),
			created: channels.reduce((sum, channel) => sum + channel.created, 0),
			ignored: channels.reduce((sum, channel) => sum + channel.ignored, 0),
			errors: channels.filter((channel) => channel.error).length
		}
	};
}

function normalizeChannelConfig(value: unknown): GovernanceSlackChannelConfig | null {
	if (typeof value === 'string') return normalizeDelimitedChannelConfig(value);
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const record = value as Record<string, unknown>;
	const id = text(record.id ?? record.channel_id);
	if (!id) return null;
	return {
		id,
		name: text(record.name ?? record.channel_name) ?? id,
		atlasCanvasId: text(record.atlasCanvasId ?? record.atlas_canvas_id) ?? undefined,
		atlasNodeId: text(record.atlasNodeId ?? record.atlas_node_id) ?? undefined,
		workspaceUrl: normalizeWorkspaceUrl(text(record.workspaceUrl ?? record.workspace_url)) ?? undefined
	};
}

function normalizeDelimitedChannelConfig(value: string): GovernanceSlackChannelConfig | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const [idPart, namePart, canvasPart, nodePart] = trimmed.split('|').map((part) => part.trim());
	const id = text(idPart);
	if (!id) return null;
	return {
		id,
		name: text(namePart) ?? id,
		atlasCanvasId: text(canvasPart) ?? undefined,
		atlasNodeId: text(nodePart) ?? undefined
	};
}

function isChannelConfig(value: GovernanceSlackChannelConfig | null): value is GovernanceSlackChannelConfig {
	return Boolean(value);
}

function normalizeLimit(limit: number | undefined): number {
	if (!Number.isFinite(limit) || !limit) return DEFAULT_LIMIT;
	return Math.max(1, Math.min(200, Math.floor(limit)));
}

function maxSlackCursor(left: string | null, right: string): string {
	if (!left) return right;
	return Number(right) > Number(left) ? right : left;
}

function slackMessageTitle(textValue: string): string {
	const normalized = textValue.trim().replace(/\s+/g, ' ');
	const clipped = normalized.length > 120 ? `${normalized.slice(0, 117).trimEnd()}...` : normalized;
	return clipped;
}

function slackMessageUrl(
	workspaceUrl: string | null | undefined,
	channelId: string,
	ts: string
): string | null {
	const normalizedWorkspace = normalizeWorkspaceUrl(workspaceUrl);
	if (!normalizedWorkspace || !ts) return null;
	return `${normalizedWorkspace}/archives/${channelId}/p${ts.replace('.', '')}`;
}

function normalizeWorkspaceUrl(value: string | null | undefined): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:') return null;
		return url.origin;
	} catch {
		return null;
	}
}

function text(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const normalized = value.trim();
	return normalized || null;
}
