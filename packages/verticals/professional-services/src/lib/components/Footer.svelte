<script lang="ts">
	/**
	 * Footer - DWELL-Inspired Minimal Footer
	 *
	 * Simple, elegant, recedes into the page.
	 * Contact info, social links, legal. Nothing more.
	 *
	 * "The footer should feel like a quiet ending,
	 * not an afterthought."
	 */

	import { siteConfig } from '$lib/config/context';

	const currentYear = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="footer-container">
		<!-- Main content: three columns -->
		<div class="footer-main">
			<!-- Left: Studio info -->
			<div class="footer-studio">
				<span class="footer-name">{$siteConfig.name}</span>
				<address class="footer-address">
					<span>{$siteConfig.address.street}</span>
					<span>{$siteConfig.address.city}, {$siteConfig.address.state} {$siteConfig.address.zip}</span>
				</address>
			</div>

			<!-- Middle: Site navigation -->
			<div class="footer-nav">
				<nav class="footer-links" aria-label="Footer navigation">
					<a href="/projects" class="footer-link">Projects</a>
					<a href="/services" class="footer-link">Services</a>
					<a href="/team" class="footer-link">Team</a>
					<a href="/studio" class="footer-link">Studio</a>
					<a href="/about" class="footer-link">About</a>
					<a href="/contact" class="footer-link">Contact</a>
				</nav>
			</div>

			<!-- Right: Contact & Social -->
			<div class="footer-contact">
				<a href="mailto:{$siteConfig.email}" class="footer-email">{$siteConfig.email}</a>
				<a href="tel:{$siteConfig.phone}" class="footer-phone">{$siteConfig.phone}</a>
				<div class="footer-social">
					{#if $siteConfig.social.instagram}
						<a
							href={$siteConfig.social.instagram}
							class="social-link"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Instagram"
						>
							Instagram
						</a>
					{/if}
					{#if $siteConfig.social.pinterest}
						<a
							href={$siteConfig.social.pinterest}
							class="social-link"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Pinterest"
						>
							Pinterest
						</a>
					{/if}
				</div>
			</div>
		</div>

		<!-- Bottom: copyright & legal -->
		<div class="footer-bottom">
			<span class="footer-copyright">&copy; {currentYear} {$siteConfig.name}</span>
			<div class="footer-legal">
				<a href="/privacy" class="legal-link">Privacy</a>
				<a href="/terms" class="legal-link">Terms</a>
			</div>
		</div>
	</div>
</footer>

<style>
	.footer {
		background: var(--color-bg-pure);
		border-top: 1px solid var(--color-border-default);
		padding: var(--space-2xl) 0 var(--space-xl);
	}

	.footer-container {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: 0 var(--space-lg);
	}

	.footer-main {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-xl);
		padding-bottom: var(--space-xl);
	}

	@media (min-width: 768px) {
		.footer-main {
			grid-template-columns: 1fr 1fr 1fr;
		}
	}

	/* Footer navigation */
	.footer-nav {
		display: flex;
		flex-direction: column;
	}

	.footer-links {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	@media (min-width: 768px) {
		.footer-links {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-xs) var(--space-md);
		}
	}

	.footer-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	/* Studio info */
	.footer-studio {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.footer-name {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
	}

	.footer-address {
		font-style: normal;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Contact */
	.footer-contact {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	@media (min-width: 768px) {
		.footer-contact {
			text-align: right;
			align-items: flex-end;
		}
	}

	.footer-email,
	.footer-phone {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-email:hover,
	.footer-phone:hover {
		color: var(--color-fg-primary);
	}

	.footer-social {
		display: flex;
		gap: var(--space-md);
		margin-top: var(--space-sm);
	}

	.social-link {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-decoration: none;
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.social-link:hover {
		color: var(--color-fg-primary);
	}

	/* Bottom bar */
	.footer-bottom {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	@media (min-width: 768px) {
		.footer-bottom {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
	}

	.footer-copyright {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
	}

	.footer-legal {
		display: flex;
		gap: var(--space-md);
	}

	.legal-link {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.legal-link:hover {
		color: var(--color-fg-muted);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.footer-email,
		.footer-phone,
		.social-link,
		.legal-link {
			transition: none;
		}
	}
</style>
