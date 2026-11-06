<script lang="ts">
	import { onMount } from 'svelte';
	import { GraphControls, GraphLegend, KnowledgeGraph, NodeDetail } from '$lib/graph';
	import type { EdgeFilters, GraphData, GraphEdge, GraphNode, ViewMode } from '$lib/graph';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let graphData: GraphData | null = $state(null);
	let loadState: 'idle' | 'loading' | 'ready' | 'error' = $state('idle');
	let search = $state('');
	let viewMode: ViewMode = $state('full');
	let edgeFilters: EdgeFilters = $state({
		explicit: true,
		crossReference: true,
		concept: true,
		semantic: false,
		infrastructure: true
	});
	let showLabels = $state(true);
	let showEdgeLabels = $state(false);
	let hideOrphans = $state(true);
	let selectedNode: GraphNode | null = $state(null);
	const graphFocus = $derived.by(() => {
		if (viewMode === 'package') {
			return { mode: viewMode, nodeId: selectedNode?.id, packageName: selectedNode?.package ?? undefined };
		}
		if (viewMode === 'concept') {
			return { mode: viewMode, conceptName: selectedNode?.concepts[0] };
		}
		return { mode: viewMode };
	});

	const builtAt = $derived(new Date(data.metadata.builtAt));
	const ageInDays = $derived(Math.max(0, Math.floor((Date.now() - builtAt.getTime()) / 86_400_000)));

	async function loadGraph() {
		loadState = 'loading';
		try {
			const [nodesResponse, edgesResponse] = await Promise.all([
				fetch('/api/graph/nodes'),
				fetch('/api/graph/edges')
			]);
			if (!nodesResponse.ok || !edgesResponse.ok) throw new Error('Graph files unavailable');
			const [nodes, edges] = await Promise.all([
				nodesResponse.json() as Promise<GraphNode[]>,
				edgesResponse.json() as Promise<GraphEdge[]>
			]);
			graphData = { nodes, edges, metadata: data.metadata };
			loadState = 'ready';
		} catch {
			graphData = null;
			loadState = 'error';
		}
	}

	function searchResults(): GraphNode[] {
		if (!graphData) return [];
		const query = search.trim().toLowerCase();
		if (!query) return [];
		return graphData.nodes
			.filter((node) =>
				[node.title, node.id, node.package ?? '', node.type, ...node.concepts]
					.join(' ')
					.toLowerCase()
					.includes(query)
			)
			.slice(0, 8);
	}

	function selectNode(node: GraphNode) {
		selectedNode = node;
		search = node.title;
	}

	function handleNodeClick(nodeId: string) {
		const node = graphData?.nodes.find((candidate) => candidate.id === nodeId);
		if (node) selectNode(node);
	}

	function handleViewModeChange(mode: ViewMode) {
		viewMode = mode;
	}

	onMount(() => {
		void loadGraph();
	});
</script>

<svelte:head>
	<title>Document Connections | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Choose a repository document, inspect what connects to it, and open the source evidence."
	/>
</svelte:head>

