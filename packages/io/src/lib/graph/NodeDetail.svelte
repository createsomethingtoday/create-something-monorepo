<script lang="ts">
	/**
	 * NodeDetail Component
	 *
	 * Detail panel showing selected node information.
	 */

	import type { GraphNode } from './types.js';

	interface Props {
		node: GraphNode | null;
	}

	let { node }: Props = $props();
</script>

{#if node}
	<div class="detail-panel">
		<div class="detail-header">
			<h2 class="detail-title">{node.title}</h2>
			<div class="detail-meta">
				<span class="meta-item package">
					{node.package ?? 'root'}
				</span>
				<span class="meta-item type">{node.type}</span>
				<span class="meta-item words">{node.wordCount} words</span>
			</div>
		</div>

		<div class="detail-body">
			<div class="detail-section">
				<h3 class="section-title">Path</h3>
				<code class="path">{node.id}</code>
			</div>

			{#if node.concepts.length > 0}
				<div class="detail-section">
					<h3 class="section-title">Concepts</h3>
					<div class="concept-list">
						{#each node.concepts as concept}
							<span class="concept-tag">{concept}</span>
						{/each}
					</div>
				</div>
			{/if}

			<div class="detail-section">
				<h3 class="section-title">Metadata</h3>
				<dl class="metadata-list">
					<dt>Last modified</dt>
					<dd>{new Date(node.lastModified).toLocaleDateString()}</dd>
					<dt>Hash</dt>
					<dd><code>{node.hash}</code></dd>
				</dl>
			</div>
		</div>
	</div>
{:else}
	<div class="detail-panel empty">
		<p class="empty-message">Click a node to view details</p>
	</div>
{/if}

<style>
	.detail-panel {
		display: flex;
		flex-direction: column;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow-y: auto;
	}

	.detail-panel.empty {
		justify-content: center;
		align-items: center;
		min-height: 200px;
	}

	.empty-message {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.detail-header {
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.detail-title {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.detail-meta {
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}

	.meta-item {
		padding: 2px var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
	}

	.meta-item.package {
		color: var(--color-data-1);
		border-color: var(--color-data-1);
		background: var(--color-data-1-muted);
	}

	.detail-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding-top: var(--space-md);
	}

	.detail-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.section-title {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.path {
		font-family: 'Geist Mono', 'SF Mono', Monaco, monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		background: var(--color-bg-subtle);
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		word-break: break-all;
	}

	.concept-list {
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}

	.concept-tag {
		padding: 2px var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-data-3);
		background: var(--color-data-3-muted);
		border: 1px solid var(--color-data-3-border);
		border-radius: var(--radius-sm);
	}

	.metadata-list {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
	}

	.metadata-list dt {
		color: var(--color-fg-muted);
	}

	.metadata-list dd {
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.metadata-list code {
		font-family: 'Geist Mono', 'SF Mono', Monaco, monospace;
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}
</style>
