<script lang="ts">
	import { siteConfig } from '$lib/config/context';
</script>

<svelte:head>
	<title>About - {$siteConfig.name}</title>
	<meta
		name="description"
		content="Learn about our practice philosophy, mission, and commitment to compassionate, high-quality medical care."
	/>
</svelte:head>

<section class="page-header">
	<div class="container">
		<h1>About Our Practice</h1>
		<p class="lead">{$siteConfig.tagline}</p>
	</div>
</section>

<section class="mission">
	<div class="container">
		<div class="content-block">
			<h2>Our Mission</h2>
			<p class="body-text">
				We are committed to providing compassionate, evidence-based medical care to individuals and
				families in our community. Our practice combines modern medical technology with traditional
				patient-centered care, ensuring every patient receives personalized attention and treatment.
			</p>
		</div>

		<div class="content-block">
			<h2>Our Approach</h2>
			<p class="body-text">
				We believe in building long-term relationships with our patients through continuity of care.
				Our providers take the time to listen, understand your health concerns, and develop
				treatment plans tailored to your individual needs and goals.
			</p>
		</div>
	</div>
</section>

<section class="values">
	<div class="container">
		<h2>Our Values</h2>
		<div class="values-grid">
			<div class="value-card">
				<h3>Compassionate Care</h3>
				<p>
					We treat every patient with empathy, respect, and dignity. Your comfort and wellbeing are
					our top priorities.
				</p>
			</div>
			<div class="value-card">
				<h3>Clinical Excellence</h3>
				<p>
					Our providers stay current with the latest medical research and best practices to deliver
					the highest quality care.
				</p>
			</div>
			<div class="value-card">
				<h3>Accessibility</h3>
				<p>
					We offer same-day appointments, extended hours, and multiple contact options to ensure
					you can reach us when you need care.
				</p>
			</div>
			<div class="value-card">
				<h3>Whole-Person Health</h3>
				<p>
					We address not just your physical health, but also mental, emotional, and social factors
					that impact your wellbeing.
				</p>
			</div>
		</div>
	</div>
</section>

<section class="facilities">
	<div class="container">
		<h2>Our Facilities</h2>
		<div class="facilities-content">
			<div class="facility-features">
				<h3>Modern Medical Equipment</h3>
				<ul>
					<li>Digital X-ray and imaging</li>
					<li>On-site laboratory</li>
					<li>Electronic health records</li>
					<li>Telemedicine capabilities</li>
					<li>Accessible exam rooms</li>
				</ul>
			</div>

			<div class="facility-features">
				<h3>Patient Amenities</h3>
				<ul>
					<li>Comfortable waiting areas</li>
					<li>Free WiFi</li>
					<li>Ample parking</li>
					<li>Wheelchair accessible</li>
					<li>Private consultation rooms</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<section class="certifications">
	<div class="container">
		<h2>Certifications & Accreditations</h2>
		<div class="cert-grid">
			<div class="cert-badge">
				<p>Board Certified Physicians</p>
			</div>
			<div class="cert-badge">
				<p>NCQA Patient-Centered Medical Home</p>
			</div>
			<div class="cert-badge">
				<p>HIPAA Compliant</p>
			</div>
			<div class="cert-badge">
				<p>Joint Commission Accredited</p>
			</div>
		</div>
	</div>
</section>

<section class="cta-section">
	<div class="container">
		<h2>Meet Our Team</h2>
		<p>
			Get to know the dedicated physicians and staff who make our practice a trusted healthcare
			partner.
		</p>
		<a href="/team" class="button-primary">View Our Team</a>
	</div>
</section>

<style>
	.page-header {
		padding: var(--space-2xl) 0 var(--space-xl) 0;
		text-align: center;
		border-bottom: 1px solid var(--color-border-default);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	h1 {
		margin-bottom: var(--space-md);
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.mission {
		padding: var(--space-2xl) 0;
	}

	.content-block {
		margin-bottom: var(--space-xl);
		max-width: 800px;
		margin-left: auto;
		margin-right: auto;
	}

	.content-block:last-child {
		margin-bottom: 0;
	}

	.content-block h2 {
		margin-bottom: var(--space-md);
		color: var(--color-fg-primary);
	}

	.body-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
		line-height: 1.7;
	}

	.values {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.values h2 {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.values-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-lg);
	}

	.value-card {
		background: var(--color-bg-surface);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.value-card h3 {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
		font-size: var(--text-h3);
	}

	.value-card p {
		color: var(--color-fg-tertiary);
		line-height: 1.6;
	}

	.facilities {
		padding: var(--space-2xl) 0;
	}

	.facilities h2 {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.facilities-content {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-xl);
		max-width: 900px;
		margin: 0 auto;
	}

	.facility-features h3 {
		margin-bottom: var(--space-md);
		color: var(--color-fg-primary);
	}

	.facility-features ul {
		list-style: none;
		padding: 0;
	}

	.facility-features li {
		padding: var(--space-sm) 0 var(--space-sm) var(--space-md);
		color: var(--color-fg-secondary);
		position: relative;
	}

	.facility-features li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	.certifications {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.certifications h2 {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.cert-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
		max-width: 900px;
		margin: 0 auto;
	}

	.cert-badge {
		background: var(--color-bg-surface);
		padding: var(--space-lg);
		text-align: center;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
	}

	.cert-badge p {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
	}

	.cta-section {
		padding: var(--space-2xl) 0;
		text-align: center;
	}

	.cta-section h2 {
		margin-bottom: var(--space-sm);
	}

	.cta-section p {
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xl);
		font-size: var(--text-body-lg);
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.button-primary {
		display: inline-block;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--radius-md);
		font-weight: var(--font-semibold);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.button-primary:hover {
		background: var(--color-fg-secondary);
	}

	@media (max-width: 768px) {
		.values-grid {
			grid-template-columns: 1fr;
		}

		.facilities-content {
			grid-template-columns: 1fr;
		}

		.cert-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
