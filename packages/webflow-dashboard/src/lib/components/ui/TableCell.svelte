<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLTdAttributes } from 'svelte/elements';

	interface Props extends HTMLTdAttributes {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<td class="table-cell {className}" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</td>

<style>
	.table-cell {
		padding: 0.45rem 0.7rem;
		vertical-align: middle;
		color: var(--color-fg-secondary);
		border-bottom: 1px solid var(--color-border-default);
		letter-spacing: -0.01em;
		line-height: 1.35;
	}
</style>
