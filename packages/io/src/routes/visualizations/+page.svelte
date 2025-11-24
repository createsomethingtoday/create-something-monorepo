<script lang="ts">
	/**
	 * Visualization Examples
	 *
	 * Showcases all agentic visualization components from @create-something/tufte
	 * Demonstrates the compositional possibilities revealed through hermeneutic analysis
	 */

	import {
		ComparativeSparklines,
		DistributionBar,
		TrendIndicator,
		MetricCard,
		HighDensityTable
	} from '@create-something/tufte';

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

	// Distribution data
	const distribution = [
		{ label: '.agency', count: propertyData.agency.views },
		{ label: '.io', count: propertyData.io.views },
		{ label: '.space', count: propertyData.space.views },
		{ label: '.ltd', count: propertyData.ltd.views }
	];

	// Comparative sparklines data
	const comparativeData = [
		{ label: '.agency', data: propertyData.agency.dailyViews, color: 'rgb(59, 130, 246)' },
		{ label: '.io', data: propertyData.io.dailyViews, color: 'rgb(16, 185, 129)' },
		{ label: '.space', data: propertyData.space.dailyViews, color: 'rgb(168, 85, 247)' },
		{ label: '.ltd', data: propertyData.ltd.dailyViews, color: 'rgb(251, 146, 60)' }
	];
</script>

<svelte:head>
	<title>Agentic Visualizations | CREATE SOMETHING.io</title>
</svelte:head>

<div class="min-h-screen bg-black text-white p-6">
	<div class="max-w-7xl mx-auto space-y-12">
		<!-- Header -->
		<div class="border-b border-white/10 pb-8">
			<h1 class="text-4xl font-bold mb-3">Agentic Visualizations</h1>
			<p class="text-white/60 text-lg max-w-3xl">
				Demonstrating compositional possibilities with @create-something/tufte components.
				Each visualization reveals insights through intelligent, autonomous data display.
			</p>
		</div>

		<!-- 1. Comparative Sparklines -->
		<section class="space-y-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">Comparative Trends</h2>
				<p class="text-white/60 text-sm">
					ComparativeSparklines component - Multiple data series overlaid for direct comparison
				</p>
			</div>
			<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
				<div class="h-32">
					<ComparativeSparklines series={comparativeData} width={100} height={30} />
				</div>
				<p class="text-xs text-white/40 mt-4">
					<strong>Reveals:</strong> .io and .agency are growing, .space is declining, .ltd is
					emerging. Relative performance visible at a glance.
				</p>
			</div>
		</section>

		<!-- 2. Distribution Bar -->
		<section class="space-y-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">Proportional Distribution</h2>
				<p class="text-white/60 text-sm">
					DistributionBar component - Visual representation of how total is divided
				</p>
			</div>
			<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
				<DistributionBar segments={distribution} />
				<p class="text-xs text-white/40 mt-4">
					<strong>Reveals:</strong> .io dominates (47%), followed by .agency (24%), .space (17%),
					and .ltd (11%). Distribution imbalance immediately obvious.
				</p>
			</div>
		</section>

		<!-- 3. Trend Indicators -->
		<section class="space-y-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">Change Direction & Magnitude</h2>
				<p class="text-white/60 text-sm">
					TrendIndicator component - Shows whether metrics are up, down, or flat
				</p>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				{#each Object.entries(propertyData) as [property, data]}
					<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
						<div class="text-sm text-white/60 mb-2">.{property}</div>
						<div class="text-3xl font-bold tabular-nums mb-2">{data.views.toLocaleString()}</div>
						<TrendIndicator current={data.views} previous={data.previousViews} />
					</div>
				{/each}
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
				{#each Object.entries(propertyData) as [property, data]}
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
