<script lang="ts">
	/**
	 * DailyRhythm Component
	 *
	 * Temporal presence in dwelling.
	 * Heidegger: Dwelling is temporal—being-in-time, not just being-in-space.
	 * Tufte: Small multiples reveal pattern across time.
	 * Rams: Data density without decoration.
	 *
	 * Shows how spaces are inhabited across a typical day—
	 * the phenomenological rhythm of family dwelling.
	 */

	import { keyboardToggle } from '@create-something/components';

	export interface Activity {
		name: string;
		space: string;
		startHour: number; // 0-24
		endHour: number;
		person?: string;
		intensity?: 'low' | 'medium' | 'high';
	}

	export interface DailyRhythmData {
		name: string;
		spaces: string[];
		activities: Activity[];
	}

	interface Props {
		rhythm: DailyRhythmData;
		showCaption?: boolean;
	}

	let { rhythm, showCaption = true }: Props = $props();

	// Time scale
	const startHour = 6;
	const endHour = 23;
	const totalHours = endHour - startHour;

	// Dimensions
	const labelWidth = 100;
	const hourWidth = 40;
	const rowHeight = 28;
	const headerHeight = 24;

	const svgWidth = labelWidth + totalHours * hourWidth + 20;
	const svgHeight = headerHeight + rhythm.spaces.length * rowHeight + 20;

	// Position helpers
	function hourToX(hour: number): number {
		return labelWidth + (hour - startHour) * hourWidth;
	}

	function spaceToY(space: string): number {
		const index = rhythm.spaces.indexOf(space);
		return headerHeight + index * rowHeight + rowHeight / 2;
	}

	// Activity color by person - using Canon architecture tokens
	const personColors: Record<string, string> = {
		'Family': 'var(--arch-rhythm-family)',
		'Parents': 'var(--arch-rhythm-parents)',
		'Daughter': 'var(--arch-rhythm-daughter)',
		'In-Law': 'var(--arch-rhythm-inlaw)',
		'Guests': 'var(--arch-rhythm-guests)',
		'Service': 'var(--arch-rhythm-service)'
	};

	function getActivityColor(activity: Activity): string {
		return personColors[activity.person || 'Family'] || 'var(--arch-rhythm-family)';
	}

	// Intensity to opacity
	function getOpacity(intensity: Activity['intensity']): number {
		switch (intensity) {
			case 'high': return 0.9;
			case 'medium': return 0.6;
			case 'low': return 0.3;
			default: return 0.6;
		}
	}

	// Active activity for tooltip
	let activeActivity: Activity | null = $state(null);

	// Hour markers for context
	const hourMarkers = [6, 9, 12, 15, 18, 21];

	// Format hour
	function formatHour(hour: number): string {
		if (hour === 12) return '12p';
		if (hour === 0 || hour === 24) return '12a';
		return hour < 12 ? `${hour}a` : `${hour - 12}p`;
	}
</script>

