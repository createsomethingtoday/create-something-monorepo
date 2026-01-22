<script lang="ts">
	/**
	 * OUTERFIELDS Analytics Dashboard
	 *
	 * Showcases comprehensive analytics capabilities for PCN clients.
	 * No gating - full visibility into what every PCN includes.
	 */
	import { BarChart3, TrendingUp, Users } from 'lucide-svelte';

	interface Props {
		interactive?: boolean;
	}

	let { interactive = true }: Props = $props();

	interface DashboardData {
		videoEngagement?: {
			totalViews: number;
			avgWatchTime: string;
			topVideo: string;
		};
		instagram?: {
			followers: number;
			engagement: number;
			recentPosts: number;
		};
		youtube?: {
			subscribers: number;
			views: number;
			avgViews: number;
		};
		clickup?: {
			activeTasks: number;
			completedToday: number;
			progress: number;
		};
	}

	let data = $state<DashboardData>({});
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Fetch analytics data
	async function fetchAnalytics() {

		if (!interactive) {
			// Presentation mode: avoid network calls; show representative mock data.
			data = {
				videoEngagement: {
					totalViews: 12547,
					avgWatchTime: '4m 32s',
					topVideo: 'Episode 1: The Beginning'
				},
				instagram: { followers: 8200, engagement: 4.8, recentPosts: 12 },
				youtube: { subscribers: 3100, views: 42000, avgViews: 1200 },
				clickup: { activeTasks: 23, completedToday: 7, progress: 64 }
			};
			loading = false;
			return;
		}

		try {
			const [clickupRes, instagramRes, youtubeRes] = await Promise.allSettled([
				fetch('/api/analytics/clickup'),
				fetch('/api/analytics/instagram'),
				fetch('/api/analytics/youtube')
			]);

			const newData: DashboardData = {};

			// ClickUp data
			if (clickupRes.status === 'fulfilled' && clickupRes.value.ok) {
				const clickup = await clickupRes.value.json();
				if (clickup.success) {
					newData.clickup = clickup.data;
				}
			}

			// Instagram data
			if (instagramRes.status === 'fulfilled' && instagramRes.value.ok) {
				const instagram = await instagramRes.value.json();
				if (instagram.success) {
					newData.instagram = instagram.data;
				}
			}

			// YouTube data
			if (youtubeRes.status === 'fulfilled' && youtubeRes.value.ok) {
				const youtube = await youtubeRes.value.json();
				if (youtube.success) {
					newData.youtube = youtube.data;
				}
			}

			// Mock video engagement data (would come from platform analytics)
			newData.videoEngagement = {
				totalViews: 12547,
				avgWatchTime: '4m 32s',
				topVideo: 'Crew Call Ep 1: The Beginning'
			};

			data = newData;
		} catch (err) {
			console.error('Analytics fetch error:', err);
			error = 'Failed to load analytics';
		} finally {
			loading = false;
		}
	}

	// Fetch on mount
	$effect(() => {
		fetchAnalytics();
	});
</script>

