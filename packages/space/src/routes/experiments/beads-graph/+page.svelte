<script lang="ts">
	import BeadsGraph from '$lib/components/BeadsGraph.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.metadata.title} - CREATE SOMETHING</title>
	<meta name="description" content={data.metadata.description} />
</svelte:head>

<div class="container">
	<header class="experiment-header">
		<a href="/experiments" class="back-link">← Experiments</a>
		<h1>{data.metadata.title}</h1>
		<p class="description">{data.metadata.description}</p>

		<div class="metadata">
			<span class="status status-{data.metadata.status}">{data.metadata.status}</span>
			<span class="date">Started: {data.metadata.dateStarted}</span>
		</div>
	</header>

	<section class="hypothesis">
		<h2>Hypothesis</h2>
		<p>{data.metadata.hypothesis}</p>
	</section>

	<section class="visualization">
		<h2>Visualization</h2>
		<div class="graph-container">
			<BeadsGraph nodes={data.graph.nodes} edges={data.graph.edges} width={1200} height={800} />
		</div>

		<div class="legend">
			<h3>Legend</h3>
			<div class="legend-grid">
				<div class="legend-item">
					<h4>Node Size</h4>
					<ul>
						<li><span class="node-sample p0"></span> P0 - Critical</li>
						<li><span class="node-sample p1"></span> P1 - High</li>
						<li><span class="node-sample p2"></span> P2 - Medium</li>
						<li><span class="node-sample p3"></span> P3 - Low</li>
					</ul>
				</div>

				<div class="legend-item">
					<h4>Node Color (Status)</h4>
					<ul>
						<li><span class="node-sample completed"></span> Completed</li>
						<li><span class="node-sample in-progress"></span> In Progress</li>
						<li><span class="node-sample pending"></span> Pending</li>
					</ul>
				</div>

				<div class="legend-item">
					<h4>Edge Type</h4>
					<ul>
						<li><span class="edge-sample blocks"></span> Blocks</li>
						<li><span class="edge-sample parent"></span> Parent</li>
						<li><span class="edge-sample related"></span> Related</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<section class="findings">
		<h2>Findings</h2>

		<h3>What Works</h3>
		<ul>
			<li>
				<strong>Functional information</strong>: Graph shows actual work structure, not decoration
			</li>
			<li>
				<strong>Canon compliance</strong>: Monochrome with semantic colors (status, priority)
			</li>
			<li><strong>Interaction reveals detail</strong>: Minimal labels, hover for information</li>
			<li>
				<strong>Natural clustering</strong>: Force simulation groups related work (auth, templates,
				beads)
			</li>
		</ul>

		<h3>What to Improve</h3>
		<ul>
			<li>
				<strong>Real data integration</strong>: Currently mock data - needs actual Beads parser
			</li>
			<li>
				<strong>Tooltip on hover</strong>: Show full issue title, description, labels on mouseover
			</li>
			<li><strong>Filtering controls</strong>: Filter by label, status, priority</li>
			<li><strong>Timeline view</strong>: Show how graph evolves over time</li>
		</ul>

		<h3>Canon Reflection</h3>
		<table class="triad-table">
			<thead>
				<tr>
					<th>Principle</th>
					<th>Question</th>
					<th>Answer</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><strong>DRY</strong></td>
					<td>Have I built this before?</td>
					<td>No - visualizes unique Beads structure</td>
				</tr>
				<tr>
					<td><strong>Rams</strong></td>
					<td>Does this earn existence?</td>
					<td>Yes - reveals hidden work dependencies</td>
				</tr>
				<tr>
					<td><strong>Heidegger</strong></td>
					<td>Does this serve the whole?</td>
					<td>Yes - aids planning, identifies bottlenecks</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section class="next-steps">
		<h2>Next Steps</h2>
		<ol>
			<li>
				<strong>Parse real Beads data</strong>: Extract dependencies from
				<code>.beads/issues.jsonl</code>
			</li>
			<li>
				<strong>Add tooltips</strong>: Show issue details on hover using Svelte stores for state
			</li>
			<li><strong>Build filtering UI</strong>: Checkbox groups for labels, status, priority</li>
			<li>
				<strong>Test as background pattern</strong>: Render at 10-20% opacity behind homepage
				content
			</li>
			<li>
				<strong>Measure approachability</strong>: Show to unfamiliar users, ask "What does this
				company do?"
			</li>
		</ol>
	</section>
