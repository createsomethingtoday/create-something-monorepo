<script lang="ts">
	/**
	 * Admin Dashboard - The Stack Demo
	 *
	 * Heideggerian: Interface recedes, data remains.
	 * Canon: Monochrome first, typography as structure.
	 */

	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();
	let seeding = $state(false);
	let seedMessage = $state<string | null>(null);

	async function seedDemoData() {
		seeding = true;
		seedMessage = null;

		try {
			const response = await fetch('/api/admin/seed?members=25&days=14&future=7', {
				method: 'POST'
			});

			const result = await response.json();

			if (result.success) {
				seedMessage = `Created ${result.results.membersCreated} members, ${result.results.reservationsCreated} bookings`;
				// Refresh the page data
				await invalidateAll();
			} else {
				seedMessage = `Error: ${result.message || 'Seeding failed'}`;
			}
		} catch (err) {
			seedMessage = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			seeding = false;
		}
	}

	function formatCurrency(cents: number): string {
		return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 });
	}

	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function formatDate(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	function getStatusClass(status: string): string {
		switch (status) {
			case 'confirmed':
			case 'completed':
				return 'status-success';
			case 'pending':
				return 'status-pending';
			case 'cancelled':
			case 'no_show':
				return 'status-error';
			default:
				return '';
		}
	}

	function getSourceIcon(source: string): string {
		switch (source) {
			case 'web':
				return 'W';
			case 'sms':
				return 'S';
			case 'api':
				return 'A';
			case 'waitlist':
				return 'Q';
			default:
				return '?';
		}
	}
</script>

<svelte:head>
	<title>Admin - CLEARWAY</title>
</svelte:head>

<div class="admin">
	<!-- Header -->
	<header class="header">
		<div class="header-content">
			<div class="header-title">
				<h1>The Stack Dashboard</h1>
				<span class="live-indicator">Demo Instance</span>
			</div>
			<div class="header-actions">
				{#if seedMessage}
					<span class="seed-message">{seedMessage}</span>
				{/if}
				<button
					class="seed-button"
					onclick={seedDemoData}
					disabled={seeding}
				>
					{seeding ? 'Generating...' : 'Seed Demo Data'}
				</button>
			</div>
		</div>
	</header>

	<!-- Stats Grid -->
	<section class="stats-grid">
		<div class="stat-card">
			<span class="stat-label">Today</span>
			<span class="stat-value">{data.stats.today.reservations}</span>
			<span class="stat-detail">bookings</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">Today Revenue</span>
			<span class="stat-value">{formatCurrency(data.stats.today.revenue)}</span>
			<span class="stat-detail">{data.stats.today.utilization}% util</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">This Week</span>
			<span class="stat-value">{data.stats.week.reservations}</span>
			<span class="stat-detail">bookings</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">Week Revenue</span>
			<span class="stat-value">{formatCurrency(data.stats.week.revenue)}</span>
			<span class="stat-detail">{data.stats.week.utilization}% util</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">This Month</span>
			<span class="stat-value">{data.stats.month.reservations}</span>
			<span class="stat-detail">bookings</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">Month Revenue</span>
			<span class="stat-value">{formatCurrency(data.stats.month.revenue)}</span>
			<span class="stat-detail">total</span>
		</div>
	</section>

	<!-- Court Utilization -->
	<section class="section">
		<h2>Court Utilization</h2>
		<div class="court-grid">
			{#each data.courtUtilization as court}
				<div class="court-card">
					<span class="court-name">{court.name}</span>
					<div class="court-stats">
						<span class="court-today">{court.bookings_today} today</span>
						<span class="court-week">{court.bookings_week} week</span>
						<span class="court-revenue">{formatCurrency(court.revenue_week || 0)}</span>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Recent Reservations -->
	<section class="section">
		<h2>Recent Reservations</h2>
		{#if data.recentReservations.length === 0}
			<p class="empty">No reservations yet. Demo bookings will appear here.</p>
		{:else}
			<div class="table-wrapper">
				<table class="table">
					<thead>
						<tr>
							<th>Court</th>
							<th>Member</th>
							<th>Time</th>
							<th>Status</th>
							<th>Source</th>
							<th>Amount</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentReservations as r}
							<tr>
								<td class="court">{r.court_name}</td>
								<td class="member">
									<span class="member-name">{r.member_name}</span>
									<span class="member-email">{r.member_email}</span>
								</td>
								<td class="time">
									<span class="time-date">{formatDate(r.start_time)}</span>
									<span class="time-slot">{formatTime(r.start_time)}</span>
								</td>
								<td>
									<span class="status {getStatusClass(r.status)}">{r.status}</span>
								</td>
								<td>
									<span class="source" title={r.booking_source}>{getSourceIcon(r.booking_source)}</span>
								</td>
								<td class="amount">{r.rate_cents ? formatCurrency(r.rate_cents) : '-'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Top Members -->
	<section class="section">
		<h2>Top Members</h2>
		{#if data.topMembers.length === 0}
			<p class="empty">No members yet.</p>
		{:else}
			<div class="members-list">
				{#each data.topMembers as member, i}
					<div class="member-row">
						<span class="rank">{i + 1}</span>
						<div class="member-info">
							<span class="member-name">{member.name}</span>
							<span class="member-email">{member.email}</span>
						</div>
						<span class="member-type">{member.membership_type}</span>
						<span class="member-bookings">{member.total_bookings} bookings</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	/* Canon Design System - Monochrome Admin */
	.admin {
		min-height: 100vh;
		background: var(--color-bg-pure, #000000);
		color: var(--color-fg-primary, #ffffff);
		font-family: var(--font-sans, 'Stack Sans Notch', system-ui, sans-serif);
	}

	/* Header */
	.header {
		padding: var(--space-lg, 1.5rem) var(--space-xl, 2rem);
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-lg, 1.5rem);
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: var(--space-md, 1rem);
	}

	h1 {
		font-size: var(--text-h2, 1.5rem);
		font-weight: 600;
		margin: 0;
	}

	.live-indicator {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		padding: 0.25rem 0.75rem;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-sm, 6px);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-md, 1rem);
	}

	.seed-message {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.seed-button {
		padding: 0.5rem 1rem;
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 500;
		background: var(--color-bg-subtle, #1a1a1a);
		color: var(--color-fg-primary, #ffffff);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
		transition: all var(--duration-micro, 200ms) var(--ease-standard);
	}

	.seed-button:hover:not(:disabled) {
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.seed-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 1px;
		background: var(--color-border-default, rgba(255, 255, 255, 0.1));
		margin: var(--space-lg, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		overflow: hidden;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-lg, 1.5rem);
		background: var(--color-bg-pure, #000000);
	}

	.stat-label {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: var(--text-h1, 2rem);
		font-weight: 700;
		margin: 0.25rem 0;
	}

	.stat-detail {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	/* Sections */
	.section {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-lg, 1.5rem) var(--space-xl, 2rem);
	}

	h2 {
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		margin: 0 0 var(--space-md, 1rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	/* Court Grid */
	.court-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-sm, 0.5rem);
	}

	.court-card {
		padding: var(--space-md, 1rem);
		background: var(--color-bg-subtle, #1a1a1a);
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.court-name {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.court-stats {
		display: flex;
		gap: var(--space-sm, 0.5rem);
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.court-revenue {
		margin-left: auto;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	/* Table */
	.table-wrapper {
		overflow-x: auto;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
	}

	.table th {
		text-align: left;
		padding: 0.75rem;
		font-size: var(--text-caption, 0.75rem);
		font-weight: 500;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.table td {
		padding: 0.75rem;
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		vertical-align: middle;
	}

	.table tbody tr:hover {
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
	}

	.court {
		font-weight: 500;
	}

	.member {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.member-name {
		font-weight: 500;
	}

	.member-email {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.time {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.time-date {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.time-slot {
		font-weight: 500;
	}

	.status {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		font-size: var(--text-caption, 0.75rem);
		border-radius: var(--radius-sm, 6px);
		text-transform: capitalize;
	}

	.status-success {
		background: var(--color-success-muted, rgba(68, 170, 68, 0.2));
		color: var(--color-success, #44aa44);
	}

	.status-pending {
		background: var(--color-warning-muted, rgba(170, 136, 68, 0.2));
		color: var(--color-warning, #aa8844);
	}

	.status-error {
		background: var(--color-error-muted, rgba(212, 77, 77, 0.2));
		color: var(--color-error, #d44d4d);
	}

	.source {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		font-size: var(--text-caption, 0.75rem);
		font-weight: 600;
		background: var(--color-bg-subtle, #1a1a1a);
		border-radius: var(--radius-sm, 6px);
	}

	.amount {
		font-family: var(--font-mono, 'JetBrains Mono', monospace);
		text-align: right;
	}

	/* Members List */
	.members-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.member-row {
		display: flex;
		align-items: center;
		gap: var(--space-md, 1rem);
		padding: var(--space-sm, 0.75rem);
		background: var(--color-bg-subtle, #1a1a1a);
		border-radius: var(--radius-md, 8px);
	}

	.rank {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface, #111111);
		border-radius: var(--radius-sm, 6px);
		font-size: var(--text-caption, 0.75rem);
		font-weight: 600;
	}

	.member-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.member-type {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		text-transform: capitalize;
	}

	.member-bookings {
		font-family: var(--font-mono, 'JetBrains Mono', monospace);
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.empty {
		text-align: center;
		padding: var(--space-xl, 2rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(3, 1fr);
		}

		.court-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.court-grid {
			grid-template-columns: 1fr;
		}

		.section {
			padding: var(--space-md, 1rem);
		}
	}
</style>
