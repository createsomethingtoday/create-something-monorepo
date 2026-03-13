<script lang="ts">
	/**
	 * OUTERFIELDS Demo CTA Section
	 *
	 * Call-to-action section encouraging users to try the demo
	 */
	import { Rocket, CheckCircle, PlayCircle, Clock, Play } from 'lucide-svelte';
</script>

<section class="demo-section">
	<div class="demo-glow"></div>
	<div class="demo-container">
		<div class="demo-card">
			<div class="demo-content">
				<div class="rocket-badge">
					<Rocket size={32} />
				</div>
				<h2 class="demo-title">Ready to Unlock OUTERFIELDS?</h2>
				<p class="demo-description">
					Experience a PCN like a real subscriber. Most content, tools, and behind-the-scenes are members-only.
					Founding members get lifetime access for $99.
				</p>

				<div class="demo-features">
					<div class="feature-item">
						<CheckCircle size={20} />
						<span>Lifetime access (founding members)</span>
					</div>
					<div class="feature-item">
						<CheckCircle size={20} />
						<span>Full library + tools + analytics</span>
					</div>
					<div class="feature-item">
						<CheckCircle size={20} />
						<span>Members-only behind-the-scenes</span>
					</div>
				</div>

				<div class="demo-actions">
					<a href="#pricing" class="btn-primary glow">
						<Rocket size={20} />
						Unlock Lifetime Access - $99
					</a>
					<a href="/login?redirect=/" class="btn-secondary">
						<PlayCircle size={20} />
						Sign In
					</a>
				</div>

				<p class="demo-note">
					<Clock size={18} />
					Preview is public — full access is members-only
				</p>
			</div>

			<div class="demo-visual">
				<div class="visual-ring outer"></div>
				<div class="visual-ring inner"></div>
				<div class="visual-card">
					<div class="visual-icon">
						<Play size={40} />
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.demo-section {
		position: relative;
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
		overflow: hidden;
	}

	.demo-glow {
		display: none;
	}

	.demo-container {
		position: relative;
		max-width: var(--container-max-width);
		margin: 0 auto;
		z-index: 1;
	}

	.demo-card {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 4rem;
		padding: 4rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 2rem;
		align-items: center;
	}

	.demo-content {
		max-width: 32rem;
	}

	.rocket-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 4rem;
		height: 4rem;
		background: var(--color-fg-primary);
		border-radius: 1rem;
		color: var(--color-bg-pure);
		margin-bottom: 1.5rem;
	}

	.demo-title {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 800;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
		line-height: 1.2;
	}

	.demo-description {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		line-height: 1.7;
		margin: 0 0 2rem;
	}

	.demo-features {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.feature-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.demo-actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}

	.btn-primary.glow {
		box-shadow: none;
	}

	.btn-primary.glow:hover {
		box-shadow: none;
	}

	.demo-note {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-fg-subtle);
		margin: 0;
	}

	.demo-visual {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16rem;
		height: 16rem;
	}

	.visual-ring {
		position: absolute;
		border-radius: 50%;
		border: 1px solid var(--color-border-default);
	}

	.visual-ring.outer {
		width: 100%;
		height: 100%;
		animation: ring-pulse 3s ease-in-out infinite;
	}

	.visual-ring.inner {
		width: 75%;
		height: 75%;
		animation: ring-pulse 3s ease-in-out infinite 0.5s;
	}

	@keyframes ring-pulse {
		0%, 100% {
			transform: scale(1);
			opacity: 0.3;
		}
		50% {
			transform: scale(1.05);
			opacity: 0.6;
		}
	}

	.visual-card {
		position: relative;
		width: 6rem;
		height: 6rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-fg-primary);
		border-radius: 50%;
	}

	@keyframes glow-pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
	}

	.visual-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-bg-pure);
	}

	@media (max-width: 768px) {
		.demo-card {
			grid-template-columns: 1fr;
			gap: 2rem;
			padding: 2rem;
		}

		.demo-visual {
			display: none;
		}

		.demo-features {
			flex-direction: column;
			gap: 0.75rem;
		}
	}
</style>
