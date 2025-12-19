<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLThAttributes } from 'svelte/elements';

	interface Props extends HTMLThAttributes {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<th class="table-head {className}" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</th>

<style>
	.table-head {
		height: 2.5rem;
		padding: 0.5rem;
		text-align: left;
		vertical-align: middle;
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
	}
</style>
