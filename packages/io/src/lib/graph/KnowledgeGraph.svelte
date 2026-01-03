<script lang="ts">
	/**
	 * KnowledgeGraph Component
	 *
	 * Main Cytoscape.js visualization container.
	 * Handles graph rendering, interaction, and layout updates.
	 */

	import { onMount, onDestroy } from 'svelte';
	import cytoscape from 'cytoscape';
	import coseBilkent from 'cytoscape-cose-bilkent';
	import type { Core, EventObject } from 'cytoscape';
	import type { GraphData, GraphFocus, EdgeFilters } from './types.js';
	import {
		createStylesheet,
		getLayoutConfig,
		computeNodeSize,
		computeEdgeWidth,
		PACKAGE_COLORS
	} from './cytoscape-config.js';

	// Register cose-bilkent layout
	cytoscape.use(coseBilkent);

	interface Props {
		data: GraphData;
		focus?: GraphFocus;
		edgeFilters?: EdgeFilters;
		showLabels?: boolean;
		showEdgeLabels?: boolean;
		hideOrphans?: boolean;
		onNodeClick?: (nodeId: string) => void;
		onNodeHover?: (nodeId: string | null) => void;
	}

	let {
		data,
		focus = { mode: 'full' },
		edgeFilters = {
			explicit: true,
			crossReference: true,
			concept: true,
			semantic: true,
			infrastructure: true
		},
		showLabels = true,
		showEdgeLabels = false,
		hideOrphans = true,
		onNodeClick,
		onNodeHover
	}: Props = $props();

	let container: HTMLDivElement;
	let cy: Core | null = null;

	/**
	 * Convert graph data to Cytoscape elements
	 */
	function convertToElements() {
		// First, filter edges based on edge type filters
		const filteredEdges = data.edges.filter((edge) => {
			switch (edge.type) {
				case 'explicit':
					return edgeFilters.explicit;
				case 'cross-reference':
					return edgeFilters.crossReference;
				case 'concept':
					return edgeFilters.concept;
				case 'semantic':
					return edgeFilters.semantic;
				case 'infrastructure':
					return edgeFilters.infrastructure;
				default:
					return true;
			}
		});

		// Collect connected node IDs (nodes that have at least one visible edge)
		const connectedNodeIds = new Set<string>();
		for (const edge of filteredEdges) {
			connectedNodeIds.add(edge.source);
			connectedNodeIds.add(edge.target);
		}

		// Nodes (filter orphans if hideOrphans is true)
		const nodes = data.nodes
			.filter((node) => !hideOrphans || connectedNodeIds.has(node.id))
			.map((node) => ({
				data: {
					id: node.id,
					label: showLabels ? node.title : '',
					color: PACKAGE_COLORS[node.package ?? 'root'],
					size: computeNodeSize(node.wordCount),
					package: node.package,
					type: node.type,
					concepts: node.concepts,
					wordCount: node.wordCount
				}
			}));

		// Edges
		const edges = filteredEdges.map((edge) => ({
			data: {
				id: `${edge.source}-${edge.target}`,
				source: edge.source,
				target: edge.target,
				label: showEdgeLabels ? edge.metadata?.reason ?? '' : '',
				width: computeEdgeWidth(edge.weight),
				color: getEdgeColor(edge.type),
				style: getEdgeStyle(edge.type),
				opacity: getEdgeOpacity(edge.type),
				type: edge.type
			},
			classes: [edge.type, showEdgeLabels ? 'show-label' : ''].filter(Boolean).join(' ')
		}));

		return { nodes, edges };
	}

	function getEdgeColor(type: string): string {
		switch (type) {
			case 'explicit':
				return 'rgba(255, 255, 255, 0.6)';
			case 'cross-reference':
				return 'rgba(255, 255, 255, 0.46)';
			case 'concept':
				return 'rgba(255, 255, 255, 0.2)';
			case 'semantic':
				return 'rgba(255, 255, 255, 0.1)';
			case 'infrastructure':
				return 'var(--color-data-4, #fbbf24)'; // amber - high visibility for hidden coupling
			default:
				return 'rgba(255, 255, 255, 0.3)';
		}
	}

	function getEdgeStyle(type: string): 'solid' | 'dashed' | 'dotted' {
		switch (type) {
			case 'explicit':
			case 'cross-reference':
				return 'solid';
			case 'concept':
				return 'dashed';
			case 'semantic':
				return 'dotted';
			default:
				return 'solid';
		}
	}

	function getEdgeOpacity(type: string): number {
		switch (type) {
			case 'explicit':
				return 1.0;
			case 'cross-reference':
				return 0.8;
			case 'concept':
				return 0.6;
			case 'semantic':
				return 0.25;
			case 'infrastructure':
				return 0.8; // high visibility - these are hidden coupling
			default:
				return 0.5;
		}
	}

	/**
	 * Initialize Cytoscape instance
	 */
	function initGraph() {
		if (!container || cy) return;

		const elements = convertToElements();

		cy = cytoscape({
			container,
			elements: [...elements.nodes, ...elements.edges],
			style: createStylesheet(),
			layout: getLayoutConfig(focus.mode, focus.nodeId || focus.packageName || focus.conceptName),
			minZoom: 0.1,
			maxZoom: 3,
			wheelSensitivity: 0.2
		});

		// Event handlers
		cy.on('tap', 'node', (evt: EventObject) => {
			const node = evt.target;
			if (onNodeClick) {
				onNodeClick(node.id());
			}
		});

		cy.on('mouseover', 'node', (evt: EventObject) => {
			const node = evt.target;
			if (onNodeHover) {
				onNodeHover(node.id());
			}
		});

		cy.on('mouseout', 'node', () => {
			if (onNodeHover) {
				onNodeHover(null);
			}
		});
	}

	/**
	 * Update graph when data or filters change
	 */
	function updateGraph() {
		if (!cy) return;

		const elements = convertToElements();
		cy.elements().remove();
		cy.add([...elements.nodes, ...elements.edges]);
		cy.layout(getLayoutConfig(focus.mode, focus.nodeId || focus.packageName || focus.conceptName)).run();
	}

	/**
	 * Lifecycle
	 */
	onMount(() => {
		initGraph();
	});

	onDestroy(() => {
		if (cy) {
			cy.destroy();
			cy = null;
		}
	});

	// Reactive updates
	$effect(() => {
		// Update when data, filters, or focus changes
		if (cy && (edgeFilters || showLabels || showEdgeLabels || hideOrphans || focus)) {
			updateGraph();
		}
	});
</script>

<div bind:this={container} class="graph-container"></div>

<style>
	.graph-container {
		width: 100%;
		height: 100%;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}
</style>
