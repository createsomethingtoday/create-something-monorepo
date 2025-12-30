<script lang="ts">
	// Court Reserve Landing Page
	// The infrastructure disappears; courts get booked.
</script>

<svelte:head>
	<title>Court Reserve - Autonomous Court Scheduling</title>
	<meta
		name="description"
		content="The AI-powered court reservation system that handles scheduling, waitlists, and optimization autonomously."
	/>
</svelte:head>

<main class="min-h-screen">
	<!-- Hero Section -->
	<section class="hero">
		<div class="container">
			<div class="hero-content">
				<h1 class="hero-title">
					<span class="hero-title-line">Court Reserve</span>
				</h1>
				<p class="hero-subtitle">
					The autonomous court scheduling system. AI handles conflicts, waitlists, and
					optimization—you focus on playing.
				</p>
				<div class="hero-cta">
					<a href="/onboard" class="btn-primary">Get Started</a>
					<a href="#features" class="btn-secondary">Learn More</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section id="features" class="features">
		<div class="container">
			<h2 class="section-title">Why Court Reserve?</h2>
			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 6v6l4 2" />
						</svg>
					</div>
					<h3>Real-time Availability</h3>
					<p>
						See court availability instantly. No double-bookings. Durable Objects ensure consistent
						state across all users.
					</p>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
						</svg>
					</div>
					<h3>SMS Booking</h3>
					<p>
						Members text to book. AI understands natural language: "Reserve court 3 at 6pm tomorrow"
						just works.
					</p>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M12 2v20M2 12h20" />
							<path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20" />
						</svg>
					</div>
					<h3>Smart Waitlist</h3>
					<p>
						When a slot opens, we automatically offer it to the right person. Auto-book for members
						who opt in.
					</p>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M3 3v18h18" />
							<path d="M18 17V9M13 17V5M8 17v-3" />
						</svg>
					</div>
					<h3>Demand Optimization</h3>
					<p>
						AI learns your facility's patterns. Get pricing suggestions and proactive gap-filling
						notifications.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Pricing Section -->
	<section class="pricing">
		<div class="container">
			<h2 class="section-title">Simple Pricing</h2>
			<p class="pricing-subtitle">5% platform fee on bookings. No hidden costs.</p>
			<div class="pricing-grid">
				<div class="pricing-card">
					<h3>Basic</h3>
					<div class="price">
						<span class="price-amount">$49</span>
						<span class="price-period">/month</span>
					</div>
					<ul class="pricing-features">
						<li>Up to 2 courts</li>
						<li>Basic scheduling</li>
						<li>Email notifications</li>
						<li>Email support</li>
					</ul>
					<a href="/onboard?plan=basic" class="btn-outline">Start Free Trial</a>
				</div>

				<div class="pricing-card featured">
					<div class="pricing-badge">Popular</div>
					<h3>Pro</h3>
					<div class="price">
						<span class="price-amount">$99</span>
						<span class="price-period">/month</span>
					</div>
					<ul class="pricing-features">
						<li>Up to 10 courts</li>
						<li>SMS booking</li>
						<li>Waitlist management</li>
						<li>Member management</li>
						<li>Priority support</li>
					</ul>
					<a href="/onboard?plan=pro" class="btn-primary">Start Free Trial</a>
				</div>

				<div class="pricing-card">
					<h3>Enterprise</h3>
					<div class="price">
						<span class="price-amount">$249</span>
						<span class="price-period">/month</span>
					</div>
					<ul class="pricing-features">
						<li>Unlimited courts</li>
						<li>API access</li>
						<li>Demand optimization</li>
						<li>Custom integrations</li>
						<li>Dedicated support</li>
					</ul>
					<a href="/onboard?plan=enterprise" class="btn-outline">Contact Sales</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="footer">
		<div class="container">
			<div class="footer-content">
				<p class="footer-brand">Court Reserve</p>
				<p class="footer-tagline">The infrastructure disappears; courts get booked.</p>
				<p class="footer-attribution">
					A <a href="https://createsomething.agency">CREATE SOMETHING</a> product
				</p>
			</div>
		</div>
	</footer>
