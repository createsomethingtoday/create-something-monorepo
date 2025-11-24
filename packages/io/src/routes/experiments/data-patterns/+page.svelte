<script lang="ts">
	/**
	 * Data Patterns Experiment
	 *
	 * Demonstrates how @create-something/tufte components automatically
	 * reveal patterns in data without manual analysis.
	 */

	import {
		ComparativeSparklines,
		TrendIndicator,
		DistributionBar,
		MetricCard
	} from '@create-something/tufte';

	// Simulated API response times across services
	const apiMetrics = {
		auth: {
			avgResponseTime: 45,
			previousAvg: 52,
			dailyAverages: [
				{ count: 52 },
				{ count: 50 },
				{ count: 48 },
				{ count: 46 },
				{ count: 44 },
				{ count: 43 },
				{ count: 45 }
			]
		},
		database: {
			avgResponseTime: 120,
			previousAvg: 95,
			dailyAverages: [
				{ count: 95 },
				{ count: 98 },
				{ count: 105 },
				{ count: 110 },
				{ count: 115 },
				{ count: 118 },
				{ count: 120 }
			]
		},
		cache: {
			avgResponseTime: 12,
			previousAvg: 15,
			dailyAverages: [
				{ count: 15 },
				{ count: 14 },
				{ count: 13 },
				{ count: 13 },
				{ count: 12 },
				{ count: 12 },
				{ count: 12 }
			]
		},
		storage: {
			avgResponseTime: 89,
			previousAvg: 89,
			dailyAverages: [
				{ count: 89 },
				{ count: 90 },
				{ count: 88 },
				{ count: 89 },
				{ count: 90 },
				{ count: 88 },
				{ count: 89 }
			]
		}
	};

	// Error distribution across HTTP status codes
	const errorDistribution = [
		{ label: '2xx Success', count: 9850 },
		{ label: '4xx Client', count: 120 },
		{ label: '5xx Server', count: 30 }
	];

	// Comparative trends
	const performanceTrends = [
		{ label: 'Auth', data: apiMetrics.auth.dailyAverages, color: 'rgb(34, 197, 94)', opacity: 0.9 },
		{ label: 'Database', data: apiMetrics.database.dailyAverages, color: 'rgb(239, 68, 68)', opacity: 0.9 },
		{ label: 'Cache', data: apiMetrics.cache.dailyAverages, color: 'rgb(96, 165, 250)', opacity: 0.9 },
		{ label: 'Storage', data: apiMetrics.storage.dailyAverages, color: 'rgb(251, 191, 36)', opacity: 0.9 }
	];
</script>

<svelte:head>
	<title>Data Patterns | CREATE SOMETHING.io</title>
</svelte:head>

<div class="min-h-screen bg-black text-white p-6">
	<div class="max-w-5xl mx-auto space-y-12">
		<!-- Header -->
		<div class="border-b border-white/10 pb-8">
			<h1 class="text-4xl font-bold mb-3">Revealing Data Patterns</h1>
			<p class="text-white/70 text-lg max-w-3xl">
				A demonstration of how agentic visualization components automatically reveal patterns,
				trends, and anomalies without manual analysis. The components make the insights obvious.
			</p>
		</div>

		<!-- Pattern 1: Performance Degradation -->
		<section class="space-y-6">
			<div>
				<h2 class="text-2xl font-bold mb-2">Pattern Revealed: Performance Degradation</h2>
				<p class="text-white/70">
					ComparativeSparklines component reveals which services are improving vs. degrading
				</p>
			</div>

			<div class="p-8 bg-white/5 border border-white/10 rounded-lg space-y-6">
				<ComparativeSparklines series={performanceTrends} width={100} height={30} />

				<div class="text-sm text-white/60 space-y-2">
					<p><strong class="text-white/80">What it reveals:</strong></p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li><span class="text-green-400">Auth</span> is improving (trending down = faster)</li>
						<li><span class="text-red-400">Database</span> is degrading (trending up = slower)</li>
						<li><span class="text-blue-400">Cache</span> is stable and optimal</li>
						<li><span class="text-yellow-400">Storage</span> is flat (no change)</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- Pattern 2: Service Health Comparison -->
		<section class="space-y-6">
			<div>
				<h2 class="text-2xl font-bold mb-2">Pattern Revealed: Relative Service Health</h2>
				<p class="text-white/70">
					MetricCard + TrendIndicator shows absolute performance and direction
				</p>
			</div>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				{#each Object.entries(apiMetrics) as [service, metrics]}
					<div class="space-y-2">
						<MetricCard
							label={service}
							value={metrics.avgResponseTime}
							trend={metrics.dailyAverages}
							context="ms avg"
						/>
						<div class="px-6 py-2 bg-white/5 border border-white/10 rounded-lg">
							<div class="text-xs text-white/40 mb-1">vs. last week</div>
							<TrendIndicator
								current={metrics.avgResponseTime}
								previous={metrics.previousAvg}
								format="number"
							/>
						</div>
					</div>
				{/each}
			</div>

			<p class="text-sm text-white/60">
				<strong class="text-white/80">What it reveals:</strong> Database response time increased
				+26%, indicating a problem. Auth improved -13%, cache improved -20%, storage flat.
			</p>
		</section>

		<!-- Pattern 3: Error Distribution -->
		<section class="space-y-6">
			<div>
				<h2 class="text-2xl font-bold mb-2">Pattern Revealed: Error Distribution Health</h2>
				<p class="text-white/70">
					DistributionBar shows proportional breakdown of HTTP responses
				</p>
			</div>

			<div class="p-8 bg-white/5 border border-white/10 rounded-lg">
				<DistributionBar segments={errorDistribution} height="h-12" />

				<p class="text-sm text-white/60 mt-6">
					<strong class="text-white/80">What it reveals:</strong> System is healthy - 98.5%
					success rate, 1.2% client errors (expected), only 0.3% server errors (excellent).
					The visual makes this distribution immediately obvious.
				</p>
			</div>
		</section>

		<!-- Key Insight -->
		<section class="border-t border-white/10 pt-8">
			<h2 class="text-2xl font-bold mb-4">The Pattern Recognition Insight</h2>

			<div class="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4 text-white/70">
				<p>
					<strong class="text-white/90">Without visualization:</strong> You would need to manually:
				</p>
				<ul class="list-disc list-inside space-y-2 ml-4">
					<li>Calculate percentage changes for each service</li>
					<li>Compare trends across time periods</li>
					<li>Compute proportions for error distribution</li>
					<li>Identify which metrics are improving vs. degrading</li>
				</ul>

				<p>
					<strong class="text-white/90">With agentic components:</strong> Patterns are
					<em>immediately visible</em>. The database degradation, auth improvement, and healthy
					error distribution are obvious at a glance. The components do the analytical work.
				</p>

				<p class="text-sm text-white/50 italic">
					This is the power of encoding expert knowledge into autonomous software.
				</p>
			</div>
		</section>

		<!-- Footer -->
		<div class="border-t border-white/10 pt-6">
			<p class="text-sm text-white/40">
				All visualizations powered by
				<a
					href="https://createsomething.ltd/masters/edward-tufte"
					class="underline hover:text-white/60">@create-something/tufte</a
				>. View
				<a href="/experiments/agentic-visualization" class="underline hover:text-white/60"
					>full research paper</a
				>
				or
				<a href="/experiments" class="underline hover:text-white/60">all experiments</a>.
			</p>
		</div>
	</div>
</div>
