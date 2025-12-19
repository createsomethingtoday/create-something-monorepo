<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		value: string;
		active?: boolean;
		children?: Snippet;
	}

	let {
		value,
		active = false,
		class: className = '',
		children,
		...restProps
	}: Props = $props();
</script>

<button
	type="button"
	role="tab"
	class="tabs-trigger {className}"
	class:active
	data-value={value}
	aria-selected={active}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</button>

<style>
	.tabs-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem 0.75rem;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		white-space: nowrap;
	}

	.tabs-trigger:hover:not(.active) {
		color: var(--color-fg-secondary);
	}

	.tabs-trigger.active {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		box-shadow: var(--shadow-sm);
	}

	.tabs-trigger:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.tabs-trigger:disabled {
		opacity: 0.5;
		pointer-events: none;
	}
</style>
