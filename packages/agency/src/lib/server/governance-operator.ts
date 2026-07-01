import type { GovernanceProductAttachmentMode, GovernanceProductId } from '@create-something/canon/governance';
import {
	createGovernanceDecision,
	createGovernanceProductAttachment,
	createGovernanceProof,
	createGovernanceSignal,
	getGovernanceDecision,
	getGovernanceSignal,
	listGovernanceDecisions,
	listGovernanceProductAttachments,
	listGovernanceProofs,
	listGovernanceSignals,
	updateGovernanceSignalStatus,
	type GovernanceDecision,
	type GovernanceDecisionState,
	type GovernanceProductAttachment,
	type GovernanceProof,
	type GovernanceProofOutcome,
	type GovernanceRecordFilters,
	type GovernanceSignal,
	type GovernanceSignalStatus
} from './governance-runtime';
import {
	buildGovernanceAttachmentGraph,
	buildGovernanceAttachmentCapabilities,
	type GovernanceAttachmentGraph
} from './governance-graph';

export type GovernanceOperatorRecord = {
	signal: GovernanceSignal;
	classification: GovernanceOperatorSignalClassification | null;
	decisions: GovernanceDecision[];
	proofs: GovernanceProof[];
};

export type GovernanceOperatorSignalClassification = {
	requires_documentation_review: boolean;
	requires_reviewer_process_review: boolean;
	reasons: string[];
};

export type GovernanceOperatorReview = {
	generated_at: string;
	filters: {
		atlas_canvas_id: string;
		atlas_node_id: string;
		limit: number;
	};
	storage: {
		available: boolean;
		error: string | null;
	};
	summary: {
		signals: number;
		active_signals: number;
		closed_signals: number;
		decisions: number;
		proofs: number;
		records_ready_for_proof: number;
		records_requiring_docs_review: number;
		records_requiring_reviewer_process_review: number;
		unlinked_decisions: number;
		unlinked_proofs: number;
		explicit_attachments: number;
	};
	graph: GovernanceAttachmentGraph;
	explicit_attachments: GovernanceProductAttachment[];
	records: GovernanceOperatorRecord[];
	unlinked_decisions: GovernanceDecision[];
	unlinked_proofs: GovernanceProof[];
};

export type GovernanceOperatorDecisionActionInput = {
	signalId: string;
	decisionState: GovernanceDecisionState;
	decisionOwner: string;
	reason: string;
};

export type GovernanceOperatorSignalActionInput = {
	atlasCanvasId?: string | null;
	atlasNodeId?: string | null;
	source?: string | null;
	sourceUrl?: string | null;
	title: string;
	summary: string;
	status?: GovernanceSignalStatus;
	requiresDocumentationReview?: boolean;
	requiresReviewerProcessReview?: boolean;
	reasons?: string | null;
};

export type GovernanceOperatorProofActionInput = {
	decisionId: string;
	evidence: string;
	outcome?: GovernanceProofOutcome;
	receiptUrl?: string | null;
	rollbackNote?: string | null;
};

