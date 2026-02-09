<script lang="ts">
	/**
	 * OUTERFIELDS Insights & Analytics
	 *
	 * Unified section merging AnalyticsDashboard (metrics grid) and AIAnalytics
	 * (AI-powered chat interface) into a single cohesive experience.
	 *
	 * Props:
	 * - `interactive`: when false, uses mock data / canned responses (no network calls)
	 * - `forceUnlocked`: kept for backward compatibility (deprecated, no longer used)
	 */
	import {
		BarChart3,
		Brain,
		Lightbulb,
		Loader2,
		MessageSquare,
		RotateCcw,
		Sparkles,
		TrendingUp,
		Users
	} from 'lucide-svelte';

	interface Props {
		interactive?: boolean;
		/** @deprecated No longer used — kept for backward compatibility. */
		forceUnlocked?: boolean;
	}

	let { interactive = true, forceUnlocked = false }: Props = $props();

	// ─── Dashboard Metrics (from AnalyticsDashboard) ─────────────────────────

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

	let dashboardData = $state<DashboardData>({});
	let dashboardLoading = $state(true);
	let dashboardError = $state<string | null>(null);

	async function fetchAnalytics() {
		if (!interactive) {
			dashboardData = {
				videoEngagement: {
					totalViews: 12547,
					avgWatchTime: '4m 32s',
					topVideo: 'Episode 1: The Beginning'
				},
				instagram: { followers: 8200, engagement: 4.8, recentPosts: 12 },
				youtube: { subscribers: 3100, views: 42000, avgViews: 1200 },
				clickup: { activeTasks: 23, completedToday: 7, progress: 64 }
			};
			dashboardLoading = false;
			return;
		}

		try {
			const [clickupRes, instagramRes, youtubeRes] = await Promise.allSettled([
				fetch('/api/analytics/clickup'),
				fetch('/api/analytics/instagram'),
				fetch('/api/analytics/youtube')
			]);

			const newData: DashboardData = {};

			if (clickupRes.status === 'fulfilled' && clickupRes.value.ok) {
				const clickup = await clickupRes.value.json();
				if (clickup.success) {
					newData.clickup = clickup.data;
				}
			}

			if (instagramRes.status === 'fulfilled' && instagramRes.value.ok) {
				const instagram = await instagramRes.value.json();
				if (instagram.success) {
					newData.instagram = instagram.data;
				}
			}

			if (youtubeRes.status === 'fulfilled' && youtubeRes.value.ok) {
				const youtube = await youtubeRes.value.json();
				if (youtube.success) {
					newData.youtube = youtube.data;
				}
			}

			newData.videoEngagement = {
				totalViews: 12547,
				avgWatchTime: '4m 32s',
				topVideo: 'Crew Call Ep 1: The Beginning'
			};

			dashboardData = newData;
		} catch (err) {
			console.error('Analytics fetch error:', err);
			dashboardError = 'Failed to load analytics';
		} finally {
			dashboardLoading = false;
		}
	}

	$effect(() => {
		fetchAnalytics();
	});

	// ─── AI Chat (from AIAnalytics) ──────────────────────────────────────────

	interface Feature {
		icon: any;
		title: string;
		description: string;
	}

	const features: Feature[] = [
		{
			icon: MessageSquare,
			title: 'Ask in plain English',
			description:
				'No dashboards to decipher. Just ask "Why is this video performing well?" and get clear answers.'
		},
		{
			icon: TrendingUp,
			title: 'Already knows your data',
			description:
				"The AI sees your views, watch time, and traffic sources. It connects the dots so you don't have to."
		},
		{
			icon: Lightbulb,
			title: 'Suggests what to make next',
			description:
				"Stuck on ideas? Ask what your audience wants. Get specific topics based on what's already working."
		}
	];

	const sampleQuestions = [
		'Why is this video getting more views than others?',
		'What should I make next based on these analytics?',
		'How can I improve audience retention?',
		'Where is my traffic coming from?'
	];

	const demoAnalytics = {
		title: 'Creator Masterclass: Building Your Audience',
		views: '2.4M',
		engagement: '24.8%',
		avgWatch: '4m 32s'
	};

	let selectedQuestion = $state<string | null>(null);
	let chatResponse = $state<string | null>(null);
	let chatLoading = $state(false);
	let chatError = $state<string | null>(null);

	async function askQuestion(question: string) {
		selectedQuestion = question;
		chatLoading = true;
		chatResponse = null;
		chatError = null;

		if (!interactive) {
			await new Promise((r) => setTimeout(r, 350));
			chatResponse =
				`Your audience is re-watching the first 30 seconds and dropping around 1:10. ` +
				`Try a tighter hook, move the payoff earlier, and publish a short cut that points back to the full episode.`;
			chatLoading = false;
			return;
		}

		try {
			const res = await fetch('/api/analytics-chat-claude', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: question,
					videoAnalytics: demoAnalytics
				})
			});

			const data = await res.json();

			if (data.success) {
				chatResponse = data.message;
			} else {
				chatError = data.error || 'Something went wrong. Please try again.';
			}
		} catch (err) {
			chatError = 'Failed to connect. Please try again.';
			console.error('Analytics chat error:', err);
		} finally {
			chatLoading = false;
		}
	}

	function resetChat() {
		selectedQuestion = null;
		chatResponse = null;
		chatError = null;
	}
