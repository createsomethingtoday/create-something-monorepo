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
			<div class="founding-badge">
				<span class="badge-icon">👑</span>
				<span class="badge-text">Founding Member Pricing Available</span>
			</div>
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

	.footer-left {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.copyright {
		font-size: 0.875rem;
		color: var(--color-fg-subtle);
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

	.badge-icon {
		font-size: 1rem;
		line-height: 1;
	}

	.badge-text {
		letter-spacing: 0.025em;
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
			gap: 1.5rem;
			text-align: center;
		}

		.footer-left {
			align-items: center;
		}

		.founding-badge {
			font-size: 0.6875rem;
		}

		.badge-icon {
			font-size: 0.875rem;
		}
	}
</style>
