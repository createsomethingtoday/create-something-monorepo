<script lang="ts">
	import { siteConfig } from '$lib/config/site';
</script>

<footer class="footer">
	<div class="footer-inner">
		<div class="footer-top">
			<div class="footer-cta">
				<h2 class="cta-headline">Ready to stand out?</h2>
				<a href="/contact" class="btn-primary">Start a Project</a>
			</div>
		</div>

		<div class="footer-main">
			<div class="footer-brand">
				<span class="footer-name">{siteConfig.name}</span>
				<p class="footer-tagline">{siteConfig.tagline}</p>
			</div>

			<div class="footer-links">
				<div class="link-group">
					<h3 class="link-label">Work</h3>
					<nav class="link-list">
						{#each siteConfig.work.slice(0, 3) as project}
							<a href="/work/{project.slug}">{project.client}</a>
						{/each}
					</nav>
				</div>

				<div class="link-group">
					<h3 class="link-label">Services</h3>
					<nav class="link-list">
						{#each siteConfig.services as service}
							<a href="/services">{service.name}</a>
						{/each}
					</nav>
				</div>

				<div class="link-group">
					<h3 class="link-label">Connect</h3>
					<nav class="link-list">
						<a href="mailto:{siteConfig.email}">Email</a>
						{#if siteConfig.social.instagram}
							<a href={siteConfig.social.instagram} target="_blank" rel="noopener">Instagram</a>
						{/if}
						{#if siteConfig.social.linkedin}
							<a href={siteConfig.social.linkedin} target="_blank" rel="noopener">LinkedIn</a>
						{/if}
					</nav>
				</div>
			</div>
		</div>

		<div class="footer-bottom">
			<p class="copyright">&copy; {new Date().getFullYear()} {siteConfig.name}</p>
			<nav class="legal-links">
				<a href="/privacy">Privacy</a>
				<a href="/terms">Terms</a>
			</nav>
		</div>
	</div>
</footer>

<style>
	.footer {
		background: var(--color-bg-elevated);
		padding: var(--space-3xl) var(--gutter) var(--space-xl);
	}

	.footer-inner {
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.footer-top {
		padding-bottom: var(--space-2xl);
		border-bottom: 1px solid var(--color-border-default);
		margin-bottom: var(--space-2xl);
	}

	.footer-cta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-lg);
	}

	.cta-headline {
		font-size: var(--text-h2);
		font-weight: 600;
	}

	.footer-main {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: var(--space-2xl);
		margin-bottom: var(--space-2xl);
	}

	.footer-brand {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.footer-name {
		font-size: var(--text-body-lg);
		font-weight: 600;
	}

	.footer-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-links {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xl);
	}

	.link-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.link-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.link-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.link-list a {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.link-list a:hover {
		color: var(--color-fg-primary);
	}

	.footer-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.copyright {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.legal-links {
		display: flex;
		gap: var(--space-md);
	}

	.legal-links a {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.legal-links a:hover {
		color: var(--color-fg-primary);
	}

	@media (max-width: 768px) {
		.footer-main {
			grid-template-columns: 1fr;
		}

		.footer-links {
			grid-template-columns: repeat(2, 1fr);
		}

		.footer-bottom {
			flex-direction: column;
			gap: var(--space-md);
			align-items: flex-start;
		}
	}
</style>
