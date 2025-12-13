<script lang="ts">
	import { onMount } from 'svelte';

	// Redirect to dashboard if authenticated, login if not
	onMount(() => {
		// Check for auth cookie
		const hasSession = document.cookie.includes('session=');
		if (hasSession) {
			window.location.href = '/dashboard';
		} else {
			window.location.href = '/login';
		}
	});
</script>

<div class="flex items-center justify-center min-h-screen">
	<div class="text-center">
		<div class="animate-pulse">
			<svg class="w-12 h-12 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<path d="M12 6v6l4 2" />
			</svg>
		</div>
		<p class="mt-4" style="color: var(--color-fg-muted);">Loading...</p>
	</div>
</div>
