<script lang="ts">
	/**
	 * TufteDashboard Component
	 *
	 * AI-powered analytics dashboard using @create-something/tufte components.
	 * Demonstrates the hermeneutic loop: raw data → AI interpretation → Tufte visualization → human insight
	 *
	 * Features:
	 * - Subscriber Growth tracking
	 * - Content Performance analytics
	 * - Contact Funnel visualization
	 * - AI-powered anomaly detection
	 */

	import {
		MetricCard,
		HighDensityTable,
		DailyGrid,
		ComparativeSparklines,
		DistributionBar,
		HourlyHeatmap,
		TrendIndicator,
		Sparkline
	} from '@create-something/tufte';

	// Types
	interface MetricSummary {
		value: number;
		trend: { count: number }[];
		previous: number;
		label: string;
		context: string;
	}

	interface AnomalyInsight {
		metric: string;
		type: 'spike' | 'drop' | 'trend_change' | 'unusual_pattern';
		severity: 'info' | 'warning' | 'critical';
		message: string;
		value: number;
		expected: number;
		deviation: number;
		date?: string;
	}

	interface FunnelStep {
		label: string;
		count: number;
		percentage: number;
		dropoff?: number;
	}

	interface ContentMetric {
		id: string;
		title: string;
		category: string;
		views: number;
		uniqueViews: number;
	}

	// Dashboard data from /api/tufte/dashboard
	export let data: {
		metrics: {
			totalViews: MetricSummary;
			uniqueVisitors: MetricSummary;
			agentApprovalRate: MetricSummary;
			avgResponseTime: MetricSummary;
			totalSubscribers?: MetricSummary;
			subscriberGrowthRate?: MetricSummary;
		};
		topPages: { label: string; count: number; property?: string }[];
		topExperiments: { label: string; count: number; property?: string }[];
		topCountries: { label: string; count: number }[];
		topReferrers: { label: string; count: number }[];
		dailyViews: { date: string; count: number }[];
		propertySeries: { label: string; data: { count: number }[]; color: string }[];
		viewsByProperty: { label: string; count: number; color?: string }[];
		hourlyActivity: { date: string; hour: number; count: number }[];
		actionsByType: { label: string; count: number }[];
		agentMetrics: {
			approvalTrend: { date: string; count: number }[];
			actionSuccessRate: { label: string; count: number }[];
			sessionOutcomes: { label: string; count: number }[];
		};
		// NEW: Subscriber Growth
		subscriberGrowth?: {
			dailySignups: { date: string; count: number }[];
			cumulativeGrowth: { date: string; count: number }[];
			statusDistribution: { label: string; count: number; color?: string }[];
			churnRate: number;
		};
		// NEW: Content Performance
		contentPerformance?: {
			byCategory: { label: string; count: number; color?: string }[];
			topContent: ContentMetric[];
			readingTimeDistribution: { label: string; count: number }[];
		};
		// NEW: Contact Funnel
		conversionFunnel?: {
			steps: FunnelStep[];
			dailyConversions: { date: string; count: number }[];
			submissionsByStatus: { label: string; count: number; color?: string }[];
		};
		// NEW: AI Insights
		aiInsights?: {
			anomalies: AnomalyInsight[];
			summary: string;
			generatedAt: string;
		};
	};

	// Loading state
	export let loading = false;

	// Error state
	export let error: string | null = null;

	// Get severity color - uses Canon semantic color classes
	function getSeverityColor(severity: string): string {
		switch (severity) {
			case 'critical': return 'severity-critical';
			case 'warning': return 'severity-warning';
			default: return 'severity-info';
		}
	}

	// Get funnel bar color based on index
	function getFunnelColor(index: number): string {
		const colors = [
			'var(--color-data-1)',
			'var(--color-data-2)',
			'var(--color-data-4)'
		];
		return colors[index] || colors[2];
	}
</script>

