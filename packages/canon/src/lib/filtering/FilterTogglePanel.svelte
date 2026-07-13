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

		// Apply price range (reset to defaults if not specified)
		uiFilters.priceRange = [
			state.priceMin ? state.priceMin / 100 : config.priceRange.min,
			state.priceMax ? state.priceMax / 100 : config.priceRange.max
		];
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

		<!-- Price Range - Ive-inspired: single track, visual range -->
		<div class="filter-group price-group">
			<div class="price-header">
				<h4 class="group-title">Price</h4>
				<span class="price-value">${uiFilters.priceRange[0].toLocaleString()}–${uiFilters.priceRange[1].toLocaleString()}</span>
			</div>
			<div class="range-track">
				<div 
					class="range-fill"
					style="left: {((uiFilters.priceRange[0] - config.priceRange.min) / (config.priceRange.max - config.priceRange.min)) * 100}%; right: {100 - ((uiFilters.priceRange[1] - config.priceRange.min) / (config.priceRange.max - config.priceRange.min)) * 100}%"
				></div>
				<input
					type="range"
					min={config.priceRange.min}
					max={config.priceRange.max}
					step={config.priceRange.step}
					value={uiFilters.priceRange[0]}
					on:input={(e) => updatePriceRange(e, 'min')}
					class="range-input range-min"
				/>
				<input
					type="range"
					min={config.priceRange.min}
					max={config.priceRange.max}
					step={config.priceRange.step}
					value={uiFilters.priceRange[1]}
					on:input={(e) => updatePriceRange(e, 'max')}
					class="range-input range-max"
				/>
			</div>
			<div class="range-labels">
				<span>${config.priceRange.min.toLocaleString()}</span>
				<span>${config.priceRange.max.toLocaleString()}</span>
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
		background: var(--color-performance-bg-subtle);
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: var(--radius-performance-scale-sm);
		max-width: 480px;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-performance-xs);
	}

	.panel-title {
		font-size: var(--text-performance-caption);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-performance-fg-muted);
		margin: 0;
	}

	.toggle-btn {
		font-size: var(--text-performance-caption);
		padding: 2px var(--space-performance-xs);
		background: transparent;
		border-radius: var(--radius-xs);
		cursor: pointer;
		color: var(--color-performance-fg-muted);
		transition: all var(--duration-performance-fast) var(--ease-out);
	}

	.toggle-btn:hover {
		border-color: var(--color-performance-border-emphasis);
		color: var(--color-performance-fg-tertiary);
	}

	.filter-group {
		margin-bottom: var(--space-performance-sm);
		padding-bottom: var(--space-performance-sm);
	}

	.filter-group:last-of-type {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: none;
	}

	.group-title {
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
		margin: 0 0 var(--space-performance-xs);
		color: var(--color-performance-fg-secondary);
	}

	.toggle-list {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--space-performance-xs) var(--space-performance-md);
	}

	.toggle-row {
		display: inline-flex;
		align-items: center;
		gap: var(--space-performance-xs);
	}

	.toggle-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
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
		background-color: var(--color-performance-bg-surface);
		border-radius: 14px;
		transition: background-color var(--duration-performance-fast) var(--ease-out);
	}

	.toggle-slider::before {
		content: '';
		position: absolute;
		height: 10px;
		width: 10px;
		left: 2px;
		bottom: 2px;
		background-color: var(--color-performance-fg-muted);
		border-radius: 50%;
		transition: 
			transform var(--duration-performance-fast) cubic-bezier(0.34, 1.56, 0.64, 1),
			background-color var(--duration-performance-fast) var(--ease-out);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.toggle-switch:hover .toggle-slider::before {
		transform: scale(1.1);
	}

	.toggle-switch input:checked + .toggle-slider {
		background-color: var(--color-performance-fg-secondary);
	}

	.toggle-switch input:checked + .toggle-slider::before {
		transform: translateX(14px);
		background-color: var(--color-performance-fg-primary);
	}

	.toggle-switch:hover input:checked + .toggle-slider::before {
		transform: translateX(14px) scale(1.1);
	}

	/* Price Range - Ive-inspired unified slider */
	.price-group {
		max-width: 200px;
	}

	.price-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-performance-xs);
	}

	.price-header .group-title {
		margin: 0;
	}

	.price-value {
		font-size: var(--text-performance-body-sm);
		font-weight: 500;
		color: var(--color-performance-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.range-track {
		position: relative;
		height: 20px;
		display: flex;
		align-items: center;
	}

	.range-track::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--color-performance-bg-surface);
		border-radius: 1px;
	}

	.range-fill {
		position: absolute;
		height: 2px;
		background: var(--color-performance-fg-primary);
		border-radius: 1px;
		pointer-events: none;
	}

	.range-input {
		position: absolute;
		width: 100%;
		height: 20px;
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		pointer-events: none;
		margin: 0;
	}

	.range-input::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 14px;
		height: 14px;
		background: var(--color-performance-fg-primary);
		border-radius: 50%;
		cursor: grab;
		pointer-events: auto;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		transition: transform var(--duration-performance-micro) var(--ease-out);
	}

	.range-input::-webkit-slider-thumb:hover {
		transform: scale(1.1);
	}

	.range-input::-webkit-slider-thumb:active {
		cursor: grabbing;
		transform: scale(1.15);
	}

	.range-input::-moz-range-thumb {
		width: 14px;
		height: 14px;
		background: var(--color-performance-fg-primary);
		border-radius: 50%;
		cursor: grab;
		pointer-events: auto;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		border: none;
	}

	.range-input::-moz-range-thumb:hover {
		transform: scale(1.1);
	}

	.range-labels {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin-top: 2px;
	}

	.clear-btn {
		width: 100%;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		margin-top: var(--space-performance-sm);
		background: transparent;
		border-radius: var(--radius-xs);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		cursor: pointer;
		transition: 
			border-color var(--duration-performance-fast) var(--ease-out),
			color var(--duration-performance-fast) var(--ease-out),
			transform var(--duration-performance-fast) var(--ease-out);
	}

	.clear-btn:hover {
		border-color: var(--color-performance-fg-secondary);
		color: var(--color-performance-fg-secondary);
		transform: translateY(-1px);
	}

	.clear-btn:active {
		transform: translateY(0);
		transition-duration: var(--duration-performance-micro);
	}
</style>
