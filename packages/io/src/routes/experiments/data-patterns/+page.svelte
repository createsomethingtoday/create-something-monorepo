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

	// Comparative trends - using Canon data visualization colors
	const performanceTrends = [
		{ label: 'Auth', data: apiMetrics.auth.dailyAverages, color: 'var(--color-data-2)', opacity: 0.9 },
		{ label: 'Database', data: apiMetrics.database.dailyAverages, color: 'var(--color-error)', opacity: 0.9 },
		{ label: 'Cache', data: apiMetrics.cache.dailyAverages, color: 'var(--color-data-1)', opacity: 0.9 },
		{ label: 'Storage', data: apiMetrics.storage.dailyAverages, color: 'var(--color-data-4)', opacity: 0.9 }
	];
</script>

<svelte:head>
	<title>Data Patterns | CREATE SOMETHING.io</title>
</svelte:head>

<div class="page-container min-h-screen p-6">
	<div class="max-w-5xl mx-auto space-y-12">
		<!-- Header -->
		<div class="header-section pb-8">
			<h1 class="page-title mb-3">Revealing Data Patterns</h1>
			<p class="text-secondary max-w-3xl">
				A demonstration of how agentic visualization components automatically reveal patterns,
				trends, and anomalies without manual analysis. The components make the insights obvious.
			</p>
		</div>

		<!-- Pattern 1: Performance Degradation -->
		<section class="space-y-6">
			<div>
				<h2 class="section-title mb-2">Pattern Revealed: Performance Degradation</h2>
				<p class="text-tertiary">
					ComparativeSparklines component reveals which services are improving vs. degrading
				</p>
			</div>

			<div class="card p-8 space-y-6">
				<ComparativeSparklines series={performanceTrends} width={100} height={30} />

				<div class="text-body-sm text-tertiary space-y-2">
					<p><strong class="text-secondary">What it reveals:</strong></p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li><span class="data-success">Auth</span> is improving (trending down = faster)</li>
						<li><span class="data-error">Database</span> is degrading (trending up = slower)</li>
						<li><span class="data-info">Cache</span> is stable and optimal</li>
						<li><span class="data-warning">Storage</span> is flat (no change)</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- Pattern 2: AI-Powered Service Health -->
		<section class="space-y-6">
			<div>
				<h2 class="section-title mb-2">Pattern Revealed: AI-Powered Service Health</h2>
				<p class="text-tertiary">
					MetricCard + TrendIndicator with automatic semantic understanding via Cloudflare Workers AI
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
						<div class="card-subtle px-6 py-2">
							<div class="text-caption text-muted mb-1">vs. last week</div>
							<TrendIndicator
								current={metrics.avgResponseTime}
								previous={metrics.previousAvg}
								format="number"
								aiEnhanced={true}
								metric="{service}_response_time"
								label="{service} response time"
								context="api_performance_monitoring"
							/>
						</div>
					</div>
				{/each}
			</div>

			<div class="card p-6 space-y-3">
				<p class="text-tertiary text-body-sm">
					<strong class="text-secondary">What it reveals:</strong> Database response time increased
					+26%, indicating a problem. Auth improved -13%, cache improved -20%, storage flat.
				</p>
				<p class="text-tertiary text-body-sm">
					<strong class="text-secondary">AI Enhancement:</strong> The component uses Cloudflare Workers AI
					to understand that "response_time" semantically means "lower is better"—automatically inverting
					colors without manual configuration.
				</p>
				<p class="text-muted text-body-sm">
					First load calls AI API. Subsequent loads use cached results. Falls back to heuristics if AI unavailable.
				</p>
			</div>
		</section>

		<!-- Pattern 3: Error Distribution -->
		<section class="space-y-6">
			<div>
				<h2 class="section-title mb-2">Pattern Revealed: Error Distribution Health</h2>
				<p class="text-tertiary">
					DistributionBar shows proportional breakdown of HTTP responses
				</p>
			</div>

			<div class="card p-8">
				<DistributionBar segments={errorDistribution} height="h-12" />

				<p class="text-body-sm text-tertiary mt-6">
					<strong class="text-secondary">What it reveals:</strong> System is healthy - 98.5%
					success rate, 1.2% client errors (expected), only 0.3% server errors (excellent).
					The visual makes this distribution immediately obvious.
				</p>
			</div>
		</section>

		<!-- Key Insight -->
		<section class="section-divider pt-8">
			<h2 class="section-title mb-4">The Pattern Recognition Insight</h2>

			<div class="card p-6 space-y-4">
				<p class="text-tertiary">
					<strong class="text-secondary">Without visualization:</strong> You would need to manually:
				</p>
				<ul class="list-disc list-inside space-y-2 ml-4 text-tertiary">
					<li>Calculate percentage changes for each service</li>
					<li>Compare trends across time periods</li>
					<li>Compute proportions for error distribution</li>
					<li>Identify which metrics are improving vs. degrading</li>
				</ul>

				<p class="text-tertiary">
					<strong class="text-secondary">With agentic components:</strong> Patterns are
					<em>immediately visible</em>. The database degradation, auth improvement, and healthy
					error distribution are obvious at a glance. The components do the analytical work.
				</p>

				<p class="text-body-sm text-muted italic">
					This is the power of encoding expert knowledge into autonomous software.
				</p>
			</div>
		</section>

		<!-- Footer -->
		<div class="section-divider pt-6">
			<p class="text-body-sm text-muted">
				All visualizations powered by
				<a
					href="https://createsomething.ltd/masters/edward-tufte"
					class="link">@create-something/tufte</a
				>. View
				<a href="/experiments/agentic-visualization" class="link"
					>full research paper</a
				>
				or
				<a href="/experiments" class="link">all experiments</a>.
			</p>
		</div>
	</div>
</div>

<style>
	.page-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 700;
	}

	.header-section {
		border-bottom: 1px solid var(--color-border-default);
	}

	.section-divider {
		border-top: 1px solid var(--color-border-default);
	}

	.text-secondary {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.text-tertiary {
		color: var(--color-fg-tertiary);
	}

	.text-muted {
		color: var(--color-fg-muted);
	}

	.text-body-sm {
		font-size: var(--text-body-sm);
	}

	.text-caption {
		font-size: var(--text-caption);
	}

	.card {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-subtle {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.link {
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.link:hover {
		color: var(--color-fg-tertiary);
	}

	/* Data visualization semantic colors */
	.data-success {
		color: var(--color-data-2);
	}

	.data-error {
		color: var(--color-error);
	}

	.data-info {
		color: var(--color-data-1);
	}

	.data-warning {
		color: var(--color-data-4);
	}
</style>
