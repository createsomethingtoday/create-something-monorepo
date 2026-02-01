<script lang="ts">
	/**
	 * FilterTogglePanel
	 *
	 * Reusable filter toggle UI with materials, categories, price range, and status.
	 * Emits filter changes via callback - doesn't handle filtering logic itself.
	 */
	import type { FilterState, FilterConfig } from './types.js';
	import { DEFAULT_FILTER_CONFIG, MATERIAL_GROUPS } from './types.js';

	// Props
	export let filterState: FilterState = {};
	export let config: FilterConfig = DEFAULT_FILTER_CONFIG;
	export let onFilterChange: (state: FilterState) => void = () => {};
	export let showTitle: boolean = true;
	export let collapsible: boolean = true;

	// Local UI state
	let isExpanded = true;
	let uiFilters = {
		materials: {} as Record<string, boolean>,
		categories: {} as Record<string, boolean>,
		statuses: {} as Record<string, boolean>,
		priceRange: [config.priceRange.min, config.priceRange.max] as [number, number]
	};

	// Initialize UI state from config
	$: {
		config.materials.forEach((m) => {
			if (uiFilters.materials[m] === undefined) uiFilters.materials[m] = false;
		});
		config.categories.forEach((c) => {
			if (uiFilters.categories[c.key] === undefined) uiFilters.categories[c.key] = false;
		});
		config.statuses.forEach((s) => {
			if (uiFilters.statuses[s.key] === undefined) uiFilters.statuses[s.key] = false;
		});
	}

	// Sync UI from external filterState changes
	$: syncFromFilterState(filterState);

	function syncFromFilterState(state: FilterState) {
		// Reset toggles
		Object.keys(uiFilters.materials).forEach((k) => (uiFilters.materials[k] = false));
		Object.keys(uiFilters.categories).forEach((k) => (uiFilters.categories[k] = false));
		Object.keys(uiFilters.statuses).forEach((k) => (uiFilters.statuses[k] = false));

		// Apply materials
		if (state.materials && state.materials.length > 0) {
			state.materials.forEach((m) => {
				Object.entries(MATERIAL_GROUPS).forEach(([group, members]) => {
					if (members.some((member) => member.toLowerCase() === m.toLowerCase())) {
						uiFilters.materials[group] = true;
					}
				});
			});
		}

		// Apply categories
		if (state.categories && state.categories.length > 0) {
			state.categories.forEach((c) => {
				if (uiFilters.categories[c] !== undefined) {
					uiFilters.categories[c] = true;
				}
			});
		}

		// Apply statuses
		if (state.statuses && state.statuses.length > 0) {
			state.statuses.forEach((s) => {
				if (uiFilters.statuses[s] !== undefined) {
					uiFilters.statuses[s] = true;
				}
			});
		}

		// Apply price range
		if (state.priceMin !== undefined || state.priceMax !== undefined) {
			uiFilters.priceRange = [
				state.priceMin ? state.priceMin / 100 : config.priceRange.min,
				state.priceMax ? state.priceMax / 100 : config.priceRange.max
			];
		}
	}

	function emitFilterChange() {
		const activeMaterials = Object.entries(uiFilters.materials)
			.filter(([_, active]) => active)
			.flatMap(([material]) => MATERIAL_GROUPS[material] || [material]);

		const activeCategories = Object.entries(uiFilters.categories)
			.filter(([_, active]) => active)
			.map(([cat]) => cat);

		const activeStatuses = Object.entries(uiFilters.statuses)
			.filter(([_, active]) => active)
			.map(([status]) => status);

		const newState: FilterState = {};
		if (activeMaterials.length > 0) newState.materials = activeMaterials;
		if (activeCategories.length > 0) newState.categories = activeCategories;
		if (activeStatuses.length > 0) newState.statuses = activeStatuses;
		if (uiFilters.priceRange[0] > config.priceRange.min)
			newState.priceMin = uiFilters.priceRange[0] * 100;
		if (uiFilters.priceRange[1] < config.priceRange.max)
			newState.priceMax = uiFilters.priceRange[1] * 100;

		onFilterChange(newState);
	}

	function toggleMaterial(material: string) {
		uiFilters.materials[material] = !uiFilters.materials[material];
		emitFilterChange();
	}

	function toggleCategory(category: string) {
		uiFilters.categories[category] = !uiFilters.categories[category];
		emitFilterChange();
	}

	function toggleStatus(status: string) {
		uiFilters.statuses[status] = !uiFilters.statuses[status];
		emitFilterChange();
	}

	function updatePriceRange(event: Event, which: 'min' | 'max') {
		const target = event.target as HTMLInputElement;
		const value = parseInt(target.value);
		if (which === 'min') {
			uiFilters.priceRange[0] = value;
		} else {
			uiFilters.priceRange[1] = value;
		}
		emitFilterChange();
	}

	function clearAll() {
		Object.keys(uiFilters.materials).forEach((k) => (uiFilters.materials[k] = false));
		Object.keys(uiFilters.categories).forEach((k) => (uiFilters.categories[k] = false));
		Object.keys(uiFilters.statuses).forEach((k) => (uiFilters.statuses[k] = false));
		uiFilters.priceRange = [config.priceRange.min, config.priceRange.max];
		onFilterChange({});
	}

	$: hasActiveFilters =
		Object.values(uiFilters.materials).some((v) => v) ||
		Object.values(uiFilters.categories).some((v) => v) ||
		Object.values(uiFilters.statuses).some((v) => v) ||
		uiFilters.priceRange[0] > config.priceRange.min ||
		uiFilters.priceRange[1] < config.priceRange.max;
