<script lang="ts">
	import { Menu, X, Instagram, Mail } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let mobileMenuOpen = false;

	const categories = [
		'JEWELRY',
		'SHOES',
		'READY TO WEAR',
		'BAGS',
		'ACCESSORIES',
		'GARDEROB',
		'SIGNATURE PIECES'
	];

	const newProducts = [
		{ id: 1, name: 'RELAXED WOOL COAT', price: 895, category: 'OUTERWEAR', image: '/images/product-wool-coat.png' },
		{ id: 2, name: 'HIGH-WAIST TROUSERS', price: 425, category: 'PANTS', image: '/images/product-trousers.png' },
		{ id: 3, name: 'SILK WRAP DRESS', price: 695, category: 'DRESSES', image: '/images/product-wrap-dress.png' },
		{ id: 4, name: 'OVERSIZED SHIRT DRESS', price: 545, category: 'DRESSES', image: '/images/product-shirt-dress.png' }
	];

	const iconicPieces = [
		{ id: 1, name: 'TAILORED BLAZER', price: 995, image: '/images/iconic-blazer.png' },
		{ id: 2, name: 'CASHMERE SWEATER', price: 625, image: '/images/iconic-sweater.png' },
		{ id: 3, name: 'LEATHER JACKET', price: 1895, image: '/images/iconic-leather-jacket.png' },
		{ id: 4, name: 'MIDI SKIRT', price: 495, image: '/images/iconic-midi-skirt.png' }
	];

	// Scroll-reveal animation
	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('visible');
					}
				});
			},
			{
				threshold: 0.1,
				rootMargin: '0px 0px -100px 0px'
			}
		);

		document.querySelectorAll('.animate-on-scroll').forEach((el) => {
			observer.observe(el);
		});

		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>SILHOUETTES — Designed as Quiet Uniform for Modern Life</title>
	<meta name="description" content="Timeless style crafted for modern expression. Discover our collection of ready-to-wear, accessories, and signature pieces." />
</svelte:head>

