import assert from 'node:assert/strict';
import test from 'node:test';

import {
	createGovernanceDecision,
	createGovernanceProof,
	createGovernanceSignal,
	listGovernanceDecisions,
	listGovernanceProofs,
	listGovernanceSignals
} from '../src/lib/server/governance-runtime.ts';
import { buildGovernanceAttachmentGraph } from '../src/lib/server/governance-graph.ts';
import { GET as getDecisions, POST as postDecision } from '../src/routes/api/governance/decisions/+server.ts';
import { GET as getGraph } from '../src/routes/api/governance/graph/+server.ts';
import { POST as postSourceUpdate } from '../src/routes/api/governance/intake/source-update/+server.ts';
import { GET as getProofs, POST as postProof } from '../src/routes/api/governance/proofs/+server.ts';
import { GET as getSignals, POST as postSignal } from '../src/routes/api/governance/signals/+server.ts';

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
		const tableName = this.tableFromSelect();
		if (!tableName) return { results: [] };

		let rows = [...(this.tables[tableName] ?? [])];
		const limit = Number(this.values.at(-1) ?? 100);
		let filterIndex = 0;

		for (const column of ['atlas_canvas_id', 'atlas_node_id', 'signal_id', 'decision_id']) {
			if (!this.sql.includes(`${column} = ?`)) continue;
			const expected = this.values[filterIndex++];
			rows = rows.filter((row) => row[column] === expected);
		}

		rows.sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
		return { results: rows.slice(0, limit) as T[] };
	}

	async run(): Promise<{ success: true }> {
		const insertTable = this.tableFromInsert();
		if (!insertTable) return { success: true };

		const row = this.rowFromInsert(insertTable);
		this.tables[insertTable] ??= [];
		this.tables[insertTable].push(row);
		return { success: true };
	}

	private tableFromSelect(): string | undefined {
		return Object.keys(this.tables).find((table) => this.sql.includes(`FROM ${table}`));
	}

	private tableFromInsert(): string | undefined {
		return ['governance_signals', 'governance_decisions', 'governance_proofs'].find((table) =>
			this.sql.includes(`INSERT INTO ${table}`)
		);
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
	constructor(private readonly tables: Record<string, TableRow[]> = defaultTables()) {}

	prepare(sql: string): FakeStatement {
		return new FakeStatement(this.tables, sql);
	}
}

function defaultTables(): Record<string, TableRow[]> {
	return {
		governance_signals: [],
		governance_decisions: [],
		governance_proofs: []
	};
}

function event(db: FakeD1, url = 'https://createsomething.agency/api/governance/signals') {
	return {
		platform: { env: { DB: db } },
		url: new URL(url)
	} as never;
}

function credentialedGetEvent(
	db: FakeD1,
	url = 'https://createsomething.agency/api/governance/graph',
	options: { configuredKey?: string; providedKey?: string | null } = {}
) {
	const configuredKey = options.configuredKey ?? 'test-internal-key';
	const providedKey = options.providedKey === undefined ? configuredKey : options.providedKey;
	const headers = new Headers();
	if (providedKey) headers.set('authorization', `Bearer ${providedKey}`);
	return {
		platform: { env: { DB: db, AGENCY_INTERNAL_API_KEY: configuredKey } },
		request: new Request(url, { headers }),
		url: new URL(url)
	} as never;
}

function postEvent(
	db: FakeD1,
	body: Record<string, unknown>,
	options: { configuredKey?: string; providedKey?: string | null } = {}
) {
	const configuredKey = options.configuredKey ?? 'test-internal-key';
	const providedKey = options.providedKey === undefined ? configuredKey : options.providedKey;
	const headers = new Headers({ 'content-type': 'application/json' });
	if (providedKey) headers.set('authorization', `Bearer ${providedKey}`);
	return {
		platform: { env: { DB: db, AGENCY_INTERNAL_API_KEY: configuredKey } },
		request: new Request('https://createsomething.agency/api/governance/signals', {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		})
	} as never;
}

function postEventWithoutConfiguredKey(db: FakeD1, body: Record<string, unknown>) {
	return {
		platform: { env: { DB: db } },
		request: new Request('https://createsomething.agency/api/governance/signals', {
			method: 'POST',
			headers: { authorization: 'Bearer test-internal-key' },
			body: JSON.stringify(body)
		})
	} as never;
}

