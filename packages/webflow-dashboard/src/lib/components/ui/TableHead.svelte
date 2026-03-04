<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLThAttributes } from 'svelte/elements';

	interface Props extends HTMLThAttributes {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<th class="table-head {className}" {...restProps}>
	<div class="table-head-inner">
		{#if children}
			{@render children()}
		{/if}
	</div>
</th>

<style>
	.table-head {
		height: 2.5rem;
		padding: 0.25rem;
		text-align: left;
		vertical-align: middle;
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		border-bottom: 1px solid var(--color-border-default);
	}

	.table-head-inner {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		height: 100%;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.table-head:hover .table-head-inner {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
	}

	.table-head:focus-within .table-head-inner {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		outline: 1px solid var(--color-focus);
		outline-offset: -1px;
	}
</style>
