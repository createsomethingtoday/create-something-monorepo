<script lang="ts">
	/**
	 * GraphControls Component
	 *
	 * View mode selector, edge filters, and display toggles.
	 */

	import type { ViewMode, EdgeFilters } from './types.js';

	interface Props {
		viewMode: ViewMode;
		edgeFilters: EdgeFilters;
		showLabels: boolean;
		showEdgeLabels: boolean;
		onViewModeChange?: (mode: ViewMode) => void;
		onEdgeFilterChange?: (filters: EdgeFilters) => void;
		onToggleLabels?: () => void;
		onToggleEdgeLabels?: () => void;
	}

	let {
		viewMode,
		edgeFilters,
		showLabels,
		showEdgeLabels,
		onViewModeChange,
		onEdgeFilterChange,
		onToggleLabels,
		onToggleEdgeLabels
	}: Props = $props();

	function handleViewModeClick(mode: ViewMode) {
		if (onViewModeChange) {
			onViewModeChange(mode);
		}
	}

	function handleEdgeFilterToggle(type: keyof EdgeFilters) {
		if (onEdgeFilterChange) {
			onEdgeFilterChange({
				...edgeFilters,
				[type]: !edgeFilters[type]
			});
		}
	}
</script>

<div class="controls">
	<div class="controls-section">
		<h3 class="section-title">View Mode</h3>
		<div class="button-group">
			<button
				class="control-btn"
				class:active={viewMode === 'full'}
				onclick={() => handleViewModeClick('full')}
			>
				Full Graph
			</button>
			<button
				class="control-btn"
				class:active={viewMode === 'package'}
				onclick={() => handleViewModeClick('package')}
			>
				Package Focus
			</button>
			<button
				class="control-btn"
				class:active={viewMode === 'concept'}
				onclick={() => handleViewModeClick('concept')}
			>
				Concept Focus
			</button>
		</div>
	</div>

	<div class="controls-section">
		<h3 class="section-title">Edge Types</h3>
		<div class="checkbox-group">
			<label class="checkbox-label">
				<input
					type="checkbox"
					checked={edgeFilters.explicit}
					onchange={() => handleEdgeFilterToggle('explicit')}
				/>
				<span class="checkbox-text">Explicit (UNDERSTANDING.md)</span>
			</label>
			<label class="checkbox-label">
				<input
					type="checkbox"
					checked={edgeFilters.crossReference}
					onchange={() => handleEdgeFilterToggle('crossReference')}
				/>
				<span class="checkbox-text">Cross-references (links)</span>
			</label>
			<label class="checkbox-label">
				<input
					type="checkbox"
					checked={edgeFilters.concept}
					onchange={() => handleEdgeFilterToggle('concept')}
				/>
				<span class="checkbox-text">Concept (shared terms)</span>
			</label>
			<label class="checkbox-label">
				<input
					type="checkbox"
					checked={edgeFilters.semantic}
					onchange={() => handleEdgeFilterToggle('semantic')}
				/>
				<span class="checkbox-text">Semantic (embeddings)</span>
			</label>
		</div>
	</div>

	<div class="controls-section">
		<h3 class="section-title">Display</h3>
		<div class="checkbox-group">
			<label class="checkbox-label">
				<input type="checkbox" checked={showLabels} onchange={onToggleLabels} />
				<span class="checkbox-text">Show node labels</span>
			</label>
			<label class="checkbox-label">
				<input type="checkbox" checked={showEdgeLabels} onchange={onToggleEdgeLabels} />
				<span class="checkbox-text">Show edge labels</span>
			</label>
		</div>
	</div>
</div>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.controls-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.section-title {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.button-group {
		display: flex;
		gap: var(--space-xs);
	}

	.control-btn {
		flex: 1;
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.control-btn:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.control-btn.active {
		color: var(--color-fg-primary);
		background: var(--color-active);
		border-color: var(--color-border-strong);
	}

	.checkbox-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		cursor: pointer;
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.checkbox-label:hover {
		background: var(--color-hover);
	}

	.checkbox-label input[type='checkbox'] {
		width: 16px;
		height: 16px;
		cursor: pointer;
		accent-color: var(--color-data-1);
	}

	.checkbox-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}
</style>
