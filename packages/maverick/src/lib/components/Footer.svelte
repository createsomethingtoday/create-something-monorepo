<script lang="ts">
	/**
	 * Footer Component - 3-column layout with Y Combinator logo
	 * Maverick X Design System
	 */

	interface Props {
		onContactClick?: () => void;
	}

	let { onContactClick }: Props = $props();

	const companyLinks = [
		{ href: '/oil-gas', label: 'OIL & GAS' },
		{ href: '/mining', label: 'MINING & METALS' },
		{ href: '/water-treatment', label: 'WATER TREATMENT' },
		{ href: 'https://mavericklabs.pinpointhq.com/', label: 'CAREERS', external: true },
		{ href: '/news', label: 'NEWS' }
	];
</script>

<footer class="footer">
	<div class="container">
		<div class="footer-grid">
			<!-- Left Column - Logo and Tagline -->
			<div class="footer-brand">
				<!-- Logo -->
				<a href="/" class="footer-logo">
					<img
						src="/images/logo.png"
						alt="Maverick X"
						class="logo-image"
					/>
				</a>

				<!-- Tagline -->
				<p class="brand-tagline">
					Engineering the future of chemistry for safer, more profitable natural resource production.
				</p>

				<!-- Y Combinator -->
				<div class="yc-badge">
					<span class="yc-label">BACKED BY</span>
					<img
						src="/images/y-combinator-logo.svg"
						alt="Y Combinator"
						class="yc-logo"
					/>
				</div>
			</div>

			<!-- Middle Column - Company -->
			<div class="footer-column">
				<h3 class="footer-heading">Company</h3>
				<nav class="footer-nav">
					{#each companyLinks as link}
						{#if link.external}
							<a
								href={link.href}
								class="footer-link"
								target="_blank"
								rel="noopener noreferrer"
							>
								{link.label}
							</a>
						{:else}
							<a href={link.href} class="footer-link">
								{link.label}
							</a>
						{/if}
					{/each}
				</nav>
			</div>

			<!-- Right Column - Get In Touch -->
			<div class="footer-column">
				<h3 class="footer-heading">Get In Touch</h3>
				<address class="footer-address">
					444 E. St. Elmo Rd.<br />
					Bldg. B<br />
					Austin, TX 78745
				</address>
				<button
					type="button"
					class="contact-button"
					onclick={onContactClick}
				>
					CONTACT
				</button>
			</div>
		</div>
	</div>
</footer>

<style>
	.footer {
		background: #000000;
		padding: 5rem 0;
		color: #ffffff;
	}

	@media (max-width: 1023px) {
		.footer {
			padding: 4rem 0;
		}
	}

	@media (max-width: 767px) {
		.footer {
			padding: 3rem 0;
		}
	}

	.footer-grid {
		display: flex;
		justify-content: space-between;
		gap: 4rem;
	}

	@media (max-width: 1023px) {
		.footer-grid {
			flex-direction: column;
			gap: 3rem;
		}
	}

	.footer-brand {
		flex: 1;
		max-width: 28rem;
	}

	.footer-logo {
		display: inline-block;
		margin-bottom: 2rem;
	}

	.logo-image {
		height: 2.5rem;
		width: auto;
	}

	.brand-tagline {
		font-size: 1rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 3rem;
	}

	.yc-badge {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
	}

	.yc-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.yc-logo {
		height: 3rem;
		width: auto;
	}

	.footer-column {
		flex-shrink: 0;
	}

	.footer-heading {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		color: #ffffff;
		margin-bottom: 1.5rem;
	}

	.footer-nav {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.footer-link {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: color 0.3s ease;
	}

	.footer-link:hover {
		color: #ffffff;
	}

	.footer-address {
		font-style: normal;
		font-size: 1rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 1.5rem;
	}

	.contact-button {
		display: inline-block;
		padding: 0.625rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #ffffff;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.3);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.contact-button:hover {
		background: #ffffff;
		color: #000000;
	}
</style>
