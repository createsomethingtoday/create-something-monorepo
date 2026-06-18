import '@xyflow/react/dist/style.css';
import './PublicAtlasFlow.css';

import {
	Background,
	BackgroundVariant,
	Controls,
	Handle,
	MarkerType,
	Panel,
	Position,
	ReactFlow,
	ReactFlowProvider,
	applyNodeChanges,
	type Connection,
	type Edge,
	type Node,
	type NodeChange,
	type NodeMouseHandler,
	type NodeProps
} from '@xyflow/react';
import { memo, useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
	layoutPublicAtlasNodes,
	publicAtlasNodeWidth,
	type PublicAtlasCanvas,
	type PublicAtlasNode,
	type PublicAtlasNodeKind,
	type PublicAtlasNodeStatus
} from '$lib/atlas/public';

type PublicAtlasNodeData = {
	node: PublicAtlasNode;
};

type PublicAtlasFlowNode = Node<PublicAtlasNodeData, 'publicAtlas'>;

export type PublicAtlasFlowProps = {
	canvas: PublicAtlasCanvas;
	selectedNodeId: string;
	onConnectNodes: (sourceId: string, targetId: string) => void;
	onMoveNode: (nodeId: string, position: { x: number; y: number }) => void;
	onSelectNode: (nodeId: string) => void;
};

export type PublicAtlasFlowController = {
	destroy: () => void;
	update: (props: PublicAtlasFlowProps) => void;
};

const DEFAULT_EDGE_OPTIONS = {
	type: 'smoothstep',
	markerEnd: {
		type: MarkerType.ArrowClosed,
		color: '#a7a7a0',
		width: 13,
		height: 13
	},
	interactionWidth: 18,
	style: {
		stroke: '#a7a7a0',
		strokeWidth: 1.05
	}
} satisfies Partial<Edge>;

const FIT_VIEW_OPTIONS = {
	duration: 260,
	maxZoom: 1.05,
	padding: 0.24
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

function toFlowNodes(canvas: PublicAtlasCanvas, selectedNodeId: string): PublicAtlasFlowNode[] {
	return layoutPublicAtlasNodes(canvas.nodes).map((node) => ({
		id: node.id,
		type: 'publicAtlas',
		position: {
			x: node.x ?? 0,
			y: node.y ?? 0
		},
		data: { node },
		selected: node.id === selectedNodeId,
		style: {
			width: publicAtlasNodeWidth(node)
		}
	}));
}

function toFlowEdges(canvas: PublicAtlasCanvas): Edge[] {
	return canvas.edges.map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		label: edge.label,
		labelBgPadding: [7, 4],
		labelBgBorderRadius: 5,
		labelBgStyle: { fill: '#fbfbf8', fillOpacity: 0.92 },
		labelStyle: {
			fill: '#6f6f67',
			fontSize: 11,
			fontWeight: 600
		},
		...DEFAULT_EDGE_OPTIONS
	}));
}

const PublicAtlasFlowNodeView = memo(function PublicAtlasFlowNodeView({
	data,
	selected
}: NodeProps<PublicAtlasFlowNode>): ReactElement {
	const node = data.node;
	const owner = node.owner || node.createdBy;
	const notes = node.notes || 'Describe the boundary, handoff, evidence, or next decision.';

	return (
		<article
			className={`public-atlas-flow-node kind-${node.kind} status-${node.status} ${
				selected ? 'selected' : ''
			}`}
		>
			<Handle className="target" position={Position.Left} type="target" />
			<Handle className="source" position={Position.Right} type="source" />
			<header>
				<span className="kind">{KIND_LABELS[node.kind]}</span>
				<span className="status">{STATUS_LABELS[node.status]}</span>
			</header>
			<strong>{node.label}</strong>
			<span className="owner">{owner}</span>
			<small>{notes}</small>
		</article>
	);
});

const NODE_TYPES = {
	publicAtlas: PublicAtlasFlowNodeView
};

