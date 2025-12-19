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
		font-family: var(--webflow-font-medium);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		white-space: nowrap;
	}

	.badge-default {
		background: var(--webflow-bg-hover);
		color: var(--webflow-fg-secondary);
	}

	.badge-success {
		background: color-mix(in srgb, var(--webflow-success) 15%, transparent);
		color: var(--webflow-success);
	}

	.badge-warning {
		background: color-mix(in srgb, var(--webflow-warning) 15%, transparent);
		color: var(--webflow-warning);
	}

	.badge-error {
		background: color-mix(in srgb, var(--webflow-error) 15%, transparent);
		color: var(--webflow-error);
	}

	.badge-info {
		background: color-mix(in srgb, var(--webflow-blue) 15%, transparent);
		color: var(--webflow-blue);
	}

	.badge-webflow {
		background: var(--webflow-blue);
		color: #ffffff;
	}
</style>
