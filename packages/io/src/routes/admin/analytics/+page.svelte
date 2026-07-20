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

	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';
	import { MetricCard, HighDensityTable, Sparkline, DailyGrid, FlowGrid } from '@create-something/tufte';
	import { fetchAdminJson, type AdminRequestError } from '$lib/admin/client';
	import {
		createEmptyAnalyticsDashboard,
		getAnalyticsPropertyStats,
		normalizeAnalyticsDays,
		settleAnalyticsRequest,
		type AnalyticsDashboardData,
		type AnalyticsDays
	} from '$lib/admin/analytics-dashboard';

	let loading = true;
	let days: AnalyticsDays = 30;
	let analytics: AnalyticsDashboardData = createEmptyAnalyticsDashboard();
	let requestError: AdminRequestError | null = null;
	let requestSequence = 0;

	async function loadAnalytics() {
		const sequence = ++requestSequence;
		loading = true;
		requestError = null;

		const state = settleAnalyticsRequest(
			await fetchAdminJson<AnalyticsDashboardData>(`/api/admin/analytics?days=${days}`)
		);

		if (sequence !== requestSequence) return;

		if (state.status === 'ready') {
			analytics = state.analytics;
		} else {
			requestError = state.error;
		}

		loading = false;
	}

	function changeAnalyticsRange(event: Event) {
		days = normalizeAnalyticsDays((event.currentTarget as HTMLSelectElement).value);
		void loadAnalytics();
	}

	onMount(() => {
		loadAnalytics();
	});

</script>

<SEO
	title="Admin - Analytics"
	description="Administrative dashboard"
	propertyName="io"
	noindex={true}
/>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="page-title mb-2">Analytics</h1>
			<p class="page-description">
				Check where people arrived, what they viewed, and what they did. Data: first-party IO events.
			</p>
		</div>

		<select
			value={days}
			onchange={changeAnalyticsRange}
			class="select-field px-4 py-2"
		>
			<option value={7}>Last 7 days</option>
			<option value={30}>Last 30 days</option>
			<option value={90}>Last 90 days</option>
		</select>
	</div>

	{#if loading}
		<div class="text-center py-12 loading-text">Loading analytics...</div>
	{:else if requestError}
		<div class="table-card p-6" role="alert">
			<h3 class="table-title mb-2">Analytics unavailable</h3>
			<p class="footer-text">
				{requestError.kind === 'unauthorized'
					? 'Your admin session has expired. Sign in again, then reload this page.'
					: requestError.kind === 'forbidden'
						? 'Your account does not have permission to view analytics.'
						: 'The analytics service could not be reached. Existing data has not been replaced with zeros.'}
			</p>
			{#if requestError.kind !== 'forbidden'}
				<button class="select-field mt-4 px-4 py-2" type="button" onclick={loadAnalytics}>Retry</button>
			{/if}
		</div>
	{:else}
		<!-- Overview Stats - Using Agentic MetricCard Components -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
			<MetricCard
				label="Total Views"
				value={analytics.total_views}
				trend={analytics.daily_views}
				context="{days} days"
			/>

			{#each getAnalyticsPropertyStats(analytics) as prop}
				<MetricCard
					label=".{prop.property}"
					value={prop.count}
					context={prop.count > 0 ? `${prop.percentage}% of total` : 'no data'}
					percentage={prop.percentage}
				/>
			{/each}
		</div>

		<!-- High Density Tables - Using Agentic HighDensityTable Component -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
					hideRankOnMobile={true}
					emptyMessage="No data yet"
				/>
			</div>

			<!-- Top Experiments -->
			<div class="table-card p-4">
				<h3 class="table-title mb-3">Top Experiments</h3>
				<HighDensityTable
					items={analytics.top_experiments.map((exp) => ({
						label: exp.title || exp.experiment_id,
						count: exp.count
					}))}
					limit={10}
					showPercentage={false}
					hideRankOnMobile={true}
					emptyMessage="No experiment views yet"
				/>
			</div>

			<!-- Top Countries -->
			<div class="table-card p-4">
				<h3 class="table-title mb-3">Top Countries</h3>
				<HighDensityTable
					items={analytics.top_countries.map((c) => ({
						label: c.country,
						count: c.count
					}))}
					limit={10}
					totalForPercentage={analytics.total_views}
					hideRankOnMobile={true}
					emptyMessage="No country data yet"
				/>
			</div>

			<!-- Top Referrers -->
			<div class="table-card p-4">
				<h3 class="table-title mb-3">Top Referrers</h3>
				<HighDensityTable
					items={analytics.top_referrers.map((ref) => ({
						label: ref.referrer,
						count: ref.count
					}))}
					limit={10}
					totalForPercentage={analytics.total_views}
					hideRankOnMobile={true}
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
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
				<MetricCard
					label="Sessions"
					value={analytics.unified.sessionStats.total}
					context="{days} days"
				/>
				<MetricCard
					label="Avg Page Views"
					value={Math.round((analytics.unified.sessionStats.avgPageViews ?? 0) * 10) / 10}
					context="per session"
				/>
				<MetricCard
					label="Avg Duration"
					value={Math.round((analytics.unified.sessionStats.avgDuration ?? 0) / 60) || 0}
					context="minutes per session"
				/>
			</div>

			<!-- Category & Actions -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="table-card p-4">
					<h3 class="table-title mb-3">By Category</h3>
					<HighDensityTable
						items={analytics.unified.categoryBreakdown.map((c) => ({
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
						items={analytics.unified.topActions.map((a) => ({
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
		{/if}

		<!-- Cross-Property Flow (Anti-Concierge Wayfinding) -->
		{#if analytics.unified?.propertyTransitions?.length > 0}
			<div class="section-header mt-8 mb-4">
				<h3 class="section-title">Cross-Property Flow</h3>
				<p class="section-subtitle">User journeys between CREATE SOMETHING properties</p>
			</div>

			<div class="table-card p-4">
				<FlowGrid
					items={analytics.unified.propertyTransitions}
					labelPrefix="."
					emptyMessage="No cross-property navigation yet"
				/>
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
				First-party analytics powered by D1. No third-party analytics cookies or advertising pixels.
				We record session activity, page URLs, referrers, country-level location, and authenticated
				user IDs when available. See the <a href="/privacy" class="footer-link">privacy policy</a>.
			</p>
			<p class="footer-note mt-2">
				Visualizations powered by <a href="https://createsomething.ltd/masters/edward-tufte" class="footer-link">@create-something/tufte</a>
				— agentic components embodying Tufte's principles
			</p>
		</div>
	{/if}
</div>

<!--
  Styles for this dashboard are now shared via @create-something/canon/styles/components.css
  Classes used: page-title, page-description, section-header, section-title, section-subtitle,
                select-field, loading-text, table-card, table-title, chart-card, chart-title,
                chart-subtitle, chart-value, chart-label, empty-state, info-footer, footer-text,
                footer-note, footer-link
-->