<div class="tufte-dashboard space-y-8">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="loading-text">Loading dashboard data...</div>
		</div>
	{:else if error}
		<div class="error-banner">
			<p class="error-text">{error}</p>
		</div>
	{:else if data}
		<!-- AI Insights Banner -->
		{#if data.aiInsights}
			<section class="ai-insights-section">
				<div class="ai-insights-banner">
					<div class="flex items-start gap-3">
						<div class="ai-badge">AI</div>
						<div class="flex-1">
							<p class="ai-summary">{data.aiInsights.summary}</p>
							<p class="ai-timestamp">
								Generated {new Date(data.aiInsights.generatedAt).toLocaleTimeString()}
							</p>
						</div>
					</div>

					<!-- Anomaly Alerts -->
					{#if data.aiInsights.anomalies.length > 0}
						<div class="mt-4 space-y-2">
							{#each data.aiInsights.anomalies.slice(0, 3) as anomaly}
								<div class="anomaly-alert {getSeverityColor(anomaly.severity)}">
									<span class="font-mono">{anomaly.type.toUpperCase()}</span>
									<span class="flex-1">{anomaly.message}</span>
									{#if anomaly.date}
										<span class="anomaly-date">{anomaly.date}</span>
									{/if}
								</div>
							{/each}
							{#if data.aiInsights.anomalies.length > 3}
								<p class="anomalies-more">+{data.aiInsights.anomalies.length - 3} more anomalies</p>
							{/if}
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Section 1: Key Metrics -->
		<section class="metrics-section">
			<h2 class="section-heading">Key Metrics</h2>
			<div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
				<MetricCard
					label={data.metrics.totalViews.label}
					value={data.metrics.totalViews.value}
					trend={data.metrics.totalViews.trend}
					context={data.metrics.totalViews.context}
				/>
				<MetricCard
					label={data.metrics.uniqueVisitors.label}
					value={data.metrics.uniqueVisitors.value}
					trend={data.metrics.uniqueVisitors.trend}
					context={data.metrics.uniqueVisitors.context}
				/>
				{#if data.metrics.totalSubscribers}
					<MetricCard
						label={data.metrics.totalSubscribers.label}
						value={data.metrics.totalSubscribers.value}
						trend={data.metrics.totalSubscribers.trend}
						context={data.metrics.totalSubscribers.context}
					/>
				{/if}
				{#if data.metrics.subscriberGrowthRate}
					<MetricCard
						label={data.metrics.subscriberGrowthRate.label}
						value={data.metrics.subscriberGrowthRate.value}
						trend={data.metrics.subscriberGrowthRate.trend}
						context={data.metrics.subscriberGrowthRate.context}
						percentage={data.metrics.subscriberGrowthRate.value}
					/>
				{/if}
				<MetricCard
					label={data.metrics.agentApprovalRate.label}
					value={data.metrics.agentApprovalRate.value}
					trend={data.metrics.agentApprovalRate.trend}
					context={data.metrics.agentApprovalRate.context}
					percentage={data.metrics.agentApprovalRate.value}
				/>
				<MetricCard
					label={data.metrics.avgResponseTime.label}
					value={data.metrics.avgResponseTime.value}
					context={data.metrics.avgResponseTime.context}
				/>
			</div>
		</section>

		<!-- Section 2: Period Comparison -->
		<section class="trends-section">
			<h2 class="section-heading">Period Comparison</h2>
			<div class="flex flex-wrap gap-6">
				<div class="flex items-center gap-3">
					<span class="trend-label">Views:</span>
					<TrendIndicator
						current={data.metrics.totalViews.value}
						previous={data.metrics.totalViews.previous}
						format="percentage"
					/>
				</div>
				{#if data.metrics.totalSubscribers}
					<div class="flex items-center gap-3">
						<span class="trend-label">Subscribers:</span>
						<TrendIndicator
							current={data.metrics.totalSubscribers.value}
							previous={data.metrics.totalSubscribers.previous}
							format="number"
						/>
					</div>
				{/if}
				<div class="flex items-center gap-3">
					<span class="trend-label">Approval Rate:</span>
					<TrendIndicator
						current={data.metrics.agentApprovalRate.value}
						previous={data.metrics.agentApprovalRate.previous}
						format="number"
					/>
				</div>
			</div>
		</section>

		<!-- Section 3: Conversion Funnel -->
		{#if data.conversionFunnel && data.conversionFunnel.steps.length > 0}
			<section class="funnel-section">
				<h2 class="section-heading">Conversion Funnel</h2>
				<div class="panel">
					<div class="flex items-end gap-2 h-32">
						{#each data.conversionFunnel.steps as step, i}
							{@const height = Math.max(step.percentage, 5)}
							<div class="flex-1 flex flex-col items-center gap-2">
								<div
									class="funnel-bar"
									style="height: {height}%; background: {getFunnelColor(i)};"
								></div>
								<div class="text-center">
									<div class="funnel-count">{step.count.toLocaleString()}</div>
									<div class="funnel-label">{step.label}</div>
									{#if step.dropoff !== undefined && step.dropoff > 0}
										<div class="funnel-dropoff">-{step.dropoff}%</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Submissions by Status -->
				{#if data.conversionFunnel.submissionsByStatus.length > 0}
					<div class="mt-4">
						<h3 class="subsection-label">Submission Status</h3>
						<DistributionBar segments={data.conversionFunnel.submissionsByStatus} />
					</div>
				{/if}
			</section>
		{/if}

		<!-- Section 4: Subscriber Growth -->
		{#if data.subscriberGrowth}
			<section class="subscriber-section">
				<h2 class="section-heading">Subscriber Growth</h2>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Cumulative Growth -->
					{#if data.subscriberGrowth.cumulativeGrowth.length > 0}
						<div class="panel">
							<h3 class="panel-heading">Cumulative Growth</h3>
							<div class="h-16">
								<Sparkline
									data={data.subscriberGrowth.cumulativeGrowth}
									width={200}
									height={50}
									showFill={true}
								/>
							</div>
						</div>
					{/if}

					<!-- Status Distribution -->
					{#if data.subscriberGrowth.statusDistribution.length > 0}
						<div class="panel">
							<h3 class="panel-heading">
								Status Distribution
								<span class="churn-rate">(Churn: {data.subscriberGrowth.churnRate}%)</span>
							</h3>
							<DistributionBar segments={data.subscriberGrowth.statusDistribution} />
						</div>
					{/if}
				</div>

				<!-- Daily Signups -->
				{#if data.subscriberGrowth.dailySignups.length > 0}
					<div class="mt-4">
						<DailyGrid data={data.subscriberGrowth.dailySignups} days={Math.min(data.subscriberGrowth.dailySignups.length, 14)} />
					</div>
				{/if}
			</section>
		{/if}

		<!-- Section 5: Content Performance -->
		{#if data.contentPerformance}
			<section class="content-section">
				<h2 class="section-heading">Content Performance</h2>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Views by Category -->
					{#if data.contentPerformance.byCategory.length > 0}
						<div class="panel">
							<h3 class="panel-heading">Views by Category</h3>
							<DistributionBar segments={data.contentPerformance.byCategory} />
						</div>
					{/if}

					<!-- Reading Time Distribution -->
					{#if data.contentPerformance.readingTimeDistribution.length > 0}
						<div class="panel">
							<h3 class="panel-heading">Reading Time Distribution</h3>
							<DistributionBar segments={data.contentPerformance.readingTimeDistribution} />
						</div>
					{/if}
				</div>

				<!-- Top Content -->
				{#if data.contentPerformance.topContent.length > 0}
					<div class="mt-4 panel">
						<h3 class="panel-heading">Top Content</h3>
						<HighDensityTable
							items={data.contentPerformance.topContent.map(c => ({
								label: c.title,
								count: c.views,
								property: c.category
							}))}
							limit={10}
							labelKey="label"
							countKey="count"
							badgeKey="property"
						/>
					</div>
				{/if}
			</section>
		{/if}

		<!-- Section 6: Traffic Distribution -->
		{#if data.viewsByProperty.length > 0}
			<section class="distribution-section">
				<h2 class="section-heading">Traffic by Property</h2>
				<DistributionBar segments={data.viewsByProperty} />
			</section>
		{/if}

		<!-- Section 7: Property Trends -->
		{#if data.propertySeries.length > 0}
			<section class="comparison-section">
				<h2 class="section-heading">Property Trends</h2>
				<div class="panel">
					<ComparativeSparklines series={data.propertySeries} height={60} />
				</div>
			</section>
		{/if}

		<!-- Section 8: Daily Views -->
		{#if data.dailyViews.length > 0}
			<section class="daily-section">
				<h2 class="section-heading">Daily Views</h2>
				<DailyGrid data={data.dailyViews} days={Math.min(data.dailyViews.length, 14)} />
			</section>
		{/if}

		<!-- Section 9: Hourly Heatmap -->
		{#if data.hourlyActivity.length > 0}
			<section class="hourly-section">
				<h2 class="section-heading">Activity by Hour</h2>
				<HourlyHeatmap data={data.hourlyActivity} days={7} />
			</section>
		{/if}

		<!-- Section 10: Top Content Tables -->
		<section class="tables-section">
			<h2 class="section-heading">Top Content</h2>
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div class="panel">
					<h3 class="panel-heading">Top Pages</h3>
					<HighDensityTable
						items={data.topPages}
						limit={10}
						labelKey="label"
						countKey="count"
						badgeKey="property"
					/>
				</div>

				<div class="panel">
					<h3 class="panel-heading">Top Experiments</h3>
					<HighDensityTable
						items={data.topExperiments}
						limit={10}
						labelKey="label"
						countKey="count"
						badgeKey="property"
					/>
				</div>

				<div class="panel">
					<h3 class="panel-heading">Top Countries</h3>
					<HighDensityTable
						items={data.topCountries}
						limit={10}
						labelKey="label"
						countKey="count"
					/>
				</div>

				<div class="panel">
					<h3 class="panel-heading">Top Referrers</h3>
					<HighDensityTable
						items={data.topReferrers}
						limit={10}
						labelKey="label"
						countKey="count"
					/>
				</div>
			</div>
		</section>

		<!-- Section 11: Agent Performance -->
		{#if data.agentMetrics.sessionOutcomes.length > 0 || data.agentMetrics.actionSuccessRate.length > 0}
			<section class="agent-section">
				<h2 class="section-heading">Agent Performance</h2>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{#if data.agentMetrics.sessionOutcomes.length > 0}
						<div class="panel">
							<h3 class="panel-heading">Session Outcomes</h3>
							<DistributionBar segments={data.agentMetrics.sessionOutcomes} />
						</div>
					{/if}

					{#if data.agentMetrics.actionSuccessRate.length > 0}
						<div class="panel">
							<h3 class="panel-heading">Actions by Type</h3>
							<HighDensityTable
								items={data.agentMetrics.actionSuccessRate}
								limit={8}
								labelKey="label"
								countKey="count"
							/>
						</div>
					{/if}
				</div>

				{#if data.agentMetrics.approvalTrend.length > 0}
					<div class="mt-4 panel">
						<h3 class="panel-heading">Approval Rate Trend (%)</h3>
						<div class="h-12">
							<Sparkline
								data={data.agentMetrics.approvalTrend}
								width={200}
								height={40}
								showReferenceLine={true}
							/>
						</div>
					</div>
				{/if}
			</section>
		{/if}
	{:else}
		<div class="flex items-center justify-center py-12">
			<div class="loading-text">No data available</div>
		</div>
	{/if}
</div>

<style>
	/* Base Dashboard Styles */
	.tufte-dashboard {
		font-family: var(--font-mono, ui-monospace, monospace);
	}

	/* Loading & Error States */
	.loading-text {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.error-banner {
		background-color: var(--color-error-muted);
		border: 1px solid rgba(204, 68, 68, 0.2);
		border-radius: var(--radius-lg);
		padding: 1rem;
	}

	.error-text {
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	/* Section Headings */
	.section-heading {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		margin-bottom: 1rem;
	}

	.subsection-label {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		margin-bottom: 0.5rem;
	}

	/* Panel - Shared card styling */
	.panel {
		background-color: var(--color-hover);
		border-radius: var(--radius-lg);
		padding: 1rem;
	}

	.panel-heading {
		color: var(--color-fg-tertiary);
		font-size: var(--text-caption);
		margin-bottom: 0.75rem;
	}

	/* AI Insights Banner */
	.ai-insights-banner {
		background: linear-gradient(to right, var(--color-data-3-muted, rgba(192, 132, 252, 0.1)), var(--color-data-1-muted, rgba(96, 165, 250, 0.1)));
		border: 1px solid rgba(192, 132, 252, 0.2);
		border-radius: var(--radius-lg);
		padding: 1rem;
	}

	.ai-badge {
		color: var(--color-data-3);
		font-size: var(--text-body-lg);
	}

	.ai-summary {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.ai-timestamp {
		color: var(--color-fg-subtle);
		font-size: var(--text-caption);
		margin-top: 0.25rem;
	}

	/* Anomaly Alerts */
	.anomaly-alert {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
		border: 1px solid;
		font-size: var(--text-caption);
	}

	.anomaly-date {
		color: var(--color-fg-muted);
	}

	.anomalies-more {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	/* Severity States */
	.severity-critical {
		background-color: var(--color-error-muted);
		border-color: rgba(204, 68, 68, 0.3);
		color: var(--color-error);
	}

	.severity-warning {
		background-color: var(--color-warning-muted);
		border-color: rgba(170, 136, 68, 0.3);
		color: var(--color-warning);
	}

	.severity-info {
		background-color: var(--color-info-muted);
		border-color: rgba(68, 119, 170, 0.3);
		color: var(--color-info);
	}

	/* Trend Labels */
	.trend-label {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	/* Funnel Visualization */
	.funnel-bar {
		width: 100%;
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.funnel-count {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-family: var(--font-mono);
	}

	.funnel-label {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	.funnel-dropoff {
		color: var(--color-error);
		opacity: 0.6;
		font-size: var(--text-caption);
	}

	/* Churn Rate */
	.churn-rate {
		color: var(--color-fg-subtle);
		margin-left: 0.5rem;
	}
</style>