<div class="tool-page">
	<section class="chapter task-state" data-performance-chapter="task-state">
		<p class="eyebrow">Repository map</p>
		<h1>Find what a document connects to.</h1>
		<p class="lede">
			Search for a document. Select it to see related documents and shared systems, then open the
			source to verify what you found.
		</p>
		<div class="snapshot" aria-label="Graph snapshot details">
			<span>{data.metadata.nodeCount} documents</span>
			<span>{data.metadata.edgeCount.toLocaleString()} connections</span>
			<span>Built {builtAt.toLocaleDateString()} · {ageInDays} days old</span>
		</div>
		{#if ageInDays > 30}
			<p class="notice">This is an older snapshot. Confirm important decisions in the linked source.</p>
		{/if}
	</section>

	<section class="chapter workspace" data-performance-chapter="workspace">
		<div class="workspace-heading">
			<div>
				<p class="eyebrow">Start here</p>
				<h2>Choose a document</h2>
			</div>
			{#if loadState === 'error'}
				<button class="secondary" type="button" onclick={loadGraph}>Retry graph</button>
			{/if}
		</div>
		<noscript>
			<div class="state-card">
				The visual map needs JavaScript. Skip to “Verify the result” to open the document,
				connection, and build source files directly.
			</div>
		</noscript>

		<label class="search-label" for="document-search">Search documents</label>
		<input
			id="document-search"
			type="search"
			placeholder="Try “policy”, “auth”, or a file path"
			bind:value={search}
			disabled={loadState !== 'ready'}
			autocomplete="off"
		/>

		<div class="search-results" data-graph-results aria-live="polite">
			{#if search.trim() && searchResults().length > 0}
				{#each searchResults() as node}
					<button type="button" class="result" onclick={() => selectNode(node)}>
						<strong>{node.title}</strong>
						<span>{node.id}</span>
					</button>
				{/each}
			{:else if search.trim() && loadState === 'ready'}
				<p>No matching documents. Try a shorter term or file path.</p>
			{/if}
		</div>

		{#if loadState === 'loading'}
			<div class="state-card" aria-live="polite">Loading document connections…</div>
		{:else if loadState === 'error'}
			<div class="state-card error" role="alert">
				The visual map could not load. Retry it, or use the source files below.
			</div>
		{:else if graphData}
			<div class="graph-workspace">
				<div class="graph-canvas">
					<KnowledgeGraph
						data={graphData}
						focus={graphFocus}
						{edgeFilters}
						{showLabels}
						{showEdgeLabels}
						{hideOrphans}
						selectedNodeId={selectedNode?.id}
						onNodeClick={handleNodeClick}
					/>
				</div>
				<aside class="controls" aria-label="Map controls">
					<GraphControls
						{viewMode}
						{edgeFilters}
						{showLabels}
						{showEdgeLabels}
						{hideOrphans}
						canFocus={!!selectedNode}
						onViewModeChange={handleViewModeChange}
						onEdgeFilterChange={(filters) => (edgeFilters = filters)}
						onToggleLabels={() => (showLabels = !showLabels)}
						onToggleEdgeLabels={() => (showEdgeLabels = !showEdgeLabels)}
						onToggleHideOrphans={() => (hideOrphans = !hideOrphans)}
					/>
				</aside>
			</div>
		{/if}
	</section>

	<section class="chapter receipt" data-performance-chapter="decision-receipt">
		<div class="receipt-grid">
			<div>
				<p class="eyebrow">Verify the result</p>
				{#if selectedNode}
					<div class="detail-shell">
						<button
							class="close"
							type="button"
							aria-label="Close document details"
							onclick={() => (selectedNode = null)}>×</button
						>
						<NodeDetail node={selectedNode} />
					</div>
				{:else}
					<h2>No document selected yet</h2>
					<p>Use the search above. The selected document’s path, date, concepts, and source link appear here.</p>
				{/if}
			</div>
			<details>
				<summary>What the colors and lines mean</summary>
				<GraphLegend />
			</details>
		</div>

		<noscript>
			<p>The interactive map needs JavaScript. You can still inspect its three source files:</p>
		</noscript>
		<div class="source-links" aria-label="Graph source files">
			<a href="/api/graph/nodes">Documents JSON</a>
			<a href="/api/graph/edges">Connections JSON</a>
			<a href="/api/graph/metadata">Build details JSON</a>
		</div>
	</section>
</div>

<style>
	.tool-page { max-width: 1440px; margin: 0 auto; padding: 0 var(--space-performance-md) var(--space-performance-2xl); }
	.chapter { padding: clamp(2rem, 5vw, 4.5rem) 0; border-bottom: 1px solid var(--color-performance-border-default); }
	.chapter:last-child { border-bottom: 0; }
	.task-state { max-width: 880px; }
	.eyebrow { margin: 0 0 .65rem; color: var(--color-performance-fg-muted); font-size: var(--text-performance-caption); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
	h1 { max-width: 760px; margin: 0; font-size: clamp(2.5rem, 7vw, 5.5rem); line-height: .96; letter-spacing: -.055em; }
	h2 { margin: 0; font-size: clamp(1.65rem, 3vw, 2.5rem); letter-spacing: -.035em; }
	.lede { max-width: 700px; margin: 1.4rem 0 0; color: var(--color-performance-fg-secondary); font-size: var(--text-performance-body-lg); line-height: 1.55; }
	.snapshot { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; margin-top: 1.5rem; color: var(--color-performance-fg-muted); font-size: var(--text-performance-body-sm); }
	.notice, .state-card { margin: 1rem 0 0; padding: .9rem 1rem; border-left: 3px solid var(--color-performance-data-4, #9a6b00); background: var(--color-performance-bg-subtle); color: var(--color-performance-fg-secondary); }
	.workspace-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
	.search-label { display: block; margin-bottom: .45rem; font-weight: 650; }
	input[type='search'] { width: min(100%, 760px); min-height: 48px; padding: .7rem .9rem; border: 1px solid var(--color-performance-border-strong); border-radius: var(--radius-performance-scale-sm); background: var(--color-performance-bg-surface); color: var(--color-performance-fg-primary); font: inherit; }
	.search-results { display: grid; width: min(100%, 760px); gap: .35rem; margin-top: .5rem; }
	.result { display: flex; flex-direction: column; gap: .2rem; padding: .7rem .8rem; border: 1px solid var(--color-performance-border-default); background: var(--color-performance-bg-surface); color: var(--color-performance-fg-primary); text-align: left; cursor: pointer; }
	.result span { overflow-wrap: anywhere; color: var(--color-performance-fg-muted); font-size: var(--text-performance-caption); }
	.secondary, .source-links a { min-height: 44px; padding: .65rem .85rem; border: 1px solid var(--color-performance-border-strong); color: var(--color-performance-fg-primary); background: var(--color-performance-bg-surface); text-decoration: none; cursor: pointer; }
	.state-card { min-height: 100px; margin-top: 1.5rem; }
	.state-card.error { border-left-color: var(--color-performance-error); }
	.graph-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 1rem; margin-top: 1.5rem; }
	.graph-canvas { min-height: 650px; border: 1px solid var(--color-performance-border-default); border-radius: var(--radius-performance-scale-md); overflow: hidden; }
	.controls { align-self: start; }
	.receipt-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .6fr); gap: clamp(1.5rem, 5vw, 4rem); }
	.detail-shell { position: relative; }
	.close { position: absolute; z-index: 2; top: .5rem; right: .5rem; width: 44px; height: 44px; border: 1px solid var(--color-performance-border-default); border-radius: 50%; background: var(--color-performance-bg-surface); color: var(--color-performance-fg-primary); font-size: 1.35rem; cursor: pointer; }
	details summary { min-height: 44px; cursor: pointer; font-weight: 650; }
	.source-links { display: flex; flex-wrap: wrap; gap: .65rem; margin-top: 1.5rem; }

	@media (max-width: 820px) {
		.graph-workspace, .receipt-grid { grid-template-columns: 1fr; }
		.graph-canvas { min-height: 480px; }
		.controls { order: -1; }
	}
</style>
