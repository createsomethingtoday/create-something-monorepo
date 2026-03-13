<script lang="ts">
	/**
	 * Tabs Component
	 *
	 * Accessible tab interface following WAI-ARIA patterns.
	 * Supports keyboard navigation and multiple visual variants.
	 *
	 * Canon principle: Navigation should be invisible until needed.
	 *
	 * @example
	 * <Tabs
	 *   items={[
	 *     { id: 'overview', label: 'Overview' },
	 *     { id: 'features', label: 'Features' },
	 *     { id: 'pricing', label: 'Pricing' }
	 *   ]}
	 *   bind:value={activeTab}
	 * >
	 *   {#snippet panel(item)}
	 *     {#if item.id === 'overview'}
	 *       <OverviewContent />
	 *     {:else if item.id === 'features'}
	 *       <FeaturesContent />
	 *     {:else}
	 *       <PricingContent />
	 *     {/if}
	 *   {/snippet}
	 * </Tabs>
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface TabItem {
		/** Unique identifier */
		id: string;
		/** Tab label */
		label: string;
		/** Optional icon (render via snippet) */
		icon?: string;
		/** Disabled state */
		disabled?: boolean;
	}

	interface Props {
		/** Tab items */
		items: TabItem[];
		/** Active tab id (bindable) */
		value?: string;
		/** Visual variant */
		variant?: 'underline' | 'pills' | 'bordered';
		/** Tab size */
		size?: 'sm' | 'md' | 'lg';
		/** Full width tabs */
		fullWidth?: boolean;
		/** Activation mode: automatic (on focus) or manual (on click/enter) */
		activation?: 'automatic' | 'manual';
		/** Orientation */
		orientation?: 'horizontal' | 'vertical';
		/** Additional classes for tab list */
		class?: string;
		/** Called when tab changes */
		onchange?: (id: string) => void;
		/** Panel content snippet */
		panel: import('svelte').Snippet<[TabItem]>;
		/** Optional icon snippet */
		icon?: import('svelte').Snippet<[TabItem]>;
	}

	let {
		items,
		value = $bindable(items[0]?.id ?? ''),
		variant = 'underline',
		size = 'md',
		fullWidth = false,
		activation = 'automatic',
		orientation = 'horizontal',
		class: className = '',
		onchange,
		panel,
		icon
	}: Props = $props();

	let tabListElement: HTMLElement;
	let tabElements: HTMLButtonElement[] = $state([]);
	let indicatorStyle = $state('');

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	// Get active tab index
	const activeIndex = $derived(items.findIndex((item) => item.id === value));

	// Get focusable tabs (non-disabled)
	const focusableTabs = $derived(items.filter((item) => !item.disabled));

	// Update indicator position
	function updateIndicator() {
		if (!browser || variant !== 'underline') return;

		const activeTab = tabElements[activeIndex];
		if (!activeTab || !tabListElement) return;

		const listRect = tabListElement.getBoundingClientRect();
		const tabRect = activeTab.getBoundingClientRect();

		if (orientation === 'horizontal') {
			indicatorStyle = `
				width: ${tabRect.width}px;
				transform: translateX(${tabRect.left - listRect.left}px);
			`;
		} else {
			indicatorStyle = `
				height: ${tabRect.height}px;
				transform: translateY(${tabRect.top - listRect.top}px);
			`;
		}
	}

	// Update indicator when value changes
	$effect(() => {
		// Track value to trigger effect
		const _ = value;
		// Wait for DOM update
		requestAnimationFrame(updateIndicator);
	});

	// Update on mount and resize
	onMount(() => {
		updateIndicator();

		const resizeObserver = new ResizeObserver(updateIndicator);
		resizeObserver.observe(tabListElement);

		return () => resizeObserver.disconnect();
	});

	function selectTab(id: string) {
		const item = items.find((i) => i.id === id);
		if (item?.disabled) return;

		value = id;
		onchange?.(id);
	}

	function handleClick(id: string) {
		selectTab(id);
	}

	function handleKeydown(event: KeyboardEvent, index: number) {
		const isHorizontal = orientation === 'horizontal';
		const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
		const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

		let newIndex = index;

		switch (event.key) {
			case prevKey:
				event.preventDefault();
				// Find previous focusable tab
				for (let i = index - 1; i >= 0; i--) {
					if (!items[i].disabled) {
						newIndex = i;
						break;
					}
				}
				// Wrap to end
				if (newIndex === index) {
					for (let i = items.length - 1; i > index; i--) {
						if (!items[i].disabled) {
							newIndex = i;
							break;
						}
					}
				}
				break;

			case nextKey:
				event.preventDefault();
				// Find next focusable tab
				for (let i = index + 1; i < items.length; i++) {
					if (!items[i].disabled) {
						newIndex = i;
						break;
					}
				}
				// Wrap to start
				if (newIndex === index) {
					for (let i = 0; i < index; i++) {
						if (!items[i].disabled) {
							newIndex = i;
							break;
						}
					}
				}
				break;

			case 'Home':
				event.preventDefault();
				// Find first focusable tab
				for (let i = 0; i < items.length; i++) {
					if (!items[i].disabled) {
						newIndex = i;
						break;
					}
				}
				break;

			case 'End':
				event.preventDefault();
				// Find last focusable tab
				for (let i = items.length - 1; i >= 0; i--) {
					if (!items[i].disabled) {
						newIndex = i;
						break;
					}
				}
				break;

			case 'Enter':
			case ' ':
				if (activation === 'manual') {
					event.preventDefault();
					selectTab(items[index].id);
				}
				return;

			default:
				return;
		}

		if (newIndex !== index) {
			tabElements[newIndex]?.focus();
			if (activation === 'automatic') {
				selectTab(items[newIndex].id);
			}
		}
	}

	const sizeClasses = {
		sm: 'size-sm',
		md: 'size-md',
		lg: 'size-lg'
	};
