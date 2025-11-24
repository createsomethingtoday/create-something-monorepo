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
		<!-- Overview Stats -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
			<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
				<div class="text-sm text-white/60 mb-1">Total Page Views</div>
				<div class="text-3xl font-bold">{formatNumber(analytics.total_views)}</div>
			</div>

			{#each getPropertyStats() as prop}
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<div class="text-sm text-white/60 mb-1">.{prop.property}</div>
					<div class="text-3xl font-bold">{formatNumber(prop.count)}</div>
				</div>
			{/each}
		</div>

		<div class="grid grid-cols-2 gap-6">
			<!-- Top Pages -->
			<div class="bg-white/5 border border-white/10 rounded-lg p-6">
				<h3 class="text-xl font-semibold mb-4">Top Pages</h3>
				<div class="space-y-3">
					{#if analytics.top_pages.length === 0}
						<p class="text-white/40 text-sm">No data yet</p>
					{/if}
					{#each analytics.top_pages as page}
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2 flex-1 min-w-0">
								<span class="text-xs text-white/40 px-2 py-1 bg-white/5 rounded"
									>.{page.property}</span
								>
								<span class="text-sm truncate">{page.path}</span>
							</div>
							<span class="text-sm text-white/60">{formatNumber(page.count)}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Top Experiments -->
			<div class="bg-white/5 border border-white/10 rounded-lg p-6">
				<h3 class="text-xl font-semibold mb-4">Top Experiments</h3>
				<div class="space-y-3">
					{#if analytics.top_experiments.length === 0}
						<p class="text-white/40 text-sm">No experiment views yet</p>
					{/if}
					{#each analytics.top_experiments as exp}
						<div class="flex items-center justify-between">
							<span class="text-sm truncate flex-1">{exp.title || exp.experiment_id}</span>
							<span class="text-sm text-white/60">{formatNumber(exp.count)}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Top Countries -->
			<div class="bg-white/5 border border-white/10 rounded-lg p-6">
				<h3 class="text-xl font-semibold mb-4">Top Countries</h3>
				<div class="space-y-3">
					{#if analytics.top_countries.length === 0}
						<p class="text-white/40 text-sm">No country data yet</p>
					{/if}
					{#each analytics.top_countries as country}
						<div class="flex items-center justify-between">
							<span class="text-sm">{country.country}</span>
							<span class="text-sm text-white/60">{formatNumber(country.count)}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Top Referrers -->
			<div class="bg-white/5 border border-white/10 rounded-lg p-6">
				<h3 class="text-xl font-semibold mb-4">Top Referrers</h3>
				<div class="space-y-3">
					{#if analytics.top_referrers.length === 0}
						<p class="text-white/40 text-sm">No referrer data yet</p>
					{/if}
					{#each analytics.top_referrers as ref}
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm truncate flex-1">{ref.referrer}</span>
							<span class="text-sm text-white/60">{formatNumber(ref.count)}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Daily Trend -->
		<div class="bg-white/5 border border-white/10 rounded-lg p-6">
			<h3 class="text-xl font-semibold mb-4">
				Daily Page Views (Last {days} Days)
			</h3>
			<div class="space-y-2">
				{#if analytics.daily_views.length === 0}
					<p class="text-white/40 text-sm">No daily data yet</p>
				{/if}
				{#each analytics.daily_views as day}
					<div class="flex items-center gap-3">
						<span class="text-sm text-white/60 w-24">{day.date}</span>
						<div class="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
							<div
								class="bg-white/30 h-full rounded-full"
								style="width: {(day.count / Math.max(...analytics.daily_views.map((d: any) => d.count))) * 100}%"
							></div>
						</div>
						<span class="text-sm text-white/80 w-16 text-right">{formatNumber(day.count)}</span>
					</div>
				{/each}
			</div>
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
