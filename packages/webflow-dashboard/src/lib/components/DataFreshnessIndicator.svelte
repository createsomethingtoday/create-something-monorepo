<script lang="ts">
	/**
	 * DataFreshnessIndicator - Shows that financial data is from a weekly snapshot
	 * 
	 * Use this component wherever cumulative financial data (revenue, purchases) is displayed
	 * to set clear expectations about data freshness and update schedule.
	 * 
	 * Variants:
	 * - 'inline': Compact inline badge for table headers and stat cards
	 * - 'tooltip': Icon-only with hover tooltip
	 * - 'full': Full message with icon (for page headers)
	 */
	import { Info, Clock } from 'lucide-svelte';

	interface Props {
		variant?: 'inline' | 'tooltip' | 'full';
		showSchedule?: boolean;
	}

	let { variant = 'inline', showSchedule = false }: Props = $props();

	// Calculate next Monday 4 PM UTC
	function getNextUpdateInfo(): { lastUpdate: string; nextUpdate: string; daysUntil: number } {
		const now = new Date();
		const currentDay = now.getUTCDay();
		const currentHour = now.getUTCHours();

		// Calculate days until next Monday 4 PM UTC
		let daysUntilMonday: number;
		if (currentDay === 1) {
			daysUntilMonday = currentHour < 16 ? 0 : 7;
		} else if (currentDay === 0) {
			daysUntilMonday = 1;
		} else {
			daysUntilMonday = 8 - currentDay;
		}

		// Calculate last Monday
		let daysSinceLastMonday: number;
		if (currentDay === 1 && currentHour >= 16) {
			daysSinceLastMonday = 0;
		} else if (currentDay === 1) {
			daysSinceLastMonday = 7;
		} else if (currentDay === 0) {
			daysSinceLastMonday = 6;
		} else {
			daysSinceLastMonday = currentDay - 1;
		}

		const lastMonday = new Date(now);
		lastMonday.setUTCDate(now.getUTCDate() - daysSinceLastMonday);
		lastMonday.setUTCHours(16, 0, 0, 0);

		const nextMonday = new Date(now);
		nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
		nextMonday.setUTCHours(16, 0, 0, 0);

		return {
			lastUpdate: formatRelativeDate(lastMonday),
			nextUpdate: formatRelativeDate(nextMonday),
			daysUntil: daysUntilMonday
		};
	}

	function formatRelativeDate(date: Date): string {
		const now = new Date();
		const diffMs = date.getTime() - now.getTime();
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			const diffHours = Math.round(diffMs / (1000 * 60 * 60));
			if (diffHours <= 0) return 'Today';
			if (diffHours === 1) return 'in 1 hour';
			return `in ${diffHours} hours`;
		}
		if (diffDays === 1) return 'Tomorrow';
		if (diffDays === -1) return 'Yesterday';
		if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
		return `in ${diffDays} days`;
	}

	const updateInfo = $derived(getNextUpdateInfo());
</script>

{#if variant === 'full'}
	<div class="freshness-full">
		<div class="freshness-header">
			<Clock size={14} />
			<span class="freshness-label">Weekly Snapshot</span>
		</div>
		<p class="freshness-detail">
			Updated {updateInfo.lastUpdate} • Next update {updateInfo.nextUpdate}
		</p>
		{#if showSchedule}
			<p class="freshness-schedule">
				<Info size={12} />
				Data syncs every Monday at 4 PM UTC
			</p>
		{/if}
	</div>
{:else if variant === 'tooltip'}
	<span 
		class="freshness-tooltip" 
		title="Weekly snapshot data. Updated {updateInfo.lastUpdate}, next update {updateInfo.nextUpdate}. Syncs every Monday 4 PM UTC."
	>
		<Info size={14} />
	</span>
{:else}
	<!-- inline variant -->
	<span class="freshness-badge" title="Data syncs weekly on Mondays at 4 PM UTC">
		<Clock size={10} />
		<span>Weekly Snapshot</span>
	</span>
{/if}

<style>
	.freshness-full {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.freshness-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
	}

	.freshness-detail {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.freshness-schedule {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		margin: 0.25rem 0 0;
	}

	.freshness-tooltip {
		display: inline-flex;
		align-items: center;
		color: var(--color-fg-muted);
		cursor: help;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.freshness-tooltip:hover {
		color: var(--color-fg-secondary);
	}

	.freshness-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.375rem;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		cursor: help;
		white-space: nowrap;
	}

	.freshness-badge:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-secondary);
	}
</style>
