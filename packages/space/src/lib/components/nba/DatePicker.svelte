<script lang="ts">
	/**
	 * DatePicker Component
	 *
	 * Tufte principle: Minimal chrome, maximum data.
	 * Nicely Said: Clear labels, meet users where they are.
	 */

	import { Calendar, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	interface Props {
		currentDate: string; // YYYY-MM-DD
		baseUrl: string; // e.g., "/experiments/nba-live"
	}

	let { currentDate, baseUrl }: Props = $props();

	// Parse current date
	const date = $derived(new Date(currentDate));
	const today = $derived(new Date());
	today.setHours(0, 0, 0, 0);

	// Check if we're viewing today
	const isToday = $derived(
		date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
	);

	// Check if we can go forward (don't go past today)
	const canGoForward = $derived(date < today);

	// Format for display (Nicely Said: familiar format)
	const displayDate = $derived(
		date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
		})
	);

	function navigateDate(delta: number) {
		const newDate = new Date(date);
		newDate.setDate(newDate.getDate() + delta);

		// Don't go past today
		if (newDate > today) return;

		const dateStr = newDate.toISOString().split('T')[0];
		goto(`${baseUrl}?date=${dateStr}`);
	}

	function goToToday() {
		goto(baseUrl); // No date param = today
	}

	function handleDateInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const selectedDate = new Date(input.value);

		// Don't allow future dates
		if (selectedDate > today) {
			input.value = currentDate;
			return;
		}

		goto(`${baseUrl}?date=${input.value}`);
	}
</script>

<div class="date-picker">
	<button
		class="nav-button"
		onclick={() => navigateDate(-1)}
		aria-label="Previous day"
		title="Previous day"
	>
		<ChevronLeft size={16} />
	</button>

	<div class="date-display">
		<label class="date-label" for="date-input">
			<Calendar size={14} class="calendar-icon" />
			<span class="date-text">{displayDate}</span>
		</label>
		<input
			id="date-input"
			type="date"
			class="date-input"
			value={currentDate}
			max={today.toISOString().split('T')[0]}
			onchange={handleDateInput}
		/>
	</div>

	{#if !isToday}
		<button class="today-button" onclick={goToToday} title="Jump to today">Today</button>
	{/if}

	<button
		class="nav-button"
		onclick={() => navigateDate(1)}
		disabled={!canGoForward}
		aria-label="Next day"
		title="Next day"
	>
		<ChevronRight size={16} />
	</button>
</div>

<style>
	/* Tufte: High data-ink ratio, minimal decoration */

	.date-picker {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		width: fit-content;
	}

	/* Navigation buttons */
	.nav-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-tertiary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-button:hover:not(:disabled) {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.nav-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	/* Date display */
	.date-display {
		position: relative;
	}

	.date-label {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		cursor: pointer;
		user-select: none;
	}

	.date-label :global(.calendar-icon) {
		color: var(--color-fg-muted);
	}

	.date-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	/* Hidden native date input (clicking label opens it) */
	.date-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 1px;
		height: 1px;
	}

	/* Today button (only shows when not on today) */
	.today-button {
		padding: var(--space-xs) var(--space-sm);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.today-button:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}
</style>
