<script lang="ts">
	/**
	 * FlowGrid Component
	 *
	 * Visualizes directional flows between entities (e.g., cross-property navigation).
	 * Implements Tufte's principle: "Show the data" with minimal decoration.
	 *
	 * Agentic behavior:
	 * - Arrow is CSS-only (structural, not decorative DOM element)
	 * - Handles empty state gracefully
	 * - Sorts by count descending by default
	 */

	interface FlowItem {
		source: string;
		target: string;
		count: number;
	}

	interface Props {
		/** Flow data with source, target, count */
		items: FlowItem[];
		/** Maximum items to display */
		limit?: number;
		/** Prefix for labels (e.g., "." for ".space") */
		labelPrefix?: string;
		/** Message when no data */
		emptyMessage?: string;
	}

	let {
		items,
		limit = 10,
		labelPrefix = '',
		emptyMessage = 'No flow data yet',
	}: Props = $props();

	// Agentic: sort by count, slice to limit
	const displayItems = $derived(
		[...items]
			.sort((a, b) => b.count - a.count)
			.slice(0, limit)
	);
</script>

{#if displayItems.length === 0}
	<p class="empty">{emptyMessage}</p>
{:else}
	<div class="flow-grid">
		{#each displayItems as flow}
			<div class="flow-item">
				<span class="flow-source">{labelPrefix}{flow.source}</span>
				<span class="flow-target">{labelPrefix}{flow.target}</span>
				<span class="flow-count">{flow.count}</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.flow-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm, 1rem);
	}

	.flow-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm, 1rem);
		padding: var(--space-xs, 0.5rem) var(--space-sm, 1rem);
		background: var(--color-bg-subtle, #1a1a1a);
		border-radius: var(--radius-md, 8px);
	}

	.flow-source {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		min-width: 4rem;
	}

	.flow-source::after {
		content: '→';
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		margin-left: var(--space-sm, 1rem);
	}

	.flow-target {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-primary, #ffffff);
		min-width: 4rem;
	}

	.flow-count {
		margin-left: auto;
		font-family: var(--font-mono, monospace);
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.empty {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-size: var(--text-body-sm, 0.875rem);
	}
</style>