export type GovernanceOperatorAttachmentActionInput = {
	sourceProductId: GovernanceProductId;
	sourceRecordId: string;
	targetProductId: GovernanceProductId;
	targetRecordId: string;
	atlasCanvasId: string;
	atlasNodeId?: string | null;
	mode?: GovernanceProductAttachmentMode;
	label?: string | null;
	required?: boolean;
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

export function emptyGovernanceOperatorReview(
	filters: GovernanceOperatorReview['filters'],
	error: string | null = null
): GovernanceOperatorReview {
	return {
		generated_at: new Date().toISOString(),
		filters,
		storage: {
			available: false,
			error
		},
		summary: {
			signals: 0,
			active_signals: 0,
			closed_signals: 0,
			decisions: 0,
			proofs: 0,
			records_ready_for_proof: 0,
			records_requiring_docs_review: 0,
			records_requiring_reviewer_process_review: 0,
			unlinked_decisions: 0,
			unlinked_proofs: 0,
			explicit_attachments: 0
		},
		graph: emptyGovernanceAttachmentGraph(filters),
		explicit_attachments: [],
		records: [],
		unlinked_decisions: [],
		unlinked_proofs: []
	};
}

export async function buildGovernanceOperatorReview(
	db: D1DatabaseLike,
	filters: GovernanceOperatorReview['filters']
): Promise<GovernanceOperatorReview> {
	const runtimeFilters: GovernanceRecordFilters = {
		atlasCanvasId: filters.atlas_canvas_id || null,
		atlasNodeId: filters.atlas_node_id || null,
		limit: filters.limit
	};
	const [graph, explicitAttachments] = await Promise.all([
		buildGovernanceAttachmentGraph(db, runtimeFilters),
		listAvailableGovernanceProductAttachments(db, runtimeFilters)
	]);
	const signals = await listGovernanceSignals(db, runtimeFilters);
	const signalIds = new Set(signals.map((signal) => signal.id));
	const signalChildRows = await Promise.all(
		signals.map(async (signal) => {
			const signalDecisions = await listGovernanceDecisions(db, {
				signalId: signal.id,
				limit: filters.limit
			});
			const signalProofs = await listGovernanceProofs(db, {
				signalId: signal.id,
				limit: filters.limit
			});
			const decisionProofs = (
				await Promise.all(
					signalDecisions.map((decision) =>
						listGovernanceProofs(db, {
							decisionId: decision.id,
							limit: filters.limit
						})
					)
				)
			).flat();
			return {
				signal,
				decisions: signalDecisions,
				proofs: uniqueBy([...signalProofs, ...decisionProofs], (proof) => proof.id)
			};
		})
	);
	const decisions = uniqueBy(
		signalChildRows.flatMap((record) => record.decisions),
		(decision) => decision.id
	);
	const proofs = uniqueBy(
		signalChildRows.flatMap((record) => record.proofs),
		(proof) => proof.id
	);
	const [candidateUnlinkedDecisions, candidateUnlinkedProofs] = await Promise.all([
		listGovernanceDecisions(db, runtimeFilters),
		listGovernanceProofs(db, runtimeFilters)
	]);
	const decisionsBySignal = groupBy(decisions, (decision) => decision.signal_id);
	const proofsBySignal = groupBy(
		proofs.filter((proof) => proof.signal_id),
		(proof) => proof.signal_id ?? ''
	);
	const proofsByDecision = groupBy(proofs, (proof) => proof.decision_id);
	const decisionIds = new Set(decisions.map((decision) => decision.id));

	const records = signals.map((signal) => {
		const signalDecisions = decisionsBySignal.get(signal.id) ?? [];
		const decisionProofs = signalDecisions.flatMap((decision) => proofsByDecision.get(decision.id) ?? []);
		const signalProofs = proofsBySignal.get(signal.id) ?? [];
		const proofsForSignal = uniqueBy([...signalProofs, ...decisionProofs], (proof) => proof.id);
		return {
			signal,
			classification: classificationFromSignal(signal),
			decisions: signalDecisions,
			proofs: proofsForSignal
		};
	});
	const unlinkedDecisions = candidateUnlinkedDecisions.filter((decision) => !signalIds.has(decision.signal_id));
	const unlinkedProofs = candidateUnlinkedProofs.filter(
		(proof) => (proof.signal_id ? !signalIds.has(proof.signal_id) : true) && !decisionIds.has(proof.decision_id)
	);
	const decisionsReadyForProof = decisions.filter((decision) => (proofsByDecision.get(decision.id) ?? []).length === 0);
	const activeSignals = signals.filter((signal) => signal.status === 'new' || signal.status === 'reviewing');
	const closedSignals = signals.filter((signal) => signal.status === 'resolved' || signal.status === 'dismissed');

	return {
		generated_at: new Date().toISOString(),
		filters,
		storage: {
			available: true,
			error: null
		},
		summary: {
			signals: signals.length,
			active_signals: activeSignals.length,
			closed_signals: closedSignals.length,
			decisions: decisions.length,
			proofs: proofs.length,
			records_ready_for_proof: decisionsReadyForProof.length,
			records_requiring_docs_review: records.filter(
				(record) => record.classification?.requires_documentation_review
			).length,
			records_requiring_reviewer_process_review: records.filter(
				(record) => record.classification?.requires_reviewer_process_review
			).length,
			unlinked_decisions: unlinkedDecisions.length,
			unlinked_proofs: unlinkedProofs.length,
			explicit_attachments: explicitAttachments.length
		},
		graph,
		explicit_attachments: explicitAttachments,
		records,
		unlinked_decisions: unlinkedDecisions,
		unlinked_proofs: unlinkedProofs
	};
}

async function listAvailableGovernanceProductAttachments(
	db: D1DatabaseLike,
	filters: GovernanceRecordFilters
): Promise<GovernanceProductAttachment[]> {
	try {
		return await listGovernanceProductAttachments(db, filters);
	} catch (error) {
		const message = error instanceof Error ? error.message : '';
		if (message.includes('governance_product_attachments table is not available')) {
			return [];
		}
		throw error;
	}
}

function emptyGovernanceAttachmentGraph(filters: GovernanceOperatorReview['filters']): GovernanceAttachmentGraph {
	return {
		schemaVersion: 1,
		generated_at: new Date().toISOString(),
		sourceOfTruth: 'governance_ledger',
		product_loop: ['atlas', 'signal', 'decision', 'proof'],
		atlas: {
			product_id: 'atlas',
			canvas_id: filters.atlas_canvas_id || null,
			node_id: filters.atlas_node_id || null
		},
		filters: {
			atlasCanvasId: filters.atlas_canvas_id || null,
			atlasNodeId: filters.atlas_node_id || null,
			limit: filters.limit
		},
		nodes: [],
		attachments: [],
		attachment_capabilities: buildGovernanceAttachmentCapabilities([]),
		summary: {
			atlas_canvases: 0,
			signals: 0,
			decisions: 0,
			proofs: 0,
			attachments: 0
		}
	};
}

function classificationFromSignal(signal: GovernanceSignal): GovernanceOperatorSignalClassification | null {
	const classification = signal.payload.classification;
	if (!classification || typeof classification !== 'object' || Array.isArray(classification)) {
		return null;
	}

	const record = classification as Record<string, unknown>;
	const requiresDocumentationReview = record.requires_documentation_review === true;
	const requiresReviewerProcessReview = record.requires_reviewer_process_review === true;
	if (!requiresDocumentationReview && !requiresReviewerProcessReview) {
		return null;
	}

	return {
		requires_documentation_review: requiresDocumentationReview,
		requires_reviewer_process_review: requiresReviewerProcessReview,
		reasons: Array.isArray(record.reasons)
			? record.reasons.filter((reason): reason is string => typeof reason === 'string').slice(0, 6)
			: []
	};
}

export async function createGovernanceOperatorSignalAction(
	db: D1DatabaseLike,
	input: GovernanceOperatorSignalActionInput
): Promise<GovernanceSignal> {
	const reasons = normalizeReasons(input.reasons);
	const classification = {
		requires_documentation_review: input.requiresDocumentationReview === true,
		requires_reviewer_process_review: input.requiresReviewerProcessReview === true,
		reasons
	};

	return createGovernanceSignal(db, {
		atlasCanvasId: normalizeRequiredText(input.atlasCanvasId, 'atlasCanvasId', 160),
		atlasNodeId: normalizeOptionalText(input.atlasNodeId, 160),
		source: normalizeOptionalText(input.source, 160) ?? 'operator:manual',
		sourceUrl: normalizeOptionalText(input.sourceUrl, 500),
		title: normalizeRequiredText(input.title, 'title', 220),
		summary: normalizeRequiredText(input.summary, 'summary', 2_000),
		status: input.status ?? 'new',
		payload: {
			operator_surface: '/admin/governance',
			manual_intake: true,
			source_update: {
				source_type: 'operator',
				channel: null,
				text: input.summary
			},
			classification
		}
	});
}

export async function createGovernanceOperatorDecisionAction(
	db: D1DatabaseLike,
	input: GovernanceOperatorDecisionActionInput
): Promise<GovernanceDecision> {
	const signal = await getGovernanceSignal(db, input.signalId);
	if (!signal) {
		throw new Error('Signal is not available for this operator action.');
	}

	return createGovernanceDecision(db, {
		signalId: signal.id,
		atlasCanvasId: signal.atlas_canvas_id,
		atlasNodeId: signal.atlas_node_id,
		decisionState: input.decisionState,
		decisionOwner: input.decisionOwner,
		reason: input.reason,
		payload: {
			operator_surface: '/admin/governance',
			source_signal_status: signal.status
		}
	});
}

export async function createGovernanceOperatorProofAction(
	db: D1DatabaseLike,
	input: GovernanceOperatorProofActionInput
): Promise<GovernanceProof> {
	const decision = await getGovernanceDecision(db, input.decisionId);
	if (!decision) {
		throw new Error('Decision is not available for this operator action.');
	}

	const proof = await createGovernanceProof(db, {
		signalId: decision.signal_id,
		decisionId: decision.id,
		atlasCanvasId: decision.atlas_canvas_id,
		atlasNodeId: decision.atlas_node_id,
		evidence: input.evidence,
		outcome: input.outcome,
		receiptUrl: input.receiptUrl,
		rollbackNote: input.rollbackNote,
		payload: {
			operator_surface: '/admin/governance',
			source_decision_state: decision.decision_state,
			source_decision_owner: decision.decision_owner
		}
	});

	const signal = await getGovernanceSignal(db, decision.signal_id);
	if (signal?.status === 'new' || signal?.status === 'reviewing') {
		await updateGovernanceSignalStatus(db, signal.id, 'resolved');
	}

	return proof;
}

export async function createGovernanceOperatorAttachmentAction(
	db: D1DatabaseLike,
	input: GovernanceOperatorAttachmentActionInput
): Promise<GovernanceProductAttachment> {
	return createGovernanceProductAttachment(db, {
		sourceProductId: input.sourceProductId,
		sourceRecordId: normalizeRequiredText(input.sourceRecordId, 'sourceRecordId', 180),
		targetProductId: input.targetProductId,
		targetRecordId: normalizeRequiredText(input.targetRecordId, 'targetRecordId', 180),
		atlasCanvasId: normalizeRequiredText(input.atlasCanvasId, 'atlasCanvasId', 160),
		atlasNodeId: normalizeOptionalText(input.atlasNodeId, 160),
		mode: input.mode,
		label: normalizeOptionalText(input.label, 280),
		required: input.required === true,
		metadata: {
			operator_surface: '/admin/governance',
			manual_attachment: true
		}
	});
}

export function normalizeGovernanceOperatorFilters(params: URLSearchParams): GovernanceOperatorReview['filters'] {
	return {
		atlas_canvas_id: normalizeSearchParam(params.get('atlas_canvas_id') ?? params.get('canvas')),
		atlas_node_id: normalizeSearchParam(params.get('atlas_node_id') ?? params.get('node')),
		limit: normalizeLimit(params.get('limit'))
	};
}

function normalizeSearchParam(value: string | null): string {
	return value?.trim().slice(0, 160) ?? '';
}

function normalizeLimit(value: string | null): number {
	const parsed = Number.parseInt(value ?? '', 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return 100;
	return Math.max(1, Math.min(500, parsed));
}

function normalizeRequiredText(value: string | null | undefined, field: string, maxLength: number): string {
	const normalized = normalizeOptionalText(value, maxLength);
	if (!normalized) {
		throw new Error(`${field} is required`);
	}
	return normalized;
}

function normalizeOptionalText(value: string | null | undefined, maxLength: number): string | undefined {
	const normalized = value?.trim().slice(0, maxLength);
	return normalized || undefined;
}

function normalizeReasons(value: string | null | undefined): string[] {
	return (value ?? '')
		.split(/\r?\n|;/)
		.map((reason) => reason.trim())
		.filter(Boolean)
		.slice(0, 6);
}

function groupBy<T>(items: T[], keyForItem: (item: T) => string): Map<string, T[]> {
	const grouped = new Map<string, T[]>();
	for (const item of items) {
		const key = keyForItem(item);
		const existing = grouped.get(key);
		if (existing) {
			existing.push(item);
		} else {
			grouped.set(key, [item]);
		}
	}
	return grouped;
}

function uniqueBy<T>(items: T[], keyForItem: (item: T) => string): T[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		const key = keyForItem(item);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
