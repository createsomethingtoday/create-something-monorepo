<script lang="ts">
	/**
	 * Home Page - Rudolf Template Direct Replication
	 *
	 * Layout order matches Rudolf exactly:
	 * 1. Opening Gallery (4-image grayscale grid)
	 * 2. Black Hero (full-width, large typography)
	 * 3. Logo Bar (client logos)
	 * 4. Selected Works (asymmetric project grid)
	 * 5. Services (large text links)
	 * 6. Stats (overlay on background image)
	 * 7. Philosophy (2-column layout)
	 * 8. Testimonials (3-column cards)
	 * 9. Footer with contact overlay
	 */

	import { siteConfig } from '$lib/config/context';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEOHead canonical="/" />
<StructuredData page="home" />

<!-- Opening Gallery: 4-image grayscale grid -->
<section class="opening-gallery">
	<div class="gallery-grid">
		<a href="/projects" class="gallery-item">
			<img
				src="/gallery/residential.jpg"
				alt="Modern residential architecture"
				class="gallery-img"
			/>
		</a>
		<a href="/projects" class="gallery-item">
			<img
				src="/gallery/commercial.jpg"
				alt="Commercial building design"
				class="gallery-img"
			/>
		</a>
		<a href="/projects" class="gallery-item">
			<img
				src="/gallery/interior.jpg"
				alt="Interior design project"
				class="gallery-img"
			/>
		</a>
		<a href="/projects" class="gallery-item">
			<img
				src="/gallery/landscape.jpg"
				alt="Landscape architecture"
				class="gallery-img"
			/>
		</a>
	</div>
</section>

<!-- Black Hero Section -->
<section class="hero-section">
	<div class="hero-container">
		<h1 class="hero-headline">
			We are a team of architects <br class="desktop-only" />
			dedicated to <em>transforming</em> spaces <br class="desktop-only" />
			into extraordinary living experiences
		</h1>
		<div class="hero-cta">
			<a href="/projects" class="btn-hero">
				See Our Work
				<span class="arrow">→</span>
			</a>
		</div>
	</div>
</section>

<!-- Logo Bar -->
<section class="logo-bar">
	<div class="logo-bar-container">
		<p class="logo-bar-label">Trusted by leading organizations</p>
		<div class="logo-grid">
			<div class="logo-item">Archdaily</div>
			<div class="logo-item">Dezeen</div>
			<div class="logo-item">Dwell</div>
			<div class="logo-item">Wallpaper*</div>
			<div class="logo-item">Azure</div>
		</div>
	</div>
</section>

<!-- Selected Works -->
<section class="selected-works" id="projects">
	<div class="works-container">
		<div class="section-header">
			<span class="section-label">Selected Work</span>
			<a href="/projects" class="view-all">View All Projects →</a>
		</div>

		<div class="works-grid">
			<a href="/projects" class="work-item large">
				<div class="work-image-wrapper">
					<img
						src="/projects/casa-moderna.jpg"
						alt="Casa Moderna"
						class="work-img"
					/>
					<div class="work-overlay">
						<span class="work-arrow">→</span>
					</div>
				</div>
				<div class="work-info">
					<h3 class="work-title">Casa Moderna</h3>
					<p class="work-category">Residential</p>
				</div>
			</a>

			<a href="/projects" class="work-item">
				<div class="work-image-wrapper">
					<img
						src="/projects/urban-loft.jpg"
						alt="Urban Loft"
						class="work-img"
					/>
					<div class="work-overlay">
						<span class="work-arrow">→</span>
					</div>
				</div>
				<div class="work-info">
					<h3 class="work-title">Urban Loft</h3>
					<p class="work-category">Interior</p>
				</div>
			</a>

			<a href="/projects" class="work-item">
				<div class="work-image-wrapper">
					<img
						src="/projects/horizon-tower.jpg"
						alt="Horizon Tower"
						class="work-img"
					/>
					<div class="work-overlay">
						<span class="work-arrow">→</span>
					</div>
				</div>
				<div class="work-info">
					<h3 class="work-title">Horizon Tower</h3>
					<p class="work-category">Commercial</p>
				</div>
			</a>

			<a href="/projects" class="work-item wide">
				<div class="work-image-wrapper">
					<img
						src="/projects/zen-retreat.jpg"
						alt="Zen Retreat"
						class="work-img"
					/>
					<div class="work-overlay">
						<span class="work-arrow">→</span>
					</div>
				</div>
				<div class="work-info">
					<h3 class="work-title">Zen Retreat</h3>
					<p class="work-category">Hospitality</p>
				</div>
			</a>
		</div>
	</div>
</section>

