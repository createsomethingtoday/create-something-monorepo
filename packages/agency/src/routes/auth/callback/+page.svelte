<script lang="ts">
	import { SEO } from '@create-something/canon';
	// Legacy identity callbacks are redirected to Clerk by the server load.
</script>

<SEO
	title="Signing In"
	description="Completing your Clerk sign-in"
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
		color: var(--color-fg-secondary);
	}
</style>
