<script lang="ts">
	import PracticeAreas from '$lib/components/PracticeAreas.svelte';
	import ConsultationCTA from '$lib/components/ConsultationCTA.svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEOHead
	title="Our Services"
	description="Comprehensive professional services tailored to your needs. Business consulting, legal advisory, financial planning, and strategic guidance."
	canonical="/services"
/>
<StructuredData page="services" />

<div class="services-page">
	<!-- Page Header -->
	<section class="page-header">
		<div class="container">
			<h1>Our Services</h1>
			<p class="lead">
				Comprehensive solutions designed to address your most pressing challenges and drive
				sustainable growth.
			</p>
		</div>
	</section>

	<!-- Practice Areas -->
	<PracticeAreas />

	<!-- Detailed Services -->
	<section class="detailed-services">
		<div class="container">
			<div class="services-grid">
				<article class="service-detail">
					<div class="service-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M12 6v6l4 2" />
							<circle cx="12" cy="12" r="10" />
						</svg>
					</div>
					<h3>Business Strategy</h3>
					<p>
						We help organizations define their vision, set strategic objectives, and develop
						actionable roadmaps for sustainable growth.
					</p>
					<ul class="service-features">
						<li>Market Analysis & Positioning</li>
						<li>Competitive Strategy Development</li>
						<li>Growth Planning & Execution</li>
						<li>Performance Optimization</li>
					</ul>
				</article>

				<article class="service-detail">
					<div class="service-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M9 12l2 2 4-4" />
							<path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h3>Legal Advisory</h3>
					<p>
						Navigate complex legal landscapes with confidence. Our advisory services protect your
						interests while enabling business objectives.
					</p>
					<ul class="service-features">
						<li>Contract Review & Negotiation</li>
						<li>Regulatory Compliance</li>
						<li>Risk Assessment & Mitigation</li>
						<li>Corporate Governance</li>
					</ul>
				</article>

				<article class="service-detail">
					<div class="service-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M3 3v18h18" />
							<path d="M18 9l-5 5-4-4-3 3" />
						</svg>
					</div>
					<h3>Financial Planning</h3>
					<p>
						Build a solid financial foundation with strategic planning, tax optimization, and
						investment guidance tailored to your goals.
					</p>
					<ul class="service-features">
						<li>Tax Strategy & Optimization</li>
						<li>Investment Planning</li>
						<li>Cash Flow Management</li>
						<li>Financial Reporting & Analysis</li>
					</ul>
				</article>

				<article class="service-detail">
					<div class="service-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
						</svg>
					</div>
					<h3>Operations Consulting</h3>
					<p>
						Streamline your operations, reduce costs, and improve efficiency through process
						optimization and technology integration.
					</p>
					<ul class="service-features">
						<li>Process Improvement</li>
						<li>Technology Integration</li>
						<li>Supply Chain Optimization</li>
						<li>Quality Management</li>
					</ul>
				</article>
			</div>
		</div>
	</section>

	<!-- Process Section -->
	<section class="our-process">
		<div class="container">
			<h2>Our Process</h2>
			<p class="section-lead">A proven methodology that delivers results.</p>

			<div class="process-steps">
				<div class="process-step">
					<span class="step-number">01</span>
					<h3>Discovery</h3>
					<p>We begin with a comprehensive assessment of your current situation, challenges, and objectives.</p>
				</div>

				<div class="process-step">
					<span class="step-number">02</span>
					<h3>Analysis</h3>
					<p>Our team analyzes findings and develops strategic recommendations tailored to your needs.</p>
				</div>

				<div class="process-step">
					<span class="step-number">03</span>
					<h3>Implementation</h3>
					<p>We work alongside your team to execute the strategy with precision and accountability.</p>
				</div>

				<div class="process-step">
					<span class="step-number">04</span>
					<h3>Optimization</h3>
					<p>Continuous monitoring and refinement ensure sustainable results and ongoing improvement.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<ConsultationCTA />
</div>

<style>
	.services-page {
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

	/* Detailed Services */
	.detailed-services {
		padding: var(--space-2xl) 0;
	}

	.services-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-lg);
	}

	@media (max-width: 768px) {
		.services-grid {
			grid-template-columns: 1fr;
		}
	}

	.service-detail {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.service-icon {
		width: 48px;
		height: 48px;
		margin-bottom: var(--space-md);
		color: var(--color-fg-secondary);
	}

	.service-icon svg {
		width: 100%;
		height: 100%;
	}

	.service-detail h3 {
		font-size: var(--text-h3);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.service-detail p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-md);
	}

	.service-features {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.service-features li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		padding: var(--space-xs) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.service-features li:first-child {
		border-top: none;
	}

	/* Process Section */
	.our-process {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.our-process h2 {
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

	.process-steps {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 768px) {
		.process-steps {
			grid-template-columns: 1fr;
		}
	}

	.process-step {
		text-align: center;
		padding: var(--space-md);
	}

	.step-number {
		display: block;
		font-size: var(--text-display);
		font-weight: 200;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.process-step h3 {
		font-size: var(--text-h3);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.process-step p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: 1.5;
	}
</style>
