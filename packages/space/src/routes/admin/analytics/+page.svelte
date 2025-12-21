<script lang="ts">
	/**
	 * Unified Analytics Dashboard
	 *
	 * Now powered by @create-something/tufte - agentic visualization components
	 * that embody Edward Tufte's principles automatically.
	 *
	 * Before: 641 lines with manual chart generation, custom card styling
	 * After: Uses shared tufte components for consistency with io dashboard
	 */

	import { onMount } from 'svelte';
	import { MetricCard, HighDensityTable, Sparkline, DailyGrid } from '@create-something/tufte';

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
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="page-title">Analytics</h1>
			<p class="page-description">Unified event tracking for createsomething.space</p>
		</div>
		<select bind:value={days} class="select-field px-4 py-2">
			<option value={7}>Last 7 days</option>
			<option value={14}>Last 14 days</option>
			<option value={30}>Last 30 days</option>
		</select>
	</div>

	{#if loading}
		<div class="text-center py-12 loading-text">Loading analytics...</div>
	{:else}
		<!-- Session Stats - Using Agentic MetricCard Components -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<MetricCard
				label="Sessions"
				value={data.sessionStats.total}
				context="{days} days"
			/>
			<MetricCard
				label="Avg Page Views"
				value={Number(data.sessionStats.avgPageViews?.toFixed(1)) || 0}
				context="per session"
			/>
			<MetricCard
				label="Avg Duration"
				value={Math.round((data.sessionStats.avgDuration ?? 0) / 60)}
				context="minutes per session"
			/>
		</div>

		<!-- Daily Trend - Using Agentic Sparkline and DailyGrid Components -->
		<div class="chart-card p-6">
			<div class="flex items-end justify-between mb-6">
				<div>
					<h3 class="chart-title">Daily Events</h3>
					<p class="chart-subtitle mt-1 font-mono">
						{#if getDailyTotals().length > 0}
							{getDailyTotals()[0]?.date} to {getDailyTotals()[getDailyTotals().length - 1]?.date}
						{:else}
							No data
						{/if}
					</p>
				</div>
				{#if getDailyTotals().length > 0}
					<div class="text-right">
						<div class="chart-value">
							{new Intl.NumberFormat().format(getDailyTotals()[getDailyTotals().length - 1]?.count || 0)}
						</div>
						<div class="chart-label">today</div>
					</div>
				{/if}
			</div>

			{#if getDailyTotals().length === 0}
				<p class="empty-state">No events recorded yet</p>
			{:else}
				<!-- Agentic Sparkline Component -->
				<div class="w-full h-24">
					<Sparkline
						data={getDailyTotals()}
						width={100}
						height={30}
						showFill={true}
						showReferenceLine={true}
					/>
				</div>

				<!-- Agentic DailyGrid Component -->
				<div class="mt-4">
					<DailyGrid data={getDailyTotals()} days={7} />
				</div>
			{/if}
		</div>

		<!-- Category & Actions - Using Agentic HighDensityTable Component -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="table-card p-4">
				<h3 class="table-title mb-3">By Category</h3>
				<HighDensityTable
					items={data.categoryBreakdown.map((c) => ({
						label: c.category.charAt(0).toUpperCase() + c.category.slice(1),
						count: c.count
					}))}
					limit={10}
					showPercentage={false}
					hideRankOnMobile={true}
					emptyMessage="No category data yet"
				/>
			</div>

			<div class="table-card p-4">
				<h3 class="table-title mb-3">Top Actions</h3>
				<HighDensityTable
					items={data.topActions.map((a) => ({
						label: a.action,
						count: a.count
					}))}
					limit={10}
					showPercentage={false}
					hideRankOnMobile={true}
					emptyMessage="No action data yet"
				/>
			</div>
		</div>

		<!-- Recent Events - Space-specific feature -->
		<div class="table-card p-4">
			<h3 class="table-title mb-3">Recent Events</h3>
			{#if data.recentEvents.length === 0}
				<p class="empty-state">No recent events</p>
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

		<!-- Info Footer -->
		<div class="info-footer pt-6">
			<p class="footer-text">
				Privacy-first analytics powered by D1. No cookies, no tracking scripts, no personal data
				collected. All data stored in your own database.
			</p>
			<p class="footer-note mt-2">
				Visualizations powered by <a href="https://createsomething.ltd/masters/edward-tufte" class="footer-link">@create-something/tufte</a>
				— agentic components embodying Tufte's principles
			</p>
		</div>
	{/if}
</div>

<style>
	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
	}

	.page-description {
		color: var(--color-fg-tertiary);
		margin-top: var(--space-xs);
	}

	.select-field {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.select-field:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.loading-text {
		color: var(--color-fg-tertiary);
	}

	.table-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.table-title {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.chart-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.chart-title {
		font-size: var(--text-h3);
		font-weight: 600;
	}

	.chart-subtitle {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.chart-value {
		font-size: var(--text-h2);
		font-weight: 700;
	}

	.chart-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.empty-state {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.info-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-note {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
	}

	.footer-link {
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-secondary);
	}

	/* Recent Events - Space-specific styles */
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
</style>
