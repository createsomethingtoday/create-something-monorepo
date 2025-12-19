<script lang="ts">
	import { Search, X } from 'lucide-svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		value?: string;
		placeholder?: string;
		onchange?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		placeholder = 'Search...',
		onchange,
		class: className = '',
		...restProps
	}: Props = $props();

	let debounceTimeout: number | undefined = $state(undefined);

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;

		if (onchange) {
			if (debounceTimeout) clearTimeout(debounceTimeout);
			debounceTimeout = window.setTimeout(() => {
				onchange?.(value);
			}, 300);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			value = '';
			if (onchange) {
				if (debounceTimeout) clearTimeout(debounceTimeout);
				onchange('');
			}
		}
	}

	function clear() {
		value = '';
		if (onchange) {
			if (debounceTimeout) clearTimeout(debounceTimeout);
			onchange('');
		}
	}
</script>

<div class="search-input-wrapper {className}">
	<Search class="search-icon" size={18} />
	<input
		type="text"
		class="search-input"
		{placeholder}
		value={value}
		oninput={handleInput}
		onkeydown={handleKeydown}
		{...restProps}
	/>
	{#if value}
		<button class="clear-button" onclick={clear} aria-label="Clear search" type="button">
			<X size={18} />
		</button>
	{/if}
</div>

<style>
	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.search-input {
		width: 100%;
		height: 2.5rem;
		padding-left: 2.5rem;
		padding-right: 2.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-family: var(--font-sans);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.search-input::placeholder {
		color: var(--color-fg-muted);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--webflow-blue);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--webflow-blue) 15%, transparent);
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		color: var(--color-fg-muted);
		pointer-events: none;
	}

	.clear-button {
		position: absolute;
		right: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.clear-button:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.clear-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
