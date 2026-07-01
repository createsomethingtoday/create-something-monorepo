import {
	SIGNAL_DECISION_PROOF_COMPOSITION,
	canAttachGovernanceProducts,
	listGovernanceProducts,
	type GovernanceProductAttachmentMode,
	type GovernanceProductId
} from '@create-something/canon/governance';
import {
	listGovernanceDecisions,
	listGovernanceProductAttachments,
	listGovernanceProofs,
	listGovernanceSignals,
	type GovernanceDecision,
	type GovernanceProductAttachment,
	type GovernanceProof,
	type GovernanceRecordFilters,
	type GovernanceSignal
} from './governance-runtime';

export type GovernanceAttachmentGraphNode = {
	id: string;
	product_id: GovernanceProductId;
	record_id: string | null;
	atlas_canvas_id: string;
	atlas_node_id: string | null;
	label: string;
	status: string | null;
	created_at: string | null;
	record: GovernanceSignal | GovernanceDecision | GovernanceProof | null;
};

export type GovernanceAttachmentGraphEdge = {
	id: string;
	source: string;
	target: string;
	source_product_id: GovernanceProductId;
	target_product_id: GovernanceProductId;
	mode: GovernanceProductAttachmentMode;
	label: string;
	required: boolean;
};

export type GovernanceAttachmentCapability = {
	source_product_id: GovernanceProductId;
	target_product_id: GovernanceProductId;
	can_attach: boolean;
	mode: GovernanceProductAttachmentMode;
	label: string;
	required: boolean;
	current_attachment_count: number;
	attached: boolean;
};