</main>

<style>
	/* Layout */
	.container {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	/* Hero */
	.hero {
		min-height: 80vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4rem 0;
		background: linear-gradient(180deg, var(--color-bg-pure) 0%, var(--color-bg-elevated) 100%);
	}

	.hero-content {
		text-align: center;
		max-width: 48rem;
	}

	.hero-title {
		font-size: clamp(2.5rem, 8vw, 5rem);
		font-weight: 700;
		line-height: 1.1;
		margin: 0 0 1.5rem;
		color: var(--color-fg-primary);
	}

	.hero-subtitle {
		font-size: 1.25rem;
		line-height: 1.6;
		color: var(--color-fg-secondary);
		margin: 0 0 2.5rem;
	}

	.hero-cta {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	/* Buttons */
	.btn-primary,
	.btn-secondary,
	.btn-outline {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.875rem 2rem;
		border-radius: var(--radius-lg);
		font-size: 1rem;
		font-weight: 500;
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-primary {
		background: var(--court-primary);
		color: #000;
	}

	.btn-primary:hover {
		background: var(--court-primary-dark);
	}

	.btn-secondary {
		background: var(--color-bg-subtle);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.btn-secondary:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.btn-outline {
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.btn-outline:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	/* Sections */
	.section-title {
		font-size: clamp(1.5rem, 4vw, 2.25rem);
		font-weight: 600;
		text-align: center;
		margin: 0 0 3rem;
		color: var(--color-fg-primary);
	}

	/* Features */
	.features {
		padding: 6rem 0;
		background: var(--color-bg-elevated);
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 2rem;
	}

	.feature-card {
		padding: 2rem;
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
	}

	.feature-icon {
		width: 3rem;
		height: 3rem;
		margin-bottom: 1rem;
		color: var(--court-primary);
	}

	.feature-icon svg {
		width: 100%;
		height: 100%;
	}

	.feature-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
		color: var(--color-fg-primary);
	}

	.feature-card p {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-fg-secondary);
		margin: 0;
	}

	/* Pricing */
	.pricing {
		padding: 6rem 0;
		background: var(--color-bg-pure);
	}

	.pricing-subtitle {
		text-align: center;
		color: var(--color-fg-secondary);
		margin: -2rem 0 3rem;
	}

	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 2rem;
		max-width: 60rem;
		margin: 0 auto;
	}

	.pricing-card {
		padding: 2rem;
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		text-align: center;
		position: relative;
	}

	.pricing-card.featured {
		border-color: var(--court-primary);
	}

	.pricing-badge {
		position: absolute;
		top: -0.75rem;
		left: 50%;
		transform: translateX(-50%);
		background: var(--court-primary);
		color: #000;
		padding: 0.25rem 1rem;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.pricing-card h3 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 1rem;
		color: var(--color-fg-primary);
	}

	.price {
		margin-bottom: 1.5rem;
	}

	.price-amount {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.price-period {
		font-size: 1rem;
		color: var(--color-fg-tertiary);
	}

	.pricing-features {
		list-style: none;
		padding: 0;
		margin: 0 0 2rem;
		text-align: left;
	}

	.pricing-features li {
		padding: 0.5rem 0;
		color: var(--color-fg-secondary);
		border-bottom: 1px solid var(--color-border-default);
	}

	.pricing-features li:last-child {
		border-bottom: none;
	}

	/* Footer */
	.footer {
		padding: 4rem 0;
		background: var(--color-bg-elevated);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-content {
		text-align: center;
	}

	.footer-brand {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.footer-tagline {
		color: var(--color-fg-tertiary);
		margin: 0 0 1rem;
	}

	.footer-attribution {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
	}

	.footer-attribution a {
		color: var(--color-fg-tertiary);
		text-decoration: none;
	}

	.footer-attribution a:hover {
		color: var(--color-fg-secondary);
	}
</style>
