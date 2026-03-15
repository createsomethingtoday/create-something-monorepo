<script lang="ts">
	/**
	 * Roof Plan Component
	 *
	 * CREATE SOMETHING roof visualization.
	 * Shows drainage, slopes, and overhangs from above.
	 *
	 * Tufte: Essential information only.
	 * Mies: Roof as fifth facade.
	 * Rams: Honest about function.
	 */

	import type { RoofPlanData } from '$lib/types/architecture';

	export let roof: RoofPlanData;
	export let showCaption: boolean = true;

	const scale = 8; // Medium scale for roof
	const margin = 30;

	$: svgWidth = roof.width * scale + margin * 2;
	$: svgHeight = roof.depth * scale + margin * 2;

	function tx(x: number): number {
		return margin + x * scale;
	}

	function ty(y: number): number {
		return svgHeight - margin - y * scale;
	}

	// Slope direction arrows
	const slopeArrows: Record<string, { dx: number; dy: number }> = {
		n: { dx: 0, dy: 1 },
		s: { dx: 0, dy: -1 },
		e: { dx: 1, dy: 0 },
		w: { dx: -1, dy: 0 },
		ne: { dx: 0.7, dy: 0.7 },
		nw: { dx: -0.7, dy: 0.7 },
		se: { dx: 0.7, dy: -0.7 },
		sw: { dx: -0.7, dy: -0.7 }
	};
</script>

<div class="roof-plan-container">
	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="roof-plan" role="img" aria-label={roof.name}>
		<!-- Roof background -->
		<rect
			x={margin}
			y={margin}
			width={roof.width * scale}
			height={roof.depth * scale}
			class="roof-fill"
		/>

		<!-- Roof outline -->
		{#each roof.outline as line}
			<line
				x1={tx(line.x1)}
				y1={ty(line.y1)}
				x2={tx(line.x2)}
				y2={ty(line.y2)}
				class="roof-edge"
			/>
		{/each}

		<!-- Slope indicators -->
		{#each roof.slopes as slope}
			{@const midX = (slope.x1 + slope.x2) / 2}
			{@const midY = (slope.y1 + slope.y2) / 2}
			{@const arrow = slopeArrows[slope.direction]}
			{@const arrowLen = 8}
			<g class="slope-indicator">
				<!-- Ridge/valley line -->
				<line
					x1={tx(slope.x1)}
					y1={ty(slope.y1)}
					x2={tx(slope.x2)}
					y2={ty(slope.y2)}
					class="ridge-line"
				/>
				<!-- Direction arrow -->
				<line
					x1={tx(midX)}
					y1={ty(midY)}
					x2={tx(midX) + arrow.dx * arrowLen}
					y2={ty(midY) - arrow.dy * arrowLen}
					class="slope-arrow"
				/>
				<polygon
					points="{tx(midX) + arrow.dx * arrowLen},{ty(midY) - arrow.dy * arrowLen}
							{tx(midX) + arrow.dx * (arrowLen - 3) - arrow.dy * 2},{ty(midY) - arrow.dy * (arrowLen - 3) - arrow.dx * 2}
							{tx(midX) + arrow.dx * (arrowLen - 3) + arrow.dy * 2},{ty(midY) - arrow.dy * (arrowLen - 3) + arrow.dx * 2}"
					class="slope-arrow-head"
				/>
			</g>
		{/each}

		<!-- Drains -->
		{#each roof.drains || [] as drain}
			<circle
				cx={tx(drain.x)}
				cy={ty(drain.y)}
				r="3"
				class="drain-outer"
			/>
			<circle cx={tx(drain.x)} cy={ty(drain.y)} r="1" class="drain-inner" />
		{/each}

		<!-- Overhangs -->
		{#each roof.overhangs || [] as oh}
			<rect
				x={tx(oh.x)}
				y={ty(oh.y + oh.height)}
				width={oh.width * scale}
				height={oh.height * scale}
				class="overhang"
			/>
			{#if oh.label}
				<text x={tx(oh.x + oh.width / 2)} y={ty(oh.y + oh.height / 2)} class="overhang-label">
					{#each oh.label.split('\n') as line, i}
						<tspan x={tx(oh.x + oh.width / 2)} dy={i === 0 ? 0 : '1.1em'}>{line}</tspan>
					{/each}
				</text>
			{/if}
		{/each}

		<!-- Labels -->
		{#each roof.labels || [] as label}
			<text x={tx(label.x)} y={ty(label.y)} class="roof-label" class:small={label.small}>
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
			<span class="caption">{roof.name}</span>
			<span class="area-hint">Roof Plan</span>
		</footer>
	{/if}
</div>

<style>
	.roof-plan-container {
		width: 100%;
	}

	.roof-plan {
		width: 100%;
		height: auto;
		display: block;
	}

	.roof-fill {
		fill: var(--color-bg-elevated);
	}

	.roof-edge {
		stroke: var(--arch-wall-exterior);
		stroke-width: 1.5;
	}

	.ridge-line {
		stroke: var(--color-fg-muted);
		stroke-width: 0.5;
		stroke-dasharray: 4 2;
	}

	.slope-arrow {
		stroke: var(--color-fg-subtle);
		stroke-width: 0.5;
	}

	.slope-arrow-head {
		fill: var(--color-fg-subtle);
	}

	.drain-outer {
		fill: none;
		stroke: var(--color-fg-muted);
		stroke-width: 0.5;
	}

	.drain-inner {
		fill: var(--color-fg-muted);
	}

	.overhang {
		fill: none;
		stroke: var(--arch-overhang);
		stroke-width: 0.5;
		stroke-dasharray: 3 2;
	}

	.north-line {
		stroke: var(--color-fg-muted);
		stroke-width: 0.75;
	}

	.north-arrow-head {
		fill: var(--color-fg-muted);
	}

	.roof-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 7px;
		fill: var(--arch-label-primary);
		text-anchor: middle;
	}

	.roof-label.small {
		font-size: 5px;
		fill: var(--arch-label-secondary);
	}

	.overhang-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 5px;
		fill: var(--arch-label-subtle);
		text-anchor: middle;
		dominant-baseline: middle;
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
