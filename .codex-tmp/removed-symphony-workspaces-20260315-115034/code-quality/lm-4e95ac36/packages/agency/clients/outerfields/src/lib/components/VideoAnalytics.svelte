<script lang="ts">
	/**
	 * VideoAnalytics Component
	 *
	 * Displays view data and engagement metrics on the watch page.
	 * - View count with live updates
	 * - Engagement heatmap visualization
	 * - Watch time statistics
	 * - Members see detailed analytics
	 */
	import { Eye, TrendingUp, Users, Clock, BarChart3 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { videoStats } from '$lib/stores/videoStats';
	import { engagementStats } from '$lib/stores/engagementStats';
	import { authStore } from '$lib/stores/auth';

	interface Props {
		videoId: string;
		publishedAt?: string;
	}

	let { videoId, publishedAt }: Props = $props();

	const isMember = $derived($authStore.user?.membership ?? false);
	const viewCount = $derived($videoStats.views[videoId] ?? 0);
	const engagementData = $derived($engagementStats.data[videoId] ?? []);
	const isLive = $derived($videoStats.isLive);

	// Calculate engagement metrics from heatmap data
	const peakEngagement = $derived(
		engagementData.length > 0 ? Math.max(...engagementData) : 0
	);
	const avgEngagement = $derived(
		engagementData.length > 0
			? engagementData.reduce((a, b) => a + b, 0) / engagementData.length
			: 0
	);

	// Find "Most Replayed" section
	const mostReplayedIndex = $derived(
		engagementData.length > 0 ? engagementData.indexOf(peakEngagement) : -1
	);
	const mostReplayedPercent = $derived(
		engagementData.length > 0 ? Math.round((mostReplayedIndex / engagementData.length) * 100) : 0
	);

	function formatViews(views: number): string {
		if (views >= 1000000) {
			return `${(views / 1000000).toFixed(1)}M`;
		}
		if (views >= 1000) {
			return `${(views / 1000).toFixed(1)}K`;
		}
		return views.toLocaleString();
	}

	function formatDate(dateStr?: string): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getRelativeTime(dateStr?: string): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
		return `${Math.floor(diffDays / 365)} years ago`;
	}

	// Generate mini SVG sparkline for engagement
	function generateSparkline(data: number[]): string {
		if (data.length === 0) return '';
		const width = 100;
		const height = 24;
		const step = width / (data.length - 1 || 1);

		let path = '';
		data.forEach((value, i) => {
			const x = i * step;
			const y = height - value * height * 0.9;
			path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
		});

		return path;
	}

	onMount(() => {
		// Start polling for live stats
		videoStats.startPolling(15000);

		return () => {
			videoStats.stopPolling();
		};
	});
</script>

<div class="video-analytics">
	<!-- Basic stats (visible to all) -->
	<div class="stats-row">
		<div class="stat-item">
			<Eye size={16} />
			<span class="stat-value">{formatViews(viewCount)}</span>
			<span class="stat-label">views</span>
			{#if isLive}
				<span class="live-indicator" title="Real-time data"></span>
			{/if}
		</div>

		{#if publishedAt}
			<div class="stat-item">
				<Clock size={16} />
				<span class="stat-value">{getRelativeTime(publishedAt)}</span>
			</div>
		{/if}
	</div>

	<!-- Engagement metrics (members see more detail) -->
	{#if engagementData.length > 0}
		<div class="engagement-section">
			<div class="engagement-header">
				<BarChart3 size={14} />
				<span>Engagement</span>
			</div>

			{#if isMember}
				<!-- Detailed metrics for members -->
				<div class="engagement-details">
					<div class="engagement-stat">
						<TrendingUp size={14} />
						<span class="engagement-label">Peak</span>
						<span class="engagement-value">{Math.round(peakEngagement * 100)}%</span>
					</div>
					<div class="engagement-stat">
						<Users size={14} />
						<span class="engagement-label">Avg</span>
						<span class="engagement-value">{Math.round(avgEngagement * 100)}%</span>
					</div>
					{#if mostReplayedIndex >= 0}
						<div class="engagement-stat highlight">
							<span class="engagement-label">Most Replayed</span>
							<span class="engagement-value">at {mostReplayedPercent}%</span>
						</div>
					{/if}
				</div>

				<!-- Mini sparkline chart -->
				<div class="sparkline-container">
					<svg class="sparkline" viewBox="0 0 100 24" preserveAspectRatio="none">
						<path
							d={generateSparkline(engagementData)}
							fill="none"
							stroke="var(--color-brand)"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</div>
			{:else}
				<!-- Limited view for non-members -->
				<div class="engagement-preview">
					<div class="engagement-stat">
						<span class="engagement-label">Engagement Score</span>
						<span class="engagement-value">{Math.round(avgEngagement * 100)}%</span>
					</div>
					<p class="member-cta">
						<a href="#pricing">Become a member</a> for detailed analytics
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.video-analytics {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	/* Stats row */
	.stats-row {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		flex-wrap: wrap;
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--color-fg-muted);
		font-size: 0.875rem;
	}

	.stat-item :global(svg) {
		color: var(--color-fg-subtle);
	}

	.stat-value {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.stat-label {
		color: var(--color-fg-subtle);
	}

	.live-indicator {
		width: 6px;
		height: 6px;
		background: var(--color-success);
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Engagement section */
	.engagement-section {
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.engagement-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-sm);
	}

	.engagement-details {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
		margin-bottom: var(--space-sm);
	}

	.engagement-stat {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
	}

	.engagement-stat :global(svg) {
		color: var(--color-fg-subtle);
	}

	.engagement-stat.highlight {
		padding: 0.25rem 0.5rem;
		background: var(--color-brand-muted);
		border-radius: var(--radius-sm);
	}

	.engagement-stat.highlight .engagement-label,
	.engagement-stat.highlight .engagement-value {
		color: var(--color-brand);
	}

	.engagement-label {
		color: var(--color-fg-muted);
	}

	.engagement-value {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	/* Sparkline */
	.sparkline-container {
		height: 24px;
		margin-top: var(--space-xs);
	}

	.sparkline {
		width: 100%;
		height: 100%;
	}

	/* Non-member preview */
	.engagement-preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.member-cta {
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
		margin: 0;
	}

	.member-cta a {
		color: var(--color-brand);
		text-decoration: none;
	}

	.member-cta a:hover {
		text-decoration: underline;
	}

	/* Responsive */
	@media (max-width: 480px) {
		.video-analytics {
			padding: var(--space-sm);
		}

		.stats-row {
			gap: var(--space-md);
		}

		.engagement-details {
			flex-direction: column;
			gap: var(--space-xs);
		}
	}
</style>
