<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'webflow';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		variant?: Variant;
		children: Snippet;
	}

	let {
		variant = 'default',
		children,
		class: className = '',
		...restProps
	}: Props = $props();
</script>

<span class="badge badge-{variant} {className}" {...restProps}>
	{@render children()}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		font-family: var(--font-sans);
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		line-height: 1;
		padding: 0.25rem 0.625rem;
		border-radius: var(--radius-full);
		white-space: nowrap;
	}

	.badge-default {
		background: var(--color-hover);
		color: var(--color-fg-secondary);
	}

	.badge-success {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.badge-warning {
		background: var(--color-warning-muted);
		color: var(--color-warning);
	}

	.badge-error {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.badge-info {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	.badge-webflow {
		background: var(--webflow-blue);
		color: #ffffff;
	}
</style>
