<script lang="ts">
	/**
	 * HermeneuticCircle Component
	 *
	 * Visualizes the CREATE SOMETHING hermeneutic circle:
	 * .ltd (Philosophy) -> .io (Research) -> .space (Practice) -> .agency (Services) -> .ltd
	 *
	 * Part of "The Circle Closes" experiment.
	 * Shows connections that exist and gaps that need filling.
	 *
	 * "We understand parts through the whole, and the whole through its parts."
	 */

	type Domain = 'ltd' | 'io' | 'space' | 'agency';

	interface CircleNode {
		domain: Domain;
		count: number;
		active: boolean;
		label: string;
		sublabel: string;
	}

	interface CircleEdge {
		from: Domain;
		to: Domain;
		strength: number; // 0 = missing, 1-10 = connection strength
	}

	interface CircleState {
		nodes: CircleNode[];
		edges: CircleEdge[];
		lastUpdated?: number;
	}

	interface Props {
		state: CircleState | null;
		loading?: boolean;
		interactive?: boolean;
		showGaps?: boolean;
		selectedNode?: Domain | null;
		onNodeClick?: (domain: Domain) => void;
		class?: string;
	}

	let {
		state,
		loading = false,
		interactive = true,
		showGaps = true,
		selectedNode = null,
		onNodeClick,
		class: className = ''
	}: Props = $props();

	// Default node configuration
	const defaultNodes: Record<Domain, { label: string; sublabel: string }> = {
		ltd: { label: '.ltd', sublabel: 'Philosophy' },
		io: { label: '.io', sublabel: 'Research' },
		space: { label: '.space', sublabel: 'Practice' },
		agency: { label: '.agency', sublabel: 'Services' }
	};

	// Node positions in a diamond/circle layout
	// Positioned: ltd at top, io right, space bottom, agency left
	const positions: Record<Domain, { x: number; y: number }> = {
		ltd: { x: 100, y: 20 },
		io: { x: 180, y: 100 },
		space: { x: 100, y: 180 },
		agency: { x: 20, y: 100 }
	};

	// Get node data with defaults
	function getNode(domain: Domain): CircleNode {
		const defaults = defaultNodes[domain];
		const stateNode = state?.nodes.find((n) => n.domain === domain);
		return {
			domain,
			count: stateNode?.count ?? 0,
			active: stateNode?.active ?? false,
			label: defaults.label,
			sublabel: defaults.sublabel
		};
	}

	// Get edge between two nodes
	function getEdge(from: Domain, to: Domain): CircleEdge | null {
		return state?.edges.find((e) => e.from === from && e.to === to) ?? null;
	}

	// Calculate path between two nodes (curved line)
	function getPath(from: Domain, to: Domain): string {
		const start = positions[from];
		const end = positions[to];

		// Calculate control point for a curved path
		const midX = (start.x + end.x) / 2;
		const midY = (start.y + end.y) / 2;

		// Offset control point toward center for curve
		const centerX = 100;
		const centerY = 100;
		const curveStrength = 0.3;
		const ctrlX = midX + (centerX - midX) * curveStrength;
		const ctrlY = midY + (centerY - midY) * curveStrength;

		return `M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY} ${end.x} ${end.y}`;
	}

	// Hermeneutic circle connections (the expected flow)
	const circleFlow: [Domain, Domain][] = [
		['ltd', 'io'],
		['io', 'space'],
		['space', 'agency'],
		['agency', 'ltd']
	];

	function handleNodeClick(domain: Domain) {
		if (interactive && onNodeClick) {
			onNodeClick(domain);
		}
	}

	function handleKeyDown(event: KeyboardEvent, domain: Domain) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleNodeClick(domain);
		}
	}
</script>