<section class="analytics-dashboard-section" id="analytics">
	<div class="analytics-container">
		<div class="section-header">
			<span class="section-badge">
				<BarChart3 size={12} />
				Built-In Analytics
			</span>
			<h2 class="section-title">Comprehensive Insights</h2>
			<p class="section-description">
				Every PCN includes real-time analytics. Video engagement, social metrics, and project progress—all in one dashboard.
			</p>
		</div>

		<div class="dashboard-wrapper">
			{#if loading}
				<div class="loading-state">
					<div class="spinner"></div>
					<p>Loading analytics...</p>
				</div>
			{:else if error}
				<div class="error-state">
					<p>{error}</p>
				</div>
			{:else}
				<div class="metrics-grid">
					<!-- Video Engagement -->
					<div class="metric-card">
						<div class="metric-header">
							<TrendingUp size={20} />
							<h3>Video Engagement</h3>
						</div>
						<div class="metric-stats">
							<div class="stat-primary">
								<span class="stat-value">{data.videoEngagement?.totalViews?.toLocaleString() ?? '12.5K'}</span>
								<span class="stat-label">Total Views</span>
							</div>
							<div class="stat-secondary">
								<div class="stat-item">
									<span class="stat-value">{data.videoEngagement?.avgWatchTime ?? '4m 32s'}</span>
									<span class="stat-label">Avg Watch Time</span>
								</div>
								<div class="stat-item">
									<span class="stat-value">73%</span>
									<span class="stat-label">Completion Rate</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Instagram -->
					<div class="metric-card">
						<div class="metric-header">
							<Users size={20} />
							<h3>Instagram</h3>
						</div>
						<div class="metric-stats">
							<div class="stat-primary">
								<span class="stat-value">{data.instagram?.followers?.toLocaleString() ?? '8.2K'}</span>
								<span class="stat-label">Followers</span>
							</div>
							<div class="stat-secondary">
								<div class="stat-item">
									<span class="stat-value">{data.instagram?.engagement ?? '4.8'}%</span>
									<span class="stat-label">Engagement</span>
								</div>
								<div class="stat-item">
									<span class="stat-value">{data.instagram?.recentPosts ?? 12}</span>
									<span class="stat-label">Recent Posts</span>
								</div>
							</div>
						</div>
					</div>

					<!-- YouTube -->
					<div class="metric-card">
						<div class="metric-header">
							<BarChart3 size={20} />
							<h3>YouTube</h3>
						</div>
						<div class="metric-stats">
							<div class="stat-primary">
								<span class="stat-value">{data.youtube?.subscribers?.toLocaleString() ?? '3.1K'}</span>
								<span class="stat-label">Subscribers</span>
							</div>
							<div class="stat-secondary">
								<div class="stat-item">
									<span class="stat-value">{data.youtube?.views?.toLocaleString() ?? '42K'}</span>
									<span class="stat-label">Total Views</span>
								</div>
								<div class="stat-item">
									<span class="stat-value">{data.youtube?.avgViews?.toLocaleString() ?? '1.2K'}</span>
									<span class="stat-label">Avg Views</span>
								</div>
							</div>
						</div>
					</div>

					<!-- ClickUp Tasks -->
					<div class="metric-card">
						<div class="metric-header">
							<TrendingUp size={20} />
							<h3>Project Progress</h3>
						</div>
						<div class="metric-stats">
							<div class="stat-primary">
								<span class="stat-value">{data.clickup?.activeTasks ?? 23}</span>
								<span class="stat-label">Active Tasks</span>
							</div>
							<div class="stat-secondary">
								<div class="stat-item">
									<span class="stat-value">{data.clickup?.completedToday ?? 7}</span>
									<span class="stat-label">Completed Today</span>
								</div>
								<div class="stat-item">
									<span class="stat-value">{data.clickup?.progress ?? 64}%</span>
									<span class="stat-label">Sprint Progress</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Analytics Chatbot Tease -->
				<div class="chatbot-tease">
					<div class="chatbot-icon">
						<BarChart3 size={24} />
					</div>
					<div class="chatbot-content">
						<h3>Ask Your Analytics Anything</h3>
						<p>Chat with your data. Ask questions in plain English and get instant insights powered by AI.</p>
					</div>
					<a href="#ai-analytics" class="chatbot-cta">
						Learn More
					</a>
				</div>
			{/if}
		</div>
	</div>
</section>

<style>
	.analytics-dashboard-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
		position: relative;
	}

	.analytics-container {
		max-width: var(--container-max-width);
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.section-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.section-title {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.section-description {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		max-width: 42rem;
		margin: 0 auto;
		line-height: 1.7;
	}

	.dashboard-wrapper {
		position: relative;
	}

	.dashboard-wrapper.blurred > :not(.members-overlay) {
		filter: blur(8px);
		pointer-events: none;
		user-select: none;
	}

	/* Tufte: Single row of 4, high data-ink ratio, minimal decoration */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.metric-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		padding: 1.25rem;
	}

	.metric-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.metric-header :global(svg) {
		color: var(--color-fg-muted);
		opacity: 0.7;
	}

	.metric-header h3 {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0;
	}

	.metric-stats {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.stat-primary {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.stat-primary .stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.stat-primary .stat-label {
		font-size: 0.625rem;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-secondary {
		display: flex;
		gap: 1.5rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.stat-item .stat-value {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		font-variant-numeric: tabular-nums;
	}

	.stat-item .stat-label {
		font-size: 0.5625rem;
		color: var(--color-fg-subtle);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-footer {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border-default);
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.chatbot-tease {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
	}

	.chatbot-icon {
		width: 4rem;
		height: 4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		flex-shrink: 0;
	}

	.chatbot-content {
		flex: 1;
	}

	.chatbot-content h3 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.chatbot-content p {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1.6;
	}

	.chatbot-cta {
		padding: 0.75rem 1.5rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		text-decoration: none;
		white-space: nowrap;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.chatbot-cta:hover {
		background: var(--color-hover);
		border-color: var(--color-fg-primary);
	}

	/* Members Only Overlay */
	.members-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(8px);
		background: rgba(0, 0, 0, 0.7);
		border-radius: var(--radius-lg);
		z-index: 10;
	}

	.overlay-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		max-width: 28rem;
		padding: 2rem;
	}

	.overlay-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.overlay-content h3 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 1rem 0 0.5rem;
	}

	.overlay-content p {
		font-size: 1rem;
		color: var(--color-fg-muted);
		line-height: 1.6;
		margin: 0 0 2rem;
	}

	.unlock-btn {
		display: inline-block;
		padding: 1rem 2rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-md);
		font-size: 1rem;
		font-weight: 700;
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.unlock-btn:hover {
		background: var(--color-fg-secondary);
		transform: translateY(-2px);
	}

	.loading-state,
	.error-state {
		padding: 4rem 2rem;
		text-align: center;
		color: var(--color-fg-muted);
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid var(--color-border-default);
		border-top-color: var(--color-fg-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@media (max-width: 1100px) {
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.chatbot-tease {
			flex-direction: column;
			text-align: center;
		}

		.chatbot-cta {
			width: 100%;
		}
	}
</style>
