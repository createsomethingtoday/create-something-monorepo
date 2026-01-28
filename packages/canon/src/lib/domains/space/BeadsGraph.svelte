<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3Force from 'd3-force';
	import * as d3Selection from 'd3-selection';

	interface Node {
		id: string;
		title: string;
		status: 'pending' | 'in-progress' | 'completed';
		priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
		labels: string[];
		x?: number;
		y?: number;
		vx?: number;
		vy?: number;
	}

	interface Edge {
		source: string | Node;
		target: string | Node;
		type: 'blocks' | 'parent' | 'related';
	}

	interface Props {
		nodes: Node[];
		edges: Edge[];
		width?: number;
		height?: number;
	}

	let { nodes, edges, width = 1200, height = 800 }: Props = $props();
	let svg: SVGSVGElement;

	onMount(() => {
		// Clone data to avoid mutating props
		const graphNodes = nodes.map((n) => ({ ...n }));
		const graphEdges = edges.map((e) => ({ ...e }));

		// Create force simulation
		const simulation = d3Force
			.forceSimulation(graphNodes)
			.force(
				'link',
				d3Force
					.forceLink(graphEdges)
					.id((d: any) => d.id)
					.distance(80)
			)
			.force('charge', d3Force.forceManyBody().strength(-200))
			.force('center', d3Force.forceCenter(width / 2, height / 2))
			.force('collision', d3Force.forceCollide().radius(20));

		const canvas = d3Selection.select(svg);

		// Clear any existing content
		canvas.selectAll('*').remove();

		// Create container groups
		const linksGroup = canvas.append('g').attr('class', 'links');
		const nodesGroup = canvas.append('g').attr('class', 'nodes');

		// Draw links (dependencies)
		const link = linksGroup
			.selectAll('line')
			.data(graphEdges)
			.enter()
			.append('line')
			.attr('class', 'link')
			.style('stroke', (d) => {
				// Semantic colors by dependency type
				if (d.type === 'blocks') return 'var(--color-border-emphasis)';
				if (d.type === 'parent') return 'var(--color-border-strong)';
				return 'var(--color-border-default)';
			})
			.style('stroke-width', (d) => {
				if (d.type === 'blocks') return 2;
				if (d.type === 'parent') return 1.5;
				return 1;
			})
			.style('stroke-dasharray', (d) => {
				// Related dependencies are dashed
				return d.type === 'related' ? '4,4' : '0';
			});

		// Draw nodes (issues)
		const node = nodesGroup
			.selectAll('circle')
			.data(graphNodes)
			.enter()
			.append('circle')
			.attr('class', 'node')
			.attr('r', (d) => {
				// Size by priority
				const sizes = { P0: 12, P1: 10, P2: 8, P3: 6, P4: 5 };
				return sizes[d.priority];
			})
			.style('fill', (d) => {
				// Semantic colors by status
				if (d.status === 'completed') return 'var(--color-success)';
				if (d.status === 'in-progress') return 'var(--color-fg-primary)';
				return 'var(--color-fg-muted)';
			})
			.style('stroke', 'var(--color-bg-pure)')
			.style('stroke-width', 2)
			.style('cursor', 'pointer');

		// Add labels (only for high-priority or in-progress items)
		const label = nodesGroup
			.selectAll('text')
			.data(graphNodes.filter((d) => d.priority === 'P0' || d.status === 'in-progress'))
			.enter()
			.append('text')
			.attr('class', 'label')
			.attr('text-anchor', 'middle')
			.attr('dy', -15)
			.style('font-size', 'var(--text-caption)')
			.style('fill', 'var(--color-fg-secondary)')
			.style('pointer-events', 'none')
			.text((d) => d.id);

		// Drag behavior
		const drag = d3Force
			.forceDrag<any, Node>()
			.on('start', (event) => {
				if (!event.active) simulation.alphaTarget(0.3).restart();
				event.subject.fx = event.subject.x;
				event.subject.fy = event.subject.y;
			})
			.on('drag', (event) => {
				event.subject.fx = event.x;
				event.subject.fy = event.y;
			})
			.on('end', (event) => {
				if (!event.active) simulation.alphaTarget(0);
				event.subject.fx = null;
				event.subject.fy = null;
			});

		node.call(drag as any);

		// Update positions on each tick
		simulation.on('tick', () => {
			link
				.attr('x1', (d: any) => d.source.x)
				.attr('y1', (d: any) => d.source.y)
				.attr('x2', (d: any) => d.target.x)
				.attr('y2', (d: any) => d.target.y);

			node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

			label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
		});

		// Cleanup on unmount
		return () => {
			simulation.stop();
		};
	});
</script>

<svg bind:this={svg} {width} {height} class="beads-graph"></svg>

<style>
	.beads-graph {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	:global(.beads-graph .node) {
		transition: all var(--duration-micro) var(--ease-standard);
	}

	:global(.beads-graph .node:hover) {
		filter: brightness(1.2);
		transform: scale(1.1);
	}

	:global(.beads-graph .link) {
		transition: stroke var(--duration-micro) var(--ease-standard);
	}
</style>
