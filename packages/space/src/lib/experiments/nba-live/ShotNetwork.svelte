<script lang="ts">
	/**
	 * ShotNetwork Component
	 *
	 * Force-directed graph showing shot creation relationships.
	 * Nodes = players, edges = assists. Follows Tufte's principles:
	 * maximize data-ink, direct labeling, no chartjunk.
	 */

	import { onMount, onDestroy } from 'svelte';
	import * as d3Force from 'd3-force';
	import * as d3Selection from 'd3-selection';

	interface NetworkNode {
		id: string;
		name: string;
		teamId: string;
		teamAbbr: string;
		shotCreation: number;
		shotsAttempted: number;
		pointsCreated: number;
		// D3 adds these during simulation
		x?: number;
		y?: number;
		vx?: number;
		vy?: number;
	}

	interface NetworkEdge {
		source: string | NetworkNode;
		target: string | NetworkNode;
		assists: number;
		pointsCreated: number;
	}

	interface Props {
		nodes: NetworkNode[];
		edges: NetworkEdge[];
		title: string;
		teamAbbr?: string;
	}

	let { nodes, edges, title, teamAbbr }: Props = $props();

	let svgElement = $state<SVGSVGElement>();
	let simulation: d3Force.Simulation<NetworkNode, NetworkEdge> | null = null;

	// Chart dimensions
	const width = 400;
	const height = 350;
	const margin = { top: 20, right: 20, bottom: 20, left: 20 };

	// Scale node radius by shot creation (Tufte: encode data in proportional ink)
	function nodeRadius(node: NetworkNode): number {
		// Base size + scaled by shot creation
		const base = 8;
		const scale = Math.sqrt(node.shotCreation + node.shotsAttempted) * 2;
		return Math.max(base, Math.min(base + scale, 30));
	}

	// Scale edge thickness by assists (Tufte: proportional representation)
	function edgeWidth(edge: NetworkEdge): number {
		return Math.max(1, Math.min(edge.assists * 2, 8));
	}

	// Get last name for compact labels
	function shortName(name: string): string {
		const parts = name.split(' ');
		return parts[parts.length - 1] || name;
	}

	onMount(() => {
		if (!svgElement || nodes.length === 0) return;

		// Deep copy to avoid mutation issues
		const nodesCopy = nodes.map((n) => ({ ...n }));
		const edgesCopy = edges.map((e) => ({ ...e }));

		// Create the simulation
		simulation = d3Force
			.forceSimulation<NetworkNode>(nodesCopy)
			.force(
				'link',
				d3Force
					.forceLink<NetworkNode, NetworkEdge>(edgesCopy)
					.id((d) => d.id)
					.distance(80)
					.strength(0.5)
			)
			.force('charge', d3Force.forceManyBody().strength(-200))
			.force('center', d3Force.forceCenter(width / 2, height / 2))
			.force('collision', d3Force.forceCollide().radius((d) => nodeRadius(d as NetworkNode) + 5));

		const svg = d3Selection.select(svgElement);

		// Clear previous content
		svg.selectAll('*').remove();

		// Create arrow marker for directed edges
		svg
			.append('defs')
			.append('marker')
			.attr('id', `arrow-${teamAbbr}`)
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', 20)
			.attr('refY', 0)
			.attr('markerWidth', 6)
			.attr('markerHeight', 6)
			.attr('orient', 'auto')
			.append('path')
			.attr('d', 'M0,-5L10,0L0,5')
			.attr('fill', 'var(--color-fg-subtle)');

		// Draw edges (links)
		const link = svg
			.append('g')
			.attr('class', 'links')
			.selectAll('line')
			.data(edgesCopy)
			.join('line')
			.attr('stroke', 'var(--color-fg-subtle)')
			.attr('stroke-width', (d) => edgeWidth(d))
			.attr('stroke-opacity', 0.6)
			.attr('marker-end', `url(#arrow-${teamAbbr})`);

		// Draw nodes
		const node = svg
			.append('g')
			.attr('class', 'nodes')
			.selectAll('circle')
			.data(nodesCopy)
			.join('circle')
			.attr('r', (d) => nodeRadius(d))
			.attr('fill', (d) => (d.shotCreation > 0 ? 'var(--color-data-1)' : 'var(--color-fg-muted)'))
			.attr('stroke', 'var(--color-bg-pure)')
			.attr('stroke-width', 2)
			.attr('opacity', 0.9);

		// Direct labels on nodes (Tufte: label data directly)
		const label = svg
			.append('g')
			.attr('class', 'labels')
			.selectAll('text')
			.data(nodesCopy)
			.join('text')
			.text((d) => shortName(d.name))
			.attr('font-size', '10px')
			.attr('font-family', 'inherit')
			.attr('fill', 'var(--color-fg-secondary)')
			.attr('text-anchor', 'middle')
			.attr('dy', (d) => nodeRadius(d) + 12);

		// Shot creation count inside larger nodes
		const countLabel = svg
			.append('g')
			.attr('class', 'count-labels')
			.selectAll('text')
			.data(nodesCopy.filter((d) => d.shotCreation > 0))
			.join('text')
			.text((d) => d.shotCreation)
			.attr('font-size', '9px')
			.attr('font-weight', '600')
			.attr('font-family', 'inherit')
			.attr('fill', 'var(--color-bg-pure)')
			.attr('text-anchor', 'middle')
			.attr('dy', 3);

		// Update positions on simulation tick
		simulation.on('tick', () => {
			// Constrain nodes to bounds
			nodesCopy.forEach((d) => {
				const r = nodeRadius(d);
				d.x = Math.max(margin.left + r, Math.min(width - margin.right - r, d.x || 0));
				d.y = Math.max(margin.top + r, Math.min(height - margin.bottom - r, d.y || 0));
			});

			link
				.attr('x1', (d) => (d.source as NetworkNode).x || 0)
				.attr('y1', (d) => (d.source as NetworkNode).y || 0)
				.attr('x2', (d) => (d.target as NetworkNode).x || 0)
				.attr('y2', (d) => (d.target as NetworkNode).y || 0);

			node.attr('cx', (d) => d.x || 0).attr('cy', (d) => d.y || 0);

			label.attr('x', (d) => d.x || 0).attr('y', (d) => d.y || 0);

			countLabel.attr('x', (d) => d.x || 0).attr('y', (d) => d.y || 0);
		});
	});

	onDestroy(() => {
		if (simulation) {
			simulation.stop();
		}
	});
