<script lang="ts">
	/**
	 * OUTERFIELDS Footer
	 *
	 * Minimal footer with links and copyright
	 */
	import { FOOTER_LINKS } from '$lib/constants/navigation';
</script>

<footer class="footer">
	<div class="footer-container">
		<div class="footer-left">
			<p class="copyright">&copy; {new Date().getFullYear()} OUTERFIELDS. All rights reserved.</p>
		</div>
		<div class="footer-right">
			{#each FOOTER_LINKS as link}
				<a href={link.href} class="footer-link">{link.label}</a>
			{/each}
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