test('governance runtime records the Signal Decision Proof loop with Atlas attachments', async () => {
	const db = new FakeD1() as unknown as Parameters<typeof createGovernanceSignal>[0];

	const signal = await createGovernanceSignal(db, {
		atlasCanvasId: 'canvas_api_docs',
		atlasNodeId: 'node_api_updates',
		source: 'slack:#api-updates',
		sourceUrl: 'https://slack.example/archives/C123/p456',
		title: 'Checkout API added beta parameter',
		summary: 'Review whether the API docs and reviewer checklist need updates.',
		payload: { channel: 'api-updates', docImpact: true }
	});
	const decision = await createGovernanceDecision(db, {
		signalId: signal.id,
		atlasCanvasId: signal.atlas_canvas_id,
		atlasNodeId: signal.atlas_node_id,
		decisionState: 'wait',
		decisionOwner: 'docs-reviewer@example.com',
		reason: 'Hold approval until the public docs mention the new parameter.',
		payload: { requiresDocs: true, requiresReviewerProcess: true }
	});
	const proof = await createGovernanceProof(db, {
		signalId: signal.id,
		decisionId: decision.id,
		atlasCanvasId: signal.atlas_canvas_id,
		atlasNodeId: signal.atlas_node_id,
		evidence: 'Docs PR and reviewer checklist update were both linked.',
		outcome: 'documented',
		receiptUrl: 'https://github.example/pr/123'
	});

	assert.equal(signal.atlas_canvas_id, 'canvas_api_docs');
	assert.equal(signal.atlas_node_id, 'node_api_updates');
	assert.equal(signal.payload.docImpact, true);
	assert.equal(decision.signal_id, signal.id);
	assert.equal(decision.decision_state, 'wait');
	assert.equal(proof.decision_id, decision.id);
	assert.equal(proof.signal_id, signal.id);

	const canvasSignals = await listGovernanceSignals(db, { atlasCanvasId: 'canvas_api_docs' });
	const signalDecisions = await listGovernanceDecisions(db, { signalId: signal.id });
	const decisionProofs = await listGovernanceProofs(db, { decisionId: decision.id });

	assert.equal(canvasSignals.length, 1);
	assert.equal(signalDecisions[0]?.id, decision.id);
	assert.equal(decisionProofs[0]?.id, proof.id);
});

test('governance runtime validates required fields and migration availability', async () => {
	const db = new FakeD1({ governance_signals: [] }) as unknown as Parameters<
		typeof createGovernanceDecision
	>[0];

	await assert.rejects(
		createGovernanceSignal(db, {
			atlasCanvasId: '',
			source: 'slack',
			title: 'Missing canvas',
			summary: 'Missing canvas'
		}),
		/atlasCanvasId is required/
	);

	await assert.rejects(
		createGovernanceDecision(db, {
			signalId: 'sig_1',
			atlasCanvasId: 'canvas_1',
			decisionState: 'run',
			decisionOwner: 'operator@example.com',
			reason: 'Ready to run'
		}),
		/governance_decisions table is not available/
	);
});

test('governance APIs create and filter runtime records', async () => {
	const db = new FakeD1();
	const signalResponse = await postSignal(
		postEvent(db, {
			atlas_canvas_id: 'canvas_runtime',
			atlas_node_id: 'node_slack',
			source: 'slack:#api-updates',
			title: 'API field renamed',
			summary: 'Documentation may need a rename notice.',
			payload: { channel: 'api-updates' }
		})
	);
	const signalPayload = await signalResponse.json();

	assert.equal(signalResponse.status, 201);
	assert.equal(signalPayload.signal.atlas_canvas_id, 'canvas_runtime');

	const decisionResponse = await postDecision(
		postEvent(db, {
			signal_id: signalPayload.signal.id,
			atlas_canvas_id: 'canvas_runtime',
			atlas_node_id: 'node_slack',
			decision_state: 'run',
			decision_owner: 'reviewer@example.com',
			reason: 'Reviewer process update is needed.'
		})
	);
	const decisionPayload = await decisionResponse.json();
	assert.equal(decisionResponse.status, 201);
	assert.equal(decisionPayload.decision.signal_id, signalPayload.signal.id);

	const proofResponse = await postProof(
		postEvent(db, {
			signal_id: signalPayload.signal.id,
			decision_id: decisionPayload.decision.id,
			atlas_canvas_id: 'canvas_runtime',
			atlas_node_id: 'node_slack',
			evidence: 'Reviewer checklist update shipped.',
			outcome: 'passed',
			receipt_url: 'https://github.example/pr/456'
		})
	);
	assert.equal(proofResponse.status, 201);

	const filteredSignals = await getSignals(
		event(db, 'https://createsomething.agency/api/governance/signals?atlas_canvas_id=canvas_runtime')
	);
	const filteredDecisions = await getDecisions(
		event(db, `https://createsomething.agency/api/governance/decisions?signal_id=${signalPayload.signal.id}`)
	);
	const filteredProofs = await getProofs(
		event(db, `https://createsomething.agency/api/governance/proofs?decision_id=${decisionPayload.decision.id}`)
	);

	assert.equal(filteredSignals.status, 200);
	assert.equal((await filteredSignals.json()).count, 1);
	assert.equal((await filteredDecisions.json()).decisions[0].id, decisionPayload.decision.id);
	assert.equal((await filteredProofs.json()).proofs[0].outcome, 'passed');
});

