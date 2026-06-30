import assert from 'node:assert/strict';
import test from 'node:test';

import {
	parseGovernanceSlackChannelsConfig,
	runGovernanceSlackMonitor
} from '../src/lib/server/governance-slack-monitor.ts';
import { POST as postSlackMonitor } from '../src/routes/api/governance/monitors/slack/+server.ts';

type TableRow = Record<string, unknown>;

class FakeStatement {
	constructor(
		private readonly tables: Record<string, TableRow[]>,
		private readonly sql: string,
		private values: unknown[] = []
	) {}

	bind(...values: unknown[]): FakeStatement {
		this.values = values;
		return this;
	}

	async first<T = unknown>(): Promise<T | null> {
		if (this.sql.includes('sqlite_master')) {
			const table = String(this.values[0] ?? '');
			return (this.tables[table] ? { name: table } : null) as T | null;
		}

		if (this.sql.includes('FROM governance_source_cursors')) {
			const [sourceType, sourceId] = this.values;
			const row = (this.tables.governance_source_cursors ?? []).find(
				(candidate) => candidate.source_type === sourceType && candidate.source_id === sourceId
			);
			return (row ? { cursor_value: row.cursor_value ?? null } : null) as T | null;
		}

		const all = await this.all<T>();
		return all.results[0] ?? null;
	}

	async all<T = unknown>(): Promise<{ results: T[] }> {
		return { results: [] };
	}

	async run(): Promise<{ success: true }> {
		if (this.sql.includes('INSERT INTO governance_source_cursors')) {
			const [source_type, source_id, cursor_value, last_seen_at, metadata_json, updated_at] = this.values;
			const rows = (this.tables.governance_source_cursors ??= []);
			const existing = rows.find((row) => row.source_type === source_type && row.source_id === source_id);
			const nextRow = { source_type, source_id, cursor_value, last_seen_at, metadata_json, updated_at };
			if (existing) Object.assign(existing, nextRow);
			else rows.push(nextRow);
			return { success: true };
		}

		if (this.sql.includes('INSERT INTO governance_signals')) {
			const [
				id,
				atlas_canvas_id,
				atlas_node_id,
				source,
				source_url,
				title,
				summary,
				status,
				payload_json,
				created_at,
				updated_at
			] = this.values;
			(this.tables.governance_signals ??= []).push({
				id,
				atlas_canvas_id,
				atlas_node_id,
				source,
				source_url,
				title,
				summary,
				status,
				payload_json,
				created_at,
				updated_at
			});
		}

		return { success: true };
	}
}

class FakeD1 {
	constructor(private readonly tables: Record<string, TableRow[]> = defaultTables()) {}

	prepare(sql: string): FakeStatement {
		return new FakeStatement(this.tables, sql);
	}

	rows(table: string): TableRow[] {
		return this.tables[table] ?? [];
	}
}

function defaultTables(): Record<string, TableRow[]> {
	return {
		governance_signals: [],
		governance_decisions: [],
		governance_proofs: [],
		governance_source_cursors: []
	};
}

function slackFetch(messages: Array<Record<string, unknown>>): typeof fetch {
	return (async (url: URL | RequestInfo) => {
		const requestUrl = url instanceof URL ? url : new URL(String(url));
		assert.equal(requestUrl.hostname, 'slack.com');
		assert.equal(requestUrl.searchParams.get('channel'), 'C123');
		return Response.json({ ok: true, messages });
	}) as typeof fetch;
}

function routeEvent(
	db: FakeD1,
	options: {
		configuredKey?: string;
		providedKey?: string | null;
		channels?: string;
		slackBotToken?: string;
	} = {}
) {
	const configuredKey = options.configuredKey ?? 'test-internal-key';
	const providedKey = options.providedKey === undefined ? configuredKey : options.providedKey;
	const headers = new Headers();
	if (providedKey) headers.set('authorization', `Bearer ${providedKey}`);
	return {
		platform: {
			env: {
				DB: db,
				AGENCY_INTERNAL_API_KEY: configuredKey,
				GOVERNANCE_SLACK_CHANNELS: options.channels,
				SLACK_BOT_TOKEN: options.slackBotToken,
				GOVERNANCE_SLACK_WORKSPACE_URL: 'https://example.slack.com'
			}
		},
		request: new Request('https://createsomething.agency/api/governance/monitors/slack', {
			method: 'POST',
			headers
		})
	} as never;
}

