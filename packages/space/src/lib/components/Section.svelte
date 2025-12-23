<script lang="ts">
	/**
	 * Section Component
	 *
	 * CREATE SOMETHING architectural section visualization.
	 * Same pattern as FloorPlan: declarative data → SVG rendering.
	 *
	 * Tufte: High data-ink ratio.
	 * Mies: Structural honesty revealed in cut.
	 * Rams: Unobtrusive dimension lines.
	 */

	import type { SectionData } from '$lib/types/architecture';
	import ArchitecturalPatterns from './ArchitecturalPatterns.svelte';

	export let section: SectionData;
	export let showCaption: boolean = true;
	export let expanded: boolean = false;

	// Scale and dimensions
	const scale = 12;
	const margin = 40;

	$: svgWidth = section.width * scale + margin * 2;
	$: svgHeight = section.height * scale + margin * 2;

	// Coordinate transforms
	function tx(x: number): number {
		return margin + x * scale;
	}

	function ty(y: number): number {
		return svgHeight - margin - y * scale;
	}

	// Element stroke styles - using design tokens via CSS classes
	const elementStyles: Record<string, { stroke: string; width: number; dash?: string }> = {
		wall: { stroke: 'var(--arch-wall-exterior)', width: 1.5 },
		floor: { stroke: 'var(--arch-wall-exterior)', width: 1.5 },
		ceiling: { stroke: 'var(--color-fg-tertiary)', width: 0.75 },
		roof: { stroke: 'var(--arch-wall-exterior)', width: 1.5 },
		grade: { stroke: 'var(--color-fg-muted)', width: 0.5, dash: '2 2' }
	};
</script>

<div class="section-container">
	<ArchitecturalPatterns />

	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="section" role="img" aria-label={section.name}>
		<!-- Ground fill -->
		<rect
			x={0}
			y={ty(section.groundLevel)}
			width={svgWidth}
			height={svgHeight - ty(section.groundLevel)}
			class="ground-fill"
			fill={expanded ? 'url(#earth-hatch)' : 'var(--color-bg-pure)'}
		/>

		<!-- Section elements -->
		{#each section.elements as el}
			{@const style = elementStyles[el.type] || elementStyles.wall}
			{#if el.filled}
				<!-- Filled element (cut through solid) - show hatch when expanded -->
				{#if expanded}
					<!-- Create a filled rectangle with concrete hatch for cut elements -->
					<rect
						x={Math.min(tx(el.x1), tx(el.x2)) - style.width * 2}
						y={Math.min(ty(el.y1), ty(el.y2)) - style.width * 2}
						width={Math.abs(tx(el.x2) - tx(el.x1)) + style.width * 4}
						height={Math.abs(ty(el.y2) - ty(el.y1)) + style.width * 4}
						fill="url(#concrete-hatch)"
						class="element-fill element-{el.type}"
					/>
				{/if}
				<line
					x1={tx(el.x1)}
					y1={ty(el.y1)}
					x2={tx(el.x2)}
					y2={ty(el.y2)}
					stroke={style.stroke}
					stroke-width={style.width * 2}
					stroke-linecap="square"
					class="element element-{el.type} filled"
				/>
			{:else}
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
				/>
			{/if}
		{/each}

		<!-- Dimension lines -->
		{#each section.dimensions || [] as dim}
			<g class="dimension">
				<!-- Vertical line -->
				<line
					x1={tx(dim.x)}
					y1={ty(dim.y1)}
					x2={tx(dim.x)}
					y2={ty(dim.y2)}
					class="dimension-line"
				/>
				<!-- Top tick -->
				<line
					x1={tx(dim.x) - 4}
					y1={ty(dim.y2)}
					x2={tx(dim.x) + 4}
					y2={ty(dim.y2)}
					class="dimension-line"
				/>
				<!-- Bottom tick -->
				<line
					x1={tx(dim.x) - 4}
					y1={ty(dim.y1)}
					x2={tx(dim.x) + 4}
					y2={ty(dim.y1)}
					class="dimension-line"
				/>
				<!-- Label -->
				<text
					x={tx(dim.x) + 8}
					y={ty((dim.y1 + dim.y2) / 2)}
					class="dimension-label"
				>
					{dim.label}
				</text>
			</g>
		{/each}

		<!-- Labels -->
		{#each section.labels as label}
			<text
				x={tx(label.x)}
				y={ty(label.y)}
				class="section-label"
				class:small={label.small}
			>
				{#each label.text.split('\n') as line, i}
					<tspan x={tx(label.x)} dy={i === 0 ? 0 : '1.1em'}>{line}</tspan>
				{/each}
			</text>
		{/each}

		<!-- Cut line indicator -->
		{#if section.cutLine}
			<text x={margin - 10} y={margin / 2} class="cut-line-label">
				{section.cutLine}
			</text>
		{/if}
	</svg>

	{#if showCaption}
		<footer class="caption-bar">
			<span class="caption">{section.name}</span>
			{#if section.cutLine}
				<span class="cut-hint">Section {section.cutLine}</span>
			{/if}
		</footer>
	{/if}
</div>

<style>
	.section-container {
		width: 100%;
	}

	.section {
		width: 100%;
		height: auto;
		display: block;
	}

	.ground-fill {
		/* Default fill: semi-transparent background */
		opacity: 0.5;
	}

	/* When earth-hatch pattern is applied via expanded prop, use hatch opacity */
	.section .ground-fill {
		opacity: var(--arch-hatch-opacity);
	}

	/* Dimension lines */
	.dimension line {
		stroke: var(--color-fg-subtle);
		stroke-width: 0.5;
	}

	.dimension-line {
		stroke: var(--arch-dimension-color);
		stroke-width: 0.5;
	}

	/* Labels */
	.section-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 7px;
		fill: var(--arch-label-primary);
		text-anchor: middle;
		dominant-baseline: middle;
		letter-spacing: var(--tracking-normal, 0.02em);
	}

	.section-label.small {
		font-size: 5px;
		fill: var(--arch-label-secondary);
	}

	.dimension-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 6px;
		fill: var(--arch-label-subtle);
		dominant-baseline: middle;
		letter-spacing: var(--tracking-normal, 0.02em);
	}

	.cut-line-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 8px;
		fill: var(--color-fg-muted);
		font-weight: var(--font-medium, 500);
		letter-spacing: var(--tracking-wider, 0.05em);
	}

	/* Caption */
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
		letter-spacing: var(--tracking-normal, 0.02em);
	}

	.cut-hint {
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

		.caption {
			font-size: var(--text-caption, 10px);
		}
	}
</style>
