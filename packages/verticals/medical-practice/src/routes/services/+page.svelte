<script lang="ts">
	import { siteConfig } from '$lib/config/context';
</script>

<svelte:head>
	<title>Services - {$siteConfig.name}</title>
	<meta
		name="description"
		content="Comprehensive medical services including primary care, urgent care, women's health, pediatrics, and chronic disease management."
	/>
</svelte:head>

<section class="page-header">
	<div class="container">
		<h1>Our Services</h1>
		<p class="lead">
			Comprehensive medical care for you and your family. From routine checkups to chronic disease
			management.
		</p>
	</div>
</section>

<section class="services-list">
	<div class="container">
		<div class="services-grid">
			{#each $siteConfig.services as service}
				<div class="service-card">
					<h2>{service.title}</h2>
					<p class="description">{service.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="insurance-info">
	<div class="container">
		<h2>Insurance & Payment</h2>
		<p class="note">{$siteConfig.insurance.note}</p>

		<div class="insurance-grid">
			{#each $siteConfig.insurance.accepted as plan}
				<div class="insurance-badge">{plan}</div>
			{/each}
		</div>

		<div class="payment-methods">
			<h3>Payment Options</h3>
			<ul>
				<li>Most major insurance plans accepted</li>
				<li>Self-pay options available</li>
				<li>Payment plans for qualifying patients</li>
				<li>FSA and HSA cards accepted</li>
			</ul>
		</div>
	</div>
</section>

<section class="cta-section">
	<div class="container">
		<h2>Ready to schedule an appointment?</h2>
		<p>Book online or call our scheduling team.</p>
		<div class="cta-group">
			<a href="/contact" class="button-primary">Book Appointment</a>
			<a href="tel:{$siteConfig.phone}" class="button-secondary">Call {$siteConfig.phone}</a>
		</div>
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

	.services-list {
		padding: var(--space-2xl) 0;
	}

	.services-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: var(--space-lg);
	}

	.service-card {
		background: var(--color-bg-surface);
		padding: var(--space-xl);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.service-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.service-card h2 {
		font-size: var(--text-h3);
		margin-bottom: var(--space-md);
		color: var(--color-fg-primary);
	}

	.description {
		color: var(--color-fg-tertiary);
		line-height: 1.6;
	}

	.insurance-info {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.insurance-info h2 {
		text-align: center;
		margin-bottom: var(--space-sm);
	}

	.note {
		text-align: center;
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xl);
		font-size: var(--text-body-sm);
	}

	.insurance-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.insurance-badge {
		background: var(--color-bg-surface);
		padding: var(--space-md);
		text-align: center;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.payment-methods {
		margin-top: var(--space-xl);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.payment-methods h3 {
		margin-bottom: var(--space-md);
		color: var(--color-fg-primary);
	}

	.payment-methods ul {
		list-style: none;
		padding: 0;
	}

	.payment-methods li {
		padding: var(--space-sm) 0;
		color: var(--color-fg-secondary);
		border-bottom: 1px solid var(--color-border-default);
	}

	.payment-methods li:last-child {
		border-bottom: none;
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
	}

	.cta-group {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		flex-wrap: wrap;
	}

	.button-primary {
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

	.button-secondary {
		border: 1px solid var(--color-border-emphasis);
		color: var(--color-fg-primary);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--radius-md);
		font-weight: var(--font-semibold);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.button-secondary:hover {
		border-color: var(--color-border-strong);
	}

	@media (max-width: 768px) {
		.services-grid {
			grid-template-columns: 1fr;
		}

		.insurance-grid {
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		}

		.cta-group {
			flex-direction: column;
			align-items: center;
		}

		.button-primary,
		.button-secondary {
			width: 100%;
			max-width: 300px;
		}
	}
</style>
