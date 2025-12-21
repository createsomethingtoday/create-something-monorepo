<script lang="ts">
	/**
	 * Unified Analytics Dashboard
	 *
	 * Visualizes data from the unified_events, unified_events_daily,
	 * and unified_sessions tables.
	 */

	import { onMount } from 'svelte';

	let loading = $state(true);
	let days = $state(7);
	let expandedUrls = $state<Set<string>>(new Set());

	/**
	 * Format timestamp as relative time (e.g., "2m ago", "1h ago")
	 */
	function formatRelativeTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	/**
	 * Toggle URL expansion for a specific event
	 */
	function toggleUrl(eventId: string): void {
		const newSet = new Set(expandedUrls);
		if (newSet.has(eventId)) {
			newSet.delete(eventId);
		} else {
			newSet.add(eventId);
		}
		expandedUrls = newSet;
	}

	let data = $state<{
		dailyAggregates: Array<{
			date: string;
			category: string;
			action: string;
			count: number;
			uniqueSessions: number;
		}>;
		recentEvents: Array<{
			id: string;
			category: string;
			action: string;
			target: string;
			url: string;
			created_at: string;
		}>;
		categoryBreakdown: Array<{ category: string; count: number }>;
		topActions: Array<{ action: string; count: number }>;
		sessionStats: {
			total: number;
			avgPageViews: number;
			avgDuration: number;
		};
	}>({
		dailyAggregates: [],
		recentEvents: [],
		categoryBreakdown: [],
		topActions: [],
		sessionStats: { total: 0, avgPageViews: 0, avgDuration: 0 },
	});

	async function loadAnalytics() {
		loading = true;
		try {
			const res = await fetch(`/api/admin/analytics?days=${days}`);
			if (res.ok) {
				data = await res.json();
			}
		} catch (e) {
			console.error('Failed to load analytics:', e);
		} finally {
			loading = false;
		}
	}

	onMount(loadAnalytics);

	// Reload when days changes
	$effect(() => {
		if (days) loadAnalytics();
	});

	// Group daily aggregates by date for chart
	function getDailyTotals() {
		const byDate = new Map<string, number>();
		for (const agg of data.dailyAggregates) {
			byDate.set(agg.date, (byDate.get(agg.date) || 0) + agg.count);
		}
		return Array.from(byDate.entries())
			.map(([date, count]) => ({ date, count }))
			.sort((a, b) => a.date.localeCompare(b.date));
	}

	// Calculate max for bar scaling
	function getMaxCount(items: Array<{ count: number }>) {
		return Math.max(...items.map((i) => i.count), 1);
	}

	// Format category name
	function formatCategory(cat: string) {
		return cat.charAt(0).toUpperCase() + cat.slice(1);
	}
</script>