</script>

<div
	class="tabs {variant} {sizeClasses[size]} {orientation}"
	class:full-width={fullWidth}
	class:reduced-motion={prefersReducedMotion}
>
	<!-- Tab List -->
	<div
		bind:this={tabListElement}
		class="tab-list {className}"
		role="tablist"
		aria-orientation={orientation}
	>
		{#each items as item, index (item.id)}
			<button
				bind:this={tabElements[index]}
				type="button"
				role="tab"
				id="tab-{item.id}"
				class="tab"
				class:active={value === item.id}
				class:disabled={item.disabled}
				aria-selected={value === item.id}
				aria-controls="panel-{item.id}"
				aria-disabled={item.disabled}
				tabindex={value === item.id ? 0 : -1}
				disabled={item.disabled}
				onclick={() => handleClick(item.id)}
				onkeydown={(e) => handleKeydown(e, index)}
			>
				{#if icon && item.icon}
					<span class="tab-icon">
						{@render icon(item)}
					</span>
				{/if}
				<span class="tab-label">{item.label}</span>
			</button>
		{/each}

		<!-- Animated indicator for underline variant -->
		{#if variant === 'underline'}
			<div class="tab-indicator" style={indicatorStyle}></div>
		{/if}
	</div>

	<!-- Tab Panels -->
	<div class="tab-panels">
		{#each items as item (item.id)}
			<div
				id="panel-{item.id}"
				role="tabpanel"
				class="tab-panel"
				class:active={value === item.id}
				aria-labelledby="tab-{item.id}"
				tabindex={value === item.id ? 0 : -1}
				hidden={value !== item.id}
			>
				{#if value === item.id}
					{@render panel(item)}
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.tabs {
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1.618rem);
	}

	.tabs.vertical {
		flex-direction: row;
	}

	/* Tab List */
	.tab-list {
		position: relative;
		display: flex;
		gap: var(--space-xs, 0.5rem);
	}

	.tabs.horizontal .tab-list {
		flex-direction: row;
	}

	.tabs.vertical .tab-list {
		flex-direction: column;
		flex-shrink: 0;
	}

	.tabs.full-width .tab-list {
		width: 100%;
	}

	.tabs.full-width .tab {
		flex: 1;
	}

	/* Tab Button */
	.tab {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs, 0.5rem);
		background: transparent;
		border: none;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-family: inherit;
		cursor: pointer;
		white-space: nowrap;
		transition:
			color var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			background var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			border-color var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.tab:hover:not(.disabled) {
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.tab.active {
		color: var(--color-fg-primary, #fff);
	}

	.tab.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.tab:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	/* Size variants */
	.tabs.size-sm .tab {
		padding: var(--space-xs, 0.5rem) var(--space-sm, 1rem);
		font-size: var(--text-body-sm, 0.875rem);
	}

	.tabs.size-md .tab {
		padding: var(--space-sm, 1rem) var(--space-md, 1.618rem);
		font-size: var(--text-body, 1rem);
	}

	.tabs.size-lg .tab {
		padding: var(--space-md, 1.618rem) var(--space-lg, 2.618rem);
		font-size: var(--text-body-lg, 1.125rem);
	}

	/* Underline variant */
	.tabs.underline .tab-list {
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.tabs.underline.vertical .tab-list {
		border-bottom: none;
		border-right: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.tabs.underline .tab {
		margin-bottom: -1px;
		border-bottom: 2px solid transparent;
	}

	.tabs.underline.vertical .tab {
		margin-bottom: 0;
		margin-right: -1px;
		border-bottom: none;
		border-right: 2px solid transparent;
	}

	.tab-indicator {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 2px;
		background: var(--color-fg-primary, #fff);
		transition: transform var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			width var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.tabs.vertical .tab-indicator {
		bottom: auto;
		left: auto;
		right: 0;
		top: 0;
		width: 2px;
		height: auto;
		transition: transform var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			height var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	/* Pills variant */
	.tabs.pills .tab-list {
		background: var(--color-bg-subtle, #1a1a1a);
		padding: 4px;
		border-radius: var(--radius-lg, 12px);
	}

	.tabs.pills .tab {
		border-radius: var(--radius-md, 8px);
	}

	.tabs.pills .tab.active {
		background: var(--color-bg-surface, #111);
		box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.2));
	}

	/* Bordered variant */
	.tabs.bordered .tab {
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		background: var(--color-bg-surface, #111);
	}

	.tabs.bordered .tab.active {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		background: var(--color-bg-subtle, #1a1a1a);
	}

	/* Tab Icon */
	.tab-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Tab Panels */
	.tab-panels {
		flex: 1;
	}

	.tab-panel {
		display: none;
	}

	.tab-panel.active {
		display: block;
		animation: fadeIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Reduced motion */
	.tabs.reduced-motion .tab,
	.tabs.reduced-motion .tab-indicator,
	.tabs.reduced-motion .tab-panel.active {
		transition: none;
		animation: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.tab,
		.tab-indicator,
		.tab-panel.active {
			transition: none;
			animation: none;
		}
	}

	/* Responsive */
	@media (max-width: 640px) {
		.tabs.horizontal .tab-list {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
		}

		.tabs.horizontal .tab-list::-webkit-scrollbar {
			display: none;
		}
	}
</style>
