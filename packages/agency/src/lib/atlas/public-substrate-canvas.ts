import type {
	CanvasKernelEmphasis,
	CanvasKernelPalette,
	CanvasKernelProjection
} from '@create-something/canvas-kernel';

export type PublicSubstrateCanvasNodeDetail = {
	id: string;
	label: string;
	kicker: string;
	status: 'run' | 'wait' | 'stop' | 'unknown';
	body: string;
	proof: string;
};

export const PUBLIC_SUBSTRATE_CANVAS_DETAILS: PublicSubstrateCanvasNodeDetail[] = [
	{
		id: 'agency_canvas',
		label: '.agency public canvas',
		kicker: 'Public proof surface',
		status: 'run',
		body: 'This public view shows where a request starts, what an agent may do, where approval is required, and which receipt records the result.',
		proof: 'public workflow view · no private client records'
	},
	{
		id: 'signal_queue',
		label: 'Signal queue',
		kicker: 'Signal',
		status: 'run',
		body: 'Requests, changes, tool events, and client context enter as inspectable records before any automation runs.',
		proof: 'record id · source · owner · timestamp'
	},
	{
		id: 'substrate_graph',
		label: 'Substrate graph',
		kicker: 'Current meaning',
		status: 'run',
		body: 'Substrate keeps entities, relationships, permissions, and evidence addressable so humans and agents can navigate the same operating reality.',
		proof: 'nodes · edges · receipts · permissions'
	},
	{
		id: 'agent_queue',
		label: 'Agent work queue',
		kicker: 'Automation lane',
		status: 'wait',
		body: 'Agents receive bounded work from the graph with policy, context, and rollback expectations attached.',
		proof: 'tool contract · policy pack · run receipt'
	},
	{
		id: 'decision_gate',
		label: 'Decision gate',
		kicker: 'Decision',
		status: 'wait',
		body: 'Ambiguous, high-impact, or policy-sensitive steps pause for the right owner instead of being hidden in automation.',
		proof: 'approval state · reviewer · reason'
	},
	{
		id: 'stop_boundary',
		label: 'Stop boundary',
		kicker: 'Stop condition',
		status: 'stop',
		body: 'The map names what agents cannot do: production writes, sensitive claims, client-impacting actions, or unclear authority without approval.',
		proof: 'blocked state · escalation path · rollback note'
	},
	{
		id: 'client_delivery',
		label: 'Client delivery lane',
		kicker: 'Delivery',
		status: 'run',
		body: 'Approved work moves through the delivery lane with receipts instead of disappearing into chat or a hidden script.',
		proof: 'handoff · deployment · verification'
	},
	{
		id: 'receipt_graph',
		label: 'Receipt graph',
		kicker: 'Proof',
		status: 'run',
		body: 'Every meaningful action leaves evidence that can be reviewed by a client, a human operator, or a follow-up agent.',
		proof: 'what changed · who/what acted · observed result'
	}
];

const detailById = new Map(PUBLIC_SUBSTRATE_CANVAS_DETAILS.map((detail) => [detail.id, detail]));

export const PUBLIC_SUBSTRATE_CANVAS_PROJECTION: CanvasKernelProjection = {
	nodes: [
		{
			height: 76,
			id: 'agency_canvas',
			kind: 'touchpoint',
			label: '.agency public canvas',
			status: 'run',
			width: 246,
			x: 80,
			y: 178
		},
		{
			height: 76,
			id: 'signal_queue',
			kind: 'data',
			label: 'Signal queue',
			status: 'run',
			width: 218,
			x: 390,
			y: 76
		},
		{
			height: 86,
			id: 'substrate_graph',
			kind: 'system',
			label: 'Substrate graph',
			status: 'run',
			width: 252,
			x: 680,
			y: 152
		},
		{
			height: 76,
			id: 'agent_queue',
			kind: 'ai',
			label: 'Agent work queue',
			status: 'wait',
			width: 246,
			x: 1010,
			y: 70
		},
		{
			height: 76,
			id: 'decision_gate',
			kind: 'human',
			label: 'Decision gate',
			status: 'wait',
			width: 230,
			x: 1014,
			y: 252
		},
		{
			height: 76,
			id: 'stop_boundary',
			kind: 'constraint',
			label: 'Stop boundary',
			status: 'stop',
			width: 228,
			x: 690,
			y: 356
		},
		{
			height: 76,
			id: 'client_delivery',
			kind: 'actor',
			label: 'Client delivery lane',
			status: 'run',
			width: 260,
			x: 1326,
			y: 162
		},
		{
			height: 76,
			id: 'receipt_graph',
			kind: 'touchpoint',
			label: 'Receipt graph',
			status: 'run',
			width: 230,
			x: 1038,
			y: 434
		}
	],
	edges: [
		{ id: 'agency-to-signal', source: 'agency_canvas', target: 'signal_queue' },
		{ id: 'signal-to-substrate', source: 'signal_queue', target: 'substrate_graph' },
		{ id: 'substrate-to-agent', source: 'substrate_graph', target: 'agent_queue' },
		{ id: 'substrate-to-decision', source: 'substrate_graph', target: 'decision_gate' },
		{ id: 'decision-to-client', source: 'decision_gate', target: 'client_delivery' },
		{ id: 'agent-to-client', source: 'agent_queue', target: 'client_delivery' },
		{ id: 'substrate-to-stop', source: 'substrate_graph', target: 'stop_boundary' },
		{ id: 'stop-to-receipt', source: 'stop_boundary', target: 'receipt_graph' },
		{ id: 'client-to-receipt', source: 'client_delivery', target: 'receipt_graph' },
		{ id: 'receipt-to-agency', source: 'receipt_graph', target: 'agency_canvas' }
	]
};

