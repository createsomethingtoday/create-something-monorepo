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
		selectedNodeId?: string;
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
		selectedNodeId,
		onNodeClick,
		onNodeHover
	}: Props = $props();

	let container: HTMLDivElement;
	let cy: Core | null = null;

	/**
	 * Convert graph data to Cytoscape elements
	 */
	function convertToElements() {
		const focusedNodes =
			focus.mode === 'package' && focus.packageName
				? data.nodes.filter((node) => node.package === focus.packageName)
				: focus.mode === 'concept' && focus.conceptName
					? data.nodes.filter((node) => node.concepts.includes(focus.conceptName!))
					: data.nodes;
		const focusedNodeIds = new Set(focusedNodes.map((node) => node.id));

		// First, filter edges based on edge type filters
		const filteredEdges = data.edges.filter((edge) => {
			if (!focusedNodeIds.has(edge.source) || !focusedNodeIds.has(edge.target)) return false;
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
		const nodes = focusedNodes
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
				return 'rgba(27, 31, 35, 0.72)';
			case 'cross-reference':
				return 'rgba(27, 31, 35, 0.56)';
			case 'concept':
				return 'rgba(27, 31, 35, 0.34)';
			case 'semantic':
				return 'rgba(27, 31, 35, 0.22)';
			case 'infrastructure':
				return 'var(--color-performance-data-4, #fbbf24)'; // amber - high visibility for hidden coupling
			default:
				return 'rgba(27, 31, 35, 0.42)';
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
			maxZoom: 3
		});
		if (selectedNodeId) cy.getElementById(selectedNodeId).select();

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

	$effect(() => {
		const nodeId = selectedNodeId;
		if (!cy) return;
		cy.nodes().unselect();
		if (nodeId) cy.getElementById(nodeId).select();
	});
</script>

<div
	bind:this={container}
	class="graph-container"
	role="img"
	aria-label={selectedNodeId
		? `Document connection map. Selected document: ${selectedNodeId}. Use the search before the map for keyboard access.`
		: 'Document connection map. Use the search before the map to choose a document with a keyboard.'}
></div>

<style>
	.graph-container {
		width: 100%;
		height: 100%;
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-md);
	}
</style>
