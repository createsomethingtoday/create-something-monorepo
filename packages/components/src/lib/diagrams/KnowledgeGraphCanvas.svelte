<script lang="ts">
	/**
	 * KnowledgeGraphCanvas - Canvas-based force-directed graph
	 *
	 * High-performance canvas renderer for large knowledge graphs (1000+ nodes).
	 * Uses quadtree spatial partitioning and Barnes-Hut approximation for O(n log n) force calculations.
	 */

	interface GraphNode {
		id: string;
		label: string;
		type?: 'concept' | 'entity' | 'relation' | 'document';
		weight?: number;
		x?: number;
		y?: number;
		vx?: number;
		vy?: number;
		fx?: number | null; // Fixed x position (for pinning)
		fy?: number | null; // Fixed y position
	}

	interface GraphEdge {
		source: string;
		target: string;
		weight?: number;
		type?: 'dependency' | 'reference' | 'contains' | 'related';
	}

	interface Props {
		nodes: GraphNode[];
		edges: GraphEdge[];
		width?: number;
		height?: number;
		onNodeClick?: (node: GraphNode) => void;
		onNodeHover?: (node: GraphNode | null) => void;
	}

	let {
		nodes,
		edges,
		width = 1200,
		height = 800,
		onNodeClick,
		onNodeHover
	}: Props = $props();

	// Canvas and state
	let canvas: HTMLCanvasElement | null = $state(null);
	let hoveredNode: GraphNode | null = $state(null);
	let selectedNode: GraphNode | null = $state(null);
	let isDragging = $state(false);
	let dragNode: GraphNode | null = $state(null);
	let transform = $state({ x: 0, y: 0, scale: 1 });
	let isPanning = $state(false);
	let panStart = $state({ x: 0, y: 0 });

	// Simulation state
	let simulationNodes: GraphNode[] = $state([]);
	let simulationRunning = $state(true);
	let alpha = $state(1);

	// Configuration
	const config = {
		nodeRadius: 6,
		nodeRadiusHovered: 10,
		linkDistance: 80,
		chargeStrength: -120,
		centerStrength: 0.05,
		alphaDecay: 0.02,
		velocityDecay: 0.4,
		minAlpha: 0.001
	};

	// Resolved colors (populated on mount)
	let resolvedColors = $state({
		bgPure: '#0a0a0a',
		fgPrimary: '#ffffff',
		fgMuted: '#6b7280',
		data1: '#6366f1',
		data2: '#22c55e',
		data3: '#f59e0b',
		data4: '#ef4444',
		borderEmphasis: '#4f46e5',
		borderStrong: '#9ca3af',
		borderDefault: '#404040'
	});

	// Resolve CSS custom properties
	function resolveColors() {
		if (typeof window === 'undefined') return;
		const styles = getComputedStyle(document.documentElement);
		
		const get = (prop: string, fallback: string) => 
			styles.getPropertyValue(prop).trim() || fallback;
		
		resolvedColors = {
			bgPure: get('--color-bg-pure', '#0a0a0a'),
			fgPrimary: get('--color-fg-primary', '#ffffff'),
			fgMuted: get('--color-fg-muted', '#6b7280'),
			data1: get('--color-data-1', '#6366f1'),
			data2: get('--color-data-2', '#22c55e'),
			data3: get('--color-data-3', '#f59e0b'),
			data4: get('--color-data-4', '#ef4444'),
			borderEmphasis: get('--color-border-emphasis', '#4f46e5'),
			borderStrong: get('--color-border-strong', '#9ca3af'),
			borderDefault: get('--color-border-default', '#404040')
		};
	}

	// Node type colors (use resolved values)
	const getNodeColor = (type: string | undefined): string => {
		switch (type) {
			case 'concept': return resolvedColors.data1;
			case 'entity': return resolvedColors.data2;
			case 'relation': return resolvedColors.data3;
			case 'document': return resolvedColors.data4;
			default: return resolvedColors.fgMuted;
		}
	};

	// Edge type styles
	const getEdgeStyle = (type: string | undefined): { color: string; width: number; dash: number[] } => {
		switch (type) {
			case 'dependency': return { color: resolvedColors.borderEmphasis, width: 2, dash: [] };
			case 'reference': return { color: resolvedColors.borderStrong, width: 1.5, dash: [] };
			case 'contains': return { color: resolvedColors.borderDefault, width: 1, dash: [] };
			default: return { color: resolvedColors.borderDefault, width: 1, dash: [4, 4] };
		}
	};

	// Build adjacency map for edge lookups
	function buildAdjacencyMap(edges: GraphEdge[]): Map<string, Set<string>> {
		const map = new Map<string, Set<string>>();
		for (const edge of edges) {
			if (!map.has(edge.source)) map.set(edge.source, new Set());
			if (!map.has(edge.target)) map.set(edge.target, new Set());
			map.get(edge.source)!.add(edge.target);
			map.get(edge.target)!.add(edge.source);
		}
		return map;
	}

	// Quadtree for spatial partitioning (Barnes-Hut)
	class Quadtree {
		x: number;
		y: number;
		width: number;
		height: number;
		nodes: GraphNode[] = [];
		children: Quadtree[] | null = null;
		centerOfMass = { x: 0, y: 0, mass: 0 };

		constructor(x: number, y: number, width: number, height: number) {
			this.x = x;
			this.y = y;
			this.width = width;
			this.height = height;
		}

		insert(node: GraphNode): void {
			if (
				node.x! < this.x ||
				node.x! > this.x + this.width ||
				node.y! < this.y ||
				node.y! > this.y + this.height
			) {
				return;
			}

			if (this.nodes.length < 4 && !this.children) {
				this.nodes.push(node);
				this.updateCenterOfMass();
				return;
			}

			if (!this.children) {
				this.subdivide();
				for (const n of this.nodes) {
					for (const child of this.children!) {
						child.insert(n);
					}
				}
				this.nodes = [];
			}

			for (const child of this.children!) {
				child.insert(node);
			}
			this.updateCenterOfMass();
		}

		subdivide(): void {
			const hw = this.width / 2;
			const hh = this.height / 2;
			this.children = [
				new Quadtree(this.x, this.y, hw, hh),
				new Quadtree(this.x + hw, this.y, hw, hh),
				new Quadtree(this.x, this.y + hh, hw, hh),
				new Quadtree(this.x + hw, this.y + hh, hw, hh)
			];
		}

		updateCenterOfMass(): void {
			let totalMass = 0;
			let cx = 0;
			let cy = 0;

			if (this.children) {
				for (const child of this.children) {
					if (child.centerOfMass.mass > 0) {
						cx += child.centerOfMass.x * child.centerOfMass.mass;
						cy += child.centerOfMass.y * child.centerOfMass.mass;
						totalMass += child.centerOfMass.mass;
					}
				}
			} else {
				for (const node of this.nodes) {
					const mass = node.weight ?? 1;
					cx += node.x! * mass;
					cy += node.y! * mass;
					totalMass += mass;
				}
			}

			if (totalMass > 0) {
				this.centerOfMass = { x: cx / totalMass, y: cy / totalMass, mass: totalMass };
			}
		}

		calculateForce(node: GraphNode, theta: number = 0.9): { fx: number; fy: number } {
			if (this.centerOfMass.mass === 0) return { fx: 0, fy: 0 };

			const dx = this.centerOfMass.x - node.x!;
			const dy = this.centerOfMass.y - node.y!;
			const dist = Math.sqrt(dx * dx + dy * dy) || 1;

			// Barnes-Hut: if node is far enough, treat as single body
			if (this.width / dist < theta || !this.children) {
				if (this.nodes.length === 1 && this.nodes[0].id === node.id) {
					return { fx: 0, fy: 0 };
				}
				const force = (config.chargeStrength * this.centerOfMass.mass) / (dist * dist);
				return { fx: (dx / dist) * force, fy: (dy / dist) * force };
			}

			// Otherwise recurse into children
			let fx = 0;
			let fy = 0;
			for (const child of this.children) {
				const f = child.calculateForce(node, theta);
				fx += f.fx;
				fy += f.fy;
			}
			return { fx, fy };
		}
	}

	// Initialize simulation
	$effect(() => {
		if (!nodes.length) return;

		// Initialize node positions if not set
		simulationNodes = nodes.map((node, i) => ({
			...node,
			x: node.x ?? width / 2 + (Math.random() - 0.5) * 200,
			y: node.y ?? height / 2 + (Math.random() - 0.5) * 200,
			vx: node.vx ?? 0,
			vy: node.vy ?? 0
		}));

		alpha = 1;
		simulationRunning = true;
	});

	// Run simulation
	$effect(() => {
		if (!simulationRunning || !simulationNodes.length) return;

		const adjacencyMap = buildAdjacencyMap(edges);
		const nodeMap = new Map(simulationNodes.map((n) => [n.id, n]));

		let animationId: number;

		function tick() {
			if (alpha < config.minAlpha) {
				simulationRunning = false;
				return;
			}

			// Build quadtree for charge force
			const quadtree = new Quadtree(-width, -height, width * 3, height * 3);
			for (const node of simulationNodes) {
				quadtree.insert(node);
			}

			// Apply forces
			for (const node of simulationNodes) {
				if (node.fx !== null && node.fx !== undefined) {
					node.x = node.fx;
					node.vx = 0;
				}
				if (node.fy !== null && node.fy !== undefined) {
					node.y = node.fy;
					node.vy = 0;
				}

				if (node.fx === null || node.fx === undefined) {
					// Charge force (repulsion) via Barnes-Hut
					const chargeForce = quadtree.calculateForce(node);
					node.vx! += chargeForce.fx * alpha;
					node.vy! += chargeForce.fy * alpha;

					// Center force
					node.vx! += (width / 2 - node.x!) * config.centerStrength * alpha;
					node.vy! += (height / 2 - node.y!) * config.centerStrength * alpha;
				}
			}

			// Link force (spring)
			for (const edge of edges) {
				const source = nodeMap.get(edge.source);
				const target = nodeMap.get(edge.target);
				if (!source || !target) continue;

				const dx = target.x! - source.x!;
				const dy = target.y! - source.y!;
				const dist = Math.sqrt(dx * dx + dy * dy) || 1;
				const force = ((dist - config.linkDistance) / dist) * alpha * 0.3;

				const fx = dx * force;
				const fy = dy * force;

				if (source.fx === null || source.fx === undefined) {
					source.vx! += fx;
					source.vy! += fy;
				}
				if (target.fx === null || target.fx === undefined) {
					target.vx! -= fx;
					target.vy! -= fy;
				}
			}

			// Apply velocities
			for (const node of simulationNodes) {
				if (node.fx === null || node.fx === undefined) {
					node.vx! *= config.velocityDecay;
					node.vy! *= config.velocityDecay;
					node.x! += node.vx!;
					node.y! += node.vy!;
				}
			}

			// Decay alpha
			alpha *= 1 - config.alphaDecay;

			// Trigger reactivity
			simulationNodes = [...simulationNodes];

			animationId = requestAnimationFrame(tick);
		}

		animationId = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(animationId);
	});

	// Resolve colors on mount
	$effect(() => {
		resolveColors();
	});

	// Render
	$effect(() => {
		const canvasEl = canvas;
		if (!canvasEl || !simulationNodes.length) return;

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		canvasEl.width = width * dpr;
		canvasEl.height = height * dpr;
		ctx.scale(dpr, dpr);

		// Clear
		ctx.fillStyle = resolvedColors.bgPure;
		ctx.fillRect(0, 0, width, height);

		// Apply transform
		ctx.save();
		ctx.translate(transform.x, transform.y);
		ctx.scale(transform.scale, transform.scale);

		const nodeMap = new Map(simulationNodes.map((n) => [n.id, n]));

		// Draw edges
		for (const edge of edges) {
			const source = nodeMap.get(edge.source);
			const target = nodeMap.get(edge.target);
			if (!source || !target) continue;

			const style = getEdgeStyle(edge.type);
			ctx.beginPath();
			ctx.strokeStyle = style.color;
			ctx.lineWidth = style.width / transform.scale;
			ctx.setLineDash(style.dash);
			ctx.moveTo(source.x!, source.y!);
			ctx.lineTo(target.x!, target.y!);
			ctx.stroke();
		}

		ctx.setLineDash([]);

		// Draw nodes
		for (const node of simulationNodes) {
			const isHovered = hoveredNode?.id === node.id;
			const isSelected = selectedNode?.id === node.id;
			const radius =
				((isHovered || isSelected ? config.nodeRadiusHovered : config.nodeRadius) *
					(node.weight ?? 1)) /
				transform.scale;

			ctx.beginPath();
			ctx.arc(node.x!, node.y!, radius, 0, Math.PI * 2);
			ctx.fillStyle = getNodeColor(node.type);
			ctx.fill();

			if (isHovered || isSelected) {
				ctx.strokeStyle = resolvedColors.fgPrimary;
				ctx.lineWidth = 2 / transform.scale;
				ctx.stroke();
			}
		}

		// Draw labels for hovered/selected
		if (hoveredNode || selectedNode) {
			const node = hoveredNode ?? selectedNode;
			if (node) {
				ctx.font = `${12 / transform.scale}px system-ui, sans-serif`;
				ctx.fillStyle = resolvedColors.fgPrimary;
				ctx.textAlign = 'center';
				ctx.fillText(node.label, node.x!, node.y! - 15 / transform.scale);
			}
		}

		ctx.restore();
	});

	// Hit testing
	function getNodeAtPosition(x: number, y: number): GraphNode | null {
		// Transform screen coordinates to graph coordinates
		const gx = (x - transform.x) / transform.scale;
		const gy = (y - transform.y) / transform.scale;

		for (const node of simulationNodes) {
			const dx = gx - node.x!;
			const dy = gy - node.y!;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const radius = config.nodeRadiusHovered * (node.weight ?? 1);
			if (dist <= radius) return node;
		}
		return null;
	}

	function handleMouseMove(e: MouseEvent) {
		const rect = canvas!.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (isPanning) {
			transform = {
				...transform,
				x: transform.x + (e.clientX - panStart.x),
				y: transform.y + (e.clientY - panStart.y)
			};
			panStart = { x: e.clientX, y: e.clientY };
			return;
		}

		if (isDragging && dragNode) {
			const gx = (x - transform.x) / transform.scale;
			const gy = (y - transform.y) / transform.scale;
			dragNode.fx = gx;
			dragNode.fy = gy;
			dragNode.x = gx;
			dragNode.y = gy;
			simulationNodes = [...simulationNodes];
			return;
		}

		const node = getNodeAtPosition(x, y);
		if (node !== hoveredNode) {
			hoveredNode = node;
			onNodeHover?.(node);
		}
	}

	function handleMouseDown(e: MouseEvent) {
		const rect = canvas!.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const node = getNodeAtPosition(x, y);

		if (node) {
			isDragging = true;
			dragNode = node;
			node.fx = node.x;
			node.fy = node.y;
			alpha = 0.3;
			simulationRunning = true;
		} else {
			isPanning = true;
			panStart = { x: e.clientX, y: e.clientY };
		}
	}

	function handleMouseUp() {
		if (isDragging && dragNode) {
			dragNode.fx = null;
			dragNode.fy = null;
			onNodeClick?.(dragNode);
			selectedNode = dragNode;
		}
		isDragging = false;
		dragNode = null;
		isPanning = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const rect = canvas!.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
		const newScale = Math.max(0.1, Math.min(5, transform.scale * scaleFactor));

		// Zoom toward cursor
		transform = {
			scale: newScale,
			x: x - (x - transform.x) * (newScale / transform.scale),
			y: y - (y - transform.y) * (newScale / transform.scale)
		};
	}

	// Reset view
	function resetView() {
		transform = { x: 0, y: 0, scale: 1 };
	}

	// Reheat simulation
	function reheat() {
		alpha = 1;
		simulationRunning = true;
	}