<div class="rhythm-container">
	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="daily-rhythm" role="img" aria-label={rhythm.name}>
		<!-- Hour grid -->
		{#each hourMarkers as hour}
			<line
				x1={hourToX(hour)}
				y1={headerHeight - 4}
				x2={hourToX(hour)}
				y2={svgHeight - 10}
				class="hour-line"
			/>
			<text
				x={hourToX(hour)}
				y={headerHeight - 8}
				class="hour-label"
			>
				{formatHour(hour)}
			</text>
		{/each}

		<!-- Space rows -->
		{#each rhythm.spaces as space, i}
			<!-- Row background (alternating) -->
			<rect
				x={labelWidth}
				y={headerHeight + i * rowHeight}
				width={totalHours * hourWidth}
				height={rowHeight}
				class="row-bg"
				class:odd={i % 2 === 1}
			/>
			<!-- Space label -->
			<text
				x={labelWidth - 8}
				y={spaceToY(space)}
				class="space-label"
			>
				{space}
			</text>
		{/each}

		<!-- Activities -->
		{#each rhythm.activities as activity}
			{@const startX = hourToX(activity.startHour)}
			{@const endX = hourToX(activity.endHour)}
			{@const y = spaceToY(activity.space)}
			<g
				class="activity"
				class:active={activeActivity === activity}
				role="button"
				tabindex="0"
				aria-label="{activity.name} in {activity.space}, {formatHour(activity.startHour)} to {formatHour(activity.endHour)}{activity.person ? `, ${activity.person}` : ''}"
				aria-pressed={activeActivity === activity}
				onmouseenter={() => activeActivity = activity}
				onmouseleave={() => activeActivity = null}
				onfocus={() => activeActivity = activity}
				onblur={() => activeActivity = null}
				use:keyboardToggle={{
					pressed: activeActivity === activity,
					onToggle: (pressed) => activeActivity = pressed ? activity : null,
					onEscape: () => activeActivity = null
				}}
			>
				<!-- Activity bar -->
				<rect
					x={startX}
					y={y - rowHeight / 2 + 4}
					width={endX - startX}
					height={rowHeight - 8}
					rx="3"
					class="activity-bar"
					style="fill: {getActivityColor(activity)}; opacity: {getOpacity(activity.intensity)}"
				/>
				<!-- Activity label (if wide enough) -->
				{#if endX - startX > 60}
					<text
						x={startX + (endX - startX) / 2}
						y={y + 1}
						class="activity-label"
					>
						{activity.name}
					</text>
				{/if}
			</g>
		{/each}

		<!-- Title -->
		<text x="4" y="14" class="title">Daily Rhythm</text>
	</svg>

	<!-- Legend -->
	<div class="legend">
		{#each Object.entries(personColors) as [person, color]}
			{#if rhythm.activities.some(a => a.person === person)}
				<div class="legend-item">
					<span class="legend-swatch" style="background: {color}"></span>
					<span class="legend-label">{person}</span>
				</div>
			{/if}
		{/each}
	</div>

	<!-- Tooltip -->
	{#if activeActivity}
		<div class="activity-tooltip">
			<span class="tooltip-name">{activeActivity.name}</span>
			<span class="tooltip-time">
				{formatHour(activeActivity.startHour)}–{formatHour(activeActivity.endHour)}
			</span>
			{#if activeActivity.person}
				<span class="tooltip-person">{activeActivity.person}</span>
			{/if}
		</div>
	{/if}

	{#if showCaption}
		<p class="caption">{rhythm.name}</p>
	{/if}
</div>

<style>
	.rhythm-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		font-family: var(--font-sans, system-ui, sans-serif);
		width: 100%;
	}

	.daily-rhythm {
		width: 100%;
		max-width: 800px;
		height: auto;
	}

	/* Hour grid */
	.hour-line {
		stroke: var(--color-border-default);
		stroke-width: 1;
		stroke-dasharray: 2 2;
	}

	.hour-label {
		font-size: 9px;
		fill: var(--color-fg-muted);
		text-anchor: middle;
	}

	/* Space rows */
	.row-bg {
		fill: transparent;
	}

	.row-bg.odd {
		fill: rgba(255, 255, 255, 0.02);
	}

	.space-label {
		font-size: 10px;
		fill: var(--color-fg-tertiary);
		text-anchor: end;
		dominant-baseline: middle;
	}

	/* Activities */
	.activity {
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.activity-bar {
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.activity.active .activity-bar {
		stroke: var(--color-fg-secondary);
		stroke-width: 1;
	}

	.activity:focus {
		outline: none;
	}

	.activity:focus .activity-bar {
		stroke: var(--color-fg-primary);
		stroke-width: 2;
	}

	.activity:focus-visible .activity-bar {
		stroke: var(--color-fg-primary);
		stroke-width: 2;
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.2));
		outline-offset: 2px;
	}

	.activity-label {
		font-size: 8px;
		fill: var(--color-bg-pure);
		text-anchor: middle;
		dominant-baseline: middle;
		pointer-events: none;
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

	.legend-swatch {
		width: 12px;
		height: 12px;
		border-radius: 2px;
	}

	.legend-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Tooltip */
	.activity-tooltip {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
	}

	.tooltip-name {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-weight: 500;
	}

	.tooltip-time {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.tooltip-person {
		font-size: var(--text-caption);
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

	@media (max-width: 600px) {
		.daily-rhythm {
			max-width: 100%;
		}
	}
</style>
