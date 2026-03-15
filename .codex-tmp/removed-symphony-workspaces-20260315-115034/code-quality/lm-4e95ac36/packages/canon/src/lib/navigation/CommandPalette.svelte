<script lang="ts">
	/**
	 * CommandPalette Component
	 *
	 * Power-user search interface triggered by ⌘K / Ctrl+K.
	 * Fuzzy search over provided items with keyboard navigation.
	 *
	 * Canon principle: Power without complexity for those who seek it.
	 *
	 * @example
	 * <CommandPalette
	 *   items={[
	 *     { id: '1', label: 'Home', href: '/' },
	 *     { id: '2', label: 'About', href: '/about' },
	 *   ]}
	 *   bind:open={paletteOpen}
	 * />
	 */

	import { onMount } from 'svelte';

	interface CommandItem {
		id: string;
		label: string;
		description?: string;
		href?: string;
		icon?: string;
		action?: () => void;
		keywords?: string[];
	}

	interface Props {
		/** Whether the palette is open */
		open?: boolean;
		/** Items to search through */
		items?: CommandItem[];
		/** Placeholder text */
		placeholder?: string;
		/** Called when an item is selected */
		onselect?: (item: CommandItem) => void;
		/** Called when palette should close */
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		items = [],
		placeholder = 'Search...',
		onselect,
		onclose
	}: Props = $props();

	let query = $state('');
	let selectedIndex = $state(0);
	let inputRef: HTMLInputElement | undefined = $state();

	// Filter items based on query
	let filteredItems = $derived(() => {
		if (!query.trim()) return items;

		const lowerQuery = query.toLowerCase();
		return items.filter((item) => {
			const searchText = [
				item.label,
				item.description,
				...(item.keywords || [])
			].join(' ').toLowerCase();
			return searchText.includes(lowerQuery);
		});
	});

	function close() {
		open = false;
		query = '';
		selectedIndex = 0;
		onclose?.();
	}

	function selectItem(item: CommandItem) {
		onselect?.(item);

		if (item.href && typeof window !== 'undefined') {
			window.location.href = item.href;
		} else if (item.action) {
			item.action();
		}

		close();
	}

	function handleKeydown(event: KeyboardEvent) {
		// Open with Cmd/Ctrl + K
		if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
			event.preventDefault();
			open = !open;
			return;
		}

		if (!open) return;

		const items = filteredItems();

		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				close();
				break;

			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
				break;

			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				break;

			case 'Enter':
				event.preventDefault();
				if (items[selectedIndex]) {
					selectItem(items[selectedIndex]);
				}
				break;
		}
	}

	// Focus input when opened
	$effect(() => {
		if (open && inputRef) {
			inputRef.focus();
		}
	});

	// Reset selection when query changes
	$effect(() => {
		query; // Track query
		selectedIndex = 0;
	});

	// Lock body scroll when open
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (open) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		}
	});

	onMount(() => {
		return () => {
			if (typeof document !== 'undefined') {
				document.body.style.overflow = '';
			}
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Overlay -->
	<div
		class="palette-overlay"
		onclick={close}
		onkeydown={(e) => e.key === 'Enter' && close()}
		role="button"
		tabindex="-1"
		aria-label="Close command palette"
	></div>

	<!-- Palette -->
	<div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
		<div class="palette-input-wrapper">
			<svg class="palette-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"/>
				<path d="m21 21-4.35-4.35"/>
			</svg>
			<input
				bind:this={inputRef}
				bind:value={query}
				type="text"
				class="palette-input"
				{placeholder}
				aria-label="Search commands"
			/>
			<kbd class="palette-shortcut">ESC</kbd>
		</div>

		<div class="palette-results">
			{#if filteredItems().length === 0}
				<div class="palette-empty">No results found</div>
			{:else}
				{#each filteredItems() as item, index}
					<button
						class="palette-item"
						class:selected={index === selectedIndex}
						onclick={() => selectItem(item)}
						onmouseenter={() => (selectedIndex = index)}
					>
						{#if item.icon}
							<span class="palette-item-icon">{item.icon}</span>
						{/if}
						<div class="palette-item-content">
							<span class="palette-item-label">{item.label}</span>
							{#if item.description}
								<span class="palette-item-description">{item.description}</span>
							{/if}
						</div>
						{#if item.href}
							<span class="palette-item-hint">↵</span>
						{/if}
					</button>
				{/each}
			{/if}
		</div>

		<div class="palette-footer">
			<span class="palette-hint">
				<kbd>↑</kbd><kbd>↓</kbd> to navigate
			</span>
			<span class="palette-hint">
				<kbd>↵</kbd> to select
			</span>
			<span class="palette-hint">
				<kbd>esc</kbd> to close
			</span>
		</div>
	</div>
{/if}

<style>
	.palette-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: var(--color-overlay-heavy, rgba(0, 0, 0, 0.7));
		animation: fadeIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.palette {
		position: fixed;
		top: 20%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 51;
		width: min(560px, 90vw);
		max-height: 60vh;
		/* Glass Design System - "The Automation Layer" */
		background-color: var(--glass-bg-medium);
		backdrop-filter: blur(var(--glass-blur-xl)) var(--glass-saturate-xl);
		border: 1px solid var(--glass-border-medium);
		border-radius: var(--radius-lg, 12px);
		box-shadow: var(--glass-shadow-lg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: scaleIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.palette-input-wrapper {
		display: flex;
		align-items: center;
		gap: var(--space-sm, 1rem);
		padding: var(--space-md, 1.618rem);
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.palette-search-icon {
		width: 20px;
		height: 20px;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		flex-shrink: 0;
	}

	.palette-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: var(--text-body-lg, 1.125rem);
		color: var(--color-fg-primary, #fff);
	}

	.palette-input::placeholder {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.palette-shortcut {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		background: var(--color-bg-surface, #111);
		padding: 4px 8px;
		border-radius: var(--radius-sm, 6px);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.palette-results {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-xs, 0.5rem);
	}

	.palette-empty {
		padding: var(--space-lg, 2.618rem);
		text-align: center;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-size: var(--text-body-sm, 0.875rem);
	}

	.palette-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm, 1rem);
		width: 100%;
		padding: var(--space-sm, 1rem);
		background: transparent;
		border: none;
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
		text-align: left;
		transition: background var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.palette-item:hover,
	.palette-item.selected {
		background: var(--color-bg-surface, #111);
	}

	.palette-item-icon {
		font-size: var(--text-body-lg, 1.125rem);
		width: 24px;
		text-align: center;
	}

	.palette-item-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.palette-item-label {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-primary, #fff);
	}

	.palette-item-description {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.palette-item-hint {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
	}

	.palette-footer {
		display: flex;
		gap: var(--space-md, 1.618rem);
		padding: var(--space-sm, 1rem) var(--space-md, 1.618rem);
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		background: var(--color-bg-surface, #111);
	}

	.palette-hint {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.palette-hint kbd {
		font-size: 10px;
		padding: 2px 6px;
		background: var(--color-bg-elevated, #0a0a0a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-sm, 6px);
	}

	/* Animations */
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: translateX(-50%) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) scale(1);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.palette-overlay,
		.palette,
		.palette-item {
			animation: none;
			transition: none;
		}
	}
</style>
