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
		hideOrphans: boolean;
		onViewModeChange?: (mode: ViewMode) => void;
		onEdgeFilterChange?: (filters: EdgeFilters) => void;
		onToggleLabels?: () => void;
		onToggleEdgeLabels?: () => void;
		onToggleHideOrphans?: () => void;
	}

	let {
		viewMode,
		edgeFilters,
		showLabels,
		showEdgeLabels,
		hideOrphans,
		onViewModeChange,
		onEdgeFilterChange,
		onToggleLabels,
		onToggleEdgeLabels,
		onToggleHideOrphans
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
			<label class="checkbox-label">
				<input
					type="checkbox"
					checked={edgeFilters.infrastructure}
					onchange={() => handleEdgeFilterToggle('infrastructure')}
				/>
				<span class="checkbox-text infrastructure">Infrastructure (D1/KV/R2)</span>
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
			<label class="checkbox-label">
				<input type="checkbox" checked={hideOrphans} onchange={onToggleHideOrphans} />
				<span class="checkbox-text">Hide orphan nodes</span>
			</label>
		</div>
	</div>
</div>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-lg);
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
	}

	.controls-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	.section-title {
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
		color: var(--color-performance-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.button-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.control-btn {
		width: 100%;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-sm);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
		text-align: left;
	}

	.control-btn:hover {
		background: var(--color-performance-hover);
		border-color: var(--color-performance-border-emphasis);
	}

	.control-btn.active {
		color: var(--color-performance-fg-primary);
		background: var(--color-performance-active);
		border-color: var(--color-performance-border-strong);
	}

	.checkbox-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		cursor: pointer;
		padding: var(--space-performance-xs);
		border-radius: var(--radius-performance-scale-sm);
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.checkbox-label:hover {
		background: var(--color-performance-hover);
	}

	.checkbox-label input[type='checkbox'] {
		width: 16px;
		height: 16px;
		cursor: pointer;
		accent-color: var(--color-performance-data-1);
	}

	.checkbox-text {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.checkbox-text.infrastructure {
		color: var(--color-performance-data-4, #fbbf24);
	}
</style>
