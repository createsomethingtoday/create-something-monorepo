<script lang="ts">
	/**
	 * OUTERFIELDS Footer
	 *
	 * StreamVerse-inspired grid layout with brand, categories, and links
	 */
	import { FOOTER_LINKS } from '$lib/constants/navigation';
	import { Crown } from 'lucide-svelte';
</script>

<footer class="footer">
	<div class="footer-container">
		<div class="footer-grid">
			<!-- Brand column -->
			<div class="footer-brand">
				<h2 class="brand-name">OUTERFIELDS</h2>
				<p class="brand-description">
					A premium content network built in public. Behind-the-scenes access to how we create, market, and distribute content.
				</p>
				<div class="founding-badge">
					<Crown size={14} />
					<span class="badge-text">Founding Member Pricing</span>
				</div>
			</div>

			<!-- Categories column -->
			<div class="footer-column">
				<h3 class="column-title">Content</h3>
				<ul class="column-links">
					<li><a href="/#content">Crew Call</a></li>
					<li><a href="/#content">Kodiak</a></li>
					<li><a href="/#content">Films</a></li>
					<li><a href="/#content">Coming Soon</a></li>
				</ul>
			</div>

			<!-- Platform column -->
			<div class="footer-column">
				<h3 class="column-title">Platform</h3>
				<ul class="column-links">
					<li><a href="/#features">Features</a></li>
					<li><a href="/#pricing">Pricing</a></li>
					<li><a href="/demo">Demo</a></li>
					<li><a href="/changelog">Changelog</a></li>
				</ul>
			</div>

			<!-- Company column -->
			<div class="footer-column">
				<h3 class="column-title">Company</h3>
				<ul class="column-links">
					{#each FOOTER_LINKS as link}
						<li><a href={link.href}>{link.label}</a></li>
					{/each}
				</ul>
			</div>

			<!-- Newsletter column -->
			<div class="footer-column newsletter">
				<h3 class="column-title">Stay Updated</h3>
				<p class="newsletter-text">Get notified when new content drops.</p>
				<form class="newsletter-form" onsubmit={(e) => e.preventDefault()}>
					<input type="email" placeholder="Your email" class="newsletter-input" />
					<button type="submit" class="newsletter-button">JOIN</button>
				</form>
			</div>
		</div>

		<!-- Bottom bar -->
		<div class="footer-bottom">
			<p class="copyright">&copy; {new Date().getFullYear()} OUTERFIELDS. All rights reserved.</p>
			<div class="legal-links">
				<a href="/privacy">Privacy Policy</a>
				<a href="/terms">Terms of Use</a>
			</div>
		</div>
	</div>
</footer>

<style>
	.footer {
		padding: 4rem 1.5rem 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		background: var(--color-card-dark);
	}

	.footer-container {
		max-width: var(--container-max-width);
		margin: 0 auto;
	}

	.footer-grid {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
		gap: 3rem;
		margin-bottom: 3rem;
	}

	/* Brand column */
	.footer-brand {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.brand-name {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--color-fg-primary);
		text-transform: uppercase;
		letter-spacing: -0.02em;
		margin: 0;
	}

	.brand-description {
		font-size: 0.875rem;
		color: var(--color-fg-subtle);
		line-height: 1.6;
		margin: 0;
	}

	.founding-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-warning);
		max-width: fit-content;
	}

	.founding-badge :global(svg) {
		flex-shrink: 0;
	}

	.badge-text {
		letter-spacing: 0.025em;
	}

	/* Column styles */
	.footer-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.column-title {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.column-links {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.column-links a {
		font-size: 0.875rem;
		color: var(--color-fg-subtle);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.column-links a:hover {
		color: var(--color-fg-primary);
	}

	/* Newsletter */
	.newsletter-text {
		font-size: 0.875rem;
		color: var(--color-fg-subtle);
		margin: 0;
	}

	.newsletter-form {
		display: flex;
		background: rgba(255, 255, 255, 0.05);
		border-radius: var(--radius-md);
		padding: 0.25rem;
		margin-top: 0.5rem;
	}

	.newsletter-input {
		flex: 1;
		background: transparent;
		border: none;
		padding: 0.5rem 0.75rem;
		color: var(--color-fg-primary);
		font-size: 0.75rem;
	}

	.newsletter-input::placeholder {
		color: var(--color-fg-subtle);
	}

	.newsletter-input:focus {
		outline: none;
	}

	.newsletter-button {
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: var(--radius-sm);
		color: white;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.newsletter-button:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.3);
	}

	/* Bottom bar */
	.footer-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.copyright {
		font-size: 0.6875rem;
		color: var(--color-fg-subtle);
		margin: 0;
	}

	.legal-links {
		display: flex;
		gap: 1.5rem;
	}

	.legal-links a {
		font-size: 0.6875rem;
		color: var(--color-fg-subtle);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.legal-links a:hover {
		color: var(--color-fg-primary);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.footer-grid {
			grid-template-columns: 1fr 1fr 1fr;
			gap: 2rem;
		}

		.footer-brand {
			grid-column: span 3;
		}

		.newsletter {
			grid-column: span 3;
		}
	}

	@media (max-width: 640px) {
		.footer {
			padding: 3rem 1rem 1.5rem;
		}

		.footer-grid {
			grid-template-columns: 1fr 1fr;
			gap: 1.5rem;
		}

		.footer-brand {
			grid-column: span 2;
		}

		.newsletter {
			grid-column: span 2;
		}

		.footer-bottom {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}
	}
</style>
