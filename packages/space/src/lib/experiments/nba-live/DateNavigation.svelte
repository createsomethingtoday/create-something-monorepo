<script lang="ts">
	/**
	 * DateNavigation Component
	 *
	 * Navigate between dates to view historical NBA games.
	 * Tufte principle: minimal chrome, functional navigation.
	 */

	import { ChevronLeft, ChevronRight, Calendar } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	interface Props {
		currentDate: string; // YYYY-MM-DD
		baseUrl?: string;
	}

	let { currentDate, baseUrl = '/data/nba' }: Props = $props();

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + 'T00:00:00');
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const dateObj = new Date(date);
		dateObj.setHours(0, 0, 0, 0);

		const diffDays = Math.floor((dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === -1) return 'Yesterday';
		if (diffDays === 1) return 'Tomorrow';

		return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function changeDate(offset: number) {
		const date = new Date(currentDate + 'T00:00:00');
		date.setDate(date.getDate() + offset);
		const newDate = date.toISOString().split('T')[0];
		goto(`${baseUrl}?date=${newDate}`);
	}
</script>

<div class="date-nav">
	<button class="nav-button" onclick={() => changeDate(-1)} aria-label="Previous day">
		<ChevronLeft size={16} />
	</button>

	<div class="date-display">
		<Calendar size={14} class="date-icon" />
		<span class="date-label">{formatDate(currentDate)}</span>
	</div>

	<button class="nav-button" onclick={() => changeDate(1)} aria-label="Next day">
		<ChevronRight size={16} />
	</button>
</div>

<style>
	.date-nav {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
	}

	.nav-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		color: var(--color-performance-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.nav-button:hover {
		border-color: var(--color-performance-border-emphasis);
		color: var(--color-performance-fg-primary);
	}

	.date-display {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		min-width: 140px;
		justify-content: center;
	}

	.date-display :global(.date-icon) {
		color: var(--color-performance-fg-muted);
	}

	.date-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
</style>
