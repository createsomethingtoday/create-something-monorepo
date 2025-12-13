<script lang="ts">
	/**
	 * Circulation Component
	 *
	 * Threshold moments and movement patterns through dwelling.
	 * Heidegger: Thresholds are not mere boundaries but zones of becoming.
	 * The threshold is where one world meets another.
	 */

	import type { CirculationData, ThresholdType, CirculationMode } from '$lib/types/architecture';

	interface Props {
		circulation: CirculationData;
		showCaption?: boolean;
	}

	let { circulation, showCaption = true }: Props = $props();

	// Scale and dimensions
	const scale = 8;
	const margin = 25;

	// SVG dimensions
	const svgWidth = circulation.width * scale + margin * 2 + 40;
	const svgHeight = circulation.depth * scale + margin * 2 + 20;

	// Coordinate transforms
	function tx(x: number): number {
		return margin + x * scale;
	}

	function ty(y: number): number {
		return svgHeight - margin - y * scale - 10;
	}

	// Zone colors (muted for background context)
	const zoneColors: Record<string, string> = {
		outer: 'var(--color-bg-pure)',
		service: 'rgba(255, 255, 255, 0.03)',
		public: 'rgba(255, 255, 255, 0.05)',
		private: 'rgba(255, 255, 255, 0.08)',
		open: 'rgba(255, 255, 255, 0.06)'
	};

	// Threshold type styling - using Canon architecture tokens
	const thresholdStyles: Record<ThresholdType, { color: string; symbol: string }> = {
		entry: { color: 'var(--arch-threshold-entry)', symbol: '◆' },      // Green diamond - arrival from outside
		transition: { color: 'var(--arch-threshold-transition)', symbol: '○' }, // Blue circle - zone change
		passage: { color: 'var(--arch-threshold-passage)', symbol: '→' },    // Amber arrow - movement
		arrival: { color: 'var(--arch-threshold-arrival)', symbol: '●' }     // Purple filled - destination
	};

	// Path mode styling
	const pathColors: Record<CirculationMode, string> = {
		primary: 'var(--color-fg-secondary)',
		secondary: 'var(--color-fg-muted)',
		service: 'var(--color-fg-subtle)'
	};

	// Generate SVG path from points
	function generatePath(points: { x: number; y: number }[]): string {
		if (points.length < 2) return '';

		const start = points[0];
		let d = `M ${tx(start.x)} ${ty(start.y)}`;

		for (let i = 1; i < points.length; i++) {
			const curr = points[i];
			d += ` L ${tx(curr.x)} ${ty(curr.y)}`;
		}

		return d;
	}

	// Active threshold for description display
	let activeThreshold: number | null = $state(null);
</script>

