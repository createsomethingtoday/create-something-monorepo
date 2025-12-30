<script lang="ts">
	/**
	 * Knowledge Graph Route
	 *
	 * Interactive visualization of CREATE SOMETHING's documentation architecture.
	 */

	import { KnowledgeGraph, GraphControls, NodeDetail } from '$lib/graph';
	import type { ViewMode, EdgeFilters, GraphNode } from '$lib/graph';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// State
	let viewMode: ViewMode = $state('full');
	let edgeFilters: EdgeFilters = $state({
		explicit: true,
		crossReference: true,
		concept: true,
		semantic: false, // Semantic edges are dense, start disabled
		infrastructure: true // Infrastructure edges highlight hidden coupling
	});
	let showLabels = $state(true);
	let showEdgeLabels = $state(false);
	let selectedNode: GraphNode | null = $state(null);

	// Handlers
	function handleViewModeChange(mode: ViewMode) {
		viewMode = mode;
	}

	function handleEdgeFilterChange(filters: EdgeFilters) {
		edgeFilters = filters;
	}

	function handleToggleLabels() {
		showLabels = !showLabels;
	}

	function handleToggleEdgeLabels() {
		showEdgeLabels = !showEdgeLabels;
	}

	function handleNodeClick(nodeId: string) {
		const node = data.data.nodes.find((n) => n.id === nodeId);
		if (node) {
			selectedNode = node;
		}
	}

	function handleNodeHover(nodeId: string | null) {
		// Could add hover preview in the future
	}
</script>

<svelte:head>
	<title>Knowledge Graph | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Interactive visualization of the CREATE SOMETHING documentation architecture."
	/>
</svelte:head>

<div class="page">
	<header class="header">
		<h1 class="title">Knowledge Graph</h1>
		<p class="description">
			{data.data.metadata.nodeCount} documents across {Object.keys(data.data.metadata.nodesByPackage).length}
			packages, connected by {data.data.metadata.edgeCount} edges.
		</p>
		<p class="build-info">
			Last built: {new Date(data.data.metadata.builtAt).toLocaleString()}
		</p>
	</header>

	<div class="content">
		<main class="main">
			<div class="graph-wrapper">
				<KnowledgeGraph
					data={data.data}
					focus={{ mode: viewMode }}
					{edgeFilters}
					{showLabels}
					{showEdgeLabels}
					onNodeClick={handleNodeClick}
					onNodeHover={handleNodeHover}
				/>
			</div>

			<!-- Floating controls overlay -->
			<div class="controls-overlay">
				<GraphControls
					{viewMode}
					{edgeFilters}
					{showLabels}
					{showEdgeLabels}
					onViewModeChange={handleViewModeChange}
					onEdgeFilterChange={handleEdgeFilterChange}
					onToggleLabels={handleToggleLabels}
					onToggleEdgeLabels={handleToggleEdgeLabels}
				/>
			</div>

			<!-- Floating detail panel -->
			{#if selectedNode}
				<div class="detail-overlay">
					<NodeDetail node={selectedNode} />
					<button class="close-btn" onclick={() => (selectedNode = null)}>×</button>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.header {
		padding: var(--space-sm) var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.title {
		font-size: var(--text-h2);
		margin: 0 0 var(--space-xs) 0;
		color: var(--color-fg-primary);
	}

	.description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.build-info {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.content {
		flex: 1;
		overflow: hidden;
	}

	.main {
		position: relative;
		height: 100%;
	}

	.graph-wrapper {
		width: 100%;
		height: 100%;
	}

	/* Floating controls panel */
	.controls-overlay {
		position: absolute;
		top: var(--space-md);
		left: var(--space-md);
		max-width: 240px;
		max-height: calc(100% - var(--space-lg) * 2);
		overflow-y: auto;
		z-index: 10;
	}

	/* Floating detail panel */
	.detail-overlay {
		position: absolute;
		top: var(--space-md);
		right: var(--space-md);
		width: 300px;
		max-height: calc(100% - var(--space-lg) * 2);
		overflow-y: auto;
		z-index: 10;
	}

	.close-btn {
		position: absolute;
		top: var(--space-xs);
		right: var(--space-xs);
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		font-size: 16px;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.close-btn:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	/* Responsive - stack on mobile */
	@media (max-width: 768px) {
		.controls-overlay {
			top: auto;
			bottom: var(--space-md);
			left: var(--space-md);
			right: var(--space-md);
			max-width: none;
			max-height: 40vh;
		}

		.detail-overlay {
			top: var(--space-md);
			left: var(--space-md);
			right: var(--space-md);
			width: auto;
			max-height: 40vh;
		}
	}
</style>
