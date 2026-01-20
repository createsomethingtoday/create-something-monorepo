<script lang="ts">
	import { Search as SearchIcon, X } from 'lucide-svelte';

	interface Props {
		onSearch?: (term: string) => void;
		placeholder?: string;
	}

	let {
		onSearch,
		placeholder = 'Search templates...'
	}: Props = $props();

	let searchTerm = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		searchTerm = target.value;

		// Debounce search
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		debounceTimer = setTimeout(() => {
			onSearch?.(searchTerm);
		}, 300);
	}

	function handleClear() {
		searchTerm = '';
		onSearch?.('');
	}
</script>

<div class="search-wrapper">
	<SearchIcon class="search-icon" size={16} />
	<input
		type="text"
		class="search-input"
		{placeholder}
		value={searchTerm}
		oninput={handleInput}
	/>
	{#if searchTerm}
		<button type="button" class="clear-btn" onclick={handleClear} aria-label="Clear search">
			<X size={14} />
		</button>
	{/if}
</div>

<style>
	.search-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	:global(.search-icon) {
		position: absolute;
		left: 0.75rem;
		color: var(--color-fg-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		height: 2.25rem;
		padding: 0.5rem 2rem 0.5rem 2.25rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		outline: none;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.search-input::placeholder {
		color: var(--color-fg-muted);
	}

	.search-input:focus {
		border-color: var(--color-border-emphasis);
	}

	.clear-btn {
		position: absolute;
		right: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		color: var(--color-fg-muted);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.clear-btn:hover {
		color: var(--color-fg-secondary);
	}
</style>
