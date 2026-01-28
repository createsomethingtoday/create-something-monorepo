<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { config } from '$lib/config/runtime';

	let showInfo = $state(false);
</script>

<SEO
	title="About"
	description={$config.bio}
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'About', url: '/about' }
	]}
/>

<div class="about-page">
	<div class="about-content">
		<h1 class="name">{$config.name}</h1>
		<p class="role">{$config.role}</p>
		<p class="location">{$config.location}</p>

		<p class="bio">{$config.bio}</p>

		{#if $config.services && $config.services.length > 0}
			<section class="section">
				<h2 class="section-title">Services</h2>
				<ul class="services-list">
					{#each $config.services as service}
						<li class="service-item">{service}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if $config.clients && $config.clients.length > 0}
			<section class="section">
				<h2 class="section-title">Selected Clients</h2>
				<p class="clients-text">{$config.clients.join(', ')}</p>
			</section>
		{/if}

		{#if $config.availability?.accepting}
			<section class="section availability-section">
				<p class="availability-text">{$config.availability.message}</p>
			</section>
		{/if}

		<div class="links">
			<a href="/" class="link">Work</a>
			<a href="/contact" class="link">Contact</a>
		</div>
	</div>

	<!-- Info Toggle -->
	<button class="info-toggle" onclick={() => (showInfo = !showInfo)}>
		{showInfo ? 'Close' : 'Info'}
	</button>

	<!-- Info Panel -->
	{#if showInfo}
		<div class="info-panel" onclick={() => (showInfo = false)} role="dialog" aria-modal="true">
			<div class="info-content" onclick={(e) => e.stopPropagation()}>
				<h1 class="info-name">{$config.name}</h1>
				<p class="info-role">{$config.role}</p>
				<p class="info-location">{$config.location}</p>

				<div class="info-contact">
					<a href="/" class="contact-link">Home</a>
					<a href="/work" class="contact-link">Work</a>
					<a href="/contact" class="contact-link">Contact</a>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.about-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.about-content {
		max-width: 600px;
		width: 100%;
	}

	.name {
		font-size: var(--text-display);
		font-weight: 400;
		margin-bottom: var(--space-xs);
	}

	.role {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.location {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-lg);
	}

	.bio {
		font-size: var(--text-body);
		line-height: var(--leading-relaxed);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
	}

	.section {
		margin-bottom: var(--space-xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.section-title {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.services-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.service-item {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) 0;
	}

	.clients-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.availability-section {
		border: 1px solid var(--color-border-default);
		padding: var(--space-md);
		border-radius: 0;
	}

	.availability-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.links {
		display: flex;
		gap: var(--space-md);
		margin-top: var(--space-xl);
	}

	.link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.link:hover {
		color: var(--color-fg-primary);
	}

	/* Info */
	.info-toggle {
		position: fixed;
		bottom: var(--space-md);
		right: var(--space-md);
		z-index: 100;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		cursor: pointer;
		background: none;
		border: none;
		font-family: inherit;
		padding: var(--space-xs);
	}

	.info-toggle:hover {
		color: var(--color-fg-primary);
	}

	.info-panel {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(250, 250, 250, 0.98);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.info-content {
		max-width: 500px;
		text-align: center;
	}

	.info-name {
		font-size: var(--text-display);
		font-weight: 400;
		margin-bottom: var(--space-xs);
	}

	.info-role {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.info-location {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-lg);
	}

	.info-contact {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
	}

	.contact-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.contact-link:hover {
		color: var(--color-fg-primary);
	}

	@media (max-width: 640px) {
		.about-page {
			padding: var(--space-md);
		}
	}
</style>
