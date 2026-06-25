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

export type PublicAtlasRendererKind = 'react-flow' | 'static-story' | 'sigma' | 'cosmograph';

export type PublicAtlasSemanticNode = Pick<
	PublicAtlasNode,
	'id' | 'kind' | 'label' | 'owner' | 'status' | 'notes'
> & {
	agentRole: 'owner' | 'judgment' | 'automation' | 'memory' | 'guardrail' | 'interface';
	agentInstruction: string;
};

export type PublicAtlasSemanticEdge = Pick<PublicAtlasEdge, 'id' | 'source' | 'target' | 'label'> & {
	relationship: 'owns' | 'triggers' | 'delegates' | 'waits_for' | 'bounded_by' | 'observed_in' | 'hands_off_to';
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

export type PublicAtlasStarterMap = {
	id: string;
	name: string;
	industry: string;
	description: string;
};

export type PublicAtlasReadiness = {
	level: 'Needs shape' | 'Ready to map' | 'Pilot candidate' | 'Trust layer candidate';
	slug: string;
	score: number;
	intent: 'governance-checklist' | 'workflow-teardown' | 'workflow-mapping';
	lane: 'workflow_infrastructure' | 'reliability_and_control' | 'not_sure';
	reason: string;
	nextStep: string;
};

export type PublicAtlasAgentResult = {
	reply: string;
	canvas: PublicAtlasCanvas;
	mutationCount: number;
	suggestions: string[];
	readiness: PublicAtlasReadiness;
	agentMode: 'model' | 'fallback';
};

export const PUBLIC_ATLAS_STORAGE_KEYS = {
	canvas: 'create-something:public-atlas-canvas',
	meta: 'create-something:public-atlas-meta',
	warmupSummary: 'create-something:workflow-mapping-warmup',
	warmupDraft: 'create-something:workflow-mapping-warmup-draft'
} as const;

export const PUBLIC_ATLAS_LIMITS = {
	anonymous: {
		messagesPerMap: 10,
		mutationsPerMap: 20,
		dailyMessagesPerVisitor: 20,
		maxMessageChars: 900,
		maxNodes: 36,
		maxEdges: 52
	},
	warmLead: {
		messagesPerMap: 30,
		mutationsPerMap: 75,
		dailyMessagesPerVisitor: 60,
		maxMessageChars: 1200,
		maxNodes: 48,
		maxEdges: 72
	}
} as const;

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
	system: 'Map deterministic tool, sync, route, log, or notification behavior.',
	data: 'Treat records, files, tickets, and receipts as durable workflow memory.',
	constraint: 'Stop, ask, or escalate when privacy, access, policy, cost, or accuracy is unclear.',
	touchpoint: 'Show where an operator inspects state, evidence, and next action.'
};

type StarterNodeSpec = {
	id: string;
	kind: PublicAtlasNodeKind;
	label: string;
	owner?: string;
	status: PublicAtlasNodeStatus;
	notes: string;
};

type StarterEdgeSpec = {
	source: string;
	target: string;
	label: string;
};

type StarterMapSpec = PublicAtlasStarterMap & {
	nodes: StarterNodeSpec[];
	edges: StarterEdgeSpec[];
};

const starterEdges: StarterEdgeSpec[] = [
	{ source: 'actor_owner', target: 'data_workflow', label: 'owns' },
	{ source: 'data_workflow', target: 'system_route', label: 'triggers' },
	{ source: 'system_route', target: 'ai_assist', label: 'delegates assist' },
	{ source: 'ai_assist', target: 'human_review', label: 'waits for' },
	{ source: 'data_workflow', target: 'constraint_stop', label: 'bounded by' },
	{ source: 'human_review', target: 'touchpoint_receipt', label: 'reviewed in' },
	{ source: 'system_route', target: 'touchpoint_receipt', label: 'logs receipt' }
];

