<script lang="ts">
	/**
	 * OUTERFIELDS Footer
	 *
	 * Minimal footer with links and copyright
	 */
</script>

<footer class="footer">
	<div class="footer-container">
		<div class="footer-left">
			<p class="copyright">&copy; 2025 OUTERFIELDS. All rights reserved.</p>
		</div>
		<div class="footer-right">
			<a href="/privacy" class="footer-link">Privacy</a>
			<a href="/terms" class="footer-link">Terms</a>
			<a href="/contact" class="footer-link">Contact</a>
		</div>
	</div>
</footer>

<style>
	.footer {
		padding: 2.5rem 1.5rem;
		border-top: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
	}

	.footer-container {
		max-width: 80rem;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.copyright {
		font-size: 0.875rem;
		color: var(--color-fg-subtle);
		margin: 0;
	}

	.footer-right {
		display: flex;
		gap: 1.5rem;
	}

	.footer-link {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	@media (max-width: 640px) {
		.footer-container {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}
	}
</style>
