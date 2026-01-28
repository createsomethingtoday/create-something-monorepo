<script lang="ts">
	/**
	 * Combobox Component
	 *
	 * Searchable select dropdown with keyboard navigation.
	 * Supports filtering, custom rendering, and accessibility.
	 *
	 * Canon principle: Selection should be effortless.
	 *
	 * @example
	 * <Combobox
	 *   options={[
	 *     { value: 'us', label: 'United States' },
	 *     { value: 'uk', label: 'United Kingdom' },
	 *   ]}
	 *   bind:value={country}
	 *   placeholder="Select a country"
	 * />
	 */

	import { onMount } from 'svelte';

	interface Option {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		/** Available options */
		options: Option[];
		/** Selected value (bindable) */
		value?: string;
		/** Placeholder text */
		placeholder?: string;
		/** Disabled state */
		disabled?: boolean;
		/** Allow clearing selection */
		clearable?: boolean;
		/** No results message */
		noResultsMessage?: string;
		/** Called when value changes */
		onchange?: (value: string | undefined) => void;
	}

	let {
		options,
		value = $bindable(),
		placeholder = 'Select...',
		disabled = false,
		clearable = true,
		noResultsMessage = 'No results found',
		onchange
	}: Props = $props();

	let open = $state(false);
	let query = $state('');
	let highlightedIndex = $state(0);
	let inputRef: HTMLInputElement | undefined = $state();
	let listRef: HTMLUListElement | undefined = $state();

	// Filter options based on query
	const filteredOptions = $derived(
		query.trim()
			? options.filter((opt) =>
					opt.label.toLowerCase().includes(query.toLowerCase())
			  )
			: options
	);

	// Get selected option
	const selectedOption = $derived(options.find((opt) => opt.value === value));

	// Display value in input
	const displayValue = $derived(
		open ? query : selectedOption?.label || ''
	);

	function openDropdown() {
		if (disabled) return;
		open = true;
		query = '';
		highlightedIndex = 0;
	}

	function closeDropdown() {
		open = false;
		query = '';
	}

	function selectOption(option: Option) {
		if (option.disabled) return;
		value = option.value;
		onchange?.(option.value);
		closeDropdown();
	}

	function clearSelection(event: Event) {
		event.stopPropagation();
		value = undefined;
		onchange?.(undefined);
	}

	function handleInputKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (!open) {
					openDropdown();
				} else {
					highlightedIndex = Math.min(highlightedIndex + 1, filteredOptions.length - 1);
					scrollToHighlighted();
				}
				break;

			case 'ArrowUp':
				event.preventDefault();
				if (open) {
					highlightedIndex = Math.max(highlightedIndex - 1, 0);
					scrollToHighlighted();
				}
				break;

			case 'Enter':
				event.preventDefault();
				if (open && filteredOptions[highlightedIndex]) {
					selectOption(filteredOptions[highlightedIndex]);
				} else if (!open) {
					openDropdown();
				}
				break;

			case 'Escape':
				event.preventDefault();
				closeDropdown();
				break;

			case 'Tab':
				closeDropdown();
				break;
		}
	}

	function scrollToHighlighted() {
		if (listRef) {
			const item = listRef.children[highlightedIndex] as HTMLElement;
			item?.scrollIntoView({ block: 'nearest' });
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.combobox')) {
			closeDropdown();
		}
	}

	// Reset highlighted index when query changes
	$effect(() => {
		query;
		highlightedIndex = 0;
	});

	// Focus input when opened
	$effect(() => {
		if (open && inputRef) {
			inputRef.focus();
		}
	});

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<div class="combobox" class:open class:disabled>
	<div class="combobox-trigger" onclick={openDropdown}>
		<input
			bind:this={inputRef}
			type="text"
			class="combobox-input"
			value={displayValue}
			oninput={(e) => {
				query = e.currentTarget.value;
				if (!open) open = true;
			}}
			onkeydown={handleInputKeydown}
			onfocus={openDropdown}
			{placeholder}
			{disabled}
			role="combobox"
			aria-expanded={open}
			aria-haspopup="listbox"
			aria-autocomplete="list"
			autocomplete="off"
		/>

		<div class="combobox-actions">
			{#if clearable && selectedOption && !disabled}
				<button
					type="button"
					class="combobox-clear"
					onclick={clearSelection}
					aria-label="Clear selection"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>
			{/if}

			<span class="combobox-chevron" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M6 9l6 6 6-6" />
				</svg>
			</span>
		</div>
	</div>

	{#if open}
		<ul
			bind:this={listRef}
			class="combobox-dropdown"
			role="listbox"
			aria-label="Options"
		>
			{#if filteredOptions.length === 0}
				<li class="combobox-empty">{noResultsMessage}</li>
			{:else}
				{#each filteredOptions as option, index}
					<li
						class="combobox-option"
						class:highlighted={index === highlightedIndex}
						class:selected={option.value === value}
						class:disabled={option.disabled}
						onclick={() => selectOption(option)}
						onmouseenter={() => (highlightedIndex = index)}
						role="option"
						aria-selected={option.value === value}
						aria-disabled={option.disabled}
					>
						<span class="option-label">{option.label}</span>
						{#if option.value === value}
							<svg class="option-check" viewBox="0 0 24 24" fill="currentColor">
								<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
							</svg>
						{/if}
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
</div>

<style>
	.combobox {
		position: relative;
		width: 100%;
	}

	.combobox-trigger {
		display: flex;
		align-items: center;
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
		transition: border-color var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.combobox.open .combobox-trigger,
	.combobox-trigger:hover:not(.disabled .combobox-trigger) {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.combobox.disabled .combobox-trigger {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.combobox-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		padding: var(--space-sm, 1rem);
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-primary, #fff);
		cursor: inherit;
	}

	.combobox-input::placeholder {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.combobox-input:disabled {
		cursor: not-allowed;
	}

	.combobox-actions {
		display: flex;
		align-items: center;
		gap: 4px;
		padding-right: var(--space-sm, 1rem);
	}

	.combobox-clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		background: transparent;
		border: none;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		cursor: pointer;
		border-radius: var(--radius-sm, 6px);
		transition: color var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.combobox-clear:hover {
		color: var(--color-fg-primary, #fff);
	}

	.combobox-clear svg {
		width: 14px;
		height: 14px;
	}

	.combobox-chevron {
		display: flex;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		transition: transform var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.combobox.open .combobox-chevron {
		transform: rotate(180deg);
	}

	.combobox-chevron svg {
		width: 20px;
		height: 20px;
	}

	.combobox-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 50;
		max-height: 240px;
		overflow-y: auto;
		background: var(--color-bg-elevated, #0a0a0a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.3));
		list-style: none;
		margin: 0;
		padding: var(--space-xs, 0.5rem);
		animation: dropdownIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.combobox-empty {
		padding: var(--space-md, 1.618rem);
		text-align: center;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-size: var(--text-body-sm, 0.875rem);
	}

	.combobox-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm, 1rem);
		border-radius: var(--radius-sm, 6px);
		cursor: pointer;
		transition: background var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.combobox-option.highlighted {
		background: var(--color-bg-surface, #111);
	}

	.combobox-option.selected {
		color: var(--color-fg-primary, #fff);
	}

	.combobox-option.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.option-label {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-primary, #fff);
	}

	.option-check {
		width: 16px;
		height: 16px;
		color: var(--color-success, #44aa44);
	}

	@keyframes dropdownIn {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.combobox-trigger,
		.combobox-clear,
		.combobox-chevron,
		.combobox-dropdown,
		.combobox-option {
			transition: none;
			animation: none;
		}
	}
</style>
