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
