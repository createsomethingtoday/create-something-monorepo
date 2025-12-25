<script lang="ts">
	/**
	 * UserInteractionsPanel Component
	 *
	 * Tufte-style visualization of user interactions across CREATE SOMETHING properties.
	 * Philosophy: The visualization recedes; insight emerges.
	 *
	 * Implements Tufte's principles:
	 * - Maximize data-ink ratio (no decoration without information)
	 * - Show variation, not static values (sparklines, distributions)
	 * - Integrate text and data (no separate legends where possible)
	 * - High data density (compact, information-rich display)
	 */

	import {
		Sparkline,
		MetricCard,
		DistributionBar,
		HighDensityTable
	} from '@create-something/tufte';
	import type { UserAnalytics, DailyActivityPoint, Property } from './types.js';

	interface Props {
		/** Aggregated user analytics data */
		analytics: UserAnalytics | null;
		/** Whether data is currently loading */
		loading?: boolean;
		/** Whether user has opted out of analytics */
		optedOut?: boolean;
	}

	let { analytics = null, loading = false, optedOut = false }: Props = $props();

	// Property labels for display
	const propertyLabels: Record<Property, string> = {
		space: '.space',
		io: '.io',
		agency: '.agency',
		ltd: '.ltd',
		lms: '.lms'
	};

	// Transform property breakdown for DistributionBar
	function getPropertySegments(breakdown: UserAnalytics['propertyBreakdown']) {
		return breakdown
			.filter((p) => p.timeMinutes > 0)
			.map((p) => ({
				label: propertyLabels[p.property],
				count: p.timeMinutes
			}));
	}

	// Transform top pages for HighDensityTable
	function getTopPagesItems(pages: UserAnalytics['topPages']) {
		return pages.map((p) => ({
			label: p.url,
			count: p.views,
			badge: propertyLabels[p.property]
		}));
	}

	// Transform daily activity for Sparkline
	function getSparklineData(activity: DailyActivityPoint[]) {
		return activity.map((d) => ({ value: d.count }));
	}

	// Reactive computations
	$: propertySegments = analytics ? getPropertySegments(analytics.propertyBreakdown) : [];
	$: topPagesItems = analytics ? getTopPagesItems(analytics.topPages) : [];
	$: sparklineData = analytics ? getSparklineData(analytics.dailyActivity) : [];
	$: hasActivity = analytics && analytics.totalSessions > 0;
</script>

{#if optedOut}
	<div class="opted-out">
		<p class="message">Analytics tracking is disabled.</p>
		<p class="hint">Enable it in Privacy settings to see your activity patterns.</p>
	</div>
{:else if loading}
	<div class="loading">
		<p>Loading your activity...</p>
	</div>
{:else if analytics && hasActivity}
	<div class="interactions-panel">
		<!-- Summary Metrics Row -->
		<div class="metrics-grid">
			<MetricCard
				label="Sessions"
				value={analytics.totalSessions}
				trend={sparklineData}
				context="across all properties"
			/>
			<MetricCard label="Page Views" value={analytics.totalPageViews} />
			<MetricCard
				label="Time Spent"
				value={analytics.totalTimeMinutes}
				context="minutes"
			/>
		</div>

		<!-- Activity Trend -->
		{#if sparklineData.length > 0}
			<section class="section">
				<h3 class="section-title">Activity (Last 30 Days)</h3>
				<div class="sparkline-container">
					<Sparkline data={sparklineData} width={300} height={48} showFill={true} />
				</div>
			</section>
		{/if}

		<!-- Property Distribution -->
		{#if propertySegments.length > 0}
			<section class="section">
				<h3 class="section-title">Where You Spend Time</h3>
				<DistributionBar segments={propertySegments} height="h-6" />
			</section>
		{/if}

		<!-- Top Pages -->
		{#if topPagesItems.length > 0}
			<section class="section">
				<h3 class="section-title">Most Visited</h3>
				<HighDensityTable
					items={topPagesItems}
					labelKey="label"
					countKey="count"
					badgeKey="badge"
					limit={5}
					showRank={true}
					showPercentage={false}
					hideRankOnMobile={true}
				/>
			</section>
		{/if}
	</div>
{:else}
	<div class="no-data">
		<p class="message">No activity recorded yet.</p>
		<p class="hint">Start exploring CREATE SOMETHING properties to see your patterns here.</p>
	</div>
{/if}

<style>
	.interactions-panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: var(--space-md);
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.section-title {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.sparkline-container {
		height: 48px;
		width: 100%;
		max-width: 300px;
	}

	.opted-out,
	.loading,
	.no-data {
		padding: var(--space-lg);
		text-align: center;
		color: var(--color-fg-tertiary);
	}

	.message {
		font-size: var(--text-body);
		margin: 0 0 var(--space-xs) 0;
		color: var(--color-fg-secondary);
	}

	.hint {
		font-size: var(--text-body-sm);
		margin: 0;
		color: var(--color-fg-muted);
	}
</style>
