<script lang="ts">
	/**
	 * About Page
	 * Maverick X
	 */

	import { inview } from '$lib/actions/inview';
	import Button from '$lib/components/Button.svelte';

	let visible = $state(false);

	function openContactModal() {
		window.dispatchEvent(new CustomEvent('openContactModal', { detail: { categoryId: 'general' } }));
	}
</script>

<svelte:head>
	<title>About | Maverick X</title>
	<meta name="description" content="Maverick X develops advanced chemical solutions for the oil & gas, mining, and water treatment industries. Y Combinator backed." />
</svelte:head>

<div
	use:inview
	oninview={() => (visible = true)}
>
	<!-- Hero Section -->
	<section class="hero-section">
		<div class="container relative z-10 flex items-center min-h-[60vh] py-32 lg:py-24 md:py-20">
			<div class="max-w-3xl">
				<div
					class="scroll-reveal mb-6"
					class:scroll-reveal-hidden={!visible}
				>
					<span class="company-badge">
						Y Combinator Backed
					</span>
				</div>

				<h1
					class="text-h1 mb-6 scroll-reveal stagger-1"
					class:scroll-reveal-hidden={!visible}
				>
					Chemistry That Outperforms
				</h1>

				<p
					class="text-paragraph mb-10 max-w-xl scroll-reveal stagger-2"
					class:scroll-reveal-hidden={!visible}
					style="color: var(--color-fg-secondary)"
				>
					Maverick X develops next-generation chemical solutions that transform how industries extract, process, and recover valuable resources. Our proprietary formulations deliver breakthrough performance where it matters most.
				</p>
			</div>
		</div>
	</section>

	<!-- Mission Section -->
	<section class="section-lg mission-section">
		<div class="container">
			<div class="grid grid-cols-2 gap-16 lg:grid-cols-1 lg:gap-12">
				<div>
					<h2
						class="text-h2 mb-6 scroll-reveal"
						class:scroll-reveal-hidden={!visible}
					>
						Our Mission
					</h2>
					<p
						class="text-paragraph scroll-reveal stagger-1"
						class:scroll-reveal-hidden={!visible}
						style="color: var(--color-fg-secondary)"
					>
						We believe the world's most critical challenges—energy security, critical mineral supply, and water sustainability—can be solved through better chemistry. Our mission is to develop targeted chemical solutions that enable more efficient, sustainable industrial operations.
					</p>
				</div>
				<div>
					<h2
						class="text-h2 mb-6 scroll-reveal"
						class:scroll-reveal-hidden={!visible}
					>
						Our Approach
					</h2>
					<p
						class="text-paragraph scroll-reveal stagger-1"
						class:scroll-reveal-hidden={!visible}
						style="color: var(--color-fg-secondary)"
					>
						We combine deep domain expertise with cutting-edge research to create formulations that outperform conventional alternatives. Every product we develop is purpose-built for real-world conditions, tested rigorously, and optimized for both performance and sustainability.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Products Section -->
	<section class="section-lg products-section">
		<div class="container">
			<h2
				class="text-h2 mb-12 scroll-reveal"
				class:scroll-reveal-hidden={!visible}
			>
				Our Products
			</h2>

			<div class="grid-responsive-3">
				<!-- PetroX -->
				<a
					href="/oil-gas"
					class="product-card scroll-reveal stagger-1"
					class:scroll-reveal-hidden={!visible}
					style="--accent: #FF7A00"
				>
					<div class="product-icon">
						<svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 3L4 9v12h16V9l-8-6zm6 16h-3v-5h-6v5H6v-9.5l6-4.5 6 4.5V19z"/>
						</svg>
					</div>
					<h3 class="product-name">PetroX</h3>
					<p class="product-tagline">Targeted Oilfield Chemistry</p>
					<p class="product-description">Advanced solutions for enhanced oil recovery and production optimization.</p>
				</a>

				<!-- LithX -->
				<a
					href="/mining"
					class="product-card scroll-reveal stagger-2"
					class:scroll-reveal-hidden={!visible}
					style="--accent: #00C2A8"
				>
					<div class="product-icon">
						<svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"/>
						</svg>
					</div>
					<h3 class="product-name">LithX</h3>
					<p class="product-tagline">Next-Gen Metal Recovery</p>
					<p class="product-description">Revolutionary extraction chemistry for critical minerals.</p>
				</a>

				<!-- HydroX -->
				<a
					href="/water-treatment"
					class="product-card scroll-reveal stagger-3"
					class:scroll-reveal-hidden={!visible}
					style="--accent: #06B6D4"
				>
					<div class="product-icon">
						<svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z"/>
						</svg>
					</div>
					<h3 class="product-name">HydroX</h3>
					<p class="product-tagline">Wastewater Valorization</p>
					<p class="product-description">Innovative treatment that recovers value from industrial wastewater.</p>
				</a>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="section-md cta-section">
		<div class="container">
			<div
				class="cta-card scroll-reveal"
				class:scroll-reveal-hidden={!visible}
			>
				<div class="cta-content">
					<h2 class="text-h3 mb-2">Ready to learn more?</h2>
					<p style="color: var(--color-fg-secondary)">
						Contact our team to discuss how Maverick X can help your operations.
					</p>
				</div>
				<Button
					title="Get in Touch"
					arrow
					onclick={openContactModal}
				/>
			</div>
		</div>
	</section>
</div>

<style>
	.hero-section {
		position: relative;
		min-height: 60vh;
		background: linear-gradient(135deg, rgba(255, 122, 0, 0.1) 0%, #0a0a0a 50%, #000000 100%);
	}

	.company-badge {
		display: inline-block;
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		background: rgba(255, 122, 0, 0.2);
		color: #FF7A00;
	}

	.hero-section h1 {
		color: var(--color-fg-primary);
	}

	.mission-section {
		background: #0a0a0a;
	}

	.mission-section h2 {
		color: var(--color-fg-primary);
	}

	.products-section {
		background: #000000;
	}

	.products-section h2 {
		color: var(--color-fg-primary);
	}

	.product-card {
		display: block;
		padding: 2rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		transition: all 0.3s ease;
	}

	.product-card:hover {
		border-color: var(--accent);
		transform: translateY(-4px);
	}

	.product-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.5rem;
		height: 3.5rem;
		margin-bottom: 1.5rem;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		color: var(--accent);
	}

	.product-name {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	.product-tagline {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.product-description {
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--color-fg-tertiary);
	}

	.cta-section {
		background: #0a0a0a;
	}

	.cta-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		padding: 3rem;
		background: linear-gradient(135deg, rgba(255, 122, 0, 0.1) 0%, transparent 100%);
		border: 1px solid rgba(255, 122, 0, 0.2);
	}

	@media (max-width: 767px) {
		.cta-card {
			flex-direction: column;
			text-align: center;
			padding: 2rem;
		}
	}

	.cta-content h2 {
		color: var(--color-fg-primary);
	}
</style>
