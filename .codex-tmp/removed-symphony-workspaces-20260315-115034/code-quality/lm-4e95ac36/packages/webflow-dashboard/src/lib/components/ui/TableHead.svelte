<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLThAttributes } from 'svelte/elements';

	interface Props extends HTMLThAttributes {
		align?: 'left' | 'center' | 'right';
		children?: Snippet;
	}

	let { align = 'left', class: className = '', children, ...restProps }: Props = $props();
</script>

<th class="table-head align-{align} {className}" {...restProps}>
	<div class="table-head-inner">
		{#if children}
			{@render children()}
		{/if}
	</div>
</th>

<style>
	.table-head {
		height: 2rem;
		padding: 0.1rem 0.2rem;
		text-align: left;
		vertical-align: middle;
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		border-bottom: 1px solid var(--color-border-emphasis);
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.035em;
	}

	.table-head-inner {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		height: 100%;
		width: 100%;
		padding: 0.1rem 0.5rem;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.table-head.align-center {
		text-align: center;
	}

	.table-head.align-right {
		text-align: right;
	}

	.table-head.align-center .table-head-inner {
		justify-content: center;
	}

	.table-head.align-right .table-head-inner {
		justify-content: flex-end;
	}

	.table-head:hover .table-head-inner {
		background: transparent;
		color: var(--color-fg-secondary);
	}

	.table-head:focus-within .table-head-inner {
		background: transparent;
		color: var(--color-fg-primary);
		outline: 1px solid var(--color-focus);
		outline-offset: -1px;
	}
</style>
