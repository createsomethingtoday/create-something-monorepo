<script lang="ts">
	/**
	 * Agentic Visualization Experiment
	 *
	 * Research experiment demonstrating autonomous UI components that embody
	 * Edward Tufte's principles for displaying quantitative information.
	 *
	 * Supports both sample data (controlled examples) and live data (real analytics)
	 * to demonstrate component flexibility and practical application.
	 */

	import { onMount } from 'svelte';
	import {
		ComparativeSparklines,
		DistributionBar,
		TrendIndicator,
		MetricCard,
		HighDensityTable
	} from '@create-something/tufte';

	// Data source toggle
	let dataSource: 'sample' | 'live' = 'sample';
	let loading = false;
	let liveAnalytics: any = null;

	// Sample data for demonstrations
	const propertyData = {
		agency: {
			views: 1234,
			previousViews: 980,
			dailyViews: [
				{ count: 120 },
				{ count: 145 },
				{ count: 132 },
				{ count: 198 },
				{ count: 167 },
				{ count: 189 },
				{ count: 203 }
			]
		},
		io: {
			views: 2456,
			previousViews: 2100,
			dailyViews: [
				{ count: 280 },
				{ count: 310 },
				{ count: 295 },
				{ count: 340 },
				{ count: 355 },
				{ count: 380 },
				{ count: 396 }
			]
		},
		space: {
			views: 890,
			previousViews: 1200,
			dailyViews: [
				{ count: 180 },
				{ count: 165 },
				{ count: 140 },
				{ count: 125 },
				{ count: 110 },
				{ count: 95 },
				{ count: 75 }
			]
		},
		ltd: {
			views: 567,
			previousViews: 450,
			dailyViews: [
				{ count: 60 },
				{ count: 75 },
				{ count: 68 },
				{ count: 82 },
				{ count: 90 },
				{ count: 95 },
				{ count: 97 }
			]
		}
	};

	// Fetch live analytics data
	async function fetchLiveData() {
		loading = true;
		try {
			const response = await fetch('/api/admin/analytics?days=7');
			if (response.ok) {
				liveAnalytics = await response.json();
			}
		} catch (error) {
			console.error('Failed to load live analytics:', error);
		} finally {
			loading = false;
		}
	}

	// Load live data when switching to live mode
	$: if (dataSource === 'live' && !liveAnalytics) {
		fetchLiveData();
	}

	// Get property stats with defaults for all properties
	function getLivePropertyData() {
		if (!liveAnalytics) return null;

		const properties = ['agency', 'io', 'space', 'ltd'];
		return properties.reduce((acc, prop) => {
			const found = liveAnalytics.views_by_property.find((p: any) => p.property === prop);
			acc[prop] = {
				views: found?.count || 0,
				previousViews: Math.round((found?.count || 0) * 0.85), // Estimate previous period
				dailyViews: liveAnalytics.daily_views.slice(-7).map((d: any) => ({ count: d.count }))
			};
			return acc;
		}, {} as any);
	}

	// Reactive data - switches between sample and live
	$: activeData = dataSource === 'live' && liveAnalytics
		? getLivePropertyData()
		: propertyData;

	// Distribution data
	$: distribution = activeData ? [
		{ label: '.agency', count: activeData.agency.views },
		{ label: '.io', count: activeData.io.views },
		{ label: '.space', count: activeData.space.views },
		{ label: '.ltd', count: activeData.ltd.views }
	] : [];

	// Comparative sparklines data - Using brighter, more saturated colors for better visibility
	$: comparativeData = activeData ? [
		{ label: '.agency', data: activeData.agency.dailyViews, color: 'rgb(96, 165, 250)', opacity: 0.9 },
		{ label: '.io', data: activeData.io.dailyViews, color: 'rgb(34, 197, 94)', opacity: 0.9 },
		{ label: '.space', data: activeData.space.dailyViews, color: 'rgb(192, 132, 252)', opacity: 0.9 },
		{ label: '.ltd', data: activeData.ltd.dailyViews, color: 'rgb(251, 191, 36)', opacity: 0.9 }
	] : [];
</script>

<svelte:head>
	<title>Agentic Visualizations | CREATE SOMETHING.io</title>
</svelte:head>

