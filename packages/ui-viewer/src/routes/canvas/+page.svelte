<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	
	// Types for V2 artifacts
	interface ArtifactV2 {
		id: string;
		name: string;
		version: number;
		type: string;
		content: Record<string, unknown>;
		style: Record<string, unknown>;
	}
	
	interface RenderMessage {
		type: 'render';
		artifactId?: string;
		schema?: ArtifactV2;
		timestamp: number;
	}
	
	// State
	let status = $state<'connecting' | 'connected' | 'disconnected'>('connecting');
	let lastUpdate = $state<Date | null>(null);
	let buildCount = $state(0);
	let currentArtifact = $state<ArtifactV2 | null>(null);
	let iframeKey = $state(0); // For forcing iframe refresh
	let ws: WebSocket | null = null;
	
	// Get params from URL
	let bridgeUrl = $derived($page.url.searchParams.get('bridge') || 'ws://localhost:4201');
	let bridgeHttpUrl = $derived(bridgeUrl.replace('ws://', 'http://').replace('wss://', 'https://'));
	let artifactId = $derived($page.url.searchParams.get('artifact'));
	
	// Preview URL for iframe (real Svelte rendering)
	let previewUrl = $derived(
		currentArtifact 
			? `/preview/${currentArtifact.id}?bridge=${encodeURIComponent(bridgeHttpUrl)}`
			: ''
	);
	
	onMount(() => {
		if (!browser) return;
		
		connectWebSocket();
		
		// If artifact ID in URL, load it
		if (artifactId) {
			loadArtifact(artifactId);
		}
		
		return () => {
			if (ws) ws.close();
		};
	});
	
	// Load V2 artifact by ID
	async function loadArtifact(id: string) {
		try {
			const res = await fetch(`${bridgeHttpUrl}/api/v2/artifacts/${id}`);
			if (!res.ok) {
				// Try V1 fallback
				const v1Res = await fetch(`${bridgeHttpUrl}/api/artifacts/${id}`);
				if (v1Res.ok) {
					// V1 artifact - can't use iframe preview
					console.log('V1 artifact detected, iframe preview not available');
				}
				return;
			}
			
			currentArtifact = await res.json();
			updateUrlWithArtifact(id);
			lastUpdate = new Date();
			buildCount++;
		} catch (e) {
			console.error('Error loading artifact:', e);
		}
	}
	
	// Update URL when artifact changes
	function updateUrlWithArtifact(id: string) {
		if (!browser) return;
		const url = new URL(window.location.href);
		url.searchParams.set('artifact', id);
		window.history.replaceState({}, '', url.toString());
	}
	
	// Copy shareable link
	async function copyArtifactLink() {
		if (!browser || !currentArtifact) return;
		const url = new URL(window.location.href);
		url.searchParams.set('artifact', currentArtifact.id);
		await navigator.clipboard.writeText(url.toString());
	}
	
	// Refresh iframe
	function refreshPreview() {
		iframeKey++;
	}
	
	function connectWebSocket() {
		try {
			ws = new WebSocket(bridgeUrl);
			
			ws.onopen = () => {
				status = 'connected';
				console.log('Canvas: Connected to bridge');
			};
			
			ws.onclose = () => {
				status = 'disconnected';
				setTimeout(connectWebSocket, 2000);
			};
			
			ws.onerror = () => {
				status = 'disconnected';
			};
			
			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					
					if (data.type === 'render' && data.schema) {
						handleV2Render(data as RenderMessage);
					}
				} catch (e) {
					// Ignore parse errors
				}
			};
		} catch (e) {
			status = 'disconnected';
		}
	}
	
	function handleV2Render(msg: RenderMessage) {
		if (!msg.schema) return;
		
		lastUpdate = new Date();
		buildCount++;
		
		// Update current artifact
		currentArtifact = msg.schema;
		
		// Update URL
		if (msg.artifactId) {
			updateUrlWithArtifact(msg.artifactId);
		}
		
		// Force iframe refresh to show new content
		iframeKey++;
		
		console.log(`Canvas: V2 artifact updated - ${msg.schema.name} v${msg.schema.version}`);
	}
	
	function formatTime(date: Date | null): string {
		if (!date) return '—';
		return date.toLocaleTimeString('en-US', { 
			hour: '2-digit', 
			minute: '2-digit', 
			second: '2-digit' 
		});
	}
	
	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		// Ignore if typing in input
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		
		switch (e.key.toLowerCase()) {
			case 'r':
				refreshPreview();
				break;
			case 'c':
				if (!e.metaKey && !e.ctrlKey) {
					copyArtifactLink();
				}
				break;
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
	<title>Canvas - UI Viewer</title>
</svelte:head>

<div class="canvas-container">
	<header class="header">
		<div class="header-left">
			<div class="logo">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
					<polyline points="2 17 12 22 22 17"></polyline>
					<polyline points="2 12 12 17 22 12"></polyline>
				</svg>
				<span>Canvas</span>
			</div>
			
			<div class="status" class:connected={status === 'connected'} class:disconnected={status === 'disconnected'}>
				<span class="status-dot"></span>
				<span class="status-text">{status}</span>
			</div>
		</div>
		
		<div class="header-center">
			{#if currentArtifact}
				<button class="icon-btn" onclick={refreshPreview} title="Refresh (R)">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 2v6h-6"/>
						<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
						<path d="M3 22v-6h6"/>
						<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
					</svg>
				</button>
				<button class="icon-btn" onclick={copyArtifactLink} title="Copy link (C)">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
					</svg>
				</button>
			{/if}
		</div>
		
		<div class="header-right">
			<span class="meta">Builds: {buildCount}</span>
			<span class="meta">Updated: {formatTime(lastUpdate)}</span>
		</div>
	</header>
	
	<main class="viewport">
		{#if currentArtifact && previewUrl}
			{#key iframeKey}
				<iframe 
					src={previewUrl}
					title="Component Preview"
					class="preview-iframe"
				></iframe>
			{/key}
		{:else}
			<div class="empty-state">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
					<polyline points="2 17 12 22 22 17"></polyline>
					<polyline points="2 12 12 17 22 12"></polyline>
				</svg>
				<h2>No artifact loaded</h2>
				<p>Create a V2 artifact or load one via URL</p>
				<code>?artifact=art-xxx-yyyy</code>
			</div>
		{/if}
	</main>
	
	<footer class="footer">
		<span class="hint">AI-native canvas</span>
		<span class="shortcuts">
			<kbd>R</kbd> refresh
			<kbd>C</kbd> copy link
		</span>
	</footer>
</div>

<style>
	.canvas-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #0a0a0a;
		color: #fff;
		font-family: system-ui, -apple-system, sans-serif;
	}
	
	/* Header */
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		background: #000;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}
	
	.header-left,
	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.header-center {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}
	
	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.logo svg {
		color: #5082b9;
	}
	
	.status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}
	
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.3);
	}
	
	.status.connected .status-dot {
		background: #44aa44;
		box-shadow: 0 0 8px #44aa44;
	}
	
	.status.disconnected .status-dot {
		background: #d44d4d;
	}
	
	
	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		transition: all 0.15s ease;
	}
	
	.icon-btn:hover {
		background: rgba(99, 102, 241, 0.2);
		border-color: rgba(99, 102, 241, 0.3);
		color: #a5b4fc;
	}
	
	.meta {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		font-family: 'JetBrains Mono', monospace;
	}
	
	/* Viewport - pure black canvas */
	.viewport {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #000;
		overflow: hidden;
	}
	
	.preview-iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: transparent;
	}
	
	.empty-state {
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
	}
	
	.empty-state svg {
		color: rgba(255, 255, 255, 0.2);
		margin-bottom: 1rem;
	}
	
	.empty-state h2 {
		font-size: 1.25rem;
		font-weight: 500;
		margin: 0 0 0.5rem;
		color: rgba(255, 255, 255, 0.7);
	}
	
	.empty-state p {
		font-size: 0.875rem;
		margin: 0 0 1rem;
	}
	
	.empty-state code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}
	
	/* Footer */
	.footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1.5rem;
		background: #000;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}
	
	.hint {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.35);
	}
	
	.shortcuts {
		display: flex;
		gap: 1rem;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.3);
	}
	
	.shortcuts kbd {
		display: inline-block;
		padding: 0.125rem 0.375rem;
		margin-right: 0.25rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
	}
</style>
