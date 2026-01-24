<script lang="ts">
	import Canvas from '$lib/components/Canvas.svelte';
	import Inspector from '$lib/components/Inspector.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import Library from '$lib/components/Library.svelte';
	import { connectionStatus } from '$lib/stores/connection';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	
	// Get preview URL from query params: ?preview=http://localhost:5174/preview/TextRevelation
	let previewUrl = $derived($page.url.searchParams.get('preview') || '');
	let showPreview = $derived(!!previewUrl);
	let viewMode = $state<'split' | 'preview' | 'structure'>('split');
	
	// Refresh iframe when triggered
	let iframeKey = $state(0);
	function refreshPreview() {
		iframeKey++;
	}
</script>

<svelte:head>
	<title>UI Viewer - CREATE SOMETHING</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</svelte:head>

<div class="viewer">
	<header class="header glass">
		<div class="logo">
			<svg class="logo-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
				<polyline points="2 17 12 22 22 17"></polyline>
				<polyline points="2 12 12 17 22 12"></polyline>
			</svg>
			<span class="logo-text">UI Viewer</span>
		</div>
		
		{#if showPreview}
			<div class="view-toggle">
				<button 
					class:active={viewMode === 'split'} 
					onclick={() => viewMode = 'split'}
					title="Split view"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="18" height="18" rx="2"/>
						<line x1="12" y1="3" x2="12" y2="21"/>
					</svg>
				</button>
				<button 
					class:active={viewMode === 'preview'} 
					onclick={() => viewMode = 'preview'}
					title="Preview only"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="18" height="18" rx="2"/>
					</svg>
				</button>
				<button 
					class:active={viewMode === 'structure'} 
					onclick={() => viewMode = 'structure'}
					title="Structure only"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="8" y1="6" x2="21" y2="6"/>
						<line x1="8" y1="12" x2="21" y2="12"/>
						<line x1="8" y1="18" x2="21" y2="18"/>
						<circle cx="4" cy="6" r="1"/>
						<circle cx="4" cy="12" r="1"/>
						<circle cx="4" cy="18" r="1"/>
					</svg>
				</button>
				<button onclick={refreshPreview} title="Refresh preview">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 2v6h-6"/>
						<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
						<path d="M3 22v-6h6"/>
						<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
					</svg>
				</button>
			</div>
		{/if}
		
		<div class="tagline">CREATE SOMETHING</div>
	</header>
	
	<main class="main" class:split={showPreview && viewMode === 'split'}>
		{#if showPreview && (viewMode === 'preview' || viewMode === 'split')}
			<div class="preview-pane" class:full={viewMode === 'preview'}>
				<div class="preview-header">
					<span class="preview-label">Live Preview</span>
					<span class="preview-url">{previewUrl}</span>
				</div>
				{#key iframeKey}
					<iframe 
						src={previewUrl} 
						title="Component Preview"
						class="preview-iframe"
					></iframe>
				{/key}
			</div>
		{/if}
		
		{#if viewMode === 'structure' || viewMode === 'split' || !showPreview}
			<div class="structure-pane" class:full={viewMode === 'structure' || !showPreview}>
				<Canvas />
				<Inspector />
				<Library />
			</div>
		{/if}
	</main>
	
	<StatusBar />
</div>

<style>
	.viewer {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}
	
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}
	
	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}
	
	.logo :global(.logo-icon) {
		color: var(--color-info);
	}
	
	.logo-text {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}
	
	.tagline {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}
	
	.view-toggle {
		display: flex;
		gap: 0.25rem;
		background: var(--color-bg-elevated);
		padding: 0.25rem;
		border-radius: var(--radius-sm);
	}
	
	.view-toggle button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: transparent;
		border: none;
		border-radius: var(--radius-xs);
		color: var(--color-fg-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}
	
	.view-toggle button:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}
	
	.view-toggle button.active {
		background: var(--color-active);
		color: var(--color-fg-primary);
	}
	
	.main {
		display: flex;
		flex: 1;
		overflow: hidden;
		position: relative;
	}
	
	.main.split {
		gap: 1px;
		background: var(--color-border-default);
	}
	
	.preview-pane {
		display: flex;
		flex-direction: column;
		flex: 1;
		background: var(--color-bg-pure);
		overflow: hidden;
	}
	
	.preview-pane.full {
		flex: 1;
	}
	
	.preview-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 1rem;
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-border-default);
	}
	
	.preview-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
	}
	
	.preview-url {
		font-size: 0.75rem;
		font-family: var(--font-mono);
		color: var(--color-fg-tertiary);
	}
	
	.preview-iframe {
		flex: 1;
		width: 100%;
		border: none;
		background: #fff;
	}
	
	.structure-pane {
		display: flex;
		flex: 1;
		overflow: hidden;
		position: relative;
		background: var(--color-bg-pure);
	}
	
	.structure-pane.full {
		flex: 1;
	}
</style>