<div class="circulation-container">
	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="circulation" role="img" aria-label={circulation.name}>
		<defs>
			<!-- Arrowhead marker -->
			<marker
				id="arrowhead"
				markerWidth="10"
				markerHeight="7"
				refX="9"
				refY="3.5"
				orient="auto"
			>
				<polygon points="0 0, 10 3.5, 0 7" fill="var(--color-fg-muted)" />
			</marker>

			<!-- Threshold glow -->
			<filter id="threshold-glow" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="3" result="blur" />
				<feMerge>
					<feMergeNode in="blur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>

		<!-- Zone backgrounds (subtle context) -->
		{#each circulation.zones as zone}
			<rect
				x={tx(zone.x)}
				y={ty(zone.y + zone.height)}
				width={zone.width * scale}
				height={zone.height * scale}
				fill={zoneColors[zone.type]}
				class="zone-bg"
			/>
		{/each}

		<!-- Zone transitions (gradient bars) -->
		{#if circulation.transitions}
			{#each circulation.transitions as trans}
				{@const isHorizontal = trans.orientation === 'horizontal'}
				<rect
					x={tx(trans.x) - (isHorizontal ? 0 : 2)}
					y={ty(trans.y) - (isHorizontal ? 2 : trans.width * scale)}
					width={isHorizontal ? trans.width * scale : 4}
					height={isHorizontal ? 4 : trans.width * scale}
					class="zone-transition"
				/>
			{/each}
		{/if}

		<!-- Circulation paths -->
		{#each circulation.paths as path}
			<path
				d={generatePath(path.points)}
				class="circulation-path path-{path.mode}"
				style="stroke: {pathColors[path.mode]}"
				marker-end={path.mode === 'primary' ? 'url(#arrowhead)' : undefined}
			/>
		{/each}

		<!-- Threshold moments -->
		{#each circulation.thresholds as threshold, i}
			{@const style = thresholdStyles[threshold.type]}
			<g
				class="threshold-moment"
				class:active={activeThreshold === i}
				onmouseenter={() => activeThreshold = i}
				onmouseleave={() => activeThreshold = null}
			>
				<!-- Outer ring -->
				<circle
					cx={tx(threshold.x)}
					cy={ty(threshold.y)}
					r="12"
					class="threshold-ring"
					style="stroke: {style.color}"
				/>

				<!-- Inner symbol -->
				<text
					x={tx(threshold.x)}
					y={ty(threshold.y)}
					class="threshold-symbol"
					style="fill: {style.color}"
				>
					{style.symbol}
				</text>

				<!-- Label -->
				<text
					x={tx(threshold.x)}
					y={ty(threshold.y) - 18}
					class="threshold-label"
				>
					{threshold.label}
				</text>
			</g>
		{/each}

		<!-- Labels -->
		{#if circulation.labels}
			{#each circulation.labels as label}
				<text
					x={tx(label.x)}
					y={ty(label.y)}
					class="label"
					class:small={label.small}
				>
					{label.text}
				</text>
			{/each}
		{/if}

		<!-- Title -->
		<text x={tx(0)} y="18" class="title">Threshold Moments</text>
	</svg>

	<!-- Legend -->
	<div class="legend">
		{#each Object.entries(thresholdStyles) as [type, style]}
			<div class="legend-item">
				<span class="legend-symbol" style="color: {style.color}">{style.symbol}</span>
				<span class="legend-label">{type}</span>
			</div>
		{/each}
	</div>

	<!-- Description tooltip -->
	{#if activeThreshold !== null && circulation.thresholds[activeThreshold]?.description}
		<div class="threshold-description">
			<p>{circulation.thresholds[activeThreshold].description}</p>
		</div>
	{/if}

	{#if showCaption}
		<p class="caption">{circulation.name}</p>
	{/if}
</div>

<style>
	.circulation-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		font-family: var(--font-sans, system-ui, sans-serif);
	}

	.circulation {
		width: 100%;
		max-width: 550px;
		height: auto;
	}

	/* Zone backgrounds */
	.zone-bg {
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	/* Zone transitions */
	.zone-transition {
		fill: var(--color-border-emphasis);
		opacity: 0.5;
	}

	/* Circulation paths */
	.circulation-path {
		fill: none;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.path-primary {
		stroke-width: 2.5;
		stroke-dasharray: none;
	}

	.path-secondary {
		stroke-width: 1.5;
		stroke-dasharray: 6 3;
	}

	.path-service {
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}

	/* Threshold moments */
	.threshold-moment {
		cursor: pointer;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.threshold-moment.active {
		filter: url(#threshold-glow);
	}

	.threshold-ring {
		fill: none;
		stroke-width: 2;
		opacity: 0.6;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.threshold-moment.active .threshold-ring {
		opacity: 1;
		stroke-width: 2.5;
	}

	.threshold-symbol {
		font-size: 14px;
		text-anchor: middle;
		dominant-baseline: central;
		font-weight: 500;
	}

	.threshold-label {
		font-size: 9px;
		fill: var(--color-fg-muted);
		text-anchor: middle;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.threshold-moment.active .threshold-label {
		opacity: 1;
	}

	/* Labels */
	.label {
		font-size: 10px;
		fill: var(--color-fg-tertiary);
		text-anchor: middle;
		dominant-baseline: middle;
	}

	.label.small {
		font-size: 8px;
		fill: var(--color-fg-muted);
	}

	/* Title */
	.title {
		font-size: 11px;
		font-weight: 500;
		fill: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	/* Legend */
	.legend {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
		justify-content: center;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.legend-symbol {
		font-size: 14px;
	}

	.legend-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: capitalize;
	}

	/* Description tooltip */
	.threshold-description {
		max-width: 300px;
		text-align: center;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
	}

	.threshold-description p {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		font-style: italic;
	}

	/* Caption */
	.caption {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
		margin: 0;
	}
</style>
