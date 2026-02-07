<script lang="ts">
	/**
	 * Footer Component
	 *
	 * Balanced three-row layout:
	 * 1. Top: Logo/brand + nav links + contact info (3 columns)
	 * 2. Middle: Newsletter (full width, compact)
	 * 3. Bottom: Copyright + social links
	 */

	import NewsletterForm from './NewsletterForm.svelte';
	import SocialLinks from './SocialLinks.svelte';

	const currentYear = new Date().getFullYear();

	const footerLinks = [
		{ href: '/book', label: 'book a court' },
		{ href: '/pricing', label: 'pricing' },
		{ href: '/team', label: 'meet our team' },
		{ href: '/contact', label: 'contact' }
	];
</script>

<footer class="section is-footer">
	<div class="container-large">
		<!-- Top Section: 3 Columns -->
		<div class="footer-top">
			<!-- Column 1: Brand -->
			<div class="footer-col">
				<p class="footer-brand">The Stack</p>
				<p class="footer-tagline">Indoor Pickleball</p>
				<p class="footer-location">Burleson, Texas</p>
			</div>

			<!-- Column 2: Navigation -->
			<div class="footer-col">
				<p class="footer-col-label">Navigate</p>
				<ul class="footer-nav">
					{#each footerLinks as link}
						<li>
							<a href={link.href} class="footer-nav-link">
								<span class="z-index-2">{link.label}</span>
								<div class="link_line"></div>
							</a>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Column 3: Contact -->
			<div class="footer-col">
				<p class="footer-col-label">Contact</p>
				<div class="footer-contact">
					<p class="text-weight-medium">Ernie</p>
					<p>
						<a href="tel:8172524555" class="footer-contact-link">(817) 252-4555</a>
					</p>
					<p>
						<a href="mailto:ernie.thestack@gmail.com" class="footer-contact-link">ernie.thestack@gmail.com</a>
					</p>
				</div>
				<div class="footer-apply">
					<a
						href="https://docs.google.com/forms/d/e/1FAIpQLScfJoqV-z1-VsVFZsBBvcK1Er8yt43aUqxFZjL5-hdAocY4WA/viewform?usp=dialog"
						target="_blank"
						rel="noopener"
						class="footer-apply-link"
					>
						Join our team &rarr;
					</a>
				</div>
			</div>
		</div>

		<!-- Divider -->
		<div class="footer-divider"></div>

		<!-- Newsletter Section -->
		<div class="footer-newsletter">
			<div class="footer-newsletter-text">
				<p class="heading-style-h4">Join our newsletter</p>
				<p class="text-size-regular footer-newsletter-desc">
					Stay up to date on tournaments, events, and special deals.
				</p>
			</div>
			<NewsletterForm variant="default" />
		</div>

		<!-- Divider -->
		<div class="footer-divider"></div>

		<!-- Copyright Section -->
		<div class="footer-bottom">
			<div class="opacity-60">
				<p class="text-size-regular">© {currentYear} The Stack Indoor Pickleball. All rights reserved.</p>
			</div>
			<SocialLinks />
		</div>
	</div>
</footer>

<style>
	/* Top Section: 3 Columns */
	.footer-top {
		display: grid;
		grid-template-columns: 1.2fr 1fr 1.2fr;
		gap: 3rem;
		padding-bottom: 3rem;
	}

	.footer-col {
		display: flex;
		flex-direction: column;
	}

	/* Brand Column */
	.footer-brand {
		font-family: var(--font-coolvetica);
		font-size: 1.75rem;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.footer-tagline {
		font-family: var(--font-satoshi);
		font-size: var(--text-eyebrow);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--dark-grey);
		margin-bottom: 1.25rem;
	}

	.footer-location {
		font-family: var(--font-satoshi);
		font-size: var(--text-body);
		color: var(--dark-grey);
	}

	/* Column Labels */
	.footer-col-label {
		font-family: var(--font-coolvetica);
		font-size: var(--text-eyebrow);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--green);
		margin-bottom: 1.25rem;
	}

	/* Navigation Column */
	.footer-nav {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.footer-nav-link {
		position: relative;
		text-decoration: none;
		text-transform: lowercase;
		font-family: var(--font-coolvetica);
		font-size: 1.125rem;
		letter-spacing: 0.04em;
		color: var(--black);
	}

	/* Contact Column */
	.footer-contact {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-family: var(--font-satoshi);
		font-size: var(--text-body);
	}

	.footer-contact-link {
		color: inherit;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.footer-contact-link:hover {
		color: var(--green);
	}

	.footer-apply {
		margin-top: 1.25rem;
	}

	.footer-apply-link {
		font-family: var(--font-satoshi);
		font-size: var(--text-eyebrow);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--dark-grey);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.footer-apply-link:hover {
		color: var(--green);
	}

	/* Divider */
	.footer-divider {
		height: 1px;
		background-color: var(--light-grey);
	}

	/* Newsletter Section */
	.footer-newsletter {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 3rem;
		padding: 2.5rem 0;
	}

	.footer-newsletter-text {
		flex-shrink: 0;
	}

	.footer-newsletter-desc {
		color: var(--dark-grey);
		margin-top: 0.375rem;
	}

	/* Copyright */
	.footer-bottom {
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding-top: 2rem;
		display: flex;
	}

	/* Responsive: Tablet */
	@media (max-width: 991px) {
		.footer-top {
			grid-template-columns: 1fr 1fr;
			gap: 2.5rem;
		}

		.footer-top .footer-col:first-child {
			grid-column: 1 / -1;
		}

		.footer-newsletter {
			flex-direction: column;
			align-items: flex-start;
			gap: 1.5rem;
		}
	}

	/* Responsive: Mobile */
	@media (max-width: 767px) {
		.footer-top {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.footer-top .footer-col:first-child {
			grid-column: auto;
		}

		.footer-bottom {
			flex-direction: column;
			gap: 1.5rem;
			text-align: center;
		}
	}
</style>
