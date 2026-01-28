<script lang="ts">
	/**
	 * Elevation Component
	 *
	 * CREATE SOMETHING architectural elevation visualization.
	 * Shows facade from cardinal direction.
	 *
	 * Tufte: High data-ink ratio.
	 * Mies: Facade as honest expression.
	 * Rams: Unobtrusive detail.
	 */

	import type { ElevationData } from '$lib/types/architecture';
	import ArchitecturalPatterns from './ArchitecturalPatterns.svelte';

	export let elevation: ElevationData;
	export let showCaption: boolean = true;
	export let expanded: boolean = false;

	const scale = 12;
	const margin = 40;

	$: svgWidth = elevation.width * scale + margin * 2;
	$: svgHeight = elevation.height * scale + margin * 2;

	function tx(x: number): number {
		return margin + x * scale;
	}

	function ty(y: number): number {
		return svgHeight - margin - y * scale;
	}

	// Line weight tokens correspond to CSS custom properties in app.css
	// --arch-stroke-cut: 2.0 (section cuts)
	// --arch-stroke-object: 1.0 (walls, major elements)
	// --arch-stroke-medium: 0.5 (secondary elements)
	// --arch-stroke-fine: 0.25 (dimensions, annotations)
	// --arch-stroke-hairline: 0.15 (hidden lines, hatching)
	const elementStyles: Record<string, { stroke: string; width: string; dash?: string }> = {
		wall: { stroke: 'var(--arch-wall-exterior)', width: 'var(--arch-stroke-object)' },
		roof: { stroke: 'var(--arch-wall-exterior)', width: 'var(--arch-stroke-object)' },
		window: { stroke: 'var(--arch-window)', width: 'var(--arch-stroke-fine)' },
		door: { stroke: 'var(--arch-door-tick)', width: 'var(--arch-stroke-medium)' },
		column: { stroke: 'var(--arch-column)', width: 'var(--arch-stroke-cut)' },
		grade: { stroke: 'var(--arch-dimension-color)', width: 'var(--arch-stroke-fine)', dash: '2 2' }
	};

	const directionLabels: Record<string, string> = {
		north: 'North Elevation',
		south: 'South Elevation',
		east: 'East Elevation',
		west: 'West Elevation'
	};
</script>

<div class="elevation-container">
	<ArchitecturalPatterns />

	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="elevation" role="img" aria-label={elevation.name}>
		<!-- Ground fill -->
		<rect
			x={0}
			y={ty(elevation.groundLevel)}
			width={svgWidth}
			height={svgHeight - ty(elevation.groundLevel)}
			class="ground-fill"
			fill={expanded ? 'url(#earth-hatch)' : 'var(--color-bg-pure)'}
		/>

		<!-- Elements -->
		{#each elevation.elements as el}
			{@const style = elementStyles[el.type] || elementStyles.wall}
			<line
				x1={tx(el.x1)}
				y1={ty(el.y1)}
				x2={tx(el.x2)}
				y2={ty(el.y2)}
				stroke={style.stroke}
				stroke-width={style.width}
				stroke-linecap="square"
				stroke-dasharray={style.dash || 'none'}
				class="element element-{el.type}"
				style={el.filled ? 'opacity: 0.8' : ''}
			/>
		{/each}

		<!-- Windows -->
		{#each elevation.windows || [] as win}
			<rect
				x={tx(win.x)}
				y={ty(win.y + win.height)}
				width={win.width * scale}
				height={win.height * scale}
				class="window-rect"
			/>
			<!-- Window mullion -->
			<line
				x1={tx(win.x + win.width / 2)}
				y1={ty(win.y)}
				x2={tx(win.x + win.width / 2)}
				y2={ty(win.y + win.height)}
				class="window-mullion"
			/>
		{/each}

		<!-- Dimensions -->
		{#each elevation.dimensions || [] as dim}
			<g class="dimension">
				<line
					x1={tx(dim.x)}
					y1={ty(dim.y1)}
					x2={tx(dim.x)}
					y2={ty(dim.y2)}
					class="dimension-line"
				/>
				<line
					x1={tx(dim.x) - 4}
					y1={ty(dim.y2)}
					x2={tx(dim.x) + 4}
					y2={ty(dim.y2)}
					class="dimension-line"
				/>
				<line
					x1={tx(dim.x) - 4}
					y1={ty(dim.y1)}
					x2={tx(dim.x) + 4}
					y2={ty(dim.y1)}
					class="dimension-line"
				/>
				<text x={tx(dim.x) + 8} y={ty((dim.y1 + dim.y2) / 2)} class="dimension-label">
					{dim.label}
				</text>
			</g>
		{/each}

		<!-- Labels -->
		{#each elevation.labels || [] as label}
			<text x={tx(label.x)} y={ty(label.y)} class="elevation-label" class:small={label.small}>
				{label.text}
			</text>
		{/each}
	</svg>

	{#if showCaption}
		<footer class="caption-bar">
			<span class="caption">{elevation.name}</span>
			<span class="direction-hint">{directionLabels[elevation.direction]}</span>
		</footer>
	{/if}
</div>

<style>
	.elevation-container {
		width: 100%;
	}

	.elevation {
		width: 100%;
		height: auto;
		display: block;
	}

	.ground-fill {
		/* Default fill: semi-transparent background */
		opacity: 0.5;
	}

	/* When earth-hatch pattern is applied via expanded prop, use hatch opacity */
	.elevation .ground-fill {
		opacity: var(--arch-hatch-opacity);
	}

	.window-rect {
		fill: var(--arch-window);
		opacity: 0.15;
		stroke: var(--arch-window);
		stroke-width: var(--arch-stroke-fine);
	}

	.window-mullion {
		stroke: var(--arch-window);
		stroke-width: var(--arch-stroke-hairline);
	}

	/* Dimension lines */
	.dimension line {
		stroke: var(--arch-dimension-color);
		stroke-width: var(--arch-stroke-fine);
	}

	.dimension-line {
		stroke: var(--arch-dimension-color);
		stroke-width: var(--arch-stroke-fine);
	}

	.elevation-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 7px;
		fill: var(--arch-label-primary);
		text-anchor: middle;
		dominant-baseline: middle;
	}

	.elevation-label.small {
		font-size: 5px;
		fill: var(--arch-label-secondary);
	}

	.dimension-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 6px;
		fill: var(--arch-label-subtle);
		dominant-baseline: middle;
	}

	.caption-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-md, 1.5rem);
		padding-top: var(--space-sm, 1rem);
		border-top: 1px solid var(--color-border-default);
		font-family: var(--font-sans, system-ui, sans-serif);
	}

	.caption {
		font-size: var(--text-body-sm, 11px);
		color: var(--color-fg-muted);
	}

	.direction-hint {
		font-size: var(--text-caption, 10px);
		color: var(--color-fg-subtle);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest, 0.1em);
	}

	@media (max-width: 768px) {
		.caption-bar {
			flex-direction: column;
			gap: 0.5rem;
			text-align: center;
		}
	}
</style>
