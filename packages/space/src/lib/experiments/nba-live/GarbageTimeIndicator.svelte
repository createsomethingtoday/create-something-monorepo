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

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		showTooltip = !showTooltip;
	}
	if (event.key === 'Escape') {
		showTooltip = false;
	}
}
</script>

<div 
	class="garbage-time-indicator"
	class:compact
	class:high={severityLevel() === 'high'}
	class:medium={severityLevel() === 'medium'}
	class:low={severityLevel() === 'low'}
	role="button"
	aria-label={warningText()}
	onmouseenter={() => showTooltip = true}
	onmouseleave={() => showTooltip = false}
	onfocus={() => showTooltip = true}
	onblur={() => showTooltip = false}
	onclick={() => showTooltip = !showTooltip}
	onkeydown={handleKeydown}
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
		gap: var(--space-performance-xs);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-md);
		cursor: help;
		position: relative;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.garbage-time-indicator:hover,
	.garbage-time-indicator:focus {
		border-color: var(--color-performance-warning);
		outline: none;
	}

	.garbage-time-indicator:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.garbage-time-indicator.compact {
		padding: var(--space-performance-xs);
		border-radius: var(--radius-performance-scale-full);
	}

	/* Severity colors */
	.garbage-time-indicator.high {
		color: var(--color-performance-error);
		border-color: var(--color-performance-error);
		background: var(--color-performance-error-muted);
	}

	.garbage-time-indicator.medium {
		color: var(--color-performance-warning);
		border-color: var(--color-performance-warning);
		background: var(--color-performance-warning-muted);
	}

	.garbage-time-indicator.low {
		color: var(--color-performance-fg-secondary);
		border-color: var(--color-performance-border-default);
	}

	.label {
		font-size: var(--text-performance-caption);
		font-weight: 500;
		white-space: nowrap;
	}

	/* Tooltip */
	.tooltip {
		position: absolute;
		top: calc(100% + var(--space-performance-sm));
		left: 50%;
		transform: translateX(-50%);
		width: 280px;
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-lg);
		box-shadow: var(--shadow-performance-scale-lg);
		z-index: var(--z-performance-modal);
		pointer-events: none;
		animation: fadeIn var(--duration-performance-micro) var(--ease-performance-standard);
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
		border-bottom: 6px solid var(--color-performance-border-default);
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
		border-bottom: 6px solid var(--color-performance-bg-elevated);
	}

	.tooltip-header {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		margin-bottom: var(--space-performance-sm);
		color: var(--color-performance-warning);
	}

	.tooltip-title {
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
	}

	.tooltip-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	.tooltip-text {
		margin: 0;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: 1.5;
	}

	.tooltip-note {
		margin: 0;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-tertiary);
		font-style: italic;
		line-height: 1.4;
	}

	.reliability-meter {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
	}

	.reliability-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-secondary);
	}

	.reliability-score {
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.reliability-bar {
		height: 4px;
		border-radius: var(--radius-performance-scale-full);
		overflow: hidden;
	}

	.reliability-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-performance-error) 0%, var(--color-performance-warning) 50%, var(--color-performance-success) 100%);
		border-radius: var(--radius-performance-scale-full);
		transition: width var(--duration-performance-standard) var(--ease-performance-standard);
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
			right: var(--space-performance-md);
			transform: none;
		}
	}
</style>
