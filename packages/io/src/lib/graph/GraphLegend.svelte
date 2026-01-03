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
			label: 'Explicit (UNDERSTANDING.md)',
			color: 'rgba(255, 255, 255, 0.6)',
			style: 'solid',
			description: 'Architectural dependencies'
		},
		{
			type: 'cross-reference',
			label: 'Cross-reference (links)',
			color: 'rgba(255, 255, 255, 0.46)',
			style: 'solid',
			description: 'Markdown links between files'
		},
		{
			type: 'concept',
			label: 'Concept (shared terms)',
			color: 'rgba(255, 255, 255, 0.2)',
			style: 'dashed',
			description: 'Shared philosophical concepts'
		},
		{
			type: 'semantic',
			label: 'Semantic (embeddings)',
			color: 'rgba(255, 255, 255, 0.1)',
			style: 'dotted',
			description: 'Content similarity via embeddings'
		},
		{
			type: 'infrastructure',
			label: 'Infrastructure (D1/KV/R2)',
			color: 'var(--color-data-4, #fbbf24)',
			style: 'solid',
			description: 'Shared Cloudflare resources'
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
		<h3 class="section-title">Edge Types</h3>
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
		gap: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.legend-section {
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

	.legend-items {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.legend-item:hover {
		background: var(--color-hover);
	}

	.color-box {
		width: 16px;
		height: 16px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-default);
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
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.legend-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
</style>