const STARTER_MAP_SPECS: StarterMapSpec[] = [
	{
		id: 'revops-lead-handoff',
		name: 'RevOps lead handoff',
		industry: 'RevOps',
		description: 'Route qualified leads, enrich context, and stop on consent or ownership risk.',
		nodes: [
			{
				id: 'actor_owner',
				kind: 'actor',
				label: 'RevOps owner',
				status: 'wait',
				notes: 'Owns routing rules, territory exceptions, and follow-up service levels.'
			},
			{
				id: 'data_workflow',
				kind: 'data',
				label: 'Qualified lead handoff',
				status: 'unknown',
				notes: 'The durable lead record that should carry source, intent, owner, and next action.'
			},
			{
				id: 'system_route',
				kind: 'system',
				label: 'CRM route and notify',
				status: 'run',
				notes: 'Enrich, dedupe, assign owner, and notify the channel when rules are clear.'
			},
			{
				id: 'ai_assist',
				kind: 'ai',
				label: 'Fit and follow-up draft',
				status: 'wait',
				notes: 'Summarize buying signal and draft a first reply without sending it.'
			},
			{
				id: 'human_review',
				kind: 'human',
				label: 'Territory or enterprise review',
				status: 'wait',
				notes: 'Human resolves ownership conflicts, strategic accounts, and unusual requests.'
			},
			{
				id: 'constraint_stop',
				kind: 'constraint',
				label: 'Consent and duplicate uncertainty',
				status: 'stop',
				notes: 'Stop when consent, restricted domain, or duplicate confidence is unclear.'
			},
			{
				id: 'touchpoint_receipt',
				kind: 'touchpoint',
				label: 'CRM activity receipt',
				status: 'unknown',
				notes: 'The place an operator sees route decision, owner, draft, and blocked reason.'
			}
		],
		edges: starterEdges
	},
	{
		id: 'healthcare-prior-authorization-prep',
		name: 'Prior authorization prep',
		industry: 'Healthcare ops',
		description: 'Assemble PA evidence while keeping clinical and medical-necessity decisions gated.',
		nodes: [
			{
				id: 'actor_owner',
				kind: 'actor',
				label: 'Utilization review owner',
				status: 'wait',
				notes: 'Owns packet completeness, reviewer handoff, and payer response follow-through.'
			},
			{
				id: 'data_workflow',
				kind: 'data',
				label: 'PA request packet',
				status: 'unknown',
				notes: 'Clinical context, benefits, eligibility, policy references, and missing-document status.'
			},
			{
				id: 'system_route',
				kind: 'system',
				label: 'EHR and payer lookup',
				status: 'run',
				notes: 'Read records, verify required fields, and assemble the packet checklist.'
			},
			{
				id: 'ai_assist',
				kind: 'ai',
				label: 'Completeness summary',
				status: 'wait',
				notes: 'Extract missing evidence and draft reviewer-facing context with citations.'
			},
			{
				id: 'human_review',
				kind: 'human',
				label: 'Clinical reviewer decision',
				status: 'wait',
				notes: 'Reviewer handles clinical ambiguity, medical necessity, and final submission judgment.'
			},
			{
				id: 'constraint_stop',
				kind: 'constraint',
				label: 'No autonomous medical decision',
				status: 'stop',
				notes: 'Stop before denial, approval, or medical-necessity determination without reviewer action.'
			},
			{
				id: 'touchpoint_receipt',
				kind: 'touchpoint',
				label: 'Review queue receipt',
				status: 'unknown',
				notes: 'Shows packet status, missing evidence, reviewer decision, and submission trail.'
			}
		],
		edges: starterEdges
	},
	{
		id: 'construction-rfi-submittal-control',
		name: 'RFI/submittal control',
		industry: 'Construction',
		description: 'Classify project docs, assemble evidence, and gate contractual commitments.',
		nodes: [
			{
				id: 'actor_owner',
				kind: 'actor',
				label: 'Project controls owner',
				status: 'wait',
				notes: 'Owns schedule, cost, contract, and reviewer routing implications.'
			},
			{
				id: 'data_workflow',
				kind: 'data',
				label: 'RFI or submittal packet',
				status: 'unknown',
				notes: 'The project record with drawings, specs, schedule impact, and response history.'
			},
			{
				id: 'system_route',
				kind: 'system',
				label: 'Project system sync',
				status: 'run',
				notes: 'Pull current project data, attach references, and notify the responsible reviewer.'
			},
			{
				id: 'ai_assist',
				kind: 'ai',
				label: 'Reference and risk draft',
				status: 'wait',
				notes: 'Summarize relevant specs, likely conflicts, and open questions for review.'
			},
			{
				id: 'human_review',
				kind: 'human',
				label: 'PM or architect review',
				status: 'wait',
				notes: 'Human approves any response that affects scope, cost, schedule, or contract posture.'
			},
			{
				id: 'constraint_stop',
				kind: 'constraint',
				label: 'Contract and scope boundary',
				status: 'stop',
				notes: 'Stop before final answers, commitments, or change-order implications.'
			},
			{
				id: 'touchpoint_receipt',
				kind: 'touchpoint',
				label: 'Project control receipt',
				status: 'unknown',
				notes: 'Shows source references, reviewer, approval state, and response evidence.'
			}
		],
		edges: starterEdges
	},
	{
		id: 'marketplace-review-queue',
		name: 'Marketplace review queue',
		industry: 'Marketplace ops',
		description: 'Collect submission evidence, support reviewers, and prevent ungrounded decisions.',
		nodes: [
			{
				id: 'actor_owner',
				kind: 'actor',
				label: 'Marketplace review owner',
				status: 'wait',
				notes: 'Owns reviewer assignments, policy interpretation, and creator communication standards.'
			},
			{
				id: 'data_workflow',
				kind: 'data',
				label: 'Submitted asset packet',
				status: 'unknown',
				notes: 'Submission metadata, validation output, policy flags, creator notes, and review status.'
			},
			{
				id: 'system_route',
				kind: 'system',
				label: 'Validator and queue sync',
				status: 'run',
				notes: 'Run checks, collect evidence, assign reviewer, and update queue posture.'
			},
			{
				id: 'ai_assist',
				kind: 'ai',
				label: 'Supplemental reviewer brief',
				status: 'wait',
				notes: 'Summarize issues, cite evidence, and draft questions for the reviewer.'
			},
			{
				id: 'human_review',
				kind: 'human',
				label: 'Reviewer approval decision',
				status: 'wait',
				notes: 'Human decides approve, reject, request changes, or escalate policy ambiguity.'
			},
			{
				id: 'constraint_stop',
				kind: 'constraint',
				label: 'No ungrounded approval',
				status: 'stop',
				notes: 'Stop before approval, rejection, security claims, or timeline promises without evidence.'
			},
			{
				id: 'touchpoint_receipt',
				kind: 'touchpoint',
				label: 'Reviewer dashboard receipt',
				status: 'unknown',
				notes: 'Shows validation evidence, reviewer state, creator-facing notes, and policy flags.'
			}
		],
		edges: starterEdges
	},
	{
		id: 'insurance-claims-intake',
		name: 'Insurance claims intake',
		industry: 'Insurance',
		description: 'Triage claim intake, request missing evidence, and gate payout or denial authority.',
		nodes: [
			{
				id: 'actor_owner',
				kind: 'actor',
				label: 'Claims operations owner',
				status: 'wait',
				notes: 'Owns intake rules, escalation criteria, and sensitive customer communication standards.'
			},
			{
				id: 'data_workflow',
				kind: 'data',
				label: 'Claim intake packet',
				status: 'unknown',
				notes: 'Policy, loss details, customer uploads, missing evidence, and communication history.'
			},
			{
				id: 'system_route',
				kind: 'system',
				label: 'Claim system triage',
				status: 'run',
				notes: 'Classify claim type, check required documents, and request missing information.'
			},
			{
				id: 'ai_assist',
				kind: 'ai',
				label: 'Coverage context summary',
				status: 'wait',
				notes: 'Summarize facts, policy references, and next best questions for an adjuster.'
			},
			{
				id: 'human_review',
				kind: 'human',
				label: 'Adjuster review',
				status: 'wait',
				notes: 'Adjuster handles coverage uncertainty, fraud flags, payout, denial, and sensitive messaging.'
			},
			{
				id: 'constraint_stop',
				kind: 'constraint',
				label: 'No payout or denial authority',
				status: 'stop',
				notes: 'Stop before coverage decision, payout, denial, or fraud escalation without authority.'
			},
			{
				id: 'touchpoint_receipt',
				kind: 'touchpoint',
				label: 'Claims queue receipt',
				status: 'unknown',
				notes: 'Shows triage class, missing documents, adjuster state, and customer-contact trail.'
			}
		],
		edges: starterEdges
	}
];

