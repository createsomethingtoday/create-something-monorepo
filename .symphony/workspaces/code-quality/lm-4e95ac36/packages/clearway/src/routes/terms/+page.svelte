<script lang="ts">
	// CLEARWAY Terms of Service
</script>

<svelte:head>
	<title>Terms of Service - CLEARWAY</title>
	<meta name="description" content="CLEARWAY Terms of Service. Terms and conditions for using our court booking platform." />
</svelte:head>

<main class="legal">
	<div class="container">
		<h1>Terms of Service</h1>
		<p class="effective">Effective Date: January 1, 2025</p>

		<section>
			<h2>1. Acceptance of Terms</h2>
			<p>By accessing or using CLEARWAY ("Service"), a product of CREATE SOMETHING LLC ("Company," "we," "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>
		</section>

		<section>
			<h2>2. Description of Service</h2>
			<p>CLEARWAY is a court booking platform that enables users to reserve sports courts at participating facilities. The Service includes:</p>
			<ul>
				<li>Online booking through web interface</li>
				<li>SMS-based booking (where enabled)</li>
				<li>Embeddable booking widgets for facility websites</li>
				<li>Payment processing for reservations</li>
				<li>Waitlist and notification features</li>
			</ul>
		</section>

		<section>
			<h2>3. User Accounts</h2>
			<p>To make reservations, you may need to provide contact information including your name, email address, and phone number. You agree to:</p>
			<ul>
				<li>Provide accurate and complete information</li>
				<li>Maintain the security of your account credentials</li>
				<li>Accept responsibility for all activities under your account</li>
				<li>Notify us immediately of any unauthorized access</li>
			</ul>
		</section>

		<section>
			<h2>4. Reservations and Payments</h2>
			<h3>4.1 Booking</h3>
			<p>Reservations are subject to availability. A confirmed booking constitutes an agreement between you and the facility operator. We facilitate this transaction but are not a party to it.</p>

			<h3>4.2 Payments</h3>
			<p>Payments are processed through Stripe. By making a payment, you agree to Stripe's terms of service. Prices are set by facility operators and displayed at the time of booking.</p>

			<h3>4.3 Cancellations and Refunds</h3>
			<p>Cancellation policies are set by individual facilities. Please review the facility's cancellation policy before booking. Refunds, if applicable, are processed according to the facility's policy.</p>
		</section>

		<section>
			<h2>5. User Conduct</h2>
			<p>You agree not to:</p>
			<ul>
				<li>Use the Service for any unlawful purpose</li>
				<li>Make fraudulent reservations or payments</li>
				<li>Interfere with or disrupt the Service</li>
				<li>Attempt to gain unauthorized access to our systems</li>
				<li>Resell or transfer reservations without facility consent</li>
				<li>Abuse the SMS booking feature with spam or inappropriate messages</li>
			</ul>
		</section>

		<section>
			<h2>6. Facility Operators</h2>
			<p>Facility operators using CLEARWAY to manage bookings are responsible for:</p>
			<ul>
				<li>Accuracy of court information and pricing</li>
				<li>Honoring confirmed reservations</li>
				<li>Setting and enforcing cancellation policies</li>
				<li>Maintaining safe and appropriate facilities</li>
			</ul>
		</section>

		<section>
			<h2>7. Intellectual Property</h2>
			<p>The Service, including its design, features, and content, is owned by CREATE SOMETHING LLC and protected by intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of the Service without our written consent.</p>
		</section>

		<section>
			<h2>8. Disclaimers</h2>
			<p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. We do not guarantee:</p>
			<ul>
				<li>Uninterrupted or error-free service</li>
				<li>Accuracy of facility information</li>
				<li>Quality of facilities or their services</li>
				<li>Availability of specific courts or time slots</li>
			</ul>
		</section>

		<section>
			<h2>9. Limitation of Liability</h2>
			<p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, CREATE SOMETHING LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.</p>
			<p>Our total liability shall not exceed the amount paid by you for the specific reservation giving rise to the claim.</p>
		</section>

		<section>
			<h2>10. Indemnification</h2>
			<p>You agree to indemnify and hold harmless CREATE SOMETHING LLC from any claims, damages, or expenses arising from your use of the Service or violation of these terms.</p>
		</section>

		<section>
			<h2>11. Modifications</h2>
			<p>We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified terms. Material changes will be communicated via email or notice on the Service.</p>
		</section>

		<section>
			<h2>12. Termination</h2>
			<p>We may suspend or terminate your access to the Service at any time for violation of these terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately.</p>
		</section>

		<section>
			<h2>13. Governing Law</h2>
			<p>These Terms are governed by the laws of the State of Texas, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Texas.</p>
		</section>

		<section>
			<h2>14. Contact</h2>
			<p>For questions about these Terms, contact us:</p>
			<p>
				CREATE SOMETHING LLC<br/>
				Email: <a href="mailto:legal@createsomething.agency">legal@createsomething.agency</a>
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

	a {
		color: var(--color-fg-primary, #fff);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	a:hover {
		opacity: 0.8;
	}
</style>
