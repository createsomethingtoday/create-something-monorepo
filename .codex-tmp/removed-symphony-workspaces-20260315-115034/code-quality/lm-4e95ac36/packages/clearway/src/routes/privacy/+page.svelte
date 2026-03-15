<script lang="ts">
	// CLEARWAY Privacy Policy
</script>

<svelte:head>
	<title>Privacy Policy - CLEARWAY</title>
	<meta name="description" content="CLEARWAY Privacy Policy. How we collect, use, and protect your information." />
</svelte:head>

<main class="legal">
	<div class="container">
		<h1>Privacy Policy</h1>
		<p class="effective">Effective Date: January 1, 2025</p>

		<section>
			<h2>Overview</h2>
			<p>CLEARWAY ("we," "our," or "us") is a product of CREATE SOMETHING LLC. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our court booking platform.</p>
		</section>

		<section>
			<h2>Information We Collect</h2>

			<h3>Information You Provide</h3>
			<ul>
				<li><strong>Account Information:</strong> Name, email address, phone number when you create a booking or account</li>
				<li><strong>Payment Information:</strong> Payment details processed securely through Stripe (we do not store card numbers)</li>
				<li><strong>Booking Information:</strong> Court preferences, reservation history, facility interactions</li>
				<li><strong>Communications:</strong> Messages sent through SMS booking or support channels</li>
			</ul>

			<h3>Information Collected Automatically</h3>
			<ul>
				<li><strong>Usage Data:</strong> Pages visited, features used, booking patterns</li>
				<li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
				<li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
			</ul>
		</section>

		<section>
			<h2>How We Use Your Information</h2>
			<ul>
				<li>Process and manage your court reservations</li>
				<li>Send booking confirmations, reminders, and updates</li>
				<li>Process payments through our payment processor</li>
				<li>Provide customer support</li>
				<li>Improve our services and user experience</li>
				<li>Communicate waitlist notifications and availability updates</li>
				<li>Comply with legal obligations</li>
			</ul>
		</section>

		<section>
			<h2>Information Sharing</h2>
			<p>We do not sell your personal information. We may share information with:</p>
			<ul>
				<li><strong>Facility Operators:</strong> Your booking information is shared with the facility where you reserve courts</li>
				<li><strong>Payment Processors:</strong> Stripe processes payments on our behalf</li>
				<li><strong>Service Providers:</strong> Third parties that help us operate our platform (hosting, analytics)</li>
				<li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
			</ul>
		</section>

		<section>
			<h2>Data Security</h2>
			<p>We implement appropriate technical and organizational measures to protect your information:</p>
			<ul>
				<li>Encryption in transit (HTTPS) and at rest</li>
				<li>Secure authentication mechanisms</li>
				<li>Regular security assessments</li>
				<li>Limited access to personal data on a need-to-know basis</li>
			</ul>
		</section>

		<section>
			<h2>Data Retention</h2>
			<p>We retain your information for as long as your account is active or as needed to provide services. Booking history is retained for accounting and legal purposes. You may request deletion of your account and associated data.</p>
		</section>

		<section>
			<h2>Your Rights</h2>
			<p>Depending on your location, you may have the right to:</p>
			<ul>
				<li>Access the personal information we hold about you</li>
				<li>Correct inaccurate information</li>
				<li>Request deletion of your information</li>
				<li>Object to or restrict certain processing</li>
				<li>Data portability</li>
				<li>Withdraw consent</li>
			</ul>
			<p>To exercise these rights, contact us at <a href="mailto:privacy@createsomething.agency">privacy@createsomething.agency</a>.</p>
		</section>

		<section>
			<h2>Cookies and Tracking</h2>
			<p>We use essential cookies to operate our platform. We do not use third-party advertising cookies. Analytics data is collected in aggregate to improve our services.</p>
		</section>

		<section>
			<h2>Children's Privacy</h2>
			<p>CLEARWAY is not intended for children under 13. We do not knowingly collect personal information from children under 13.</p>
		</section>

		<section>
			<h2>Changes to This Policy</h2>
			<p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the effective date.</p>
		</section>

		<section>
			<h2>Contact Us</h2>
			<p>If you have questions about this Privacy Policy, please contact us:</p>
			<p>
				CREATE SOMETHING LLC<br/>
				Email: <a href="mailto:privacy@createsomething.agency">privacy@createsomething.agency</a>
			</p>
		</section>
	</div>
</main>

<style>
	.legal {
		min-height: 100vh;
		padding: var(--space-2xl, 6rem) var(--space-md, 1.5rem);
		background: var(--color-bg-pure, #000);
	}

	.container {
		max-width: 48rem;
		margin: 0 auto;
	}

	h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 700;
		margin: 0 0 var(--space-xs, 0.5rem);
		color: var(--color-fg-primary, #fff);
	}

	.effective {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
		margin: 0 0 var(--space-xl, 4rem);
	}

	section {
		margin-bottom: var(--space-lg, 2.5rem);
	}

	h2 {
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		margin: 0 0 var(--space-sm, 1rem);
		color: var(--color-fg-primary, #fff);
	}

	h3 {
		font-size: var(--text-body-lg, 1.125rem);
		font-weight: 600;
		margin: var(--space-md, 1.5rem) 0 var(--space-xs, 0.5rem);
		color: var(--color-fg-primary, #fff);
	}

	p {
		font-size: var(--text-body, 1rem);
		line-height: 1.7;
		color: var(--color-fg-secondary, rgba(255,255,255,0.8));
		margin: 0 0 var(--space-sm, 1rem);
	}

	ul {
		margin: 0 0 var(--space-sm, 1rem);
		padding-left: var(--space-md, 1.5rem);
	}

	li {
		font-size: var(--text-body, 1rem);
		line-height: 1.7;
		color: var(--color-fg-secondary, rgba(255,255,255,0.8));
		margin-bottom: var(--space-xs, 0.5rem);
	}

	li strong {
		color: var(--color-fg-primary, #fff);
	}

	a {
		color: var(--color-fg-primary, #fff);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	a:hover {
		opacity: 0.8;
	}
</style>
