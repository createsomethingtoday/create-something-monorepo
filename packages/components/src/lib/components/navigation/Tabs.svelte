<script lang="ts">
	/**
	 * Tabs Component
	 *
	 * Tab panel interface with keyboard navigation following WAI-ARIA tabs pattern.
	 * Supports arrow key navigation between tabs.
	 *
	 * Canon: The tabs organize; content surfaces.
	 */

	import type { Snippet } from 'svelte';

	interface Tab {
		/** Unique tab identifier */
		id: string;
		/** Tab label */
		label: string;
		/** Whether tab is disabled */
		disabled?: boolean;
	}

	interface Props {
		/** Tab definitions */
		tabs: Tab[];
		/** Currently active tab ID (bindable) */
		activeTab?: string;
		/** Tab panel content - receives activeTab as parameter */
		children: Snippet<[string]>;
		/** Called when active tab changes */
		onchange?: (tabId: string) => void;
		/** Visual variant */
		variant?: 'default' | 'pills' | 'underline';
		/** Size variant */
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		tabs,
		activeTab = $bindable(tabs[0]?.id ?? ''),
		children,
		onchange,
		variant = 'default',
		size = 'md'
	}: Props = $props();

	let tablistRef: HTMLDivElement;

	function selectTab(tabId: string) {
		const tab = tabs.find((t) => t.id === tabId);
		if (tab && !tab.disabled) {
			activeTab = tabId;
			onchange?.(tabId);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		const enabledTabs = tabs.filter((t) => !t.disabled);
		const currentIndex = enabledTabs.findIndex((t) => t.id === activeTab);

		let newIndex = currentIndex;

		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				newIndex = currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
				break;
			case 'ArrowRight':
				event.preventDefault();
				newIndex = currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
				break;
			case 'Home':
				event.preventDefault();
				newIndex = 0;
				break;
			case 'End':
				event.preventDefault();
				newIndex = enabledTabs.length - 1;
				break;
			default:
				return;
		}

		const newTab = enabledTabs[newIndex];
		if (newTab) {
			selectTab(newTab.id);
			// Focus the new tab button
			const tabButton = tablistRef?.querySelector(`[data-tab-id="${newTab.id}"]`) as HTMLElement;
			tabButton?.focus();
		}
	}
</script>

<div class="tabs tabs-{variant} tabs-{size}">
	<div
		class="tabs-list"
		role="tablist"
		bind:this={tablistRef}
		onkeydown={handleKeyDown}
	>
		{#each tabs as tab}
			<button
				type="button"
				role="tab"
				id="tab-{tab.id}"
				data-tab-id={tab.id}
				class="tabs-tab"
				class:active={activeTab === tab.id}
				aria-selected={activeTab === tab.id}
				aria-controls="panel-{tab.id}"
				tabindex={activeTab === tab.id ? 0 : -1}
				disabled={tab.disabled}
				onclick={() => selectTab(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#each tabs as tab}
		<div
			id="panel-{tab.id}"
			role="tabpanel"
			aria-labelledby="tab-{tab.id}"
			class="tabs-panel"
			class:active={activeTab === tab.id}
			hidden={activeTab !== tab.id}
			tabindex={0}
		>
			{#if activeTab === tab.id}
				{@render children(tab.id)}
			{/if}
		</div>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		flex-direction: column;
	}

	/* Tab list */
	.tabs-list {
		display: flex;
		gap: 2px;
		border-bottom: 1px solid var(--color-border-default);
	}

	/* Tab button base */
	.tabs-tab {
		position: relative;
		padding: var(--space-sm) var(--space-md);
		background: none;
		border: none;
		color: var(--color-fg-muted);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		white-space: nowrap;
	}

	.tabs-tab:hover:not(:disabled) {
		color: var(--color-fg-primary);
	}

	.tabs-tab:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
		border-radius: var(--radius-sm);
	}

	.tabs-tab:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.tabs-tab.active {
		color: var(--color-fg-primary);
	}

	/* Default variant - underline indicator */
	.tabs-default .tabs-tab::after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 0;
		right: 0;
		height: 2px;
		background: transparent;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.tabs-default .tabs-tab.active::after {
		background: var(--color-fg-primary);
	}

	/* Pills variant */
	.tabs-pills .tabs-list {
		border-bottom: none;
		gap: var(--space-xs);
		background: var(--color-bg-subtle);
		padding: 4px;
		border-radius: var(--radius-md);
		width: fit-content;
	}

	.tabs-pills .tabs-tab {
		border-radius: var(--radius-sm);
		padding: var(--space-xs) var(--space-sm);
	}

	.tabs-pills .tabs-tab.active {
		background: var(--color-bg-elevated);
		box-shadow: var(--shadow-sm);
	}

	/* Underline variant - minimal */
	.tabs-underline .tabs-list {
		gap: var(--space-md);
	}

	.tabs-underline .tabs-tab {
		padding: var(--space-sm) 0;
	}

	.tabs-underline .tabs-tab::after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 0;
		right: 0;
		height: 2px;
		background: transparent;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.tabs-underline .tabs-tab.active::after {
		background: var(--color-fg-primary);
	}

	/* Size variants */
	.tabs-sm .tabs-tab {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
	}

	.tabs-lg .tabs-tab {
		padding: var(--space-md) var(--space-lg);
		font-size: var(--text-body-lg);
	}

	/* Panel */
	.tabs-panel {
		padding: var(--space-md) 0;
	}

	.tabs-panel:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.tabs-panel[hidden] {
		display: none;
	}
</style>
