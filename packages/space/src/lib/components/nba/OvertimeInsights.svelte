<script lang="ts">
	/**
	 * Overtime Insights Component
	 * 
	 * Embeddable widget showing REG vs OT performance comparison.
	 * Displays fatigue index and performance differential.
	 */
	
	import type { OvertimeDifferential } from '$lib/nba/overtime-analyzer';
	import { TrendingDown, TrendingUp, AlertTriangle, Clock } from 'lucide-svelte';
	
	interface Props {
		differential: OvertimeDifferential;
		compact?: boolean;
	}
	
	let { differential, compact = false }: Props = $props();
	
	// Determine fatigue severity
	const fatigueLevel = $derived(() => {
		if (differential.fatigueIndex >= 70) return 'severe';
		if (differential.fatigueIndex >= 40) return 'moderate';
		return 'minimal';
	});
	
	const fatigueColor = $derived(() => {
		if (fatigueLevel() === 'severe') return 'var(--color-error)';
		if (fatigueLevel() === 'moderate') return 'var(--color-warning)';
		return 'var(--color-success)';
	});
	
	// Format stat changes
	const formatChange = (value: number, suffix: string = '') => {
		const sign = value > 0 ? '+' : '';
		return `${sign}${value.toFixed(1)}${suffix}`;
	};
	
	const isDecline = (value: number) => value < 0;
</script>

<div class="overtime-insights" class:compact>
	<!-- Header -->
	<div class="header">
		<Clock size={16} />
		<h3 class="title">Overtime Performance</h3>
		{#if differential.overtimePeriods > 1}
			<span class="badge">{differential.overtimePeriods}OT</span>
		{/if}
	</div>
	
	<!-- Fatigue Index -->
	<div class="fatigue-meter">
		<div class="meter-label">
			<span>Fatigue Index</span>
			<span class="meter-value" style="color: {fatigueColor()}">{differential.fatigueIndex}/100</span>
		</div>
		<div class="meter-bar">
			<div 
				class="meter-fill" 
				class:severe={fatigueLevel() === 'severe'}
				class:moderate={fatigueLevel() === 'moderate'}
				style="width: {differential.fatigueIndex}%"
			></div>
		</div>
	</div>
	
	<!-- Stats Comparison -->
	<div class="stats-grid">
		<!-- Points -->
		<div class="stat-card">
			<div class="stat-label">Points</div>
			<div class="stat-comparison">
				<span class="reg-value">{differential.regularStats.points.toFixed(1)}</span>
				<span class="arrow">→</span>
				<span class="ot-value">{differential.overtimeStats.points.toFixed(1)}</span>
			</div>
			<div class="stat-change" class:decline={isDecline(differential.regularStats.points - differential.overtimeStats.points)}>
				{#if isDecline(differential.regularStats.points - differential.overtimeStats.points)}
					<TrendingDown size={14} />
				{:else}
					<TrendingUp size={14} />
				{/if}
				<span>{formatChange(differential.overtimeStats.points - differential.regularStats.points)}</span>
			</div>
		</div>
		
		<!-- FG% -->
		<div class="stat-card">
			<div class="stat-label">FG%</div>
			<div class="stat-comparison">
				<span class="reg-value">{(differential.regularStats.fgPct * 100).toFixed(1)}%</span>
				<span class="arrow">→</span>
				<span class="ot-value">{(differential.overtimeStats.fgPct * 100).toFixed(1)}%</span>
			</div>
			<div class="stat-change" class:decline={isDecline(differential.overtimeStats.fgPct - differential.regularStats.fgPct)}>
				{#if isDecline(differential.overtimeStats.fgPct - differential.regularStats.fgPct)}
					<TrendingDown size={14} />
				{:else}
					<TrendingUp size={14} />
				{/if}
				<span>{formatChange((differential.overtimeStats.fgPct - differential.regularStats.fgPct) * 100, '%')}</span>
			</div>
		</div>
		
		<!-- Turnovers -->
		<div class="stat-card">
			<div class="stat-label">Turnovers</div>
			<div class="stat-comparison">
				<span class="reg-value">{differential.regularStats.turnovers.toFixed(1)}</span>
				<span class="arrow">→</span>
				<span class="ot-value">{differential.overtimeStats.turnovers.toFixed(1)}</span>
			</div>
			<div class="stat-change" class:decline={!isDecline(differential.overtimeStats.turnovers - differential.regularStats.turnovers)}>
				{#if differential.overtimeStats.turnovers > differential.regularStats.turnovers}
					<TrendingUp size={14} />
				{:else}
					<TrendingDown size={14} />
				{/if}
				<span>{formatChange(differential.overtimeStats.turnovers - differential.regularStats.turnovers)}</span>
			</div>
		</div>
		
		<!-- Minutes -->
		<div class="stat-card">
			<div class="stat-label">Minutes</div>
			<div class="stat-comparison">
				<span class="reg-value">{differential.regularStats.minutes.toFixed(1)}</span>
				<span class="arrow">→</span>
				<span class="ot-value">{differential.overtimeStats.minutes.toFixed(1)}</span>
			</div>
			<div class="stat-change">
				<Clock size={14} />
				<span>{formatChange(differential.overtimeStats.minutes - differential.regularStats.minutes)}</span>
			</div>
		</div>
	</div>
	
	<!-- Fatigue Warning -->
	{#if fatigueLevel() === 'severe'}
		<div class="warning">
			<AlertTriangle size={14} />
			<span>Severe fatigue detected - performance significantly declined in OT</span>
		</div>
	{/if}
</div>

<style>
	.overtime-insights {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-3);
	}
	
	.overtime-insights.compact {
		padding: var(--space-3);
		gap: var(--space-2);
	}
	
	.header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text-primary);
	}
	
	.title {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		margin: 0;
	}
	
	.badge {
		margin-left: auto;
		padding: var(--space-1) var(--space-2);
		background: var(--color-surface);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
	}
	
	.fatigue-meter {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	
	.meter-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}
	
	.meter-value {
		font-weight: var(--font-weight-bold);
		font-variant-numeric: tabular-nums;
	}
	
	.meter-bar {
		height: 8px;
		background: var(--color-surface);
		border-radius: var(--radius-full);
		overflow: hidden;
	}
	
	.meter-fill {
		height: 100%;
		background: var(--color-success);
		border-radius: var(--radius-full);
		transition: width 0.3s ease, background 0.3s ease;
	}
	
	.meter-fill.moderate {
		background: var(--color-warning);
	}
	
	.meter-fill.severe {
		background: var(--color-error);
	}
	
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-2);
	}
	
	.compact .stats-grid {
		grid-template-columns: 1fr;
	}
	
	.stat-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-2);
		background: var(--color-surface);
		border-radius: var(--radius-2);
	}
	
	.stat-label {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.stat-comparison {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		font-variant-numeric: tabular-nums;
	}
	
	.reg-value {
		color: var(--color-text-secondary);
	}
	
	.arrow {
		color: var(--color-text-tertiary);
		font-size: var(--font-size-sm);
	}
	
	.ot-value {
		color: var(--color-text-primary);
	}
	
	.stat-change {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--font-size-sm);
		color: var(--color-success);
		font-variant-numeric: tabular-nums;
	}
	
	.stat-change.decline {
		color: var(--color-error);
	}
	
	.warning {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: rgba(244, 67, 54, 0.1);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-2);
		font-size: var(--font-size-sm);
		color: var(--color-error);
	}
	
	/* Mobile responsive */
	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
