<script lang="ts">
	/**
	 * Site Plan Component
	 *
	 * CREATE SOMETHING site visualization.
	 * Shows property, setbacks, and building footprint.
	 *
	 * Tufte: Context without clutter.
	 * Mies: Building in landscape.
	 * Rams: Essential relationships only.
	 */

	import type { SitePlanData } from '$lib/types/architecture';

	export let site: SitePlanData;
	export let showCaption: boolean = true;

	const scale = 4; // Smaller scale for site (larger area)
	const margin = 30;

	$: svgWidth = site.width * scale + margin * 2;
	$: svgHeight = site.depth * scale + margin * 2;

	function tx(x: number): number {
		return margin + x * scale;
	}

	function ty(y: number): number {
		return svgHeight - margin - y * scale;
	}

	const featureStyles: Record<string, { fill: string; stroke: string }> = {
		building: { fill: 'var(--arch-site-building)', stroke: 'var(--arch-wall-exterior)' },
		driveway: { fill: 'var(--arch-site-driveway)', stroke: 'var(--color-fg-muted)' },
		patio: { fill: 'var(--color-bg-elevated)', stroke: 'var(--color-fg-subtle)' },
		pool: { fill: 'var(--arch-site-water)', stroke: 'var(--arch-hvac-supply)' },
		garden: { fill: 'var(--arch-site-landscape)', stroke: 'var(--arch-site-landscape)' },
		tree: { fill: 'var(--arch-site-landscape)', stroke: 'var(--arch-site-landscape)' }
	};
</script>

<div class="site-plan-container">
	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="site-plan" role="img" aria-label={site.name}>
		<!-- Property background -->
		<rect
			x={margin}
			y={margin}
			width={site.width * scale}
			height={site.depth * scale}
			class="property-fill"
		/>

		<!-- Property lines -->
		{#each site.propertyLines as line}
			<line
				x1={tx(line.x1)}
				y1={ty(line.y1)}
				x2={tx(line.x2)}
				y2={ty(line.y2)}
				class="property-line"
			/>
		{/each}

		<!-- Setback lines -->
		{#each site.setbacks || [] as setback}
			<line
				x1={tx(setback.x1)}
				y1={ty(setback.y1)}
				x2={tx(setback.x2)}
				y2={ty(setback.y2)}
				class="setback-line"
			/>
			{#if setback.label}
				<text
					x={tx((setback.x1 + setback.x2) / 2)}
					y={ty((setback.y1 + setback.y2) / 2) - 5}
					class="setback-label"
				>
					{setback.label}
				</text>
			{/if}
		{/each}

		<!-- Features -->
		{#each site.features as feature}
			{@const style = featureStyles[feature.type] || featureStyles.building}
			{#if feature.type === 'tree'}
				<!-- Circle for trees -->
				<circle
					cx={tx(feature.x + feature.width / 2)}
					cy={ty(feature.y + feature.height / 2)}
					r={(feature.width * scale) / 2}
					fill={style.fill}
					stroke={style.stroke}
					stroke-width="0.5"
					class="feature feature-{feature.type}"
				/>
			{:else}
				<rect
					x={tx(feature.x)}
					y={ty(feature.y + feature.height)}
					width={feature.width * scale}
					height={feature.height * scale}
					fill={style.fill}
					stroke={style.stroke}
					stroke-width={feature.type === 'building' ? 1.5 : 0.5}
					class="feature feature-{feature.type}"
				/>
			{/if}
			{#if feature.label}
				<text
					x={tx(feature.x + feature.width / 2)}
					y={ty(feature.y + feature.height / 2)}
					class="feature-label"
				>
					{feature.label}
				</text>
			{/if}
		{/each}

		<!-- Labels -->
		{#each site.labels || [] as label}
			<text x={tx(label.x)} y={ty(label.y)} class="site-label" class:small={label.small}>
				{label.text}
			</text>
		{/each}

		<!-- North arrow -->
		<g class="north-arrow">
			<line
				x1={svgWidth - 25}
				y1={margin + 30}
				x2={svgWidth - 25}
				y2={margin + 10}
				class="north-line"
			/>
			<polygon
				points="{svgWidth - 25},{margin + 10} {svgWidth - 28},{margin + 16} {svgWidth - 22},{margin + 16}"
				class="north-arrow-head"
			/>
			<text x={svgWidth - 25} y={margin + 40} class="north-label">N</text>
		</g>
	</svg>

	{#if showCaption}
		<footer class="caption-bar">
			<span class="caption">{site.name}</span>
			<span class="area-hint">{site.width}′ × {site.depth}′</span>
		</footer>
	{/if}
</div>

<style>
	.site-plan-container {
		width: 100%;
	}

	.site-plan {
		width: 100%;
		height: auto;
		display: block;
	}

	.property-fill {
		fill: var(--color-bg-pure);
	}

	.property-line {
		stroke: var(--color-fg-secondary);
		stroke-width: 1.5;
		stroke-dasharray: 4 2;
	}

	.setback-line {
		stroke: var(--arch-site-setback);
		stroke-width: 0.5;
		stroke-dasharray: 8 4;
	}

	.north-line {
		stroke: var(--color-fg-muted);
		stroke-width: 0.75;
	}

	.north-arrow-head {
		fill: var(--color-fg-muted);
	}

	.feature-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 6px;
		fill: var(--arch-label-secondary);
		text-anchor: middle;
		dominant-baseline: middle;
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider, 0.05em);
	}

	.site-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 7px;
		fill: var(--arch-label-primary);
		text-anchor: middle;
	}

	.site-label.small {
		font-size: 5px;
		fill: var(--arch-label-secondary);
	}

	.setback-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 5px;
		fill: var(--arch-label-subtle);
		text-anchor: middle;
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider, 0.05em);
	}

	.north-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 6px;
		fill: var(--arch-label-subtle);
		text-anchor: middle;
	}

	.caption-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-md, 1.5rem);
		padding-top: var(--space-sm, 1rem);
		border-top: 1px solid var(--color-hover);
		font-family: var(--font-sans, system-ui, sans-serif);
	}

	.caption {
		font-size: var(--text-body-sm, 11px);
		color: var(--color-fg-muted);
	}

	.area-hint {
		font-size: var(--text-caption, 10px);
		color: var(--color-fg-subtle);
	}

	@media (max-width: 768px) {
		.caption-bar {
			flex-direction: column;
			gap: 0.5rem;
			text-align: center;
		}
	}
</style>
