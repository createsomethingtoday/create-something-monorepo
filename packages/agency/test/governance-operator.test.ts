import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildGovernanceOperatorReview,
	createGovernanceOperatorAttachmentAction,
	createGovernanceOperatorDecisionAction,
	createGovernanceOperatorProofAction,
	createGovernanceOperatorSignalAction,
	emptyGovernanceOperatorReview,
	normalizeGovernanceOperatorFilters
} from '../src/lib/server/governance-operator.ts';
import { safeOperatorExternalHref } from '../src/lib/governance/operator-url.ts';

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
		for (const column of [
			'id',
			'atlas_canvas_id',
			'atlas_node_id',
			'signal_id',
			'decision_id',
			'source_product_id',
			'target_product_id'
		]) {
			if (!new RegExp(`\\b${column}\\s*=\\s*\\?`).test(this.sql)) continue;
			const expected = this.values[filterIndex++];
			rows = rows.filter((row) => row[column] === expected);
		}
		const limit = this.sql.includes('LIMIT ?') ? Number(this.values.at(-1) ?? 100) : rows.length;
		return { results: rows.slice(0, limit) as T[] };
	}

	async run(): Promise<{ success: true }> {
		const table = [
			'governance_signals',
			'governance_decisions',
			'governance_proofs',
			'governance_product_attachments'
		].find((name) => this.sql.includes(`INSERT INTO ${name}`));
		if (table) {
			this.tables[table] ??= [];
			this.tables[table].push(this.rowFromInsert(table));
		}
		if (this.sql.includes('UPDATE governance_signals')) {
			const [status, updated_at, id] = this.values;
			const signal = this.tables.governance_signals?.find((row) => row.id === id);
			if (signal) {
				signal.status = status;
				signal.updated_at = updated_at;
			}
		}
		return { success: true };
	}

	private rowFromInsert(table: string): TableRow {
		if (table === 'governance_signals') {
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
			return {
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
			};
		}

		if (table === 'governance_decisions') {
			const [
				id,
				signal_id,
				atlas_canvas_id,
				atlas_node_id,
				decision_state,
				decision_owner,
				reason,
				payload_json,
				created_at,
				updated_at
			] = this.values;
			return {
				id,
				signal_id,
				atlas_canvas_id,
				atlas_node_id,
				decision_state,
				decision_owner,
				reason,
				payload_json,
				created_at,
				updated_at
			};
		}

		if (table === 'governance_product_attachments') {
			const [
				id,
				source_product_id,
				source_record_id,
				target_product_id,
				target_record_id,
				atlas_canvas_id,
				atlas_node_id,
				mode,
				label,
				required,
				metadata_json,
				created_at,
				updated_at
			] = this.values;
			return {
				id,
				source_product_id,
				source_record_id,
				target_product_id,
				target_record_id,
				atlas_canvas_id,
				atlas_node_id,
				mode,
				label,
				required,
				metadata_json,
				created_at,
				updated_at
			};
		}

		const [
			id,
			signal_id,
			decision_id,
			atlas_canvas_id,
			atlas_node_id,
			evidence,
			outcome,
			receipt_url,
			rollback_note,
			payload_json,
			created_at,
			updated_at
		] = this.values;
		return {
			id,
			signal_id,
			decision_id,
			atlas_canvas_id,
			atlas_node_id,
			evidence,
			outcome,
			receipt_url,
			rollback_note,
			payload_json,
			created_at,
			updated_at
		};
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
				payload_json:
					'{"classification":{"requires_documentation_review":true,"requires_reviewer_process_review":true,"reasons":["API surface changed","Reviewer workflow was mentioned"]}}',
				created_at: now,
				updated_at: now
			}
		],
		governance_decisions: [
			{
				id: 'dec_docs',
				signal_id: 'sig_docs',
				atlas_canvas_id: 'canvas_docs',
				atlas_node_id: 'node_other',
				decision_state: 'run',
				decision_owner: 'reviewer@example.com',
				reason: 'Update docs.',
				payload_json: '{}',
				created_at: now,
				updated_at: now
			},
			{
				id: 'dec_docs_missing_proof',
				signal_id: 'sig_docs',
				atlas_canvas_id: 'canvas_docs',
				atlas_node_id: 'node_other',
				decision_state: 'wait',
				decision_owner: 'reviewer@example.com',
				reason: 'Waiting for reviewer checklist.',
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
				atlas_node_id: 'node_other',
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
		atlas_node_id: 'node_api',
		limit: 100
	});

	assert.equal(review.storage.available, true);
	assert.equal(review.summary.signals, 1);
	assert.equal(review.summary.decisions, 2);
	assert.equal(review.summary.proofs, 1);
	assert.equal(review.summary.records_ready_for_proof, 1);
	assert.equal(review.summary.records_requiring_docs_review, 1);
	assert.equal(review.summary.records_requiring_reviewer_process_review, 1);
	assert.equal(review.summary.explicit_attachments, 0);
	assert.equal(review.records[0]?.signal.id, 'sig_docs');
	assert.equal(review.records[0]?.classification?.requires_documentation_review, true);
	assert.equal(review.records[0]?.classification?.requires_reviewer_process_review, true);
	assert.deepEqual(review.records[0]?.classification?.reasons, [
		'API surface changed',
		'Reviewer workflow was mentioned'
	]);
	assert.equal(review.records[0]?.decisions[0]?.id, 'dec_docs');
	assert.equal(review.records[0]?.proofs[0]?.id, 'proof_docs');
	assert.equal(review.unlinked_decisions[0]?.id, 'dec_unlinked');
	assert.deepEqual(
		review.graph.nodes.map((node) => node.id),
		['atlas:canvas_docs', 'signal:sig_docs', 'decision:dec_docs', 'decision:dec_docs_missing_proof', 'proof:proof_docs']
	);
	assert.deepEqual(
		review.graph.attachments.map((attachment) => `${attachment.source}->${attachment.target}:${attachment.mode}`),
		[
			'atlas:canvas_docs->signal:sig_docs:connects',
			'signal:sig_docs->decision:dec_docs:produces',
			'signal:sig_docs->decision:dec_docs_missing_proof:produces',
			'decision:dec_docs->proof:proof_docs:produces',
			'proof:proof_docs->atlas:canvas_docs:records'
		]
	);
	assert.equal(review.graph.summary.signals, 1);
	assert.equal(review.graph.summary.decisions, 2);
	assert.equal(review.graph.summary.proofs, 1);
});

