import {
	computePublicAtlasReadiness,
	createPublicAtlasCanvas,
	createPublicAtlasEdge,
	createPublicAtlasNode,
	normalizePublicAtlasCanvas,
	type PublicAtlasCanvas,
	type PublicAtlasNode,
	type PublicAtlasNodeKind,
	type PublicAtlasNodeStatus,
	type PublicAtlasReadiness,
	type PublicAtlasStarterMap
} from '@create-something/canon/atlas/headless';
import type { PublicAtlasAgentResult } from './agent-contract';
import { PUBLIC_ATLAS_LIMITS } from './intake-policy';

export {
	PUBLIC_ATLAS_FLOW_SIZE,
	PUBLIC_ATLAS_LANES,
	computePublicAtlasReadiness,
	createPublicAtlasCanvas,
	createPublicAtlasEdge,
	createPublicAtlasGraphArtifact,
	createPublicAtlasNode,
	createPublicAtlasStoryArtifact,
	layoutPublicAtlasNodes,
	normalizePublicAtlasCanvas,
	publicAtlasNodeWidth,
	summarizePublicAtlasCanvas
} from '@create-something/canon/atlas/headless';

export type {
	PublicAtlasCanvas,
	PublicAtlasEdge,
	PublicAtlasGraphArtifact,
	PublicAtlasNode,
	PublicAtlasNodeKind,
	PublicAtlasNodeStatus,
	PublicAtlasReadiness,
	PublicAtlasRendererKind,
	PublicAtlasSemanticEdge,
	PublicAtlasSemanticNode,
	PublicAtlasStarterMap,
	PublicAtlasStoryArtifact,
	PublicAtlasStoryChapter
} from '@create-something/canon/atlas/headless';

export type { PublicAtlasAgentResult } from './agent-contract';
export { PUBLIC_ATLAS_LIMITS, PUBLIC_ATLAS_STORAGE_KEYS, type PublicAtlasTier } from './intake-policy';

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

function clampPhrase(value: string, max = 90): string {
	const normalized = value.trim().replace(/\s+/g, ' ');
	if (normalized.length <= max) return normalized;
	const clipped = normalized.slice(0, max).replace(/\s+\S*$/, '').replace(/[,.:-]+$/, '');
	return clipped || normalized.slice(0, max);
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
			'Approval authority',
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
