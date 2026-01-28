<script lang="ts">
	/**
	 * Volume Metric Component
	 *
	 * Shows made field goal differential - the refinement metric.
	 * "Volume beats efficiency. If differential ≥8, bet on the team making more shots."
	 */

	import { TrendingUp, TrendingDown, Minus } from 'lucide-svelte';

	interface Props {
		awayTeam: string;
		homeTeam: string;
		awayMadeFG: number;
		homeMadeFG: number;
		differential: number;
	}

	let { awayTeam, homeTeam, awayMadeFG, homeMadeFG, differential }: Props = $props();

	const volumeAdvantage = $derived(
		differential < 3 ? 'even' : homeMadeFG > awayMadeFG ? 'home' : 'away'
	);

	const isSignificant = $derived(differential >= 8);
</script>

<div class="volume-metric" class:significant={isSignificant}>
	<div class="metric-label">
		{#if volumeAdvantage === 'even'}
			<Minus size={12} class="metric-icon" />
		{:else if volumeAdvantage === 'home'}
			<TrendingUp size={12} class="metric-icon metric-icon--home" />
		{:else}
			<TrendingUp size={12} class="metric-icon metric-icon--away" />
		{/if}
		<span class="label-text">Made FG</span>
	</div>

	<div class="metric-values">
		<span class="team-value" class:advantage={volumeAdvantage === 'away'}>
			{awayTeam} {awayMadeFG}
		</span>
		<span class="separator">|</span>
		<span class="team-value" class:advantage={volumeAdvantage === 'home'}>
			{homeTeam} {homeMadeFG}
		</span>
	</div>

	{#if isSignificant}
		<div class="significance-badge">Volume advantage</div>
	{/if}
</div>

<style>
	.volume-metric {
		display: flex;
		flex-direction: column;
		gap: calc(var(--space-xs) * 0.5);
		font-size: var(--text-caption);
		padding-top: var(--space-xs);
		margin-top: var(--space-xs);
		border-top: 1px solid var(--color-border-default);
	}

	.volume-metric.significant {
		border-top-color: var(--color-warning);
	}

	/* Label */
	.metric-label {
		display: flex;
		align-items: center;
		gap: calc(var(--space-xs) * 0.5);
		color: var(--color-fg-muted);
	}

	.volume-metric :global(.metric-icon) {
		color: var(--color-fg-muted);
	}

	.volume-metric :global(.metric-icon--home),
	.volume-metric :global(.metric-icon--away) {
		color: var(--color-fg-secondary);
	}

	.label-text {
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Values */
	.metric-values {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-variant-numeric: tabular-nums;
		color: var(--color-fg-tertiary);
	}

	.team-value {
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.team-value.advantage {
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	.separator {
		color: var(--color-border-emphasis);
	}

	/* Significance badge */
	.significance-badge {
		font-size: var(--text-caption);
		color: var(--color-warning);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>
