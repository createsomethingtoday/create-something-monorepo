<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLHeadingElement> {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<h3 class="card-title {className}" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</h3>

<style>
	.card-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		line-height: 1.2;
		margin: 0;
	}
</style>
