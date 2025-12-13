<script lang="ts">
	import { siteConfig } from '$lib/config/site';
</script>

<footer class="footer">
	<div class="footer-inner">
		<div class="footer-main">
			<div class="footer-brand">
				<span class="footer-name">{siteConfig.name}</span>
				<span class="footer-tagline">{siteConfig.tagline}</span>
			</div>

			<div class="footer-contact">
				<a href="mailto:{siteConfig.email}" class="footer-link">{siteConfig.email}</a>
				<a href="tel:{siteConfig.phone}" class="footer-link">{siteConfig.phone}</a>
			</div>

			<div class="footer-address">
				<p>{siteConfig.address.street}</p>
				<p>
					{siteConfig.address.city}, {siteConfig.address.state}
					{siteConfig.address.zip}
				</p>
			</div>
		</div>

		<div class="footer-bottom">
			<div class="footer-social">
				{#if siteConfig.social.instagram}
					<a href={siteConfig.social.instagram} target="_blank" rel="noopener" class="social-link">
						Instagram
					</a>
				{/if}
				{#if siteConfig.social.pinterest}
					<a href={siteConfig.social.pinterest} target="_blank" rel="noopener" class="social-link">
						Pinterest
					</a>
				{/if}
			</div>

			<p class="footer-copyright">&copy; {new Date().getFullYear()} {siteConfig.name}</p>
		</div>
	</div>
</footer>

<style>
	.footer {
		padding: var(--space-2xl) var(--gutter);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-inner {
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.footer-main {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xl);
		margin-bottom: var(--space-xl);
	}

	.footer-brand {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.footer-name {
		font-size: var(--text-body);
		font-weight: 400;
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.footer-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-contact,
	.footer-address {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.footer-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	.footer-address p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-social {
		display: flex;
		gap: var(--space-md);
	}

	.social-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.social-link:hover {
		color: var(--color-fg-primary);
	}

	.footer-copyright {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	@media (max-width: 768px) {
		.footer-main {
			grid-template-columns: 1fr;
			gap: var(--space-lg);
		}

		.footer-bottom {
			flex-direction: column;
			gap: var(--space-md);
			align-items: flex-start;
		}
	}
</style>
