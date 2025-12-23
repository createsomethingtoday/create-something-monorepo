<script lang="ts">
	/**
	 * FloorPlan Component
	 *
	 * CREATE SOMETHING architectural visualization.
	 * Tufte: High data-ink ratio, no chartjunk.
	 * Mies: Less is more, structural honesty.
	 * Rams: Less but better, unobtrusive.
	 *
	 * The philosophy is implicit in the structure.
	 */

	import type { FloorPlanData } from '$lib/types/architecture';

	export let plan: FloorPlanData;
	export let showCaption: boolean = true;
	export let interactive: boolean = true;

	// Threshold zone colors - using design tokens
	// Tufte: minimize non-data ink while maintaining information
	const zoneColors: Record<string, string> = {
		outer: 'var(--arch-zone-outer)',
		service: 'var(--arch-zone-service)',
		public: 'var(--arch-zone-public)',
		private: 'var(--arch-zone-private)',
		open: 'var(--arch-zone-open)'
	};

	// Scale and dimensions - Mies: proportion matters
	const scale = 12;
	const margin = 20;

	// Calculate extent including overhangs
	$: maxX = Math.max(
		plan.width,
		...(plan.overhangs || []).map((o) => o.x + o.width)
	);
	$: maxY = Math.max(
		plan.depth,
		...(plan.overhangs || []).map((o) => o.y + o.height)
	);

	$: svgWidth = maxX * scale + margin * 2 + 80;
	$: svgHeight = maxY * scale + margin * 2 + 20;

	// Coordinate transforms (SVG y is inverted)
	function tx(x: number): number {
		return margin + x * scale;
	}

	function ty(y: number): number {
		return svgHeight - margin - y * scale - 20;
	}

	// Hovered zone for tooltip
	let hoveredZone: string | null = null;

	// Cost summary toggle
	let showCosts = false;

	// Format currency
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	// Group line items by category
	$: groupedCosts = plan.materials?.lineItems.reduce(
		(acc, item) => {
			if (!acc[item.category]) acc[item.category] = [];
			acc[item.category].push(item);
			return acc;
		},
		{} as Record<string, typeof plan.materials.lineItems>
	);

	// Caption
	$: caption = [
		`${plan.width}′ × ${plan.depth}′`,
		`${(plan.width * plan.depth).toLocaleString()} SF`,
		plan.bedrooms ? `${plan.bedrooms} BR / ${plan.bathrooms} BA` : null,
		plan.features
	]
		.filter(Boolean)
		.join('  ·  ');

	// Scale bar configuration
	const scaleBarIntervals = [0, 5, 10, 15, 20]; // feet
	const scaleBarY = svgHeight - 10; // Position near bottom
	const scaleBarStartX = margin;
</script>