</script>

<section class="insights-section" id="analytics">
	<div class="insights-container">
		<!-- Unified Header -->
		<div class="section-header">
			<span class="section-badge">
				<Sparkles size={12} />
				AI-Powered
			</span>
			<h2 class="section-title">Comprehensive Insights</h2>
			<p class="section-description">
				Every PCN includes real-time analytics and an AI-powered assistant. Video engagement,
				social metrics, project progress—plus the ability to ask your data questions in plain
				English and get instant, actionable answers.
			</p>
		</div>

		<!-- ═══ Top Half: Dashboard Metrics Grid ═══ -->
		<div class="dashboard-wrapper">
			{#if dashboardLoading}
				<div class="loading-state">
					<div class="spinner"></div>
					<p>Loading analytics...</p>
				</div>
			{:else if dashboardError}
				<div class="error-state">
					<p>{dashboardError}</p>
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
								<span class="stat-value"
									>{dashboardData.videoEngagement?.totalViews?.toLocaleString() ?? '12.5K'}</span
								>
								<span class="stat-label">Total Views</span>
							</div>
							<div class="stat-secondary">
								<div class="stat-item">
									<span class="stat-value"
										>{dashboardData.videoEngagement?.avgWatchTime ?? '4m 32s'}</span
									>
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
								<span class="stat-value"
									>{dashboardData.instagram?.followers?.toLocaleString() ?? '8.2K'}</span
								>
								<span class="stat-label">Followers</span>
							</div>
							<div class="stat-secondary">
								<div class="stat-item">
									<span class="stat-value"
										>{dashboardData.instagram?.engagement ?? '4.8'}%</span
									>
									<span class="stat-label">Engagement</span>
								</div>
								<div class="stat-item">
									<span class="stat-value">{dashboardData.instagram?.recentPosts ?? 12}</span
									>
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
								<span class="stat-value"
									>{dashboardData.youtube?.subscribers?.toLocaleString() ?? '3.1K'}</span
								>
								<span class="stat-label">Subscribers</span>
							</div>
							<div class="stat-secondary">
								<div class="stat-item">
									<span class="stat-value"
										>{dashboardData.youtube?.views?.toLocaleString() ?? '42K'}</span
									>
									<span class="stat-label">Total Views</span>
								</div>
								<div class="stat-item">
									<span class="stat-value"
										>{dashboardData.youtube?.avgViews?.toLocaleString() ?? '1.2K'}</span
									>
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
								<span class="stat-value">{dashboardData.clickup?.activeTasks ?? 23}</span>
								<span class="stat-label">Active Tasks</span>
							</div>
							<div class="stat-secondary">
								<div class="stat-item">
									<span class="stat-value"
										>{dashboardData.clickup?.completedToday ?? 7}</span
									>
									<span class="stat-label">Completed Today</span>
								</div>
								<div class="stat-item">
									<span class="stat-value"
										>{dashboardData.clickup?.progress ?? 64}%</span
									>
									<span class="stat-label">Sprint Progress</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- ═══ Bottom Half: AI Chat Interface ═══ -->
		<div class="ai-section">
			<div class="features-grid">
				{#each features as feature}
					{@const Icon = feature.icon}
					<div class="feature-card">
						<span class="feature-icon">
							<Icon size={24} />
						</span>
						<h3 class="feature-title">{feature.title}</h3>
						<p class="feature-description">{feature.description}</p>
					</div>
				{/each}
			</div>

			<div class="demo-preview">
				<div class="demo-header">
					<span class="demo-badge">
						<Brain size={12} />
						Live Example
					</span>
					<h3 class="demo-title">Ask Anything About Your Analytics</h3>
				</div>

				<div class="chat-preview">
					<div class="analytics-panel">
						<div class="analytics-header">
							<BarChart3 size={16} />
							<span>Video Analytics</span>
						</div>
						<div class="analytics-stats">
							<div class="demo-stat-item">
								<span class="demo-stat-value">2.4M</span>
								<span class="demo-stat-label">Views</span>
							</div>
							<div class="demo-stat-item">
								<span class="demo-stat-value">24.8%</span>
								<span class="demo-stat-label">Engagement</span>
							</div>
							<div class="demo-stat-item">
								<span class="demo-stat-value">4m 32s</span>
								<span class="demo-stat-label">Avg Watch</span>
							</div>
						</div>
					</div>

					<div class="conversation-preview">
						{#if !selectedQuestion}
							<div class="sample-questions">
								<span class="questions-label">Try asking:</span>
								{#each sampleQuestions as question}
									<button class="sample-question" onclick={() => askQuestion(question)}>
										<MessageSquare size={14} />
										{question}
									</button>
								{/each}
							</div>
						{:else}
							<div class="chat-active">
								<div class="user-message">
									<MessageSquare size={14} />
									<span>{selectedQuestion}</span>
								</div>

								{#if chatLoading}
									<div class="ai-response loading">
										<div class="typing-indicator">
											<Loader2 size={16} class="spinner" />
											<span>Claude is thinking...</span>
										</div>
									</div>
								{:else if chatError}
									<div class="ai-response error">
										<span>{chatError}</span>
									</div>
								{:else if chatResponse}
									<div class="ai-response">
										<div class="response-header">
											<Brain size={14} />
											<span>Claude</span>
										</div>
										<p class="response-text">{chatResponse}</p>
									</div>
								{/if}

								{#if !chatLoading}
									<button class="reset-button" onclick={resetChat}>
										<RotateCcw size={14} />
										Ask another question
									</button>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<div class="demo-cta">
					<p class="demo-cta-text">
						This is already built into every video's analytics. No extra cost, no setup—just
						click and ask.
					</p>
					<a href="/admin-demo" class="btn-secondary"> Try It Now </a>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	/* ─── Section Shell ─────────────────────────────────────────────────── */

	.insights-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
		position: relative;
		overflow: hidden;
	}

	.insights-section::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 64rem;
		height: 100%;
		background: radial-gradient(ellipse at top, rgba(255, 255, 255, 0.03) 0%, transparent 50%);
		pointer-events: none;
	}

	.insights-container {
		max-width: var(--container-max-width);
		margin: 0 auto;
		position: relative;
		z-index: 1;
	}

	/* ─── Unified Header ────────────────────────────────────────────────── */

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

	/* ─── Dashboard Metrics (Top Half) ──────────────────────────────────── */

	.dashboard-wrapper {
		position: relative;
		margin-bottom: 4rem;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
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
		to {
			transform: rotate(360deg);
		}
	}

	/* ─── AI Chat Interface (Bottom Half) ───────────────────────────────── */

	.ai-section {
		position: relative;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		margin-bottom: 4rem;
	}

	.feature-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 2rem;
		text-align: center;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.feature-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-4px);
	}

	.feature-icon {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		color: var(--color-fg-primary);
	}

	.feature-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.feature-description {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		line-height: 1.6;
		margin: 0;
	}

	/* Demo Preview */

	.demo-preview {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 2rem;
		position: relative;
	}

	.demo-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.demo-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.25rem;
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.demo-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.chat-preview {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.analytics-panel {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		padding: 1.5rem;
	}

	.analytics-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.analytics-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.demo-stat-item {
		text-align: center;
	}

	.demo-stat-value {
		display: block;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	.demo-stat-label {
		display: block;
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.conversation-preview {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		padding: 1.5rem;
	}

	.sample-questions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.questions-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.25rem;
	}

	.sample-question {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		text-align: left;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.sample-question:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	/* Interactive chat state */

	.chat-active {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
	}

	.user-message {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-fg-primary);
	}

	.ai-response {
		flex: 1;
		padding: 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		min-height: 120px;
	}

	.ai-response.loading {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ai-response.error {
		border-color: var(--color-error-border);
		background: var(--color-error-muted);
		color: var(--color-error);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.typing-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-fg-muted);
		font-size: 0.875rem;
	}

	.typing-indicator :global(.spinner) {
		animation: spin 1s linear infinite;
	}

	.response-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.response-text {
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin: 0;
		white-space: pre-wrap;
	}

	.reset-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		color: var(--color-fg-muted);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.reset-button:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.demo-cta {
		text-align: center;
		padding-top: 2rem;
		border-top: 1px solid var(--color-border-default);
	}

	.demo-cta-text {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0 0 1rem;
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		text-decoration: none;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-secondary:hover {
		background: var(--color-hover);
		border-color: var(--color-fg-primary);
	}

	/* ─── Responsive ────────────────────────────────────────────────────── */

	@media (max-width: 1100px) {
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 1024px) {
		.features-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.chat-preview {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.analytics-stats {
			grid-template-columns: 1fr;
		}
	}
</style>
