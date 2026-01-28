<script lang="ts">
	/**
	 * DropdownMenu Component
	 *
	 * Action menu with keyboard navigation support.
	 * Follows WAI-ARIA menu button pattern.
	 *
	 * Canon: The menu offers; choice follows.
	 */

	import type { Snippet } from 'svelte';

	interface MenuItem {
		/** Unique item identifier */
		id: string;
		/** Display label */
		label: string;
		/** Optional icon snippet */
		icon?: Snippet;
		/** Whether item is disabled */
		disabled?: boolean;
		/** Whether this is a destructive action */
		destructive?: boolean;
		/** Divider before this item */
		divider?: boolean;
	}

	interface Props {
		/** Menu items */
		items: MenuItem[];
		/** Whether menu is open (bindable) */
		open?: boolean;
		/** Position relative to trigger */
		position?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
		/** Trigger element */
		trigger: Snippet<[{ open: boolean }]>;
		/** Called when item is selected */
		onselect?: (itemId: string) => void;
		/** Called when menu closes */
		onclose?: () => void;
	}

	let {
		items,
		open = $bindable(false),
		position = 'bottom-start',
		trigger,
		onselect,
		onclose
	}: Props = $props();

	let wrapperRef: HTMLDivElement;
	let menuRef: HTMLDivElement;
	let focusedIndex = $state(-1);

	const enabledItems = $derived(items.filter((item) => !item.disabled));

	function toggle() {
		open = !open;
		if (open) {
			focusedIndex = 0;
		} else {
			focusedIndex = -1;
			onclose?.();
		}
	}

	function close() {
		open = false;
		focusedIndex = -1;
		onclose?.();
	}

	function selectItem(item: MenuItem) {
		if (!item.disabled) {
			onselect?.(item.id);
			close();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!open) {
			if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				toggle();
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				focusedIndex = (focusedIndex + 1) % enabledItems.length;
				break;
			case 'ArrowUp':
				event.preventDefault();
				focusedIndex = focusedIndex <= 0 ? enabledItems.length - 1 : focusedIndex - 1;
				break;
			case 'Home':
				event.preventDefault();
				focusedIndex = 0;
				break;
			case 'End':
				event.preventDefault();
				focusedIndex = enabledItems.length - 1;
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (focusedIndex >= 0 && focusedIndex < enabledItems.length) {
					selectItem(enabledItems[focusedIndex]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				close();
				break;
			case 'Tab':
				close();
				break;
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (open && wrapperRef && !wrapperRef.contains(event.target as Node)) {
			close();
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside, true);
			return () => {
				document.removeEventListener('click', handleClickOutside, true);
			};
		}
	});

	// Focus menu item when focusedIndex changes
	$effect(() => {
		if (open && focusedIndex >= 0 && menuRef) {
			const focusedItem = menuRef.querySelector(`[data-index="${focusedIndex}"]`) as HTMLElement;
			focusedItem?.focus();
		}
	});
</script>

<div class="dropdown-wrapper" bind:this={wrapperRef} onkeydown={handleKeyDown}>
	<button
		type="button"
		class="dropdown-trigger"
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={toggle}
	>
		{@render trigger({ open })}
	</button>

	{#if open}
		<div
			class="dropdown-menu dropdown-{position}"
			role="menu"
			bind:this={menuRef}
		>
			{#each items as item, index}
				{#if item.divider}
					<div class="dropdown-divider" role="separator"></div>
				{/if}
				<button
					type="button"
					role="menuitem"
					class="dropdown-item"
					class:destructive={item.destructive}
					class:focused={enabledItems.indexOf(item) === focusedIndex}
					data-index={enabledItems.indexOf(item)}
					disabled={item.disabled}
					tabindex={-1}
					onclick={() => selectItem(item)}
				>
					{#if item.icon}
						<span class="dropdown-item-icon">
							{@render item.icon()}
						</span>
					{/if}
					<span class="dropdown-item-label">{item.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.dropdown-wrapper {
		position: relative;
		display: inline-flex;
	}

	.dropdown-trigger {
		display: inline-flex;
		align-items: center;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.dropdown-menu {
		position: absolute;
		z-index: var(--z-dropdown, 20);
		min-width: 160px;
		padding: var(--space-xs);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		animation: dropdownIn var(--duration-micro) var(--ease-standard);
	}

	@keyframes dropdownIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Positions */
	.dropdown-bottom-start {
		top: calc(100% + 4px);
		left: 0;
	}

	.dropdown-bottom-end {
		top: calc(100% + 4px);
		right: 0;
	}

	.dropdown-top-start {
		bottom: calc(100% + 4px);
		left: 0;
	}

	.dropdown-top-end {
		bottom: calc(100% + 4px);
		right: 0;
	}

	/* Divider */
	.dropdown-divider {
		height: 1px;
		margin: var(--space-xs) 0;
		background: var(--color-border-default);
	}

	/* Menu item */
	.dropdown-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: none;
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		text-align: left;
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.dropdown-item:hover:not(:disabled),
	.dropdown-item.focused {
		background: var(--color-hover);
	}

	.dropdown-item:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}

	.dropdown-item:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dropdown-item.destructive {
		color: var(--color-error);
	}

	.dropdown-item.destructive:hover:not(:disabled),
	.dropdown-item.destructive.focused {
		background: var(--color-error-muted);
	}

	.dropdown-item-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		color: var(--color-fg-muted);
	}

	.dropdown-item.destructive .dropdown-item-icon {
		color: var(--color-error);
	}

	.dropdown-item-label {
		flex: 1;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.dropdown-menu {
			animation: none;
		}
	}
</style>
