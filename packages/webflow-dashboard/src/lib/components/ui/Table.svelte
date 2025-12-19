<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLTableAttributes } from 'svelte/elements';

	interface Props extends HTMLTableAttributes {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<div class="table-wrapper">
	<table class="table {className}" {...restProps}>
		{#if children}
			{@render children()}
		{/if}
	</table>
</div>

<style>
	.table-wrapper {
		position: relative;
		width: 100%;
		overflow-x: auto;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}
</style>
