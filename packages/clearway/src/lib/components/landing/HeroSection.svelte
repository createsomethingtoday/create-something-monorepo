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
				See it Live at The Stack
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
		animation: fadeInUp 1.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
		opacity: 0;
	}

	.hero-tagline {
		font-size: var(--text-body-lg);
		line-height: 1.6;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
		animation: fadeInUp 1.2s cubic-bezier(0.25, 0.1, 0.25, 1) 0.2s forwards;
		opacity: 0;
	}

	.hero-cta {
		animation: fadeInUp 1.2s cubic-bezier(0.25, 0.1, 0.25, 1) 0.4s forwards;
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
		background: var(--clearway-accent);
		color: #000;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.btn-primary:hover {
		background: var(--clearway-accent-emphasis);
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