<div class="floor-plan-container" class:interactive>
	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="floor-plan" role="img" aria-label={plan.name}>
		<!-- Threshold zones -->
		{#each plan.zones as zone}
			<rect
				x={tx(zone.x)}
				y={ty(zone.y + zone.height)}
				width={zone.width * scale}
				height={zone.height * scale}
				fill={zoneColors[zone.type] || zoneColors.open}
				class="zone zone-{zone.type}"
				onmouseenter={() => interactive && (hoveredZone = zone.type)}
				onmouseleave={() => interactive && (hoveredZone = null)}
				role="presentation"
			/>
		{/each}

		<!-- Overhangs - dashed lines for covered outdoor areas -->
		{#each plan.overhangs || [] as oh}
			<rect
				x={tx(oh.x)}
				y={ty(oh.y + oh.height)}
				width={oh.width * scale}
				height={oh.height * scale}
				class="overhang"
			/>
			{#if oh.label}
				<text
					x={tx(oh.x + oh.width / 2)}
					y={ty(oh.y + oh.height / 2)}
					class="overhang-label"
				>
					{#each oh.label.split('\n') as line, i}
						<tspan x={tx(oh.x + oh.width / 2)} dy={i === 0 ? 0 : '1.1em'}>{line}</tspan>
					{/each}
				</text>
			{/if}
		{/each}

		<!-- Walls - Mies: structural clarity through refined lines -->
		{#each plan.walls as wall}
			<line
				x1={tx(wall.x1)}
				y1={ty(wall.y1)}
				x2={tx(wall.x2)}
				y2={ty(wall.y2)}
				class="wall"
				class:exterior={wall.exterior}
			/>
		{/each}

		<!-- Columns - Mies: structure expressed honestly -->
		{#each plan.columns || [] as col}
			<rect
				x={tx(col.x) - 2.5}
				y={ty(col.y) - 2.5}
				width="5"
				height="5"
				class="column"
			/>
		{/each}

		<!-- Doors - minimal openings (two small perpendicular marks) -->
		{#each plan.doors || [] as d}
			{@const halfW = (d.width * scale) / 2}
			{@const tickLen = 3}
			{#if d.orientation === 'horizontal'}
				<!-- Horizontal wall: door opening with vertical ticks -->
				<line
					x1={tx(d.x) - halfW}
					y1={ty(d.y) - tickLen}
					x2={tx(d.x) - halfW}
					y2={ty(d.y) + tickLen}
					class="door-tick"
				/>
				<line
					x1={tx(d.x) + halfW}
					y1={ty(d.y) - tickLen}
					x2={tx(d.x) + halfW}
					y2={ty(d.y) + tickLen}
					class="door-tick"
				/>
			{:else}
				<!-- Vertical wall: door opening with horizontal ticks -->
				<line
					x1={tx(d.x) - tickLen}
					y1={ty(d.y) - halfW}
					x2={tx(d.x) + tickLen}
					y2={ty(d.y) - halfW}
					class="door-tick"
				/>
				<line
					x1={tx(d.x) - tickLen}
					y1={ty(d.y) + halfW}
					x2={tx(d.x) + tickLen}
					y2={ty(d.y) + halfW}
					class="door-tick"
				/>
			{/if}
		{/each}

		<!-- Windows - thin line indicating glazing -->
		{#each plan.windows || [] as w}
			{@const halfW = (w.width * scale) / 2}
			{#if w.orientation === 'vertical'}
				<!-- Vertical wall: horizontal window line -->
				<line
					x1={tx(w.x) - 2}
					y1={ty(w.y) - halfW}
					x2={tx(w.x) - 2}
					y2={ty(w.y) + halfW}
					class="window"
				/>
			{:else}
				<!-- Horizontal wall: vertical window line -->
				<line
					x1={tx(w.x) - halfW}
					y1={ty(w.y) - 2}
					x2={tx(w.x) + halfW}
					y2={ty(w.y) - 2}
					class="window"
				/>
			{/if}
		{/each}

		<!-- Room labels -->
		{#each plan.rooms as room}
			<text x={tx(room.x)} y={ty(room.y)} class="room-label" class:small={room.small}>
				{#each room.name.split('\n') as line, i}
					<tspan x={tx(room.x)} dy={i === 0 ? 0 : '1.1em'}>{line}</tspan>
				{/each}
			</text>
		{/each}

		<!-- Entry arrow - Tufte: data, not decoration -->
		{#if plan.entry}
			<g class="entry">
				<line
					x1={tx(plan.entry.x + 4)}
					y1={ty(plan.entry.y)}
					x2={tx(plan.entry.x - 1)}
					y2={ty(plan.entry.y)}
					class="entry-line"
				/>
				<polygon
					points="{tx(plan.entry.x - 1)},{ty(plan.entry.y)} {tx(plan.entry.x + 0.5)},{ty(plan.entry.y) - 3} {tx(plan.entry.x + 0.5)},{ty(plan.entry.y) + 3}"
					class="entry-arrow"
				/>
			</g>
		{/if}

		<!-- North arrow - minimal -->
		<g class="north-arrow">
			<line
				x1={tx(plan.width + 5)}
				y1={ty(plan.depth - 4)}
				x2={tx(plan.width + 5)}
				y2={ty(plan.depth - 1)}
				class="north-line"
			/>
			<text x={tx(plan.width + 5)} y={ty(plan.depth) - 3} class="north-label">N</text>
		</g>

		<!-- Scale bar - graphic representation -->
		<g class="scale-bar">
			<!-- Main horizontal line -->
			<line
				x1={scaleBarStartX}
				y1={scaleBarY}
				x2={scaleBarStartX + (20 * scale)}
				y2={scaleBarY}
				class="scale-bar-line"
			/>

			<!-- Interval marks and labels -->
			{#each scaleBarIntervals as interval}
				<line
					x1={scaleBarStartX + (interval * scale)}
					y1={scaleBarY - 3}
					x2={scaleBarStartX + (interval * scale)}
					y2={scaleBarY + 3}
					class="scale-bar-tick"
				/>
				<text
					x={scaleBarStartX + (interval * scale)}
					y={scaleBarY + 10}
					class="scale-bar-label"
				>
					{interval}′
				</text>
			{/each}
		</g>

		<!-- Title block - minimal, bottom left -->
		<g class="title-block">
			<text x={margin} y={margin - 5} class="title-block-name">
				{plan.name}
			</text>
			<text x={margin} y={margin - 15} class="title-block-scale">
				SCALE: 1/4″ = 1′-0″
			</text>
		</g>
	</svg>

	{#if showCaption}
		<footer class="caption-bar">
			<span class="caption">{caption}</span>
			<span class="caption-right">
				{#if hoveredZone}
					<span class="zone-hint">{hoveredZone}</span>
				{/if}
				{#if plan.materials}
					<button
						class="cost-toggle"
						onclick={() => (showCosts = !showCosts)}
						aria-expanded={showCosts}
					>
						{showCosts ? '−' : '+'} Budget
					</button>
				{/if}
			</span>
		</footer>
	{/if}

	<!-- Cost Summary - collapsible, subdued -->
	{#if plan.materials && showCosts}
		<div class="cost-summary">
			<div class="cost-header">
				<span class="cost-total">{formatCurrency(plan.materials.totalSF * plan.materials.costPerSF)}</span>
				<span class="cost-per-sf">{formatCurrency(plan.materials.costPerSF)}/SF</span>
			</div>

			{#if groupedCosts}
				<div class="cost-categories">
					{#each Object.entries(groupedCosts) as [category, items]}
						<div class="cost-category">
							<h4 class="category-name">{category}</h4>
							{#each items as item}
								<div class="cost-item">
									<span class="item-desc">{item.description}</span>
									<span class="item-amount">{formatCurrency(item.estimate)}</span>
								</div>
								{#if item.notes}
									<p class="item-notes">{item.notes}</p>
								{/if}
							{/each}
						</div>
					{/each}
				</div>
			{/if}

			{#if plan.materials.assumptions?.length}
				<div class="cost-assumptions">
					<h4>Assumptions</h4>
					<ul>
						{#each plan.materials.assumptions as assumption}
							<li>{assumption}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if plan.materials.lastUpdated}
				<p class="cost-updated">Updated {plan.materials.lastUpdated}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.floor-plan-container {
		width: 100%;
	}

	.floor-plan {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Zones - barely perceptible, Tufte-style */
	.zone {
		transition: opacity var(--duration-standard, 0.3s) var(--ease-standard, ease);
	}

	.interactive .zone:hover {
		opacity: 0.5;
	}

	/* Walls - using design tokens */
	.wall {
		stroke: var(--arch-wall-interior);
		stroke-width: var(--arch-wall-weight-interior);
		stroke-linecap: square;
	}

	.wall.exterior {
		stroke: var(--arch-wall-exterior);
		stroke-width: var(--arch-wall-weight-exterior);
	}

	/* Overhangs - dashed outline */
	.overhang {
		fill: none;
		stroke: var(--arch-overhang);
		stroke-width: 0.5;
		stroke-dasharray: 4 2;
	}

	/* Columns */
	.column {
		fill: var(--arch-column);
	}

	/* Doors */
	.door-tick {
		stroke: var(--arch-door-tick);
		stroke-width: 0.5;
	}

	/* Windows */
	.window {
		stroke: var(--arch-window);
		stroke-width: 2;
	}

	/* Entry arrow */
	.entry-line {
		stroke: var(--arch-entry-arrow);
		stroke-width: 1;
	}

	.entry-arrow {
		fill: var(--arch-entry-arrow);
	}

	/* North arrow */
	.north-line {
		stroke: var(--arch-label-subtle);
		stroke-width: 0.75;
	}

	/* Room labels - Rams: unobtrusive */
	.room-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 7px;
		fill: var(--arch-label-primary);
		text-anchor: middle;
		dominant-baseline: middle;
		letter-spacing: var(--tracking-normal, 0.02em);
	}

	.room-label.small {
		font-size: 5px;
		fill: var(--arch-label-secondary);
	}

	/* North label - minimal */
	.north-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 6px;
		fill: var(--arch-label-subtle);
		text-anchor: middle;
		letter-spacing: var(--tracking-wider, 0.05em);
	}

	/* Overhang label - subtle */
	.overhang-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 5px;
		fill: var(--arch-label-subtle);
		text-anchor: middle;
		dominant-baseline: middle;
		letter-spacing: var(--tracking-wider, 0.05em);
		text-transform: uppercase;
	}

	/* Caption - Tufte: minimal chrome */
	.caption-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-md, 1.5rem);
		padding-top: var(--space-sm, 1rem);
		border-top: 1px solid var(--color-hover, rgba(255, 255, 255, 0.05));
		font-family: var(--font-sans, system-ui, sans-serif);
	}

	.caption {
		font-size: var(--text-body-sm, 11px);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-normal, 0.02em);
	}

	.zone-hint {
		font-size: var(--text-caption, 10px);
		color: var(--color-fg-subtle);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest, 0.1em);
	}

	.caption-right {
		display: flex;
		align-items: center;
		gap: var(--space-sm, 1rem);
	}

	/* Cost toggle button - subdued */
	.cost-toggle {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: var(--text-caption, 10px);
		color: var(--color-fg-subtle);
		background: none;
		border: 1px solid var(--color-border-default);
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		letter-spacing: var(--tracking-wider, 0.05em);
		text-transform: uppercase;
		transition: all var(--duration-micro, 0.2s) var(--ease-standard, ease);
	}

	.cost-toggle:hover {
		color: var(--color-fg-tertiary);
		border-color: var(--color-border-emphasis);
	}

	/* Cost summary panel - Rams: unobtrusive financial clarity */
	.cost-summary {
		margin-top: var(--space-md, 1.5rem);
		padding: var(--space-md, 1.5rem);
		background: var(--color-hover, rgba(255, 255, 255, 0.02));
		border: 1px solid var(--color-hover, rgba(255, 255, 255, 0.05));
		font-family: var(--font-sans, system-ui, sans-serif);
	}

	.cost-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding-bottom: var(--space-sm, 1rem);
		border-bottom: 1px solid var(--color-hover, rgba(255, 255, 255, 0.05));
		margin-bottom: var(--space-sm, 1rem);
	}

	.cost-total {
		font-size: 1.5rem;
		font-weight: 200;
		color: var(--color-fg-tertiary);
		letter-spacing: var(--tracking-tight, -0.02em);
	}

	.cost-per-sf {
		font-size: var(--text-body-sm, 11px);
		color: var(--color-fg-subtle);
	}

	.cost-categories {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md, 1.5rem);
	}

	.cost-category {
		padding: var(--space-sm, 1rem) 0;
	}

	.category-name {
		font-size: var(--text-overline, 9px);
		font-weight: var(--font-medium, 500);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest, 0.1em);
		margin: 0 0 0.75rem 0;
	}

	.cost-item {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0.25rem 0;
	}

	.item-desc {
		font-size: var(--text-body-sm, 11px);
		color: var(--color-fg-tertiary);
	}

	.item-amount {
		font-size: var(--text-body-sm, 11px);
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	.item-notes {
		font-size: var(--text-overline, 9px);
		color: var(--color-fg-subtle);
		margin: 0.25rem 0 0.5rem 0;
		font-style: italic;
	}

	.cost-assumptions {
		margin-top: var(--space-md, 1.5rem);
		padding-top: var(--space-sm, 1rem);
		border-top: 1px solid var(--color-hover);
	}

	.cost-assumptions h4 {
		font-size: var(--text-overline, 9px);
		font-weight: var(--font-medium, 500);
		color: var(--color-fg-subtle);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest, 0.1em);
		margin: 0 0 0.5rem 0;
	}

	.cost-assumptions ul {
		margin: 0;
		padding: 0 0 0 1rem;
	}

	.cost-assumptions li {
		font-size: var(--text-caption, 10px);
		color: var(--color-fg-subtle);
		margin: 0.25rem 0;
	}

	.cost-updated {
		font-size: var(--text-overline, 9px);
		color: var(--color-fg-subtle);
		margin: var(--space-md, 1.5rem) 0 0 0;
		text-align: right;
	}

	/* Scale bar - architectural graphic scale */
	.scale-bar-line {
		stroke: var(--arch-scale-color);
		stroke-width: 0.75;
		stroke-linecap: square;
	}

	.scale-bar-tick {
		stroke: var(--arch-scale-color);
		stroke-width: 0.5;
	}

	.scale-bar-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 6px;
		fill: var(--arch-scale-text);
		text-anchor: middle;
		letter-spacing: var(--tracking-normal, 0.02em);
	}

	/* Title block - minimal project info */
	.title-block-name {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 8px;
		fill: var(--arch-title-primary);
		font-weight: 500;
		letter-spacing: var(--tracking-wide, 0.04em);
		text-anchor: start;
	}

	.title-block-scale {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 6px;
		fill: var(--arch-title-secondary);
		letter-spacing: var(--tracking-wider, 0.05em);
		text-anchor: start;
		text-transform: uppercase;
	}

	@media (max-width: 768px) {
		.caption-bar {
			flex-direction: column;
			gap: 0.5rem;
			text-align: center;
		}

		.caption {
			font-size: 10px;
		}

		.caption-right {
			justify-content: center;
		}

		.cost-categories {
			grid-template-columns: 1fr;
		}
	}
</style>
