<script lang="ts">
	/**
	 * Root Layout - Automotive EV Template
	 *
	 * Provides global styles and consistent page structure
	 */

	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen bg-white text-gray-900">
	{@render children()}
</div>
