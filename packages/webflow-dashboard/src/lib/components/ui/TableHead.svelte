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
		height: 2.15rem;
		padding: 0.15rem 0.25rem;
		text-align: left;
		vertical-align: middle;
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		border-bottom: 1px solid var(--color-border-emphasis);
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.table-head-inner {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		height: 100%;
		padding: 0.15rem 0.45rem;
		border-radius: var(--radius-sm, 4px);
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.table-head:hover .table-head-inner {
		background: transparent;
		color: var(--color-fg-primary);
	}

	.table-head:focus-within .table-head-inner {
		background: transparent;
		color: var(--color-fg-primary);
		outline: 1px solid var(--color-focus);
		outline-offset: -1px;
	}
</style>