test('buildGovernanceOperatorReview summarizes open and closed Signal inbox state', async () => {
	const db = new FakeD1({
		governance_signals: ['new', 'reviewing', 'resolved', 'dismissed'].map((status) => ({
			id: `sig_${status}`,
			atlas_canvas_id: 'canvas_docs',
			atlas_node_id: 'node_api',
			source: 'slack:#api-updates',
			source_url: null,
			title: `${status} API update`,
			summary: `Signal is ${status}.`,
			status,
			payload_json: '{}',
			created_at: now,
			updated_at: now
		})),
		governance_decisions: [],
		governance_proofs: []
	}) as unknown as Parameters<typeof buildGovernanceOperatorReview>[0];

	const review = await buildGovernanceOperatorReview(db, {
		atlas_canvas_id: 'canvas_docs',
		atlas_node_id: 'node_api',
		limit: 100
	});

	assert.equal(review.summary.signals, 4);
	assert.equal(review.summary.active_signals, 2);
	assert.equal(review.summary.closed_signals, 2);
});

test('governance operator actions record decisions and proofs from source attachments', async () => {
	const tables: Record<string, TableRow[]> = {
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
				payload_json: '{}',
				created_at: now,
				updated_at: now
			}
		],
		governance_decisions: [],
		governance_proofs: []
	};
	const db = new FakeD1(tables) as unknown as Parameters<typeof createGovernanceOperatorDecisionAction>[0];

	const decision = await createGovernanceOperatorDecisionAction(db, {
		signalId: 'sig_docs',
		decisionState: 'run',
		decisionOwner: 'docs-reviewer@example.com',
		reason: 'Update the public API docs.'
	});
	const proof = await createGovernanceOperatorProofAction(db, {
		decisionId: decision.id,
		evidence: 'Docs update merged and reviewer checklist linked.',
		outcome: 'passed',
		receiptUrl: 'https://github.example/pr/789'
	});

	assert.equal(decision.signal_id, 'sig_docs');
	assert.equal(decision.atlas_canvas_id, 'canvas_docs');
	assert.equal(decision.atlas_node_id, 'node_api');
	assert.equal(decision.payload.operator_surface, '/admin/governance');
	assert.equal(proof.signal_id, 'sig_docs');
	assert.equal(proof.decision_id, decision.id);
	assert.equal(proof.atlas_canvas_id, 'canvas_docs');
	assert.equal(proof.atlas_node_id, 'node_api');
	assert.equal(proof.receipt_url, 'https://github.example/pr/789');
	assert.equal(tables.governance_signals[0]?.status, 'resolved');
	assert.equal(tables.governance_decisions.length, 1);
	assert.equal(tables.governance_proofs.length, 1);
});

test('governance operator proof action preserves dismissed Signal inbox state', async () => {
	const tables: Record<string, TableRow[]> = {
		governance_signals: [
			{
				id: 'sig_dismissed',
				atlas_canvas_id: 'canvas_docs',
				atlas_node_id: 'node_api',
				source: 'slack:#api-updates',
				source_url: 'https://slack.example/archives/C123/p999',
				title: 'Duplicate API update',
				summary: 'Duplicate signal already dismissed.',
				status: 'dismissed',
				payload_json: '{}',
				created_at: now,
				updated_at: now
			}
		],
		governance_decisions: [
			{
				id: 'dec_dismissed',
				signal_id: 'sig_dismissed',
				atlas_canvas_id: 'canvas_docs',
				atlas_node_id: 'node_api',
				decision_state: 'stop',
				decision_owner: 'docs-reviewer@example.com',
				reason: 'No action needed.',
				payload_json: '{}',
				created_at: now,
				updated_at: now
			}
		],
		governance_proofs: []
	};
	const db = new FakeD1(tables) as unknown as Parameters<typeof createGovernanceOperatorProofAction>[0];

	await createGovernanceOperatorProofAction(db, {
		decisionId: 'dec_dismissed',
		evidence: 'Duplicate confirmed; no docs update required.',
		outcome: 'documented'
	});

	assert.equal(tables.governance_signals[0]?.status, 'dismissed');
	assert.equal(tables.governance_proofs.length, 1);
});