test('parseGovernanceSlackChannelsConfig accepts JSON and delimited channel config', () => {
	assert.deepEqual(parseGovernanceSlackChannelsConfig('C123|#api-updates|canvas_docs|node_api'), [
		{
			id: 'C123',
			name: '#api-updates',
			atlasCanvasId: 'canvas_docs',
			atlasNodeId: 'node_api'
		}
	]);

	assert.deepEqual(
		parseGovernanceSlackChannelsConfig(
			JSON.stringify([{ id: 'C456', name: '#review-ops', atlas_canvas_id: 'canvas_review' }])
		),
		[
			{
				id: 'C456',
				name: '#review-ops',
				atlasCanvasId: 'canvas_review',
				atlasNodeId: undefined,
				workspaceUrl: undefined
			}
		]
	);
});

test('runGovernanceSlackMonitor creates Signals and advances the Slack cursor', async () => {
	const db = new FakeD1();
	const result = await runGovernanceSlackMonitor(db, {
		slackBotToken: 'xoxb-test',
		workspaceUrl: 'https://example.slack.com',
		channels: [
			{
				id: 'C123',
				name: '#api-updates',
				atlasCanvasId: 'canvas_docs',
				atlasNodeId: 'node_api'
			}
		],
		fetch: slackFetch([
			{
				type: 'message',
				ts: '1700000000.000100',
				user: 'U123',
				text: 'Checkout API added a response field. Docs and OpenAPI reference need updates.'
			}
		])
	});

	assert.equal(result.status, 'ok');
	assert.equal(result.summary.fetched, 1);
	assert.equal(result.summary.created, 1);
	assert.equal(result.summary.ignored, 0);
	assert.equal(result.channels[0]?.latest_cursor, '1700000000.000100');

	const signal = db.rows('governance_signals')[0];
	assert.equal(signal.atlas_canvas_id, 'canvas_docs');
	assert.equal(signal.atlas_node_id, 'node_api');
	assert.equal(signal.source, 'slack:#api-updates');
	assert.equal(signal.source_url, 'https://example.slack.com/archives/C123/p1700000000000100');
	const payload = JSON.parse(String(signal.payload_json));
	assert.equal(payload.classification.requires_documentation_review, true);
	assert.equal(payload.slack_ts, '1700000000.000100');

	const cursor = db.rows('governance_source_cursors')[0];
	assert.equal(cursor.cursor_value, '1700000000.000100');
});

test('runGovernanceSlackMonitor advances cursor for ignored no-op messages', async () => {
	const db = new FakeD1();
	const result = await runGovernanceSlackMonitor(db, {
		slackBotToken: 'xoxb-test',
		channels: [{ id: 'C123', name: '#api-updates' }],
		fetch: slackFetch([
			{
				type: 'message',
				ts: '1700000000.000200',
				user: 'U123',
				text: 'Lunch moved to noon.'
			}
		])
	});

	assert.equal(result.summary.created, 0);
	assert.equal(result.summary.ignored, 1);
	assert.equal(db.rows('governance_signals').length, 0);
	assert.equal(db.rows('governance_source_cursors')[0]?.cursor_value, '1700000000.000200');
});

test('runGovernanceSlackMonitor reports not_configured without token or channels', async () => {
	const db = new FakeD1();
	const noToken = await runGovernanceSlackMonitor(db, {
		channels: [{ id: 'C123', name: '#api-updates' }]
	});
	const noChannels = await runGovernanceSlackMonitor(db, {
		slackBotToken: 'xoxb-test',
		channels: []
	});

	assert.equal(noToken.status, 'not_configured');
	assert.equal(noChannels.status, 'not_configured');
});

test('governance Slack monitor route requires the internal credential', async () => {
	const response = await postSlackMonitor(routeEvent(new FakeD1(), { providedKey: null }));
	const payload = await response.json();

	assert.equal(response.status, 401);
	assert.match(payload.error, /governance write credential/i);
});

test('governance Slack monitor route reports missing config without throwing', async () => {
	const response = await postSlackMonitor(
		routeEvent(new FakeD1(), {
			channels: '',
			slackBotToken: ''
		})
	);
	const payload = await response.json();

	assert.equal(response.status, 202);
	assert.equal(payload.status, 'not_configured');
});
