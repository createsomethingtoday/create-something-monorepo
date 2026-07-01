import {
	canAttachGovernanceProducts,
	type GovernanceProductAttachmentMode,
	type GovernanceProductId
} from '@create-something/canon/governance';

export type GovernanceSignalStatus = 'new' | 'reviewing' | 'resolved' | 'dismissed';
export type GovernanceDecisionState = 'run' | 'wait' | 'stop';
export type GovernanceProofOutcome = 'documented' | 'passed' | 'failed' | 'rolled_back';

export interface GovernanceSignalRow {
	id: string;
	atlas_canvas_id: string;
	atlas_node_id: string | null;
	source: string;
	source_url: string | null;
	title: string;
	summary: string;
	status: GovernanceSignalStatus;
	payload_json: string;
	created_at: string;
	updated_at: string;
}

export interface GovernanceDecisionRow {
	id: string;
	signal_id: string;
	atlas_canvas_id: string;
	atlas_node_id: string | null;
	decision_state: GovernanceDecisionState;
	decision_owner: string;
	reason: string;
	payload_json: string;
	created_at: string;
	updated_at: string;
}

export interface GovernanceProofRow {
	id: string;
	signal_id: string | null;
	decision_id: string;
	atlas_canvas_id: string;
	atlas_node_id: string | null;
	evidence: string;
	outcome: GovernanceProofOutcome;
	receipt_url: string | null;
	rollback_note: string | null;
	payload_json: string;
	created_at: string;
	updated_at: string;
}

export interface GovernanceProductAttachmentRow {
	id: string;
	source_product_id: GovernanceProductId;
	source_record_id: string;
	target_product_id: GovernanceProductId;
	target_record_id: string;
	atlas_canvas_id: string;
	atlas_node_id: string | null;
	mode: GovernanceProductAttachmentMode;
	label: string;
	required: 0 | 1;
	metadata_json: string;
	created_at: string;
	updated_at: string;
}

export type GovernanceSignal = Omit<GovernanceSignalRow, 'payload_json'> & {
	payload: Record<string, unknown>;
};

export type GovernanceDecision = Omit<GovernanceDecisionRow, 'payload_json'> & {
	payload: Record<string, unknown>;
};

export type GovernanceProof = Omit<GovernanceProofRow, 'payload_json'> & {
	payload: Record<string, unknown>;
};

export type GovernanceProductAttachment = Omit<
	GovernanceProductAttachmentRow,
	'metadata_json' | 'required'
> & {
	required: boolean;
	metadata: Record<string, unknown>;
};

export interface GovernanceSignalInput {
	atlasCanvasId: string;
	atlasNodeId?: string | null;
	source: string;
	sourceUrl?: string | null;
	title: string;
	summary: string;
	status?: GovernanceSignalStatus;
	payload?: Record<string, unknown>;
}

export interface GovernanceDecisionInput {
	signalId: string;
	atlasCanvasId: string;
	atlasNodeId?: string | null;
	decisionState: GovernanceDecisionState;
	decisionOwner: string;
	reason: string;
	payload?: Record<string, unknown>;
}

export interface GovernanceProofInput {
	signalId?: string | null;
	decisionId: string;
	atlasCanvasId: string;
	atlasNodeId?: string | null;
	evidence: string;
	outcome?: GovernanceProofOutcome;
	receiptUrl?: string | null;
	rollbackNote?: string | null;
	payload?: Record<string, unknown>;
}

export interface GovernanceProductAttachmentInput {
	sourceProductId: GovernanceProductId;
	sourceRecordId: string;
	targetProductId: GovernanceProductId;
	targetRecordId: string;
	atlasCanvasId: string;
	atlasNodeId?: string | null;
	mode?: GovernanceProductAttachmentMode;
	label?: string | null;
	required?: boolean;
	metadata?: Record<string, unknown>;
}

export interface GovernanceRecordFilters {
	atlasCanvasId?: string | null;
	atlasNodeId?: string | null;
	signalId?: string | null;
	decisionId?: string | null;
	sourceProductId?: GovernanceProductId | null;
	targetProductId?: GovernanceProductId | null;
	limit?: number;
}

interface D1PreparedStatementLike {
	bind(...values: unknown[]): D1PreparedStatementLike;
	all<T = unknown>(): Promise<{ results?: T[] }>;
	first<T = unknown>(): Promise<T | null>;
	run(): Promise<unknown>;
}

