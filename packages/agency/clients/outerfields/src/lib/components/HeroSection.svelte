<script lang="ts">
	/**
	 * OUTERFIELDS Hero Section
	 *
	 * Landing page hero with headline, subheadline, CTAs, and browser mockup
	 */
</script>

<section class="hero">
	<div class="hero-background">
		<div class="gradient-mesh"></div>
		<div class="hero-image">
			<img
				src="https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1920&h=800&fit=crop"
				alt="Content creator studio"
			/>
		</div>
	</div>

	<div class="hero-content">
		<div class="hero-badge">
			<span class="badge-dot-container">
				<span class="badge-dot"></span>
				<span class="badge-ping"></span>
			</span>
			<span>Premium Content Networks</span>
		</div>

		<h1 class="hero-title">
			Build Streaming Platforms
			<span class="highlight">That Convert</span>
		</h1>

		<p class="hero-description">
			OUTERFIELDS delivers the complete PCN solution. Custom branding, advanced analytics,
			community features, and monetization tools. Better than Uscreen, built for creators who
			demand more.
		</p>

		<div class="hero-ctas">
			<a href="/demo" class="btn-primary">
				<span class="material-symbols-outlined">play_circle</span>
				Experience the Demo
			</a>
			<a href="#features" class="btn-secondary">
				<span class="material-symbols-outlined">info</span>
				See Features
			</a>
		</div>

		<!-- Browser Mockup Preview -->
		<div class="browser-mockup">
			<div class="browser-chrome">
				<div class="browser-dots">
					<span class="dot red"></span>
					<span class="dot yellow"></span>
					<span class="dot green"></span>
				</div>
				<div class="browser-url">
					<span class="material-symbols-outlined">lock</span>
					app.outerfields.com
				</div>
			</div>
			<div class="browser-content">
				<div class="mockup-preview">
					<div class="mockup-nav">
						<span class="mockup-logo">OUTERFIELDS</span>
						<div class="mockup-nav-items">
							<span>Home</span>
							<span>Series</span>
							<span>Movies</span>
						</div>
					</div>
					<div class="mockup-hero-area">
						<div class="mockup-featured">
							<span class="mockup-badge">Featured</span>
							<div class="mockup-title-block"></div>
							<div class="mockup-desc-block"></div>
							<div class="mockup-buttons">
								<span class="mockup-btn primary">Play</span>
								<span class="mockup-btn secondary">+ List</span>
							</div>
						</div>
					</div>
					<div class="mockup-content-row">
						<div class="mockup-card"></div>
						<div class="mockup-card"></div>
						<div class="mockup-card"></div>
						<div class="mockup-card"></div>
					</div>
				</div>
			</div>
		</div>

		<div class="hero-stats">
			<div class="stat">
				<span class="stat-value">128K+</span>
				<span class="stat-label">Active Subscribers</span>
			</div>
			<div class="stat-divider"></div>
			<div class="stat">
				<span class="stat-value">$2.4M</span>
				<span class="stat-label">Creator Revenue</span>
			</div>
			<div class="stat-divider"></div>
			<div class="stat">
				<span class="stat-value">99.9%</span>
				<span class="stat-label">Uptime</span>
			</div>
		</div>
	</div>
</section>

