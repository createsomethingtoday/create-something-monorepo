import {
	SIGNAL_DECISION_PROOF_COMPOSITION,
	createGovernanceProductAttachment,
	createGovernanceProductAttachments
} from '../governance/products.js';
import type {
	GovernanceProductAttachment,
	GovernanceProductAttachmentMode,
	GovernanceProductId,
	GovernanceProductSurface
} from '../governance/products.js';

export type PublicAtlasNodeKind =
	| 'actor'
	| 'human'
	| 'ai'
	| 'system'
	| 'data'
	| 'constraint'
	| 'touchpoint';

export type PublicAtlasNodeStatus = 'run' | 'wait' | 'stop' | 'unknown';

export type PublicAtlasNode = {
	id: string;
	kind: PublicAtlasNodeKind;
	label: string;
	owner?: string;
	status: PublicAtlasNodeStatus;
	notes?: string;
	products?: GovernanceProductAttachment[];
	x?: number;
	y?: number;
	width?: number;
	createdBy: 'visitor' | 'agent' | 'system';
	updatedAt: string;
};

export type PublicAtlasEdge = {
	id: string;
	source: string;
	target: string;
	label?: string;
	createdBy: 'visitor' | 'agent' | 'system';
	updatedAt: string;
};

export type PublicAtlasCanvas = {
	version: 1;
	id: string;
	nodes: PublicAtlasNode[];
	edges: PublicAtlasEdge[];
	agentMessages: number;
	mutationCount: number;
	createdAt: string;
	updatedAt: string;
};

export type PublicAtlasRendererKind = 'atlas' | 'static-story' | 'sigma' | 'cosmograph';

export type PublicAtlasSemanticNode = Pick<
	PublicAtlasNode,
	'id' | 'kind' | 'label' | 'owner' | 'status' | 'notes'
> & {
	agentRole: 'owner' | 'judgment' | 'automation' | 'memory' | 'guardrail' | 'interface';
	agentInstruction: string;
	products: GovernanceProductAttachment[];
};

export type PublicAtlasSemanticEdge = Pick<PublicAtlasEdge, 'id' | 'source' | 'target' | 'label'> & {
	relationship: 'owns' | 'triggers' | 'delegates' | 'waits_for' | 'bounded_by' | 'observed_in' | 'hands_off_to';
};

export type PublicAtlasReadiness = {
	level: 'Needs shape' | 'Ready to map' | 'Pilot candidate' | 'Control layer candidate';
	slug: string;
	score: number;
	intent: 'governance-checklist' | 'workflow-teardown' | 'workflow-mapping';
	lane: 'workflow_infrastructure' | 'reliability_and_control' | 'not_sure';
	reason: string;
	nextStep: string;
};

export type PublicAtlasGraphArtifact = {
	version: 1;
	canvasId: string;
	nodeCount: number;
	edgeCount: number;
	readiness: PublicAtlasReadiness;
	renderer: {
		primary: PublicAtlasRendererKind;
		fallback: PublicAtlasRendererKind;
		scale: 'workflow' | 'system-map' | 'network';
		reason: string;
	};
	agentContract: {
		purpose: 'workflow-education' | 'workflow-intake' | 'network-exploration';
		allowedStatuses: PublicAtlasNodeStatus[];
		requiredNodeKinds: PublicAtlasNodeKind[];
		sourceOfTruth: 'atlas-graph';
	};
	productContract: {
		compositionId: typeof SIGNAL_DECISION_PROOF_COMPOSITION.id;
		atlasHub: GovernanceProductId;
		requiredProducts: GovernanceProductId[];
		connectedProducts: GovernanceProductId[];
	};
	nodes: PublicAtlasSemanticNode[];
	edges: PublicAtlasSemanticEdge[];
};

export type PublicAtlasStoryChapter = {
	id: string;
	sequence: number;
	kind: 'claim' | 'map' | 'automation' | 'judgment' | 'boundary' | 'receipt' | 'next-step';
	eyebrow: string;
	title: string;
	body: string;
	focusNodeIds: string[];
	relationshipIds: string[];
	state: PublicAtlasNodeStatus;
	proofLabel: string;
	motionCue: 'none' | 'highlight-nodes' | 'trace-handoff' | 'reveal-proof';
};

export type PublicAtlasStoryArtifact = {
	version: 1;
	canvasId: string;
	renderer: 'static-story';
	headline: string;
	summary: string;
	accessibilitySummary: string;
	chapters: PublicAtlasStoryChapter[];
};

