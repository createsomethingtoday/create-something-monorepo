<script lang="ts">
	/**
	 * OUTERFIELDS AI Analytics
	 *
	 * Showcases AI-powered content strategy assistant that helps creators
	 * understand their analytics and generate content ideas
	 */
	import { MessageSquare, Sparkles, TrendingUp, Lightbulb, Brain, BarChart3 } from 'lucide-svelte';

	interface Feature {
		icon: any;
		title: string;
		description: string;
	}

	const features: Feature[] = [
		{
			icon: MessageSquare,
			title: 'Ask in plain English',
			description: 'No dashboards to decipher. Just ask "Why is this video performing well?" and get clear answers.'
		},
		{
			icon: TrendingUp,
			title: 'Already knows your data',
			description: 'The AI sees your views, watch time, and traffic sources. It connects the dots so you don\'t have to.'
		},
		{
			icon: Lightbulb,
			title: 'Suggests what to make next',
			description: 'Stuck on ideas? Ask what your audience wants. Get specific topics based on what\'s already working.'
		}
	];

	const sampleQuestions = [
		'Why is this video getting more views than others?',
		'What should I make next based on these analytics?',
		'How can I improve audience retention?',
		'Where is my traffic coming from?'
	];
</script>

<section class="ai-analytics-section" id="ai-analytics">
	<div class="ai-analytics-container">
		<div class="section-header">
			<span class="section-badge">
				<Sparkles size={12} />
				AI-Powered
			</span>
			<h2 class="section-title">Ask Your Analytics Anything</h2>
			<p class="section-description">
				Tired of staring at charts wondering what they mean? Just ask. Our AI reads your analytics and helps you understand what's working—and what to create next.
			</p>
		</div>

		<div class="features-grid">
			{#each features as feature}
				<div class="feature-card">
					<span class="feature-icon">
						<svelte:component this={feature.icon} size={24} />
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
						<div class="stat-item">
							<span class="stat-value">2.4M</span>
							<span class="stat-label">Views</span>
						</div>
						<div class="stat-item">
							<span class="stat-value">24.8%</span>
							<span class="stat-label">Engagement</span>
						</div>
						<div class="stat-item">
							<span class="stat-value">4m 32s</span>
							<span class="stat-label">Avg Watch</span>
						</div>
					</div>
				</div>

				<div class="conversation-preview">
					<div class="sample-questions">
						<span class="questions-label">Try asking:</span>
						{#each sampleQuestions as question}
							<button class="sample-question">
								<MessageSquare size={14} />
								{question}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<div class="demo-cta">
				<p class="demo-cta-text">
					This is already built into every video's analytics. No extra cost, no setup—just click and ask.
				</p>
				<a href="/admin-demo" class="btn-secondary">
					Try It Now
				</a>
			</div>
		</div>
	</div>
</section>

<style>
	.ai-analytics-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
		position: relative;
		overflow: hidden;
	}

	/* Subtle gradient background */
	.ai-analytics-section::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 64rem;
		height: 100%;
		background: radial-gradient(
			ellipse at top,
			rgba(255, 255, 255, 0.03) 0%,
			transparent 50%
		);
		pointer-events: none;
	}

	.ai-analytics-container {
		max-width: 72rem;
		margin: 0 auto;
		position: relative;
		z-index: 1;
	}

	.section-header {
		text-align: center;
		margin-bottom: 4rem;
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

	.stat-item {
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	.stat-label {
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

	@media (max-width: 1024px) {
		.features-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.chat-preview {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.analytics-stats {
			grid-template-columns: 1fr;
		}
	}
</style>
