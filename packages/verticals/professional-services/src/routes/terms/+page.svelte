<script lang="ts">
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { siteConfig } from '$lib/config/context';
</script>

<SEOHead
	title="Terms of Service"
	description="Terms and conditions governing the use of our professional services."
	canonical="/terms"
/>

<div class="legal-page">
	<div class="container">
		<h1>Terms of Service</h1>
		<p class="last-updated">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

		<section>
			<h2>Agreement to Terms</h2>
			<p>
				By accessing or using the services provided by {$siteConfig.name} ("we," "our," or "us"),
				you agree to be bound by these Terms of Service. If you do not agree to these terms, please
				do not use our services.
			</p>
		</section>

		<section>
			<h2>Services</h2>
			<p>
				We provide professional consulting and advisory services as described on our website. The
				specific scope, deliverables, and terms of any engagement will be outlined in a separate
				engagement letter or statement of work.
			</p>
		</section>

		<section>
			<h2>Consultations</h2>
			<p>
				Initial consultations scheduled through our website are subject to availability. We reserve
				the right to reschedule or cancel consultations with reasonable notice. Consultation
				requests do not constitute a client relationship until formally established through an
				engagement agreement.
			</p>
		</section>

		<section>
			<h2>Intellectual Property</h2>
			<p>
				All content on this website, including text, graphics, logos, and software, is the property
				of {$siteConfig.name} or its content suppliers and is protected by intellectual property laws.
				You may not reproduce, distribute, or create derivative works without our express written permission.
			</p>
		</section>

		<section>
			<h2>Limitation of Liability</h2>
			<p>
				To the fullest extent permitted by law, {$siteConfig.name} shall not be liable for any
				indirect, incidental, special, consequential, or punitive damages arising from your use of
				our services or website.
			</p>
		</section>

		<section>
			<h2>Confidentiality</h2>
			<p>
				We treat all client information with the highest level of confidentiality. Specific
				confidentiality terms will be outlined in individual engagement agreements.
			</p>
		</section>

		<section>
			<h2>Governing Law</h2>
			<p>
				These Terms of Service shall be governed by and construed in accordance with the laws of
				the jurisdiction in which {$siteConfig.name} is registered, without regard to conflict of law principles.
			</p>
		</section>

		<section>
			<h2>Changes to Terms</h2>
			<p>
				We reserve the right to modify these Terms of Service at any time. Changes will be effective
				immediately upon posting to this website. Your continued use of our services after any
				changes constitutes acceptance of the new terms.
			</p>
		</section>

		<section>
			<h2>Contact</h2>
			<p>
				If you have questions about these Terms of Service, please contact us at:
			</p>
			<p>
				<a href="mailto:{$siteConfig.email}">{$siteConfig.email}</a><br />
				{$siteConfig.phone}
			</p>
		</section>
	</div>
</div>

<style>
	.legal-page {
		background: var(--color-bg-pure);
		padding: var(--space-2xl) 0;
	}

	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	h1 {
		font-size: var(--text-display);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.last-updated {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xl);
	}

	section {
		margin-bottom: var(--space-xl);
	}

	h2 {
		font-size: var(--text-h2);
		font-weight: 400;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-md);
	}

	a {
		color: var(--color-fg-primary);
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
