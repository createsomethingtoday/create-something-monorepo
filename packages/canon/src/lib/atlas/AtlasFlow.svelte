<script lang="ts">
	import './AtlasFlow.css';
	import '@xyflow/svelte/dist/style.css';
	import {
		Background,
		Controls,
		MarkerType,
		SvelteFlow,
		type Edge,
		type Node,
		type OnSelectionChange,
		type ProOptions
	} from '@xyflow/svelte';
	import AtlasFlowNode from './AtlasFlowNode.svelte';
	import {
		PUBLIC_ATLAS_FLOW_SIZE,
		layoutPublicAtlasNodes,
		publicAtlasNodeWidth,
		type PublicAtlasCanvas,
		type PublicAtlasNodeKind,
		type PublicAtlasNodeStatus
	} from './headless.js';

	type AtlasFlowNodeData = {
		kind: PublicAtlasNodeKind;
		kindLabel: string;
		label: string;
		owner: string;
		notes: string;
		status: PublicAtlasNodeStatus;
		statusLabel: string;
	};

	const KIND_LABELS: Record<PublicAtlasNodeKind, string> = {
		actor: 'Actor',
		ai: 'AI task',
		constraint: 'Constraint',
		data: 'Data',
		human: 'Human',
		system: 'System',
		touchpoint: 'Touchpoint'
	};

	const STATUS_LABELS: Record<PublicAtlasNodeStatus, string> = {
		run: 'Run',
		stop: 'Stop',
		unknown: 'Unknown',
		wait: 'Wait'
	};

	const nodeTypes = {
		atlas: AtlasFlowNode
	};

	const proOptions: ProOptions = {
		hideAttribution: true
	};

	export let canvas: PublicAtlasCanvas;
	export let selectedNodeId: string;
	export let flowId = 'public-atlas-flow';
	export let onMoveNode: (nodeId: string, position: { x: number; y: number }) => void;
	export let onSelectNode: (nodeId: string) => void;

	$: counts = `${canvas.nodes.length} nodes / ${canvas.edges.length} edges`;
	$: flowNodes = layoutPublicAtlasNodes(canvas.nodes).map((node) => {
		const width = publicAtlasNodeWidth(node);
		return {
			id: node.id,
			type: 'atlas',
			position: { x: node.x ?? 0, y: node.y ?? 0 },
			width,
			selected: node.id === selectedNodeId,
			focusable: true,
			ariaRole: 'button',
			ariaLabel: `${node.label}. ${KIND_LABELS[node.kind]}. ${STATUS_LABELS[node.status]}. ${
				node.notes || 'Describe the boundary, handoff, evidence, or next decision.'
			}`,
			data: {
				kind: node.kind,
				kindLabel: KIND_LABELS[node.kind],
				label: node.label,
				owner: node.owner || node.createdBy,
				notes: node.notes || 'Describe the boundary, handoff, evidence, or next decision.',
				status: node.status,
				statusLabel: STATUS_LABELS[node.status]
			}
		} satisfies Node<AtlasFlowNodeData, 'atlas'>;
	});
	$: flowEdges = canvas.edges.map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		label: edge.label,
		type: 'smoothstep',
		focusable: true,
		ariaRole: 'group',
		markerEnd: {
			type: MarkerType.ArrowClosed,
			width: 16,
			height: 16,
			color: '#9f9b90'
		},
		style: 'stroke: #9f9b90; stroke-width: 1.35;',
		labelStyle:
			'fill: #6f6f67; font-size: 11px; font-weight: 600; paint-order: stroke; stroke: #fbfbf8; stroke-width: 7px;'
	})) satisfies Edge[];

	function handleNodeClick({ node }: { node: Node<AtlasFlowNodeData, 'atlas'> }) {
		onSelectNode(node.id);
	}

	function handleNodeDragStop({ nodes }: { nodes: Array<Node<AtlasFlowNodeData, 'atlas'>> }) {
		for (const node of nodes) {
			onMoveNode(node.id, {
				x: Math.max(0, Math.round(node.position.x)),
				y: Math.max(0, Math.round(node.position.y))
			});
		}
	}

	const handleSelectionChange: OnSelectionChange<Node<AtlasFlowNodeData, 'atlas'>, Edge> = ({
		nodes
	}) => {
		if (nodes[0]) onSelectNode(nodes[0].id);
	};
</script>

<div class="public-atlas-flow" aria-label="Atlas workflow map">
	<div class="public-atlas-kicker">
		<strong>Workflow map</strong>
		<small>{counts}</small>
	</div>
	<div class="public-atlas-legend">
		<span class="run">Run</span>
		<span class="wait">Wait</span>
		<span class="stop">Stop</span>
	</div>

	<SvelteFlow
		id={flowId}
		bind:nodes={flowNodes}
		bind:edges={flowEdges}
		{nodeTypes}
		fitView
		fitViewOptions={{ padding: 0.18, minZoom: 0.2, maxZoom: 1 }}
		minZoom={0.2}
		maxZoom={1.45}
		snapGrid={[8, 8]}
		nodesConnectable={false}
		elementsSelectable
		nodesFocusable
		edgesFocusable
		nodeExtent={[
			[0, 0],
			[PUBLIC_ATLAS_FLOW_SIZE.width, PUBLIC_ATLAS_FLOW_SIZE.height]
		]}
		translateExtent={[
			[-120, -120],
			[PUBLIC_ATLAS_FLOW_SIZE.width + 120, PUBLIC_ATLAS_FLOW_SIZE.height + 120]
		]}
		{proOptions}
		aria-label="Atlas workflow map"
		onnodeclick={handleNodeClick}
		onnodedragstop={handleNodeDragStop}
		onselectionchange={handleSelectionChange}
	>
		<Controls showLock={false} />
		<Background gap={32} patternColor="#eeeee8" />
	</SvelteFlow>
</div>
