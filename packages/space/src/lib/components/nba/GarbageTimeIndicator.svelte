<script lang="ts">
	/**
	 * Garbage Time Warning Indicator
	 * 
	 * Visual indicator on player stat cards when stats occurred during garbage time.
	 * Shows tooltip explaining the context.
	 */
	
	import { AlertCircle } from 'lucide-svelte';
	
	interface Props {
		garbageTimeMinutes: number;
		totalMinutes: number;
		reliabilityScore: number;
		compact?: boolean;
	}
	
	let { garbageTimeMinutes, totalMinutes, reliabilityScore, compact = false }: Props = $props();
	
	let showTooltip = $state(false);
	
	const garbageTimePct = $derived((garbageTimeMinutes / totalMinutes) * 100);
	
	const severityLevel = $derived(() => {
		if (garbageTimePct >= 50) return 'high';
		if (garbageTimePct >= 25) return 'medium';
		return 'low';
	});
	
	const warningText = $derived(() => {
		if (severityLevel() === 'high') {
			return 'Most stats from garbage time';
		}
		if (severityLevel() === 'medium') {
			return 'Some stats from garbage time';
		}
		return 'Limited garbage time';
	});
</script>

<div 
	class="garbage-time-indicator"
	class:compact
	class:high={severityLevel() === 'high'}
	class:medium={severityLevel() === 'medium'}
	class:low={severityLevel() === 'low'}
	role="tooltip"
	aria-label={warningText()}
	onmouseenter={() => showTooltip = true}
	onmouseleave={() => showTooltip = false}
	onfocus={() => showTooltip = true}
	onblur={() => showTooltip = false}
	tabindex="0"
>
	<AlertCircle size={compact ? 14 : 16} />
	
	{#if !compact}
		<span class="label">Garbage Time</span>
	{/if}
	
	{#if showTooltip}
		<div class="tooltip" role="tooltip">
			<div class="tooltip-header">
				<AlertCircle size={14} />
				<span class="tooltip-title">Garbage Time Warning</span>
			</div>
			
			<div class="tooltip-content">
				<p class="tooltip-text">
					{garbageTimeMinutes.toFixed(1)} of {totalMinutes.toFixed(1)} minutes ({garbageTimePct.toFixed(0)}%) 
					played during non-competitive game situations.
				</p>
				
				<div class="reliability-meter">
					<div class="reliability-label">
						<span>Stat Reliability</span>
						<span class="reliability-score">{reliabilityScore}/100</span>
					</div>
					<div class="reliability-bar">
						<div 
							class="reliability-fill" 
							style="width: {reliabilityScore}%"
						></div>
					</div>
				</div>
				
				<p class="tooltip-note">
					Stats accumulated during blowouts may not reflect competitive performance.
				</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.garbage-time-indicator {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: help;
		position: relative;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.garbage-time-indicator:hover,
	.garbage-time-indicator:focus {
		border-color: var(--color-warning);
		outline: none;
	}

	.garbage-time-indicator:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.garbage-time-indicator.compact {
		padding: var(--space-xs);
		border-radius: var(--radius-full);
	}

	/* Severity colors */
	.garbage-time-indicator.high {
		color: var(--color-error);
		border-color: var(--color-error);
		background: var(--color-error-muted);
	}

	.garbage-time-indicator.medium {
		color: var(--color-warning);
		border-color: var(--color-warning);
		background: var(--color-warning-muted);
	}

	.garbage-time-indicator.low {
		color: var(--color-fg-secondary);
		border-color: var(--color-border-default);
	}

	.label {
		font-size: var(--text-caption);
		font-weight: 500;
		white-space: nowrap;
	}

	/* Tooltip */
	.tooltip {
		position: absolute;
		top: calc(100% + var(--space-sm));
		left: 50%;
		transform: translateX(-50%);
		width: 280px;
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		z-index: var(--z-modal);
		pointer-events: none;
		animation: fadeIn var(--duration-micro) var(--ease-standard);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	/* Arrow */
	.tooltip::before {
		content: '';
		position: absolute;
		top: -6px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		border-bottom: 6px solid var(--color-border-default);
	}

	.tooltip::after {
		content: '';
		position: absolute;
		top: -5px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		border-bottom: 6px solid var(--color-bg-elevated);
	}

	.tooltip-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
		color: var(--color-warning);
	}

	.tooltip-title {
		font-size: var(--text-body-sm);
		font-weight: 600;
	}

	.tooltip-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.tooltip-text {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}

	.tooltip-note {
		margin: 0;
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		font-style: italic;
		line-height: 1.4;
	}

	.reliability-meter {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.reliability-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.reliability-score {
		font-weight: 700;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.reliability-bar {
		height: 4px;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.reliability-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-error) 0%, var(--color-warning) 50%, var(--color-success) 100%);
		border-radius: var(--radius-full);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	/* Mobile responsive */
	@media (max-width: 640px) {
		.tooltip {
			width: 240px;
			left: auto;
			right: 0;
			transform: none;
		}

		.tooltip::before,
		.tooltip::after {
			left: auto;
			right: var(--space-md);
			transform: none;
		}
	}
</style>
