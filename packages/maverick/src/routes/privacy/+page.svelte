<script lang="ts">
	/**
	 * Privacy Policy Page
	 * Maverick X
	 */

	import { inview } from '$lib/actions/inview';

	let visible = $state(false);
</script>

<svelte:head>
	<title>Privacy Policy | Maverick X</title>
	<meta name="description" content="Maverick X privacy policy - how we collect, use, and protect your information." />
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
					Privacy Policy
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
					<h2>Introduction</h2>
					<p>
						Maverick X ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
					</p>

					<h2>Information We Collect</h2>
					<p>We may collect information about you in various ways, including:</p>
					<ul>
						<li><strong>Personal Data:</strong> Name, email address, phone number, company name, and job title when you contact us or request information.</li>
						<li><strong>Usage Data:</strong> Information about how you use our website, including IP address, browser type, pages visited, and time spent on pages.</li>
						<li><strong>Communication Data:</strong> Information you provide when you communicate with us.</li>
					</ul>

					<h2>How We Use Your Information</h2>
					<p>We use the information we collect to:</p>
					<ul>
						<li>Respond to your inquiries and provide customer support</li>
						<li>Send you technical notices, updates, and administrative messages</li>
						<li>Communicate with you about products, services, and events</li>
						<li>Analyze usage trends and improve our website and services</li>
						<li>Comply with legal obligations</li>
					</ul>

					<h2>Information Sharing</h2>
					<p>
						We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy or as required by law.
					</p>

					<h2>Data Security</h2>
					<p>
						We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
					</p>

					<h2>Your Rights</h2>
					<p>
						Depending on your location, you may have certain rights regarding your personal information, including the right to access, correct, or delete your data. To exercise these rights, please contact us.
					</p>

					<h2>Cookies</h2>
					<p>
						We use cookies and similar tracking technologies to enhance your experience on our website. You can control cookies through your browser settings.
					</p>

					<h2>Contact Us</h2>
					<p>
						If you have questions about this Privacy Policy, please contact us at:
					</p>
					<p>
						<strong>Maverick X</strong><br />
						Email: privacy@maverickx.com
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
