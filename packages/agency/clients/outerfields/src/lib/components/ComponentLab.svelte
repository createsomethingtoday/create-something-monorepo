<script lang="ts">
	/**
	 * OUTERFIELDS Digital Tools
	 *
	 * Platform features with membership gating
	 */
	import { Lock, MessageSquare, Play, BarChart3, Activity, Maximize2, Volume2, Settings, Eye } from 'lucide-svelte';
	import { authStore } from '$lib/stores/auth';

	interface Tool {
		id: string;
		name: string;
		description: string;
		icon: typeof MessageSquare;
		type: 'chatbot' | 'video' | 'heatmap' | 'analytics';
		previewImage?: string;
	}

	const tools: Tool[] = [
		{
			id: 'brand-chatbot',
			name: 'Live Chatbot',
			description: 'AI-powered conversational assistant trained on brand vision, values, and content strategy.',
			icon: MessageSquare,
			type: 'chatbot'
		},
		{
			id: 'cinematic-player',
			name: 'Cinematic Video Player',
			description: 'Professional playback with engagement tracking, 4K quality streaming, and cinematic viewing experience. Full playback requires membership.',
			icon: Play,
			type: 'video'
		},
		{
			id: 'engagement-heatmap',
			name: 'Engagement Heatmap',
			description: 'Real-time viewer engagement visualization with peak detection and analytics overlay.',
			icon: Activity,
			type: 'heatmap'
		},
		{
			id: 'analytics-metrics',
			name: 'Analytics & Metrics',
			description: 'High-contrast data visualization dashboard with real-time metrics and status indicators.',
			icon: BarChart3,
			type: 'analytics'
		}
	];

	$: isMember = $authStore.authenticated && $authStore.user?.membership;
</script>