<div class="hermeneutic-circle {className}" class:loading class:interactive>
	{#if loading}
		<div class="loading-overlay">
			<span>Mapping connections...</span>
		</div>
	{/if}

	<svg
		viewBox="0 0 200 200"
		class="circle-svg"
		role="img"
		aria-labelledby="hermeneutic-circle-title hermeneutic-circle-desc"
	>
		<title id="hermeneutic-circle-title">Hermeneutic Circle</title>
		<desc id="hermeneutic-circle-desc"
			>Visualization of CREATE SOMETHING domains: .ltd (Philosophy), .io (Research), .space
			(Practice), .agency (Services) - showing how each domain connects to form a complete
			circle.</desc
		>
		<defs>
			<!-- Arrow marker for edges -->
			<marker
				id="arrowhead"
				markerWidth="6"
				markerHeight="6"
				refX="5"
				refY="3"
				orient="auto"
				markerUnits="strokeWidth"
			>
				<path d="M0,0 L0,6 L6,3 z" fill="currentColor" opacity="0.6" />
			</marker>
			<marker
				id="arrowhead-missing"
				markerWidth="6"
				markerHeight="6"
				refX="5"
				refY="3"
				orient="auto"
				markerUnits="strokeWidth"
			>
				<path d="M0,0 L0,6 L6,3 z" fill="currentColor" opacity="0.3" />
			</marker>
		</defs>

		<!-- Draw edges (connections) -->
		{#each circleFlow as [from, to]}
			{@const edge = getEdge(from, to)}
			{@const isMissing = !edge || edge.strength === 0}
			<path
				d={getPath(from, to)}
				class="edge"
				class:missing={isMissing && showGaps}
				class:hidden={isMissing && !showGaps}
				class:strong={edge && edge.strength >= 7}
				class:weak={edge && edge.strength > 0 && edge.strength < 4}
				marker-end={isMissing ? 'url(#arrowhead-missing)' : 'url(#arrowhead)'}
				style="--strength: {edge?.strength ?? 0}"
			/>
		{/each}

		<!-- Draw nodes -->
		{#each Object.keys(positions) as domain}
			{@const node = getNode(domain as Domain)}
			{@const pos = positions[domain as Domain]}
			{@const isSelected = selectedNode === domain}
			{#if interactive}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<g
					class="node interactive"
					class:active={node.active}
					class:selected={isSelected}
					transform="translate({pos.x}, {pos.y})"
					role="button"
					tabindex="0"
					aria-label="{node.label} - {node.sublabel}: {node.count} items"
					onclick={() => handleNodeClick(domain as Domain)}
					onkeydown={(e) => handleKeyDown(e, domain as Domain)}
				>
					<!-- Node circle -->
					<circle r="18" class="node-circle" />

					<!-- Count badge -->
					<text class="node-count" y="1" text-anchor="middle" dominant-baseline="middle">
						{node.count}
					</text>

					<!-- Label -->
					<text class="node-label" y="28" text-anchor="middle">
						{node.label}
					</text>

					<!-- Sublabel -->
					<text class="node-sublabel" y="38" text-anchor="middle">
						{node.sublabel}
					</text>
				</g>
			{:else}
				<g
					class="node"
					class:active={node.active}
					class:selected={isSelected}
					transform="translate({pos.x}, {pos.y})"
				>
					<!-- Node circle -->
					<circle r="18" class="node-circle" />

					<!-- Count badge -->
					<text class="node-count" y="1" text-anchor="middle" dominant-baseline="middle">
						{node.count}
					</text>

					<!-- Label -->
					<text class="node-label" y="28" text-anchor="middle">
						{node.label}
					</text>

					<!-- Sublabel -->
					<text class="node-sublabel" y="38" text-anchor="middle">
						{node.sublabel}
					</text>
				</g>
			{/if}
		{/each}

		<!-- Center text -->
		<text class="center-text" x="100" y="100" text-anchor="middle" dominant-baseline="middle">
			{#if state}
				<tspan class="center-label">Circle</tspan>
			{:else}
				<tspan class="center-empty">Awaiting</tspan>
			{/if}
		</text>
	</svg>

	<!-- Legend -->
	{#if showGaps && state}
		{@const missingEdges = circleFlow.filter(([from, to]) => {
			const edge = getEdge(from, to);
			return !edge || edge.strength === 0;
		})}
		{#if missingEdges.length > 0}
			<div class="legend">
				<span class="legend-title">Gaps:</span>
				{#each missingEdges as [from, to]}
					<span class="gap-indicator">{defaultNodes[from].label} → {defaultNodes[to].label}</span>
				{/each}
			</div>
		{:else}
			<div class="legend complete">
				<span class="legend-complete">The circle closes.</span>
			</div>
		{/if}
	{/if}
</div>

<style>
	.hermeneutic-circle {
		position: relative;
		width: 100%;
		max-width: 280px;
		margin: 0 auto;
	}

	.hermeneutic-circle.loading {
		opacity: 0.6;
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--color-bg-pure) 50%, transparent);
		color: var(--color-fg-tertiary);
		font-size: 0.75rem;
		z-index: 10;
	}

	.circle-svg {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Edges */
	.edge {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		opacity: calc(0.3 + var(--strength, 0) * 0.07);
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.edge.missing {
		stroke-dasharray: 4 4;
		opacity: 0.2;
		stroke: color-mix(in srgb, var(--color-error) 50%, transparent);
	}

	.edge.hidden {
		display: none;
	}

	.edge.strong {
		stroke-width: 2;
	}

	.edge.weak {
		stroke-width: 1;
		opacity: 0.25;
	}

	/* Nodes */
	.node {
		cursor: default;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.node.interactive {
		cursor: pointer;
	}

	.node.interactive:hover {
		transform: scale(1.1);
	}

	.node.interactive:focus {
		outline: none;
	}

	.node.interactive:focus .node-circle {
		stroke: var(--color-fg-secondary);
		stroke-width: 2;
	}

	.node-circle {
		fill: var(--color-bg-elevated);
		stroke: var(--color-border-default);
		stroke-width: 1;
		transition:
			fill var(--duration-micro) var(--ease-standard),
			stroke var(--duration-micro) var(--ease-standard);
	}

	.node.active .node-circle {
		fill: var(--color-bg-surface);
		stroke: var(--color-border-strong);
	}

	.node.selected .node-circle {
		stroke: var(--color-fg-secondary);
		stroke-width: 2;
	}

	.node-count {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		fill: var(--color-fg-primary);
	}

	.node-label {
		font-family: var(--font-mono);
		font-size: 8px;
		font-weight: 600;
		fill: var(--color-fg-secondary);
	}

	.node-sublabel {
		font-size: 6px;
		fill: var(--color-fg-muted);
	}

	/* Center text */
	.center-text {
		font-size: 8px;
		fill: var(--color-fg-subtle);
	}

	.center-empty {
		font-style: italic;
	}

	/* Legend */
	.legend {
		margin-top: 1rem;
		padding: 0.5rem;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		font-size: 0.7rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.legend-title {
		color: var(--color-fg-muted);
	}

	.gap-indicator {
		color: var(--color-error);
		padding: 0.125rem 0.375rem;
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
	}

	.legend.complete {
		justify-content: center;
		background: color-mix(in srgb, var(--color-success) 5%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-success) 20%, transparent);
	}

	.legend-complete {
		color: var(--color-success);
		font-style: italic;
	}
</style>
