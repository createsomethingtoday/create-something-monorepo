<script lang="ts">
	/**
	 * Footer - Law Firm
	 *
	 * Professional, trust-building footer with:
	 * - Contact information
	 * - Navigation to key pages
	 * - Bar association memberships
	 * - Ethics disclaimer
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { Linkedin, Twitter, Mail, Phone, MapPin } from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();

	const currentYear = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="footer-container">
		<!-- Main content: three columns -->
		<div class="footer-main">
			<!-- Left: Firm info -->
			<div class="footer-firm">
				<span class="footer-name">{siteConfig.name}</span>
				<address class="footer-address">
					<span>{siteConfig.address.street}</span>
					<span>{siteConfig.address.city}, {siteConfig.address.state} {siteConfig.address.zip}</span>
				</address>
			</div>

			<!-- Middle: Site navigation -->
			<div class="footer-nav">
				<nav class="footer-links" aria-label="Footer navigation">
					<a href="/practice-areas" class="footer-link">Practice Areas</a>
					<a href="/attorneys" class="footer-link">Attorneys</a>
					<a href="/results" class="footer-link">Case Results</a>
					<a href="/about" class="footer-link">About</a>
					<a href="/contact" class="footer-link">Contact</a>
					<a href="/schedule" class="footer-link">Schedule</a>
				</nav>
			</div>

			<!-- Right: Contact & Social -->
			<div class="footer-contact">
				<a href="mailto:{siteConfig.email}" class="footer-email">
					<Mail size={16} strokeWidth={1.5} />
					{siteConfig.email}
				</a>
				<a href="tel:{siteConfig.phone}" class="footer-phone">
					<Phone size={16} strokeWidth={1.5} />
					{siteConfig.phone}
				</a>
				<div class="footer-social">
					{#if siteConfig.social?.linkedin}
						<a
							href={siteConfig.social.linkedin}
							class="social-link"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="LinkedIn"
						>
							<Linkedin size={18} strokeWidth={1.5} />
						</a>
					{/if}
					{#if siteConfig.social?.twitter}
						<a
							href={siteConfig.social.twitter}
							class="social-link"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Twitter"
						>
							<Twitter size={18} strokeWidth={1.5} />
						</a>
					{/if}
				</div>
			</div>
		</div>

		<!-- Bar Associations -->
		{#if siteConfig.barAssociations?.length}
			<div class="footer-associations">
				<span class="associations-label">Member of:</span>
				{#each siteConfig.barAssociations as association}
					<span class="association">{association}</span>
				{/each}
			</div>
		{/if}

		<!-- Bottom: copyright & legal -->
		<div class="footer-bottom">
			<span class="footer-copyright">&copy; {currentYear} {siteConfig.name}</span>
			<div class="footer-legal">
				<a href="/privacy" class="legal-link">Privacy</a>
				<a href="/terms" class="legal-link">Terms</a>
			</div>
		</div>

		<!-- Disclaimer -->
		<div class="footer-disclaimer">
			{siteConfig.disclaimer}
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
		max-width: 1200px;
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
		transition: color 0.2s;
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	/* Firm info */
	.footer-firm {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.footer-name {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-primary);
		letter-spacing: 0.05em;
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
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color 0.2s;
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
		letter-spacing: 0.02em;
		text-transform: uppercase;
		transition: color 0.2s;
	}

	.social-link:hover {
		color: var(--color-fg-primary);
	}

	/* Bar Associations */
	.footer-associations {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		align-items: center;
		padding: var(--space-md) 0;
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
	}

	.associations-label {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	.association {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
	}

	/* Bottom bar */
	.footer-bottom {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
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
		transition: color 0.2s;
	}

	.legal-link:hover {
		color: var(--color-fg-muted);
	}

	/* Disclaimer */
	.footer-disclaimer {
		margin-top: var(--space-lg);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
		line-height: 1.5;
	}
</style>
