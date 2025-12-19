<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Variant = 'default' | 'glass' | 'elevated';

	interface Props extends HTMLAttributes<HTMLDivElement> {
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

<div class="card card-{variant} {className}" {...restProps}>
	{@render children()}
</div>

<style>
	.card {
		border-radius: var(--webflow-radius-xl);
		transition: all var(--webflow-duration) var(--webflow-ease);
	}

	.card-default {
		background: var(--webflow-bg-surface);
		border: 1px solid var(--webflow-border);
		box-shadow: var(--webflow-shadow-sm);
	}

	.card-glass {
		background: color-mix(in srgb, var(--webflow-bg-surface) 80%, transparent);
		border: 1px solid var(--webflow-border);
		backdrop-filter: blur(16px) saturate(1.5);
		box-shadow: var(--webflow-shadow-lg);
	}

	.card-glass:hover {
		background: color-mix(in srgb, var(--webflow-bg-surface) 90%, transparent);
		box-shadow: var(--webflow-shadow-xl);
	}

	.card-elevated {
		background: var(--webflow-bg-surface);
		border: 1px solid var(--webflow-border);
		box-shadow: var(--webflow-shadow-md);
	}

	.card-elevated:hover {
		transform: translateY(-4px);
		box-shadow: var(--webflow-shadow-xl);
	}
</style>
