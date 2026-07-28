<script lang="ts">
	import DarkModeToggle from './DarkModeToggle.svelte';
</script>

<div class="auth-theme-toggle">
	<DarkModeToggle />
</div>

<style>
	.auth-theme-toggle {
		position: fixed;
		top: var(--space-md);
		right: var(--space-md);
		z-index: 50;
	}
</style>
