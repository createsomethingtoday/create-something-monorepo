<script lang="ts">
	import { onMount } from 'svelte';

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

	function formatNumber(num: number): string {
		return new Intl.NumberFormat().format(num);
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

	// Calculate percentage change (Tufte: show data variation)
	function getPercentage(value: number, total: number): number {
		return total > 0 ? Math.round((value / total) * 100) : 0;
	}

	// Generate sparkline path (Tufte: maximize data-ink ratio with compact trends)
	function generateSparkline(data: any[], width: number = 100, height: number = 20): string {
		if (data.length === 0) return '';

		const values = data.map(d => d.count);
		const max = Math.max(...values, 1);
		const min = Math.min(...values, 0);
		const range = max - min || 1;

		const points = values.map((value, i) => {
			const x = (i / (values.length - 1 || 1)) * width;
			const y = height - ((value - min) / range) * height;
			return `${x},${y}`;
		});

		return `M ${points.join(' L ')}`;
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
		<!-- Overview Stats (Tufte: numbers + inline context) -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
			<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
				<div class="flex items-baseline justify-between mb-2">
					<div class="text-sm text-white/60">Total Views</div>
					{#if analytics.daily_views.length > 0}
						<svg viewBox="0 0 40 12" class="w-12 h-4" preserveAspectRatio="none">
							<path
								d={generateSparkline(analytics.daily_views, 40, 12)}
								fill="none"
								stroke="white"
								stroke-opacity="0.3"
								stroke-width="1.5"
								vector-effect="non-scaling-stroke"
							/>
						</svg>
					{/if}
				</div>
				<div class="text-3xl font-bold tabular-nums">{formatNumber(analytics.total_views)}</div>
				<div class="text-xs text-white/40 mt-1 font-mono">{days} days</div>
			</div>

			{#each getPropertyStats() as prop}
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<div class="flex items-baseline justify-between mb-2">
						<div class="text-sm text-white/60">.{prop.property}</div>
						<div class="text-xs text-white/40 font-mono">
							{getPercentage(prop.count, analytics.total_views)}%
						</div>
					</div>
					<div class="text-3xl font-bold tabular-nums">{formatNumber(prop.count)}</div>
					<div class="text-xs text-white/40 mt-1">
						{prop.count > 0 ? `${getPercentage(prop.count, analytics.total_views)}% of total` : 'no data'}
					</div>
				</div>
			{/each}
		</div>

		<!--
			Tufte Principle: High data density tables
			- Remove excessive spacing and decoration
			- Show proportions alongside absolute values
			- Use subtle visual cues instead of heavy borders
		-->
		<div class="grid grid-cols-2 gap-4">
			<!-- Top Pages -->
			<div class="bg-white/5 border border-white/10 rounded-lg p-4">
				<h3 class="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wide">Top Pages</h3>
				<div class="space-y-1">
					{#if analytics.top_pages.length === 0}
						<p class="text-white/40 text-xs">No data yet</p>
					{/if}
					{#each analytics.top_pages.slice(0, 10) as page, i}
						<div class="flex items-center gap-2 text-xs font-mono py-1.5 border-b border-white/5 last:border-0">
							<span class="text-white/30 w-4 text-right">{i + 1}</span>
							<span class="text-white/40 px-1.5 py-0.5 bg-white/5 rounded text-[10px]">
								.{page.property}
							</span>
							<span class="flex-1 truncate text-white/80">{page.path}</span>
							<span class="text-white/60 tabular-nums w-12 text-right">{formatNumber(page.count)}</span>
							<span class="text-white/30 w-10 text-right">{getPercentage(page.count, analytics.total_views)}%</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Top Experiments -->
			<div class="bg-white/5 border border-white/10 rounded-lg p-4">
				<h3 class="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wide">Top Experiments</h3>
				<div class="space-y-1">
					{#if analytics.top_experiments.length === 0}
						<p class="text-white/40 text-xs">No experiment views yet</p>
					{/if}
					{#each analytics.top_experiments.slice(0, 10) as exp, i}
						<div class="flex items-center gap-2 text-xs font-mono py-1.5 border-b border-white/5 last:border-0">
							<span class="text-white/30 w-4 text-right">{i + 1}</span>
							<span class="flex-1 truncate text-white/80">{exp.title || exp.experiment_id}</span>
							<span class="text-white/60 tabular-nums w-12 text-right">{formatNumber(exp.count)}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Top Countries -->
			<div class="bg-white/5 border border-white/10 rounded-lg p-4">
				<h3 class="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wide">Top Countries</h3>
				<div class="space-y-1">
					{#if analytics.top_countries.length === 0}
						<p class="text-white/40 text-xs">No country data yet</p>
					{/if}
					{#each analytics.top_countries.slice(0, 10) as country, i}
						<div class="flex items-center gap-2 text-xs font-mono py-1.5 border-b border-white/5 last:border-0">
							<span class="text-white/30 w-4 text-right">{i + 1}</span>
							<span class="flex-1 text-white/80">{country.country}</span>
							<span class="text-white/60 tabular-nums w-12 text-right">{formatNumber(country.count)}</span>
							<span class="text-white/30 w-10 text-right">{getPercentage(country.count, analytics.total_views)}%</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Top Referrers -->
			<div class="bg-white/5 border border-white/10 rounded-lg p-4">
				<h3 class="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wide">Top Referrers</h3>
				<div class="space-y-1">
					{#if analytics.top_referrers.length === 0}
						<p class="text-white/40 text-xs">No referrer data yet</p>
					{/if}
					{#each analytics.top_referrers.slice(0, 10) as ref, i}
						<div class="flex items-center gap-2 text-xs font-mono py-1.5 border-b border-white/5 last:border-0">
							<span class="text-white/30 w-4 text-right">{i + 1}</span>
							<span class="flex-1 truncate text-white/80">{ref.referrer}</span>
							<span class="text-white/60 tabular-nums w-12 text-right">{formatNumber(ref.count)}</span>
							<span class="text-white/30 w-10 text-right">{getPercentage(ref.count, analytics.total_views)}%</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Daily Trend (Tufte: Sparkline with high data density) -->
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
							{formatNumber(analytics.daily_views[analytics.daily_views.length - 1]?.count || 0)}
						</div>
						<div class="text-xs text-white/40">today</div>
					</div>
				{/if}
			</div>

			{#if analytics.daily_views.length === 0}
				<p class="text-white/40 text-sm">No daily data yet</p>
			{:else}
				<!-- Sparkline visualization (Tufte: maximize data-ink ratio) -->
				<svg viewBox="0 0 100 30" class="w-full h-24" preserveAspectRatio="none">
					<!-- Subtle grid lines for reference (minimal chartjunk) -->
					<line x1="0" y1="15" x2="100" y2="15" stroke="white" stroke-opacity="0.05" stroke-width="0.5"/>

					<!-- Data line (high data-ink ratio) -->
					<path
						d={generateSparkline(analytics.daily_views, 100, 30)}
						fill="none"
						stroke="white"
						stroke-opacity="0.6"
						stroke-width="1.5"
						vector-effect="non-scaling-stroke"
					/>

					<!-- Fill area under curve (subtle context) -->
					<path
						d="{generateSparkline(analytics.daily_views, 100, 30)} L 100,30 L 0,30 Z"
						fill="white"
						fill-opacity="0.1"
					/>
				</svg>

				<!-- Compact data table (Tufte: small multiples, high density) -->
				<div class="mt-4 grid grid-cols-7 gap-1 text-xs font-mono">
					{#each analytics.daily_views.slice(-7) as day}
						<div class="text-center p-2 bg-white/5 rounded">
							<div class="text-white/40 text-[10px] mb-1">
								{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
							</div>
							<div class="text-white/80 font-semibold">{formatNumber(day.count)}</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Info Footer -->
		<div class="border-t border-white/10 pt-6">
			<p class="text-sm text-white/40">
				Privacy-first analytics powered by D1. No cookies, no tracking scripts, no personal data
				collected. All data stored in your own database.
			</p>
		</div>
	{/if}
</div>