export type PublicAtlasFocusGroupId = 'owner' | 'run' | 'wait' | 'stop' | 'proof';

export type PublicAtlasFocusGroup = {
	id: PublicAtlasFocusGroupId;
	label: string;
	description: string;
	nodeIds: string[];
	edgeIds: string[];
};

export type PublicAtlasStarterMap = {
	id: string;
	name: string;
	industry: string;
	description: string;
};

export const PUBLIC_ATLAS_LANES: Array<{
	kind: PublicAtlasNodeKind;
	label: string;
	description: string;
}> = [
	{ kind: 'actor', label: 'Actor', description: 'The person or team that owns the work.' },
	{ kind: 'human', label: 'Human task', description: 'Judgment, review, approval, or escalation.' },
	{ kind: 'ai', label: 'AI task', description: 'Bounded assistive work the agent can help with.' },
	{ kind: 'system', label: 'System operation', description: 'Routing, logging, syncing, or notification.' },
	{ kind: 'data', label: 'Data artifact', description: 'The record, file, form, ticket, or receipt.' },
	{ kind: 'constraint', label: 'Constraint', description: 'Privacy, access, cost, latency, or accuracy.' },
	{ kind: 'touchpoint', label: 'Touchpoint', description: 'Where a person inspects or acts.' }
];

export const PUBLIC_ATLAS_FLOW_SIZE = {
	width: 1450,
	height: 650
} as const;

const PUBLIC_ATLAS_FLOW_LANES: Record<PublicAtlasNodeKind, { x: number; y: number }> = {
	actor: { x: 72, y: 190 },
	data: { x: 398, y: 132 },
	system: { x: 728, y: 104 },
	ai: { x: 728, y: 326 },
	human: { x: 1060, y: 132 },
	constraint: { x: 1060, y: 354 },
	touchpoint: { x: 398, y: 474 }
};

const PUBLIC_ATLAS_FLOW_ORDER: PublicAtlasNodeKind[] = [
	'actor',
	'data',
	'system',
	'ai',
	'human',
	'constraint',
	'touchpoint'
];

const KIND_DEFAULTS: Record<PublicAtlasNodeKind, string> = {
	actor: 'Workflow owner',
	human: 'Human decision',
	ai: 'AI assist task',
	system: 'System operation',
	data: 'Workflow artifact',
	constraint: 'Trust boundary',
	touchpoint: 'Inspection touchpoint'
};

const AGENT_ROLE_BY_KIND: Record<PublicAtlasNodeKind, PublicAtlasSemanticNode['agentRole']> = {
	actor: 'owner',
	human: 'judgment',
	ai: 'automation',
	system: 'automation',
	data: 'memory',
	constraint: 'guardrail',
	touchpoint: 'interface'
};

const AGENT_INSTRUCTION_BY_KIND: Record<PublicAtlasNodeKind, string> = {
	actor: 'Identify the accountable person or team before proposing work.',
	human: 'Preserve judgment, approval, and escalation decisions for a human owner.',
	ai: 'Treat AI work as bounded assistive execution, not autonomous authority.',
	system: 'Treat system work as deterministic routing, logging, syncing, or notification.',
	data: 'Name the durable artifact that proves state and makes the workflow inspectable.',
	constraint: 'Stop or ask before crossing policy, access, privacy, accuracy, or authority boundaries.',
	touchpoint: 'Keep the human inspection or action surface explicit.'
};

const GOVERNANCE_PRODUCT_IDS: GovernanceProductId[] = ['atlas', 'signal', 'decision', 'proof'];

const GOVERNANCE_PRODUCT_ATTACHMENT_MODES: GovernanceProductAttachmentMode[] = [
	'connects',
	'consumes',
	'produces',
	'records'
];

const GOVERNANCE_PRODUCT_SURFACES: GovernanceProductSurface[] = [
	'map',
	'inbox',
	'queue',
	'proof-graph'
];

const PRODUCT_IDS_BY_KIND: Record<PublicAtlasNodeKind, GovernanceProductId[]> = {
	actor: ['atlas'],
	data: ['signal'],
	system: ['signal'],
	ai: ['decision'],
	human: ['decision'],
	constraint: ['decision'],
	touchpoint: ['proof']
};

function now(): string {
	return new Date().toISOString();
}

