<script lang="ts">
	/**
	 * LightStudy Component
	 *
	 * Sun path and shadow analysis for architectural dwelling.
	 * Heidegger: Dwelling is temporal—light reveals and conceals through time.
	 * Tufte: Time-series data shown as small multiples.
	 * Rams: Information on demand, nothing decorative.
	 */

	import type { LightStudyData, Season, TimeOfDay } from '$lib/types/architecture';

	interface Props {
		study: LightStudyData;
		showCaption?: boolean;
	}

	let { study, showCaption = true }: Props = $props();

	// Interactive state - which season/time to highlight
	let activeSeason: Season = $state('equinox');
	let activeTime: TimeOfDay | 'all' = $state('all');

	// Scale and dimensions - consistent with other components
	const scale = 8;
	const margin = 30;

	// SVG dimensions
	const svgWidth = study.width * scale + margin * 2 + 60;
	const svgHeight = study.depth * scale + margin * 2 + 40;

	// Coordinate transforms (SVG y is inverted)
	function tx(x: number): number {
		return margin + x * scale;
	}

	function ty(y: number): number {
		return svgHeight - margin - y * scale - 20;
	}

	// Sun path colors by season - using Canon architecture tokens
	const seasonColors: Record<Season, string> = {
		summer: 'var(--arch-sun-summer)', // Amber
		equinox: 'var(--arch-sun-equinox)', // Blue
		winter: 'var(--arch-sun-winter)'  // Purple
	};

	// Time labels
	const timeLabels: Record<TimeOfDay, string> = {
		morning: '8am',
		noon: '12pm',
		afternoon: '4pm',
		evening: '6pm'
	};

	// Calculate sun position on the diagram (polar to cartesian)
	// Azimuth: 0 = north, 90 = east, 180 = south, 270 = west
	function sunToXY(azimuth: number, altitude: number): { x: number; y: number } {
		// Adjust azimuth for building orientation
		const adjustedAzimuth = (azimuth - study.orientation + 360) % 360;

		// Convert to radians (SVG: 0 = right, 90 = down)
		const radians = ((adjustedAzimuth - 90) * Math.PI) / 180;

		// Distance from center decreases with altitude (higher sun = closer to center)
		const maxRadius = Math.min(study.width, study.depth) * scale * 0.6;
		const radius = maxRadius * (1 - altitude / 90);

		// Center of the building
		const cx = tx(study.width / 2);
		const cy = ty(study.depth / 2);

		return {
			x: cx + radius * Math.cos(radians),
			y: cy + radius * Math.sin(radians)
		};
	}

	// Generate sun path arc for a season
	function getSunPathD(season: Season): string {
		const path = study.sunPaths.find(p => p.season === season);
		if (!path || path.positions.length < 2) return '';

		const points = path.positions.map(pos => sunToXY(pos.azimuth, pos.altitude));

		// Create a smooth curve through the points
		let d = `M ${points[0].x} ${points[0].y}`;
		for (let i = 1; i < points.length; i++) {
			// Use quadratic curves for smoothness
			const prev = points[i - 1];
			const curr = points[i];
			const midX = (prev.x + curr.x) / 2;
			const midY = (prev.y + curr.y) / 2;
			d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
		}
		d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;

		return d;
	}

	// Shadow projection from a point given sun position
	function getShadowPolygon(azimuth: number, altitude: number, shadowMultiplier: number): string {
		// Shadow direction is opposite to sun azimuth
		const shadowAzimuth = (azimuth + 180) % 360;
		const radians = ((shadowAzimuth - study.orientation - 90) * Math.PI) / 180;

		// Shadow length based on altitude and multiplier
		const shadowLength = (20 / Math.tan((altitude * Math.PI) / 180)) * shadowMultiplier * scale;

		// Project building corners
		const corners = [
			{ x: 0, y: 0 },
			{ x: study.width, y: 0 },
			{ x: study.width, y: study.depth },
			{ x: 0, y: study.depth }
		];

		// Create shadow polygon
		const buildingPoints = corners.map(c => `${tx(c.x)},${ty(c.y)}`).join(' ');
		const shadowPoints = corners.map(c => {
			const sx = tx(c.x) + shadowLength * Math.cos(radians);
			const sy = ty(c.y) + shadowLength * Math.sin(radians);
			return `${sx},${sy}`;
		}).join(' ');

		// Return combined polygon (building + shadow projection)
		return shadowPoints;
	}

	// Get current sun position for active season/time
	function getActiveSunPosition() {
		if (activeTime === 'all') return null;
		const path = study.sunPaths.find(p => p.season === activeSeason);
		return path?.positions.find(p => p.time === activeTime);
	}

	// Derived state - Svelte 5 runes mode
	const activeSunPos = $derived(getActiveSunPosition());
	const activePath = $derived(study.sunPaths.find(p => p.season === activeSeason));
