<script lang="ts">
	// Footer Section
	// A CREATE SOMETHING product
</script>

<footer class="footer">
	<div class="container">
		<div class="footer-brand">
			<span class="brand-name">CLEARWAY</span>
			<p class="brand-tagline">The infrastructure disappears; courts get booked.</p>
		</div>

		<div class="footer-links">
			<a href="/docs">Documentation</a>
			<a href="/developers">Developers</a>
			<a href="/privacy">Privacy</a>
			<a href="/terms">Terms</a>
		</div>

		<p class="footer-attribution">
			A <a href="https://createsomething.agency" target="_blank" rel="noopener">CREATE SOMETHING</a> product
		</p>
	</div>
</footer>

<style>
	.footer {
		padding: var(--space-xl) var(--space-md);
		background: var(--color-bg-pure);
		border-top: 1px solid var(--color-border-default);
	}

	.container {
		max-width: 72rem;
		margin: 0 auto;
		text-align: center;
	}

	.footer-brand {
		margin-bottom: var(--space-lg);
	}

	.brand-name {
		font-size: var(--text-h3);
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--color-fg-primary);
	}

	.brand-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: var(--space-xs) 0 0;
	}

	.footer-links {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: var(--space-lg);
	}

	.footer-links a {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-links a:hover {
		color: var(--color-fg-primary);
	}

	.footer-attribution {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.footer-attribution a {
		color: var(--color-fg-tertiary);
		text-decoration: none;
	}

	.footer-attribution a:hover {
		color: var(--color-fg-secondary);
	}
</style>
