<script lang="ts">
	/**
	 * OUTERFIELDS Privacy Policy
	 *
	 * Standard privacy policy page for the PCN platform
	 */
</script>

<svelte:head>
	<title>Privacy Policy | OUTERFIELDS</title>
	<meta name="description" content="OUTERFIELDS privacy policy - how we collect, use, and protect your data." />
</svelte:head>

<div class="legal-page">
	<div class="legal-container">
		<header class="legal-header">
			<h1>Privacy Policy</h1>
			<p class="last-updated">Last updated: January 2025</p>
		</header>

		<div class="legal-content">
			<section class="legal-section">
				<h2>Introduction</h2>
				<p>
					OUTERFIELDS ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Premium Content Network platform.
				</p>
			</section>

			<section class="legal-section">
				<h2>Information We Collect</h2>
				<h3>Personal Information</h3>
				<p>We may collect personal information that you voluntarily provide when you:</p>
				<ul>
					<li>Create an account or register for our services</li>
					<li>Subscribe to content or purchase memberships</li>
					<li>Contact us with inquiries or feedback</li>
					<li>Participate in surveys or promotions</li>
				</ul>
				<p>This information may include your name, email address, billing information, and other details necessary to provide our services.</p>

				<h3>Usage Information</h3>
				<p>We automatically collect certain information when you access our platform, including:</p>
				<ul>
					<li>Device and browser information</li>
					<li>IP address and location data</li>
					<li>Pages viewed and content consumed</li>
					<li>Time spent on the platform</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>How We Use Your Information</h2>
				<p>We use the information we collect to:</p>
				<ul>
					<li>Provide, maintain, and improve our services</li>
					<li>Process transactions and send related information</li>
					<li>Send promotional communications (with your consent)</li>
					<li>Respond to your comments and questions</li>
					<li>Monitor and analyze usage patterns and trends</li>
					<li>Protect against fraudulent or unauthorized activity</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>Information Sharing</h2>
				<p>We do not sell your personal information. We may share your information with:</p>
				<ul>
					<li>Service providers who assist in operating our platform</li>
					<li>Business partners for joint offerings (with your consent)</li>
					<li>Law enforcement when required by law</li>
					<li>Other parties in connection with a merger or acquisition</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>Data Security</h2>
				<p>
					We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
				</p>
			</section>

			<section class="legal-section">
				<h2>Your Rights</h2>
				<p>Depending on your location, you may have the right to:</p>
				<ul>
					<li>Access the personal information we hold about you</li>
					<li>Request correction of inaccurate information</li>
					<li>Request deletion of your information</li>
					<li>Opt out of marketing communications</li>
					<li>Data portability</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>Cookies</h2>
				<p>
					We use cookies and similar tracking technologies to collect and track information and to improve our services. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
				</p>
			</section>

			<section class="legal-section">
				<h2>Contact Us</h2>
				<p>
					If you have questions about this Privacy Policy, please contact us at:
				</p>
				<p class="contact-info">
					<a href="mailto:privacy@outerfields.com">privacy@outerfields.com</a>
				</p>
			</section>
		</div>

		<footer class="legal-footer">
			<a href="/" class="back-link">&larr; Back to Home</a>
		</footer>
	</div>
</div>

<style>
	.legal-page {
		min-height: 100vh;
		padding: 8rem 1.5rem 4rem;
		background: var(--color-bg-pure);
	}

	.legal-container {
		max-width: 48rem;
		margin: 0 auto;
	}

	.legal-header {
		margin-bottom: 3rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.legal-header h1 {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.last-updated {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.legal-content {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.legal-section h2 {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.legal-section h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		margin: 1.5rem 0 0.75rem;
	}

	.legal-section p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin: 0 0 1rem;
	}

	.legal-section ul {
		margin: 0 0 1rem;
		padding-left: 1.5rem;
	}

	.legal-section li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: 0.5rem;
	}

	.contact-info a {
		color: var(--color-primary);
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.contact-info a:hover {
		opacity: 0.8;
	}

	.legal-footer {
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid var(--color-border-default);
	}

	.back-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-primary);
	}
</style>