<section class="tools-section">
	<div class="tools-container">
		<div class="tools-header">
			<div class="header-content">
				<h2 class="tools-title">Digital Tools</h2>
				<p class="tools-description">Platform features and interactive components. Members get full access.</p>
			</div>
		</div>

		<div class="tools-grid">
			{#each tools as tool}
				<div class="tool-card">
					<div class="card-header">
						<div class="icon-wrapper">
							<svelte:component this={tool.icon} size={20} />
						</div>
						<h3 class="tool-name">{tool.name}</h3>
					</div>

					<div class="card-preview">
						{#if tool.type === 'chatbot'}
							<div class="preview-chatbot">
								<div class="chatbot-mock">
									<div class="chat-message assistant">
										<div class="message-content">What can I help you with today?</div>
									</div>
									<div class="chat-message user">
										<div class="message-content">Tell me about the brand vision</div>
									</div>
									<div class="chat-message assistant">
										<div class="message-content">Outerfields is built on...</div>
									</div>
									<div class="chat-input">
										<div class="input-field"></div>
										<div class="send-button"></div>
									</div>
								</div>
							</div>
						{:else if tool.type === 'video'}
							<div class="preview-video">
								<img
									src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=640&h=360&fit=crop"
									alt="Video preview"
									loading="lazy"
								/>
								<div class="video-gradient"></div>
								
								<!-- Feature callouts -->
								<div class="feature-badges">
									<span class="feature-badge">
										<Eye size={12} />
										<span>Engagement Tracking</span>
									</span>
									<span class="feature-badge">
										<Settings size={12} />
										<span>4K Quality</span>
									</span>
								</div>
								
								<!-- Play button overlay -->
								<div class="play-overlay">
									<div class="play-button-large">
										<Play size={32} />
									</div>
								</div>
								
								<!-- Professional controls bar -->
								<div class="video-controls">
									<button class="control-btn">
										<Play size={16} />
									</button>
									<div class="progress-bar">
										<div class="progress-fill"></div>
										<div class="progress-handle"></div>
									</div>
									<span class="time-display">0:45 / 12:34</span>
									<button class="control-btn">
										<Volume2 size={16} />
									</button>
									<button class="control-btn">
										<Maximize2 size={16} />
									</button>
								</div>
							</div>
						{:else if tool.type === 'heatmap'}
							<div class="preview-heatmap">
								<div class="heatmap-mock">
									<div class="heatmap-header">
										<div class="heatmap-label"></div>
										<div class="heatmap-time">2:34</div>
									</div>
									<div class="heatmap-bars">
										<div class="heatmap-bar" style="--height: 30%"></div>
										<div class="heatmap-bar" style="--height: 45%"></div>
										<div class="heatmap-bar peak" style="--height: 90%"></div>
										<div class="heatmap-bar" style="--height: 75%"></div>
										<div class="heatmap-bar" style="--height: 60%"></div>
										<div class="heatmap-bar" style="--height: 50%"></div>
										<div class="heatmap-bar peak" style="--height: 85%"></div>
										<div class="heatmap-bar" style="--height: 55%"></div>
										<div class="heatmap-bar" style="--height: 40%"></div>
										<div class="heatmap-bar" style="--height: 35%"></div>
									</div>
								</div>
							</div>
						{:else if tool.type === 'analytics'}
							<div class="preview-analytics">
								<div class="analytics-mock">
									<div class="metric-row">
										<div class="metric-card">
											<div class="metric-label"></div>
											<div class="metric-value"></div>
										</div>
										<div class="metric-card">
											<div class="metric-label"></div>
											<div class="metric-value"></div>
										</div>
									</div>
									<div class="chart-area">
										<div class="chart-bar" style="--height: 40%"></div>
										<div class="chart-bar" style="--height: 70%"></div>
										<div class="chart-bar" style="--height: 55%"></div>
										<div class="chart-bar" style="--height: 85%"></div>
										<div class="chart-bar" style="--height: 60%"></div>
									</div>
								</div>
							</div>
						{/if}

						{#if !isMember}
							<div class="gate-overlay">
								<div class="gate-content">
									<Lock size={32} class="lock-icon" />
									<h4 class="gate-title">Unlock with Membership</h4>
									<p class="gate-description">Get full access to all platform tools</p>
									<a href="#pricing" class="unlock-button">Become a Member - $99</a>
								</div>
							</div>
						{/if}
					</div>

					<div class="card-footer">
						<p class="tool-description">{tool.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.tools-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
	}

	.tools-container {
		max-width: var(--container-max-width);
		margin: 0 auto;
	}

	.tools-header {
		padding-bottom: var(--space-lg);
		margin-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.tools-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.tools-description {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.tools-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-lg);
	}

	.tool-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.tool-card:hover {
		border-color: var(--color-border-strong);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
	}

	.tool-name {
		font-size: var(--text-body-lg);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.card-preview {
		position: relative;
		aspect-ratio: 16 / 10;
		background: var(--color-bg-pure);
		overflow: hidden;
	}

	.gate-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(8px);
		padding: var(--space-lg);
	}

	.gate-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		max-width: 20rem;
		width: 100%;
	}

	.gate-title {
		font-size: var(--text-body-lg);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.gate-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-md);
	}

	.unlock-button {
		display: inline-block;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: 600;
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.unlock-button:hover {
		opacity: 0.9;
	}

	.card-footer {
		padding: var(--space-md);
		background: rgba(0, 0, 0, 0.2);
	}

	.tool-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-subtle);
		line-height: 1.6;
		margin: 0;
	}

	/* Chatbot Preview */
	.preview-chatbot {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
	}

	.chatbot-mock {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.chat-message {
		display: flex;
		gap: var(--space-xs);
	}

	.chat-message.assistant {
		justify-content: flex-start;
	}

	.chat-message.user {
		justify-content: flex-end;
	}

	.message-content {
		max-width: 70%;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.chat-message.user .message-content {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--color-border-emphasis);
	}

	.chat-input {
		margin-top: auto;
		display: flex;
		gap: var(--space-xs);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.input-field {
		flex: 1;
		height: 2rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.send-button {
		width: 2rem;
		height: 2rem;
		background: var(--color-fg-primary);
		border-radius: var(--radius-md);
	}

	/* Video Preview - Cinematic Player */
	.preview-video {
		position: relative;
		width: 100%;
		height: 100%;
		background: #000;
	}

	.preview-video img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.7;
	}

	.video-gradient {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 5rem;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.95), transparent);
	}

	.feature-badges {
		position: absolute;
		top: var(--space-sm);
		left: var(--space-sm);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.feature-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: var(--radius-sm);
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.feature-badge :global(svg) {
		opacity: 0.8;
	}

	.play-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.play-button-large {
		width: 4rem;
		height: 4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.15);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		color: white;
		backdrop-filter: blur(8px);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.preview-video:hover .play-button-large {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.05);
	}

	.video-controls {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6));
	}

	.control-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		background: transparent;
		border: none;
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.control-btn:hover {
		color: var(--color-fg-primary);
	}

	.progress-bar {
		position: relative;
		flex: 1;
		height: 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
		cursor: pointer;
	}

	.progress-bar:hover {
		height: 6px;
	}

	.progress-fill {
		width: 33%;
		height: 100%;
		background: var(--color-fg-primary);
		border-radius: 2px;
		transition: width 0.1s linear;
	}

	.progress-handle {
		position: absolute;
		top: 50%;
		left: 33%;
		transform: translate(-50%, -50%);
		width: 12px;
		height: 12px;
		background: var(--color-fg-primary);
		border-radius: 50%;
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.progress-bar:hover .progress-handle {
		opacity: 1;
	}

	.time-display {
		font-size: 0.6875rem;
		font-family: var(--font-mono, monospace);
		color: var(--color-fg-muted);
		white-space: nowrap;
	}

	/* Heatmap Preview */
	.preview-heatmap {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
		background: radial-gradient(ellipse at bottom, rgba(124, 43, 238, 0.1), transparent);
	}

	.heatmap-mock {
		width: 90%;
		height: 80%;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.heatmap-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.heatmap-label {
		width: 4rem;
		height: 0.5rem;
		background: rgba(255, 255, 255, 0.3);
		border-radius: var(--radius-sm);
	}

	.heatmap-time {
		font-size: var(--text-caption);
		font-family: monospace;
		color: var(--color-fg-muted);
	}

	.heatmap-bars {
		flex: 1;
		display: flex;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.heatmap-bar {
		flex: 1;
		height: var(--height);
		background: linear-gradient(to top, var(--color-primary), rgba(124, 43, 238, 0.4));
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
		opacity: 0.7;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.heatmap-bar.peak {
		opacity: 1;
		box-shadow: 0 0 8px rgba(124, 43, 238, 0.5);
	}

	/* Analytics Preview */
	.preview-analytics {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
		background: radial-gradient(ellipse at top right, rgba(255, 255, 255, 0.05), transparent);
	}

	.analytics-mock {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.metric-row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-sm);
	}

	.metric-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.metric-label {
		width: 60%;
		height: 0.5rem;
		background: rgba(255, 255, 255, 0.3);
		border-radius: var(--radius-sm);
	}

	.metric-value {
		width: 40%;
		height: 1rem;
		background: var(--color-fg-primary);
		border-radius: var(--radius-sm);
	}

	.chart-area {
		flex: 1;
		display: flex;
		align-items: flex-end;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.chart-bar {
		flex: 1;
		height: var(--height);
		background: linear-gradient(to top, var(--color-fg-primary), rgba(255, 255, 255, 0.5));
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
	}

	@media (max-width: 1024px) {
		.tools-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.tools-section {
			padding: 4rem 1rem;
		}

		.message-content {
			max-width: 85%;
			font-size: var(--text-caption);
		}
	}
</style>
