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

	// Get severity color
	function getSeverityColor(severity: string): string {
		switch (severity) {
			case 'critical': return 'bg-red-500/20 border-red-500/30 text-red-400';
			case 'warning': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
			default: return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
		}
	}
</script>

<div class="tufte-dashboard space-y-8">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-white/40 text-sm">Loading dashboard data...</div>
		</div>
	{:else if error}
		<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
			<p class="text-red-400 text-sm">{error}</p>
		</div>
	{:else if data}
		<!-- AI Insights Banner -->
		{#if data.aiInsights}
			<section class="ai-insights-section">
				<div class="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
					<div class="flex items-start gap-3">
						<div class="text-purple-400 text-lg">AI</div>
						<div class="flex-1">
							<p class="text-white/80 text-sm">{data.aiInsights.summary}</p>
							<p class="text-white/30 text-xs mt-1">
								Generated {new Date(data.aiInsights.generatedAt).toLocaleTimeString()}
							</p>
						</div>
					</div>

					<!-- Anomaly Alerts -->
					{#if data.aiInsights.anomalies.length > 0}
						<div class="mt-4 space-y-2">
							{#each data.aiInsights.anomalies.slice(0, 3) as anomaly}
								<div class="flex items-center gap-2 px-3 py-2 rounded {getSeverityColor(anomaly.severity)} border text-xs">
									<span class="font-mono">{anomaly.type.toUpperCase()}</span>
									<span class="flex-1">{anomaly.message}</span>
									{#if anomaly.date}
										<span class="text-white/40">{anomaly.date}</span>
									{/if}
								</div>
							{/each}
							{#if data.aiInsights.anomalies.length > 3}
								<p class="text-white/40 text-xs">+{data.aiInsights.anomalies.length - 3} more anomalies</p>
							{/if}
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Section 1: Key Metrics -->
		<section class="metrics-section">
			<h2 class="text-white/40 text-xs uppercase tracking-wider mb-4">Key Metrics</h2>
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
			<h2 class="text-white/40 text-xs uppercase tracking-wider mb-4">Period Comparison</h2>
			<div class="flex flex-wrap gap-6">
				<div class="flex items-center gap-3">
					<span class="text-white/60 text-sm">Views:</span>
					<TrendIndicator
						current={data.metrics.totalViews.value}
						previous={data.metrics.totalViews.previous}
						format="percentage"
					/>
				</div>
				{#if data.metrics.totalSubscribers}
					<div class="flex items-center gap-3">
						<span class="text-white/60 text-sm">Subscribers:</span>
						<TrendIndicator
							current={data.metrics.totalSubscribers.value}
							previous={data.metrics.totalSubscribers.previous}
							format="number"
						/>
					</div>
				{/if}
				<div class="flex items-center gap-3">
					<span class="text-white/60 text-sm">Approval Rate:</span>
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
				<h2 class="text-white/40 text-xs uppercase tracking-wider mb-4">Conversion Funnel</h2>
				<div class="bg-white/5 rounded-lg p-4">
					<div class="flex items-end gap-2 h-32">
						{#each data.conversionFunnel.steps as step, i}
							{@const height = Math.max(step.percentage, 5)}
							<div class="flex-1 flex flex-col items-center gap-2">
								<div
									class="w-full rounded-t transition-all"
									style="height: {height}%; background: {i === 0 ? 'rgb(59, 130, 246)' : i === 1 ? 'rgb(16, 185, 129)' : 'rgb(251, 146, 60)'};"
								></div>
								<div class="text-center">
									<div class="text-white/80 text-sm font-mono">{step.count.toLocaleString()}</div>
									<div class="text-white/40 text-xs">{step.label}</div>
									{#if step.dropoff !== undefined && step.dropoff > 0}
										<div class="text-red-400/60 text-xs">-{step.dropoff}%</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Submissions by Status -->
				{#if data.conversionFunnel.submissionsByStatus.length > 0}
					<div class="mt-4">
						<h3 class="text-white/40 text-xs mb-2">Submission Status</h3>
						<DistributionBar segments={data.conversionFunnel.submissionsByStatus} />
					</div>
				{/if}
			</section>
		{/if}

		<!-- Section 4: Subscriber Growth -->
		{#if data.subscriberGrowth}
			<section class="subscriber-section">
				<h2 class="text-white/40 text-xs uppercase tracking-wider mb-4">Subscriber Growth</h2>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Cumulative Growth -->
					{#if data.subscriberGrowth.cumulativeGrowth.length > 0}
						<div class="bg-white/5 rounded-lg p-4">
							<h3 class="text-white/60 text-xs mb-3">Cumulative Growth</h3>
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
						<div class="bg-white/5 rounded-lg p-4">
							<h3 class="text-white/60 text-xs mb-3">
								Status Distribution
								<span class="text-white/30 ml-2">(Churn: {data.subscriberGrowth.churnRate}%)</span>
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
				<h2 class="text-white/40 text-xs uppercase tracking-wider mb-4">Content Performance</h2>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Views by Category -->
					{#if data.contentPerformance.byCategory.length > 0}
						<div class="bg-white/5 rounded-lg p-4">
							<h3 class="text-white/60 text-xs mb-3">Views by Category</h3>
							<DistributionBar segments={data.contentPerformance.byCategory} />
						</div>
					{/if}

					<!-- Reading Time Distribution -->
					{#if data.contentPerformance.readingTimeDistribution.length > 0}
						<div class="bg-white/5 rounded-lg p-4">
							<h3 class="text-white/60 text-xs mb-3">Reading Time Distribution</h3>
							<DistributionBar segments={data.contentPerformance.readingTimeDistribution} />
						</div>
					{/if}
				</div>

				<!-- Top Content -->
				{#if data.contentPerformance.topContent.length > 0}
					<div class="mt-4 bg-white/5 rounded-lg p-4">
						<h3 class="text-white/60 text-xs mb-3">Top Content</h3>
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
				<h2 class="text-white/40 text-xs uppercase tracking-wider mb-4">Traffic by Property</h2>
				<DistributionBar segments={data.viewsByProperty} />
			</section>
		{/if}

		<!-- Section 7: Property Trends -->
		{#if data.propertySeries.length > 0}
			<section class="comparison-section">
				<h2 class="text-white/40 text-xs uppercase tracking-wider mb-4">Property Trends</h2>
				<div class="bg-white/5 rounded-lg p-4">
					<ComparativeSparklines series={data.propertySeries} height={60} />
				</div>
			</section>
		{/if}

		<!-- Section 8: Daily Views -->
		{#if data.dailyViews.length > 0}
			<section class="daily-section">
				<h2 class="text-white/40 text-xs uppercase tracking-wider mb-4">Daily Views</h2>
				<DailyGrid data={data.dailyViews} days={Math.min(data.dailyViews.length, 14)} />
			</section>
		{/if}

		<!-- Section 9: Hourly Heatmap -->
		{#if data.hourlyActivity.length > 0}
			<section class="hourly-section">
				<h2 class="text-white/40 text-xs uppercase tracking-wider mb-4">Activity by Hour</h2>
				<HourlyHeatmap data={data.hourlyActivity} days={7} />
			</section>
		{/if}

		<!-- Section 10: Top Content Tables -->
		<section class="tables-section">
			<h2 class="text-white/40 text-xs uppercase tracking-wider mb-4">Top Content</h2>
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div class="bg-white/5 rounded-lg p-4">
					<h3 class="text-white/60 text-xs mb-3">Top Pages</h3>
					<HighDensityTable
						items={data.topPages}
						limit={10}
						labelKey="label"
						countKey="count"
						badgeKey="property"
					/>
				</div>

				<div class="bg-white/5 rounded-lg p-4">
					<h3 class="text-white/60 text-xs mb-3">Top Experiments</h3>
					<HighDensityTable
						items={data.topExperiments}
						limit={10}
						labelKey="label"
						countKey="count"
						badgeKey="property"
					/>
				</div>

				<div class="bg-white/5 rounded-lg p-4">
					<h3 class="text-white/60 text-xs mb-3">Top Countries</h3>
					<HighDensityTable
						items={data.topCountries}
						limit={10}
						labelKey="label"
						countKey="count"
					/>
				</div>

				<div class="bg-white/5 rounded-lg p-4">
					<h3 class="text-white/60 text-xs mb-3">Top Referrers</h3>
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
				<h2 class="text-white/40 text-xs uppercase tracking-wider mb-4">Agent Performance</h2>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{#if data.agentMetrics.sessionOutcomes.length > 0}
						<div class="bg-white/5 rounded-lg p-4">
							<h3 class="text-white/60 text-xs mb-3">Session Outcomes</h3>
							<DistributionBar segments={data.agentMetrics.sessionOutcomes} />
						</div>
					{/if}

					{#if data.agentMetrics.actionSuccessRate.length > 0}
						<div class="bg-white/5 rounded-lg p-4">
							<h3 class="text-white/60 text-xs mb-3">Actions by Type</h3>
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
					<div class="mt-4 bg-white/5 rounded-lg p-4">
						<h3 class="text-white/60 text-xs mb-3">Approval Rate Trend (%)</h3>
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
			<div class="text-white/40 text-sm">No data available</div>
		</div>
	{/if}
</div>

<style>
	.tufte-dashboard {
		font-family: var(--font-mono, ui-monospace, monospace);
	}
</style>
