<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		PUBLIC_SUBSTRATE_CANVAS_ACTIVE_NODE_IDS,
		PUBLIC_SUBSTRATE_CANVAS_MOBILE_PROJECTION,
		PUBLIC_SUBSTRATE_CANVAS_PALETTE,
		PUBLIC_SUBSTRATE_CANVAS_PROJECTION,
		publicSubstrateCanvasDetail
	} from '$lib/atlas/public-substrate-canvas';
	import type {
		CanvasKernelFocusRequest,
		CanvasKernelRenderBackend,
		CanvasKernelViewport
	} from '@create-something/canvas-kernel';

	type ReactRoot = {
		render(element: unknown): void;
		unmount(): void;
	};

	type ReactCreateElement = (type: unknown, props: Record<string, unknown>) => unknown;

	let canvasMount: HTMLDivElement;
	let root: ReactRoot | null = null;
	let createElement: ReactCreateElement | null = null;
	let CanvasKernelComponent: unknown = null;
	let removeCompactCanvasListener: (() => void) | null = null;
	let selectedNodeId: string | null = 'agency_canvas';
	let fitRequest = 0;
	let focusRequest: CanvasKernelFocusRequest = null;
	let isCompactCanvas = false;
	let viewport: CanvasKernelViewport = { x: 0, y: 0, zoom: 1 };
	let renderBackend: CanvasKernelRenderBackend = 'unavailable';

	$: selectedDetail = publicSubstrateCanvasDetail(selectedNodeId);
	$: projection = isCompactCanvas
		? PUBLIC_SUBSTRATE_CANVAS_MOBILE_PROJECTION
		: PUBLIC_SUBSTRATE_CANVAS_PROJECTION;
	$: nodeCount = projection.nodes.length;
	$: edgeCount = projection.edges.length;
	$: renderKernel();

	function requestFit() {
		fitRequest += 1;
		focusRequest = null;
	}

	function focusNode(nodeId: string) {
		selectedNodeId = nodeId;
		focusRequest = { nodeId, requestId: Date.now() };
	}

	function renderKernel() {
		if (!root || !createElement || !CanvasKernelComponent) return;
		root.render(
			createElement(CanvasKernelComponent, {
				activeNodeIds: PUBLIC_SUBSTRATE_CANVAS_ACTIVE_NODE_IDS,
				ariaLabel: 'CREATE SOMETHING public Substrate canvas',
				fitRequest,
				focusRequest,
				onNodeSelect: (nodeId: string) => {
					selectedNodeId = nodeId;
				},
				onPaneClick: () => {
					selectedNodeId = 'agency_canvas';
				},
				onViewportChange: (nextViewport: CanvasKernelViewport) => {
					viewport = nextViewport;
					renderBackend =
						document
							.querySelector('[data-public-substrate-canvas] [data-render-backend]')
							?.getAttribute('data-render-backend') === 'webgpu'
							? 'webgpu'
							: 'canvas-2d';
				},
				palette: PUBLIC_SUBSTRATE_CANVAS_PALETTE,
				projection,
				selectedNodeId
			})
		);
	}

	onMount(async () => {
		const compactQuery = window.matchMedia('(max-width: 680px)');
		const updateCompactCanvas = (matches: boolean) => {
			if (isCompactCanvas === matches) return;
			isCompactCanvas = matches;
			fitRequest += 1;
		};
		const handleCompactChange = (event: MediaQueryListEvent) => {
			updateCompactCanvas(event.matches);
		};
		updateCompactCanvas(compactQuery.matches);
		compactQuery.addEventListener('change', handleCompactChange);
		removeCompactCanvasListener = () => {
			compactQuery.removeEventListener('change', handleCompactChange);
		};

		const [react, reactDom, kernel] = await Promise.all([
			import('react'),
			import('react-dom/client'),
			import('@create-something/canvas-kernel')
		]);
		createElement = react.createElement as ReactCreateElement;
		CanvasKernelComponent = kernel.CanvasKernel;
		root = reactDom.createRoot(canvasMount) as ReactRoot;
		renderKernel();
	});

	onDestroy(() => {
		removeCompactCanvasListener?.();
		removeCompactCanvasListener = null;
		root?.unmount();
		root = null;
	});
</script>

