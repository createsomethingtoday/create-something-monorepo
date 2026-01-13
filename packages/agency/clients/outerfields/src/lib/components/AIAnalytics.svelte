<script lang="ts">
	/**
	 * OUTERFIELDS AI Analytics
	 *
	 * Showcases AI-powered content strategy assistant that helps creators
	 * understand their analytics and generate content ideas.
	 *
	 * Props:
	 * - `forceUnlocked`: bypass membership gating (for presentation/demo use)
	 * - `interactive`: when false, uses canned responses (no network calls)
	 */
	import { MessageSquare, Sparkles, TrendingUp, Lightbulb, Brain, BarChart3, Loader2, RotateCcw, Lock } from 'lucide-svelte';
	import { authStore } from '$lib/stores/auth';

	interface Props {
		forceUnlocked?: boolean;
		interactive?: boolean;
	}

	let { forceUnlocked = false, interactive = true }: Props = $props();

	const isMember = $derived(forceUnlocked ? true : ($authStore.user?.membership ?? false));

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

	// Demo analytics context
	const demoAnalytics = {
		title: 'Creator Masterclass: Building Your Audience',
		views: '2.4M',
		engagement: '24.8%',
		avgWatch: '4m 32s'
	};

	// Interactive state
	let selectedQuestion = $state<string | null>(null);
	let response = $state<string | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	async function askQuestion(question: string) {
		if (!isMember) {
			document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
			return;
		}

		selectedQuestion = question;
		isLoading = true;
		response = null;
		error = null;

		if (!interactive) {
			// Presentation mode: no network calls, show a representative response.
			await new Promise((r) => setTimeout(r, 350));
			response =
				`Your audience is re-watching the first 30 seconds and dropping around 1:10. ` +
				`Try a tighter hook, move the payoff earlier, and publish a short cut that points back to the full episode.`;
			isLoading = false;
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
				response = data.message;
			} else {
				error = data.error || 'Something went wrong. Please try again.';
			}
		} catch (err) {
			error = 'Failed to connect. Please try again.';
			console.error('Analytics chat error:', err);
		} finally {
			isLoading = false;
		}
	}

	function resetChat() {
		selectedQuestion = null;
		response = null;
		error = null;
	}
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

			<div class="chat-preview" class:blurred={!isMember}>
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
					{#if !selectedQuestion}
						<!-- Initial state: show sample questions -->
						<div class="sample-questions">
							<span class="questions-label">Try asking:</span>
							{#each sampleQuestions as question}
								<button
									class="sample-question"
									onclick={() => askQuestion(question)}
								>
									<MessageSquare size={14} />
									{question}
								</button>
							{/each}
						</div>
					{:else}
						<!-- Active state: show selected question and response -->
						<div class="chat-active">
							<div class="user-message">
								<MessageSquare size={14} />
								<span>{selectedQuestion}</span>
							</div>

							{#if isLoading}
								<div class="ai-response loading">
									<div class="typing-indicator">
										<Loader2 size={16} class="spinner" />
										<span>Claude is thinking...</span>
									</div>
								</div>
							{:else if error}
								<div class="ai-response error">
									<span>{error}</span>
								</div>
							{:else if response}
								<div class="ai-response">
									<div class="response-header">
										<Brain size={14} />
										<span>Claude</span>
									</div>
									<p class="response-text">{response}</p>
								</div>
							{/if}

							{#if !isLoading}
								<button class="reset-button" onclick={resetChat}>
									<RotateCcw size={14} />
									Ask another question
								</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			{#if !isMember}
				<div class="members-overlay">
					<div class="overlay-content">
						<div class="overlay-icon" aria-hidden="true">
							<Lock size={44} />
						</div>
						<h4 class="overlay-title">Members Only</h4>
						<p class="overlay-description">
							Unlock the AI assistant and full analytics tooling with the $99 lifetime membership.
						</p>
						<a href="#pricing" class="overlay-cta">Unlock Lifetime Access - $99</a>
					</div>
				</div>
			{/if}

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
		position: relative;
	}

	.chat-preview.blurred {
		filter: blur(8px);
		pointer-events: none;
		user-select: none;
	}

	.members-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(8px);
		background: rgba(0, 0, 0, 0.7);
		border-radius: 1rem;
		z-index: 10;
	}

	.members-overlay .overlay-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		max-width: 28rem;
		padding: 2rem;
	}

	.members-overlay .overlay-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.members-overlay .overlay-title {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.members-overlay .overlay-description {
		margin: 0 0 1.5rem;
		color: var(--color-fg-muted);
		line-height: 1.6;
	}

	.members-overlay .overlay-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.875rem 1.5rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-md);
		font-weight: 700;
		text-decoration: none;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.members-overlay .overlay-cta:hover {
		transform: translateY(-2px);
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

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
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
