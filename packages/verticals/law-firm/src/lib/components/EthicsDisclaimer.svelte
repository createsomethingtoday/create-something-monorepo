<script lang="ts">
	/**
	 * Ethics Disclaimer Component
	 * Required legal disclaimer for law firm websites
	 * Shows at bottom of pages
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';

	const siteConfig = getSiteConfigFromContext();
	const { disclaimer, name } = siteConfig;
</script>

<aside class="ethics-disclaimer">
	<div class="disclaimer-container">
		<p class="disclaimer-text">{disclaimer}</p>
		<p class="disclaimer-notice">
			© {new Date().getFullYear()} {name}. All rights reserved.
			<a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
		</p>
	</div>
</aside>

<style>
	.ethics-disclaimer {
		padding: var(--space-lg) var(--space-md);
		background: var(--color-bg-subtle);
		border-top: 1px solid var(--color-border-default);
	}

	.disclaimer-container {
		max-width: 800px;
		margin: 0 auto;
		text-align: center;
	}

	.disclaimer-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		line-height: 1.6;
		margin: 0 0 var(--space-sm);
	}

	.disclaimer-notice {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
		margin: 0;
	}

	.disclaimer-notice a {
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.disclaimer-notice a:hover {
		color: var(--color-fg-tertiary);
	}

	@media (max-width: 768px) {
		.ethics-disclaimer {
			padding: var(--space-md);
		}
	}
</style>
