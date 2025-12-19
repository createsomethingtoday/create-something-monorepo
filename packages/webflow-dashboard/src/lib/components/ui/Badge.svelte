<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'outline';
	export type { Variant };

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		variant?: Variant;
		children?: Snippet;
	}

	let {
		variant = 'default',
		class: className = '',
		children,
		...restProps
	}: Props = $props();
</script>

<span class="badge badge-{variant} {className}" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		white-space: nowrap;
	}

	.badge-default {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.badge-secondary {
		background: var(--color-bg-subtle);
		color: var(--color-fg-secondary);
		border-color: var(--color-border-default);
	}

	.badge-success {
		background: var(--color-success-muted);
		color: var(--color-success);
		border-color: var(--color-success-border);
	}

	.badge-warning {
		background: var(--color-warning-muted);
		color: var(--color-warning);
		border-color: var(--color-warning-border);
	}

	.badge-error {
		background: var(--color-error-muted);
		color: var(--color-error);
		border-color: var(--color-error-border);
	}

	.badge-info {
		background: var(--color-info-muted);
		color: var(--color-info);
		border-color: var(--color-info-border);
	}

	.badge-outline {
		background: transparent;
		color: var(--color-fg-secondary);
		border-color: var(--color-border-default);
	}
</style>