<section class="public-substrate-canvas" data-public-substrate-canvas aria-labelledby="substrate-canvas-title">
	<div class="public-substrate-canvas__chrome">
		<div>
			<p class="public-substrate-canvas__eyebrow">Signal / Decision / Proof</p>
			<h3 id="substrate-canvas-title">The canvas is the proof object.</h3>
			<p>
				The public site renders the same Substrate canvas kernel used by Atlas and Topology:
				source records, agent lanes, approval stops, delivery paths, and receipts in one
				inspectable operating surface.
			</p>
		</div>
		<div class="public-substrate-canvas__meta" aria-label="Canvas metadata">
			<span>{nodeCount} nodes</span>
			<span>{edgeCount} edges</span>
			<span class="public-substrate-canvas__backend" aria-label={`Renderer ${renderBackend}`}>
				shared kernel
			</span>
		</div>
	</div>

	<div class="public-substrate-canvas__surface">
		<div class="public-substrate-canvas__viewport" bind:this={canvasMount}></div>
		<aside class="public-substrate-canvas__inspector" aria-live="polite">
			<span class="public-substrate-canvas__kicker">{selectedDetail.kicker}</span>
			<h4>{selectedDetail.label}</h4>
			<p>{selectedDetail.body}</p>
			<dl>
				<div>
					<dt>State</dt>
					<dd data-status={selectedDetail.status}>{selectedDetail.status}</dd>
				</div>
				<div>
					<dt>Receipt</dt>
					<dd>{selectedDetail.proof}</dd>
				</div>
				<div>
					<dt>View</dt>
					<dd>{Math.round(viewport.zoom * 100)}%</dd>
				</div>
			</dl>
			<div class="public-substrate-canvas__actions">
				<button type="button" on:click={requestFit}>Fit map</button>
				<button type="button" on:click={() => focusNode('receipt_graph')}>Show receipts</button>
			</div>
		</aside>
	</div>
</section>

