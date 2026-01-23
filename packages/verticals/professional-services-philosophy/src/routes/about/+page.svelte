<script lang="ts">
	import { SEO } from '@create-something/components';
	import ConsultationCTA from '$lib/components/ConsultationCTA.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEO
	title="About Us"
	description="Learn about our firm's history, values, and commitment to delivering exceptional professional services."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'About', url: '/about' }
	]}
/>
<StructuredData page="about" />

<div class="about-page">
	<!-- Page Header -->
	<section class="page-header">
		<div class="container">
			<h1>About Us</h1>
			<p class="lead">
				A commitment to excellence, built on decades of experience and a dedication to our clients'
				success.
			</p>
		</div>
	</section>

	<!-- Mission Section -->
	<section class="mission-section">
		<div class="container">
			<div class="mission-grid">
				<div class="mission-content">
					<h2>Our Mission</h2>
					<p>
						We exist to help organizations navigate complexity with clarity. Through strategic
						guidance, deep expertise, and unwavering commitment, we transform challenges into
						opportunities for sustainable growth.
					</p>
					<p>
						Our approach combines rigorous analysis with practical wisdom, ensuring that every
						recommendation is both strategically sound and operationally achievable.
					</p>
				</div>
				<div class="mission-stats">
					<div class="stat">
						<span class="stat-value">25+</span>
						<span class="stat-label">Years of Experience</span>
					</div>
					<div class="stat">
						<span class="stat-value">500+</span>
						<span class="stat-label">Clients Served</span>
					</div>
					<div class="stat">
						<span class="stat-value">98%</span>
						<span class="stat-label">Client Retention</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Values Section -->
	<section class="values-section">
		<div class="container">
			<h2>Our Values</h2>
			<p class="section-lead">The principles that guide everything we do.</p>

			<div class="values-grid">
				<article class="value-card">
					<h3>Integrity</h3>
					<p>
						We uphold the highest ethical standards in all our dealings. Trust is the foundation of
						every relationship we build.
					</p>
				</article>

				<article class="value-card">
					<h3>Excellence</h3>
					<p>
						We pursue the highest quality in our work. Good enough is never enough when our
						clients' success is at stake.
					</p>
				</article>

				<article class="value-card">
					<h3>Collaboration</h3>
					<p>
						We work as partners, not vendors. Your challenges become our challenges, and your
						success is our success.
					</p>
				</article>

				<article class="value-card">
					<h3>Innovation</h3>
					<p>
						We embrace new approaches and technologies while respecting proven methodologies. The
						best solutions often blend both.
					</p>
				</article>
			</div>
		</div>
	</section>

	<!-- History Section -->
	<section class="history-section">
		<div class="container">
			<h2>Our Story</h2>
			<div class="history-content">
				<p>
					Founded in 1998, our firm began with a simple premise: professional services should be
					both exceptional and accessible. What started as a small consultancy has grown into a
					comprehensive practice serving clients across industries.
				</p>
				<p>
					Throughout our journey, we've remained true to our founding principles. We've grown not
					by chasing size, but by deepening our expertise and strengthening our relationships. Each
					engagement teaches us something new, and that accumulated wisdom flows into every project
					we undertake.
				</p>
				<p>
					Today, we're proud to serve a diverse portfolio of clients—from emerging startups to
					established enterprises—all of whom share our commitment to excellence and integrity.
				</p>
			</div>
		</div>
	</section>

	<!-- Approach Section -->
	<section class="approach-section">
		<div class="container">
			<div class="approach-grid">
				<div class="approach-content">
					<h2>Our Approach</h2>
					<p>
						We believe in less, but better. Rather than overwhelming you with options, we focus on
						what matters most: understanding your unique situation and delivering solutions that
						create lasting value.
					</p>
					<ul class="approach-list">
						<li>
							<strong>Listen First</strong> — We begin every engagement by deeply understanding your
							context, challenges, and aspirations.
						</li>
						<li>
							<strong>Think Strategically</strong> — We analyze options rigorously, considering both
							immediate needs and long-term implications.
						</li>
						<li>
							<strong>Act Decisively</strong> — Once aligned on direction, we execute with precision
							and accountability.
						</li>
						<li>
							<strong>Measure Relentlessly</strong> — We track outcomes and refine our approach to ensure
							sustainable results.
						</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<ConsultationCTA />
</div>

<style>
	.about-page {
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	/* Page Header */
	.page-header {
		padding: var(--space-2xl) 0 var(--space-xl);
		text-align: center;
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-header h1 {
		font-size: var(--text-display);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		letter-spacing: -0.02em;
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin: 0 auto;
		line-height: 1.6;
	}

	/* Mission Section */
	.mission-section {
		padding: var(--space-2xl) 0;
	}

	.mission-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--space-xl);
		align-items: start;
	}

	@media (max-width: 768px) {
		.mission-grid {
			grid-template-columns: 1fr;
		}
	}

	.mission-content h2 {
		font-size: var(--text-h1);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.mission-content p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-md);
	}

	.mission-stats {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.stat {
		text-align: center;
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.stat:last-child {
		border-bottom: none;
	}

	.stat-value {
		display: block;
		font-size: var(--text-h1);
		font-weight: 300;
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Values Section */
	.values-section {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.values-section h2 {
		font-size: var(--text-h1);
		font-weight: 300;
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-sm);
	}

	.section-lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.values-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 768px) {
		.values-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.values-grid {
			grid-template-columns: 1fr;
		}
	}

	.value-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.value-card h3 {
		font-size: var(--text-h3);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.value-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	/* History Section */
	.history-section {
		padding: var(--space-2xl) 0;
	}

	.history-section h2 {
		font-size: var(--text-h1);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-lg);
	}

	.history-content {
		max-width: 800px;
	}

	.history-content p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-md);
	}

	/* Approach Section */
	.approach-section {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.approach-content h2 {
		font-size: var(--text-h1);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.approach-content > p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-lg);
		max-width: 700px;
	}

	.approach-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 768px) {
		.approach-list {
			grid-template-columns: 1fr;
		}
	}

	.approach-list li {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
	}

	.approach-list li strong {
		display: block;
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.approach-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}
</style>
