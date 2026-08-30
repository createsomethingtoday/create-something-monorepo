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

	function sourceUrl(path: string): string | null {
		if (!path || path.startsWith('/') || path.includes('..')) return null;
		const safePath = path.split('/').map(encodeURIComponent).join('/');
		return `https://github.com/createsomethingtoday/create-something-monorepo/blob/main/${safePath}`;
	}
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
			{#if sourceUrl(node.id)}
				<a class="source-link" href={sourceUrl(node.id) ?? undefined} target="_blank" rel="noreferrer">
					Open source <span aria-hidden="true">↗</span>
				</a>
			{/if}
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
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		overflow-y: auto;
	}

	.detail-panel.empty {
		justify-content: center;
		align-items: center;
		min-height: 200px;
	}

	.empty-message {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
	}

	.detail-header {
		padding-bottom: var(--space-performance-md);
	}

	.detail-title {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-primary);
		margin: 0 0 var(--space-performance-xs) 0;
	}

	.detail-meta {
		display: flex;
		gap: var(--space-performance-xs);
		flex-wrap: wrap;
	}

	.meta-item {
		padding: 2px var(--space-performance-xs);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-secondary);
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-sm);
	}

	.meta-item.package {
		color: var(--color-performance-data-1);
		border-color: var(--color-performance-data-1);
		background: var(--color-performance-data-1-muted);
	}

	.detail-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
		padding-top: var(--space-performance-md);
	}

	.source-link {
		display: inline-flex;
		align-self: flex-start;
		min-height: 44px;
		align-items: center;
		gap: var(--space-performance-xs);
		color: var(--color-performance-fg-primary);
		text-underline-offset: 3px;
	}

	.detail-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.section-title {
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
		color: var(--color-performance-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.path {
		font-family: 'Geist Mono', 'SF Mono', Monaco, monospace;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		background: var(--color-performance-bg-subtle);
		padding: var(--space-performance-xs);
		border-radius: var(--radius-performance-scale-sm);
		word-break: break-all;
	}

	.concept-list {
		display: flex;
		gap: var(--space-performance-xs);
		flex-wrap: wrap;
	}

	.concept-tag {
		padding: 2px var(--space-performance-xs);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-data-3);
		background: var(--color-performance-data-3-muted);
		border: 1px solid var(--color-performance-data-3-border);
		border-radius: var(--radius-performance-scale-sm);
	}

	.metadata-list {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--space-performance-xs) var(--space-performance-sm);
		font-size: var(--text-performance-body-sm);
	}

	.metadata-list dt {
		color: var(--color-performance-fg-muted);
	}

	.metadata-list dd {
		color: var(--color-performance-fg-secondary);
		margin: 0;
	}

	.metadata-list code {
		font-family: 'Geist Mono', 'SF Mono', Monaco, monospace;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-tertiary);
	}
</style>
