<script lang="ts">
	// This page handles the redirect from magic link verification.
	// The +page.server.ts does the actual work and redirects.
</script>

<div class="callback-container">
	<p>Verifying your login...</p>
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
