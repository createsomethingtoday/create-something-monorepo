<script lang="ts">
	import { SEO } from '@create-something/canon';
	import TeamGrid from '$lib/components/TeamGrid.svelte';
	import ConsultationCTA from '$lib/components/ConsultationCTA.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEO
	title="Our Team"
	description="Meet our team of experienced professionals dedicated to delivering exceptional results for our clients."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Team', url: '/team' }
	]}
/>
<StructuredData page="team" />

<div class="team-page">
	<!-- Page Header -->
	<section class="page-header">
		<div class="container">
			<h1>Our Team</h1>
			<p class="lead">
				Experienced professionals united by a shared commitment to excellence and client success.
			</p>
		</div>
	</section>

	<!-- Team Grid -->
	<TeamGrid />

	<!-- Join Section -->
	<section class="join-section">
		<div class="container">
			<div class="join-content">
				<h2>Join Our Team</h2>
				<p>
					We're always looking for exceptional professionals who share our values and commitment to
					excellence. If you're passionate about making a meaningful impact for clients, we'd love
					to hear from you.
				</p>
				<a href="/contact" class="join-link">View Open Positions</a>
			</div>
		</div>
	</section>

	<!-- Culture Section -->
	<section class="culture-section">
		<div class="container">
			<h2>Our Culture</h2>
			<p class="section-lead">What it means to work here.</p>

			<div class="culture-grid">
				<article class="culture-card">
					<h3>Continuous Learning</h3>
					<p>
						We invest in our people. From mentorship programs to professional development, we help
						team members grow their skills and advance their careers.
					</p>
				</article>

				<article class="culture-card">
					<h3>Work-Life Balance</h3>
					<p>
						Sustainable excellence requires balance. We support flexible arrangements and respect
						personal time while maintaining high standards.
					</p>
				</article>

				<article class="culture-card">
					<h3>Collaborative Environment</h3>
					<p>
						The best solutions come from diverse perspectives. We foster open dialogue and
						cross-functional collaboration on every project.
					</p>
				</article>

				<article class="culture-card">
					<h3>Client Focus</h3>
					<p>
						Our clients' success is our north star. Every team member, regardless of role,
						understands how their work contributes to client outcomes.
					</p>
				</article>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<ConsultationCTA />
</div>

<style>
	.team-page {
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

	/* Join Section */
	.join-section {
		padding: var(--space-xl) 0;
		background: var(--color-bg-elevated);
	}

	.join-content {
		max-width: 600px;
		margin: 0 auto;
		text-align: center;
	}

	.join-content h2 {
		font-size: var(--text-h2);
		font-weight: 400;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.join-content p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-lg);
	}

	.join-link {
		display: inline-block;
		padding: var(--space-sm) var(--space-lg);
		background: transparent;
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		text-decoration: none;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.join-link:hover {
		background: var(--color-hover);
		border-color: var(--color-border-strong);
	}

	/* Culture Section */
	.culture-section {
		padding: var(--space-2xl) 0;
	}

	.culture-section h2 {
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

	.culture-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 768px) {
		.culture-grid {
			grid-template-columns: 1fr;
		}
	}

	.culture-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.culture-card h3 {
		font-size: var(--text-h3);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.culture-card p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}
</style>