export const PUBLIC_ATLAS_INDUSTRY_STARTERS: PublicAtlasStarterMap[] = STARTER_MAP_SPECS.map(
	({ id, name, industry, description }) => ({ id, name, industry, description })
);

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

function clampPhrase(value: string, max = 90): string {
	const normalized = value.trim().replace(/\s+/g, ' ');
	if (normalized.length <= max) return normalized;
	const clipped = normalized.slice(0, max).replace(/\s+\S*$/, '').replace(/[,.:-]+$/, '');
	return clipped || normalized.slice(0, max);
}

function clampNumber(value: unknown, min: number, max: number): number | undefined {
	if (!Number.isFinite(value)) return undefined;
	return Math.min(max, Math.max(min, Number(value)));
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
		primary: 'react-flow',
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

function relationshipIdsForNodes(
	artifact: PublicAtlasGraphArtifact,
	nodeIds: string[]
): string[] {
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

export function createPublicAtlasCanvasFromStarter(starterId: string): PublicAtlasCanvas {
	const starter = STARTER_MAP_SPECS.find((item) => item.id === starterId);
	if (!starter) return createPublicAtlasCanvas();
	const createdAt = now();
	const nodes = starter.nodes.map((node) =>
		createPublicAtlasNode(node.kind, {
			...node,
			createdBy: 'system'
		})
	);
	const nodeIds = new Set(nodes.map((node) => node.id));
	const edges = starter.edges.flatMap((edge) => {
		if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return [];
		return [
			createPublicAtlasEdge(edge.source, edge.target, {
				label: edge.label,
				createdBy: 'system'
			})
		];
	});

	return {
		version: 1,
		id: randomId(`public_atlas_${starter.id}`),
		nodes,
		edges,
		agentMessages: 0,
		mutationCount: 0,
		createdAt,
		updatedAt: createdAt
	};
}

export function normalizePublicAtlasCanvas(input: unknown): PublicAtlasCanvas {
	const fallback = createPublicAtlasCanvas();
	if (!input || typeof input !== 'object') return fallback;
	const raw = input as Partial<PublicAtlasCanvas>;
	const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : fallback.createdAt;
	const id = typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 90) : fallback.id;
	const nodeIds = new Set<string>();
	const nodes = Array.isArray(raw.nodes)
		? raw.nodes
				.slice(0, PUBLIC_ATLAS_LIMITS.warmLead.maxNodes)
				.map((node) => {
					const candidate = node as Partial<PublicAtlasNode>;
					const kind = PUBLIC_ATLAS_LANES.some((lane) => lane.kind === candidate.kind)
						? (candidate.kind as PublicAtlasNodeKind)
						: 'data';
					const normalized = createPublicAtlasNode(kind, {
						...candidate,
						id: clampText(candidate.id, 90) ?? randomId(kind),
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
		? raw.edges
				.slice(0, PUBLIC_ATLAS_LIMITS.warmLead.maxEdges)
				.flatMap((edge) => {
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
			level: 'Trust layer candidate',
			slug: 'trust-layer-candidate',
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
		nextStep: 'Request a trust map or bring this into a mapping session.'
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
		nodes: canvas.nodes.map((node) => ({
			id: node.id,
			kind: node.kind,
			label: node.label,
			owner: node.owner,
			status: node.status,
			notes: node.notes,
			agentRole: AGENT_ROLE_BY_KIND[node.kind],
			agentInstruction: AGENT_INSTRUCTION_BY_KIND[node.kind]
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
			title: receipt ? `${receipt.label} shows the receipt.` : 'The workflow needs a receipt surface.',
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
		accessibilitySummary: chapters
			.map((chapter) => `${chapter.sequence}. ${chapter.title} ${chapter.body}`)
			.join(' '),
		chapters
	};
}

function includesAny(text: string, terms: string[]): boolean {
	return terms.some((term) => text.includes(term));
}

function nodeExists(canvas: PublicAtlasCanvas, kind: PublicAtlasNodeKind, label: string): boolean {
	const normalized = label.toLowerCase();
	return canvas.nodes.some(
		(node) => node.kind === kind && node.label.toLowerCase() === normalized
	);
}

function addAgentNode(
	canvas: PublicAtlasCanvas,
	added: PublicAtlasNode[],
	kind: PublicAtlasNodeKind,
	label: string,
	notes: string,
	status: PublicAtlasNodeStatus
): void {
	if (nodeExists(canvas, kind, label)) return;
	const node = createPublicAtlasNode(kind, {
		label,
		notes,
		status,
		createdBy: 'agent'
	});
	canvas.nodes.push(node);
	added.push(node);
	const workflow = canvas.nodes.find((item) => item.id === 'data_workflow') ?? canvas.nodes[0];
	if (workflow && workflow.id !== node.id) {
		canvas.edges.push(
			createPublicAtlasEdge(workflow.id, node.id, {
				label: kind === 'constraint' ? 'bounded by' : 'relates to',
				createdBy: 'agent'
			})
		);
	}
}

export function runPublicAtlasMappingAgent(
	message: string,
	inputCanvas: PublicAtlasCanvas
): PublicAtlasAgentResult {
	const canvas = normalizePublicAtlasCanvas(inputCanvas);
	const text = message.toLowerCase().slice(0, PUBLIC_ATLAS_LIMITS.warmLead.maxMessageChars);
	const added: PublicAtlasNode[] = [];
	let edgeMutations = 0;
	const suggestions: string[] = [];

	if (message.trim()) {
		const workflow = canvas.nodes.find((node) => node.id === 'data_workflow');
		if (workflow && workflow.label === 'Workflow to map') {
			workflow.label = clampPhrase(message, 90);
			workflow.notes = 'The visitor described this as the workflow to map.';
			workflow.updatedAt = now();
			added.push(workflow);
		}
	}

	if (includesAny(text, ['approve', 'approval', 'review', 'owner', 'sign off', 'escalate'])) {
		addAgentNode(
			canvas,
			added,
			'human',
			'Approval owner',
			'The workflow names a human decision or review boundary.',
			'wait'
		);
		suggestions.push('Name the person who can approve this path.');
	}
	if (includesAny(text, ['privacy', 'secret', 'token', 'credential', 'access', 'permission'])) {
		addAgentNode(
			canvas,
			added,
			'constraint',
			'Access or privacy boundary',
			'The workflow introduces a privacy, credential, or permission limit.',
			'stop'
		);
		suggestions.push('Do not put credentials in the map; name the access boundary instead.');
	}
	if (includesAny(text, ['draft', 'summarize', 'classify', 'verify', 'extract', 'generate', 'triage'])) {
		addAgentNode(
			canvas,
			added,
			'ai',
			'AI assist task',
			'The workflow has bounded work an agent can help with after limits are clear.',
			'wait'
		);
		suggestions.push('Keep AI work assistive until the allowed action is explicit.');
	}
	if (includesAny(text, ['route', 'notify', 'log', 'store', 'sync', 'webhook', 'automation'])) {
		addAgentNode(
			canvas,
			added,
			'system',
			'System operation',
			'The workflow has a routing, logging, storage, sync, or notification step.',
			'run'
		);
		suggestions.push('Decide which system operation can run without review.');
	}
	if (includesAny(text, ['record', 'receipt', 'file', 'form', 'database', 'ticket', 'lead', 'job', 'order'])) {
		addAgentNode(
			canvas,
			added,
			'data',
			'Workflow record',
			'The workflow depends on a record, form, ticket, or receipt that should stay visible.',
			'unknown'
		);
		suggestions.push('Identify the durable record that proves the work happened.');
	}
	if (
		includesAny(text, [
			'notion',
			'linear',
			'dify',
			'slack',
			'email',
			'airtable',
			'webflow',
			'dashboard',
			'hubspot',
			'quickbooks'
		])
	) {
		addAgentNode(
			canvas,
			added,
			'touchpoint',
			'Inspection touchpoint',
			'The workflow names a place where a person may inspect, approve, or act.',
			'unknown'
		);
		suggestions.push('Keep the operator-facing touchpoint narrow and readable.');
	}

	if (includesAny(text, ['connect', 'handoff', 'link', 'expected'])) {
		const workflow = canvas.nodes.find((node) => node.id === 'data_workflow') ?? canvas.nodes[0];
		if (workflow) {
			const labelForKind: Record<PublicAtlasNodeKind, string> = {
				actor: 'owned by',
				human: 'needs approval',
				ai: 'delegates assist',
				system: 'triggers',
				data: 'produces record',
				constraint: 'bounded by',
				touchpoint: 'inspected at'
			};
			for (const edge of canvas.edges) {
				if (edgeMutations >= 4) break;
				if (edge.source !== workflow.id) continue;
				if (edge.label && !['relates to', 'hands off to', 'maps to'].includes(edge.label)) continue;
				const target = canvas.nodes.find((node) => node.id === edge.target);
				if (!target) continue;
				edge.label = labelForKind[target.kind];
				edge.updatedAt = now();
				edgeMutations += 1;
			}
			for (const node of canvas.nodes) {
				if (edgeMutations >= 4) break;
				if (node.id === workflow.id) continue;
				const exists = canvas.edges.some(
					(edge) => edge.source === workflow.id && edge.target === node.id
				);
				if (exists) continue;
				canvas.edges.push(
					createPublicAtlasEdge(workflow.id, node.id, {
						label: node.kind === 'constraint' ? 'bounded by' : 'hands off to',
						createdBy: 'agent'
					})
				);
				edgeMutations += 1;
			}
			if (edgeMutations) {
				suggestions.push('Review the handoff labels and rename any edge that needs a stronger verb.');
			}
		}
	}

	const mutationCount = added.length + edgeMutations;

	if (!mutationCount) {
		suggestions.push('Add the workflow owner, the first decision, or the record that moves through the workflow.');
	}

	canvas.agentMessages += 1;
	canvas.mutationCount += mutationCount;
	canvas.updatedAt = now();
	const readiness = computePublicAtlasReadiness(canvas);
	const reply = mutationCount
		? `I updated the map with ${mutationCount} item${mutationCount === 1 ? '' : 's'}. ${readiness.reason}`
		: `I did not change the map yet. ${readiness.nextStep}`;

	return {
		reply,
		canvas,
		mutationCount,
		suggestions,
		readiness,
		agentMode: 'fallback'
	};
}