<div class="min-h-screen bg-black text-white p-6">
	<div class="max-w-7xl mx-auto space-y-12">
		<!-- Header with Data Source Toggle -->
		<div class="border-b border-white/10 pb-8">
			<div class="flex items-start justify-between gap-4 mb-4">
				<div class="flex-1">
					<h1 class="text-4xl font-bold mb-3">Agentic Visualization Experiment</h1>
					<p class="text-white/70 text-lg max-w-3xl">
						Research experiment demonstrating autonomous UI components that embody Edward Tufte's principles.
						Components work with any data source - toggle between controlled samples and live analytics.
					</p>
				</div>

				<!-- Data Source Toggle -->
				<div class="flex gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
					<button
						onclick={() => dataSource = 'sample'}
						class="px-4 py-2 rounded text-sm font-medium transition-all {dataSource === 'sample'
							? 'bg-white/20 text-white'
							: 'text-white/60 hover:text-white/80'}"
					>
						Sample Data
					</button>
					<button
						onclick={() => dataSource = 'live'}
						class="px-4 py-2 rounded text-sm font-medium transition-all {dataSource === 'live'
							? 'bg-white/20 text-white'
							: 'text-white/60 hover:text-white/80'}"
					>
						Live Data {loading ? '...' : ''}
					</button>
				</div>
			</div>

			<!-- Data Source Description -->
			<div class="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg text-sm">
				{#if dataSource === 'sample'}
					<p class="text-white/70">
						<strong class="text-white/90">Sample Data Mode:</strong> Controlled examples demonstrating component behavior with crafted data patterns.
						Shows growth, decline, and emergence trends.
					</p>
				{:else if loading}
					<p class="text-white/70">Loading live analytics from CREATE SOMETHING properties...</p>
				{:else if liveAnalytics}
					<p class="text-white/70">
						<strong class="text-white/90">Live Data Mode:</strong> Real analytics from the last 7 days across .agency, .io, .space, and .ltd.
						Total: {liveAnalytics.total_views.toLocaleString()} page views.
					</p>
				{:else}
					<p class="text-white/70 text-red-400">Failed to load live data. Showing sample data.</p>
				{/if}
			</div>
		</div>

		<!-- 1. Comparative Sparklines -->
		<section class="space-y-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">Comparative Trends</h2>
				<p class="text-white/70 text-base">
					ComparativeSparklines component - Multiple data series overlaid for direct comparison
				</p>
			</div>
			<div class="p-8 bg-white/5 border border-white/10 rounded-lg space-y-6">
				<ComparativeSparklines series={comparativeData} width={100} height={30} />
				<p class="text-sm text-white/60">
					<strong class="text-white/80">Reveals:</strong> .io and .agency are growing, .space is declining, .ltd is
					emerging. Relative performance visible at a glance.
				</p>
			</div>
		</section>

		<!-- 2. Distribution Bar -->
		<section class="space-y-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">Proportional Distribution</h2>
				<p class="text-white/70 text-base">
					DistributionBar component - Visual representation of how total is divided
				</p>
			</div>
			<div class="p-8 bg-white/5 border border-white/10 rounded-lg">
				<DistributionBar segments={distribution} height="h-12" />
				<p class="text-sm text-white/60 mt-6">
					<strong class="text-white/80">Reveals:</strong> .io dominates (47%), followed by .agency (24%), .space (17%),
					and .ltd (11%). Distribution imbalance immediately obvious.
				</p>
			</div>
		</section>

		<!-- 3. Trend Indicators -->
		<section class="space-y-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">Change Direction & Magnitude</h2>
				<p class="text-white/70 text-base">
					TrendIndicator component - Shows whether metrics are up, down, or flat
				</p>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				{#if activeData}
			{#each Object.entries(activeData) as [property, data]}
					<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
						<div class="text-sm text-white/60 mb-2">.{property}</div>
						<div class="text-3xl font-bold tabular-nums mb-2">{data.views.toLocaleString()}</div>
						<TrendIndicator current={data.views} previous={data.previousViews} />
					</div>
				{/each}
		{/if}
			</div>
			<p class="text-xs text-white/40">
				<strong>Reveals:</strong> Directional changes at a glance - growing (green ↑), declining
				(red ↓), or stable (gray →)
			</p>
		</section>

		<!-- 4. Integrated Comparison Dashboard -->
		<section class="space-y-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">Integrated Comparison Dashboard</h2>
				<p class="text-white/60 text-sm">
					Composition - MetricCard + TrendIndicator + comparative context
				</p>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				{#if activeData}
			{#each Object.entries(activeData) as [property, data]}
					<div class="space-y-2">
						<MetricCard
							label=".{property}"
							value={data.views}
							trend={data.dailyViews}
							context="last 7 days"
						/>
						<div class="px-6 py-2 bg-white/5 border border-white/10 rounded-lg">
							<div class="text-xs text-white/40 mb-1">vs. previous period</div>
							<TrendIndicator current={data.views} previous={data.previousViews} />
						</div>
					</div>
				{/each}
		{/if}
			</div>
			<p class="text-xs text-white/40">
				<strong>Reveals:</strong> Complete picture - absolute values, trends, and directional
				changes in unified view
			</p>
		</section>

		<!-- 5. What This Demonstrates -->
		<section class="border-t border-white/10 pt-8">
			<h2 class="text-2xl font-bold mb-4">What the Hermeneutic Circle Revealed</h2>
			<div class="grid md:grid-cols-2 gap-6">
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<h3 class="text-lg font-semibold mb-3 text-white/80">Compositional Power</h3>
					<ul class="space-y-2 text-sm text-white/60">
						<li>• Components combine to reveal multi-dimensional insights</li>
						<li>• Same data, different lenses: trends, proportions, changes</li>
						<li>• Patterns invisible in tables become obvious visually</li>
						<li>• No manual calculation - components interpret automatically</li>
					</ul>
				</div>

				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<h3 class="text-lg font-semibold mb-3 text-white/80">Agentic Behavior</h3>
					<ul class="space-y-2 text-sm text-white/60">
						<li>• Automatic scaling (ComparativeSparklines uses shared range)</li>
						<li>• Intelligent formatting (percentages, colors, labels)</li>
						<li>• Contextual decisions (show labels only when space permits)</li>
						<li>• Self-documenting (tooltips, legends generated automatically)</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- Footer -->
		<div class="border-t border-white/10 pt-6">
			<p class="text-sm text-white/40">
				All visualizations powered by
				<a
					href="https://createsomething.ltd/masters/edward-tufte"
					class="underline hover:text-white/60">@create-something/tufte</a
				>
				— agentic components embodying Tufte's principles. View
				<a href="/methodology" class="underline hover:text-white/60">methodology</a>
				or
				<a href="/admin/analytics" class="underline hover:text-white/60">analytics dashboard</a>.
			</p>
		</div>
	</div>
</div>
