<script lang="ts">
	import '../app.css';
	import { onNavigate } from '$app/navigation';

	// Enable View Transitions API for smooth page transitions
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<div class="page-transition">
	<slot />
</div>

<style>
	.page-transition {
		animation: pageEnter var(--duration-standard) var(--ease-standard);
	}
</style>
