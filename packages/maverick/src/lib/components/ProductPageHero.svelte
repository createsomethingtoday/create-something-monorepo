<script lang="ts">
	/**
	 * ProductPageHero Component - Reusable hero for product pages
	 * Maverick X Design System
	 */

	import { inview } from '$lib/actions/inview';
	import Button from './Button.svelte';

	interface Feature {
		icon: 'beaker' | 'shield' | 'recycle' | 'target' | 'chart' | 'globe';
		title: string;
		description: string;
	}

	interface Props {
		productName: string;
		productId: 'petrox' | 'lithx' | 'hydrox';
		tagline: string;
		description: string;
		features: Feature[];
		onContactClick?: () => void;
	}

	let { productName, productId, tagline, description, features, onContactClick }: Props = $props();

	let visible = $state(false);

	// Accent colors per product
	const accentColors: Record<string, string> = {
		petrox: '#FF7A00',
		lithx: '#00C2A8',
		hydrox: '#06B6D4'
	};

	// Icon SVG paths
	const iconPaths: Record<string, string> = {
		beaker: 'M9 3v2H6v2h3v10a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V7h3V5h-3V3H9zm2 4h2v10a1 1 0 0 1-1 1h0a1 1 0 0 1-1-1V7z',
		shield: 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 18c-3.25-1-6-4.79-6-8.91V6.5l6-2.25 6 2.25v4.59c0 4.12-2.75 7.91-6 8.91z',
		recycle: 'M12 6.5c-1.79 0-3.32 1.13-3.91 2.72L6.28 7.5 5.5 9.72l3.6 1.29 1.29-3.6-.78-.28.19-.53c.36-.97 1.29-1.6 2.2-1.6s1.84.63 2.2 1.6l1.93 5.41-1.41 1.41L12 10.61v2.78l-3.54 3.54 1.42 1.42L12 16.22l2.12 2.13 1.42-1.42L12 13.39v-2.78l2.72 2.72 1.41-1.41-1.93-5.41C13.84 5.13 12.79 4.5 12 4.5',
		target: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm0-6a2 2 0 1 0 2 2 2 2 0 0 0-2-2z',
		chart: 'M3 3v18h18v-2H5V3H3zm15 10h2v5h-2v-5zm-4-4h2v9h-2V9zm-4 2h2v7h-2v-7zm-4 3h2v4H6v-4z',
		globe: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'
	};

	const accentColor = accentColors[productId] ?? '#FF7A00';
</script>

<div
	use:inview
	oninview={() => (visible = true)}
>
	<!-- Hero Section -->
	<section class="hero-section hero-{productId}">
		<div class="container relative z-10 flex items-center min-h-[70vh] py-32 lg:py-24 md:py-20">
			<div class="max-w-3xl">
				<!-- Product Badge -->
				<div
					class="scroll-reveal mb-6"
					class:scroll-reveal-hidden={!visible}
				>
					<span class="product-badge" style="background: {accentColor}20; color: {accentColor}">
						{productName}
					</span>
				</div>

				<!-- Tagline -->
				<h1
					class="text-h1 mb-6 scroll-reveal stagger-1"
					class:scroll-reveal-hidden={!visible}
				>
					{tagline}
				</h1>

				<!-- Description -->
				<p
					class="text-paragraph mb-10 max-w-xl scroll-reveal stagger-2"
					class:scroll-reveal-hidden={!visible}
					style="color: var(--color-fg-secondary)"
				>
					{description}
				</p>

				<!-- CTA -->
				<div
					class="scroll-reveal stagger-3"
					class:scroll-reveal-hidden={!visible}
				>
					<Button
						title="Contact Us"
						light
						arrow
						onclick={onContactClick}
					/>
				</div>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="section-lg features-section">
		<div class="container">
			<div class="grid-responsive-3">
				{#each features as feature, index}
					<div
						class="feature-card scroll-reveal"
						class:scroll-reveal-hidden={!visible}
						class:stagger-1={index === 0}
						class:stagger-2={index === 1}
						class:stagger-3={index === 2}
					>
						<!-- Icon -->
						<div class="feature-icon" style="background: {accentColor}15; border-color: {accentColor}30">
							<svg
								class="w-6 h-6"
								viewBox="0 0 24 24"
								fill={accentColor}
								aria-hidden="true"
							>
								<path d={iconPaths[feature.icon] ?? iconPaths.beaker}></path>
							</svg>
						</div>

						<!-- Content -->
						<h3 class="feature-title">{feature.title}</h3>
						<p class="feature-description">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="section-md cta-section">
		<div class="container">
			<div
				class="cta-card scroll-reveal"
				class:scroll-reveal-hidden={!visible}
				style="background: linear-gradient(135deg, {accentColor}20 0%, transparent 100%); border-color: {accentColor}30"
			>
				<div class="cta-content">
					<h2 class="text-h3 mb-2">Ready to get started?</h2>
					<p style="color: var(--color-fg-secondary)">
						Contact our team to learn how {productName} can transform your operations.
					</p>
				</div>
				<Button
					title="Get in Touch"
					arrow
					onclick={onContactClick}
				/>
			</div>
		</div>
	</section>
</div>

<style>
	.hero-section {
		position: relative;
		min-height: 70vh;
	}

	.hero-petrox {
		background: linear-gradient(135deg, rgba(255, 122, 0, 0.15) 0%, #0a0a0a 50%, #000000 100%);
	}

	.hero-lithx {
		background: linear-gradient(135deg, rgba(0, 194, 168, 0.15) 0%, #0a0a0a 50%, #000000 100%);
	}

	.hero-hydrox {
		background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, #0a0a0a 50%, #000000 100%);
	}

	.product-badge {
		display: inline-block;
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.hero-section h1 {
		color: var(--color-fg-primary);
	}

	.features-section {
		background: #0a0a0a;
	}

	.feature-card {
		padding: 2rem;
	}

	.feature-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		margin-bottom: 1.5rem;
		border: 1px solid;
	}

	.feature-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 0.75rem;
	}

	.feature-description {
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--color-fg-tertiary);
	}

	.cta-section {
		background: #000000;
	}

	.cta-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		padding: 3rem;
		border: 1px solid;
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
