<script lang="ts">
	/**
	 * Empty State Pattern
	 *
	 * Displays when a list or view has no content.
	 * Provides context and often a call-to-action.
	 *
	 * Canon Principle: Empty is not nothing.
	 * An empty state is an invitation, not an error.
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Illustration or icon */
		icon?: Snippet;
		/** Primary message */
		title: string;
		/** Supporting description */
		description?: string;
		/** Optional action button */
		action?: Snippet;
		/** Visual size */
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		icon,
		title,
		description,
		action,
		size = 'md'
	}: Props = $props();
</script>

<!--
	Usage:
	```svelte
	<EmptyState
		title="No projects yet"
		description="Create your first project to get started."
	>
		{#snippet icon()}
			<svg viewBox="0 0 24 24">...</svg>
		{/snippet}

		{#snippet action()}
			<Button>Create Project</Button>
		{/snippet}
	</EmptyState>
	```
-->

<div class="empty-state empty-state--{size}" role="status">
	{#if icon}
		<div class="empty-icon">
			{@render icon()}
		</div>
	{:else}
		<!-- Default icon -->
		<div class="empty-icon empty-icon--default">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<rect x="3" y="3" width="18" height="18" rx="2" />
				<path d="M3 9h18" />
				<path d="M9 21V9" />
			</svg>
		</div>
	{/if}

	<div class="empty-content">
		<h3 class="empty-title">{title}</h3>
		{#if description}
			<p class="empty-description">{description}</p>
		{/if}
	</div>

	{#if action}
		<div class="empty-action">
			{@render action()}
		</div>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--space-performance-xl);
		gap: var(--space-performance-md);
	}

	.empty-state--sm {
		padding: var(--space-performance-lg);
		gap: var(--space-performance-sm);
	}

	.empty-state--lg {
		padding: var(--space-performance-2xl);
		gap: var(--space-performance-lg);
	}

	.empty-icon {
		color: var(--color-performance-fg-muted);
	}

	.empty-icon--default svg {
		width: 48px;
		height: 48px;
	}

	.empty-state--sm .empty-icon--default svg {
		width: 32px;
		height: 32px;
	}

	.empty-state--lg .empty-icon--default svg {
		width: 64px;
		height: 64px;
	}

	.empty-icon :global(svg) {
		width: 48px;
		height: 48px;
	}

	.empty-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		max-width: 320px;
	}

	.empty-title {
		font-size: var(--text-performance-body-lg);
		font-weight: 500;
		color: var(--color-performance-fg-primary);
		margin: 0;
	}

	.empty-state--sm .empty-title {
		font-size: var(--text-performance-body);
	}

	.empty-state--lg .empty-title {
		font-size: var(--text-performance-h3);
	}

	.empty-description {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		margin: 0;
	}

	.empty-state--sm .empty-description {
		font-size: var(--text-performance-body-sm);
	}

	.empty-action {
		margin-top: var(--space-performance-xs);
	}
</style>
