<script lang="ts">
	import '@xyflow/svelte/dist/style.css';
	import './AtlasFlow.css';
	import {
		Background,
		Controls,
		MarkerType,
		SvelteFlow,
		type Edge,
		type Node,
		type OnSelectionChange,
		type ProOptions,
		type Viewport
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
		focusState: 'focused' | 'dimmed' | 'neutral';
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

	const controlsFitViewOptions = {
		padding: 0.12,
		minZoom: 0.2,
		maxZoom: 1
	};

	const noopMoveNode = () => {};
	const noopSelectNode = () => {};

	export let canvas: PublicAtlasCanvas;
	export let selectedNodeId: string;
	export let flowId = 'public-atlas-flow';
	export let ariaLabel = 'Atlas workflow map';
	export let contextLabel = 'Editable workflow';
	export let onMoveNode: (nodeId: string, position: { x: number; y: number }) => void = noopMoveNode;
	export let onSelectNode: (nodeId: string) => void = noopSelectNode;
	export let readOnly = false;
	export let showControls = true;
	export let focusedNodeIds: string[] = [];
	export let focusedEdgeIds: string[] = [];
	export let dimUnfocused = false;
	export let initialViewport: Viewport = {
		x: 0,
		y: 0,
		zoom: 1
	};
	export let minZoom = 0.2;
	export let maxZoom = 1.45;
	export let fitView = false;
	export let fitViewOptions = controlsFitViewOptions;

	$: focusedNodeSet = new Set(focusedNodeIds);
	$: focusedEdgeSet = new Set(focusedEdgeIds);
	$: hasFocus = dimUnfocused && (focusedNodeSet.size > 0 || focusedEdgeSet.size > 0);
	$: flowNodes = layoutPublicAtlasNodes(canvas.nodes).map((node) => {
		const width = publicAtlasNodeWidth(node);
		const isFocused = focusedNodeSet.has(node.id);
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
				statusLabel: STATUS_LABELS[node.status],
				focusState: !hasFocus ? 'neutral' : isFocused ? 'focused' : 'dimmed'
			}
		} satisfies Node<AtlasFlowNodeData, 'atlas'>;
	});
	$: flowEdges = canvas.edges.map((edge) => {
		const nodeFocused = focusedNodeSet.has(edge.source) || focusedNodeSet.has(edge.target);
		const edgeFocused = focusedEdgeSet.has(edge.id) || nodeFocused;
		const opacity = hasFocus && !edgeFocused ? 0.18 : 1;
		const color = hasFocus && edgeFocused ? '#0a0e19' : '#9f9b90';
		return {
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
				color
			},
			style: `stroke: ${color}; stroke-width: ${edgeFocused ? 1.8 : 1.35}; opacity: ${opacity};`,
			labelStyle: `fill: #6f6f67; font-family: var(--font-performance-topology-label, var(--font-performance-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)); font-size: var(--text-performance-topology-label, 0.72rem); font-variant-numeric: tabular-nums; font-weight: 600; letter-spacing: var(--tracking-performance-topology-label, 0); line-height: var(--leading-performance-topology-label, 1.2); paint-order: stroke; stroke: #fbfbf8; stroke-width: 7px; opacity: ${opacity};`
		};
	}) satisfies Edge[];

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

<div class="public-atlas-flow" aria-label={ariaLabel}>
	<div class="public-atlas-kicker">
		<strong>Workflow map</strong>
		<small>{contextLabel}</small>
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
		{initialViewport}
		{fitView}
		{fitViewOptions}
		{minZoom}
		{maxZoom}
		snapGrid={[8, 8]}
		nodesConnectable={false}
		nodesDraggable={!readOnly}
		panOnDrag
		elementsSelectable={!readOnly}
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
		aria-label={ariaLabel}
		onnodeclick={handleNodeClick}
		onnodedragstop={handleNodeDragStop}
		onselectionchange={handleSelectionChange}
	>
		{#if showControls}
			<Controls showLock={false} {fitViewOptions} />
		{/if}
		<Background gap={32} patternColor="#eeeee8" />
	</SvelteFlow>
</div>
