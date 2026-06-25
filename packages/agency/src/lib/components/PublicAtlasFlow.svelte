<script lang="ts">
	import '@xyflow/svelte/dist/style.css';
	import './PublicAtlasFlow.css';

	import {
		Background,
		BackgroundVariant,
		Controls,
		MarkerType,
		Panel,
		SvelteFlow,
		type Connection,
		type Edge,
		type Node,
		type NodeTypes
	} from '@xyflow/svelte';
	import {
		layoutPublicAtlasNodes,
		publicAtlasNodeWidth,
		type PublicAtlasCanvas,
		type PublicAtlasNode
	} from '$lib/atlas/public';
	import PublicAtlasFlowNode from '$lib/components/PublicAtlasFlowNode.svelte';

	type PublicAtlasNodeData = {
		node: PublicAtlasNode;
	};
	type PublicAtlasFlowNodeModel = Node<PublicAtlasNodeData, 'publicAtlas'>;
	type PublicAtlasFlowEdge = Edge<Record<string, unknown>, 'smoothstep'>;

	export let canvas: PublicAtlasCanvas;
	export let selectedNodeId = '';
	export let readOnly = false;
	export let showPanels = true;
	export let onConnectNodes: (sourceId: string, targetId: string) => void = () => {};
	export let onMoveNode: (nodeId: string, position: { x: number; y: number }) => void = () => {};
	export let onSelectNode: (nodeId: string) => void = () => {};

	const nodeTypes = {
		publicAtlas: PublicAtlasFlowNode
	} satisfies NodeTypes;

	const DEFAULT_EDGE_OPTIONS = {
		type: 'smoothstep',
		markerEnd: {
			type: MarkerType.ArrowClosed,
			color: '#a7a7a0',
			width: 13,
			height: 13
		},
		interactionWidth: 18,
		style: 'stroke: #a7a7a0; stroke-width: 1.05;'
	} satisfies Partial<PublicAtlasFlowEdge>;

	const FIT_VIEW_OPTIONS = {
		duration: 260,
		maxZoom: 1.05,
		padding: 0.24
	};

	let nodes: PublicAtlasFlowNodeModel[] = [];
	let edges: PublicAtlasFlowEdge[] = [];

	$: nodes = toFlowNodes(canvas, selectedNodeId);
	$: edges = toFlowEdges(canvas);
	$: counts = `${canvas.nodes.length} nodes / ${canvas.edges.length} edges`;

	function toFlowNodes(
		inputCanvas: PublicAtlasCanvas,
		activeNodeId: string
	): PublicAtlasFlowNodeModel[] {
		return layoutPublicAtlasNodes(inputCanvas.nodes).map((node) => ({
			id: node.id,
			type: 'publicAtlas',
			position: {
				x: node.x ?? 0,
				y: node.y ?? 0
			},
			data: { node },
			selected: node.id === activeNodeId,
			style: `width: ${publicAtlasNodeWidth(node)}px;`
		}));
	}

	function toFlowEdges(inputCanvas: PublicAtlasCanvas): PublicAtlasFlowEdge[] {
		return inputCanvas.edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			label: edge.label,
			labelStyle: 'fill: #6f6f67; font-size: 11px; font-weight: 600;',
			type: 'smoothstep'
		}));
	}

	function handleNodeClick({ node }: { node: PublicAtlasFlowNodeModel }) {
		onSelectNode(node.id);
	}

	function handleNodeDragStop({ targetNode }: { targetNode: PublicAtlasFlowNodeModel | null }) {
		if (readOnly) return;
		const node = targetNode;
		if (!node) return;
		const original = canvas.nodes.find((item) => item.id === node.id);
		if (!original) return;
		const x = Math.round(node.position.x);
		const y = Math.round(node.position.y);
		if (original.x === x && original.y === y) return;
		onMoveNode(node.id, { x, y });
	}

	function handleConnect(connection: Connection) {
		if (readOnly || !connection.source || !connection.target) return;
		if (connection.source === connection.target) return;
		onConnectNodes(connection.source, connection.target);
	}
</script>

<SvelteFlow
	attributionPosition="bottom-left"
	class="public-atlas-flow"
	colorMode="light"
	defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
	deleteKey={null}
	elevateEdgesOnSelect={false}
	fitView
	fitViewOptions={FIT_VIEW_OPTIONS}
	maxZoom={1.8}
	minZoom={0.18}
	nodeClickDistance={6}
	nodeDragThreshold={8}
	{nodeTypes}
	bind:nodes
	bind:edges
	nodesConnectable={!readOnly}
	nodesDraggable={!readOnly}
	onconnect={handleConnect}
	onnodeclick={handleNodeClick}
	onnodedragstop={handleNodeDragStop}
	onlyRenderVisibleElements={nodes.length > 80}
	panOnDrag
	panOnScroll
	panOnScrollSpeed={0.65}
	preventScrolling
	proOptions={{ hideAttribution: true }}
	snapGrid={[12, 12]}
	zoomOnDoubleClick={false}
	zoomOnPinch
	zoomOnScroll
>
	<Background patternColor="#dcdcd6" gap={36} lineWidth={0.6} variant={BackgroundVariant.Lines} />
	<Controls class="public-atlas-controls" showLock={false} />
	{#if showPanels}
		<Panel class="public-atlas-kicker" position="top-left">
			<strong>{readOnly ? 'Story map' : 'Workflow map'}</strong>
			<small>{counts}</small>
		</Panel>
		<Panel class="public-atlas-legend" position="top-right">
			<span class="run">Run</span>
			<span class="wait">Wait</span>
			<span class="stop">Stop</span>
		</Panel>
	{/if}
</SvelteFlow>
