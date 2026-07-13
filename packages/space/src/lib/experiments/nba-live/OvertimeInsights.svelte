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
		differential: OvertimeDifferential & {
			gameId?: string;
			homeTeam?: string;
			awayTeam?: string;
			homeScore?: number;
			awayScore?: number;
			periods?: number;
		};
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
		if (fatigueLevel() === 'severe') return 'var(--color-performance-error)';
		if (fatigueLevel() === 'moderate') return 'var(--color-performance-warning)';
		return 'var(--color-performance-success)';
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
		<h3 class="title">{differential.playerName}</h3>
		{#if differential.periods && differential.periods > 4}
			<span class="badge">{differential.periods - 4}OT</span>
		{/if}
	</div>

	<!-- Game Info -->
	{#if differential.homeScore !== undefined && differential.awayScore !== undefined}
		<div class="game-score">
			<span class="final-label">Final</span>
			<span class="score">{differential.awayScore} - {differential.homeScore}</span>
		</div>
	{/if}

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
		<div class="fatigue-description">
			{#if fatigueLevel() === 'severe'}
				Severe fatigue - significant performance decline
			{:else if fatigueLevel() === 'moderate'}
				Moderate fatigue - noticeable decline
			{:else}
				Minimal fatigue - maintained performance
			{/if}
		</div>
	</div>

	<!-- Fatigue Warning -->
	{#if fatigueLevel() === 'severe'}
		<div class="warning">
			<AlertTriangle size={14} />
			<span>High fatigue indicators detected in this overtime game</span>
		</div>
	{/if}

	<!-- Data Note -->
	<div class="note">
		<p>Full REG vs OT stat breakdown requires play-by-play data (coming soon)</p>
	</div>
</div>

<style>
	.overtime-insights {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
		padding: var(--space-performance-xl);
		border-radius: var(--radius-performance-scale-lg);
	}

	.overtime-insights.compact {
		padding: var(--space-performance-md);
		gap: var(--space-performance-sm);
	}

	.header {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		color: var(--color-performance-fg-primary);
	}

	.title {
		font-size: var(--text-performance-body);
		font-weight: 600;
		margin: 0;
	}

	.badge {
		margin-left: auto;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-full);
		font-size: var(--text-performance-caption);
		font-weight: 500;
		color: var(--color-performance-fg-secondary);
	}

	.fatigue-meter {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	.meter-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.meter-value {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.meter-bar {
		height: 8px;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-full);
		overflow: hidden;
	}

	.meter-fill {
		height: 100%;
		background: var(--color-performance-success);
		border-radius: var(--radius-performance-scale-full);
		transition: width var(--duration-performance-standard) var(--ease-performance-standard), background var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.meter-fill.moderate {
		background: var(--color-performance-warning);
	}

	.meter-fill.severe {
		background: var(--color-performance-error);
	}

	.fatigue-description {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		margin-top: var(--space-performance-xs);
	}

	.game-score {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
	}

	.final-label {
		font-size: var(--text-performance-caption);
		font-weight: 500;
		color: var(--color-performance-fg-tertiary);
		text-transform: uppercase;
	}

	.score {
		font-size: var(--text-performance-body-lg);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.note {
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
	}

	.note p {
		margin: 0;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-tertiary);
		font-style: italic;
	}

	.warning {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-error-muted);
		border: 1px solid var(--color-performance-error-border);
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-error);
	}
</style>
