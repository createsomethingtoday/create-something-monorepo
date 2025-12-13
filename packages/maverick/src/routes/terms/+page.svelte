<script lang="ts">
	/**
	 * Terms of Service Page
	 * Maverick X
	 */

	import { inview } from '$lib/actions/inview';

	let visible = $state(false);
</script>

<svelte:head>
	<title>Terms of Service | Maverick X</title>
	<meta name="description" content="Maverick X terms of service - the terms and conditions governing your use of our website and services." />
</svelte:head>

<div
	use:inview
	oninview={() => (visible = true)}
>
	<!-- Hero Section -->
	<section class="hero-section">
		<div class="container relative z-10 flex items-center min-h-[30vh] py-32 lg:py-24 md:py-20">
			<div class="max-w-3xl">
				<h1
					class="text-h1 mb-4 scroll-reveal"
					class:scroll-reveal-hidden={!visible}
				>
					Terms of Service
				</h1>
				<p
					class="text-paragraph scroll-reveal stagger-1"
					class:scroll-reveal-hidden={!visible}
					style="color: var(--color-fg-muted)"
				>
					Last updated: January 2024
				</p>
			</div>
		</div>
	</section>

	<!-- Content -->
	<section class="section-lg content-section">
		<div class="container">
			<div class="content-wrapper">
				<div
					class="scroll-reveal"
					class:scroll-reveal-hidden={!visible}
				>
					<h2>Acceptance of Terms</h2>
					<p>
						By accessing or using the Maverick X website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
					</p>

					<h2>Use of Services</h2>
					<p>
						You agree to use our services only for lawful purposes and in accordance with these Terms. You may not:
					</p>
					<ul>
						<li>Use our services in any way that violates applicable laws or regulations</li>
						<li>Attempt to gain unauthorized access to our systems or networks</li>
						<li>Interfere with or disrupt the integrity or performance of our services</li>
						<li>Transmit any harmful, threatening, or objectionable content</li>
					</ul>

					<h2>Intellectual Property</h2>
					<p>
						All content on this website, including text, graphics, logos, and software, is the property of Maverick X or its licensors and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
					</p>

					<h2>Product Information</h2>
					<p>
						Information about our products and services is provided for general informational purposes. While we strive to keep this information accurate and up-to-date, we make no warranties about the completeness, reliability, or accuracy of this information.
					</p>

					<h2>Limitation of Liability</h2>
					<p>
						To the fullest extent permitted by law, Maverick X shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services.
					</p>

					<h2>Indemnification</h2>
					<p>
						You agree to indemnify and hold harmless Maverick X and its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of our services or violation of these Terms.
					</p>

					<h2>Modifications</h2>
					<p>
						We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page. Your continued use of our services after such changes constitutes acceptance of the modified Terms.
					</p>

					<h2>Governing Law</h2>
					<p>
						These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions.
					</p>

					<h2>Contact</h2>
					<p>
						For questions about these Terms of Service, please contact us at:
					</p>
					<p>
						<strong>Maverick X</strong><br />
						Email: legal@maverickx.com
					</p>
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	.hero-section {
		position: relative;
		min-height: 30vh;
		background: linear-gradient(180deg, #0a0a0a 0%, #000000 100%);
	}

	.hero-section h1 {
		color: var(--color-fg-primary);
	}

	.content-section {
		background: #000000;
	}

	.content-wrapper {
		max-width: 48rem;
	}

	.content-wrapper h2 {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-top: 2.5rem;
		margin-bottom: 1rem;
	}

	.content-wrapper h2:first-child {
		margin-top: 0;
	}

	.content-wrapper p {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-fg-secondary);
		margin-bottom: 1rem;
	}

	.content-wrapper ul {
		margin-bottom: 1rem;
		padding-left: 1.5rem;
	}

	.content-wrapper li {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-fg-secondary);
		margin-bottom: 0.5rem;
	}

	.content-wrapper strong {
		color: var(--color-fg-primary);
	}
</style>
