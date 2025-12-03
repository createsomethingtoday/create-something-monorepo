<script lang="ts">
	/**
	 * IsometricArchitecture Component
	 *
	 * Visualizes system architecture with isometric boxes and connections.
	 * Perfect for replacing ASCII diagrams like:
	 *   WhatsApp → Worker → Notion
	 *        ↓
	 *      KV Store
	 *
	 * Each node is an isometric box, connections show data flow.
	 */

	import { toIsometric } from './isometric.js';

	type ArchNode = {
		id: string;
		label: string;
		sublabel?: string;
		position: { x: number; y: number; z: number };
		size?: { w: number; h: number; d: number };
	};

	type ArchConnection = {
		from: string;
		to: string;
		label?: string;
	};

	interface Props {
		nodes: ArchNode[];
		connections?: ArchConnection[];
		title?: string;
		animate?: boolean;
		size?: number;
		class?: string;
	}

	let {
		nodes,
		connections = [],
		title,
		animate = true,
		size = 400,
		class: className = ''
	}: Props = $props();

	const defaultSize = { w: 60, h: 30, d: 40 };

	// Generate isometric box path for a node
	function nodePath(node: ArchNode): { top: string; left: string; right: string; center: { x: number; y: number } } {
		const { x, y, z } = node.position;
		const { w, h, d } = node.size || defaultSize;

		const v = [
			toIsometric(x, y, z),
			toIsometric(x + w, y, z),
			toIsometric(x + w, y + h, z),
			toIsometric(x, y + h, z),
			toIsometric(x, y, z + d),
			toIsometric(x + w, y, z + d),
			toIsometric(x + w, y + h, z + d),
			toIsometric(x, y + h, z + d)
		];

		const center = toIsometric(x + w / 2, y + h / 2, z + d / 2);

		return {
			top: `M ${v[3].x} ${v[3].y} L ${v[2].x} ${v[2].y} L ${v[6].x} ${v[6].y} L ${v[7].x} ${v[7].y} Z`,
			left: `M ${v[0].x} ${v[0].y} L ${v[3].x} ${v[3].y} L ${v[7].x} ${v[7].y} L ${v[4].x} ${v[4].y} Z`,
			right: `M ${v[1].x} ${v[1].y} L ${v[5].x} ${v[5].y} L ${v[6].x} ${v[6].y} L ${v[2].x} ${v[2].y} Z`,
			center
		};
	}

	// Get node center for connection paths
	function getNodeCenter(nodeId: string): { x: number; y: number } | null {
		const node = nodes.find((n) => n.id === nodeId);
		if (!node) return null;
		const { center } = nodePath(node);
		return center;
	}

	// Generate connection path between two nodes
	function connectionPath(conn: ArchConnection): string | null {
		const from = getNodeCenter(conn.from);
		const to = getNodeCenter(conn.to);
		if (!from || !to) return null;

		// Calculate control point for curve
		const midX = (from.x + to.x) / 2;
		const midY = (from.y + to.y) / 2;
		const offset = 15;

		return `M ${from.x} ${from.y} Q ${midX} ${midY - offset} ${to.x} ${to.y}`;
	}

	const viewBox = $derived(`-${size / 2} -${size / 2} ${size} ${size}`);
</script>

