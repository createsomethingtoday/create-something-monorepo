<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		CanvasKernelEmphasis,
		CanvasKernelFocusRequest,
		CanvasKernelPalette,
		CanvasKernelProjection,
		CanvasKernelViewport
	} from '@create-something/canvas-kernel';
	import {
		layoutPublicAtlasNodes,
		publicAtlasNodeWidth,
		type PublicAtlasCanvas,
		type PublicAtlasNodeKind,
		type PublicAtlasNodeStatus
	} from './headless.js';
	import './AtlasFlow.css';

	type ReactCreateElement = typeof import('react').createElement;
	type ReactRoot = import('react-dom/client').Root;
	type CanvasKernelComponent = typeof import('@create-something/canvas-kernel').CanvasKernel;

	type Viewport = {
		x: number;
		y: number;
		zoom: number;
	};

	const noopMoveNode = () => {};
	const noopSelectNode = () => {};
	const NODE_HEIGHT = 118;

	const KIND_STRIPE: Record<PublicAtlasNodeKind, [number, number, number, number]> = {
		actor: [0.07, 0.08, 0.11, 0.5],
		ai: [0.18, 0.28, 0.22, 0.42],
		constraint: [0.77, 0.12, 0.23, 0.46],
		data: [0.49, 0.49, 0.46, 0.42],
		human: [0.0, 0.28, 1, 0.34],
		system: [0.18, 0.19, 0.2, 0.42],
		touchpoint: [0.36, 0.29, 0.42, 0.36]
	};

	const STATUS_RING: Record<PublicAtlasNodeStatus, [number, number, number, number]> = {
		run: [0.12, 0.24, 0.18, 0.3],
		stop: [0.77, 0.12, 0.23, 0.38],
		unknown: [0.07, 0.08, 0.11, 0.24],
		wait: [0.0, 0.28, 1, 0.26]
	};

	const PALETTE: CanvasKernelPalette = {
		activeRing: [0.0, 0.28, 1, 0.32],
		edge: [0.12, 0.13, 0.15, 0.15],
		kindStripe: KIND_STRIPE,
		nodeBorder: [0.07, 0.08, 0.11, 0.24],
		nodeFace: [0.992, 0.992, 0.972, 0.96],
		nodeFaceSelected: [1, 1, 0.992, 0.99],
		selectedRing: [0.0, 0.28, 1, 0.72],
		statusRing: STATUS_RING
	};

	export let canvas: PublicAtlasCanvas;
	export let selectedNodeId: string;
	export let flowId = 'public-atlas-flow';
	export let onMoveNode: (nodeId: string, position: { x: number; y: number }) => void = noopMoveNode;
	export let onSelectNode: (nodeId: string) => void = noopSelectNode;
	export let readOnly = false;
	export let showControls = true;
	export let focusedNodeIds: string[] = [];
	export let focusedEdgeIds: string[] = [];
	export let dimUnfocused = false;
	export let initialViewport: Viewport = { x: 0, y: 0, zoom: 1 };
	export let minZoom = 0.7;
	export let maxZoom = 1.45;

	let viewportElement: HTMLDivElement;
	let root: ReactRoot | null = null;
	let createElement: ReactCreateElement | null = null;
	let CanvasKernel: CanvasKernelComponent | null = null;
	let fitRequest = 0;
	let viewport: CanvasKernelViewport = initialViewport;
	let renderBackend = 'unavailable';

	$: counts = `${canvas.nodes.length} nodes / ${canvas.edges.length} edges`;
	$: projection = toProjection(canvas);
	$: activeNodeIds = new Set(
		canvas.nodes
			.filter((node) => node.status === 'run' || node.kind === 'touchpoint' || node.id === selectedNodeId)
			.map((node) => node.id)
	);
	$: emphasis = (dimUnfocused
		? {
				dimUnfocused: true,
				edgeIds: new Set(focusedEdgeIds),
				nodeIds: new Set(focusedNodeIds)
			}
		: undefined) satisfies CanvasKernelEmphasis | undefined;
	$: focusRequest = null satisfies CanvasKernelFocusRequest;
	$: renderKey = `${flowId}:${canvas.id}:${canvas.updatedAt}:${selectedNodeId}:${fitRequest}:${focusedNodeIds.join(',')}:${focusedEdgeIds.join(',')}:${dimUnfocused}`;
	$: if (root && createElement && CanvasKernel && renderKey) renderKernel();

	function toProjection(source: PublicAtlasCanvas): CanvasKernelProjection {
		const nodes = layoutPublicAtlasNodes(source.nodes).map((node) => ({
			height: NODE_HEIGHT,
			id: node.id,
			kind: node.kind,
			label: node.label,
			status: node.status,
			width: node.width ?? publicAtlasNodeWidth(node),
			x: node.x ?? 0,
			y: node.y ?? 0
		}));
		const nodeIds = new Set(nodes.map((node) => node.id));
		const edges = source.edges
			.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
			.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));
		return { edges, nodes };
	}

	function readRenderBackend(): string {
		return viewportElement
			?.querySelector('[data-render-backend]')
			?.getAttribute('data-render-backend') ?? 'unavailable';
	}

	function handleViewportChange(next: CanvasKernelViewport): void {
		viewport = next;
		queueMicrotask(() => (renderBackend = readRenderBackend()));
	}

	function renderKernel(): void {
		if (!root || !createElement || !CanvasKernel) return;
		root.render(
			createElement(CanvasKernel, {
				activeNodeIds,
				ariaLabel: 'Atlas workflow map',
				emphasis,
				fitRequest,
				focusRequest,
				onNodeSelect: readOnly ? noopSelectNode : (nodeId: string) => onSelectNode(nodeId),
				onPaneClick: () => undefined,
				onViewportChange: handleViewportChange,
				palette: PALETTE,
				projection,
				selectedNodeId
			})
		);
	}

	function fitMap(): void {
		fitRequest += 1;
	}

	onMount(() => {
		let disposed = false;
		const observer = new MutationObserver(() => (renderBackend = readRenderBackend()));
		observer.observe(viewportElement, { attributes: true, subtree: true });
		void Promise.all([
			import('react'),
			import('react-dom/client'),
			import('@create-something/canvas-kernel')
		]).then(([react, reactDom, canvasKernel]) => {
			if (disposed) return;
			createElement = react.createElement;
			CanvasKernel = canvasKernel.CanvasKernel;
			root = reactDom.createRoot(viewportElement);
			renderKernel();
		});

		return () => {
			disposed = true;
			observer.disconnect();
			root?.unmount();
			root = null;
		};
	});
</script>

<div
	class="public-atlas-flow"
	data-flow-id={flowId}
	data-read-only={readOnly}
	data-min-zoom={minZoom}
	data-max-zoom={maxZoom}
	data-move-handler={onMoveNode ? 'provided' : 'none'}
	aria-label="Atlas workflow map"
>
	<div class="public-atlas-kicker">
		<strong>Workflow map</strong>
		<small>{counts}</small>
	</div>
	<div class="public-atlas-legend">
		<span class="run">Run</span>
		<span class="wait">Wait</span>
		<span class="stop">Stop</span>
	</div>
	{#if showControls}
		<button type="button" class="public-atlas-fit" onclick={fitMap}>Fit</button>
	{/if}
	<div class="public-atlas-kernel" bind:this={viewportElement}></div>
	<span class="sr-only">
		Renderer {renderBackend}. Viewport {Math.round(viewport.x)}, {Math.round(viewport.y)}, {viewport.zoom.toFixed(2)}.
	</span>
</div>
