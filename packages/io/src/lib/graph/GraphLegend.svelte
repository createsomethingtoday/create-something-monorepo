<script lang="ts">
	/**
	 * GraphLegend Component
	 *
	 * Legend showing package colors and edge types.
	 */

	import { PACKAGE_COLORS } from './cytoscape-config.js';

	const packages = [
		{ name: 'io', label: 'Research & Documentation' },
		{ name: 'space', label: 'Practice & Experiments' },
		{ name: 'agency', label: 'Services & Client Work' },
		{ name: 'ltd', label: 'Philosophy & Canon' },
		{ name: 'components', label: 'Shared Components' },
		{ name: 'harness', label: 'Agent Orchestration' },
		{ name: 'lms', label: 'Learning Platform' },
		{ name: 'dotfiles', label: 'Configuration' }
	];

	const edgeTypes = [
		{
			type: 'explicit',
			label: 'Declared dependency',
			color: 'rgba(27, 31, 35, 0.72)',
			style: 'solid',
			description: 'Recorded in an UNDERSTANDING.md file'
		},
		{
			type: 'cross-reference',
			label: 'Linked document',
			color: 'rgba(27, 31, 35, 0.56)',
			style: 'solid',
			description: 'One source file links to another'
		},
		{
			type: 'concept',
			label: 'Shared term',
			color: 'rgba(27, 31, 35, 0.34)',
			style: 'dashed',
			description: 'Both documents use the same defined term'
		},
		{
			type: 'semantic',
			label: 'Similar text',
			color: 'rgba(27, 31, 35, 0.22)',
			style: 'dotted',
			description: 'The documents contain similar language'
		},
		{
			type: 'infrastructure',
			label: 'Shared service',
			color: 'var(--color-performance-data-4, #fbbf24)',
			style: 'solid',
			description: 'Both documents use the same database, storage, or service'
		}
	];
</script>

<div class="legend">
	<div class="legend-section">
		<h3 class="section-title">Packages</h3>
		<div class="legend-items">
			{#each packages as pkg}
				<div class="legend-item">
					<div class="color-box" style="background-color: {PACKAGE_COLORS[pkg.name]}"></div>
					<div class="legend-text">
						<span class="legend-label">{pkg.name}</span>
						<span class="legend-description">{pkg.label}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="legend-section">
		<h3 class="section-title">Connections</h3>
		<div class="legend-items">
			{#each edgeTypes as edge}
				<div class="legend-item">
					<svg class="edge-demo" width="32" height="16" viewBox="0 0 32 16">
						<line
							x1="0"
							y1="8"
							x2="32"
							y2="8"
							stroke={edge.color}
							stroke-width="2"
							stroke-dasharray={edge.style === 'dashed'
								? '4 2'
								: edge.style === 'dotted'
									? '2 2'
									: '0'}
						/>
					</svg>
					<div class="legend-text">
						<span class="legend-label">{edge.label}</span>
						<span class="legend-description">{edge.description}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.legend {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-lg);
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
	}

	.legend-section {
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

	.legend-items {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-xs);
		border-radius: var(--radius-performance-scale-sm);
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.legend-item:hover {
		background: var(--color-performance-hover);
	}

	.color-box {
		width: 16px;
		height: 16px;
		border-radius: var(--radius-performance-scale-sm);
		flex-shrink: 0;
	}

	.edge-demo {
		flex-shrink: 0;
	}

	.legend-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.legend-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.legend-description {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}
</style>