function randomId(prefix: string): string {
	const globalCrypto = globalThis.crypto;
	if (globalCrypto && 'randomUUID' in globalCrypto) {
		return `${prefix}_${globalCrypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
	}
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clampText(value: unknown, max = 180): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim().replace(/\s+/g, ' ');
	if (!trimmed) return undefined;
	return trimmed.slice(0, max);
}

function clampNumber(value: unknown, min: number, max: number): number | undefined {
	if (!Number.isFinite(value)) return undefined;
	return Math.min(max, Math.max(min, Number(value)));
}

function isGovernanceProductId(value: unknown): value is GovernanceProductId {
	return typeof value === 'string' && GOVERNANCE_PRODUCT_IDS.includes(value as GovernanceProductId);
}

function isGovernanceProductAttachmentMode(value: unknown): value is GovernanceProductAttachmentMode {
	return (
		typeof value === 'string' &&
		GOVERNANCE_PRODUCT_ATTACHMENT_MODES.includes(value as GovernanceProductAttachmentMode)
	);
}

function isGovernanceProductSurface(value: unknown): value is GovernanceProductSurface {
	return typeof value === 'string' && GOVERNANCE_PRODUCT_SURFACES.includes(value as GovernanceProductSurface);
}

function defaultProductAttachmentsForNode(
	kind: PublicAtlasNodeKind,
	source?: string
): GovernanceProductAttachment[] {
	return createGovernanceProductAttachments(PRODUCT_IDS_BY_KIND[kind], source);
}

function normalizeProductAttachments(
	input: unknown,
	kind: PublicAtlasNodeKind,
	source?: string
): GovernanceProductAttachment[] {
	if (!Array.isArray(input)) return defaultProductAttachmentsForNode(kind, source);
	const attachments = input.flatMap((item) => {
		if (!item || typeof item !== 'object') return [];
		const candidate = item as Partial<GovernanceProductAttachment>;
		if (!isGovernanceProductId(candidate.productId)) return [];
		return [
			createGovernanceProductAttachment(candidate.productId, {
				mode: isGovernanceProductAttachmentMode(candidate.mode) ? candidate.mode : undefined,
				surface: isGovernanceProductSurface(candidate.surface) ? candidate.surface : undefined,
				required: typeof candidate.required === 'boolean' ? candidate.required : undefined,
				source: clampText(candidate.source, 90) ?? source
			})
		];
	});

	return attachments.length ? attachments : defaultProductAttachmentsForNode(kind, source);
}

function connectedProductIds(canvas: PublicAtlasCanvas): GovernanceProductId[] {
	const productIds = canvas.nodes.flatMap((node) =>
		(node.products ?? defaultProductAttachmentsForNode(node.kind, node.label)).map(
			(product) => product.productId
		)
	);
	return [...new Set([...SIGNAL_DECISION_PROOF_COMPOSITION.products, ...productIds])];
}

function classifyPublicAtlasRelationship(edge: PublicAtlasEdge): PublicAtlasSemanticEdge['relationship'] {
	const label = (edge.label ?? '').toLowerCase();
	if (label.includes('own')) return 'owns';
	if (label.includes('trigger')) return 'triggers';
	if (label.includes('delegate')) return 'delegates';
	if (label.includes('wait')) return 'waits_for';
	if (label.includes('bound') || label.includes('stop') || label.includes('constraint')) return 'bounded_by';
	if (label.includes('review') || label.includes('receipt') || label.includes('log')) return 'observed_in';
	return 'hands_off_to';
}

function selectPublicAtlasRenderer(canvas: PublicAtlasCanvas): PublicAtlasGraphArtifact['renderer'] {
	if (canvas.nodes.length > 2000 || canvas.edges.length > 3000) {
		return {
			primary: 'cosmograph',
			fallback: 'sigma',
			scale: 'network',
			reason: 'Use GPU graph exploration when the artifact is a large read-only network, not an editable workflow map.'
		};
	}

	if (canvas.nodes.length > 120 || canvas.edges.length > 180) {
		return {
			primary: 'sigma',
			fallback: 'static-story',
			scale: 'system-map',
			reason: 'Use a WebGL graph renderer for larger read-only system maps where rich node editing is no longer the primary job.'
		};
	}

	return {
		primary: 'atlas',
		fallback: 'static-story',
		scale: 'workflow',
		reason: 'Use rich workflow nodes for education, intake, editing, accessibility, and agent-operable graph state.'
	};
}

function uniqueDefined(values: Array<string | undefined>): string[] {
	return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function firstNodeByKind(
	artifact: PublicAtlasGraphArtifact,
	kind: PublicAtlasNodeKind
): PublicAtlasSemanticNode | undefined {
	return artifact.nodes.find((node) => node.kind === kind);
}

function firstNodeByStatus(
	artifact: PublicAtlasGraphArtifact,
	status: PublicAtlasNodeStatus
): PublicAtlasSemanticNode | undefined {
	return artifact.nodes.find((node) => node.status === status);
}

function relationshipIdsForNodes(artifact: PublicAtlasGraphArtifact, nodeIds: string[]): string[] {
	const nodeIdSet = new Set(nodeIds);
	return artifact.edges
		.filter((edge) => nodeIdSet.has(edge.source) || nodeIdSet.has(edge.target))
		.map((edge) => edge.id);
}

function storyChapter(
	artifact: PublicAtlasGraphArtifact,
	input: Omit<PublicAtlasStoryChapter, 'relationshipIds'>
): PublicAtlasStoryChapter {
	return {
		...input,
		relationshipIds: relationshipIdsForNodes(artifact, input.focusNodeIds)
	};
}

function edgeIdsForFocusedNodes(canvas: PublicAtlasCanvas, nodeIds: string[]): string[] {
	const nodeIdSet = new Set(nodeIds);
	return canvas.edges
		.filter((edge) => nodeIdSet.has(edge.source) || nodeIdSet.has(edge.target))
		.map((edge) => edge.id);
}

function uniqueNodeIds(canvas: PublicAtlasCanvas, ids: Array<string | undefined>): string[] {
	const available = new Set(canvas.nodes.map((node) => node.id));
	return [...new Set(ids.filter((id): id is string => Boolean(id) && available.has(id)))];
}

export function createPublicAtlasNode(
	kind: PublicAtlasNodeKind,
	input: Partial<PublicAtlasNode> = {}
): PublicAtlasNode {
	return {
		id: input.id ?? randomId(kind),
		kind,
		label: clampText(input.label, 90) ?? KIND_DEFAULTS[kind],
		owner: clampText(input.owner, 90),
		status: input.status ?? 'unknown',
		notes: clampText(input.notes, 360),
		products: normalizeProductAttachments(input.products, kind, input.label),
		x: clampNumber(input.x, 0, PUBLIC_ATLAS_FLOW_SIZE.width),
		y: clampNumber(input.y, 0, 2000),
		width: clampNumber(input.width, 220, 380),
		createdBy: input.createdBy ?? 'visitor',
		updatedAt: now()
	};
}

export function createPublicAtlasEdge(
	source: string,
	target: string,
	input: Partial<PublicAtlasEdge> = {}
): PublicAtlasEdge {
	return {
		id: input.id ?? randomId('edge'),
		source,
		target,
		label: clampText(input.label, 90),
		createdBy: input.createdBy ?? 'visitor',
		updatedAt: now()
	};
}

export function createPublicAtlasCanvas(): PublicAtlasCanvas {
	const createdAt = now();
	const actor = createPublicAtlasNode('actor', {
		id: 'actor_client',
		label: 'Workflow owner',
		notes: 'Who owns the workflow and can make the next decision.',
		createdBy: 'system',
		status: 'wait'
	});
	const workflow = createPublicAtlasNode('data', {
		id: 'data_workflow',
		label: 'Workflow to map',
		notes: 'The operating path that should stop relying on manual rescue.',
		createdBy: 'system',
		status: 'unknown'
	});
	const approval = createPublicAtlasNode('human', {
		id: 'human_approval',
		label: 'Approval boundary',
		notes: 'What waits for a person before an agent or system acts.',
		createdBy: 'system',
		status: 'wait'
	});

	return {
		version: 1,
		id: randomId('public_atlas'),
		nodes: [actor, workflow, approval],
		edges: [
			createPublicAtlasEdge(actor.id, workflow.id, {
				id: 'edge_actor_workflow',
				label: 'owns',
				createdBy: 'system'
			}),
			createPublicAtlasEdge(workflow.id, approval.id, {
				id: 'edge_workflow_approval',
				label: 'needs boundary',
				createdBy: 'system'
			})
		],
		agentMessages: 0,
		mutationCount: 0,
		createdAt,
		updatedAt: createdAt
	};
}

export function normalizePublicAtlasCanvas(
	input: unknown,
	limits: { maxNodes: number; maxEdges: number } = { maxNodes: 48, maxEdges: 72 }
): PublicAtlasCanvas {
	const fallback = createPublicAtlasCanvas();
	if (!input || typeof input !== 'object') return fallback;
	const raw = input as Partial<PublicAtlasCanvas>;
	const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : fallback.createdAt;
	const id = typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 90) : fallback.id;
	const nodeIds = new Set<string>();
	const nodes = Array.isArray(raw.nodes)
		? raw.nodes
				.slice(0, limits.maxNodes)
				.map((node) => {
					const candidate = node as Partial<PublicAtlasNode>;
					const kind = PUBLIC_ATLAS_LANES.some((lane) => lane.kind === candidate.kind)
						? (candidate.kind as PublicAtlasNodeKind)
						: 'data';
					const normalized = createPublicAtlasNode(kind, {
						...candidate,
						id: clampText(candidate.id, 90) ?? randomId(kind),
						products: normalizeProductAttachments(candidate.products, kind, candidate.label),
						createdBy:
							candidate.createdBy === 'agent' || candidate.createdBy === 'system'
								? candidate.createdBy
								: 'visitor',
						status:
							candidate.status === 'run' ||
							candidate.status === 'wait' ||
							candidate.status === 'stop' ||
							candidate.status === 'unknown'
								? candidate.status
								: 'unknown'
					});
					if (nodeIds.has(normalized.id)) normalized.id = randomId(kind);
					nodeIds.add(normalized.id);
					return normalized;
				})
		: fallback.nodes;
	const edges = Array.isArray(raw.edges)
		? raw.edges.slice(0, limits.maxEdges).flatMap((edge) => {
				const candidate = edge as Partial<PublicAtlasEdge>;
				if (
					typeof candidate.source !== 'string' ||
					typeof candidate.target !== 'string' ||
					!nodeIds.has(candidate.source) ||
					!nodeIds.has(candidate.target) ||
					candidate.source === candidate.target
				) {
					return [];
				}
				return [
					createPublicAtlasEdge(candidate.source, candidate.target, {
						...candidate,
						id: clampText(candidate.id, 90) ?? randomId('edge'),
						createdBy:
							candidate.createdBy === 'agent' || candidate.createdBy === 'system'
								? candidate.createdBy
								: 'visitor'
					})
				];
			})
		: fallback.edges;

	return {
		version: 1,
		id,
		nodes: nodes.length ? nodes : fallback.nodes,
		edges,
		agentMessages: Number.isFinite(raw.agentMessages) ? Math.max(0, Number(raw.agentMessages)) : 0,
		mutationCount: Number.isFinite(raw.mutationCount) ? Math.max(0, Number(raw.mutationCount)) : 0,
		createdAt,
		updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now()
	};
}

export function computePublicAtlasReadiness(canvas: PublicAtlasCanvas): PublicAtlasReadiness {
	const kinds = new Set(canvas.nodes.map((node) => node.kind));
	const selectedDimensionCount = PUBLIC_ATLAS_LANES.filter((lane) => kinds.has(lane.kind)).length;
	const optionScore = Math.min(34, canvas.nodes.length * 4 + canvas.edges.length * 2);
	const dimensionScore = selectedDimensionCount * 7;
	const ownerBonus = canvas.nodes.some((node) => node.kind === 'actor' && node.label !== 'Workflow owner')
		? 10
		: 0;
	const decisionBonus = canvas.nodes.some((node) => node.kind === 'human' && node.status === 'wait')
		? 8
		: 0;
	const riskSignals =
		canvas.nodes.filter((node) => node.kind === 'constraint').length * 2 +
		canvas.nodes.filter((node) => node.kind === 'human' && ['wait', 'stop'].includes(node.status)).length +
		canvas.nodes.filter((node) => node.kind === 'data').length +
		canvas.nodes.filter((node) => node.kind === 'system' && node.status === 'run').length;
	const score = Math.min(100, optionScore + dimensionScore + ownerBonus + decisionBonus);

	if (score < 35) {
		return {
			level: 'Needs shape',
			slug: 'needs-shape',
			score,
			intent: 'governance-checklist',
			lane: 'not_sure',
			reason: 'The map still needs enough owner, workflow, data, and risk context to scope safely.',
			nextStep: 'Add the owner, workflow artifact, and first approval or stop condition.'
		};
	}

	if (riskSignals >= 7 && selectedDimensionCount >= 5) {
		return {
			level: 'Control layer candidate',
			slug: 'control-layer-candidate',
			score,
			intent: 'workflow-mapping',
			lane: 'reliability_and_control',
			reason: 'This workflow already names approvals, data, systems, or constraints that need control.',
			nextStep: 'Use the map to scope a controlled mapping session with explicit review states.'
		};
	}

	if (score >= 72 && kinds.has('actor') && kinds.has('human') && kinds.has('ai') && kinds.has('system')) {
		return {
			level: 'Pilot candidate',
			slug: 'pilot-candidate',
			score,
			intent: 'workflow-mapping',
			lane: 'workflow_infrastructure',
			reason: 'The map has enough owner, assistive work, system behavior, and decision context for a first run.',
			nextStep: 'Use the map as booking context for a workflow pilot.'
		};
	}

	return {
		level: 'Ready to map',
		slug: 'ready-to-map',
		score,
		intent: 'workflow-teardown',
		lane: 'not_sure',
		reason: 'There is enough shape to discuss the workflow, but the implementation lane should be chosen after mapping.',
		nextStep: 'Request a workflow map or bring this into a mapping session.'
	};
}

export function publicAtlasNodeWidth(node: PublicAtlasNode): number {
	const labelLength = node.label.length;
	const noteLength = (node.notes ?? '').length;
	const base = labelLength > 42 || noteLength > 150 ? 328 : labelLength > 28 || noteLength > 92 ? 300 : 274;
	return Math.max(252, Math.min(348, Math.max(node.width ?? 0, base)));
}

export function layoutPublicAtlasNodes(nodes: PublicAtlasNode[]): PublicAtlasNode[] {
	const offsets = new Map<PublicAtlasNodeKind, number>();
	const ordered = [...nodes].sort((a, b) => {
		const laneDelta = PUBLIC_ATLAS_FLOW_ORDER.indexOf(a.kind) - PUBLIC_ATLAS_FLOW_ORDER.indexOf(b.kind);
		if (laneDelta !== 0) return laneDelta;
		if ((a.y ?? 0) !== (b.y ?? 0)) return (a.y ?? 0) - (b.y ?? 0);
		return (a.x ?? 0) - (b.x ?? 0);
	});
	const positioned = new Map<string, PublicAtlasNode>();

	for (const node of ordered) {
		const lane = PUBLIC_ATLAS_FLOW_LANES[node.kind];
		const offset = offsets.get(node.kind) ?? 0;
		offsets.set(node.kind, offset + 1);
		positioned.set(node.id, {
			...node,
			x: node.x ?? lane.x,
			y: node.y ?? lane.y + offset * 174,
			width: publicAtlasNodeWidth(node)
		});
	}

	return nodes.map((node) => positioned.get(node.id) ?? node);
}

export function createPublicAtlasFocusGroups(inputCanvas: PublicAtlasCanvas): PublicAtlasFocusGroup[] {
	const canvas = normalizePublicAtlasCanvas(inputCanvas);
	const owner = canvas.nodes.find((node) => node.kind === 'actor');
	const workflow = canvas.nodes.find((node) => node.kind === 'data');
	const runNodes = canvas.nodes.filter(
		(node) => node.status === 'run' && (node.kind === 'system' || node.kind === 'ai')
	);
	const waitNodes = canvas.nodes.filter(
		(node) => node.kind !== 'actor' && (node.status === 'wait' || node.kind === 'human')
	);
	const stopNodes = canvas.nodes.filter((node) => node.status === 'stop' || node.kind === 'constraint');
	const proofNodes = canvas.nodes.filter((node) => node.kind === 'touchpoint');
	const buildGroup = (
		id: PublicAtlasFocusGroupId,
		label: string,
		description: string,
		nodeIds: string[]
	): PublicAtlasFocusGroup => {
		const uniqueIds = uniqueNodeIds(canvas, nodeIds);
		return {
			id,
			label,
			description,
			nodeIds: uniqueIds,
			edgeIds: edgeIdsForFocusedNodes(canvas, uniqueIds)
		};
	};

	return [
		buildGroup(
			'owner',
			'Owner',
			'Who owns the workflow and the durable record that should be mapped first.',
			[owner?.id, workflow?.id].filter((id): id is string => Boolean(id))
		),
		buildGroup(
			'run',
			'Run',
			'System or AI work that can proceed when the rule and evidence are clear.',
			runNodes.map((node) => node.id)
		),
		buildGroup(
			'wait',
			'Wait',
			'Human review, approval, or handoff state that should remain explicit.',
			waitNodes.map((node) => node.id)
		),
		buildGroup(
			'stop',
			'Stop',
			'Policy, privacy, access, accuracy, or authority boundaries that pause execution.',
			stopNodes.map((node) => node.id)
		),
		buildGroup(
			'proof',
			'Proof',
			'The inspection surface where state, evidence, owner, and outcome become visible.',
			proofNodes.map((node) => node.id)
		)
	];
}

export function summarizePublicAtlasCanvas(
	canvas: PublicAtlasCanvas,
	readiness = computePublicAtlasReadiness(canvas)
): string {
	const nodesByKind = PUBLIC_ATLAS_LANES.map((lane) => {
		const labels = canvas.nodes
			.filter((node) => node.kind === lane.kind)
			.map((node) => `${node.label}${node.status !== 'unknown' ? ` (${node.status})` : ''}`);
		return `${lane.label}: ${labels.length ? labels.join(', ') : 'Not mapped yet'}`;
	});
	const edges = canvas.edges.map((edge) => {
		const source = canvas.nodes.find((node) => node.id === edge.source)?.label ?? edge.source;
		const target = canvas.nodes.find((node) => node.id === edge.target)?.label ?? edge.target;
		return `${source} -> ${target}${edge.label ? ` (${edge.label})` : ''}`;
	});

	return [
		'Atlas public canvas summary',
		`Session: ${canvas.id}`,
		`Readiness: ${readiness.level} (${readiness.score}/100)`,
		`Recommended next step: ${readiness.nextStep}`,
		...nodesByKind,
		`Handoffs: ${edges.length ? edges.join('; ') : 'Not connected yet'}`,
		`Agent messages used: ${canvas.agentMessages}`,
		`Canvas mutations: ${canvas.mutationCount}`
	].join('\n');
}

export function createPublicAtlasGraphArtifact(
	inputCanvas: PublicAtlasCanvas,
	readiness = computePublicAtlasReadiness(inputCanvas)
): PublicAtlasGraphArtifact {
	const canvas = normalizePublicAtlasCanvas(inputCanvas);
	const requiredNodeKinds = PUBLIC_ATLAS_LANES.map((lane) => lane.kind);

	return {
		version: 1,
		canvasId: canvas.id,
		nodeCount: canvas.nodes.length,
		edgeCount: canvas.edges.length,
		readiness,
		renderer: selectPublicAtlasRenderer(canvas),
		agentContract: {
			purpose: readiness.intent === 'workflow-mapping' ? 'workflow-intake' : 'workflow-education',
			allowedStatuses: ['run', 'wait', 'stop', 'unknown'],
			requiredNodeKinds,
			sourceOfTruth: 'atlas-graph'
		},
		productContract: {
			compositionId: SIGNAL_DECISION_PROOF_COMPOSITION.id,
			atlasHub: SIGNAL_DECISION_PROOF_COMPOSITION.atlasHub,
			requiredProducts: SIGNAL_DECISION_PROOF_COMPOSITION.products,
			connectedProducts: connectedProductIds(canvas)
		},
		nodes: canvas.nodes.map((node) => ({
			id: node.id,
			kind: node.kind,
			label: node.label,
			owner: node.owner,
			status: node.status,
			notes: node.notes,
			agentRole: AGENT_ROLE_BY_KIND[node.kind],
			agentInstruction: AGENT_INSTRUCTION_BY_KIND[node.kind],
			products: node.products ?? defaultProductAttachmentsForNode(node.kind, node.label)
		})),
		edges: canvas.edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			label: edge.label,
			relationship: classifyPublicAtlasRelationship(edge)
		}))
	};
}

export function createPublicAtlasStoryArtifact(
	inputCanvas: PublicAtlasCanvas,
	readiness = computePublicAtlasReadiness(inputCanvas)
): PublicAtlasStoryArtifact {
	const artifact = createPublicAtlasGraphArtifact(inputCanvas, readiness);
	const owner = firstNodeByKind(artifact, 'actor');
	const workflow = firstNodeByKind(artifact, 'data');
	const system = firstNodeByKind(artifact, 'system');
	const ai = firstNodeByKind(artifact, 'ai');
	const human = firstNodeByKind(artifact, 'human') ?? firstNodeByStatus(artifact, 'wait');
	const boundary = firstNodeByKind(artifact, 'constraint') ?? firstNodeByStatus(artifact, 'stop');
	const receipt = firstNodeByKind(artifact, 'touchpoint');
	const workflowLabel = workflow?.label ?? 'Workflow map';
	const ownerLabel = owner?.label ?? 'Workflow owner';
	const chapters: PublicAtlasStoryChapter[] = [
		storyChapter(artifact, {
			id: 'claim',
			sequence: 1,
			kind: 'claim',
			eyebrow: 'Atlas graph',
			title: `Map ${workflowLabel} before execution.`,
			body: `${ownerLabel} owns the operating path. The canvas makes the workflow, handoffs, and next decision legible before an agent or system acts.`,
			focusNodeIds: uniqueDefined([owner?.id, workflow?.id]),
			state: workflow?.status ?? 'unknown',
			proofLabel: 'owner and workflow named',
			motionCue: 'highlight-nodes'
		}),
		storyChapter(artifact, {
			id: 'automation',
			sequence: 2,
			kind: 'automation',
			eyebrow: 'What can run',
			title: system ? `${system.label} can run when the rule is clear.` : 'Automation waits for a clear rule.',
			body: ai
				? `${system?.label ?? 'The system path'} coordinates with ${ai.label}; the map keeps AI assistance bounded to the work it can safely support.`
				: `${system?.label ?? 'The system path'} is the deterministic route, sync, log, or notification layer once the workflow boundary is known.`,
			focusNodeIds: uniqueDefined([system?.id, ai?.id]),
			state: system?.status ?? ai?.status ?? 'unknown',
			proofLabel: 'run path visible',
			motionCue: 'trace-handoff'
		}),
		storyChapter(artifact, {
			id: 'judgment',
			sequence: 3,
			kind: 'judgment',
			eyebrow: 'What waits',
			title: human ? `${human.label} stays with a person.` : 'Human judgment stays explicit.',
			body: `${human?.notes ?? 'Approval, review, and escalation remain named so the agent knows where to stop and ask.'}`,
			focusNodeIds: uniqueDefined([human?.id]),
			state: human?.status ?? 'wait',
			proofLabel: 'human review named',
			motionCue: 'highlight-nodes'
		}),
		storyChapter(artifact, {
			id: 'boundary',
			sequence: 4,
			kind: 'boundary',
			eyebrow: 'What stops',
			title: boundary ? `${boundary.label} is the stop condition.` : 'The map needs a stop condition.',
			body: `${boundary?.notes ?? 'The canvas should show the policy, privacy, access, accuracy, or authority boundary before execution.'}`,
			focusNodeIds: uniqueDefined([boundary?.id]),
			state: boundary?.status ?? 'stop',
			proofLabel: 'stop boundary visible',
			motionCue: 'reveal-proof'
		}),
		storyChapter(artifact, {
			id: 'receipt',
			sequence: 5,
			kind: 'receipt',
			eyebrow: 'Where proof lands',
			title: receipt ? `${receipt.label} shows the receipt.` : 'The workflow needs an audit trail.',
			body: `${receipt?.notes ?? 'Operators need a place to inspect state, evidence, owner, and next action.'}`,
			focusNodeIds: uniqueDefined([receipt?.id]),
			state: receipt?.status ?? 'unknown',
			proofLabel: 'inspection point named',
			motionCue: 'reveal-proof'
		}),
		storyChapter(artifact, {
			id: 'next-step',
			sequence: 6,
			kind: 'next-step',
			eyebrow: readiness.level,
			title: readiness.nextStep,
			body: readiness.reason,
			focusNodeIds: [],
			state: 'unknown',
			proofLabel: `readiness ${readiness.score}/100`,
			motionCue: 'none'
		})
	];

	return {
		version: 1,
		canvasId: artifact.canvasId,
		renderer: 'static-story',
		headline: `Atlas story for ${workflowLabel}`,
		summary: `${artifact.nodeCount} nodes, ${artifact.edgeCount} handoffs, ${readiness.level.toLowerCase()} readiness.`,
		accessibilitySummary: chapters.map((chapter) => `${chapter.sequence}. ${chapter.title} ${chapter.body}`).join(' '),
		chapters
	};
}