<!-- Services (Large Text Links) -->
<section class="services-section">
	<div class="services-container">
		<a href="/services" class="service-row">
			<span class="service-number">01</span>
			<span class="service-name">Architecture</span>
			<span class="service-arrow">→</span>
		</a>
		<a href="/services" class="service-row">
			<span class="service-number">02</span>
			<span class="service-name">Interior Design</span>
			<span class="service-arrow">→</span>
		</a>
		<a href="/services" class="service-row">
			<span class="service-number">03</span>
			<span class="service-name">Urban Planning</span>
			<span class="service-arrow">→</span>
		</a>
		<a href="/services" class="service-row">
			<span class="service-number">04</span>
			<span class="service-name">Landscape Design</span>
			<span class="service-arrow">→</span>
		</a>
		<a href="/services" class="service-row">
			<span class="service-number">05</span>
			<span class="service-name">Renovation</span>
			<span class="service-arrow">→</span>
		</a>
	</div>
</section>

<!-- Stats Section with Background -->
<section class="stats-section">
	<div class="stats-bg">
		<img
			src="/backgrounds/stats-bg.jpg"
			alt="Architecture background"
			class="stats-bg-img"
		/>
		<div class="stats-overlay"></div>
	</div>
	<div class="stats-container">
		<div class="stat-item">
			<span class="stat-number">75+</span>
			<span class="stat-label">Projects Completed</span>
		</div>
		<div class="stat-item">
			<span class="stat-number">14+</span>
			<span class="stat-label">Years Experience</span>
		</div>
		<div class="stat-item">
			<span class="stat-number">99%</span>
			<span class="stat-label">Client Satisfaction</span>
		</div>
		<div class="stat-item">
			<span class="stat-number">6M</span>
			<span class="stat-label">Sq. Ft. Designed</span>
		</div>
	</div>
</section>

<!-- Philosophy Section -->
<section class="philosophy-section">
	<div class="philosophy-container">
		<div class="philosophy-left">
			<span class="section-label">Our Philosophy</span>
			<h2 class="philosophy-headline">
				Design is not just what it looks like. Design is how it works.
			</h2>
		</div>
		<div class="philosophy-right">
			<p class="philosophy-text">
				We believe that architecture should serve the people who inhabit it. Every line,
				every material, every space is considered with purpose. Our approach merges
				innovative design with sustainable practices, creating environments that inspire
				and endure.
			</p>
			<p class="philosophy-text">
				From concept to completion, we work closely with our clients to understand their
				vision and translate it into reality. The result is architecture that tells a story—
				your story.
			</p>
			<a href="/studio" class="btn-outline">
				Learn More About Us
				<span class="arrow">→</span>
			</a>
		</div>
	</div>
</section>

<!-- Testimonials -->
<section class="testimonials-section">
	<div class="testimonials-container">
		<span class="section-label">What Clients Say</span>

		<div class="testimonials-grid">
			<div class="testimonial-card">
				<p class="testimonial-quote">
					"Working with this team was an absolute pleasure. They understood our vision
					from day one and delivered beyond our expectations."
				</p>
				<div class="testimonial-author">
					<span class="author-name">Sarah Chen</span>
					<span class="author-title">CEO, TechStart Inc.</span>
				</div>
			</div>

			<div class="testimonial-card">
				<p class="testimonial-quote">
					"The attention to detail and commitment to sustainable design made all the
					difference. Our new headquarters is a testament to their expertise."
				</p>
				<div class="testimonial-author">
					<span class="author-name">Michael Torres</span>
					<span class="author-title">Director, Green Living Co.</span>
				</div>
			</div>

			<div class="testimonial-card">
				<p class="testimonial-quote">
					"They transformed our dated office into a modern, inspiring workspace.
					The team's creativity and professionalism are unmatched."
				</p>
				<div class="testimonial-author">
					<span class="author-name">Emma Wilson</span>
					<span class="author-title">Founder, Creative Labs</span>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Contact CTA -->
<section class="contact-cta" id="contact">
	<div class="contact-bg">
		<img
			src="/backgrounds/contact-bg.jpg"
			alt="Contact background"
			class="contact-bg-img"
		/>
		<div class="contact-overlay"></div>
	</div>
	<div class="contact-container">
		<h2 class="contact-headline">Ready to start your project?</h2>
		<p class="contact-subhead">Let's create something extraordinary together.</p>
		<a href="/contact" class="btn-primary">
			Get in Touch
			<span class="arrow">→</span>
		</a>
	</div>
</section>