<style>
	.hero {
		position: relative;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8rem 1.5rem 4rem;
		overflow: hidden;
	}

	.hero-background {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.hero-image {
		position: absolute;
		inset: 0;
		opacity: 0.15;
	}

	.hero-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.gradient-mesh {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		height: 80%;
		background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 60%);
		pointer-events: none;
		z-index: 1;
	}

	.hero-content {
		position: relative;
		z-index: 1;
		max-width: 60rem;
		text-align: center;
	}

	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-secondary);
		margin-bottom: 1.5rem;
	}

	.badge-dot-container {
		position: relative;
		width: 0.5rem;
		height: 0.5rem;
	}

	.badge-dot {
		position: absolute;
		inset: 0;
		background: var(--color-primary);
		border-radius: 50%;
	}

	.badge-ping {
		position: absolute;
		inset: 0;
		background: var(--color-primary);
		border-radius: 50%;
		animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
	}

	@keyframes ping {
		75%, 100% {
			transform: scale(2);
			opacity: 0;
		}
	}

	.hero-title {
		font-size: clamp(2.5rem, 6vw, 4.5rem);
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: -0.02em;
		margin: 0 0 1.5rem;
		color: var(--color-fg-primary);
	}

	.highlight {
		display: block;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, #ffffff 50%, rgba(255, 255, 255, 0.6) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero-description {
		font-size: 1.125rem;
		line-height: 1.7;
		color: var(--color-fg-muted);
		max-width: 40rem;
		margin: 0 auto 2.5rem;
	}

	.hero-ctas {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 3rem;
	}

	/* Browser Mockup */
	.browser-mockup {
		max-width: 48rem;
		margin: 0 auto 3rem;
		border-radius: 0.75rem;
		overflow: hidden;
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
		box-shadow: 0 25px 50px -12px rgba(255, 255, 255, 0.1);
	}

	.browser-chrome {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg-surface);
		border-bottom: 1px solid var(--color-border-default);
	}

	.browser-dots {
		display: flex;
		gap: 0.375rem;
	}

	.browser-dots .dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
	}

	.browser-dots .dot.red { background: #ff5f57; }
	.browser-dots .dot.yellow { background: #febc2e; }
	.browser-dots .dot.green { background: #28c840; }

	.browser-url {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
		background: var(--color-bg-pure);
		padding: 0.375rem 1rem;
		border-radius: 0.375rem;
	}

	.browser-url .material-symbols-outlined {
		font-size: 0.875rem;
		color: var(--color-success);
	}

	.browser-content {
		padding: 0;
	}

	.mockup-preview {
		background: var(--color-bg-pure);
	}

	.mockup-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.5);
	}

	.mockup-logo {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.mockup-nav-items {
		display: flex;
		gap: 1rem;
		font-size: 0.625rem;
		color: var(--color-fg-muted);
	}

	.mockup-hero-area {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%);
		padding: 2rem 1rem;
	}

	.mockup-featured {
		max-width: 12rem;
	}

	.mockup-badge {
		display: inline-block;
		padding: 0.125rem 0.375rem;
		background: var(--color-fg-primary);
		border-radius: 0.125rem;
		font-size: 0.5rem;
		font-weight: 700;
		color: var(--color-bg-pure);
		text-transform: uppercase;
		margin-bottom: 0.5rem;
	}

	.mockup-title-block {
		width: 80%;
		height: 1rem;
		background: var(--color-fg-primary);
		border-radius: 0.125rem;
		margin-bottom: 0.375rem;
	}

	.mockup-desc-block {
		width: 60%;
		height: 0.5rem;
		background: var(--color-fg-muted);
		border-radius: 0.125rem;
		margin-bottom: 0.75rem;
	}

	.mockup-buttons {
		display: flex;
		gap: 0.375rem;
	}

	.mockup-btn {
		font-size: 0.5rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	.mockup-btn.primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.mockup-btn.secondary {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.mockup-content-row {
		display: flex;
		gap: 0.5rem;
		padding: 1rem;
	}

	.mockup-card {
		width: 4rem;
		height: 2.5rem;
		background: var(--color-bg-surface);
		border-radius: 0.25rem;
		border: 1px solid var(--color-border-default);
	}

	.hero-stats {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.stat {
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: 0.875rem;
		color: var(--color-fg-subtle);
	}

	.stat-divider {
		width: 1px;
		height: 2.5rem;
		background: var(--color-border-default);
	}

	@media (max-width: 640px) {
		.hero-stats {
			flex-direction: column;
			gap: 1.5rem;
		}

		.stat-divider {
			display: none;
		}

		.browser-mockup {
			display: none;
		}

		.mockup-nav-items {
			display: none;
		}
	}
</style>
