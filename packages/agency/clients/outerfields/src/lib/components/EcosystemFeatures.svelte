<script lang="ts">
	/**
	 * OUTERFIELDS Ecosystem Features
	 *
	 * Isometric card layout showing Admin and User platform features
	 */

	const adminFeatures = [
		'Real-time Analytics Dashboard',
		'Subscriber Management',
		'Revenue Tracking',
		'Content Scheduling',
		'A/B Testing Tools'
	];

	const userFeatures = [
		'Netflix-style UI',
		'Personalized Recommendations',
		'Watchlist & Progress Tracking',
		'Community Features',
		'Multi-device Sync'
	];
</script>

<section class="ecosystem-section">
	<div class="ecosystem-container">
		<div class="section-header">
			<span class="section-badge">Platform Overview</span>
			<h2 class="section-title">Unified Ecosystem</h2>
			<p class="section-description">
				Two powerful experiences working together. Give creators the tools they need while
				delivering viewers the experience they expect.
			</p>
		</div>

		<div class="ecosystem-cards">
			<!-- Admin Card -->
			<div class="eco-card admin-card">
				<div class="card-inner">
					<div class="card-header">
						<span class="card-icon">
							<span class="material-symbols-outlined">admin_panel_settings</span>
						</span>
						<h3 class="card-title">Creator Dashboard</h3>
						<p class="card-subtitle">Command center for your content empire</p>
					</div>
					<ul class="card-features">
						{#each adminFeatures as feature}
							<li>
								<span class="material-symbols-outlined">check_circle</span>
								{feature}
							</li>
						{/each}
					</ul>
					<a href="/admin-demo" class="card-cta">
						<span class="material-symbols-outlined">dashboard</span>
						Explore Admin Demo
					</a>
				</div>
			</div>

			<!-- User Card -->
			<div class="eco-card user-card">
				<div class="card-inner">
					<div class="card-header">
						<span class="card-icon">
							<span class="material-symbols-outlined">tv</span>
						</span>
						<h3 class="card-title">Viewer Experience</h3>
						<p class="card-subtitle">Premium streaming your audience deserves</p>
					</div>
					<ul class="card-features">
						{#each userFeatures as feature}
							<li>
								<span class="material-symbols-outlined">check_circle</span>
								{feature}
							</li>
						{/each}
					</ul>
					<a href="/demo" class="card-cta">
						<span class="material-symbols-outlined">play_circle</span>
						Explore User Demo
					</a>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.ecosystem-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
		perspective: 1000px;
	}

	.ecosystem-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: 4rem;
	}

	.section-badge {
		display: inline-block;
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
		max-width: 36rem;
		margin: 0 auto;
		line-height: 1.7;
	}

	.ecosystem-cards {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2rem;
	}

	.eco-card {
		position: relative;
		transform-style: preserve-3d;
		transition: transform 0.4s ease, box-shadow 0.4s ease;
	}

	.eco-card.admin-card {
		transform: rotateY(8deg) rotateX(2deg);
	}

	.eco-card.user-card {
		transform: rotateY(-8deg) rotateX(2deg);
	}

	.eco-card:hover {
		transform: rotateY(0) rotateX(0) translateY(-8px);
		z-index: 10;
	}

	.card-inner {
		padding: 2rem;
		background: linear-gradient(145deg, var(--glass-bg) 0%, rgba(255, 255, 255, 0.02) 100%);
		border: 1px solid var(--color-border-default);
		border-radius: 1.5rem;
		height: 100%;
		transition: border-color 0.3s ease, box-shadow 0.3s ease;
	}

	.eco-card:hover .card-inner {
		border-color: var(--color-border-strong);
		box-shadow: 0 25px 50px -12px rgba(255, 255, 255, 0.1);
	}

	.card-header {
		margin-bottom: 1.5rem;
	}

	.card-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		color: var(--color-fg-primary);
		margin-bottom: 1rem;
	}

	.card-icon .material-symbols-outlined {
		font-size: 1.5rem;
	}

	.card-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.card-subtitle {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
	}

	.card-features {
		list-style: none;
		padding: 0;
		margin: 0 0 2rem;
	}

	.card-features li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--color-border-default);
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.card-features li:last-child {
		border-bottom: none;
	}

	.card-features .material-symbols-outlined {
		font-size: 1.25rem;
		color: var(--color-fg-secondary);
	}

	.card-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: 0.875rem;
		font-weight: 600;
		border-radius: 0.75rem;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.card-cta:hover {
		background: var(--color-primary-hover);
		transform: translateY(-2px);
		box-shadow: 0 8px 16px rgba(255, 255, 255, 0.1);
	}

	.card-cta .material-symbols-outlined {
		font-size: 1.25rem;
	}

	@media (max-width: 768px) {
		.ecosystem-cards {
			grid-template-columns: 1fr;
		}

		.eco-card.admin-card,
		.eco-card.user-card {
			transform: none;
		}

		.eco-card:hover {
			transform: translateY(-4px);
		}
	}
</style>
