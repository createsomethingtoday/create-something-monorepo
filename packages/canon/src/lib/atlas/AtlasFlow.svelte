<script lang="ts">
	import './AtlasFlow.css';
	import {
		PUBLIC_ATLAS_FLOW_SIZE,
		layoutPublicAtlasNodes,
		publicAtlasNodeWidth,
		type PublicAtlasCanvas,
		type PublicAtlasNode,
		type PublicAtlasNodeKind,
		type PublicAtlasNodeStatus
	} from './headless.js';

	type PositionedNode = PublicAtlasNode & {
		x: number;
		y: number;
		width: number;
	};

	type DragState = {
		nodeId: string;
		pointerId: number;
		startClientX: number;
		startClientY: number;
		startX: number;
		startY: number;
		x: number;
		y: number;
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

	export let canvas: PublicAtlasCanvas;
	export let selectedNodeId: string;
	export let flowId = 'public-atlas-flow';
	export let onMoveNode: (nodeId: string, position: { x: number; y: number }) => void;
	export let onSelectNode: (nodeId: string) => void;

	let dragState: DragState | undefined;

	$: positionedNodes = layoutPublicAtlasNodes(canvas.nodes).map((node) => ({
		...node,
		width: publicAtlasNodeWidth(node)
	})) as PositionedNode[];
	$: nodeById = new Map(positionedNodes.map((node) => [node.id, node]));
	$: counts = `${canvas.nodes.length} nodes / ${canvas.edges.length} edges`;
	$: arrowId = `${flowId}-arrow`;
	$: edgeLines = canvas.edges.flatMap((edge) => {
		const source = nodeById.get(edge.source);
		const target = nodeById.get(edge.target);
		if (!source || !target) return [];
		return [
			{
				...edge,
				x1: source.x + source.width,
				y1: source.y + 58,
				x2: target.x,
				y2: target.y + 58,
				labelX: (source.x + source.width + target.x) / 2,
				labelY: (source.y + target.y) / 2 + 58
			}
		];
	});

	function nodePosition(node: PositionedNode): { x: number; y: number } {
		if (dragState?.nodeId !== node.id) return { x: node.x, y: node.y };
		return { x: dragState.x, y: dragState.y };
	}

	function clampPosition(node: PositionedNode, x: number, y: number): { x: number; y: number } {
		return {
			x: Math.max(0, Math.min(PUBLIC_ATLAS_FLOW_SIZE.width - node.width, Math.round(x))),
			y: Math.max(0, Math.min(PUBLIC_ATLAS_FLOW_SIZE.height - 124, Math.round(y)))
		};
	}

	function handlePointerDown(event: PointerEvent, node: PositionedNode) {
		if (event.button !== 0) return;
		const position = nodePosition(node);
		onSelectNode(node.id);
		dragState = {
			nodeId: node.id,
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startX: position.x,
			startY: position.y,
			x: position.x,
			y: position.y
		};
		event.currentTarget instanceof HTMLElement &&
			event.currentTarget.setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent, node: PositionedNode) {
		if (!dragState || dragState.nodeId !== node.id || dragState.pointerId !== event.pointerId) return;
		const next = clampPosition(
			node,
			dragState.startX + event.clientX - dragState.startClientX,
			dragState.startY + event.clientY - dragState.startClientY
		);
		dragState = { ...dragState, ...next };
	}

	function handlePointerUp(event: PointerEvent, node: PositionedNode) {
		if (!dragState || dragState.nodeId !== node.id || dragState.pointerId !== event.pointerId) return;
		const next = { x: dragState.x, y: dragState.y };
		dragState = undefined;
		onMoveNode(node.id, next);
	}
</script>

<div class="public-atlas-flow" role="application" aria-label="Svelte Atlas workflow map">
	<div class="public-atlas-kicker">
		<strong>Workflow map</strong>
		<small>{counts}</small>
	</div>
	<div class="public-atlas-legend">
		<span class="run">Run</span>
		<span class="wait">Wait</span>
		<span class="stop">Stop</span>
	</div>

	<div class="public-atlas-flow__surface">
		<svg
			class="public-atlas-flow__edges"
			viewBox={`0 0 ${PUBLIC_ATLAS_FLOW_SIZE.width} ${PUBLIC_ATLAS_FLOW_SIZE.height}`}
			aria-hidden="true"
		>
			<defs>
				<marker
					id={arrowId}
					markerHeight="9"
					markerWidth="9"
					orient="auto"
					refX="8"
					refY="4.5"
				>
					<path d="M0,0 L9,4.5 L0,9 Z" />
				</marker>
			</defs>
			{#each edgeLines as edge}
				<path
					d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + 56} ${edge.y1}, ${edge.x2 - 56} ${edge.y2}, ${edge.x2} ${edge.y2}`}
					marker-end={`url(#${arrowId})`}
				/>
				{#if edge.label}
					<text x={edge.labelX} y={edge.labelY}>{edge.label}</text>
				{/if}
			{/each}
		</svg>

		{#each positionedNodes as node (node.id)}
			{@const position = nodePosition(node)}
			<button
				type="button"
				class={`public-atlas-flow-node kind-${node.kind} status-${node.status}`}
				class:selected={node.id === selectedNodeId}
				style={`left: ${position.x}px; top: ${position.y}px; width: ${node.width}px;`}
				onclick={() => onSelectNode(node.id)}
				onpointerdown={(event) => handlePointerDown(event, node)}
				onpointermove={(event) => handlePointerMove(event, node)}
				onpointerup={(event) => handlePointerUp(event, node)}
				onpointercancel={(event) => handlePointerUp(event, node)}
			>
				<span class="target" aria-hidden="true"></span>
				<span class="source" aria-hidden="true"></span>
				<header>
					<span class="kind">{KIND_LABELS[node.kind]}</span>
					<span class="status">{STATUS_LABELS[node.status]}</span>
				</header>
				<strong>{node.label}</strong>
				<span class="owner">{node.owner || node.createdBy}</span>
				<small>{node.notes || 'Describe the boundary, handoff, evidence, or next decision.'}</small>
			</button>
		{/each}
	</div>
</div>
