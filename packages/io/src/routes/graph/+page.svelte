<script lang="ts">
	/**
	 * Knowledge Graph Route
	 *
	 * Interactive visualization of CREATE SOMETHING's documentation architecture.
	 */

	import { KnowledgeGraph, GraphControls, NodeDetail, GraphLegend } from '$lib/graph';
	import type { ViewMode, EdgeFilters, GraphNode } from '$lib/graph';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// State
	let viewMode: ViewMode = $state('full');
	let edgeFilters: EdgeFilters = $state({
		explicit: true,
		crossReference: true,
		concept: true,
		semantic: false // Semantic edges are dense, start disabled
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
		<aside class="sidebar">
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

			<GraphLegend />
		</aside>

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
		</main>

		<aside class="detail">
			<NodeDetail node={selectedNode} />
		</aside>
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
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.title {
		font-size: var(--text-h1);
		margin: 0 0 var(--space-xs) 0;
		color: var(--color-fg-primary);
	}

	.description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xs) 0;
	}

	.build-info {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.content {
		display: grid;
		grid-template-columns: 280px 1fr 320px;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		flex: 1;
		overflow: hidden;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		overflow-y: auto;
	}

	.main {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.graph-wrapper {
		flex: 1;
		min-height: 0;
	}

	.detail {
		overflow-y: auto;
	}

	/* Responsive */
	@media (max-width: 1200px) {
		.content {
			grid-template-columns: 240px 1fr;
			grid-template-rows: 1fr auto;
		}

		.detail {
			grid-column: 1 / -1;
			max-height: 300px;
		}
	}

	@media (max-width: 768px) {
		.content {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr auto;
		}

		.sidebar {
			max-height: 200px;
		}
	}
</style>