function PublicAtlasFlow({
	canvas,
	onConnectNodes,
	onMoveNode,
	onSelectNode,
	selectedNodeId
}: PublicAtlasFlowProps): ReactElement {
	const [nodes, setNodes] = useState<PublicAtlasFlowNode[]>(() =>
		toFlowNodes(canvas, selectedNodeId)
	);
	const edges = useMemo(() => toFlowEdges(canvas), [canvas]);
	const counts = `${canvas.nodes.length} nodes / ${canvas.edges.length} edges`;

	useEffect(() => {
		setNodes(toFlowNodes(canvas, selectedNodeId));
	}, [canvas, selectedNodeId]);

	const onNodesChange = useCallback((changes: NodeChange<PublicAtlasFlowNode>[]) => {
		setNodes((current) => applyNodeChanges(changes, current));
	}, []);

	const onNodeClick = useCallback<NodeMouseHandler<PublicAtlasFlowNode>>(
		(_, node) => {
			onSelectNode(node.id);
		},
		[onSelectNode]
	);

	const onNodeDragStop = useCallback(
		(_: MouseEvent | TouchEvent, node: PublicAtlasFlowNode) => {
			const original = canvas.nodes.find((item) => item.id === node.id);
			if (!original) return;
			const x = Math.round(node.position.x);
			const y = Math.round(node.position.y);
			if (original.x === x && original.y === y) return;
			onMoveNode(node.id, { x, y });
		},
		[canvas.nodes, onMoveNode]
	);

	const onConnect = useCallback(
		(connection: Connection) => {
			if (!connection.source || !connection.target || connection.source === connection.target) return;
			onConnectNodes(connection.source, connection.target);
		},
		[onConnectNodes]
	);

	return (
		<ReactFlowProvider>
			<ReactFlow
				attributionPosition="bottom-left"
				className="public-atlas-flow"
				colorMode="light"
				defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
				deleteKeyCode={null}
				edges={edges}
				elevateEdgesOnSelect={false}
				fitView
				fitViewOptions={FIT_VIEW_OPTIONS}
				maxZoom={1.8}
				minZoom={0.18}
				nodeClickDistance={6}
				nodeDragThreshold={8}
				nodeTypes={NODE_TYPES}
				nodes={nodes}
				nodesConnectable
				nodesDraggable
				onConnect={onConnect}
				onNodeClick={onNodeClick}
				onNodeDragStop={onNodeDragStop}
				onNodesChange={onNodesChange}
				onlyRenderVisibleElements={nodes.length > 80}
				panOnDrag
				panOnScroll
				panOnScrollSpeed={0.65}
				preventScrolling
				proOptions={{ hideAttribution: true }}
				snapGrid={[12, 12]}
				snapToGrid
				zoomOnDoubleClick={false}
				zoomOnPinch
				zoomOnScroll
			>
				<Background
					color="#dcdcd6"
					gap={36}
					lineWidth={0.6}
					variant={BackgroundVariant.Lines}
				/>
				<Controls className="public-atlas-controls" showInteractive={false} />
				<Panel className="public-atlas-kicker" position="top-left">
					<strong>Workflow map</strong>
					<small>{counts}</small>
				</Panel>
				<Panel className="public-atlas-legend" position="top-right">
					<span className="run">Run</span>
					<span className="wait">Wait</span>
					<span className="stop">Stop</span>
				</Panel>
			</ReactFlow>
		</ReactFlowProvider>
	);
}

export function mountPublicAtlasFlow(
	element: HTMLElement,
	props: PublicAtlasFlowProps
): PublicAtlasFlowController {
	let root: Root | undefined = createRoot(element);

	function render(nextProps: PublicAtlasFlowProps): void {
		root?.render(<PublicAtlasFlow {...nextProps} />);
	}

	render(props);

	return {
		destroy: () => {
			root?.unmount();
			root = undefined;
		},
		update: render
	};
}
