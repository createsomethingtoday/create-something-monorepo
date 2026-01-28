<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { siteConfig } from '$lib/config/context';
</script>

<SEO
	title="Privacy Policy"
	description="Our commitment to protecting your privacy and personal information."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Privacy', url: '/privacy' }
	]}
/>

<div class="legal-page">
	<div class="container">
		<h1>Privacy Policy</h1>
		<p class="last-updated">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

		<section>
			<h2>Introduction</h2>
			<p>
				{$siteConfig.name} ("we," "our," or "us") respects your privacy and is committed to protecting
				your personal information. This Privacy Policy explains how we collect, use, disclose, and
				safeguard your information when you visit our website or use our services.
			</p>
		</section>

		<section>
			<h2>Information We Collect</h2>
			<h3>Personal Information</h3>
			<p>We may collect personal information that you voluntarily provide, including:</p>
			<ul>
				<li>Name and contact information (email, phone, address)</li>
				<li>Business information (company name, job title)</li>
				<li>Consultation request details</li>
				<li>Communications you send to us</li>
			</ul>

			<h3>Automatically Collected Information</h3>
			<p>When you visit our website, we may automatically collect:</p>
			<ul>
				<li>Browser type and version</li>
				<li>Operating system</li>
				<li>Pages visited and time spent</li>
				<li>Referring website</li>
				<li>IP address (anonymized)</li>
			</ul>
		</section>

		<section>
			<h2>How We Use Your Information</h2>
			<p>We use the information we collect to:</p>
			<ul>
				<li>Respond to your inquiries and consultation requests</li>
				<li>Provide and improve our services</li>
				<li>Send administrative communications</li>
				<li>Comply with legal obligations</li>
			</ul>
		</section>

		<section>
			<h2>Information Sharing</h2>
			<p>
				We do not sell your personal information. We may share information with third-party service
				providers who assist in our operations (e.g., email services, analytics), subject to
				confidentiality agreements.
			</p>
		</section>

		<section>
			<h2>Data Security</h2>
			<p>
				We implement appropriate technical and organizational measures to protect your personal
				information against unauthorized access, alteration, disclosure, or destruction.
			</p>
		</section>

		<section>
			<h2>Your Rights</h2>
			<p>Depending on your jurisdiction, you may have the right to:</p>
			<ul>
				<li>Access your personal information</li>
				<li>Correct inaccurate information</li>
				<li>Request deletion of your information</li>
				<li>Opt out of marketing communications</li>
			</ul>
		</section>

		<section>
			<h2>Contact Us</h2>
			<p>
				If you have questions about this Privacy Policy, please contact us at:
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

	h3 {
		font-size: var(--text-h3);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin-top: var(--space-md);
		margin-bottom: var(--space-sm);
	}

	p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-md);
	}

	ul {
		margin: 0 0 var(--space-md) var(--space-md);
		padding: 0;
	}

	li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-xs);
	}

	a {
		color: var(--color-fg-primary);
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
