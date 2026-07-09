<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		CanvasKernelFocusRequest,
		CanvasKernelPalette,
		CanvasKernelProjection,
		CanvasKernelViewport,
		CanvasKernelViewportRequest
	} from '@create-something/canvas-kernel';
	import { canvasKernelViewportForNodes } from '@create-something/canvas-kernel';

	type PublicSubstrateRecord = {
		body: string;
		id: string;
		kicker: string;
		label: string;
		proof: string;
		status: 'run' | 'stop' | 'wait';
	};

	type ReactCreateElement = typeof import('react').createElement;
	type ReactRoot = import('react-dom/client').Root;
	type CanvasKernelComponent = typeof import('@create-something/canvas-kernel').CanvasKernel;

	const PUBLIC_SUBSTRATE_RECORDS: PublicSubstrateRecord[] = [
		{
			id: 'agency_canvas',
			label: 'Atlas map',
			kicker: 'Start here',
			status: 'run',
			body:
				'Atlas gives the operator a visible map before AI gets a lane: object, owner, action, stop condition, and proof.',
			proof: 'operator map - safe sample canvas - no private client records'
		},
		{
			id: 'signal_queue',
			label: 'Signal inbox',
			kicker: 'Signal',
			status: 'run',
			body:
				'Requests, tool events, client context, and exceptions enter as records the team can inspect before work moves.',
			proof: 'source - owner - timestamp - reason'
		},
		{
			id: 'substrate_graph',
			label: 'Substrate record',
			kicker: 'Substrate',
			status: 'run',
			body:
				'Substrate stores the durable workflow object: systems, owners, policy, context, risk, and receipts.',
			proof: 'systems - owners - policy - receipts'
		},
		{
			id: 'agent_queue',
			label: 'Agent lane',
			kicker: 'Run',
			status: 'wait',
			body:
				'AI only receives bounded work with the source context, allowed action, stop condition, and receipt expectation attached.',
			proof: 'allowed action - policy - run receipt'
		},
		{
			id: 'decision_gate',
			label: 'Owner decision',
			kicker: 'Decision',
			status: 'wait',
			body:
				'Ambiguous, sensitive, or high-impact steps wait for the right owner instead of disappearing into automation.',
			proof: 'approval state - reviewer - reason'
		},
		{
			id: 'stop_boundary',
			label: 'Stop point',
			kicker: 'Stop',
			status: 'stop',
			body:
				'The map names what must not run: unclear authority, production writes, sensitive claims, or client-impacting changes without approval.',
			proof: 'blocked state - escalation path - rollback note'
		},
		{
			id: 'client_delivery',
			label: 'Client delivery lane',
			kicker: 'Delivery',
			status: 'run',
			body:
				'Approved work moves through a visible delivery lane, so handoff, deployment, and verification stay attached to the workflow.',
			proof: 'handoff - deployment - verification'
		},
		{
			id: 'receipt_graph',
			label: 'Proof trail',
			kicker: 'Topology proof',
			status: 'run',
			body:
				'Topology keeps the proof trail connected to the affected record, so follow-up agents and humans see the same evidence.',
			proof: 'what changed - who/what acted - observed result'
		}
	];

	const PUBLIC_SUBSTRATE_RECORD_BY_ID = new Map(
		PUBLIC_SUBSTRATE_RECORDS.map((record) => [record.id, record])
	);

	const PUBLIC_SUBSTRATE_GRAPH: CanvasKernelProjection = {
		nodes: [
			{ height: 76, id: 'agency_canvas', kind: 'touchpoint', label: 'Workflow map', status: 'run', width: 246, x: 80, y: 178 },
			{ height: 76, id: 'signal_queue', kind: 'data', label: 'Signal inbox', status: 'run', width: 218, x: 390, y: 76 },
			{ height: 86, id: 'substrate_graph', kind: 'system', label: 'Workflow record', status: 'run', width: 252, x: 680, y: 152 },
			{ height: 76, id: 'agent_queue', kind: 'ai', label: 'Agent lane', status: 'wait', width: 246, x: 1010, y: 70 },
			{ height: 76, id: 'decision_gate', kind: 'human', label: 'Owner decision', status: 'wait', width: 230, x: 1014, y: 252 },
			{ height: 76, id: 'stop_boundary', kind: 'constraint', label: 'Stop point', status: 'stop', width: 228, x: 690, y: 356 },
			{ height: 76, id: 'client_delivery', kind: 'actor', label: 'Client delivery lane', status: 'run', width: 260, x: 1326, y: 162 },
			{ height: 76, id: 'receipt_graph', kind: 'touchpoint', label: 'Proof trail', status: 'run', width: 230, x: 1038, y: 434 }
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

	const PUBLIC_SUBSTRATE_COMPACT_GRAPH: CanvasKernelProjection = {
		nodes: [
			{ height: 54, id: 'agency_canvas', kind: 'touchpoint', label: 'Workflow map', status: 'run', width: 160, x: 22, y: 36 },
			{ height: 54, id: 'signal_queue', kind: 'data', label: 'Signal inbox', status: 'run', width: 160, x: 210, y: 36 },
			{ height: 58, id: 'substrate_graph', kind: 'system', label: 'Workflow record', status: 'run', width: 160, x: 22, y: 124 },
			{ height: 54, id: 'agent_queue', kind: 'ai', label: 'Agent lane', status: 'wait', width: 160, x: 210, y: 124 },
			{ height: 54, id: 'decision_gate', kind: 'human', label: 'Owner decision', status: 'wait', width: 160, x: 22, y: 212 },
			{ height: 54, id: 'stop_boundary', kind: 'constraint', label: 'Stop point', status: 'stop', width: 160, x: 210, y: 212 },
			{ height: 54, id: 'client_delivery', kind: 'actor', label: 'Client delivery lane', status: 'run', width: 160, x: 22, y: 300 },
			{ height: 54, id: 'receipt_graph', kind: 'touchpoint', label: 'Proof trail', status: 'run', width: 160, x: 210, y: 300 }
		],
		edges: PUBLIC_SUBSTRATE_GRAPH.edges
	};

	const ACTIVE_NODE_IDS = new Set(['agency_canvas', 'substrate_graph', 'receipt_graph']);
	const DEFAULT_FIT_PADDING = 84;
	const PUBLIC_OVERVIEW_FIT_PADDING = 180;

	const PUBLIC_SUBSTRATE_PALETTE: CanvasKernelPalette = {
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

	let viewportElement: HTMLDivElement;
	let root: ReactRoot | null = null;
	let createElement: ReactCreateElement | null = null;
	let CanvasKernel: CanvasKernelComponent | null = null;
	let selectedNodeId = 'agency_canvas';
	let fitRequest = 0;
	let fitPadding = DEFAULT_FIT_PADDING;
	let focusRequest: CanvasKernelFocusRequest = null;
	let viewportRequest: CanvasKernelViewportRequest = null;
	let isCompact = false;
	let viewport: CanvasKernelViewport = { x: 0, y: 0, zoom: 1 };
	let renderBackend: 'canvas-2d' | 'unavailable' | 'webgpu' = 'unavailable';
	let viewMode: 'fit' | 'focus' | 'overview' = 'overview';

	$: projection = isCompact ? PUBLIC_SUBSTRATE_COMPACT_GRAPH : PUBLIC_SUBSTRATE_GRAPH;
	$: selectedRecord =
		PUBLIC_SUBSTRATE_RECORD_BY_ID.get(selectedNodeId) ?? PUBLIC_SUBSTRATE_RECORDS[0];
	$: viewLabel =
		viewMode === 'fit'
			? `Fit ${Math.round(viewport.zoom * 100)}%`
			: viewMode === 'focus'
				? `Focus ${Math.round(viewport.zoom * 100)}%`
				: `${Math.round(viewport.zoom * 100)}%`;
	$: backendLabel =
		renderBackend === 'webgpu'
			? 'WebGPU'
			: renderBackend === 'canvas-2d'
				? 'Canvas fallback'
				: 'WebGPU-ready';
	$: renderKey = `${isCompact ? 'compact' : 'wide'}:${selectedNodeId}:${fitRequest}:${fitPadding}:${focusRequest?.nodeId ?? 'none'}:${focusRequest?.requestId ?? 0}:${viewportRequest?.requestId ?? 0}`;
	$: if (root && createElement && CanvasKernel && renderKey) {
		renderKernel();
	}

	function readRenderBackend(): 'canvas-2d' | 'unavailable' | 'webgpu' {
		const value = viewportElement
			?.querySelector('[data-render-backend]')
			?.getAttribute('data-render-backend');
		return value === 'webgpu' || value === 'canvas-2d' ? value : 'unavailable';
	}

	function renderKernel(): void {
		if (!root || !createElement || !CanvasKernel) return;
		root.render(
			createElement(CanvasKernel, {
				activeNodeIds: ACTIVE_NODE_IDS,
				ariaLabel: 'CREATE SOMETHING public workflow map',
				fitPadding,
				fitRequest,
				focusRequest,
				onNodeSelect: (nodeId: string) => {
					selectedNodeId = nodeId;
				},
				onPaneClick: () => {
					selectedNodeId = 'agency_canvas';
				},
				onViewportChange: (next: CanvasKernelViewport) => {
					viewport = next;
					renderBackend = readRenderBackend();
				},
				palette: PUBLIC_SUBSTRATE_PALETTE,
				projection,
				selectedNodeId,
				viewportRequest
			})
		);
	}

	function currentViewportSize(): { height: number; width: number } {
		return {
			height: Math.max(1, viewportElement?.clientHeight ?? 1),
			width: Math.max(1, viewportElement?.clientWidth ?? 1)
		};
	}

	function fitMap(): void {
		viewMode = 'fit';
		fitPadding = DEFAULT_FIT_PADDING;
		focusRequest = null;
		const size = currentViewportSize();
		viewportRequest = {
			requestId: Date.now(),
			viewport: canvasKernelViewportForNodes(projection.nodes, size.width, size.height, {
				fitPadding: DEFAULT_FIT_PADDING
			})
		};
		fitRequest += 1;
	}

	function showOverview(): void {
		viewMode = 'overview';
		selectedNodeId = 'agency_canvas';
		fitPadding = isCompact ? DEFAULT_FIT_PADDING : PUBLIC_OVERVIEW_FIT_PADDING;
		focusRequest = null;
		const size = currentViewportSize();
		viewportRequest = {
			requestId: Date.now(),
			viewport: canvasKernelViewportForNodes(projection.nodes, size.width, size.height, {
				fitPadding
			})
		};
		fitRequest += 1;
	}

	function focusWorkflow(): void {
		viewMode = 'focus';
		selectedNodeId = 'substrate_graph';
		viewportRequest = null;
		focusRequest = { nodeId: 'substrate_graph', requestId: Date.now() };
	}

	function showReceipts(): void {
		viewMode = 'focus';
		selectedNodeId = 'receipt_graph';
		viewportRequest = null;
		focusRequest = { nodeId: 'receipt_graph', requestId: Date.now() };
	}

	onMount(() => {
		let disposed = false;
		const mediaQuery = window.matchMedia('(max-width: 680px)');
		const syncCompact = (matches: boolean) => {
			isCompact = matches;
			viewMode = 'overview';
			fitPadding = matches ? DEFAULT_FIT_PADDING : PUBLIC_OVERVIEW_FIT_PADDING;
			viewportRequest = null;
			fitRequest += 1;
		};
		const onMediaChange = (event: MediaQueryListEvent) => syncCompact(event.matches);
		syncCompact(mediaQuery.matches);
		mediaQuery.addEventListener('change', onMediaChange);

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
			window.requestAnimationFrame(() => showOverview());
		});

		return () => {
			disposed = true;
			mediaQuery.removeEventListener('change', onMediaChange);
			root?.unmount();
			root = null;
		};
	});
</script>

<section class="public-substrate-canvas" data-public-substrate-canvas aria-labelledby="substrate-canvas-title">
	<div class="public-substrate-canvas__chrome">
		<div>
			<p class="public-substrate-canvas__eyebrow">Substrate / Topology / Atlas</p>
			<h3 id="substrate-canvas-title">Inspect the database as a canvas.</h3>
			<p>
				WebGPU makes the database visual enough for human review: Substrate stores the
				record, Topology reveals the relationships, and Atlas gives operators the inspection
				controls before agents run.
			</p>
		</div>
		<div class="public-substrate-canvas__meta" aria-label="Canvas metadata">
			<span>Substrate records</span>
			<span>Topology graph</span>
			<span>Atlas review</span>
			<span class="public-substrate-canvas__backend" aria-label={`Renderer ${renderBackend}`}>
				{backendLabel}
			</span>
		</div>
	</div>

	<div class="public-substrate-canvas__surface">
		<div class="public-substrate-canvas__viewport" bind:this={viewportElement}></div>
		<aside class="public-substrate-canvas__inspector" aria-live="polite">
			<span class="public-substrate-canvas__kicker">{selectedRecord.kicker}</span>
			<h4>{selectedRecord.label}</h4>
			<p>{selectedRecord.body}</p>
			<dl>
				<div>
					<dt>State</dt>
					<dd data-status={selectedRecord.status}>{selectedRecord.status}</dd>
				</div>
				<div>
					<dt>Receipt</dt>
					<dd>{selectedRecord.proof}</dd>
				</div>
				<div>
					<dt>Canvas</dt>
					<dd>{viewLabel} / {backendLabel}</dd>
				</div>
			</dl>
			<div class="public-substrate-canvas__actions">
				<button type="button" class:active={viewMode === 'overview'} onclick={showOverview}>
					Overview
				</button>
				<button type="button" class:active={selectedNodeId === 'substrate_graph'} onclick={focusWorkflow}>
					Substrate
				</button>
				<button type="button" class:active={selectedNodeId === 'receipt_graph'} onclick={showReceipts}>
					Proof
				</button>
				<button type="button" onclick={fitMap}>Fit</button>
			</div>
		</aside>
	</div>
</section>

<style>
	.public-substrate-canvas {
		overflow: hidden;
		border: 1px solid rgba(10, 14, 25, 0.12);
		background:
			linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3rem
				3rem,
			linear-gradient(180deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3rem
				3rem,
			linear-gradient(180deg, #fbfbf4, #fff);
		box-shadow: 0 24px 60px rgba(10, 14, 25, 0.08);
		color: var(--color-clear-onyx, #0a0e19);
	}

	.public-substrate-canvas__chrome {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1.5rem;
		align-items: start;
		padding: clamp(1.1rem, 2vw, 1.55rem);
		border-bottom: 1px solid rgba(10, 14, 25, 0.1);
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
		gap: 0.45rem;
		justify-content: flex-end;
		min-width: 12rem;
	}

	.public-substrate-canvas__meta span {
		padding: 0.42rem 0.58rem;
		border: 1px solid rgba(10, 14, 25, 0.12);
		background: rgba(255, 255, 255, 0.82);
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
		padding: clamp(1.1rem, 2vw, 1.55rem);
		border-left: 1px solid rgba(10, 14, 25, 0.1);
		background:
			linear-gradient(180deg, rgba(10, 14, 25, 0.035) 0, transparent 12rem),
			rgba(255, 255, 255, 0.9);
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
		padding-top: 0.7rem;
		border-top: 1px solid rgba(10, 14, 25, 0.1);
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
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.55rem;
		margin-top: auto;
	}

	.public-substrate-canvas__actions button {
		padding: 0.68rem 0.9rem;
		border: 1px solid rgba(10, 14, 25, 0.16);
		background: #0a0e19;
		color: #fff;
		cursor: pointer;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 720;
	}

	.public-substrate-canvas__actions button:not(.active) {
		background: #fff;
		color: #0a0e19;
	}

	.public-substrate-canvas__actions button.active {
		border-color: rgba(10, 14, 25, 0.42);
	}

	.public-substrate-canvas__actions button:focus-visible {
		outline: 2px solid rgba(10, 14, 25, 0.76);
		outline-offset: 2px;
	}

	.public-substrate-canvas :global(.fast-topology-canvas) {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: inherit;
		overflow: hidden;
		touch-action: none;
		user-select: none;
	}

	.public-substrate-canvas :global(.fast-topology-canvas canvas) {
		display: block;
		width: 100%;
		height: 100%;
	}

	.public-substrate-canvas :global(.fast-topology-labels) {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.public-substrate-canvas :global(.fast-node-label) {
		position: absolute;
		overflow: hidden;
		padding: 0.44rem 0.5rem 0.44rem 0.72rem;
		border: 1px solid rgba(10, 14, 25, 0.13);
		background: rgba(255, 255, 255, 0.9);
		box-shadow: 0 8px 22px rgba(10, 14, 25, 0.06);
		color: rgba(10, 14, 25, 0.86);
		font-size: 0.72rem;
		font-weight: 760;
		line-height: 1.15;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.public-substrate-canvas :global(.fast-node-label.selected),
	.public-substrate-canvas :global(.fast-node-label.active) {
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
			width: 100%;
			min-width: 0;
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

		.public-substrate-canvas__actions button {
			min-height: 2.75rem;
			padding-inline: 0.7rem;
		}

		.public-substrate-canvas :global(.fast-node-label) {
			padding: 0.38rem 0.44rem 0.38rem 0.58rem;
			font-size: 0.68rem;
		}
	}
</style>
