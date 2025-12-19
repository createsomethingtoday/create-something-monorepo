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
		border-radius: var(--radius-xl);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.card-default {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		box-shadow: var(--shadow-sm);
	}

	.card-glass {
		background: color-mix(in srgb, var(--color-bg-surface) 80%, transparent);
		border: 1px solid var(--color-border-default);
		backdrop-filter: blur(16px) saturate(1.5);
		box-shadow: var(--shadow-lg);
	}

	.card-glass:hover {
		background: color-mix(in srgb, var(--color-bg-surface) 90%, transparent);
		box-shadow: var(--shadow-xl);
	}

	.card-elevated {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		box-shadow: var(--shadow-md);
	}

	.card-elevated:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-xl);
	}
</style>