</script>

<div class="knowledge-graph-container">
	<canvas
		bind:this={canvas}
		style="width: {width}px; height: {height}px;"
		onmousemove={handleMouseMove}
		onmousedown={handleMouseDown}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onwheel={handleWheel}
		class:dragging={isDragging}
		class:panning={isPanning}
	></canvas>

	<div class="controls">
		<button onclick={resetView} title="Reset view">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
				<path d="M3 3v5h5" />
			</svg>
		</button>
		<button onclick={reheat} title="Reheat simulation">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
			</svg>
		</button>
		<span class="node-count">{nodes.length} nodes</span>
	</div>

	{#if hoveredNode}
		<div class="tooltip" style="left: {transform.x + hoveredNode.x! * transform.scale + 20}px; top: {transform.y + hoveredNode.y! * transform.scale}px;">
			<strong>{hoveredNode.label}</strong>
			{#if hoveredNode.type}
				<span class="type-badge">{hoveredNode.type}</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.knowledge-graph-container {
		position: relative;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	canvas {
		display: block;
		cursor: grab;
	}

	canvas.dragging {
		cursor: grabbing;
	}

	canvas.panning {
		cursor: move;
	}

	.controls {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		display: flex;
		gap: var(--space-xs);
		align-items: center;
	}

	.controls button {
		padding: var(--space-xs);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.controls button:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.node-count {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		padding: 0 var(--space-xs);
	}

	.tooltip {
		position: absolute;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		pointer-events: none;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.type-badge {
		font-size: var(--text-caption);
		padding: 2px 6px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
	}
</style>