<style>
	.public-substrate-canvas {
		border: 1px solid rgba(10, 14, 25, 0.12);
		background:
			linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3rem 3rem,
			linear-gradient(180deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3rem 3rem,
			linear-gradient(180deg, #fbfbf4 0%, #ffffff 100%);
		box-shadow: 0 24px 60px rgba(10, 14, 25, 0.08);
		color: var(--color-clear-onyx, #0a0e19);
		overflow: hidden;
	}

	.public-substrate-canvas__chrome {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1.5rem;
		align-items: start;
		border-bottom: 1px solid rgba(10, 14, 25, 0.1);
		padding: clamp(1.1rem, 2vw, 1.55rem);
		background:
			linear-gradient(90deg, rgba(10, 14, 25, 0.92) 0 0.22rem, transparent 0.22rem),
			rgba(255, 255, 255, 0.82);
	}

	.public-substrate-canvas__eyebrow,
	.public-substrate-canvas__kicker {
		margin: 0 0 0.45rem;
		color: rgba(10, 14, 25, 0.58);
		font-size: 0.72rem;
		font-weight: 760;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.public-substrate-canvas h3,
	.public-substrate-canvas h4,
	.public-substrate-canvas p {
		margin: 0;
	}

	.public-substrate-canvas h3 {
		max-width: 17ch;
		font-size: clamp(1.65rem, 3vw, 2.45rem);
		line-height: 1.02;
	}

	.public-substrate-canvas h3 + p {
		max-width: 58rem;
		margin-top: 0.72rem;
		color: rgba(10, 14, 25, 0.7);
		font-size: 0.98rem;
		line-height: 1.58;
	}

	.public-substrate-canvas__meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.45rem;
		min-width: 12rem;
	}

	.public-substrate-canvas__meta span {
		border: 1px solid rgba(10, 14, 25, 0.12);
		background: rgba(255, 255, 255, 0.82);
		padding: 0.42rem 0.58rem;
		font-size: 0.75rem;
		font-weight: 720;
		line-height: 1;
	}

	.public-substrate-canvas__backend {
		color: rgba(10, 14, 25, 0.58);
	}

	.public-substrate-canvas__surface {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.28fr);
		min-height: clamp(28rem, 62vh, 44rem);
	}

	.public-substrate-canvas__viewport {
		min-height: inherit;
	}

	.public-substrate-canvas__inspector {
		display: flex;
		flex-direction: column;
		gap: 0.92rem;
		border-left: 1px solid rgba(10, 14, 25, 0.1);
		background:
			linear-gradient(180deg, rgba(10, 14, 25, 0.035) 0, transparent 12rem),
			rgba(255, 255, 255, 0.9);
		padding: clamp(1.1rem, 2vw, 1.55rem);
	}

	.public-substrate-canvas__inspector h4 {
		font-size: 1.2rem;
		line-height: 1.12;
	}

	.public-substrate-canvas__inspector p {
		color: rgba(10, 14, 25, 0.72);
		font-size: 0.94rem;
		line-height: 1.55;
	}

	.public-substrate-canvas__inspector dl {
		display: grid;
		gap: 0.7rem;
		margin: 0;
		padding-top: 0.25rem;
	}

	.public-substrate-canvas__inspector dl div {
		display: grid;
		gap: 0.25rem;
		border-top: 1px solid rgba(10, 14, 25, 0.1);
		padding-top: 0.7rem;
	}

	.public-substrate-canvas__inspector dt {
		color: rgba(10, 14, 25, 0.48);
		font-size: 0.72rem;
		font-weight: 760;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.public-substrate-canvas__inspector dd {
		margin: 0;
		color: rgba(10, 14, 25, 0.82);
		font-size: 0.86rem;
		font-weight: 650;
		line-height: 1.42;
	}

	.public-substrate-canvas__inspector dd[data-status='run'] {
		color: #254332;
	}

	.public-substrate-canvas__inspector dd[data-status='wait'] {
		color: #153d7a;
	}

	.public-substrate-canvas__inspector dd[data-status='stop'] {
		color: #a12b36;
	}

	.public-substrate-canvas__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		margin-top: auto;
	}

	.public-substrate-canvas__actions button {
		border: 1px solid rgba(10, 14, 25, 0.16);
		background: #0a0e19;
		color: #fff;
		cursor: pointer;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 720;
		padding: 0.68rem 0.9rem;
	}

	.public-substrate-canvas__actions button + button {
		background: #fff;
		color: #0a0e19;
	}

	.public-substrate-canvas__actions button:focus-visible {
		outline: 2px solid rgba(10, 14, 25, 0.76);
		outline-offset: 2px;
	}

	:global(.public-substrate-canvas .fast-topology-canvas) {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: inherit;
		overflow: hidden;
		touch-action: none;
		user-select: none;
	}

	:global(.public-substrate-canvas .fast-topology-canvas canvas) {
		display: block;
		width: 100%;
		height: 100%;
	}

	:global(.public-substrate-canvas .fast-topology-labels) {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	:global(.public-substrate-canvas .fast-node-label) {
		position: absolute;
		overflow: hidden;
		border: 1px solid rgba(10, 14, 25, 0.13);
		background: rgba(255, 255, 255, 0.9);
		box-shadow: 0 8px 22px rgba(10, 14, 25, 0.06);
		color: rgba(10, 14, 25, 0.86);
		font-size: 0.72rem;
		font-weight: 760;
		line-height: 1.15;
		padding: 0.44rem 0.5rem 0.44rem 0.72rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.public-substrate-canvas .fast-node-label.selected),
	:global(.public-substrate-canvas .fast-node-label.active) {
		border-color: rgba(10, 14, 25, 0.3);
		background: #fff;
	}

	@media (max-width: 880px) {
		.public-substrate-canvas__chrome,
		.public-substrate-canvas__surface {
			grid-template-columns: 1fr;
		}

		.public-substrate-canvas__meta {
			justify-content: flex-start;
		}

		.public-substrate-canvas__surface {
			min-height: auto;
		}

		.public-substrate-canvas__viewport {
			min-height: 24rem;
		}

		.public-substrate-canvas__inspector {
			border-top: 1px solid rgba(10, 14, 25, 0.1);
			border-left: 0;
		}
	}

	@media (max-width: 680px) {
		.public-substrate-canvas {
			margin-inline: -0.5rem;
			box-shadow: 0 18px 42px rgba(10, 14, 25, 0.08);
		}

		.public-substrate-canvas__chrome {
			gap: 1rem;
			padding: 1rem;
		}

		.public-substrate-canvas h3 {
			max-width: 15ch;
			font-size: clamp(1.38rem, 8vw, 1.95rem);
		}

		.public-substrate-canvas h3 + p {
			font-size: 0.9rem;
			line-height: 1.48;
		}

		.public-substrate-canvas__meta {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			min-width: 0;
			width: 100%;
		}

		.public-substrate-canvas__meta span {
			text-align: center;
		}

		.public-substrate-canvas__backend {
			display: none;
		}

		.public-substrate-canvas__viewport {
			min-height: clamp(21rem, 54vh, 28rem);
		}

		.public-substrate-canvas__inspector {
			gap: 0.75rem;
			padding: 1rem;
		}

		.public-substrate-canvas__inspector dl {
			gap: 0.55rem;
		}

		.public-substrate-canvas__actions {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.public-substrate-canvas__actions button {
			min-height: 2.75rem;
			padding-inline: 0.7rem;
		}

		:global(.public-substrate-canvas .fast-node-label) {
			font-size: 0.68rem;
			padding: 0.38rem 0.44rem 0.38rem 0.58rem;
		}
	}
</style>
