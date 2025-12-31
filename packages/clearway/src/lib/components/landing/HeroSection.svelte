<script lang="ts">
	// CLEARWAY Hero Section
	// The path opens; obstruction dissolves
</script>

<section class="hero">
	<div class="hero-content">
		<h1 class="hero-title">CLEARWAY</h1>
		<p class="hero-tagline">
			The infrastructure disappears. Courts get booked.
		</p>
		<div class="hero-cta">
			<a href="#showcase" class="btn-primary">
				See it Live
			</a>
			<a href="#request-demo" class="btn-secondary">
				Get Started Free
			</a>
		</div>
	</div>
</section>

<style>
	.hero {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl) var(--space-md);
		background: var(--color-bg-pure);
	}

	.hero-content {
		text-align: center;
		max-width: 48rem;
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: 700;
		letter-spacing: 0.05em;
		margin: 0 0 var(--space-md);
		color: var(--color-fg-primary);
		animation: fadeInUp var(--duration-slow, 700ms) var(--ease-decelerate, cubic-bezier(0.0, 0.0, 0.2, 1)) forwards;
		opacity: 0;
	}

	.hero-tagline {
		font-size: var(--text-body-lg);
		line-height: 1.6;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
		animation: fadeInUp var(--duration-slow, 700ms) var(--ease-decelerate, cubic-bezier(0.0, 0.0, 0.2, 1)) 100ms forwards;
		opacity: 0;
	}

	.hero-cta {
		display: flex;
		gap: var(--space-sm);
		justify-content: center;
		flex-wrap: wrap;
		animation: fadeInUp var(--duration-slow, 700ms) var(--ease-decelerate, cubic-bezier(0.0, 0.0, 0.2, 1)) 200ms forwards;
		opacity: 0;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 1rem 2rem;
		border-radius: var(--radius-lg);
		font-size: var(--text-body);
		font-weight: 500;
		text-decoration: none;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 1rem 2rem;
		border-radius: var(--radius-lg);
		font-size: var(--text-body);
		font-weight: 500;
		text-decoration: none;
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-secondary:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-title,
		.hero-tagline,
		.hero-cta {
			animation: none;
			opacity: 1;
		}
	}
</style>
