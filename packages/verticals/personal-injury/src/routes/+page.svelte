<script lang="ts">
	/**
	 * Home Page - Personal Injury Boutique
	 *
	 * Structure optimized for PI conversion:
	 * 1. Hero: "No Fee Unless We Win" + 24/7 availability
	 * 2. Statistics: Total recovered, win rate
	 * 3. Accident Types: Case categories with settlements
	 * 4. Recovery Results: Golden ratio showcase
	 * 5. Process: How we work
	 * 6. Testimonials: Client stories
	 * 7. Attorneys: Team credentials
	 * 8. FAQ: Common questions
	 * 9. Free Case Review: PI intake form with screening
	 *
	 * Ethics compliance: Disclaimer visible, no guarantee claims
	 */

	import HeroSection from '$lib/components/HeroSection.svelte';
	import StatisticsSection from '$lib/components/StatisticsSection.svelte';
	import AccidentTypesSection from '$lib/components/AccidentTypesSection.svelte';
	import RecoveryResultsSection from '$lib/components/RecoveryResultsSection.svelte';
	import ProcessSection from '$lib/components/ProcessSection.svelte';
	import TestimonialsSection from '$lib/components/TestimonialsSection.svelte';
	import AttorneysSection from '$lib/components/AttorneysSection.svelte';
	import FAQSection from '$lib/components/FAQSection.svelte';
	import PIIntakeForm from '$lib/components/PIIntakeForm.svelte';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';
	import TrustSignals from '$lib/components/TrustSignals.svelte';
	import ScrollReveal from '$lib/components/ScrollReveal.svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEOHead canonical="/" />
<StructuredData page="home" />

<main class="home">
	<HeroSection />

	<TrustSignals />

	<StatisticsSection />

	<ScrollReveal>
		<AccidentTypesSection />
	</ScrollReveal>

	<ScrollReveal delay={100}>
		<RecoveryResultsSection />
	</ScrollReveal>

	<ScrollReveal delay={100}>
		<ProcessSection />
	</ScrollReveal>

	<ScrollReveal delay={100}>
		<TestimonialsSection />
	</ScrollReveal>

	<ScrollReveal delay={100}>
		<AttorneysSection />
	</ScrollReveal>

	<ScrollReveal delay={100}>
		<FAQSection />
	</ScrollReveal>

	<section class="intake-section" id="free-case-review">
		<div class="intake-container">
			<div class="intake-header">
				<h2 class="intake-title">Free Case Review</h2>
				<p class="intake-subtitle">
					No fees unless we win. Tell us about your accident and we'll evaluate your case for free.
				</p>
			</div>
			<PIIntakeForm />
		</div>
	</section>

	<EthicsDisclaimer />
</main>

<style>
	.home {
		background: var(--color-bg-pure);
	}

	.intake-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-elevated);
	}

	.intake-container {
		max-width: 700px;
		margin: 0 auto;
	}

	.intake-header {
		text-align: center;
		margin-bottom: var(--space-lg);
	}

	.intake-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.intake-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	@media (max-width: 768px) {
		.intake-section {
			padding: var(--space-xl) var(--space-md);
		}
	}
</style>
