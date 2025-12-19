<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<div class="tabs-list {className}" role="tablist" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.tabs-list {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}
</style>
