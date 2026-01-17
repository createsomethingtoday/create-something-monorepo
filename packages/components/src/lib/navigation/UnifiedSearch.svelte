<script lang="ts">
	/**
	 * UnifiedSearch Component
	 *
	 * Cross-property search interface triggered by ⌘K / Ctrl+K.
	 * Fetches results from the unified search API and groups by property.
	 *
	 * Canon principle: One search, the full story.
	 *
	 * @example
	 * <UnifiedSearch
	 *   searchApiUrl="https://unified-search.createsomething.workers.dev"
	 *   bind:open={searchOpen}
	 * />
	 */

	import { onMount } from 'svelte';

	// =============================================================================
	// TYPES
	// =============================================================================

	type Property = 'space' | 'io' | 'agency' | 'ltd' | 'lms';
	type ContentType = 'paper' | 'experiment' | 'lesson' | 'principle' | 'pattern' | 'master' | 'service' | 'case-study';

	interface SearchResult {
		id: string;
		title: string;
		description: string;
		property: Property;
		type: ContentType;
		url: string;
		path: string;
		score: number;
		concepts?: string[];
	}

	interface SearchResponse {
		results: SearchResult[];
		byProperty: Record<Property, SearchResult[]>;
		total: number;
		query: string;
		took: number;
	}

	interface CommandItem {
		id: string;
		label: string;
		description?: string;
		href?: string;
		icon?: string;
		property?: Property;
		type?: ContentType;
		action?: () => void;
		keywords?: string[];
	}

	// =============================================================================
	// PROPERTY DISPLAY INFO
	// =============================================================================

	const PROPERTY_INFO: Record<Property, { name: string; verb: string; icon: string }> = {
		space: { name: '.space', verb: 'Explore', icon: '🧪' },
		io: { name: '.io', verb: 'Learn', icon: '📖' },
		agency: { name: '.agency', verb: 'Build', icon: '🔨' },
		ltd: { name: '.ltd', verb: 'Canon', icon: '📜' },
		lms: { name: 'LMS', verb: 'Study', icon: '📚' },
	};

	const TYPE_LABELS: Record<ContentType, string> = {
		paper: 'Paper',
		experiment: 'Experiment',
		lesson: 'Lesson',
		principle: 'Principle',
		pattern: 'Pattern',
		master: 'Master',
		service: 'Service',
		'case-study': 'Case Study',
	};

	// =============================================================================
	// PROPS
	// =============================================================================

	interface Props {
		/** Whether the palette is open */
		open?: boolean;
		/** URL of the unified search API */
		searchApiUrl?: string;
		/** Local items to search through (fallback/quick access) */
		localItems?: CommandItem[];
		/** Placeholder text */
		placeholder?: string;
		/** Current property (to highlight current context) */
		currentProperty?: Property;
		/** Called when an item is selected */
		onselect?: (item: CommandItem) => void;
		/** Called when palette should close */
		onclose?: () => void;
		/** Enable analytics tracking */
		enableAnalytics?: boolean;
	}

	let {
		open = $bindable(false),
		searchApiUrl = 'https://unified-search.createsomething.workers.dev',
		localItems = [],
		placeholder = 'Search across all properties...',
		currentProperty,
		onselect,
		onclose,
		enableAnalytics = true
	}: Props = $props();

	// =============================================================================
	// ANALYTICS
	// =============================================================================

	function trackEvent(eventName: string, data: Record<string, unknown>) {
		if (!enableAnalytics || typeof window === 'undefined') return;
		
		// Dispatch custom event for analytics listeners
		window.dispatchEvent(new CustomEvent('cs:search', {
			detail: {
				event: eventName,
				property: currentProperty,
				timestamp: Date.now(),
				...data
			}
		}));
	}

	// =============================================================================
	// STATE
	// =============================================================================

	let query = $state('');
	let selectedIndex = $state(0);
	let inputRef: HTMLInputElement | undefined = $state();
	let isLoading = $state(false);
	let apiResults = $state<SearchResult[]>([]);
	let error = $state<string | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// =============================================================================
	// SEARCH LOGIC
	// =============================================================================

	// Filter local items based on query
	let filteredLocalItems = $derived(() => {
		if (!query.trim()) return localItems.slice(0, 5); // Show top 5 quick access

		const lowerQuery = query.toLowerCase();
		return localItems.filter((item) => {
			const searchText = [
				item.label,
				item.description,
				...(item.keywords || [])
			].join(' ').toLowerCase();
			return searchText.includes(lowerQuery);
		});
	});

	// Convert API results to CommandItems
	let apiItems = $derived(() => {
		return apiResults.map((result): CommandItem => ({
			id: result.id,
			label: result.title,
			description: result.description,
			href: result.url,
			icon: PROPERTY_INFO[result.property]?.icon || '📄',
			property: result.property,
			type: result.type,
		}));
	});

	// Group API results by property
	let groupedResults = $derived(() => {
		const groups: Partial<Record<Property, CommandItem[]>> = {};
		
		for (const item of apiItems()) {
			if (!item.property) continue;
			if (!groups[item.property]) {
				groups[item.property] = [];
			}
			groups[item.property]!.push(item);
		}

		return groups;
	});

	// All items flattened for keyboard navigation
	let allItems = $derived(() => {
		const items: CommandItem[] = [];
		
		// Add local items first if query is empty
		if (!query.trim()) {
			items.push(...filteredLocalItems());
		}
		
		// Add API results grouped by property
		const propertyOrder: Property[] = ['ltd', 'io', 'space', 'lms', 'agency'];
		const groups = groupedResults();
		
		for (const property of propertyOrder) {
			if (groups[property]) {
				items.push(...groups[property]!);
			}
		}

		// Add filtered local items if we have a query but no API results
		if (query.trim() && apiItems().length === 0 && !isLoading) {
			items.push(...filteredLocalItems());
		}

		return items;
	});

	// Perform API search with debounce
	async function performSearch(searchQuery: string) {
		if (!searchQuery.trim() || searchQuery.length < 2) {
			apiResults = [];
			return;
		}

		isLoading = true;
		error = null;

		try {
			const response = await fetch(`${searchApiUrl}/search`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: searchQuery,
					limit: 15,
					includeRelated: false,
				}),
			});

			if (!response.ok) {
				throw new Error(`Search failed: ${response.status}`);
			}

			const data: SearchResponse = await response.json();
			apiResults = data.results;
			
			// Track search performed
			trackEvent('search_performed', {
				query: searchQuery,
				resultCount: data.results.length,
				took: data.took
			});
		} catch (e) {
			console.error('Search error:', e);
			error = 'Search unavailable';
			apiResults = [];
		} finally {
			isLoading = false;
		}
	}

	// Debounced search effect
	$effect(() => {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		if (query.trim().length >= 2) {
			debounceTimer = setTimeout(() => {
				performSearch(query);
			}, 300);
		} else {
			apiResults = [];
		}
	});

	// =============================================================================
	// ACTIONS
	// =============================================================================

	function close() {
		open = false;
		query = '';
		selectedIndex = 0;
		apiResults = [];
		error = null;
		onclose?.();
	}

	function selectItem(item: CommandItem) {
		// Track selection
		trackEvent('search_result_selected', {
			itemId: item.id,
			itemLabel: item.label,
			itemProperty: item.property,
			itemType: item.type,
			itemHref: item.href,
			query: query,
			resultIndex: allItems().findIndex(i => i.id === item.id)
		});

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
			if (!open) {
				trackEvent('search_opened', { trigger: 'keyboard' });
			}
			open = !open;
			return;
		}

		if (!open) return;

		const items = allItems();

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

	// Reset selection when results change
	$effect(() => {
		apiResults; // Track results
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
			if (debounceTimer) {
				clearTimeout(debounceTimer);
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
		aria-label="Close search"
	></div>

	<!-- Palette -->
	<div class="palette" role="dialog" aria-modal="true" aria-label="Unified search">
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
				aria-label="Search"
			/>
			{#if isLoading}
				<span class="palette-loading">Searching...</span>
			{:else}
				<kbd class="palette-shortcut">ESC</kbd>
			{/if}
		</div>

		<div class="palette-results">
			{#if error}
				<div class="palette-error">{error}</div>
			{:else if !query.trim()}
				<!-- Quick Access -->
				{#if filteredLocalItems().length > 0}
					<div class="palette-group">
						<div class="palette-group-header">Quick Access</div>
						{#each filteredLocalItems() as item, index}
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
					</div>
				{:else}
					<div class="palette-empty">Start typing to search across all properties</div>
				{/if}
			{:else if allItems().length === 0 && !isLoading}
				<div class="palette-empty">No results found for "{query}"</div>
			{:else}
				<!-- Grouped Results -->
				{@const groups = groupedResults()}
				{@const propertyOrder = ['ltd', 'io', 'space', 'lms', 'agency'] as Property[]}
				{@const itemsBefore: Record<Property, number> = { ltd: 0, io: 0, space: 0, lms: 0, agency: 0 }}
				{#each propertyOrder as property}
					{#if groups[property] && groups[property]!.length > 0}
						{@const propertyInfo = PROPERTY_INFO[property]}
						{@const startIndex = Object.entries(itemsBefore).filter(([p]) => propertyOrder.indexOf(p as Property) < propertyOrder.indexOf(property)).reduce((sum, [p]) => sum + (groups[p as Property]?.length || 0), 0)}
						<div class="palette-group">
							<div class="palette-group-header">
								<span class="palette-group-icon">{propertyInfo.icon}</span>
								<span class="palette-group-name">{propertyInfo.name}</span>
								<span class="palette-group-verb">{propertyInfo.verb}</span>
							</div>
							{#each groups[property]! as item, i}
								{@const globalIndex = startIndex + i}
								<button
									class="palette-item"
									class:selected={globalIndex === selectedIndex}
									onclick={() => selectItem(item)}
									onmouseenter={() => (selectedIndex = globalIndex)}
								>
									<div class="palette-item-content">
										<span class="palette-item-label">{item.label}</span>
										{#if item.description}
											<span class="palette-item-description">{item.description}</span>
										{/if}
									</div>
									{#if item.type}
										<span class="palette-item-type">{TYPE_LABELS[item.type]}</span>
									{/if}
									<span class="palette-item-hint">↵</span>
								</button>
							{/each}
						</div>
					{/if}
				{/each}
			{/if}
		</div>

		<div class="palette-footer">
			<span class="palette-hint">
				<kbd>↑</kbd><kbd>↓</kbd> navigate
			</span>
			<span class="palette-hint">
				<kbd>↵</kbd> select
			</span>
			<span class="palette-hint">
				<kbd>esc</kbd> close
			</span>
			{#if currentProperty}
				<span class="palette-current">
					{PROPERTY_INFO[currentProperty].icon} {PROPERTY_INFO[currentProperty].name}
				</span>
			{/if}
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
		top: 15%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 51;
		width: min(640px, 90vw);
		max-height: 70vh;
		background: var(--color-bg-elevated, #0a0a0a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-lg, 12px);
		box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.3));
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

	.palette-shortcut,
	.palette-loading {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		background: var(--color-bg-surface, #111);
		padding: 4px 8px;
		border-radius: var(--radius-sm, 6px);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.palette-loading {
		color: var(--color-accent, #3b82f6);
	}

	.palette-results {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-xs, 0.5rem);
	}

	.palette-empty,
	.palette-error {
		padding: var(--space-lg, 2.618rem);
		text-align: center;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-size: var(--text-body-sm, 0.875rem);
	}

	.palette-error {
		color: var(--color-error, #ef4444);
	}

	/* Group Styles */
	.palette-group {
		margin-bottom: var(--space-sm, 1rem);
	}

	.palette-group-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs, 0.5rem);
		padding: var(--space-xs, 0.5rem) var(--space-sm, 1rem);
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.palette-group-icon {
		font-size: var(--text-body-sm, 0.875rem);
	}

	.palette-group-name {
		font-weight: 600;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.7));
	}

	.palette-group-verb {
		opacity: 0.7;
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
		min-width: 0;
	}

	.palette-item-label {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-primary, #fff);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.palette-item-description {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.palette-item-type {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-subtle, rgba(255, 255, 255, 0.3));
		background: var(--color-bg-surface, #111);
		padding: 2px 6px;
		border-radius: var(--radius-sm, 6px);
		flex-shrink: 0;
	}

	.palette-item-hint {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
		flex-shrink: 0;
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

	.palette-current {
		margin-left: auto;
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-accent, #3b82f6);
		display: flex;
		align-items: center;
		gap: 4px;
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
