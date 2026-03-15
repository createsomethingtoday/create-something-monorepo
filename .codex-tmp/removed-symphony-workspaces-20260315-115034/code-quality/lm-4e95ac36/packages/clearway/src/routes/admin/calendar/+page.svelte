<script lang="ts">
	/**
	 * Admin Calendar - Timeline View
	 *
	 * Shows all reservations across courts for a selected date.
	 * Reservations displayed as blocks on a timeline grid.
	 * Canon-compliant: monochrome, opacity for status.
	 */

	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// Operating hours (6am to 10pm)
	const START_HOUR = 6;
	const END_HOUR = 22;
	const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

	// Format date for display
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + 'T12:00:00');
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Format hour for column header
	function formatHour(hour: number): string {
		const ampm = hour >= 12 ? 'PM' : 'AM';
		const h = hour % 12 || 12;
		return `${h}${ampm}`;
	}

	// Reservation with lane info for stacking
	interface ReservationWithLane {
		id: string;
		court_id: string;
		member_name: string;
		member_email: string;
		start_time: string;
		end_time: string;
		status: string;
		booking_source: string;
		rate_cents: number | null;
		lane: number;
		totalLanes: number;
	}

	// Helper to get clamped time in hours (for visual overlap detection)
	function getClampedHours(isoString: string, isEnd: boolean): number {
		const date = new Date(isoString);
		const hours = date.getHours() + date.getMinutes() / 60;
		if (isEnd) {
			return Math.min(hours, END_HOUR);
		}
		return Math.max(hours, START_HOUR);
	}

	// Get reservations for a specific court with lane assignments for overlap handling
	function getCourtReservations(courtId: string): ReservationWithLane[] {
		const courtRes = data.reservations.filter((r) => r.court_id === courtId);

		// Filter out reservations entirely outside operating hours
		const visible = courtRes.filter((r) => {
			const startHour = new Date(r.start_time).getHours();
			const endHour = new Date(r.end_time).getHours();
			// Keep if any part falls within operating hours
			return endHour > START_HOUR && startHour < END_HOUR;
		});

		// Sort by clamped start time (visual position)
		const sorted = [...visible].sort((a, b) => {
			const aStart = getClampedHours(a.start_time, false);
			const bStart = getClampedHours(b.start_time, false);
			return aStart - bStart;
		});

		// Assign lanes based on VISUAL overlap (using clamped times)
		const lanes: { end: number; items: typeof sorted }[] = [];

		for (const res of sorted) {
			const resStart = getClampedHours(res.start_time, false);
			const resEnd = getClampedHours(res.end_time, true);

			// Find first lane where this reservation fits (no visual overlap)
			// Require small gap to prevent edge-to-edge visual overlap
			let assignedLane = lanes.findIndex((lane) => lane.end < resStart);

			if (assignedLane === -1) {
				// No available lane, create new one
				assignedLane = lanes.length;
				lanes.push({ end: resEnd, items: [] });
			} else {
				// Update lane end time
				lanes[assignedLane].end = resEnd;
			}

			lanes[assignedLane].items.push(res);
		}

		// Build result with lane info
		const result: ReservationWithLane[] = [];
		const totalLanes = lanes.length || 1;

		for (let laneIdx = 0; laneIdx < lanes.length; laneIdx++) {
			for (const res of lanes[laneIdx].items) {
				result.push({
					...res,
					lane: laneIdx,
					totalLanes
				});
			}
		}

		return result;
	}

	// Calculate position and width for a reservation block
	function getBlockStyle(reservation: ReservationWithLane): string {
		const start = new Date(reservation.start_time);
		const end = new Date(reservation.end_time);

		const startHour = start.getHours() + start.getMinutes() / 60;
		const endHour = end.getHours() + end.getMinutes() / 60;

		// Clamp to visible range (reservations outside operating hours get clipped)
		const clampedStart = Math.max(startHour, START_HOUR);
		const clampedEnd = Math.min(endHour, END_HOUR);

		// Calculate horizontal position as percentage of timeline
		const left = ((clampedStart - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
		const width = ((clampedEnd - clampedStart) / (END_HOUR - START_HOUR)) * 100;

		// Calculate vertical position based on lane
		const laneHeight = 100 / reservation.totalLanes;
		const top = reservation.lane * laneHeight;

		return `left: ${left}%; width: ${width}%; top: ${top}%; height: ${laneHeight}%;`;
	}

	// Format time for display
	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	// Navigate to a date
	function navigateTo(dateStr: string) {
		goto(`/admin/calendar?date=${dateStr}`);
	}

	// Navigate to today
	function goToday() {
		const today = new Date().toISOString().split('T')[0];
		goto(`/admin/calendar?date=${today}`);
	}

	// Get status class for styling
	function getStatusClass(status: string): string {
		switch (status) {
			case 'confirmed':
			case 'completed':
				return 'status-confirmed';
			case 'pending':
				return 'status-pending';
			case 'cancelled':
			case 'no_show':
				return 'status-cancelled';
			default:
				return '';
		}
	}
</script>

<svelte:head>
	<title>Calendar - CLEARWAY Admin</title>
</svelte:head>

<div class="calendar-admin">
	<!-- Header -->
	<header class="header">
		<div class="header-content">
			<div class="header-nav">
				<a href="/admin" class="back-link">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
						<path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					Dashboard
				</a>
			</div>

			<div class="date-nav">
				<button class="nav-btn" onclick={() => navigateTo(data.prevDate)} aria-label="Previous day">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
						<path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>

				<div class="date-display">
					<h1>{formatDate(data.selectedDate)}</h1>
					<button class="today-btn" onclick={goToday}>Today</button>
				</div>

				<button class="nav-btn" onclick={() => navigateTo(data.nextDate)} aria-label="Next day">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
						<path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			</div>

			<div class="header-stats">
				<span class="stat">{data.reservations.length} bookings</span>
				<span class="stat revenue">${(data.dailyRevenue / 100).toLocaleString()}</span>
			</div>
		</div>
	</header>

	<!-- Error State -->
	{#if data.error}
		<div class="error-banner">
			<span class="error-icon">⚠</span>
			<span>{data.error}</span>
		</div>
	{/if}

	<!-- Timeline -->
	<div class="timeline-container">
		<div class="timeline">
			<!-- Time headers -->
			<div class="timeline-header">
				<div class="court-label-header">Court</div>
				<div class="hours-header">
					{#each HOURS as hour}
						<div class="hour-header">{formatHour(hour)}</div>
					{/each}
				</div>
			</div>

			<!-- Court rows -->
			<div class="timeline-body">
				{#if data.courts.length === 0}
					<div class="empty-state">
						<p>No courts available</p>
						{#if !data.error}
							<p class="empty-hint">Configure courts in your facility settings</p>
						{/if}
					</div>
				{/if}
				{#each data.courts as court}
					{@const reservations = getCourtReservations(court.id)}
					{@const maxLanes = reservations.length > 0 ? reservations[0].totalLanes : 1}
					{@const rowHeight = Math.max(80, maxLanes * 32)}
					<div class="court-row" style="min-height: {rowHeight}px;">
						<div class="court-label">
							<span class="court-name">{court.name}</span>
							<span class="court-count">{reservations.length}</span>
						</div>
						<div class="court-timeline">
							<!-- Hour grid lines -->
							{#each HOURS as hour}
								<div class="hour-line"></div>
							{/each}

							<!-- Reservation blocks -->
							{#each reservations as reservation}
								<div
									class="reservation-block {getStatusClass(reservation.status)}"
									style={getBlockStyle(reservation)}
									title="{reservation.member_name} ({formatTime(reservation.start_time)} - {formatTime(reservation.end_time)})"
								>
									<span class="block-name">{reservation.member_name}</span>
									<span class="block-time">{formatTime(reservation.start_time)}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Legend -->
	<div class="legend">
		<div class="legend-item">
			<div class="legend-color status-confirmed"></div>
			<span>Confirmed</span>
		</div>
		<div class="legend-item">
			<div class="legend-color status-pending"></div>
			<span>Pending</span>
		</div>
		<div class="legend-item">
			<div class="legend-color status-cancelled"></div>
			<span>Cancelled</span>
		</div>
	</div>
</div>

<style>
	/* Canon Design System - Admin Calendar */
	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: var(--space-md, 1rem) var(--space-xl, 2rem);
		background: var(--color-bg-subtle, #1a1a1a);
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		font-size: var(--text-body-sm, 0.875rem);
	}

	.error-icon {
		opacity: 0.7;
	}

	.empty-state {
		padding: var(--space-xl, 2rem);
		text-align: center;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.empty-state p {
		margin: 0;
	}

	.empty-hint {
		font-size: var(--text-caption, 0.75rem);
		margin-top: 0.5rem !important;
		opacity: 0.7;
	}

	.calendar-admin {
		min-height: 100vh;
		background: var(--color-bg-pure, #000000);
		color: var(--color-fg-primary, #ffffff);
		font-family: var(--font-sans, 'Stack Sans Notch', system-ui, sans-serif);
	}

	/* Header */
	.header {
		padding: var(--space-md, 1rem) var(--space-xl, 2rem);
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.header-content {
		max-width: 1400px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-lg, 1.5rem);
	}

	.header-nav {
		flex: 1;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		text-decoration: none;
		font-size: var(--text-body-sm, 0.875rem);
		transition: color var(--duration-micro, 100ms) ease;
	}

	.back-link:hover {
		color: var(--color-fg-primary, #ffffff);
	}

	.date-nav {
		display: flex;
		align-items: center;
		gap: var(--space-md, 1rem);
	}

	.date-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	h1 {
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		margin: 0;
		white-space: nowrap;
	}

	.today-btn {
		font-size: var(--text-caption, 0.75rem);
		font-weight: 500;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		transition: color var(--duration-micro, 100ms) ease;
	}

	.today-btn:hover {
		color: var(--color-fg-primary, #ffffff);
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: transparent;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		cursor: pointer;
		transition:
			border-color var(--duration-micro, 100ms) ease,
			color var(--duration-micro, 100ms) ease;
	}

	.nav-btn:hover {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.25));
		color: var(--color-fg-primary, #ffffff);
	}

	.header-stats {
		flex: 1;
		text-align: right;
	}

	.header-stats {
		display: flex;
		align-items: center;
		gap: var(--space-md, 1rem);
	}

	.stat {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.stat.revenue {
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		color: var(--color-fg-primary, #ffffff);
	}

	/* Timeline Container */
	.timeline-container {
		padding: var(--space-lg, 1.5rem);
		overflow-x: auto;
	}

	.timeline {
		min-width: 1200px;
	}

	/* Timeline Header */
	.timeline-header {
		display: flex;
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		margin-bottom: var(--space-sm, 0.5rem);
	}

	.court-label-header {
		width: 120px;
		flex-shrink: 0;
		padding: var(--space-sm, 0.5rem);
		font-size: var(--text-caption, 0.75rem);
		font-weight: 500;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.hours-header {
		flex: 1;
		display: flex;
	}

	.hour-header {
		flex: 1;
		padding: var(--space-sm, 0.5rem);
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		text-align: center;
	}

	/* Timeline Body */
	.timeline-body {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.court-row {
		display: flex;
		min-height: 80px;
	}

	.court-label {
		width: 120px;
		flex-shrink: 0;
		padding: var(--space-sm, 0.5rem);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--color-bg-subtle, #1a1a1a);
		border-radius: var(--radius-sm, 4px) 0 0 var(--radius-sm, 4px);
	}

	.court-name {
		font-weight: 500;
		font-size: var(--text-body-sm, 0.875rem);
	}

	.court-count {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		background: var(--color-bg-surface, #111111);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
	}

	.court-timeline {
		flex: 1;
		position: relative;
		display: flex;
		background: var(--color-bg-surface, #111111);
		border-radius: 0 var(--radius-sm, 4px) var(--radius-sm, 4px) 0;
		overflow: hidden;
	}

	.hour-line {
		flex: 1;
		border-left: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.hour-line:first-child {
		border-left: none;
	}

	/* Reservation Blocks */
	.reservation-block {
		position: absolute;
		/* top/height set via inline style based on lane */
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 2px 0.5rem;
		margin: 2px 0;
		box-sizing: border-box;
		background: var(--color-fg-primary, #ffffff);
		color: var(--color-bg-pure, #000000);
		border-radius: var(--radius-sm, 4px);
		overflow: hidden;
		cursor: pointer;
		transition: opacity var(--duration-micro, 100ms) ease;
		min-height: 0;
	}

	.reservation-block:hover {
		opacity: 0.9;
	}

	.block-name {
		font-size: var(--text-caption, 0.75rem);
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.block-time {
		font-size: 0.625rem;
		opacity: 0.7;
	}

	/* Status colors using opacity (Canon: monochrome) */
	.status-confirmed {
		background: var(--color-fg-primary, #ffffff);
		opacity: 1;
	}

	.status-pending {
		background: var(--color-fg-primary, #ffffff);
		opacity: 0.6;
	}

	.status-cancelled {
		background: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		opacity: 0.3;
		text-decoration: line-through;
	}

	/* Legend */
	.legend {
		display: flex;
		justify-content: center;
		gap: var(--space-lg, 1.5rem);
		padding: var(--space-md, 1rem);
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.legend-color {
		width: 1rem;
		height: 0.75rem;
		border-radius: 2px;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			gap: var(--space-md, 1rem);
		}

		.header-nav,
		.header-stats {
			text-align: center;
		}

		.timeline {
			min-width: 800px;
		}
	}

	/* Focus states */
	.nav-btn:focus-visible,
	.today-btn:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.nav-btn,
		.today-btn,
		.reservation-block {
			transition: none;
		}
	}
</style>