interface D1DatabaseLike {
	prepare(query: string): D1PreparedStatementLike;
}

const SIGNAL_STATUSES = new Set<GovernanceSignalStatus>(['new', 'reviewing', 'resolved', 'dismissed']);
const DECISION_STATES = new Set<GovernanceDecisionState>(['run', 'wait', 'stop']);
const PROOF_OUTCOMES = new Set<GovernanceProofOutcome>([
	'documented',
	'passed',
	'failed',
	'rolled_back'
]);
const PRODUCT_IDS = new Set<GovernanceProductId>(['atlas', 'signal', 'decision', 'proof']);
const ATTACHMENT_MODES = new Set<GovernanceProductAttachmentMode>([
	'connects',
	'consumes',
	'produces',
	'records'
]);
const TABLE_MIGRATIONS: Record<string, string> = {
	governance_signals: '0030',
	governance_decisions: '0030',
	governance_proofs: '0030',
	governance_product_attachments: '0032'
};

export async function createGovernanceSignal(
	db: D1DatabaseLike,
	input: GovernanceSignalInput
): Promise<GovernanceSignal> {
	await assertTableAvailable(db, 'governance_signals');
	const now = new Date().toISOString();
	const row: GovernanceSignalRow = {
		id: createId('gov_sig'),
		atlas_canvas_id: requiredText(input.atlasCanvasId, 'atlasCanvasId', 160),
		atlas_node_id: optionalText(input.atlasNodeId, 160),
		source: requiredText(input.source, 'source', 160),
		source_url: optionalText(input.sourceUrl, 500),
		title: requiredText(input.title, 'title', 220),
		summary: requiredText(input.summary, 'summary', 2_000),
		status: normalizeSignalStatus(input.status),
		payload_json: stringifyPayload(input.payload),
		created_at: now,
		updated_at: now
	};

	await db
		.prepare(
			`INSERT INTO governance_signals (
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
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			row.id,
			row.atlas_canvas_id,
			row.atlas_node_id,
			row.source,
			row.source_url,
			row.title,
			row.summary,
			row.status,
			row.payload_json,
			row.created_at,
			row.updated_at
		)
		.run();

	return serializeSignal(row);
}

export async function listGovernanceSignals(
	db: D1DatabaseLike,
	filters: GovernanceRecordFilters = {}
): Promise<GovernanceSignal[]> {
	await assertTableAvailable(db, 'governance_signals');
	const { sql, values } = buildListQuery(
		`SELECT id, atlas_canvas_id, atlas_node_id, source, source_url, title, summary,
		        status, payload_json, created_at, updated_at
		   FROM governance_signals`,
		filters,
		['atlasCanvasId', 'atlasNodeId']
	);
	const rows = await queryAll<GovernanceSignalRow>(db, sql, values);
	return rows.map(serializeSignal);
}

export async function getGovernanceSignal(
	db: D1DatabaseLike,
	id: string
): Promise<GovernanceSignal | null> {
	await assertTableAvailable(db, 'governance_signals');
	const row = await db
		.prepare(
			`SELECT id, atlas_canvas_id, atlas_node_id, source, source_url, title, summary,
			        status, payload_json, created_at, updated_at
			   FROM governance_signals
			  WHERE id = ?`
		)
		.bind(requiredText(id, 'signalId', 160))
		.first<GovernanceSignalRow>();
	return row ? serializeSignal(row) : null;
}

export async function updateGovernanceSignalStatus(
	db: D1DatabaseLike,
	id: string,
	status: GovernanceSignalStatus
): Promise<void> {
	await assertTableAvailable(db, 'governance_signals');
	await db
		.prepare(
			`UPDATE governance_signals
			    SET status = ?,
			        updated_at = ?
			  WHERE id = ?`
		)
		.bind(normalizeSignalStatus(status), new Date().toISOString(), requiredText(id, 'signalId', 160))
		.run();
}

export async function createGovernanceDecision(
	db: D1DatabaseLike,
	input: GovernanceDecisionInput
): Promise<GovernanceDecision> {
	await assertTableAvailable(db, 'governance_decisions');
	const now = new Date().toISOString();
	const row: GovernanceDecisionRow = {
		id: createId('gov_dec'),
		signal_id: requiredText(input.signalId, 'signalId', 160),
		atlas_canvas_id: requiredText(input.atlasCanvasId, 'atlasCanvasId', 160),
		atlas_node_id: optionalText(input.atlasNodeId, 160),
		decision_state: normalizeDecisionState(input.decisionState),
		decision_owner: requiredText(input.decisionOwner, 'decisionOwner', 220),
		reason: requiredText(input.reason, 'reason', 2_000),
		payload_json: stringifyPayload(input.payload),
		created_at: now,
		updated_at: now
	};

	await db
		.prepare(
			`INSERT INTO governance_decisions (
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
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			row.id,
			row.signal_id,
			row.atlas_canvas_id,
			row.atlas_node_id,
			row.decision_state,
			row.decision_owner,
			row.reason,
			row.payload_json,
			row.created_at,
			row.updated_at
		)
		.run();

	return serializeDecision(row);
}

export async function listGovernanceDecisions(
	db: D1DatabaseLike,
	filters: GovernanceRecordFilters = {}
): Promise<GovernanceDecision[]> {
	await assertTableAvailable(db, 'governance_decisions');
	const { sql, values } = buildListQuery(
		`SELECT id, signal_id, atlas_canvas_id, atlas_node_id, decision_state, decision_owner,
		        reason, payload_json, created_at, updated_at
		   FROM governance_decisions`,
		filters,
		['atlasCanvasId', 'atlasNodeId', 'signalId']
	);
	const rows = await queryAll<GovernanceDecisionRow>(db, sql, values);
	return rows.map(serializeDecision);
}

export async function getGovernanceDecision(
	db: D1DatabaseLike,
	id: string
): Promise<GovernanceDecision | null> {
	await assertTableAvailable(db, 'governance_decisions');
	const row = await db
		.prepare(
			`SELECT id, signal_id, atlas_canvas_id, atlas_node_id, decision_state, decision_owner,
			        reason, payload_json, created_at, updated_at
			   FROM governance_decisions
			  WHERE id = ?`
		)
		.bind(requiredText(id, 'decisionId', 160))
		.first<GovernanceDecisionRow>();
	return row ? serializeDecision(row) : null;
}

export async function createGovernanceProof(
	db: D1DatabaseLike,
	input: GovernanceProofInput
): Promise<GovernanceProof> {
	await assertTableAvailable(db, 'governance_proofs');
	const now = new Date().toISOString();
	const row: GovernanceProofRow = {
		id: createId('gov_proof'),
		signal_id: optionalText(input.signalId, 160),
		decision_id: requiredText(input.decisionId, 'decisionId', 160),
		atlas_canvas_id: requiredText(input.atlasCanvasId, 'atlasCanvasId', 160),
		atlas_node_id: optionalText(input.atlasNodeId, 160),
		evidence: requiredText(input.evidence, 'evidence', 4_000),
		outcome: normalizeProofOutcome(input.outcome),
		receipt_url: optionalText(input.receiptUrl, 500),
		rollback_note: optionalText(input.rollbackNote, 2_000),
		payload_json: stringifyPayload(input.payload),
		created_at: now,
		updated_at: now
	};

	await db
		.prepare(
			`INSERT INTO governance_proofs (
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
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			row.id,
			row.signal_id,
			row.decision_id,
			row.atlas_canvas_id,
			row.atlas_node_id,
			row.evidence,
			row.outcome,
			row.receipt_url,
			row.rollback_note,
			row.payload_json,
			row.created_at,
			row.updated_at
		)
		.run();

	return serializeProof(row);
}

export async function listGovernanceProofs(
	db: D1DatabaseLike,
	filters: GovernanceRecordFilters = {}
): Promise<GovernanceProof[]> {
	await assertTableAvailable(db, 'governance_proofs');
	const { sql, values } = buildListQuery(
		`SELECT id, signal_id, decision_id, atlas_canvas_id, atlas_node_id, evidence, outcome,
		        receipt_url, rollback_note, payload_json, created_at, updated_at
		   FROM governance_proofs`,
		filters,
		['atlasCanvasId', 'atlasNodeId', 'signalId', 'decisionId']
	);
	const rows = await queryAll<GovernanceProofRow>(db, sql, values);
	return rows.map(serializeProof);
}

export async function createGovernanceProductAttachment(
	db: D1DatabaseLike,
	input: GovernanceProductAttachmentInput
): Promise<GovernanceProductAttachment> {
	await assertTableAvailable(db, 'governance_product_attachments');
	const sourceProductId = normalizeProductId(input.sourceProductId, 'sourceProductId');
	const targetProductId = normalizeProductId(input.targetProductId, 'targetProductId');
	if (sourceProductId === targetProductId) {
		throw new Error('sourceProductId and targetProductId must be different');
	}
	if (!canAttachGovernanceProducts(sourceProductId, targetProductId)) {
		throw new Error(`${sourceProductId} cannot attach to ${targetProductId}`);
	}

	const now = new Date().toISOString();
	const row: GovernanceProductAttachmentRow = {
		id: createId('gov_att'),
		source_product_id: sourceProductId,
		source_record_id: requiredText(input.sourceRecordId, 'sourceRecordId', 180),
		target_product_id: targetProductId,
		target_record_id: requiredText(input.targetRecordId, 'targetRecordId', 180),
		atlas_canvas_id: requiredText(input.atlasCanvasId, 'atlasCanvasId', 160),
		atlas_node_id: optionalText(input.atlasNodeId, 160),
		mode: normalizeAttachmentMode(input.mode, sourceProductId),
		label:
			optionalText(input.label, 280) ??
			`${sourceProductId} attaches to ${targetProductId}`,
		required: input.required ? 1 : 0,
		metadata_json: stringifyPayload(input.metadata),
		created_at: now,
		updated_at: now
	};

	await db
		.prepare(
			`INSERT INTO governance_product_attachments (
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
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			row.id,
			row.source_product_id,
			row.source_record_id,
			row.target_product_id,
			row.target_record_id,
			row.atlas_canvas_id,
			row.atlas_node_id,
			row.mode,
			row.label,
			row.required,
			row.metadata_json,
			row.created_at,
			row.updated_at
		)
		.run();

	return serializeProductAttachment(row);
}

export async function listGovernanceProductAttachments(
	db: D1DatabaseLike,
	filters: GovernanceRecordFilters = {}
): Promise<GovernanceProductAttachment[]> {
	await assertTableAvailable(db, 'governance_product_attachments');
	const { sql, values } = buildListQuery(
		`SELECT id, source_product_id, source_record_id, target_product_id, target_record_id,
		        atlas_canvas_id, atlas_node_id, mode, label, required, metadata_json, created_at, updated_at
		   FROM governance_product_attachments`,
		filters,
		['atlasCanvasId', 'atlasNodeId', 'sourceProductId', 'targetProductId']
	);
	const rows = await queryAll<GovernanceProductAttachmentRow>(db, sql, values);
	return rows.map(serializeProductAttachment);
}

export function normalizeSignalRequestBody(body: Record<string, unknown>): GovernanceSignalInput {
	return {
		atlasCanvasId: requiredStringFromBody(body, 'atlas_canvas_id', 'atlasCanvasId'),
		atlasNodeId: stringFromBody(body, 'atlas_node_id', 'atlasNodeId'),
		source: requiredStringFromBody(body, 'source'),
		sourceUrl: stringFromBody(body, 'source_url', 'sourceUrl'),
		title: requiredStringFromBody(body, 'title'),
		summary: requiredStringFromBody(body, 'summary'),
		status: stringFromBody(body, 'status') as GovernanceSignalStatus | undefined,
		payload: objectFromBody(body, 'payload')
	};
}

export function normalizeDecisionRequestBody(body: Record<string, unknown>): GovernanceDecisionInput {
	return {
		signalId: requiredStringFromBody(body, 'signal_id', 'signalId'),
		atlasCanvasId: requiredStringFromBody(body, 'atlas_canvas_id', 'atlasCanvasId'),
		atlasNodeId: stringFromBody(body, 'atlas_node_id', 'atlasNodeId'),
		decisionState: requiredStringFromBody(body, 'decision_state', 'decisionState') as GovernanceDecisionState,
		decisionOwner: requiredStringFromBody(body, 'decision_owner', 'decisionOwner'),
		reason: requiredStringFromBody(body, 'reason'),
		payload: objectFromBody(body, 'payload')
	};
}

export function normalizeProofRequestBody(body: Record<string, unknown>): GovernanceProofInput {
	return {
		signalId: stringFromBody(body, 'signal_id', 'signalId'),
		decisionId: requiredStringFromBody(body, 'decision_id', 'decisionId'),
		atlasCanvasId: requiredStringFromBody(body, 'atlas_canvas_id', 'atlasCanvasId'),
		atlasNodeId: stringFromBody(body, 'atlas_node_id', 'atlasNodeId'),
		evidence: requiredStringFromBody(body, 'evidence'),
		outcome: stringFromBody(body, 'outcome') as GovernanceProofOutcome | undefined,
		receiptUrl: stringFromBody(body, 'receipt_url', 'receiptUrl'),
		rollbackNote: stringFromBody(body, 'rollback_note', 'rollbackNote'),
		payload: objectFromBody(body, 'payload')
	};
}

export function normalizeAttachmentRequestBody(
	body: Record<string, unknown>
): GovernanceProductAttachmentInput {
	return {
		sourceProductId: requiredStringFromBody(
			body,
			'source_product_id',
			'sourceProductId'
		) as GovernanceProductId,
		sourceRecordId: requiredStringFromBody(body, 'source_record_id', 'sourceRecordId'),
		targetProductId: requiredStringFromBody(
			body,
			'target_product_id',
			'targetProductId'
		) as GovernanceProductId,
		targetRecordId: requiredStringFromBody(body, 'target_record_id', 'targetRecordId'),
		atlasCanvasId: requiredStringFromBody(body, 'atlas_canvas_id', 'atlasCanvasId'),
		atlasNodeId: stringFromBody(body, 'atlas_node_id', 'atlasNodeId'),
		mode: stringFromBody(body, 'mode') as GovernanceProductAttachmentMode | undefined,
		label: stringFromBody(body, 'label'),
		required: booleanFromBody(body, 'required'),
		metadata: objectFromBody(body, 'metadata')
	};
}

export function filtersFromSearchParams(params: URLSearchParams): GovernanceRecordFilters {
	return {
		atlasCanvasId: params.get('atlas_canvas_id') ?? params.get('atlasCanvasId'),
		atlasNodeId: params.get('atlas_node_id') ?? params.get('atlasNodeId'),
		signalId: params.get('signal_id') ?? params.get('signalId'),
		decisionId: params.get('decision_id') ?? params.get('decisionId'),
		sourceProductId: (params.get('source_product_id') ?? params.get('sourceProductId')) as
			| GovernanceProductId
			| null,
		targetProductId: (params.get('target_product_id') ?? params.get('targetProductId')) as
			| GovernanceProductId
			| null,
		limit: boundedLimit(params.get('limit'))
	};
}

export function governanceRuntimeErrorStatus(error: unknown): number {
	const message = error instanceof Error ? error.message : '';
	if (message.includes('table is not available')) return 503;
	if (
		message.includes(' is required') ||
		message.includes('Invalid ') ||
		message.includes('payload must be an object')
	) {
		return 400;
	}
	return 500;
}

async function assertTableAvailable(db: D1DatabaseLike, tableName: string): Promise<void> {
	const row = await db
		.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
		.bind(tableName)
		.first<{ name: string }>();
	if (!row?.name) {
		const migration = TABLE_MIGRATIONS[tableName] ?? 'required';
		throw new Error(`${tableName} table is not available; apply migration ${migration} first`);
	}
}

async function queryAll<T>(
	db: D1DatabaseLike,
	sql: string,
	values: unknown[] = []
): Promise<T[]> {
	const statement = db.prepare(sql);
	const result = values.length > 0 ? await statement.bind(...values).all<T>() : await statement.all<T>();
	return result.results ?? [];
}

function buildListQuery(
	baseSql: string,
	filters: GovernanceRecordFilters,
	allowedFilters: Array<keyof GovernanceRecordFilters>
): { sql: string; values: unknown[] } {
	const clauses: string[] = [];
	const values: unknown[] = [];
	const columns: Partial<Record<keyof GovernanceRecordFilters, string>> = {
		atlasCanvasId: 'atlas_canvas_id',
		atlasNodeId: 'atlas_node_id',
		signalId: 'signal_id',
		decisionId: 'decision_id',
		sourceProductId: 'source_product_id',
		targetProductId: 'target_product_id'
	};

	for (const key of allowedFilters) {
		const value = filters[key];
		if (typeof value !== 'string' || !value.trim()) continue;
		clauses.push(`${columns[key]} = ?`);
		values.push(value.trim());
	}

	values.push(normalizeLimit(filters.limit));
	return {
		sql: `${baseSql}${clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : ''}
		ORDER BY created_at DESC
		LIMIT ?`,
		values
	};
}

function createId(prefix: string): string {
	const random =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
			: Math.random().toString(36).slice(2, 14);
	return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function requiredText(value: unknown, field: string, maxLength: number): string {
	const normalized = typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
	if (!normalized) {
		throw new Error(`${field} is required`);
	}
	return normalized;
}

function optionalText(value: unknown, maxLength: number): string | null {
	if (typeof value !== 'string') return null;
	const normalized = value.trim().slice(0, maxLength);
	return normalized || null;
}

function stringifyPayload(payload: Record<string, unknown> | undefined): string {
	return JSON.stringify(payload ?? {});
}

function parsePayload(raw: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(raw) as unknown;
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function normalizeSignalStatus(status: GovernanceSignalStatus | undefined): GovernanceSignalStatus {
	if (!status) return 'new';
	if (!SIGNAL_STATUSES.has(status)) {
		throw new Error(`Invalid signal status: ${status}`);
	}
	return status;
}

function normalizeDecisionState(state: GovernanceDecisionState): GovernanceDecisionState {
	if (!DECISION_STATES.has(state)) {
		throw new Error(`Invalid decision state: ${state}`);
	}
	return state;
}

function normalizeProofOutcome(outcome: GovernanceProofOutcome | undefined): GovernanceProofOutcome {
	if (!outcome) return 'documented';
	if (!PROOF_OUTCOMES.has(outcome)) {
		throw new Error(`Invalid proof outcome: ${outcome}`);
	}
	return outcome;
}

function normalizeProductId(value: GovernanceProductId, field: string): GovernanceProductId {
	if (!PRODUCT_IDS.has(value)) {
		throw new Error(`Invalid ${field}: ${value}`);
	}
	return value;
}

function normalizeAttachmentMode(
	mode: GovernanceProductAttachmentMode | undefined,
	sourceProductId: GovernanceProductId
): GovernanceProductAttachmentMode {
	if (!mode) {
		if (sourceProductId === 'proof') return 'records';
		if (sourceProductId === 'atlas') return 'connects';
		return 'produces';
	}
	if (!ATTACHMENT_MODES.has(mode)) {
		throw new Error(`Invalid attachment mode: ${mode}`);
	}
	return mode;
}

function normalizeLimit(limit: number | undefined): number {
	if (!Number.isFinite(limit) || !limit) return 100;
	return Math.max(1, Math.min(500, Math.floor(limit)));
}

function boundedLimit(value: string | null): number | undefined {
	if (!value) return undefined;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function stringFromBody(
	body: Record<string, unknown>,
	primaryKey: string,
	secondaryKey?: string
): string | undefined {
	const value = body[primaryKey] ?? (secondaryKey ? body[secondaryKey] : undefined);
	return typeof value === 'string' ? value : undefined;
}

function requiredStringFromBody(
	body: Record<string, unknown>,
	primaryKey: string,
	secondaryKey?: string
): string {
	return stringFromBody(body, primaryKey, secondaryKey) ?? '';
}

function objectFromBody(body: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
	const value = body[key];
	if (value == null) return undefined;
	if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
	throw new Error(`${key} must be an object`);
}

function booleanFromBody(body: Record<string, unknown>, key: string): boolean | undefined {
	const value = body[key];
	if (value == null) return undefined;
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') return value === 'true' || value === '1' || value === 'on';
	return undefined;
}

function serializeSignal(row: GovernanceSignalRow): GovernanceSignal {
	const { payload_json, ...rest } = row;
	return {
		...rest,
		payload: parsePayload(payload_json)
	};
}

function serializeDecision(row: GovernanceDecisionRow): GovernanceDecision {
	const { payload_json, ...rest } = row;
	return {
		...rest,
		payload: parsePayload(payload_json)
	};
}

function serializeProof(row: GovernanceProofRow): GovernanceProof {
	const { payload_json, ...rest } = row;
	return {
		...rest,
		payload: parsePayload(payload_json)
	};
}

function serializeProductAttachment(row: GovernanceProductAttachmentRow): GovernanceProductAttachment {
	const { metadata_json, required, ...rest } = row;
	return {
		...rest,
		required: required === 1,
		metadata: parsePayload(metadata_json)
	};
}