</script>

<div class="filter-panel">
	{#if showTitle}
		<div class="panel-header">
			<h3 class="panel-title">Filter By</h3>
			{#if collapsible}
				<button type="button" class="toggle-btn" on:click={() => (isExpanded = !isExpanded)}>
					{isExpanded ? 'Hide' : 'Show'}
				</button>
			{/if}
		</div>
	{/if}

	{#if isExpanded}
		<!-- Materials -->
		<div class="filter-group">
			<h4 class="group-title">Materials</h4>
			<div class="toggle-list">
				{#each config.materials as material}
					<div class="toggle-row">
						<span class="toggle-label">{material}</span>
						<label class="toggle-switch">
							<input
								type="checkbox"
								checked={uiFilters.materials[material]}
								on:change={() => toggleMaterial(material)}
							/>
							<span class="toggle-slider"></span>
						</label>
					</div>
				{/each}
			</div>
		</div>

		<!-- Price Range -->
		<div class="filter-group">
			<h4 class="group-title">Price Range</h4>
			<p class="price-display">
				${uiFilters.priceRange[0].toLocaleString()} - ${uiFilters.priceRange[1].toLocaleString()}
			</p>
			<div class="price-sliders">
				<input
					type="range"
					min={config.priceRange.min}
					max={config.priceRange.max}
					step={config.priceRange.step}
					value={uiFilters.priceRange[0]}
					on:input={(e) => updatePriceRange(e, 'min')}
					class="price-slider"
				/>
				<input
					type="range"
					min={config.priceRange.min}
					max={config.priceRange.max}
					step={config.priceRange.step}
					value={uiFilters.priceRange[1]}
					on:input={(e) => updatePriceRange(e, 'max')}
					class="price-slider"
				/>
			</div>
		</div>

		<!-- Categories -->
		<div class="filter-group">
			<h4 class="group-title">Category</h4>
			<div class="toggle-list">
				{#each config.categories as { key, label }}
					<div class="toggle-row">
						<span class="toggle-label">{label}</span>
						<label class="toggle-switch">
							<input
								type="checkbox"
								checked={uiFilters.categories[key]}
								on:change={() => toggleCategory(key)}
							/>
							<span class="toggle-slider"></span>
						</label>
					</div>
				{/each}
			</div>
		</div>

		<!-- Status -->
		<div class="filter-group">
			<h4 class="group-title">Status</h4>
			<div class="toggle-list">
				{#each config.statuses as { key, label }}
					<div class="toggle-row">
						<span class="toggle-label">{label}</span>
						<label class="toggle-switch">
							<input
								type="checkbox"
								checked={uiFilters.statuses[key]}
								on:change={() => toggleStatus(key)}
							/>
							<span class="toggle-slider"></span>
						</label>
					</div>
				{/each}
			</div>
		</div>

		{#if hasActiveFilters}
			<button type="button" class="clear-btn" on:click={clearAll}> Clear All Filters </button>
		{/if}
	{/if}
</div>

<style>
	.filter-panel {
		background: var(--color-bg-subtle);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-sm);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-xs);
	}

	.panel-title {
		font-size: var(--text-caption);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
		margin: 0;
	}

	.toggle-btn {
		font-size: 10px;
		padding: 1px var(--space-xs);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xs);
		cursor: pointer;
		color: var(--color-fg-muted);
	}

	.filter-group {
		margin-bottom: var(--space-sm);
	}

	.filter-group:last-of-type {
		margin-bottom: 0;
	}

	.group-title {
		font-size: 11px;
		font-weight: 600;
		margin: 0 0 var(--space-xs);
		color: var(--color-fg-secondary);
	}

	.toggle-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.toggle-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1px 0;
	}

	.toggle-label {
		font-size: 11px;
		color: var(--color-fg-secondary);
	}

	/* Toggle Switch - compact */
	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 28px;
		height: 14px;
		cursor: pointer;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		inset: 0;
		background-color: var(--color-bg-surface);
		border-radius: 14px;
		transition: background-color var(--duration-micro);
	}

	.toggle-slider::before {
		content: '';
		position: absolute;
		height: 10px;
		width: 10px;
		left: 2px;
		bottom: 2px;
		background-color: var(--color-fg-primary);
		border-radius: 50%;
		transition: transform var(--duration-micro);
	}

	.toggle-switch input:checked + .toggle-slider {
		background-color: var(--color-fg-secondary);
	}

	.toggle-switch input:checked + .toggle-slider::before {
		transform: translateX(14px);
	}

	/* Price Range */
	.price-display {
		font-size: 11px;
		font-weight: 500;
		margin: 0 0 var(--space-xs);
		color: var(--color-fg-secondary);
	}

	.price-sliders {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.price-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 2px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-xs);
		outline: none;
	}

	.price-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 10px;
		height: 10px;
		background: var(--color-fg-secondary);
		border-radius: 50%;
		cursor: pointer;
		border: none;
	}

	.price-slider::-moz-range-thumb {
		width: 10px;
		height: 10px;
		background: var(--color-fg-secondary);
		border-radius: 50%;
		cursor: pointer;
		border: none;
	}

	.clear-btn {
		width: 100%;
		padding: var(--space-xs);
		margin-top: var(--space-sm);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xs);
		font-size: 10px;
		color: var(--color-fg-muted);
		cursor: pointer;
		transition: all var(--duration-micro);
	}

	.clear-btn:hover {
		border-color: var(--color-fg-secondary);
		color: var(--color-fg-secondary);
	}
</style>
