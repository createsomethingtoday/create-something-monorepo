<script lang="ts">
	/**
	 * DefensiveHeatmap Component
	 *
	 * Visualizes shot zones on a basketball court with color coding
	 * based on FG% relative to league average.
	 */

	interface ZoneStats {
		attempts: number;
		made: number;
		pct: number;
	}

	interface Props {
		shotsByZone: Record<string, ZoneStats>;
		title: string;
		teamAbbr?: string;
	}

	let { shotsByZone, title, teamAbbr }: Props = $props();

	// League average FG% by zone for comparison
	const leagueAvgByZone: Record<string, number> = {
		restricted_area: 0.66,
		paint_non_ra: 0.42,
		mid_range: 0.41,
		left_corner_3: 0.39,
		right_corner_3: 0.39,
		above_break_3: 0.36,
	};

	// Zone display names
	const zoneNames: Record<string, string> = {
		restricted_area: 'Restricted Area',
		paint_non_ra: 'Paint (Non-RA)',
		mid_range: 'Mid-Range',
		left_corner_3: 'Left Corner 3',
		right_corner_3: 'Right Corner 3',
		above_break_3: 'Above Break 3',
	};

	// Get color based on FG% vs league average (for defense, LOWER is better)
	function getZoneColor(zone: string, pct: number): string {
		const leagueAvg = leagueAvgByZone[zone] || 0.40;
		const diff = pct - leagueAvg;

		// For defense: below league average = good (green), above = bad (red)
		if (diff <= -0.10) return 'var(--color-success)'; // Excellent defense
		if (diff <= -0.05) return 'var(--color-data-2)';  // Good defense
		if (diff <= 0.05) return 'var(--color-warning)';  // Average
		if (diff <= 0.10) return 'var(--color-data-4)';   // Below average
		return 'var(--color-error)';                       // Poor defense
	}

	// Format percentage
	function formatPct(pct: number): string {
		return `${(pct * 100).toFixed(1)}%`;
	}

	// Get delta indicator
	function getDeltaClass(zone: string, pct: number): string {
		const leagueAvg = leagueAvgByZone[zone] || 0.40;
		const diff = pct - leagueAvg;
		return diff <= 0 ? 'positive' : 'negative';
	}

	function getDeltaText(zone: string, pct: number): string {
		const leagueAvg = leagueAvgByZone[zone] || 0.40;
		const diff = pct - leagueAvg;
		const prefix = diff >= 0 ? '+' : '';
		return `${prefix}${(diff * 100).toFixed(1)}%`;
	}
</script>

