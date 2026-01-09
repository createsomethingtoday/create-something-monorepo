<script lang="ts">
	/**
	 * OUTERFIELDS Terms of Service
	 *
	 * Standard terms of service page for the PCN platform
	 */
</script>

<svelte:head>
	<title>Terms of Service | OUTERFIELDS</title>
	<meta name="description" content="OUTERFIELDS terms of service - rules and guidelines for using our platform." />
</svelte:head>

<div class="legal-page">
	<div class="legal-container">
		<header class="legal-header">
			<h1>Terms of Service</h1>
			<p class="last-updated">Last updated: January 2025</p>
		</header>

		<div class="legal-content">
			<section class="legal-section">
				<h2>Acceptance of Terms</h2>
				<p>
					By accessing and using OUTERFIELDS ("the Platform"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
				</p>
			</section>

			<section class="legal-section">
				<h2>Description of Service</h2>
				<p>
					OUTERFIELDS provides a Premium Content Network platform that enables content creators to:
				</p>
				<ul>
					<li>Host and distribute video content</li>
					<li>Manage subscriptions and memberships</li>
					<li>Engage with their audience through community features</li>
					<li>Monetize their content through various revenue models</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>User Accounts</h2>
				<h3>Registration</h3>
				<p>
					You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials.
				</p>

				<h3>Account Security</h3>
				<p>
					You are responsible for all activities that occur under your account. Notify us immediately of any unauthorized use or security breach.
				</p>

				<h3>Account Termination</h3>
				<p>
					We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent, abusive, or illegal activity.
				</p>
			</section>

			<section class="legal-section">
				<h2>Content Guidelines</h2>
				<h3>Your Content</h3>
				<p>You retain ownership of content you upload to the Platform. By uploading content, you grant us a license to:</p>
				<ul>
					<li>Host and store your content on our infrastructure</li>
					<li>Distribute your content to your subscribers</li>
					<li>Display thumbnails and previews of your content</li>
					<li>Perform technical processing necessary for delivery</li>
				</ul>

				<h3>Prohibited Content</h3>
				<p>You may not upload content that:</p>
				<ul>
					<li>Violates any law or regulation</li>
					<li>Infringes on intellectual property rights</li>
					<li>Contains malware or harmful code</li>
					<li>Promotes violence, hate speech, or discrimination</li>
					<li>Contains sexually explicit material involving minors</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>Payment Terms</h2>
				<h3>Subscription Fees</h3>
				<p>
					Platform subscription fees are billed monthly or annually as selected. All fees are non-refundable except as required by law.
				</p>

				<h3>Payment Processing</h3>
				<p>
					We use third-party payment processors. You agree to their terms of service. We are not responsible for errors or issues with payment processors.
				</p>

				<h3>Revenue Share</h3>
				<p>
					For content creator accounts, revenue share percentages are specified in your agreement. Payouts are processed monthly for balances exceeding the minimum threshold.
				</p>
			</section>

			<section class="legal-section">
				<h2>Intellectual Property</h2>
				<p>
					The Platform and its original content (excluding user-generated content) are protected by copyright, trademark, and other laws. Our trademarks may not be used without prior written consent.
				</p>
			</section>

			<section class="legal-section">
				<h2>Disclaimers</h2>
				<p>
					THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT:
				</p>
				<ul>
					<li>The service will be uninterrupted or error-free</li>
					<li>Defects will be corrected</li>
					<li>The platform is free of viruses or harmful components</li>
					<li>Results from using the platform will meet your requirements</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>Limitation of Liability</h2>
				<p>
					TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUTERFIELDS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
				</p>
			</section>

			<section class="legal-section">
				<h2>Indemnification</h2>
				<p>
					You agree to indemnify and hold OUTERFIELDS harmless from any claims arising from your use of the Platform, your content, or your violation of these terms.
				</p>
			</section>

			<section class="legal-section">
				<h2>Changes to Terms</h2>
				<p>
					We reserve the right to modify these terms at any time. We will notify users of material changes via email or platform notification. Continued use after changes constitutes acceptance.
				</p>
			</section>

			<section class="legal-section">
				<h2>Governing Law</h2>
				<p>
					These terms are governed by the laws of [Jurisdiction], without regard to conflict of law principles. Any disputes shall be resolved in the courts of [Jurisdiction].
				</p>
			</section>

			<section class="legal-section">
				<h2>Contact</h2>
				<p>
					For questions about these Terms of Service, contact us at:
				</p>
				<p class="contact-info">
					<a href="mailto:legal@outerfields.com">legal@outerfields.com</a>
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