test('governance operator action records durable product attachments for review', async () => {
	const tables: Record<string, TableRow[]> = {
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
				payload_json: '{}',
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
				decision_owner: 'docs-reviewer@example.com',
				reason: 'Update docs.',
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
		],
		governance_product_attachments: []
	};
	const db = new FakeD1(tables) as unknown as Parameters<typeof createGovernanceOperatorAttachmentAction>[0];

	const attachment = await createGovernanceOperatorAttachmentAction(db, {
		sourceProductId: 'signal',
		sourceRecordId: 'sig_docs',
		targetProductId: 'proof',
		targetRecordId: 'proof_docs',
		atlasCanvasId: 'canvas_docs',
		atlasNodeId: 'node_api',
		mode: 'records',
		label: 'Signal source requires this proof receipt.',
		required: true
	});
	const review = await buildGovernanceOperatorReview(
		db as unknown as Parameters<typeof buildGovernanceOperatorReview>[0],
		{
			atlas_canvas_id: 'canvas_docs',
			atlas_node_id: 'node_api',
			limit: 100
		}
	);

	assert.equal(attachment.source_product_id, 'signal');
	assert.equal(attachment.target_product_id, 'proof');
	assert.equal(attachment.required, true);
	assert.equal(attachment.metadata.operator_surface, '/admin/governance');
	assert.equal(tables.governance_product_attachments.length, 1);
	assert.equal(review.summary.explicit_attachments, 1);
	assert.equal(review.explicit_attachments[0]?.id, attachment.id);
	assert.ok(
		review.graph.attachments.some(
			(edge) =>
				edge.id === `attachment:${attachment.id}` &&
				edge.source === 'signal:sig_docs' &&
				edge.target === 'proof:proof_docs'
		)
	);

	await assert.rejects(
		() =>
			createGovernanceOperatorAttachmentAction(db, {
				sourceProductId: 'signal',
				sourceRecordId: 'sig_docs',
				targetProductId: 'signal',
				targetRecordId: 'sig_docs',
				atlasCanvasId: 'canvas_docs'
			}),
		/sourceProductId and targetProductId must be different/
	);
});

test('governance operator actions record manual Signals with Atlas attachment metadata', async () => {
	const tables: Record<string, TableRow[]> = {
		governance_signals: [],
		governance_decisions: [],
		governance_proofs: []
	};
	const db = new FakeD1(tables) as unknown as Parameters<typeof createGovernanceOperatorSignalAction>[0];

	const signal = await createGovernanceOperatorSignalAction(db, {
		atlasCanvasId: 'canvas_manual',
		atlasNodeId: 'node_docs',
		source: 'slack:#api-updates',
		sourceUrl: 'https://slack.example/archives/C123/p456',
		title: 'API update needs docs review',
		summary: 'The public API response shape changed and reviewers need a docs pass.',
		requiresDocumentationReview: true,
		requiresReviewerProcessReview: true,
		reasons: 'API surface changed; Reviewer workflow was mentioned'
	});

	assert.equal(signal.atlas_canvas_id, 'canvas_manual');
	assert.equal(signal.atlas_node_id, 'node_docs');
	assert.equal(signal.source, 'slack:#api-updates');
	assert.equal(signal.source_url, 'https://slack.example/archives/C123/p456');
	assert.equal(signal.payload.operator_surface, '/admin/governance');
	assert.equal(signal.payload.manual_intake, true);
	assert.deepEqual(signal.payload.classification, {
		requires_documentation_review: true,
		requires_reviewer_process_review: true,
		reasons: ['API surface changed', 'Reviewer workflow was mentioned']
	});
	assert.equal(tables.governance_signals.length, 1);
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
	assert.equal(empty.graph.attachment_capabilities.length, 12);
	assert.deepEqual(
		empty.graph.attachment_capabilities
			.filter((capability) => capability.required)
			.map((capability) => [
				`${capability.source_product_id}->${capability.target_product_id}`,
				capability.can_attach,
				capability.attached
			]),
		[
			['atlas->signal', true, false],
			['signal->decision', true, false],
			['decision->proof', true, false],
			['proof->atlas', true, false]
		]
	);
});

test('safeOperatorExternalHref only allows http and https links', () => {
	assert.equal(safeOperatorExternalHref('https://example.com/path'), 'https://example.com/path');
	assert.equal(safeOperatorExternalHref(' http://example.com/path '), 'http://example.com/path');
	assert.equal(safeOperatorExternalHref('javascript:alert(1)'), null);
	assert.equal(safeOperatorExternalHref('data:text/html,<script>alert(1)</script>'), null);
	assert.equal(safeOperatorExternalHref('/relative/path'), null);
});