<!-- Navigation with mix-blend-mode -->
<nav class="nav mix-blend-invert">
	<div class="nav-container">
		<div class="nav-links-left">
			<a href="/about">ABOUT</a>
			<a href="/campaign">CAMPAIGN</a>
		</div>

		<div class="nav-logo">
			<div class="logo-symbol"></div>
		</div>

		<button class="mobile-menu-button" on:click={() => mobileMenuOpen = !mobileMenuOpen}>
			{#if mobileMenuOpen}
				<X size={24} />
			{:else}
				<Menu size={24} />
			{/if}
		</button>

		<div class="nav-links-right" class:open={mobileMenuOpen}>
			<a href="/shop">SHOP</a>
			<a href="/contact">CONTACT</a>
		</div>
	</div>
</nav>

<!-- Hero Section with layered background -->
<section class="hero">
	<div class="hero-bg-image"></div>
	<div class="hero-content animate-fade-in">
		<div class="hero-meta">
			<div class="hero-meta-left">
				<p class="hero-artist">MATS GUSTAFSON — TOKYO</p>
				<p class="hero-description">
					In 'Silhouettes', Swedish artist Mats Gustafson interprets Toteme's Fall/Winter 25 Collection.
				</p>
			</div>
			<div class="hero-meta-right">
				NOT JUST ANY BRAND
			</div>
		</div>
		<h1 class="hero-title">SILHOUETTES</h1>
	</div>
</section>

<!-- Design Statement with Layered Images -->
<section class="design-statement section animate-on-scroll">
	<div class="container">
		<div class="statement-grid">
			<div class="statement-text">
				<h2>DESIGNED AS QUIET<br/>UNIFORM FOR<br/>MODERN LIFE IN</h2>
			</div>
			<div class="statement-images">
				<div class="statement-img-back">
					<img src="/images/statement-back.png" alt="Design Statement" loading="lazy" />
				</div>
				<div class="statement-img-front">
					<img src="/images/statement-front.png" alt="Design Statement Detail" loading="lazy" />
				</div>
			</div>
			<div class="statement-description">
				<h3>THE STORY BEHIND BRAND</h3>
				<p>
					Totême creates refined essentials defined by restraint, material integrity, and timeless form.
					Designed to integrate seamlessly into a modern wardrobe with quiet confidence and lasting relevance.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Categories with Background Watermark -->
<section class="categories section animate-on-scroll">
	<span class="text-watermark" style="top: 50%; left: 50%; transform: translate(-50%, -50%);">COLLECTION</span>
	<div class="container">
		<div class="categories-grid stagger-children stagger-quick">
			{#each categories as category, i}
				<div class="category-item" style="--index: {i}">
					<span class="category-number">{String(i + 1).padStart(2, '0')}</span>
					<a href="/category/{category.toLowerCase().replace(/\s+/g, '-')}" class="category-link underline-reveal">
						{category}
					</a>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- New In with Border Detail -->
<section class="new-in section animate-on-scroll">
	<div class="container">
		<div class="section-header">
			<h3 class="section-title">NEW IN</h3>
			<p class="section-subtitle">
				DISCOVER READY TO WEAR, SHOES, BAGS, ACCESSORIES AND JEWELRY FROM THE PRE SPRING 26 COLLECTION.
			</p>
		</div>
		<div class="products-grid stagger-children stagger-standard">
			{#each newProducts as product, i}
				<a href="/product/{product.id}" class="product-card hover-lift" style="--index: {i}">
					<div class="product-image grayscale-scale-hover">
						<img src={product.image} alt={product.name} loading="lazy" />
					</div>
					<div class="product-info">
						<div class="product-details">
							<span class="product-name">{product.name}</span>
							<span class="product-price">${product.price}</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- Gallery Section - Dark -->
<section class="gallery section animate-on-scroll">
	<div class="gallery-label">01 SILHOUETTES</div>
	<div class="gallery-content">
		<div class="gallery-text">
			<div class="gallery-icon"></div>
			<p class="gallery-title">SILHOUETTES</p>
			<p class="gallery-description">
				A collection is a thoughtful edit of designs, unified by intention, material, and silhouette.
			</p>
		</div>
		<div class="gallery-images stagger-children stagger-standard">
			<div class="gallery-item hover-card" style="--index: 0">
				<img src="/images/gallery-1.png" alt="Silhouettes Gallery 1" loading="lazy" />
			</div>
			<div class="gallery-item hover-card" style="--index: 1">
				<img src="/images/gallery-2.png" alt="Silhouettes Gallery 2" loading="lazy" />
			</div>
			<div class="gallery-item hover-card" style="--index: 2">
				<img src="/images/gallery-3.png" alt="Silhouettes Gallery 3" loading="lazy" />
			</div>
		</div>
	</div>
</section>

<!-- Icons of the Wardrobe with Border Frame -->
<section class="icons section animate-on-scroll">
	<div class="container">
		<div class="icons-wrapper">
			<div class="icons-text">
				<h2>ICONS OF THE<br/>WARDROBE</h2>
				<p>
					TIMELESS PIECES THAT DEFINE THE TOTÊME WARDROBE. SELECTED FOR ENDURING DESIGN,
					REFINED MATERIALS, AND EFFORTLESS VERSATILITY. WORN SEASON AFTER SEASON AS MODERN
					ESSENTIALS FOR WOMEN SEEKING QUIET CONFIDENCE AND PERMANENCE.
				</p>
			</div>
			<div class="icons-image">
				<div class="icons-frame editorial-frame">
					<img src="/images/icons-feature.png" alt="Icons of the Wardrobe" loading="lazy" />
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Timeless Style with Background Text -->
<section class="timeless section animate-on-scroll">
	<div class="container">
		<h2 class="timeless-title">
			TIMELESS STYLE<br/>
			CRAFTED FOR<br/>
			MODERN EXPRESSION
		</h2>
		<div class="timeless-grid-wrapper">
			<span class="text-watermark" style="top: 50%; left: 50%; transform: translate(-50%, -50%);">SIGNATURE</span>
			<div class="products-grid timeless-grid stagger-children stagger-standard">
				{#each iconicPieces as product, i}
					<div class="product-card timeless-card hover-lift" style="--offset: {i * 20}px; --index: {i}">
						<div class="product-image grayscale-scale-hover">
							<img src={product.image} alt={product.name} loading="lazy" />
						</div>
						<div class="product-info">
							<div class="product-details">
								<span class="product-name">{product.name}</span>
								<span class="product-price">${product.price}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- Newsletter -->
<section class="newsletter section animate-on-scroll">
	<div class="container">
		<div class="newsletter-content">
			<div class="newsletter-text">
				<h2>JOIN OUR NEWSLETTER</h2>
				<p>For quiet updates on new arrivals, editorial stories, and seasonal highlights.</p>
			</div>
			<form class="newsletter-form">
				<input
					type="email"
					placeholder="SIGN UP WITH YOUR EMAIL"
					class="newsletter-input"
					required
				/>
				<button type="submit" class="newsletter-button press-effect">
					SUBSCRIBE
				</button>
			</form>
		</div>
	</div>
</section>

<!-- Footer -->
<footer class="footer animate-on-scroll">
	<div class="container">
		<div class="footer-content stagger-children stagger-quick">
			<div class="footer-info" style="--index: 0">
				<h4>CUSTOMER CARE</h4>
				<a href="/shipping" class="underline-reveal">SHIPPING & RETURNS</a>
				<a href="/tracking" class="underline-reveal">ORDER TRACKING</a>
				<a href="/size-guide" class="underline-reveal">SIZE GUIDE</a>
				<a href="/about" class="underline-reveal">ABOUT US</a>
			</div>

			<div class="footer-info" style="--index: 1">
				<h4>SHOP</h4>
				<a href="/new" class="underline-reveal">NEW ARRIVALS</a>
				<a href="/bestsellers" class="underline-reveal">BEST SELLERS</a>
				<a href="/collections" class="underline-reveal">ALL COLLECTIONS</a>
			</div>

			<div class="footer-info" style="--index: 2">
				<h4>CONTACT</h4>
				<a href="mailto:info@toteme.com" class="underline-reveal">EMAIL US</a>
				<a href="/stores" class="underline-reveal">STORE LOCATIONS</a>
				<a href="/services" class="underline-reveal">CLIENT SERVICES</a>
				<a href="/social" class="underline-reveal">SOCIAL MEDIAS</a>
			</div>
		</div>

		<div class="footer-brand">
			<h1 class="footer-logo-text">TOTEME</h1>
			<div class="footer-logo-symbol">
				<div class="logo-symbol large"></div>
			</div>
		</div>
	</div>
</footer>

<style>
	/* Navigation */
	.nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		padding: var(--space-lg) var(--space-xl);
	}

	.nav-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 1600px;
		margin: 0 auto;
	}

	.nav-links-left,
	.nav-links-right {
		display: flex;
		gap: var(--space-xl);
		font-size: var(--text-caption);
		font-weight: 500;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.nav-logo {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
	}

	.logo-symbol {
		width: 48px;
		height: 48px;
		border: 1px solid currentColor;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.logo-symbol::before {
		content: '';
		width: 32px;
		height: 32px;
		border: 1px solid currentColor;
		border-radius: 50%;
		position: absolute;
	}

	.logo-symbol::after {
		content: '';
		position: absolute;
		width: 100%;
		height: 1px;
		background: currentColor;
		top: 50%;
		left: 0;
	}

	.logo-symbol.large {
		width: 96px;
		height: 96px;
	}

	.logo-symbol.large::before {
		width: 64px;
		height: 64px;
	}

	.mobile-menu-button {
		display: none;
		color: currentColor;
	}

	/* Hero */
	.hero {
		position: relative;
		height: 100vh;
		min-height: 600px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		overflow: hidden;
		padding: calc(60px + var(--space-xl)) var(--space-xl) var(--space-xl);
	}

	.hero-bg-image {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
		opacity: 0.3;
		z-index: 0;
	}

	.hero-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100%;
		color: white;
	}

	.hero-meta {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		font-size: var(--text-caption);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.7);
	}

	.hero-meta-left {
		max-width: 320px;
	}

	.hero-artist {
		font-weight: 700;
		margin-bottom: var(--space-xs);
		color: white;
	}

	.hero-description {
		line-height: 1.6;
	}

	.hero-meta-right {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.hero-title {
		text-align: center;
		mix-blend-mode: overlay;
		opacity: 0.9;
		margin-bottom: 0;
	}

	/* Design Statement */
	.statement-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2xl);
		align-items: center;
	}

	.statement-text {
		grid-column: 1 / 2;
		grid-row: 1;
	}

	.statement-images {
		grid-column: 2 / 3;
		grid-row: 1 / 3;
		position: relative;
		height: 800px;
	}

	.statement-img-back,
	.statement-img-front {
		position: absolute;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		overflow: hidden;
	}

	.statement-img-back img,
	.statement-img-front img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		background: var(--color-bg-subtle);
	}

	.statement-img-back {
		top: 0;
		right: 0;
		width: 75%;
		height: 75%;
		z-index: 0;
	}

	.statement-img-front {
		bottom: 0;
		left: 0;
		width: 60%;
		height: 60%;
		z-index: 1;
		box-shadow: var(--shadow-lg);
	}

	.statement-description {
		grid-column: 1 / 2;
		grid-row: 2;
		max-width: 400px;
	}

	.statement-description h3 {
		margin-bottom: var(--space-md);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		letter-spacing: 0.15em;
	}

	.statement-description p {
		color: var(--color-fg-tertiary);
		line-height: 1.8;
		font-size: var(--text-body-sm);
	}

	/* Categories */
	.categories {
		position: relative;
		background: var(--color-bg-elevated);
		overflow: hidden;
	}

	.categories-grid {
		position: relative;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md) var(--space-xl);
		justify-content: center;
		align-items: baseline;
	}

	.category-item {
		display: flex;
		align-items: baseline;
		gap: var(--space-xs);
	}

	.category-number {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-weight: 400;
		letter-spacing: 0.1em;
	}

	.category-link {
		font-size: clamp(1.5rem, 3vw, 3.5rem);
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
		text-transform: uppercase;
	}

	.category-link:hover {
		color: var(--color-fg-primary);
		opacity: 1;
	}

	/* Products Grid */
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.section-title {
		font-size: clamp(2rem, 4vw, 4rem);
		font-weight: 700;
		letter-spacing: -0.01em;
		text-transform: uppercase;
	}

	.section-subtitle {
		max-width: 400px;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		line-height: 1.6;
		letter-spacing: 0.05em;
	}

	.products-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-lg);
	}

	.product-card {
		display: block;
	}

	.product-image {
		width: 100%;
		aspect-ratio: 3/4;
		margin-bottom: var(--space-md);
		overflow: hidden;
		border: 1px solid var(--color-border-default);
	}

	.product-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		background: var(--color-bg-subtle);
	}

	.product-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.product-details {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-sm);
	}

	.product-name {
		font-size: var(--text-caption);
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.product-price {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		white-space: nowrap;
	}

	/* Gallery */
	.gallery {
		position: relative;
		background: var(--color-bg-pure);
		min-height: 100vh;
		display: flex;
		align-items: center;
	}

	.gallery-label {
		position: absolute;
		top: var(--space-lg);
		left: var(--space-lg);
		font-size: var(--text-caption);
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.5);
	}

	.gallery-content {
		max-width: 1600px;
		margin: 0 auto;
		padding: 0 var(--space-xl);
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: var(--space-2xl);
		width: 100%;
	}

	.gallery-text {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding-bottom: var(--space-2xl);
		color: rgba(255, 255, 255, 0.7);
	}

	.gallery-icon {
		width: 16px;
		height: 16px;
		background: rgba(255, 255, 255, 0.2);
		margin-bottom: var(--space-md);
	}

	.gallery-title {
		font-weight: 700;
		font-size: var(--text-caption);
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: white;
		margin-bottom: var(--space-sm);
	}

	.gallery-description {
		font-size: var(--text-caption);
		line-height: 1.6;
	}

	.gallery-images {
		display: flex;
		gap: var(--space-md);
		overflow-x: auto;
	}

	.gallery-item {
		width: 320px;
		aspect-ratio: 3/4;
		flex-shrink: 0;
		background: var(--color-bg-subtle);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: var(--space-xs);
		overflow: hidden;
	}

	.gallery-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		background: var(--color-bg-subtle);
	}

	/* Icons of the Wardrobe */
	.icons-wrapper {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0;
		background: var(--color-bg-pure);
		color: white;
	}

	.icons-text {
		padding: var(--space-2xl);
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.icons-text h2 {
		margin-bottom: var(--space-xl);
	}

	.icons-text p {
		font-size: var(--text-caption);
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.6);
		letter-spacing: 0.05em;
	}

	.icons-image {
		position: relative;
		padding: var(--space-2xl);
	}

	.icons-frame {
		width: 100%;
		height: 100%;
		border: 16px solid white;
		background: var(--color-bg-subtle);
		overflow: hidden;
	}

	.icons-frame img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		background: var(--color-bg-subtle);
	}

	/* Timeless Style */
	.timeless {
		text-align: center;
	}

	.timeless-title {
		margin-bottom: var(--space-2xl);
	}

	.timeless-grid-wrapper {
		position: relative;
		margin-top: var(--space-2xl);
	}

	.timeless-grid {
		position: relative;
		z-index: 1;
	}

	.timeless-card:nth-child(1) {
		transform: translateY(var(--space-xl));
	}

	.timeless-card:nth-child(3) {
		transform: translateY(calc(-1 * var(--space-md)));
	}

	.timeless-card:nth-child(4) {
		transform: translateY(var(--space-sm));
	}

	/* Newsletter */
	.newsletter {
		background: var(--color-bg-pure);
		color: white;
	}

	.newsletter-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2xl);
		align-items: center;
	}

	.newsletter-text h2 {
		margin-bottom: var(--space-md);
		font-size: clamp(1.5rem, 3vw, 3rem);
	}

	.newsletter-text p {
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.8;
		font-size: var(--text-body-sm);
	}

	.newsletter-form {
		display: flex;
		border-bottom: 1px solid rgba(255, 255, 255, 0.3);
		padding-bottom: var(--space-sm);
	}

	.newsletter-input {
		flex: 1;
		background: transparent;
		border: none;
		color: white;
		font-family: inherit;
		font-size: var(--text-caption);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.newsletter-input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.newsletter-input:focus {
		outline: none;
	}

	.newsletter-button {
		font-weight: 700;
		font-size: var(--text-caption);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: white;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.newsletter-button:hover {
		opacity: 0.7;
	}

	/* Footer */
	.footer {
		background: var(--color-bg-pure);
		color: white;
		padding: var(--space-2xl) 0;
	}

	.footer-content {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-2xl);
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-2xl);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.footer-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.footer-info h4 {
		font-size: var(--text-caption);
		letter-spacing: 0.15em;
		color: white;
		margin-bottom: var(--space-xs);
		font-weight: 700;
		text-transform: uppercase;
	}

	.footer-info a {
		font-size: var(--text-caption);
		color: rgba(255, 255, 255, 0.6);
		letter-spacing: 0.05em;
		transition: color var(--duration-micro) var(--ease-standard);
		text-transform: uppercase;
	}

	.footer-info a:hover {
		color: white;
		opacity: 1;
	}

	.footer-brand {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		position: relative;
	}

	.footer-logo-text {
		font-size: clamp(6rem, 18vw, 18rem);
		line-height: 0.75;
	}

	.footer-logo-symbol {
		position: absolute;
		right: 0;
		bottom: 0;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.statement-grid,
		.icons-wrapper,
		.newsletter-content {
			grid-template-columns: 1fr;
		}

		.statement-images {
			grid-row: 2;
			grid-column: 1;
			height: 600px;
		}

		.statement-description {
			grid-row: 3;
		}

		.gallery-content {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.mobile-menu-button {
			display: block;
		}

		.nav-links-left,
		.nav-links-right {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			background: var(--color-bg-pure);
			flex-direction: column;
			padding: var(--space-md);
			gap: var(--space-md);
			display: none;
		}

		.nav-links-right.open {
			display: flex;
		}

		.categories-grid {
			flex-direction: column;
			align-items: flex-start;
		}

		.products-grid {
			grid-template-columns: 1fr;
		}

		.gallery-images {
			flex-direction: column;
		}

		.gallery-item {
			width: 100%;
		}
	}
</style>