<style>
	/* === Opening Gallery === */
	.opening-gallery {
		padding: 0;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		height: 50vh;
		min-height: 400px;
	}

	.gallery-item {
		position: relative;
		overflow: hidden;
	}

	.gallery-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: grayscale(100%);
		transition: filter 0.5s ease, transform 0.5s ease;
	}

	.gallery-item:hover .gallery-img {
		filter: grayscale(0%);
		transform: scale(1.05);
	}

	/* === Hero Section === */
	.hero-section {
		background: #000;
		padding: clamp(4rem, 12vw, 10rem) clamp(1.5rem, 5vw, 4rem);
	}

	.hero-container {
		max-width: 1400px;
		margin: 0 auto;
	}

	.hero-headline {
		font-family: 'Manrope', sans-serif;
		font-size: clamp(2rem, 5vw, 4.5rem);
		font-weight: 400;
		line-height: 1.2;
		color: #fff;
		margin: 0 0 2rem 0;
	}

	.hero-headline em {
		font-style: italic;
	}

	.desktop-only {
		display: none;
	}

	.hero-cta {
		margin-top: 2rem;
	}

	.btn-hero {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 2rem;
		background: transparent;
		color: #fff;
		border: 1px solid rgba(255,255,255,0.3);
		border-radius: 100px;
		font-size: 1rem;
		text-decoration: none;
		transition: all 0.3s ease;
	}

	.btn-hero:hover {
		background: #fff;
		color: #000;
		border-color: #fff;
	}

	.arrow {
		transition: transform 0.3s ease;
	}

	.btn-hero:hover .arrow {
		transform: translateX(4px);
	}

	/* === Logo Bar === */
	.logo-bar {
		background: #f5f5f5;
		padding: 3rem 1.5rem;
	}

	.logo-bar-container {
		max-width: 1400px;
		margin: 0 auto;
		text-align: center;
	}

	.logo-bar-label {
		font-size: 0.875rem;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 1.5rem;
	}

	.logo-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 2rem 3rem;
	}

	.logo-item {
		font-size: 1.25rem;
		font-weight: 600;
		color: #999;
	}

	/* === Selected Works === */
	.selected-works {
		padding: clamp(4rem, 10vw, 8rem) clamp(1.5rem, 5vw, 4rem);
		background: #fff;
	}

	.works-container {
		max-width: 1400px;
		margin: 0 auto;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 3rem;
	}

	.section-label {
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #666;
	}

	.view-all {
		font-size: 0.875rem;
		color: #000;
		text-decoration: none;
		transition: opacity 0.3s;
	}

	.view-all:hover {
		opacity: 0.6;
	}

	.works-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2rem;
	}

	.work-item {
		text-decoration: none;
		color: inherit;
	}

	.work-item.large {
		grid-column: span 2;
	}

	.work-item.wide {
		grid-column: span 2;
	}

	.work-image-wrapper {
		position: relative;
		overflow: hidden;
		aspect-ratio: 4/3;
	}

	.work-item.large .work-image-wrapper,
	.work-item.wide .work-image-wrapper {
		aspect-ratio: 16/9;
	}

	.work-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.5s ease;
	}

	.work-item:hover .work-img {
		transform: scale(1.05);
	}

	.work-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0,0,0,0);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.3s ease;
	}

	.work-item:hover .work-overlay {
		background: rgba(0,0,0,0.3);
	}

	.work-arrow {
		width: 60px;
		height: 60px;
		background: #fff;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		opacity: 0;
		transform: scale(0.8);
		transition: all 0.3s ease;
	}

	.work-item:hover .work-arrow {
		opacity: 1;
		transform: scale(1);
	}

	.work-info {
		padding: 1.5rem 0;
	}

	.work-title {
		font-size: 1.25rem;
		font-weight: 500;
		margin: 0 0 0.25rem 0;
	}

	.work-category {
		font-size: 0.875rem;
		color: #666;
		margin: 0;
	}

	/* === Services Section === */
	.services-section {
		padding: clamp(4rem, 10vw, 8rem) clamp(1.5rem, 5vw, 4rem);
		background: #000;
	}

	.services-container {
		max-width: 1400px;
		margin: 0 auto;
	}

	.service-row {
		display: flex;
		align-items: center;
		padding: 2rem 0;
		border-bottom: 1px solid rgba(255,255,255,0.1);
		text-decoration: none;
		color: #fff;
		transition: opacity 0.3s;
	}

	.service-row:first-child {
		border-top: 1px solid rgba(255,255,255,0.1);
	}

	.service-row:hover {
		opacity: 0.7;
	}

	.service-number {
		font-size: 0.875rem;
		color: #666;
		width: 60px;
	}

	.service-name {
		font-size: clamp(1.5rem, 4vw, 3rem);
		font-weight: 400;
		flex: 1;
	}

	.service-arrow {
		font-size: 1.5rem;
		opacity: 0;
		transform: translateX(-10px);
		transition: all 0.3s ease;
	}

	.service-row:hover .service-arrow {
		opacity: 1;
		transform: translateX(0);
	}

	/* === Stats Section === */
	.stats-section {
		position: relative;
		padding: clamp(6rem, 15vw, 12rem) clamp(1.5rem, 5vw, 4rem);
	}

	.stats-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.stats-bg-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.stats-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0,0,0,0.7);
	}

	.stats-container {
		position: relative;
		z-index: 1;
		max-width: 1400px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 2rem;
		text-align: center;
	}

	.stat-item {
		color: #fff;
	}

	.stat-number {
		display: block;
		font-size: clamp(2.5rem, 6vw, 5rem);
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		opacity: 0.7;
	}

	/* === Philosophy Section === */
	.philosophy-section {
		padding: clamp(4rem, 10vw, 8rem) clamp(1.5rem, 5vw, 4rem);
		background: #fff;
	}

	.philosophy-container {
		max-width: 1400px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
	}

	.philosophy-left {
		position: sticky;
		top: 100px;
		align-self: start;
	}

	.philosophy-headline {
		font-size: clamp(1.75rem, 4vw, 3rem);
		font-weight: 400;
		line-height: 1.3;
		margin: 1rem 0 0 0;
	}

	.philosophy-text {
		font-size: 1.125rem;
		line-height: 1.7;
		color: #333;
		margin-bottom: 1.5rem;
	}

	.btn-outline {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 2rem;
		background: transparent;
		color: #000;
		border: 1px solid #000;
		border-radius: 100px;
		font-size: 1rem;
		text-decoration: none;
		transition: all 0.3s ease;
		margin-top: 1rem;
	}

	.btn-outline:hover {
		background: #000;
		color: #fff;
	}

	/* === Testimonials === */
	.testimonials-section {
		padding: clamp(4rem, 10vw, 8rem) clamp(1.5rem, 5vw, 4rem);
		background: #f5f5f5;
	}

	.testimonials-container {
		max-width: 1400px;
		margin: 0 auto;
	}

	.testimonials-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
		margin-top: 3rem;
	}

	.testimonial-card {
		background: #fff;
		padding: 2.5rem;
		border-radius: 8px;
	}

	.testimonial-quote {
		font-size: 1.125rem;
		line-height: 1.7;
		color: #333;
		margin: 0 0 2rem 0;
	}

	.testimonial-author {
		display: flex;
		flex-direction: column;
	}

	.author-name {
		font-weight: 600;
		color: #000;
	}

	.author-title {
		font-size: 0.875rem;
		color: #666;
		margin-top: 0.25rem;
	}

	/* === Contact CTA === */
	.contact-cta {
		position: relative;
		padding: clamp(6rem, 15vw, 12rem) clamp(1.5rem, 5vw, 4rem);
		text-align: center;
	}

	.contact-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.contact-bg-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.contact-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0,0,0,0.6);
	}

	.contact-container {
		position: relative;
		z-index: 1;
	}

	.contact-headline {
		font-size: clamp(2rem, 5vw, 4rem);
		font-weight: 400;
		color: #fff;
		margin: 0 0 1rem 0;
	}

	.contact-subhead {
		font-size: 1.25rem;
		color: rgba(255,255,255,0.8);
		margin: 0 0 2rem 0;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 2.5rem;
		background: #fff;
		color: #000;
		border: none;
		border-radius: 100px;
		font-size: 1rem;
		font-weight: 500;
		text-decoration: none;
		transition: all 0.3s ease;
	}

	.btn-primary:hover {
		background: #000;
		color: #fff;
	}

	/* === Responsive === */
	@media (min-width: 768px) {
		.desktop-only {
			display: inline;
		}
	}

	@media (max-width: 1024px) {
		.gallery-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.stats-container {
			grid-template-columns: repeat(2, 1fr);
		}

		.philosophy-container {
			grid-template-columns: 1fr;
		}

		.philosophy-left {
			position: static;
		}

		.testimonials-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.gallery-grid {
			grid-template-columns: 1fr;
			height: auto;
		}

		.gallery-item {
			height: 250px;
		}

		.works-grid {
			grid-template-columns: 1fr;
		}

		.work-item.large,
		.work-item.wide {
			grid-column: span 1;
		}

		.stats-container {
			grid-template-columns: repeat(2, 1fr);
			gap: 3rem 1rem;
		}

		.testimonials-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
