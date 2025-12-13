<script lang="ts">
	/**
	 * Home Page - Law Firm Template (Premium)
	 *
	 * Structure optimized for legal services:
	 * 1. Hero: Firm identity + trust signals
	 * 2. Statistics: Animated counters (premium feature)
	 * 3. Practice Areas: Clear service categories
	 * 4. Results: Anonymized case outcomes (social proof)
	 * 5. Testimonials: Client testimonials carousel (premium feature)
	 * 6. Team: Attorney credentials
	 * 7. FAQ: Accordion FAQ section (premium feature)
	 * 8. Contact: Intake form → Clio via WORKWAY
	 *
	 * Ethics compliance: Disclaimer visible, no guarantee claims
	 */

	import HeroSection from '$lib/components/HeroSection.svelte';
	import StatisticsSection from '$lib/components/StatisticsSection.svelte';
	import PracticeAreasSection from '$lib/components/PracticeAreasSection.svelte';
	import ResultsSection from '$lib/components/ResultsSection.svelte';
	import TestimonialsSection from '$lib/components/TestimonialsSection.svelte';
	import FirmSection from '$lib/components/FirmSection.svelte';
	import AttorneysSection from '$lib/components/AttorneysSection.svelte';
	import FAQSection from '$lib/components/FAQSection.svelte';
	import IntakeForm from '$lib/components/IntakeForm.svelte';
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
		<PracticeAreasSection />
	</ScrollReveal>

	<ScrollReveal delay={100}>
		<ResultsSection />
	</ScrollReveal>

	<ScrollReveal delay={100}>
		<TestimonialsSection />
	</ScrollReveal>

	<ScrollReveal delay={100}>
		<FirmSection />
	</ScrollReveal>

	<ScrollReveal delay={100}>
		<AttorneysSection />
	</ScrollReveal>

	<ScrollReveal delay={100}>
		<FAQSection />
	</ScrollReveal>

	<section class="intake-section" id="contact">
		<div class="intake-container">
			<div class="intake-header">
				<h2 class="intake-title">Free Consultation</h2>
				<p class="intake-subtitle">
					Tell us about your situation. We will respond within 24 hours.
				</p>
			</div>
			<IntakeForm />
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
		max-width: 600px;
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
