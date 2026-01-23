<script lang="ts">
	import { SEO } from '@create-something/components';
	import { config } from '$lib/config/runtime';

	let showInfo = $state(false);

	// Build social links array
	const socialLinks = [
		$config.social.instagram && { label: 'Instagram', url: $config.social.instagram },
		$config.social.twitter && { label: 'Twitter', url: $config.social.twitter },
		$config.social.linkedin && { label: 'LinkedIn', url: $config.social.linkedin }
	].filter(Boolean);
</script>

<SEO
	title="Contact"
	description="Get in touch to discuss your project."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Contact', url: '/contact' }
	]}
/>

<div class="contact-page">
	<div class="contact-content">
		<h1 class="heading">Get in touch</h1>

		<div class="contact-section">
			<h2 class="label">Email</h2>
			<a href="mailto:{$config.email}" class="email-link">{$config.email}</a>
		</div>

		{#if socialLinks.length > 0}
			<div class="contact-section">
				<h2 class="label">Social</h2>
				<div class="social-links">
					{#each socialLinks as link}
						<a href={link.url} target="_blank" rel="noopener noreferrer" class="social-link">
							{link.label}
						</a>
					{/each}
				</div>
			</div>
		{/if}

		{#if $config.availability?.accepting}
			<div class="availability">
				<p class="availability-text">{$config.availability.message}</p>
			</div>
		{/if}

		<div class="links">
			<a href="/" class="link">Work</a>
			<a href="/about" class="link">About</a>
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
					<a href="/about" class="contact-link">About</a>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.contact-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.contact-content {
		max-width: 600px;
		width: 100%;
	}

	.heading {
		font-size: var(--text-display);
		font-weight: 400;
		margin-bottom: var(--space-xl);
	}

	.contact-section {
		margin-bottom: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.contact-section:first-of-type {
		padding-top: 0;
		border-top: none;
	}

	.label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 400;
	}

	.email-link {
		font-size: var(--text-h1);
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
		display: block;
	}

	.email-link:hover {
		color: var(--color-fg-secondary);
	}

	.social-links {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.social-link {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.social-link:hover {
		color: var(--color-fg-primary);
	}

	.availability {
		margin-top: var(--space-xl);
		padding: var(--space-md);
		border: 1px solid var(--color-border-default);
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
		.contact-page {
			padding: var(--space-md);
		}

		.email-link {
			font-size: var(--text-body);
			word-break: break-all;
		}
	}
</style>
