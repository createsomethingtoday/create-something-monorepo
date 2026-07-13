<script lang="ts">
	import { SEO } from '@create-something/canon';
	// This page is a redirect target - users should never see it
	// The +page.server.ts handles the token exchange and redirects
</script>

<SEO
	title="Signing In"
	description="Completing cross-domain authentication"
	propertyName="io"
	noindex={true}
/>

<div class="loading-container">
	<div class="loading-content">
		<div class="loading-text">Completing sign-in...</div>
		<div class="spinner"></div>
	</div>
</div>

<style>
	.loading-container {
		display: flex;
		min-height: 100vh;
		align-items: center;
		justify-content: center;
	}

	.loading-content {
		text-align: center;
	}

	.loading-text {
		margin-bottom: var(--space-performance-md);
		font-size: var(--text-performance-body-lg);
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		margin: 0 auto;
		border: 4px solid var(--color-performance-border-default);
		border-top-color: var(--color-performance-fg-primary);
		border-radius: var(--radius-performance-scale-full);
		animation: spin var(--duration-performance-slow) linear infinite;
		will-change: transform;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
			border-top-color: var(--color-performance-fg-primary);
			border-right-color: var(--color-performance-fg-primary);
		}
	}
</style>