export const PUBLIC_SUBSTRATE_CANVAS_MOBILE_PROJECTION: CanvasKernelProjection = {
	nodes: [
		{
			height: 54,
			id: 'agency_canvas',
			kind: 'touchpoint',
			label: '.agency public canvas',
			status: 'run',
			width: 160,
			x: 22,
			y: 36
		},
		{
			height: 54,
			id: 'signal_queue',
			kind: 'data',
			label: 'Signal queue',
			status: 'run',
			width: 160,
			x: 210,
			y: 36
		},
		{
			height: 58,
			id: 'substrate_graph',
			kind: 'system',
			label: 'Substrate graph',
			status: 'run',
			width: 160,
			x: 22,
			y: 124
		},
		{
			height: 54,
			id: 'agent_queue',
			kind: 'ai',
			label: 'Agent work queue',
			status: 'wait',
			width: 160,
			x: 210,
			y: 124
		},
		{
			height: 54,
			id: 'decision_gate',
			kind: 'human',
			label: 'Decision gate',
			status: 'wait',
			width: 160,
			x: 22,
			y: 212
		},
		{
			height: 54,
			id: 'stop_boundary',
			kind: 'constraint',
			label: 'Stop boundary',
			status: 'stop',
			width: 160,
			x: 210,
			y: 212
		},
		{
			height: 54,
			id: 'client_delivery',
			kind: 'actor',
			label: 'Client delivery lane',
			status: 'run',
			width: 160,
			x: 22,
			y: 300
		},
		{
			height: 54,
			id: 'receipt_graph',
			kind: 'touchpoint',
			label: 'Receipt graph',
			status: 'run',
			width: 160,
			x: 210,
			y: 300
		}
	],
	edges: PUBLIC_SUBSTRATE_CANVAS_PROJECTION.edges
};

export const PUBLIC_SUBSTRATE_CANVAS_ACTIVE_NODE_IDS = new Set([
	'agency_canvas',
	'substrate_graph',
	'receipt_graph'
]);

export const PUBLIC_SUBSTRATE_CANVAS_PROOF_NODE_IDS = new Set([
	'signal_queue',
	'substrate_graph',
	'decision_gate',
	'client_delivery',
	'receipt_graph'
]);

export const PUBLIC_SUBSTRATE_CANVAS_PROOF_EDGE_IDS = new Set([
	'signal-to-substrate',
	'substrate-to-decision',
	'decision-to-client',
	'client-to-receipt'
]);

export const PUBLIC_SUBSTRATE_CANVAS_PROOF_EMPHASIS: CanvasKernelEmphasis = {
	dimUnfocused: true,
	edgeIds: PUBLIC_SUBSTRATE_CANVAS_PROOF_EDGE_IDS,
	nodeIds: PUBLIC_SUBSTRATE_CANVAS_PROOF_NODE_IDS
};

export const PUBLIC_SUBSTRATE_CANVAS_PALETTE: CanvasKernelPalette = {
	activeRing: [0.02, 0.08, 0.18, 0.36],
	edge: [0.08, 0.09, 0.12, 0.18],
	kindStripe: {
		actor: [0.08, 0.09, 0.12, 0.62],
		ai: [0.2, 0.27, 0.22, 0.5],
		constraint: [0.78, 0.12, 0.18, 0.5],
		data: [0.43, 0.43, 0.4, 0.48],
		human: [0.02, 0.18, 0.42, 0.44],
		system: [0.09, 0.1, 0.14, 0.52],
		touchpoint: [0.33, 0.29, 0.38, 0.42]
	},
	nodeBorder: [0.07, 0.08, 0.11, 0.28],
	nodeFace: [0.99, 0.99, 0.96, 0.98],
	nodeFaceSelected: [1, 1, 0.98, 1],
	selectedRing: [0.02, 0.08, 0.18, 0.82],
	statusRing: {
		run: [0.14, 0.28, 0.19, 0.34],
		stop: [0.78, 0.12, 0.18, 0.42],
		unknown: [0.07, 0.08, 0.11, 0.26],
		wait: [0.02, 0.18, 0.42, 0.3]
	}
};

export function publicSubstrateCanvasDetail(
	nodeId: string | null | undefined
): PublicSubstrateCanvasNodeDetail {
	return detailById.get(nodeId ?? '') ?? PUBLIC_SUBSTRATE_CANVAS_DETAILS[0];
}
