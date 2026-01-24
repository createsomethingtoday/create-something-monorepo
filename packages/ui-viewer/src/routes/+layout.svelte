<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { connection } from '$lib/stores/connection';
	import { operations, selectedNode } from '$lib/stores/operations';
	
	// Notify parent window of events (for iframe embedding)
	function notifyParent(type: string, data?: unknown) {
		if (browser && window.parent !== window) {
			window.parent.postMessage({ source: 'ui-viewer', type, ...data }, '*');
		}
	}
	
	// Track selection changes and notify parent
	$effect(() => {
		const node = $selectedNode;
		if (node) {
			notifyParent('select', { node });
		}
	});
	
	// Auto-connect on mount (unless in client-only mode)
	onMount(() => {
		const isClientMode = $page.url.searchParams.get('mode') === 'client';
		
		if (!isClientMode) {
			// Get URL from query param or default
			const wsUrl = $page.url.searchParams.get('ws') || $page.url.searchParams.get('bridge');
			if (wsUrl) {
				connection.setUrl(wsUrl);
			}
			
			connection.connect();
		}
		
		// Notify parent we're ready (works in both modes)
		notifyParent('ready');
		
		return () => {
			connection.disconnect();
		};
	});
</script>

<slot />
