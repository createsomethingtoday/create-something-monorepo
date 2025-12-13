<script lang="ts">
	import { siteConfig } from '$lib/config/context';
</script>

<svelte:head>
	<title>{$siteConfig.name} - {$siteConfig.tagline}</title>
	<meta name="description" content={$siteConfig.description} />
</svelte:head>

<section class="hero">
	<div class="container">
		<h1>{$siteConfig.tagline}</h1>
		<p class="lead">{$siteConfig.description}</p>
		<div class="cta-group">
			<a href="/contact" class="button-primary">Book Appointment</a>
			<a href="/services" class="button-secondary">Our Services</a>
		</div>
	</div>
</section>

<section class="services-preview">
	<div class="container">
		<h2>Our Services</h2>
		<div class="services-grid">
			{#each $siteConfig.services.slice(0, 3) as service}
				<div class="service-card">
					<h3>{service.title}</h3>
					<p>{service.description}</p>
				</div>
			{/each}
		</div>
		<a href="/services" class="view-all">View All Services →</a>
	</div>
</section>

<section class="insurance">
	<div class="container">
		<h2>Insurance Accepted</h2>
		<p class="note">{$siteConfig.insurance.note}</p>
		<div class="insurance-grid">
			{#each $siteConfig.insurance.accepted.slice(0, 6) as plan}
				<div class="insurance-badge">{plan}</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.hero {
		padding: var(--space-2xl) 0;
		text-align: center;
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
		margin-bottom: var(--space-xl);
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.cta-group {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
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

	.services-preview {
		padding: var(--space-2xl) 0;
	}

	.services-preview h2 {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.services-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.service-card {
		background: var(--color-bg-surface);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.service-card h3 {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.service-card p {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.view-all {
		display: block;
		text-align: center;
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.insurance {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.insurance h2 {
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
</style>
