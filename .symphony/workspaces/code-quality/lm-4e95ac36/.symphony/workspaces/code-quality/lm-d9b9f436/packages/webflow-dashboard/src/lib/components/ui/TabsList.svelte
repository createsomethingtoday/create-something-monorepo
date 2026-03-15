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
		gap: 0;
		padding: 0;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}
</style>