<div class="heatmap-container">
	<h3 class="heatmap-title">{title}</h3>

	<!-- Court visualization (simplified) -->
	<div class="court">
		<svg viewBox="0 0 400 380" class="court-svg">
			<!-- Court outline -->
			<rect x="10" y="10" width="380" height="360" fill="none" stroke="var(--color-border-default)" stroke-width="2" rx="4" />

			<!-- Three-point line (approximate) -->
			<path
				d="M 10 80 L 60 80 Q 200 60 340 80 L 390 80"
				fill="none"
				stroke="var(--color-border-default)"
				stroke-width="1"
			/>

			<!-- Key/Paint area -->
			<rect x="140" y="10" width="120" height="190" fill="none" stroke="var(--color-border-default)" stroke-width="1" />

			<!-- Restricted area (circle) -->
			<circle cx="200" cy="60" r="40" fill="none" stroke="var(--color-border-default)" stroke-width="1" />

			<!-- Zone overlays -->
			{#if shotsByZone.restricted_area}
				<circle
					cx="200"
					cy="60"
					r="38"
					fill={getZoneColor('restricted_area', shotsByZone.restricted_area.pct)}
					opacity="0.6"
				/>
				<text x="200" y="65" text-anchor="middle" class="zone-label">
					{formatPct(shotsByZone.restricted_area.pct)}
				</text>
			{/if}

			{#if shotsByZone.paint_non_ra}
				<rect
					x="142"
					y="100"
					width="116"
					height="98"
					fill={getZoneColor('paint_non_ra', shotsByZone.paint_non_ra.pct)}
					opacity="0.6"
				/>
				<text x="200" y="155" text-anchor="middle" class="zone-label">
					{formatPct(shotsByZone.paint_non_ra.pct)}
				</text>
			{/if}

			{#if shotsByZone.mid_range}
				<!-- Mid-range areas (left and right of paint) -->
				<rect
					x="70"
					y="100"
					width="68"
					height="100"
					fill={getZoneColor('mid_range', shotsByZone.mid_range.pct)}
					opacity="0.5"
				/>
				<rect
					x="262"
					y="100"
					width="68"
					height="100"
					fill={getZoneColor('mid_range', shotsByZone.mid_range.pct)}
					opacity="0.5"
				/>
				<text x="104" y="155" text-anchor="middle" class="zone-label">
					{formatPct(shotsByZone.mid_range.pct)}
				</text>
			{/if}

			{#if shotsByZone.left_corner_3}
				<rect
					x="12"
					y="12"
					width="55"
					height="66"
					fill={getZoneColor('left_corner_3', shotsByZone.left_corner_3.pct)}
					opacity="0.5"
				/>
				<text x="40" y="50" text-anchor="middle" class="zone-label">
					{formatPct(shotsByZone.left_corner_3.pct)}
				</text>
			{/if}

			{#if shotsByZone.right_corner_3}
				<rect
					x="333"
					y="12"
					width="55"
					height="66"
					fill={getZoneColor('right_corner_3', shotsByZone.right_corner_3.pct)}
					opacity="0.5"
				/>
				<text x="360" y="50" text-anchor="middle" class="zone-label">
					{formatPct(shotsByZone.right_corner_3.pct)}
				</text>
			{/if}

			{#if shotsByZone.above_break_3}
				<!-- Above break 3 (top of arc) -->
				<rect
					x="70"
					y="210"
					width="260"
					height="80"
					fill={getZoneColor('above_break_3', shotsByZone.above_break_3.pct)}
					opacity="0.4"
					rx="4"
				/>
				<text x="200" y="255" text-anchor="middle" class="zone-label">
					{formatPct(shotsByZone.above_break_3.pct)}
				</text>
			{/if}
		</svg>
	</div>

	<!-- Zone breakdown table -->
	<div class="zone-breakdown">
		<table class="zone-table">
			<thead>
				<tr>
					<th>Zone</th>
					<th>FGA</th>
					<th>FGM</th>
					<th>FG%</th>
					<th>vs Avg</th>
				</tr>
			</thead>
			<tbody>
				{#each Object.entries(shotsByZone) as [zone, stats]}
					{#if zoneNames[zone]}
						<tr>
							<td class="zone-name">{zoneNames[zone]}</td>
							<td>{stats.attempts}</td>
							<td>{stats.made}</td>
							<td>{formatPct(stats.pct)}</td>
							<td class="delta-cell {getDeltaClass(zone, stats.pct)}">
								{getDeltaText(zone, stats.pct)}
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Legend -->
	<div class="heatmap-legend">
		<span class="legend-label">Defense Rating:</span>
		<span class="legend-item">
			<span class="legend-dot" style="background: var(--color-success)"></span>
			Excellent
		</span>
		<span class="legend-item">
			<span class="legend-dot" style="background: var(--color-warning)"></span>
			Average
		</span>
		<span class="legend-item">
			<span class="legend-dot" style="background: var(--color-error)"></span>
			Poor
		</span>
	</div>
</div>

<style>
	.heatmap-container {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.heatmap-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.court {
		display: flex;
		justify-content: center;
		margin-bottom: var(--space-md);
	}

	.court-svg {
		width: 100%;
		max-width: 400px;
		height: auto;
	}

	.zone-label {
		font-size: 11px;
		font-weight: 600;
		fill: var(--color-fg-primary);
		font-family: inherit;
	}

	.zone-breakdown {
		margin-top: var(--space-md);
	}

	.zone-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	.zone-table th {
		text-align: left;
		padding: var(--space-xs) var(--space-sm);
		color: var(--color-fg-muted);
		font-weight: 500;
		border-bottom: 1px solid var(--color-border-default);
	}

	.zone-table td {
		padding: var(--space-xs) var(--space-sm);
		color: var(--color-fg-secondary);
		border-bottom: 1px solid var(--color-border-default);
	}

	.zone-table tr:last-child td {
		border-bottom: none;
	}

	.zone-name {
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.delta-cell {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.delta-cell.positive {
		color: var(--color-success);
	}

	.delta-cell.negative {
		color: var(--color-error);
	}

	.heatmap-legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
		margin-top: var(--space-md);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
		align-items: center;
	}

	.legend-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-weight: 500;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
	}
</style>
