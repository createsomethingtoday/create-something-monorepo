import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildGovernanceOperatorReview,
	emptyGovernanceOperatorReview,
	normalizeGovernanceOperatorFilters
} from '../src/lib/server/governance-operator.ts';

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
		const results = await this.all<T>();
		return results.results[0] ?? null;
	}

	async all<T = unknown>(): Promise<{ results: T[] }> {
		const table = Object.keys(this.tables).find((name) => this.sql.includes(`FROM ${name}`));
		if (!table) return { results: [] };

		let rows = [...(this.tables[table] ?? [])];
		let filterIndex = 0;
		for (const column of ['atlas_canvas_id', 'atlas_node_id', 'signal_id', 'decision_id']) {
			if (!this.sql.includes(`${column} = ?`)) continue;
			const expected = this.values[filterIndex++];
			rows = rows.filter((row) => row[column] === expected);
		}
		const limit = Number(this.values.at(-1) ?? 100);
		return { results: rows.slice(0, limit) as T[] };
	}

	async run(): Promise<{ success: true }> {
		return { success: true };
	}
}

class FakeD1 {
	constructor(private readonly tables: Record<string, TableRow[]>) {}

	prepare(sql: string): FakeStatement {
		return new FakeStatement(this.tables, sql);
	}
}

const now = '2026-06-30T16:00:00.000Z';

test('buildGovernanceOperatorReview groups decisions and proofs under their Atlas signal', async () => {
	const db = new FakeD1({
		governance_signals: [
			{
				id: 'sig_docs',
				atlas_canvas_id: 'canvas_docs',
				atlas_node_id: 'node_api',
				source: 'slack:#api-updates',
				source_url: 'https://slack.example/archives/C123/p456',
				title: 'API update',
				summary: 'Docs need review.',
				status: 'new',
				payload_json: '{"channel":"api-updates"}',
				created_at: now,
				updated_at: now
			}
		],
		governance_decisions: [
			{
				id: 'dec_docs',
				signal_id: 'sig_docs',
				atlas_canvas_id: 'canvas_docs',
				atlas_node_id: 'node_api',
				decision_state: 'run',
				decision_owner: 'reviewer@example.com',
				reason: 'Update docs.',
				payload_json: '{}',
				created_at: now,
				updated_at: now
			},
			{
				id: 'dec_unlinked',
				signal_id: 'sig_missing',
				atlas_canvas_id: 'canvas_docs',
				atlas_node_id: 'node_api',
				decision_state: 'wait',
				decision_owner: 'reviewer@example.com',
				reason: 'Waiting on missing signal.',
				payload_json: '{}',
				created_at: now,
				updated_at: now
			}
		],
		governance_proofs: [
			{
				id: 'proof_docs',
				signal_id: 'sig_docs',
				decision_id: 'dec_docs',
				atlas_canvas_id: 'canvas_docs',
				atlas_node_id: 'node_api',
				evidence: 'Docs PR merged.',
				outcome: 'passed',
				receipt_url: 'https://github.example/pr/456',
				rollback_note: null,
				payload_json: '{}',
				created_at: now,
				updated_at: now
			}
		]
	}) as unknown as Parameters<typeof buildGovernanceOperatorReview>[0];

	const review = await buildGovernanceOperatorReview(db, {
		atlas_canvas_id: 'canvas_docs',
		atlas_node_id: '',
		limit: 100
	});

	assert.equal(review.storage.available, true);
	assert.equal(review.summary.signals, 1);
	assert.equal(review.summary.decisions, 2);
	assert.equal(review.summary.proofs, 1);
	assert.equal(review.records[0]?.signal.id, 'sig_docs');
	assert.equal(review.records[0]?.decisions[0]?.id, 'dec_docs');
	assert.equal(review.records[0]?.proofs[0]?.id, 'proof_docs');
	assert.equal(review.unlinked_decisions[0]?.id, 'dec_unlinked');
});

test('governance operator helpers normalize filters and empty states', () => {
	const filters = normalizeGovernanceOperatorFilters(
		new URLSearchParams({
			canvas: ' canvas_docs ',
			node: ' node_api ',
			limit: '999'
		})
	);
	const empty = emptyGovernanceOperatorReview(filters, 'Database is unavailable.');

	assert.deepEqual(filters, {
		atlas_canvas_id: 'canvas_docs',
		atlas_node_id: 'node_api',
		limit: 500
	});
	assert.equal(empty.storage.available, false);
	assert.equal(empty.storage.error, 'Database is unavailable.');
	assert.equal(empty.summary.signals, 0);
});
