<script lang="ts">
	import { SEO } from '@create-something/components';
	// This page is a redirect target - users should never see it
	// The +page.server.ts handles the token exchange and redirects
</script>

<SEO
	title="Signing In"
	description="Completing cross-domain authentication"
	propertyName="space"
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
		margin-bottom: var(--space-md);
		font-size: var(--text-body-lg);
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		margin: 0 auto;
		border: 4px solid var(--color-border-default);
		border-top-color: var(--color-fg-primary);
		border-radius: var(--radius-full);
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
