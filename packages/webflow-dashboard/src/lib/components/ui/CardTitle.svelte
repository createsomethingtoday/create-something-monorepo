<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLHeadingElement> {
		children: Snippet;
	}

	let { children, class: className = '', ...restProps }: Props = $props();
</script>

<h3 class="card-title {className}" {...restProps}>
	{@render children()}
</h3>

<style>
	.card-title {
		font-family: var(--webflow-font-medium);
		font-weight: 600;
		font-size: 1.125rem;
		line-height: 1.4;
		color: var(--webflow-fg-primary);
		margin: 0;
	}
</style>