</div>

<style>
	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--space-xl);
	}

	.experiment-header {
		margin-bottom: var(--space-xl);
	}

	.back-link {
		display: inline-block;
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	h1 {
		font-size: var(--text-h1);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	.metadata {
		display: flex;
		gap: var(--space-md);
		align-items: center;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.status {
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-weight: 500;
		text-transform: uppercase;
		font-size: var(--text-caption);
	}

	.status-active {
		background: var(--color-success-muted);
		color: var(--color-success);
		border: 1px solid var(--color-success-border);
	}

	section {
		margin-bottom: var(--space-2xl);
	}

	h2 {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	h3 {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	h4 {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
		font-weight: 500;
	}

	.hypothesis p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		font-style: italic;
		padding-left: var(--space-md);
		border-left: 2px solid var(--color-border-emphasis);
	}

	.graph-container {
		margin-bottom: var(--space-lg);
		overflow-x: auto;
	}

	.legend {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.legend h3 {
		margin-bottom: var(--space-md);
	}

	.legend-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-lg);
	}

	.legend-item ul {
		list-style: none;
		padding: 0;
	}

	.legend-item li {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.node-sample {
		display: inline-block;
		border-radius: 50%;
		border: 2px solid var(--color-bg-pure);
	}

	.node-sample.p0 {
		width: 24px;
		height: 24px;
		background: var(--color-fg-muted);
	}

	.node-sample.p1 {
		width: 20px;
		height: 20px;
		background: var(--color-fg-muted);
	}

	.node-sample.p2 {
		width: 16px;
		height: 16px;
		background: var(--color-fg-muted);
	}

	.node-sample.p3 {
		width: 12px;
		height: 12px;
		background: var(--color-fg-muted);
	}

	.node-sample.completed {
		width: 16px;
		height: 16px;
		background: var(--color-success);
	}

	.node-sample.in-progress {
		width: 16px;
		height: 16px;
		background: var(--color-fg-primary);
	}

	.node-sample.pending {
		width: 16px;
		height: 16px;
		background: var(--color-fg-muted);
	}

	.edge-sample {
		display: inline-block;
		width: 40px;
		height: 2px;
	}

	.edge-sample.blocks {
		background: var(--color-border-emphasis);
		height: 2px;
	}

	.edge-sample.parent {
		background: var(--color-border-strong);
		height: 1.5px;
	}

	.edge-sample.related {
		background: repeating-linear-gradient(
			to right,
			var(--color-border-default) 0,
			var(--color-border-default) 4px,
			transparent 4px,
			transparent 8px
		);
		height: 1px;
	}

	.findings ul {
		list-style: none;
		padding: 0;
	}

	.findings li {
		margin-bottom: var(--space-sm);
		padding-left: var(--space-md);
		color: var(--color-fg-secondary);
		position: relative;
	}

	.findings li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	.triad-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	.triad-table th,
	.triad-table td {
		padding: var(--space-sm);
		text-align: left;
		border: 1px solid var(--color-border-default);
	}

	.triad-table th {
		background: var(--color-bg-surface);
		color: var(--color-fg-secondary);
		font-weight: 500;
	}

	.triad-table td {
		color: var(--color-fg-tertiary);
	}

	.next-steps ol {
		padding-left: var(--space-lg);
	}

	.next-steps li {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-secondary);
	}

	code {
		background: var(--color-bg-surface);
		padding: 0.125rem 0.25rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}
</style>
