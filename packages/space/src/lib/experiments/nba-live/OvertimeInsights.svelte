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
		gap: var(--space-md);
		padding: var(--space-xl);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.overtime-insights.compact {
		padding: var(--space-md);
		gap: var(--space-sm);
	}

	.header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.title {
		font-size: var(--text-body);
		font-weight: 600;
		margin: 0;
	}

	.badge {
		margin-left: auto;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	.fatigue-meter {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.meter-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.meter-value {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.meter-bar {
		height: 8px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.meter-fill {
		height: 100%;
		background: var(--color-success);
		border-radius: var(--radius-full);
		transition: width var(--duration-standard) var(--ease-standard), background var(--duration-standard) var(--ease-standard);
	}

	.meter-fill.moderate {
		background: var(--color-warning);
	}

	.meter-fill.severe {
		background: var(--color-error);
	}

	.fatigue-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-top: var(--space-xs);
	}

	.game-score {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.final-label {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
	}

	.score {
		font-size: var(--text-body-lg);
		font-weight: 700;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.note {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.note p {
		margin: 0;
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		font-style: italic;
	}

	.warning {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-error);
	}
</style>