</script>

<div class="network-container">
	<h3 class="network-title">{title}</h3>

	{#if nodes.length === 0}
		<p class="empty-message">No shot creation data available</p>
	{:else}
		<svg
			bind:this={svgElement}
			viewBox="0 0 {width} {height}"
			class="network-svg"
			role="img"
			aria-label="Shot creation network for {teamAbbr || title}"
		>
			<!-- D3 will populate this -->
		</svg>

		<!-- Direct statistics (Tufte: data on the graphic) -->
		<div class="network-stats">
			<div class="stat-group">
				<span class="stat-label">Players</span>
				<span class="stat-value">{nodes.length}</span>
			</div>
			<div class="stat-group">
				<span class="stat-label">Connections</span>
				<span class="stat-value">{edges.length}</span>
			</div>
			<div class="stat-group">
				<span class="stat-label">Assist Pts</span>
				<span class="stat-value">{edges.reduce((sum, e) => sum + e.pointsCreated, 0)}</span>
			</div>
		</div>

		<!-- Mini legend (Tufte: minimal, integrated) -->
		<div class="network-legend">
			<span class="legend-item">
				<span class="legend-circle active"></span>
				Shot creator
			</span>
			<span class="legend-item">
				<span class="legend-circle"></span>
				Scorer only
			</span>
			<span class="legend-item">
				<span class="legend-line"></span>
				Assist
			</span>
		</div>
	{/if}
</div>

<style>
	.network-container {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.network-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.empty-message {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		text-align: center;
		padding: var(--space-lg);
	}

	.network-svg {
		width: 100%;
		height: auto;
		max-height: 350px;
	}

	.network-stats {
		display: flex;
		justify-content: center;
		gap: var(--space-lg);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
		margin-top: var(--space-sm);
	}

	.stat-group {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.stat-value {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.network-legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-md);
		margin-top: var(--space-sm);
		padding-top: var(--space-xs);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.legend-circle {
		width: 10px;
		height: 10px;
		border-radius: var(--radius-full);
		background: var(--color-fg-muted);
	}

	.legend-circle.active {
		background: var(--color-data-1);
	}

	.legend-line {
		width: 16px;
		height: 2px;
		background: var(--color-fg-subtle);
	}
</style>