</script>

<div class="light-study-container">
	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="light-study" role="img" aria-label={study.name}>
		<defs>
			<!-- Shadow gradient -->
			<linearGradient id="shadow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="var(--color-bg-pure)" stop-opacity="0.6" />
				<stop offset="100%" stop-color="var(--color-bg-pure)" stop-opacity="0" />
			</linearGradient>

			<!-- Sun glow -->
			<radialGradient id="sun-glow">
				<stop offset="0%" stop-color="var(--color-data-4)" stop-opacity="1" />
				<stop offset="100%" stop-color="var(--color-data-4)" stop-opacity="0" />
			</radialGradient>
		</defs>

		<!-- Compass rose (minimal) -->
		<g class="compass">
			<text x={tx(study.width / 2)} y={ty(study.depth) - 15} class="compass-label">N</text>
			<text x={tx(study.width) + 15} y={ty(study.depth / 2)} class="compass-label">E</text>
			<text x={tx(study.width / 2)} y={ty(0) + 20} class="compass-label">S</text>
			<text x={tx(0) - 15} y={ty(study.depth / 2)} class="compass-label">W</text>
		</g>

		<!-- Shadow projection (if specific time selected) -->
		{#if activeSunPos && activePath}
			<polygon
				points={getShadowPolygon(activeSunPos.azimuth, activeSunPos.altitude, activePath.shadowLength)}
				class="shadow-projection"
			/>
		{/if}

		<!-- Building footprint -->
		<rect
			x={tx(0)}
			y={ty(study.depth)}
			width={study.width * scale}
			height={study.depth * scale}
			class="building-footprint"
		/>

		<!-- Light zones (if defined) -->
		{#if study.lightZones}
			{#each study.lightZones as zone}
				<rect
					x={tx(zone.x)}
					y={ty(zone.y + zone.height)}
					width={zone.width * scale}
					height={zone.height * scale}
					class="light-zone light-zone-{zone.quality}"
				/>
			{/each}
		{/if}

		<!-- Glazing locations -->
		{#if study.glazingLocations}
			{#each study.glazingLocations as glazing}
				{@const isVertical = glazing.orientation === 'e' || glazing.orientation === 'w'}
				<rect
					x={tx(glazing.x) - (isVertical ? 1 : glazing.width * scale / 2)}
					y={ty(glazing.y) - (isVertical ? glazing.width * scale / 2 : 1)}
					width={isVertical ? 2 : glazing.width * scale}
					height={isVertical ? glazing.width * scale : 2}
					class="glazing glazing-{glazing.orientation}"
				/>
			{/each}
		{/if}

		<!-- Overhangs -->
		{#if study.overhangs}
			{#each study.overhangs as overhang}
				<rect
					x={tx(overhang.x)}
					y={ty(overhang.y + overhang.height)}
					width={overhang.width * scale}
					height={overhang.height * scale}
					class="overhang"
				/>
			{/each}
		{/if}

		<!-- Sun paths -->
		{#each study.sunPaths as path}
			<path
				d={getSunPathD(path.season)}
				class="sun-path"
				class:active={path.season === activeSeason}
				style="stroke: {seasonColors[path.season]}"
			/>
		{/each}

		<!-- Sun positions -->
		{#each study.sunPaths as path}
			{#if path.season === activeSeason}
				{#each path.positions as pos}
					{@const xy = sunToXY(pos.azimuth, pos.altitude)}
					<g class="sun-position" class:active={activeTime === pos.time || activeTime === 'all'}>
						<circle
							cx={xy.x}
							cy={xy.y}
							r={activeTime === pos.time ? 8 : 5}
							class="sun-marker"
							style="fill: {seasonColors[path.season]}"
						/>
						<text
							x={xy.x}
							y={xy.y - 12}
							class="sun-time-label"
						>
							{timeLabels[pos.time]}
						</text>
					</g>
				{/each}
			{/if}
		{/each}

		<!-- Labels -->
		{#if study.labels}
			{#each study.labels as label}
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
		<text x={tx(0)} y="20" class="title">Light Study</text>
	</svg>

	<!-- Season/Time controls (Rams: information on demand) -->
	<div class="controls" role="group" aria-label="Light study controls">
		<div class="control-group">
			<span class="control-label">Season</span>
			<div class="control-buttons" role="group" aria-label="Season selection">
				{#each ['summer', 'equinox', 'winter'] as season}
					<button
						class="control-btn a11y-focus-tight"
						class:active={activeSeason === season}
						onclick={() => { activeSeason = season as Season; }}
						aria-pressed={activeSeason === season}
						style="--accent: {seasonColors[season as Season]}"
					>
						{season === 'summer' ? 'Jun' : season === 'equinox' ? 'Mar/Sep' : 'Dec'}
					</button>
				{/each}
			</div>
		</div>
		<div class="control-group">
			<span class="control-label">Time</span>
			<div class="control-buttons" role="group" aria-label="Time of day selection">
				<button
					class="control-btn a11y-focus-tight"
					class:active={activeTime === 'all'}
					onclick={() => { activeTime = 'all'; }}
					aria-pressed={activeTime === 'all'}
				>
					All
				</button>
				{#each ['morning', 'noon', 'afternoon', 'evening'] as time}
					<button
						class="control-btn a11y-focus-tight"
						class:active={activeTime === time}
						onclick={() => { activeTime = time as TimeOfDay; }}
						aria-pressed={activeTime === time}
					>
						{timeLabels[time as TimeOfDay]}
					</button>
				{/each}
			</div>
		</div>
	</div>

	{#if showCaption}
		<p class="caption">
			{study.name} · {study.latitude.toFixed(1)}°N · {study.orientation}° orientation
		</p>
	{/if}
</div>

<style>
	.light-study-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		font-family: var(--font-sans, system-ui, sans-serif);
	}

	.light-study {
		width: 100%;
		max-width: 600px;
		height: auto;
	}

	/* Building footprint */
	.building-footprint {
		fill: var(--color-bg-surface);
		stroke: var(--color-fg-secondary);
		stroke-width: 1.5;
	}

	/* Light zones */
	.light-zone {
		stroke: none;
		opacity: 0.3;
	}

	.light-zone-direct {
		fill: var(--arch-light-direct);
	}

	.light-zone-diffuse {
		fill: var(--arch-light-diffuse);
	}

	.light-zone-shade {
		fill: var(--arch-light-shade);
	}

	/* Glazing */
	.glazing {
		fill: var(--arch-light-diffuse);
		opacity: 0.8;
	}

	/* Overhangs */
	.overhang {
		fill: none;
		stroke: var(--color-fg-muted);
		stroke-width: 1;
		stroke-dasharray: 4 2;
	}

	/* Shadow projection */
	.shadow-projection {
		fill: var(--color-bg-pure);
		opacity: 0.4;
	}

	/* Sun paths */
	.sun-path {
		fill: none;
		stroke-width: 1.5;
		stroke-dasharray: 4 2;
		opacity: 0.3;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.sun-path.active {
		stroke-dasharray: none;
		stroke-width: 2;
		opacity: 0.8;
	}

	/* Sun positions */
	.sun-position {
		opacity: 0.5;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.sun-position.active {
		opacity: 1;
	}

	.sun-marker {
		transition: r var(--duration-micro) var(--ease-standard);
	}

	.sun-time-label {
		font-size: 9px;
		fill: var(--color-fg-muted);
		text-anchor: middle;
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.sun-position.active .sun-time-label {
		opacity: 1;
	}

	/* Compass */
	.compass-label {
		font-size: 10px;
		fill: var(--color-fg-muted);
		text-anchor: middle;
		dominant-baseline: middle;
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

	/* Controls */
	.controls {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
		justify-content: center;
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.control-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.control-buttons {
		display: flex;
		gap: 2px;
	}

	.control-btn {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-tertiary);
		font-size: var(--text-caption);
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.control-btn:first-child {
		border-radius: var(--radius-sm) 0 0 var(--radius-sm);
	}

	.control-btn:last-child {
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}

	.control-btn:hover {
		background: var(--color-hover);
	}

	/* Focus styles handled by .a11y-focus-tight utility class */

	.control-btn.active {
		background: var(--accent, var(--color-fg-subtle));
		color: var(--color-bg-pure);
		border-color: var(--accent, var(--color-fg-subtle));
	}

	/* Caption */
	.caption {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
		margin: 0;
	}

	/* Responsive */
	@media (max-width: 600px) {
		.controls {
			flex-direction: column;
			align-items: center;
		}
	}
</style>
