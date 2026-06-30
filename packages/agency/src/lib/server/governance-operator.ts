import {
	createGovernanceDecision,
	createGovernanceProof,
	getGovernanceDecision,
	getGovernanceSignal,
	listGovernanceDecisions,
	listGovernanceProofs,
	listGovernanceSignals,
	type GovernanceDecision,
	type GovernanceDecisionState,
	type GovernanceProof,
	type GovernanceProofOutcome,
	type GovernanceRecordFilters,
	type GovernanceSignal
} from './governance-runtime';

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
		decisions: number;
		proofs: number;
		records_ready_for_proof: number;
		records_requiring_docs_review: number;
		records_requiring_reviewer_process_review: number;
		unlinked_decisions: number;
		unlinked_proofs: number;
	};
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

export type GovernanceOperatorProofActionInput = {
	decisionId: string;
	evidence: string;
	outcome?: GovernanceProofOutcome;
	receiptUrl?: string | null;
	rollbackNote?: string | null;
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
			decisions: 0,
			proofs: 0,
			records_ready_for_proof: 0,
			records_requiring_docs_review: 0,
			records_requiring_reviewer_process_review: 0,
			unlinked_decisions: 0,
			unlinked_proofs: 0
		},
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

	return {
		generated_at: new Date().toISOString(),
		filters,
		storage: {
			available: true,
			error: null
		},
		summary: {
			signals: signals.length,
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
			unlinked_proofs: unlinkedProofs.length
		},
		records,
		unlinked_decisions: unlinkedDecisions,
		unlinked_proofs: unlinkedProofs
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

	return createGovernanceProof(db, {
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
