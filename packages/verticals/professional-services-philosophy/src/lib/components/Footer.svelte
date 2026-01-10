<script lang="ts">
	/**
	 * Footer - Rudolf Template Style
	 *
	 * Clean 3-column layout: Contact, Links, Location
	 */

	import { siteConfig } from '$lib/config/context';

	const currentYear = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="footer-container">
		<div class="footer-grid">
			<!-- Column 1: Brand & Contact -->
			<div class="footer-col">
				<h3 class="footer-brand">{$siteConfig.name}</h3>
				<p class="footer-tagline">{$siteConfig.tagline}</p>
				<div class="footer-contact">
					<a href="mailto:{$siteConfig.email}" class="footer-link">
						{$siteConfig.email}
					</a>
					<a href="tel:{$siteConfig.phone}" class="footer-link">
						{$siteConfig.phone}
					</a>
				</div>
			</div>

			<!-- Column 2: Quick Links -->
			<div class="footer-col">
				<h4 class="footer-heading">Quick Links</h4>
				<nav class="footer-nav">
					<a href="/projects" class="footer-link">Projects</a>
					<a href="/services" class="footer-link">Services</a>
					<a href="/studio" class="footer-link">About</a>
					<a href="/contact" class="footer-link">Contact</a>
				</nav>
			</div>

			<!-- Column 3: Location -->
			<div class="footer-col">
				<h4 class="footer-heading">Location</h4>
				<address class="footer-address">
					{$siteConfig.address.street}<br />
					{$siteConfig.address.city}, {$siteConfig.address.state} {$siteConfig.address.zip}
				</address>
			</div>
		</div>

		<div class="footer-bottom">
			<p class="footer-copyright">
				&copy; {currentYear} {$siteConfig.name}. All rights reserved.
			</p>
			<div class="footer-legal">
				<a href="/privacy" class="footer-legal-link">Privacy</a>
				<a href="/terms" class="footer-legal-link">Terms</a>
			</div>
		</div>
	</div>
</footer>

<style>
	.footer {
		background: #000;
		color: #fff;
		padding: 5rem 1.5rem 2rem;
	}

	.footer-container {
		max-width: 1400px;
		margin: 0 auto;
	}

	.footer-grid {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: 4rem;
		margin-bottom: 4rem;
	}

	.footer-brand {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.footer-tagline {
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 1.5rem 0;
		font-size: 1rem;
	}

	.footer-contact {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.footer-heading {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0 0 1.5rem 0;
		color: rgba(255, 255, 255, 0.4);
	}

	.footer-nav {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.footer-link {
		color: rgba(255, 255, 255, 0.8);
		text-decoration: none;
		transition: color 0.3s;
	}

	.footer-link:hover {
		color: #fff;
	}

	.footer-address {
		font-style: normal;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.6;
	}

	.footer-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.footer-copyright {
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.875rem;
		margin: 0;
	}

	.footer-legal {
		display: flex;
		gap: 2rem;
	}

	.footer-legal-link {
		color: rgba(255, 255, 255, 0.4);
		text-decoration: none;
		font-size: 0.875rem;
		transition: color 0.3s;
	}

	.footer-legal-link:hover {
		color: #fff;
	}

	@media (max-width: 768px) {
		.footer-grid {
			grid-template-columns: 1fr;
			gap: 2.5rem;
		}

		.footer-bottom {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}
	}
</style>