test('governance graph composes Atlas Signal Decision Proof attachments by canvas', async () => {
	const db = new FakeD1();
	const signal = await createGovernanceSignal(db as unknown as Parameters<typeof createGovernanceSignal>[0], {
		atlasCanvasId: 'canvas_graph',
		atlasNodeId: 'node_api',
		source: 'slack:#api-updates',
		title: 'API update needs review',
		summary: 'Docs and reviewer process need a coordinated review.'
	});
	const decision = await createGovernanceDecision(
		db as unknown as Parameters<typeof createGovernanceDecision>[0],
		{
			signalId: signal.id,
			atlasCanvasId: signal.atlas_canvas_id,
			atlasNodeId: signal.atlas_node_id,
			decisionState: 'wait',
			decisionOwner: 'docs-reviewer@example.com',
			reason: 'Wait for docs and process review.'
		}
	);
	const proof = await createGovernanceProof(db as unknown as Parameters<typeof createGovernanceProof>[0], {
		signalId: signal.id,
		decisionId: decision.id,
		atlasCanvasId: signal.atlas_canvas_id,
		atlasNodeId: signal.atlas_node_id,
		evidence: 'Review receipt was recorded.',
		outcome: 'documented'
	});

	const graph = await buildGovernanceAttachmentGraph(
		db as unknown as Parameters<typeof buildGovernanceAttachmentGraph>[0],
		{
			atlasCanvasId: 'canvas_graph',
			limit: 100
		}
	);

	assert.equal(graph.schemaVersion, 1);
	assert.equal(graph.atlas.canvas_id, 'canvas_graph');
	assert.deepEqual(graph.product_loop, ['atlas', 'signal', 'decision', 'proof']);
	assert.deepEqual(
		graph.nodes.map((node) => node.id),
		[`atlas:canvas_graph`, `signal:${signal.id}`, `decision:${decision.id}`, `proof:${proof.id}`]
	);
	assert.deepEqual(
		graph.attachments.map((attachment) => [
			attachment.source,
			attachment.target,
			attachment.mode,
			attachment.label
		]),
		[
			[`atlas:canvas_graph`, `signal:${signal.id}`, 'connects', 'Atlas maps where the signal enters.'],
			[`signal:${signal.id}`, `decision:${decision.id}`, 'produces', 'Signal produces a decision requirement.'],
			[`decision:${decision.id}`, `proof:${proof.id}`, 'produces', 'Decision produces proof of the action or pause.'],
			[`proof:${proof.id}`, `atlas:canvas_graph`, 'records', 'Proof records back onto the Atlas map.']
		]
	);
	assert.equal(graph.attachment_capabilities.length, 12);
	assert.deepEqual(
		graph.attachment_capabilities
			.filter((capability) => capability.required)
			.map((capability) => [
				`${capability.source_product_id}->${capability.target_product_id}`,
				capability.attached,
				capability.current_attachment_count
			]),
		[
			['atlas->signal', true, 1],
			['signal->decision', true, 1],
			['decision->proof', true, 1],
			['proof->atlas', true, 1]
		]
	);
	assert.deepEqual(
		graph.attachment_capabilities
			.filter(
				(capability) =>
					!capability.required &&
					['atlas->decision', 'atlas->proof', 'signal->proof'].includes(
						`${capability.source_product_id}->${capability.target_product_id}`
					)
			)
			.map((capability) => [
				`${capability.source_product_id}->${capability.target_product_id}`,
				capability.can_attach,
				capability.attached
			]),
		[
			['atlas->decision', true, false],
			['atlas->proof', true, false],
			['signal->proof', true, false]
		]
	);

	const response = await getGraph(
		credentialedGetEvent(
			db,
			'https://createsomething.agency/api/governance/graph?atlas_canvas_id=canvas_graph'
		)
	);
	const payload = await response.json();

	assert.equal(response.status, 200);
	assert.equal(payload.graph.atlas.canvas_id, 'canvas_graph');
	assert.equal(payload.graph.nodes.length, 4);
	assert.equal(payload.graph.attachments.length, 4);
	assert.equal(payload.graph.attachment_capabilities.length, 12);

	const unauthorized = await getGraph(
		credentialedGetEvent(
			db,
			'https://createsomething.agency/api/governance/graph?atlas_canvas_id=canvas_graph',
			{ providedKey: null }
		)
	);
	const unauthorizedPayload = await unauthorized.json();

	assert.equal(unauthorized.status, 401);
	assert.match(unauthorizedPayload.error, /governance write credential/i);
});