<div class="analytics">
	<div class="header">
		<div>
			<h1 class="page-title">Analytics</h1>
			<p class="page-description">Unified event tracking for createsomething.space</p>
		</div>
		<select bind:value={days} class="select-field">
			<option value={7}>Last 7 days</option>
			<option value={14}>Last 14 days</option>
			<option value={30}>Last 30 days</option>
		</select>
	</div>

	{#if loading}
		<p class="loading">Loading analytics...</p>
	{:else}
		<!-- Session Stats -->
		<div class="stats-row">
			<div class="stat-card">
				<div class="stat-value">{data.sessionStats.total.toLocaleString()}</div>
				<div class="stat-label">Sessions</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{data.sessionStats.avgPageViews.toFixed(1)}</div>
				<div class="stat-label">Avg Page Views</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{Math.round((data.sessionStats.avgDuration ?? 0) / 60)}m</div>
				<div class="stat-label">Avg Duration</div>
			</div>
		</div>

		<!-- Daily Trend -->
		<div class="card">
			<h2 class="card-title">Daily Events</h2>
			{#if getDailyTotals().length === 0}
				<p class="empty">No events recorded yet</p>
			{:else}
				<div class="daily-chart">
					{#each getDailyTotals() as day}
						{@const max = getMaxCount(getDailyTotals())}
						<div class="chart-bar-container">
							<div
								class="chart-bar"
								style="height: {(day.count / max) * 100}%"
								title="{day.date}: {day.count} events"
							></div>
							<span class="chart-label">{day.date.slice(5)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Category & Actions Grid -->
		<div class="two-col">
			<!-- Category Breakdown -->
			<div class="card">
				<h2 class="card-title">By Category</h2>
				{#if data.categoryBreakdown.length === 0}
					<p class="empty">No category data</p>
				{:else}
					<div class="breakdown-list">
						{#each data.categoryBreakdown as cat}
							{@const max = getMaxCount(data.categoryBreakdown)}
							<div class="breakdown-item">
								<div class="breakdown-header">
									<span class="breakdown-label">{formatCategory(cat.category)}</span>
									<span class="breakdown-count">{cat.count.toLocaleString()}</span>
								</div>
								<div class="breakdown-bar-bg">
									<div
										class="breakdown-bar"
										style="width: {(cat.count / max) * 100}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Top Actions -->
			<div class="card">
				<h2 class="card-title">Top Actions</h2>
				{#if data.topActions.length === 0}
					<p class="empty">No actions recorded</p>
				{:else}
					<div class="action-list">
						{#each data.topActions.slice(0, 10) as action, i}
							<div class="action-item">
								<span class="action-rank">{i + 1}</span>
								<span class="action-name">{action.action}</span>
								<span class="action-count">{action.count.toLocaleString()}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Recent Events -->
		<div class="card">
			<h2 class="card-title">Recent Events</h2>
			{#if data.recentEvents.length === 0}
				<p class="empty">No recent events</p>
			{:else}
				<!-- Mobile Card Layout -->
				<div class="responsive-table-cards">
					{#each data.recentEvents.slice(0, 20) as event}
						<div class="event-card">
							<div class="event-card-header">
								<span class="category-badge">{event.category}</span>
								<span class="event-time">{formatRelativeTime(event.created_at)}</span>
							</div>
							<div class="event-card-body">
								<div class="event-card-row">
									<span class="event-card-label">Action</span>
									<span class="event-card-action">{event.action}</span>
								</div>
								{#if event.target}
									<div class="event-card-row">
										<span class="event-card-label">Target</span>
										<span class="event-card-value">{event.target}</span>
									</div>
								{/if}
								{#if event.url}
									<button
										class="event-url-button"
										onclick={() => toggleUrl(event.id)}
									>
										<span class="event-card-label">URL</span>
										<span class="event-url-value" class:expanded={expandedUrls.has(event.id)}>
											{event.url}
										</span>
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<!-- Desktop Table Layout -->
				<div class="responsive-table-wrapper">
					<div class="events-table">
						<div class="table-header">
							<span>Category</span>
							<span>Action</span>
							<span>Target</span>
							<span>URL</span>
							<span>Time</span>
						</div>
						{#each data.recentEvents.slice(0, 20) as event}
							<div class="table-row">
								<span class="category-badge">{event.category}</span>
								<span class="action-text">{event.action}</span>
								<span class="target-text">{event.target || '—'}</span>
								<span class="url-text" title={event.url}>{event.url?.slice(0, 30) || '—'}</span>
								<span class="time-text">{new Date(event.created_at).toLocaleTimeString()}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.analytics {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
		margin: 0;
	}

	.page-description {
		color: var(--color-fg-tertiary);
		margin: var(--space-xs) 0 0 0;
	}

	.select-field {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
	}

	.loading {
		color: var(--color-fg-tertiary);
	}

	.stats-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
	}

	.stat-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		text-align: center;
	}

	.stat-value {
		font-size: var(--text-h2);
		font-weight: 700;
	}

	.stat-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-xs);
	}

	.card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.card-title {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 var(--space-sm) 0;
	}

	.empty {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.daily-chart {
		display: flex;
		align-items: flex-end;
		gap: 4px;
		height: 120px;
	}

	.chart-bar-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
	}

	.chart-bar {
		width: 100%;
		background: var(--color-data-1);
		border-radius: 2px 2px 0 0;
		min-height: 2px;
		transition: height var(--duration-standard) var(--ease-standard);
	}

	.chart-label {
		font-size: 10px;
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	.two-col {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	.breakdown-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.breakdown-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.breakdown-header {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-body-sm);
	}

	.breakdown-label {
		color: var(--color-fg-secondary);
	}

	.breakdown-count {
		color: var(--color-fg-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.breakdown-bar-bg {
		height: 4px;
		background: var(--color-bg-subtle);
		border-radius: 2px;
		overflow: hidden;
	}

	.breakdown-bar {
		height: 100%;
		background: var(--color-data-2);
		border-radius: 2px;
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.action-list {
		display: flex;
		flex-direction: column;
	}

	.action-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
		font-size: var(--text-body-sm);
	}

	.action-item:last-child {
		border-bottom: none;
	}

	.action-rank {
		width: 20px;
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	.action-name {
		flex: 1;
		color: var(--color-fg-secondary);
		font-family: var(--font-mono);
	}

	.action-count {
		color: var(--color-fg-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.events-table {
		display: flex;
		flex-direction: column;
		font-size: var(--text-body-sm);
	}

	.table-header {
		display: grid;
		grid-template-columns: 100px 150px 150px 1fr 80px;
		gap: var(--space-sm);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-emphasis);
		color: var(--color-fg-muted);
		font-weight: 600;
	}

	.table-row {
		display: grid;
		grid-template-columns: 100px 150px 150px 1fr 80px;
		gap: var(--space-sm);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.category-badge {
		background: var(--color-bg-subtle);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.action-text {
		font-family: var(--font-mono);
		color: var(--color-fg-secondary);
	}

	.target-text,
	.url-text {
		color: var(--color-fg-tertiary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.time-text {
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	/* Responsive table pattern */
	.responsive-table-cards {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.responsive-table-wrapper {
		display: none;
	}

	@media (min-width: 768px) {
		.responsive-table-cards {
			display: none;
		}

		.responsive-table-wrapper {
			display: block;
		}
	}

	/* Event card styles (mobile) */
	.event-card {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.event-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.event-time {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.event-card-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.event-card-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.event-card-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.event-card-action {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-family: var(--font-mono);
	}

	.event-card-value {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* URL button for tap to expand */
	.event-url-button {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		width: 100%;
		padding: var(--space-xs) 0;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.event-url-value {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 60%;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.event-url-value.expanded {
		white-space: normal;
		word-break: break-all;
		max-width: 100%;
	}

	@media (max-width: 768px) {
		.two-col {
			grid-template-columns: 1fr;
		}

		.stats-row {
			grid-template-columns: 1fr;
		}
	}
</style>