<div class="isometric-architecture {className}">
	<svg viewBox={viewBox} class="arch-svg">
		<defs>
			<!-- Arrow marker -->
			<marker
				id="arch-arrow"
				markerWidth="8"
				markerHeight="8"
				refX="6"
				refY="4"
				orient="auto"
				markerUnits="strokeWidth"
			>
				<path d="M0,0 L0,8 L8,4 z" fill="currentColor" opacity="0.5" />
			</marker>
		</defs>

		<!-- Connections (draw first, behind nodes) -->
		<g class="connections">
			{#each connections as conn, index}
				{@const path = connectionPath(conn)}
				{@const delay = 200 + index * 100}
				{#if path}
					<path d={path} class="connection" marker-end="url(#arch-arrow)">
						{#if animate}
							<animate
								attributeName="stroke-dashoffset"
								from="100"
								to="0"
								dur="600ms"
								begin="{delay}ms"
								fill="freeze"
							/>
						{/if}
					</path>
					{#if conn.label}
						{@const from = getNodeCenter(conn.from)}
						{@const to = getNodeCenter(conn.to)}
						{#if from && to}
							<text
								x={(from.x + to.x) / 2}
								y={(from.y + to.y) / 2 - 8}
								class="connection-label"
								text-anchor="middle"
							>
								{#if animate}
									<animate
										attributeName="opacity"
										from="0"
										to="1"
										dur="300ms"
										begin="{delay + 400}ms"
										fill="freeze"
									/>
								{/if}
								{conn.label}
							</text>
						{/if}
					{/if}
				{/if}
			{/each}
		</g>

		<!-- Nodes -->
		<g class="nodes">
			{#each nodes as node, index}
				{@const paths = nodePath(node)}
				{@const delay = index * 150}

				<g class="node" data-id={node.id}>
					<!-- Box faces -->
					<path d={paths.top} class="face face-top">
						{#if animate}
							<animate
								attributeName="opacity"
								from="0"
								to="1"
								dur="400ms"
								begin="{delay}ms"
								fill="freeze"
							/>
						{/if}
					</path>
					<path d={paths.left} class="face face-left">
						{#if animate}
							<animate
								attributeName="opacity"
								from="0"
								to="1"
								dur="400ms"
								begin="{delay + 50}ms"
								fill="freeze"
							/>
						{/if}
					</path>
					<path d={paths.right} class="face face-right">
						{#if animate}
							<animate
								attributeName="opacity"
								from="0"
								to="1"
								dur="400ms"
								begin="{delay + 100}ms"
								fill="freeze"
							/>
						{/if}
					</path>

					<!-- Label -->
					<text
						x={paths.center.x}
						y={paths.center.y - 25}
						class="node-label"
						text-anchor="middle"
					>
						{#if animate}
							<animate
								attributeName="opacity"
								from="0"
								to="1"
								dur="300ms"
								begin="{delay + 300}ms"
								fill="freeze"
							/>
						{/if}
						{node.label}
					</text>

					{#if node.sublabel}
						<text
							x={paths.center.x}
							y={paths.center.y - 12}
							class="node-sublabel"
							text-anchor="middle"
						>
							{#if animate}
								<animate
									attributeName="opacity"
									from="0"
									to="1"
									dur="300ms"
									begin="{delay + 400}ms"
									fill="freeze"
								/>
							{/if}
							{node.sublabel}
						</text>
					{/if}
				</g>
			{/each}
		</g>

		<!-- Title -->
		{#if title}
			<text x="0" y={size / 2 - 20} class="arch-title" text-anchor="middle">
				{#if animate}
					<animate
						attributeName="opacity"
						from="0"
						to="1"
						dur="400ms"
						begin="{nodes.length * 150 + 300}ms"
						fill="freeze"
					/>
				{/if}
				{title}
			</text>
		{/if}
	</svg>
</div>

<style>
	.isometric-architecture {
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
	}

	.arch-svg {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Connections */
	.connection {
		fill: none;
		stroke: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		stroke-width: 1.5;
		stroke-dasharray: 100;
		stroke-dashoffset: 100;
	}

	.connection-label {
		font-family: var(--font-mono, monospace);
		font-size: 7px;
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		opacity: 0;
	}

	/* Node faces */
	.face {
		stroke: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
		opacity: 0;
	}

	.face-top {
		fill: var(--color-fg-subtle, rgba(255, 255, 255, 0.15));
	}

	.face-left {
		fill: var(--color-bg-subtle, rgba(255, 255, 255, 0.08));
	}

	.face-right {
		fill: var(--color-bg-elevated, rgba(255, 255, 255, 0.03));
	}

	/* Labels */
	.node-label {
		font-family: var(--font-mono, monospace);
		font-size: 9px;
		font-weight: 600;
		fill: var(--color-fg-primary, white);
		opacity: 0;
	}

	.node-sublabel {
		font-family: var(--font-sans, system-ui);
		font-size: 7px;
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		opacity: 0;
	}

	/* Title */
	.arch-title {
		font-family: var(--font-sans, system-ui);
		font-size: 10px;
		font-style: italic;
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		opacity: 0;
	}

	/* Hover states */
	.node:hover .face {
		stroke: var(--color-fg-secondary, rgba(255, 255, 255, 0.6));
	}

	.node:hover .face-top {
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.25));
	}
</style>