export type GovernanceAttachmentGraph = {
	schemaVersion: 1;
	generated_at: string;
	sourceOfTruth: 'governance_ledger';
	product_loop: GovernanceProductId[];
	atlas: {
		product_id: 'atlas';
		canvas_id: string | null;
		node_id: string | null;
	};
	filters: GovernanceRecordFilters;
	nodes: GovernanceAttachmentGraphNode[];
	attachments: GovernanceAttachmentGraphEdge[];
	attachment_capabilities: GovernanceAttachmentCapability[];
	summary: {
		atlas_canvases: number;
		signals: number;
		decisions: number;
		proofs: number;
		attachments: number;
	};
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

const REQUIRED_LINKS = new Map(
	SIGNAL_DECISION_PROOF_COMPOSITION.requiredLinks.map((link) => [`${link.source}->${link.target}`, link])
);

export async function buildGovernanceAttachmentGraph(
	db: D1DatabaseLike,
	filters: GovernanceRecordFilters = {}
): Promise<GovernanceAttachmentGraph> {
	const runtimeFilters: GovernanceRecordFilters = {
		atlasCanvasId: filters.atlasCanvasId || null,
		atlasNodeId: filters.atlasNodeId || null,
		limit: filters.limit
	};
	const signals = await listGovernanceSignals(db, runtimeFilters);
	const nodes = new Map<string, GovernanceAttachmentGraphNode>();
	const attachments = new Map<string, GovernanceAttachmentGraphEdge>();
	const decisionsById = new Map<string, GovernanceDecision>();
	const proofsById = new Map<string, GovernanceProof>();

	if (runtimeFilters.atlasCanvasId) {
		addAtlasNode(nodes, runtimeFilters.atlasCanvasId, runtimeFilters.atlasNodeId ?? null);
	}

	for (const signal of signals) {
		addAtlasNode(nodes, signal.atlas_canvas_id, signal.atlas_node_id);
		const signalNodeId = signalGraphNodeId(signal.id);
		nodes.set(signalNodeId, signalNode(signal));
		addAttachment(attachments, atlasGraphNodeId(signal.atlas_canvas_id), signalNodeId, 'atlas', 'signal');

		const decisions = await listGovernanceDecisions(db, {
			signalId: signal.id,
			limit: runtimeFilters.limit
		});
		for (const decision of decisions) {
			decisionsById.set(decision.id, decision);
			const decisionNodeId = decisionGraphNodeId(decision.id);
			nodes.set(decisionNodeId, decisionNode(decision));
			addAttachment(attachments, signalNodeId, decisionNodeId, 'signal', 'decision');

			const decisionProofs = await listGovernanceProofs(db, {
				decisionId: decision.id,
				limit: runtimeFilters.limit
			});
			for (const proof of decisionProofs) {
				proofsById.set(proof.id, proof);
			}
		}

		const signalProofs = await listGovernanceProofs(db, {
			signalId: signal.id,
			limit: runtimeFilters.limit
		});
		for (const proof of signalProofs) {
			proofsById.set(proof.id, proof);
		}
	}

	for (const proof of proofsById.values()) {
		const proofNodeId = proofGraphNodeId(proof.id);
		nodes.set(proofNodeId, proofNode(proof));
		if (decisionsById.has(proof.decision_id)) {
			addAttachment(attachments, decisionGraphNodeId(proof.decision_id), proofNodeId, 'decision', 'proof');
		}
		addAttachment(attachments, proofNodeId, atlasGraphNodeId(proof.atlas_canvas_id), 'proof', 'atlas');
	}

	const explicitAttachments = await listAvailableGovernanceProductAttachments(db, runtimeFilters);
	for (const attachment of explicitAttachments) {
		addExplicitAttachmentNodes(nodes, attachment);
		addExplicitAttachment(attachments, attachment);
	}

	const nodeList = [...nodes.values()];
	const attachmentList = [...attachments.values()];
	const attachmentCapabilities = buildGovernanceAttachmentCapabilities(attachmentList);

	return {
		schemaVersion: 1,
		generated_at: new Date().toISOString(),
		sourceOfTruth: 'governance_ledger',
		product_loop: [...SIGNAL_DECISION_PROOF_COMPOSITION.products],
		atlas: {
			product_id: 'atlas',
			canvas_id: runtimeFilters.atlasCanvasId ?? null,
			node_id: runtimeFilters.atlasNodeId ?? null
		},
		filters: runtimeFilters,
		nodes: nodeList,
		attachments: attachmentList,
		attachment_capabilities: attachmentCapabilities,
		summary: {
			atlas_canvases: nodeList.filter((node) => node.product_id === 'atlas').length,
			signals: signals.length,
			decisions: decisionsById.size,
			proofs: proofsById.size,
			attachments: attachmentList.length
		}
	};
}

async function listAvailableGovernanceProductAttachments(
	db: Parameters<typeof listGovernanceProductAttachments>[0],
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

function addExplicitAttachmentNodes(
	nodes: Map<string, GovernanceAttachmentGraphNode>,
	attachment: GovernanceProductAttachment
): void {
	const sourceNodeId = productGraphNodeId(
		attachment.source_product_id,
		attachment.source_record_id
	);
	const targetNodeId = productGraphNodeId(
		attachment.target_product_id,
		attachment.target_record_id
	);
	if (!nodes.has(sourceNodeId)) {
		nodes.set(sourceNodeId, attachmentRecordNode(attachment, 'source'));
	}
	if (!nodes.has(targetNodeId)) {
		nodes.set(targetNodeId, attachmentRecordNode(attachment, 'target'));
	}
}

function attachmentRecordNode(
	attachment: GovernanceProductAttachment,
	side: 'source' | 'target'
): GovernanceAttachmentGraphNode {
	const productId = side === 'source' ? attachment.source_product_id : attachment.target_product_id;
	const recordId = side === 'source' ? attachment.source_record_id : attachment.target_record_id;
	return {
		id: productGraphNodeId(productId, recordId),
		product_id: productId,
		record_id: productId === 'atlas' ? null : recordId,
		atlas_canvas_id: attachment.atlas_canvas_id,
		atlas_node_id: attachment.atlas_node_id,
		label: recordId,
		status: null,
		created_at: attachment.created_at,
		record: null
	};
}

function addExplicitAttachment(
	attachments: Map<string, GovernanceAttachmentGraphEdge>,
	attachment: GovernanceProductAttachment
): void {
	const id = `attachment:${attachment.id}`;
	if (attachments.has(id)) return;
	attachments.set(id, {
		id,
		source: productGraphNodeId(attachment.source_product_id, attachment.source_record_id),
		target: productGraphNodeId(attachment.target_product_id, attachment.target_record_id),
		source_product_id: attachment.source_product_id,
		target_product_id: attachment.target_product_id,
		mode: attachment.mode,
		label: attachment.label,
		required: attachment.required
	});
}

export function buildGovernanceAttachmentCapabilities(
	attachments: GovernanceAttachmentGraphEdge[]
): GovernanceAttachmentCapability[] {
	return listGovernanceProducts().flatMap((source) =>
		listGovernanceProducts()
			.filter((target) => target.id !== source.id)
			.map((target) => {
				const link = REQUIRED_LINKS.get(`${source.id}->${target.id}`);
				const currentAttachmentCount = attachments.filter(
					(attachment) =>
						attachment.source_product_id === source.id && attachment.target_product_id === target.id
				).length;
				return {
					source_product_id: source.id,
					target_product_id: target.id,
					can_attach: canAttachGovernanceProducts(source.id, target.id),
					mode: link?.mode ?? fallbackAttachmentMode(source.id),
					label: link?.label ?? `${source.name} can attach to ${target.name}.`,
					required: link?.required ?? false,
					current_attachment_count: currentAttachmentCount,
					attached: currentAttachmentCount > 0
				};
			})
	);
}

function fallbackAttachmentMode(sourceProductId: GovernanceProductId): GovernanceProductAttachmentMode {
	if (sourceProductId === 'proof') return 'records';
	if (sourceProductId === 'atlas') return 'connects';
	return 'produces';
}

function addAtlasNode(
	nodes: Map<string, GovernanceAttachmentGraphNode>,
	atlasCanvasId: string,
	atlasNodeId: string | null
): void {
	const id = atlasGraphNodeId(atlasCanvasId);
	if (nodes.has(id)) return;
	nodes.set(id, {
		id,
		product_id: 'atlas',
		record_id: null,
		atlas_canvas_id: atlasCanvasId,
		atlas_node_id: atlasNodeId,
		label: atlasCanvasId,
		status: null,
		created_at: null,
		record: null
	});
}

function signalNode(signal: GovernanceSignal): GovernanceAttachmentGraphNode {
	return {
		id: signalGraphNodeId(signal.id),
		product_id: 'signal',
		record_id: signal.id,
		atlas_canvas_id: signal.atlas_canvas_id,
		atlas_node_id: signal.atlas_node_id,
		label: signal.title,
		status: signal.status,
		created_at: signal.created_at,
		record: signal
	};
}

function decisionNode(decision: GovernanceDecision): GovernanceAttachmentGraphNode {
	return {
		id: decisionGraphNodeId(decision.id),
		product_id: 'decision',
		record_id: decision.id,
		atlas_canvas_id: decision.atlas_canvas_id,
		atlas_node_id: decision.atlas_node_id,
		label: decision.reason,
		status: decision.decision_state,
		created_at: decision.created_at,
		record: decision
	};
}

function proofNode(proof: GovernanceProof): GovernanceAttachmentGraphNode {
	return {
		id: proofGraphNodeId(proof.id),
		product_id: 'proof',
		record_id: proof.id,
		atlas_canvas_id: proof.atlas_canvas_id,
		atlas_node_id: proof.atlas_node_id,
		label: proof.evidence,
		status: proof.outcome,
		created_at: proof.created_at,
		record: proof
	};
}

function addAttachment(
	attachments: Map<string, GovernanceAttachmentGraphEdge>,
	source: string,
	target: string,
	sourceProductId: GovernanceProductId,
	targetProductId: GovernanceProductId
): void {
	const link = REQUIRED_LINKS.get(`${sourceProductId}->${targetProductId}`);
	const id = `${source}->${target}`;
	if (attachments.has(id)) return;
	attachments.set(id, {
		id,
		source,
		target,
		source_product_id: sourceProductId,
		target_product_id: targetProductId,
		mode: link?.mode ?? 'connects',
		label: link?.label ?? `${sourceProductId} attaches to ${targetProductId}`,
		required: link?.required ?? false
	});
}

function atlasGraphNodeId(atlasCanvasId: string): string {
	return `atlas:${atlasCanvasId}`;
}

function signalGraphNodeId(signalId: string): string {
	return `signal:${signalId}`;
}

function decisionGraphNodeId(decisionId: string): string {
	return `decision:${decisionId}`;
}

function proofGraphNodeId(proofId: string): string {
	return `proof:${proofId}`;
}

function productGraphNodeId(productId: GovernanceProductId, recordId: string): string {
	if (productId === 'atlas') return atlasGraphNodeId(recordId);
	if (productId === 'signal') return signalGraphNodeId(recordId);
	if (productId === 'decision') return decisionGraphNodeId(recordId);
	return proofGraphNodeId(recordId);
}
