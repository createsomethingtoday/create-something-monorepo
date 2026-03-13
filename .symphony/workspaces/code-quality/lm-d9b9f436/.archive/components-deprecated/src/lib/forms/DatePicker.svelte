<script lang="ts">
	/**
	 * DatePicker Component
	 *
	 * Calendar-based date selection with month/year navigation.
	 * Supports min/max dates and keyboard navigation.
	 *
	 * Canon principle: Date selection should be visual and intuitive.
	 *
	 * @example
	 * <DatePicker
	 *   bind:value={date}
	 *   placeholder="Select a date"
	 *   min={new Date()}
	 * />
	 */

	import { onMount } from 'svelte';

	interface Props {
		/** Selected date (bindable) */
		value?: Date;
		/** Placeholder text */
		placeholder?: string;
		/** Minimum selectable date */
		min?: Date;
		/** Maximum selectable date */
		max?: Date;
		/** Disabled state */
		disabled?: boolean;
		/** Date format for display */
		format?: 'short' | 'medium' | 'long';
		/** Called when value changes */
		onchange?: (date: Date | undefined) => void;
	}

	let {
		value = $bindable(),
		placeholder = 'Select date',
		min,
		max,
		disabled = false,
		format = 'medium',
		onchange
	}: Props = $props();

	let open = $state(false);
	let viewDate = $state(value || new Date());
	let containerRef: HTMLDivElement | undefined = $state();

	const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const MONTHS = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	// Current view month/year
	const viewMonth = $derived(viewDate.getMonth());
	const viewYear = $derived(viewDate.getFullYear());

	// Days in current month view
	const calendarDays = $derived(() => {
		const year = viewDate.getFullYear();
		const month = viewDate.getMonth();

		// First day of month
		const firstDay = new Date(year, month, 1);
		const startPadding = firstDay.getDay();

		// Last day of month
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();

		// Previous month days (padding)
		const prevMonth = new Date(year, month, 0);
		const prevDays = prevMonth.getDate();

		const days: { date: Date; inMonth: boolean; isToday: boolean; isSelected: boolean; isDisabled: boolean }[] = [];

		// Previous month padding
		for (let i = startPadding - 1; i >= 0; i--) {
			const date = new Date(year, month - 1, prevDays - i);
			days.push({
				date,
				inMonth: false,
				isToday: false,
				isSelected: false,
				isDisabled: isDateDisabled(date)
			});
		}

		// Current month days
		const today = new Date();
		for (let i = 1; i <= daysInMonth; i++) {
			const date = new Date(year, month, i);
			days.push({
				date,
				inMonth: true,
				isToday: isSameDay(date, today),
				isSelected: value ? isSameDay(date, value) : false,
				isDisabled: isDateDisabled(date)
			});
		}

		// Next month padding (fill to 42 days for consistent grid)
		const remaining = 42 - days.length;
		for (let i = 1; i <= remaining; i++) {
			const date = new Date(year, month + 1, i);
			days.push({
				date,
				inMonth: false,
				isToday: false,
				isSelected: false,
				isDisabled: isDateDisabled(date)
			});
		}

		return days;
	});

	// Format display value
	const displayValue = $derived(() => {
		if (!value) return '';

		const options: Intl.DateTimeFormatOptions = {
			short: { month: 'numeric', day: 'numeric', year: '2-digit' },
			medium: { month: 'short', day: 'numeric', year: 'numeric' },
			long: { month: 'long', day: 'numeric', year: 'numeric' }
		}[format];

		return value.toLocaleDateString('en-US', options);
	});

	function isSameDay(a: Date, b: Date): boolean {
		return (
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate()
		);
	}

	function isDateDisabled(date: Date): boolean {
		if (min && date < new Date(min.getFullYear(), min.getMonth(), min.getDate())) {
			return true;
		}
		if (max && date > new Date(max.getFullYear(), max.getMonth(), max.getDate())) {
			return true;
		}
		return false;
	}

	function selectDate(date: Date) {
		if (isDateDisabled(date)) return;
		value = date;
		onchange?.(date);
		closeCalendar();
	}

	function previousMonth() {
		viewDate = new Date(viewYear, viewMonth - 1, 1);
	}

	function nextMonth() {
		viewDate = new Date(viewYear, viewMonth + 1, 1);
	}

	function previousYear() {
		viewDate = new Date(viewYear - 1, viewMonth, 1);
	}

	function nextYear() {
		viewDate = new Date(viewYear + 1, viewMonth, 1);
	}

	function goToToday() {
		const today = new Date();
		viewDate = today;
		if (!isDateDisabled(today)) {
			selectDate(today);
		}
	}

	function openCalendar() {
		if (disabled) return;
		open = true;
		viewDate = value || new Date();
	}

	function closeCalendar() {
		open = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeCalendar();
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (containerRef && !containerRef.contains(event.target as Node)) {
			closeCalendar();
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div bind:this={containerRef} class="datepicker" class:open class:disabled>
	<button
		type="button"
		class="datepicker-trigger"
		onclick={openCalendar}
		{disabled}
		aria-haspopup="dialog"
		aria-expanded={open}
	>
		<span class="datepicker-value" class:placeholder={!value}>
			{displayValue() || placeholder}
		</span>
		<svg class="datepicker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
			<path d="M16 2v4M8 2v4M3 10h18" />
		</svg>
	</button>

	{#if open}
		<div
			class="datepicker-calendar"
			role="dialog"
			aria-modal="true"
			aria-label="Choose date"
		>
			<!-- Header -->
			<div class="calendar-header">
				<button type="button" class="nav-btn" onclick={previousYear} aria-label="Previous year">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
					</svg>
				</button>
				<button type="button" class="nav-btn" onclick={previousMonth} aria-label="Previous month">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M15 18l-6-6 6-6" />
					</svg>
				</button>

				<span class="calendar-title">
					{MONTHS[viewMonth]} {viewYear}
				</span>

				<button type="button" class="nav-btn" onclick={nextMonth} aria-label="Next month">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M9 18l6-6-6-6" />
					</svg>
				</button>
				<button type="button" class="nav-btn" onclick={nextYear} aria-label="Next year">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M6 17l5-5-5-5M13 17l5-5-5-5" />
					</svg>
				</button>
			</div>

			<!-- Day names -->
			<div class="calendar-weekdays">
				{#each DAYS as day}
					<span class="weekday">{day}</span>
				{/each}
			</div>

			<!-- Calendar grid -->
			<div class="calendar-grid" role="grid">
				{#each calendarDays() as day}
					<button
						type="button"
						class="calendar-day"
						class:outside={!day.inMonth}
						class:today={day.isToday}
						class:selected={day.isSelected}
						class:disabled={day.isDisabled}
						onclick={() => selectDate(day.date)}
						disabled={day.isDisabled}
						tabindex={day.inMonth ? 0 : -1}
						aria-label={day.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
						aria-selected={day.isSelected}
					>
						{day.date.getDate()}
					</button>
				{/each}
			</div>

			<!-- Footer -->
			<div class="calendar-footer">
				<button type="button" class="today-btn" onclick={goToToday}>
					Today
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.datepicker {
		position: relative;
		width: 100%;
	}

	.datepicker-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		padding: var(--space-sm, 1rem);
		cursor: pointer;
		transition: border-color var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.datepicker-trigger:hover:not(:disabled) {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.datepicker-trigger:focus-visible {
		outline: none;
		border-color: var(--color-border-strong, rgba(255, 255, 255, 0.3));
		box-shadow: 0 0 0 3px var(--color-focus, rgba(255, 255, 255, 0.5));
	}

	.datepicker-trigger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.datepicker-value {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-primary, #fff);
	}

	.datepicker-value.placeholder {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.datepicker-icon {
		width: 20px;
		height: 20px;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.datepicker-calendar {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 50;
		background: var(--color-bg-elevated, #0a0a0a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-lg, 12px);
		box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.3));
		padding: var(--space-md, 1.618rem);
		min-width: 280px;
		animation: calendarIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.calendar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md, 1.618rem);
	}

	.calendar-title {
		font-size: var(--text-body, 1rem);
		font-weight: 600;
		color: var(--color-fg-primary, #fff);
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: transparent;
		border: none;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		cursor: pointer;
		border-radius: var(--radius-sm, 6px);
		transition: all var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.nav-btn:hover {
		background: var(--color-bg-surface, #111);
		color: var(--color-fg-primary, #fff);
	}

	.nav-btn svg {
		width: 16px;
		height: 16px;
	}

	.calendar-weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
		margin-bottom: var(--space-xs, 0.5rem);
	}

	.weekday {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		text-align: center;
		padding: var(--space-xs, 0.5rem);
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}

	.calendar-day {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-primary, #fff);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm, 6px);
		cursor: pointer;
		transition: all var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.calendar-day:hover:not(:disabled) {
		background: var(--color-bg-surface, #111);
	}

	.calendar-day:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: -2px;
	}

	.calendar-day.outside {
		color: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
	}

	.calendar-day.today {
		border: 1px solid var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.calendar-day.selected {
		background: var(--color-fg-primary, #fff);
		color: var(--color-bg-pure, #000);
		font-weight: 600;
	}

	.calendar-day.disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.calendar-footer {
		display: flex;
		justify-content: center;
		margin-top: var(--space-md, 1.618rem);
		padding-top: var(--space-sm, 1rem);
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.today-btn {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		background: transparent;
		border: none;
		cursor: pointer;
		padding: var(--space-xs, 0.5rem) var(--space-sm, 1rem);
		border-radius: var(--radius-sm, 6px);
		transition: all var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.today-btn:hover {
		background: var(--color-bg-surface, #111);
		color: var(--color-fg-primary, #fff);
	}

	@keyframes calendarIn {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.datepicker-trigger,
		.nav-btn,
		.calendar-day,
		.today-btn,
		.datepicker-calendar {
			transition: none;
			animation: none;
		}
	}
</style>
