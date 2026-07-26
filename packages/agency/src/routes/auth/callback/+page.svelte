<script lang="ts">
	import { SEO } from '@create-something/canon';
	// This page handles the redirect from magic link verification.
</script>

<SEO
	title="Signing In"
	description="Continue with CREATE SOMETHING Identity"
	propertyName="agency"
	noindex={true}
/>

<div class="callback-container">
	<p>Completing your sign-in...</p>
</div>

<style>
	.callback-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-performance-fg-secondary);
	}
</style>
