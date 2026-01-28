<script lang="ts">
	interface Props {
		selectedDate: Date | null;
		onDateSelect: (date: Date) => void;
		availableDates?: Set<string>;
		loading?: boolean;
	}

	let { selectedDate, onDateSelect, availableDates, loading = false }: Props = $props();

	let currentMonth = $state(new Date());

	const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	const today = $derived.by(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	});

	const monthStart = $derived(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
	const monthEnd = $derived(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));

	const calendarDays = $derived.by(() => {
		const days: (Date | null)[] = [];

		// Add empty cells for days before month starts
		const startDay = monthStart.getDay();
		for (let i = 0; i < startDay; i++) {
			days.push(null);
		}

		// Add all days of the month
		for (let d = 1; d <= monthEnd.getDate(); d++) {
			days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
		}

		return days;
	});

	function formatDateKey(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	function isDateAvailable(date: Date): boolean {
		if (!availableDates) return true;
		return availableDates.has(formatDateKey(date));
	}

	function isToday(date: Date): boolean {
		return formatDateKey(date) === formatDateKey(today);
	}

	function isSelected(date: Date): boolean {
		if (!selectedDate) return false;
		return formatDateKey(date) === formatDateKey(selectedDate);
	}

	function isPast(date: Date): boolean {
		return date < today;
	}

	function previousMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
	}

	function nextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
	}

	function handleDateClick(date: Date) {
		if (!isPast(date) && isDateAvailable(date)) {
			onDateSelect(date);
		}
	}

	const canGoPrevious = $derived(
		currentMonth.getFullYear() > today.getFullYear() ||
			(currentMonth.getFullYear() === today.getFullYear() &&
				currentMonth.getMonth() > today.getMonth())
	);
</script>

<div class="date-picker" class:loading>
	<div class="month-header">
		<button
			type="button"
			class="nav-button"
			onclick={previousMonth}
			disabled={!canGoPrevious}
			aria-label="Previous month"
		>
			<span class="arrow">←</span>
		</button>
		<span class="month-label">
			{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
		</span>
		<button type="button" class="nav-button" onclick={nextMonth} aria-label="Next month">
			<span class="arrow">→</span>
		</button>
	</div>

	<div class="weekdays">
		{#each weekdays as day}
			<span class="weekday">{day}</span>
		{/each}
	</div>

	<div class="days-grid">
		{#each calendarDays as day}
			{#if day === null}
				<span class="day empty"></span>
			{:else}
				<button
					type="button"
					class="day"
					class:today={isToday(day)}
					class:selected={isSelected(day)}
					class:past={isPast(day)}
					class:unavailable={!isPast(day) && !isDateAvailable(day)}
					disabled={isPast(day) || !isDateAvailable(day)}
					onclick={() => handleDateClick(day)}
					aria-label={day.toLocaleDateString('en-US', {
						weekday: 'long',
						month: 'long',
						day: 'numeric'
					})}
					aria-pressed={isSelected(day)}
				>
					{day.getDate()}
				</button>
			{/if}
		{/each}
	</div>

	{#if loading}
		<div class="loading-overlay">
			<span class="loading-text">Loading availability...</span>
		</div>
	{/if}
</div>

<style>
	.date-picker {
		position: relative;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.date-picker.loading {
		opacity: 0.6;
		pointer-events: none;
	}

	.month-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
	}

	.nav-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-button:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.nav-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.nav-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.arrow {
		font-size: var(--text-body-lg);
	}

	.month-label {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
		margin-bottom: var(--space-xs);
	}

	.weekday {
		text-align: center;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		padding: var(--space-xs) 0;
	}

	.days-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}

	.day {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.day:not(:disabled):hover {
		background: var(--color-hover);
	}

	.day:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.day.empty {
		cursor: default;
	}

	.day.today {
		border-color: var(--color-fg-primary);
	}

	.day.selected {
		background: var(--color-bg-elevated);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
	}

	.day.past,
	.day.unavailable {
		color: var(--color-fg-muted);
		cursor: not-allowed;
	}

	.day.past {
		opacity: 0.4;
	}

	.day.unavailable:not(.past) {
		text-decoration: line-through;
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-overlay);
		border-radius: var(--radius-lg);
	}

	.loading-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}
</style>
