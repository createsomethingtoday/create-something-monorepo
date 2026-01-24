<script lang="ts">
	/**
	 * Embed Route - Minimal UI Viewer for iframe embedding
	 * 
	 * TWO MODES:
	 * 1. Client-side mode (/embed?mode=client)
	 *    - No WebSocket connection needed
	 *    - Diff runs in browser via postMessage
	 *    - Scales to thousands of concurrent learners
	 * 
	 * 2. Bridge mode (/embed?ws=wss://bridge.example.com)
	 *    - Connects to shared bridge server
	 *    - For development/file watching
	 * 
	 * postMessage API:
	 *   Parent → Viewer:
	 *     { type: 'simulate', before, after, path }  ← Client-side diff
	 *     { type: 'change', path, operations, timestamp }
	 *     { type: 'reset' }
	 *     { type: 'select', id }
	 *   
	 *   Viewer → Parent:
	 *     { source: 'ui-viewer', type: 'ready' }
	 *     { source: 'ui-viewer', type: 'simulated', operations }
	 *     { source: 'ui-viewer', type: 'select', node }
	 */
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import { connection, connectionStatus } from '$lib/stores/connection';
	import { currentTree, recentChanges } from '$lib/stores/operations';
	
	// Check if we're in client-side mode (no bridge needed)
	const isClientMode = $derived($page.url.searchParams.get('mode') === 'client');
	
	// In client mode, don't auto-connect to bridge
	onMount(() => {
		if (isClientMode) {
			// Disconnect if somehow connected
			connection.disconnect();
		}
	});
</script>

<svelte:head>
	<title>UI Viewer Embed</title>
	<style>
		html, body {
			margin: 0;
			padding: 0;
			overflow: hidden;
			background: var(--color-bg-pure, #0a0a0a);
		}
	</style>
</svelte:head>

<div class="embed-viewer">
	<Canvas />
	
	{#if !isClientMode}
		{#if $connectionStatus === 'connecting'}
			<div class="status-overlay">
				<div class="status-dot connecting"></div>
				<span>Connecting...</span>
			</div>
		{:else if $connectionStatus === 'disconnected'}
			<div class="status-overlay">
				<div class="status-dot disconnected"></div>
				<span>Disconnected</span>
			</div>
		{/if}
	{/if}
	
	{#if $recentChanges.size > 0}
		<div class="change-indicator">
			{$recentChanges.size} change{$recentChanges.size === 1 ? '' : 's'}
		</div>
	{/if}
</div>

<style>
	.embed-viewer {
		width: 100vw;
		height: 100vh;
		position: relative;
		overflow: hidden;
		background: var(--color-bg-pure);
	}
	
	.status-overlay {
		position: absolute;
		bottom: var(--space-md);
		left: var(--space-md);
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
	
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	
	.status-dot.connecting {
		background: var(--color-warning);
		animation: pulse 1s infinite;
	}
	
	.status-dot.disconnected {
		background: var(--color-error);
	}
	
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
	
	.change-indicator {
		position: absolute;
		top: var(--space-md);
		right: var(--space-md);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-success);
		color: var(--color-bg-pure);
		border-radius: var(--radius-md);
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		animation: fadeInOut 1s ease-out;
	}
	
	@keyframes fadeInOut {
		0% { opacity: 0; transform: translateY(-10px); }
		20% { opacity: 1; transform: translateY(0); }
		80% { opacity: 1; }
		100% { opacity: 0; }
	}
</style>
