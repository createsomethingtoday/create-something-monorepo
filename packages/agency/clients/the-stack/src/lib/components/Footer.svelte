<script lang="ts">
	/**
	 * Footer Component
	 *
	 * Contains:
	 * - Company info
	 * - Navigation links
	 * - Newsletter form
	 * - Social links
	 * - Copyright
	 */

	import NewsletterForm from './NewsletterForm.svelte';
	import SocialLinks from './SocialLinks.svelte';

	const footerLinks = [
		{ href: '/locations', label: 'book a court' },
		{ href: '/team', label: 'meet our team' },
		{ href: '/about', label: 'become a member' },
		{ href: '/contact', label: 'Contact' }
	];
</script>

<footer class="section is-footer">
	<div class="container-large">
		<!-- Top Section -->
		<div class="margin-bottom-64">
			<div class="wrap_flex is-align-top">
				<!-- Company Info -->
				<div class="max-width-250">
					<div class="margin-bottom-8">
						<p class="heading-style-h5">The stack: indoor pickleball</p>
					</div>
					<p class="text-size-medium">Contact us at 817-980-9374 or ernie.thestack@gmail.com</p>
					<p class="text-size-medium">
						BE PART OF THE STACK TEAM.
						<a
							href="https://docs.google.com/forms/d/e/1FAIpQLScfJoqV-z1-VsVFZsBBvcK1Er8yt43aUqxFZjL5-hdAocY4WA/viewform?usp=dialog"
							target="_blank"
							rel="noopener"
						>
							Apply Here
						</a>
					</p>
					<p class="text-size-medium"><em>ADDRESS</em></p>
				</div>

				<!-- Footer Links -->
				<ul class="footer_links">
					{#each footerLinks as link}
						<li class="footer_link-item">
							<a href={link.href} class="footer_link">
								<span class="z-index-2">{link.label}</span>
								<div class="link_line"></div>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<!-- Newsletter Section -->
		<div class="margin-bottom-64">
			<div class="wrap_flex is-align-top">
				<div class="max-width-440">
					<div class="margin-bottom-8">
						<p class="heading-style-h2">Join our newsletter</p>
					</div>
					<p class="text-size-medium">
						Join our newsletter to stay up to date on tournaments, events, camps, and special deals.
					</p>
				</div>
				<NewsletterForm variant="default" />
			</div>
		</div>

		<!-- Copyright Section -->
		<div class="footer_copyright">
			<div class="opacity-60">
				<div class="footer_copyright-inner">
					<p class="text-size-regular">© 2025 The Stack Indoor Pickleball. All rights reserved.</p>
				</div>
			</div>
			<SocialLinks />
		</div>
	</div>
</footer>

<style>
	.footer_links {
		display: flex;
		gap: 3rem;
		margin-right: -0.5rem;
	}

	.footer_link {
		position: relative;
		text-decoration: none;
		text-transform: lowercase;
		font-family: var(--font-coolvetica);
		font-size: 1.125rem;
		letter-spacing: 0.04em;
	}

	.footer_copyright {
		border-top: 1px solid var(--dark-grey);
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding-top: 2rem;
		display: flex;
	}

	.footer_copyright-inner {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	@media (max-width: 991px) {
		.footer_links {
			flex-direction: column;
			gap: 1rem;
		}
	}

	@media (max-width: 767px) {
		.footer_copyright {
			flex-direction: column;
			gap: 1.5rem;
			text-align: center;
		}

		.footer_copyright-inner {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>
