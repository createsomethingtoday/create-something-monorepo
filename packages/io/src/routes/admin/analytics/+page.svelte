<script lang="ts">
	/**
	 * Analytics Dashboard
	 *
	 * Now powered by @create-something/tufte - agentic visualization components
	 * that embody Edward Tufte's principles automatically.
	 *
	 * Before: 289 lines with manual sparkline generation, formatting, etc.
	 * After: ~120 lines - components handle all visualization logic
	 */

	import { onMount } from 'svelte';
	import { MetricCard, HighDensityTable, Sparkline, DailyGrid } from '@create-something/tufte';

	let loading = true;
	let days = 30;
	let analytics: any = {
		total_views: 0,
		views_by_property: [],
		top_pages: [],
		top_experiments: [],
		top_countries: [],
		daily_views: [],
		top_referrers: [],
		unified: {
			categoryBreakdown: [],
			topActions: [],
			sessionStats: { total: 0, avgPageViews: 0, avgDuration: 0 },
			dailyAggregates: [],
		},
	};

	async function loadAnalytics() {
		loading = true;
		try {
			const response = await fetch(`/api/admin/analytics?days=${days}`);
			if (response.ok) {
				analytics = await response.json();
			}
		} catch (error) {
			console.error('Failed to load analytics:', error);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadAnalytics();
	});

	// Reload analytics when days changes
	$: if (days) {
		loadAnalytics();
	}

	// Get property stats with defaults for all properties
	function getPropertyStats() {
		const properties = ['agency', 'io', 'space', 'ltd'];
		return properties.map((prop) => {
			const found = analytics.views_by_property.find((p: any) => p.property === prop);
			return {
				property: prop,
				count: found?.count || 0
			};
		});
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="page-title mb-2">Analytics</h2>
			<p class="page-description">Privacy-first analytics across CREATE SOMETHING properties</p>
		</div>

		<select
			bind:value={days}
			class="select-field px-4 py-2"
		>
			<option value={7}>Last 7 days</option>
			<option value={30}>Last 30 days</option>
			<option value={90}>Last 90 days</option>
		</select>
	</div>

	{#if loading}
		<div class="text-center py-12 loading-text">Loading analytics...</div>
	{:else}
		<!-- Overview Stats - Using Agentic MetricCard Components -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
			<MetricCard
				label="Total Views"
				value={analytics.total_views}
				trend={analytics.daily_views}
				context="{days} days"
			/>

			{#each getPropertyStats() as prop}
				<MetricCard
					label=".{prop.property}"
					value={prop.count}
					context={prop.count > 0 ? `${Math.round((prop.count / analytics.total_views) * 100)}% of total` : 'no data'}
					percentage={Math.round((prop.count / analytics.total_views) * 100)}
				/>
			{/each}
		</div>

		<!-- High Density Tables - Using Agentic HighDensityTable Component -->
		<div class="grid grid-cols-2 gap-4">
			<!-- Top Pages -->
			<div class="table-card p-4">
				<h3 class="table-title mb-3">Top Pages</h3>
				<HighDensityTable
					items={analytics.top_pages}
					limit={10}
					labelKey="path"
					countKey="count"
					badgeKey="property"
					totalForPercentage={analytics.total_views}
					emptyMessage="No data yet"
				/>
			</div>

			<!-- Top Experiments -->
			<div class="table-card p-4">
				<h3 class="table-title mb-3">Top Experiments</h3>
				<HighDensityTable
					items={analytics.top_experiments.map((exp: any) => ({
						label: exp.title || exp.experiment_id,
						count: exp.count
					}))}
					limit={10}
					showPercentage={false}
					emptyMessage="No experiment views yet"
				/>
			</div>

			<!-- Top Countries -->
			<div class="table-card p-4">
				<h3 class="table-title mb-3">Top Countries</h3>
				<HighDensityTable
					items={analytics.top_countries.map((c: any) => ({
						label: c.country,
						count: c.count
					}))}
					limit={10}
					totalForPercentage={analytics.total_views}
					emptyMessage="No country data yet"
				/>
			</div>

			<!-- Top Referrers -->
			<div class="table-card p-4">
				<h3 class="table-title mb-3">Top Referrers</h3>
				<HighDensityTable
					items={analytics.top_referrers.map((ref: any) => ({
						label: ref.referrer,
						count: ref.count
					}))}
					limit={10}
					totalForPercentage={analytics.total_views}
					emptyMessage="No referrer data yet"
				/>
			</div>
		</div>

		<!-- Unified Behavioral Analytics -->
		{#if analytics.unified}
			<div class="section-header mt-8 mb-4">
				<h3 class="section-title">Behavioral Analytics</h3>
				<p class="section-subtitle">Session-based tracking from unified events</p>
			</div>

			<!-- Session Stats -->
			<div class="grid grid-cols-3 gap-4 mb-4">
				<MetricCard
					label="Sessions"
					value={analytics.unified.sessionStats.total}
					context="{days} days"
				/>
				<MetricCard
					label="Avg Page Views"
					value={analytics.unified.sessionStats.avgPageViews?.toFixed(1) || '0'}
					context="per session"
				/>
				<MetricCard
					label="Avg Duration"
					value={`${Math.round((analytics.unified.sessionStats.avgDuration ?? 0) / 60) || 0}m`}
					context="per session"
				/>
			</div>

			<!-- Category & Actions -->
			<div class="grid grid-cols-2 gap-4">
				<div class="table-card p-4">
					<h3 class="table-title mb-3">By Category</h3>
					<HighDensityTable
						items={analytics.unified.categoryBreakdown.map((c: any) => ({
							label: c.category.charAt(0).toUpperCase() + c.category.slice(1),
							count: c.count
						}))}
						limit={10}
						showPercentage={false}
						emptyMessage="No category data yet"
					/>
				</div>

				<div class="table-card p-4">
					<h3 class="table-title mb-3">Top Actions</h3>
					<HighDensityTable
						items={analytics.unified.topActions.map((a: any) => ({
							label: a.action,
							count: a.count
						}))}
						limit={10}
						showPercentage={false}
						emptyMessage="No action data yet"
					/>
				</div>
			</div>
		{/if}

		<!-- Daily Trend - Using Agentic Sparkline and DailyGrid Components -->
		<div class="chart-card p-6 mt-4">
			<div class="flex items-end justify-between mb-6">
				<div>
					<h3 class="chart-title">Daily Page Views</h3>
					<p class="chart-subtitle mt-1 font-mono">
						{analytics.daily_views.length > 0 ?
							`${analytics.daily_views[0]?.date} to ${analytics.daily_views[analytics.daily_views.length - 1]?.date}`
							: 'No data'}
					</p>
				</div>
				{#if analytics.daily_views.length > 0}
					<div class="text-right">
						<div class="chart-value">
							{new Intl.NumberFormat().format(analytics.daily_views[analytics.daily_views.length - 1]?.count || 0)}
						</div>
						<div class="chart-label">today</div>
					</div>
				{/if}
			</div>

			{#if analytics.daily_views.length === 0}
				<p class="empty-state">No daily data yet</p>
			{:else}
				<!-- Agentic Sparkline Component (replaces manual SVG generation) -->
				<div class="w-full h-24">
					<Sparkline
						data={analytics.daily_views}
						width={100}
						height={30}
						showFill={true}
						showReferenceLine={true}
					/>
				</div>

				<!-- Agentic DailyGrid Component (replaces manual grid generation) -->
				<div class="mt-4">
					<DailyGrid data={analytics.daily_views} days={7} />
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
	}

	.section-header {
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-md);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 600;
	}

	.section-subtitle {
		font-size: var(--text-body-sm);
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
</style>
