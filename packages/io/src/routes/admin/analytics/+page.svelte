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
		top_referrers: []
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
			<h2 class="text-3xl font-bold mb-2">Analytics</h2>
			<p class="text-white/60">Privacy-first analytics across CREATE SOMETHING properties</p>
		</div>

		<select
			bind:value={days}
			class="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
		>
			<option value={7}>Last 7 days</option>
			<option value={30}>Last 30 days</option>
			<option value={90}>Last 90 days</option>
		</select>
	</div>

	{#if loading}
		<div class="text-center py-12 text-white/60">Loading analytics...</div>
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
			<div class="bg-white/5 border border-white/10 rounded-lg p-4">
				<h3 class="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wide">Top Pages</h3>
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
			<div class="bg-white/5 border border-white/10 rounded-lg p-4">
				<h3 class="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wide">Top Experiments</h3>
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
			<div class="bg-white/5 border border-white/10 rounded-lg p-4">
				<h3 class="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wide">Top Countries</h3>
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
			<div class="bg-white/5 border border-white/10 rounded-lg p-4">
				<h3 class="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wide">Top Referrers</h3>
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

		<!-- Daily Trend - Using Agentic Sparkline and DailyGrid Components -->
		<div class="bg-white/5 border border-white/10 rounded-lg p-6">
			<div class="flex items-end justify-between mb-6">
				<div>
					<h3 class="text-xl font-semibold">Daily Page Views</h3>
					<p class="text-xs text-white/40 mt-1 font-mono">
						{analytics.daily_views.length > 0 ?
							`${analytics.daily_views[0]?.date} to ${analytics.daily_views[analytics.daily_views.length - 1]?.date}`
							: 'No data'}
					</p>
				</div>
				{#if analytics.daily_views.length > 0}
					<div class="text-right">
						<div class="text-2xl font-bold">
							{new Intl.NumberFormat().format(analytics.daily_views[analytics.daily_views.length - 1]?.count || 0)}
						</div>
						<div class="text-xs text-white/40">today</div>
					</div>
				{/if}
			</div>

			{#if analytics.daily_views.length === 0}
				<p class="text-white/40 text-sm">No daily data yet</p>
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
		<div class="border-t border-white/10 pt-6">
			<p class="text-sm text-white/40">
				Privacy-first analytics powered by D1. No cookies, no tracking scripts, no personal data
				collected. All data stored in your own database.
			</p>
			<p class="text-xs text-white/30 mt-2">
				Visualizations powered by <a href="https://createsomething.ltd/masters/edward-tufte" class="underline hover:text-white/50">@create-something/tufte</a>
				— agentic components embodying Tufte's principles
			</p>
		</div>
	{/if}
</div>
