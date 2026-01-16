<script lang="ts">
	/**
	 * Footer Component - 3-column layout with Y Combinator logo
	 * Maverick X Design System
	 *
	 * Content fetched from CMS at request time (not build time)
	 */

	interface FooterContent {
		tagline?: string;
		address?: {
			line1?: string;
			line2?: string;
			line3?: string;
		};
	}

	interface Props {
		onContactClick?: () => void;
		content?: FooterContent | null;
	}

	let { onContactClick, content }: Props = $props();

	// Defaults with CMS overrides
	const tagline = content?.tagline ?? 'Engineering the future of chemistry for safer, more profitable natural resource production.';
	const addressLine1 = content?.address?.line1 ?? '444 E. St. Elmo Rd.';
	const addressLine2 = content?.address?.line2 ?? 'Bldg. B';
	const addressLine3 = content?.address?.line3 ?? 'Austin, TX 78745';

	const companyLinks = [
		{ href: '/oil-gas', label: 'OIL & GAS' },
		{ href: '/mining', label: 'MINING & METALS' },
		{ href: '/water-treatment', label: 'WATER TREATMENT' },
		{ href: 'https://jobs.lever.co/maverickx', label: 'CAREERS', external: true }
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
					{tagline}
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
					{addressLine1}<br />
					{addressLine2}<br />
					{addressLine3}
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
		background: var(--color-bg-pure);
		padding: 5rem 0;
		color: var(--color-fg-primary);
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
		color: var(--color-fg-secondary);
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
		color: var(--color-fg-tertiary);
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
		color: var(--color-fg-primary);
		margin-bottom: 1.5rem;
	}

	.footer-nav {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.footer-link {
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	.footer-address {
		font-style: normal;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--color-fg-secondary);
		margin-bottom: 1.5rem;
	}

	.contact-button {
		display: inline-block;
		padding: 0.625rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-primary);
		background: transparent;
		border: 1px solid var(--color-border-strong);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.contact-button:hover {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}
</style>
