<script lang="ts">
	import { SEO } from '@create-something/canon';
</script>

<SEO
	title="Redirecting"
	description="Redirecting to sign-in"
	propertyName="agency"
	noindex={true}
/>

<div class="callback-container">
	<p>Redirecting to sign-in…</p>
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