test('governance write APIs require the internal credential', async () => {
	const db = new FakeD1();
	const unauthorized = await postSignal(
		postEvent(
			db,
			{
				atlas_canvas_id: 'canvas_runtime',
				source: 'slack:#api-updates',
				title: 'API field renamed',
				summary: 'Documentation may need a rename notice.'
			},
			{ providedKey: null }
		)
	);
	const unauthorizedPayload = await unauthorized.json();

	assert.equal(unauthorized.status, 401);
	assert.match(unauthorizedPayload.error, /governance write credential/i);

	const notConfigured = await postSignal(
		postEventWithoutConfiguredKey(db, {
			atlas_canvas_id: 'canvas_runtime',
			source: 'slack:#api-updates',
			title: 'API field renamed',
			summary: 'Documentation may need a rename notice.'
		})
	);
	const notConfiguredPayload = await notConfigured.json();

	assert.equal(notConfigured.status, 503);
	assert.match(notConfiguredPayload.error, /AGENCY_INTERNAL_API_KEY/);
});

test('governance source intake creates Signals for documentation-impacting updates', async () => {
	const db = new FakeD1();
	const response = await postSourceUpdate(
		postEvent(db, {
			source_type: 'slack',
			channel: '#api-updates',
			message_url: 'https://slack.example/archives/C123/p456',
			atlas_canvas_id: 'canvas_api_docs',
			atlas_node_id: 'node_api_updates',
			title: 'Checkout API added beta parameter',
			text: 'The Checkout API added a beta response field. Public docs and OpenAPI reference need updates.',
			payload: { slack_ts: '123.456' }
		})
	);
	const payload = await response.json();

	assert.equal(response.status, 201);
	assert.equal(payload.action, 'signal_created');
	assert.equal(payload.classification.requires_documentation_review, true);
	assert.equal(payload.classification.requires_reviewer_process_review, false);
	assert.equal(payload.signal.source, 'slack:#api-updates');
	assert.equal(payload.signal.source_url, 'https://slack.example/archives/C123/p456');
	assert.equal(payload.signal.atlas_canvas_id, 'canvas_api_docs');
	assert.equal(payload.signal.atlas_node_id, 'node_api_updates');
	assert.equal(payload.signal.payload.classification.requires_documentation_review, true);
	assert.equal(payload.signal.payload.source_update.channel, '#api-updates');
	assert.equal(payload.signal.payload.slack_ts, '123.456');

	const signals = await listGovernanceSignals(db, { atlasCanvasId: 'canvas_api_docs' });
	assert.equal(signals.length, 1);
});

test('governance source intake creates Signals for reviewer-process updates', async () => {
	const db = new FakeD1();
	const response = await postSourceUpdate(
		postEvent(db, {
			source_type: 'slack',
			channel: '#review-ops',
			text: 'Reviewer checklist now requires approval before marketplace submission exceptions are granted.'
		})
	);
	const payload = await response.json();

	assert.equal(response.status, 201);
	assert.equal(payload.classification.requires_documentation_review, false);
	assert.equal(payload.classification.requires_reviewer_process_review, true);
	assert.equal(payload.signal.atlas_canvas_id, 'governance_source_updates');
	assert.equal(payload.signal.atlas_node_id, 'watched_source_updates');
});

test('governance source intake ignores updates without governance impact', async () => {
	const db = new FakeD1();
	const response = await postSourceUpdate(
		postEvent(db, {
			source_type: 'slack',
			channel: '#api-updates',
			text: 'Heads up: the team lunch moved to noon.'
		})
	);
	const payload = await response.json();

	assert.equal(response.status, 202);
	assert.equal(payload.action, 'ignored');
	assert.equal(payload.signal, null);
	assert.equal(payload.classification.requires_documentation_review, false);
	assert.equal(payload.classification.requires_reviewer_process_review, false);

	const signals = await listGovernanceSignals(db);
	assert.equal(signals.length, 0);
});

test('governance source intake requires the internal credential', async () => {
	const db = new FakeD1();
	const response = await postSourceUpdate(
		postEvent(
			db,
			{
				source_type: 'slack',
				channel: '#api-updates',
				text: 'API endpoint changed.'
			},
			{ providedKey: null }
		)
	);
	const payload = await response.json();

	assert.equal(response.status, 401);
	assert.match(payload.error, /governance write credential/i);
});

test('governance APIs report D1 as required runtime infrastructure', async () => {
	const response = await postSignal({
		platform: undefined,
		request: new Request('https://createsomething.agency/api/governance/signals', {
			method: 'POST',
			body: JSON.stringify({
				atlas_canvas_id: 'canvas_1',
				source: 'slack',
				title: 'Signal',
				summary: 'Summary'
			})
		})
	} as never);
	const payload = await response.json();

	assert.equal(response.status, 503);
	assert.match(payload.error, /D1 binding/);
});
