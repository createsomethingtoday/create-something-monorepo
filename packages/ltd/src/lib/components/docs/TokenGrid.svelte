<script lang="ts">
	/**
	 * TokenGrid - Container for displaying grouped TokenSwatches
	 *
	 * Organizes tokens into a grid with optional title.
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		columns?: 1 | 2 | 3 | 4;
		compact?: boolean;
		children?: Snippet;
	}

	let { title, columns = 2, compact = false, children }: Props = $props();
</script>

<div class="grid" class:compact>
	{#if title}
		<h4 class="title">{title}</h4>
	{/if}
	<div class="tokens" style="--columns: {columns};">
		{@render children?.()}
	</div>
</div>

<style>
	.grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.title {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.tokens {
		display: grid;
		grid-template-columns: repeat(var(--columns), 1fr);
		gap: var(--space-sm);
	}

	.compact .tokens {
		gap: var(--space-xs);
	}
</style>
