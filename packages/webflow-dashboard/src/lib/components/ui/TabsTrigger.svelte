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
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		min-height: 2.75rem;
		padding: 0.5rem 0.85rem;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
		cursor: pointer;
		transition:
			color var(--duration-micro) var(--ease-standard),
			background-color var(--duration-micro) var(--ease-standard);
		white-space: nowrap;
	}

	.tabs-trigger:hover:not(.active) {
		color: var(--color-fg-primary);
		background: var(--color-bg-subtle);
	}

	.tabs-trigger.active {
		color: var(--color-fg-primary);
	}

	/* Without the sliding rule (no JS), the selected tab draws its own. */
	:global(.tabs-list:not(.has-indicator)) .tabs-trigger.active {
		box-shadow: inset 0 -2px 0 var(--color-info);
	}

	.tabs-trigger:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}

	.tabs-trigger:disabled {
		opacity: 0.5;
		pointer-events: none;
	}
</style>
