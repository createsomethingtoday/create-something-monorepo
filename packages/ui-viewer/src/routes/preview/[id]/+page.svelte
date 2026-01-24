<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import * as Icons from 'lucide-svelte';
	
	// Schema types (mirrored from ui-bridge)
	interface ArtifactV2 {
		id: string;
		name: string;
		version: number;
		type: string;
		content: {
			icon?: string | { name: string; library?: string };
			title?: string;
			subtitle?: string;
			body?: string;
			badge?: string;
			cta?: { label: string; href?: string };
			items?: string[];
		};
		style: {
			theme: string;
			accent: string;
			radius: string;
			padding: string;
			animation: string;
			textSize?: string;
		};
	}
	
	// State
	let artifact = $state<ArtifactV2 | null>(null);
	let error = $state<string | null>(null);
	let ws: WebSocket | null = null;
	
	// Get artifact ID from URL
	let artifactId = $derived($page.params.id);
	let bridgeUrl = $derived($page.url.searchParams.get('bridge') || 'http://localhost:4201');
	let wsUrl = $derived(bridgeUrl.replace('http://', 'ws://').replace('https://', 'wss://'));
	
	onMount(() => {
		loadArtifact();
		connectWebSocket();
		
		return () => {
			if (ws) ws.close();
		};
	});
	
	async function loadArtifact() {
		try {
			const res = await fetch(`${bridgeUrl}/api/v2/artifacts/${artifactId}`);
			if (!res.ok) {
				error = `Artifact not found: ${artifactId}`;
				return;
			}
			artifact = await res.json();
		} catch (e) {
			error = `Failed to load artifact: ${e}`;
		}
	}
	
	function connectWebSocket() {
		ws = new WebSocket(wsUrl);
		
		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				// Update if this artifact was changed
				if (data.type === 'render' && data.schema?.id === artifactId) {
					artifact = data.schema;
				}
			} catch (e) {
				// Ignore parse errors
			}
		};
		
		ws.onclose = () => {
			setTimeout(connectWebSocket, 2000);
		};
	}
	
	// Token maps
	const radiusMap: Record<string, string> = {
		'none': '0', 'sm': '0.5rem', 'md': '0.75rem', 'lg': '1rem',
		'xl': '1.5rem', '2xl': '2rem', '3xl': '2.5rem', 'full': '9999px'
	};
	
	const paddingMap: Record<string, string> = {
		'none': '0', 'sm': '1rem', 'md': '1.5rem', 'lg': '2rem', 'xl': '2.75rem', '2xl': '3.5rem'
	};
	
	const textSizeMap: Record<string, { title: string; body: string }> = {
		'sm': { title: '1.25rem', body: '0.875rem' },
		'base': { title: '1.75rem', body: '0.9375rem' },
		'lg': { title: '2rem', body: '1rem' },
		'xl': { title: '2.5rem', body: '1.125rem' },
	};
	
	// Get Lucide icon component by name
	function getIconComponent(iconDef: string | { name: string; library?: string } | undefined) {
		if (!iconDef) return null;
		
		// If it's a string (emoji), return null - we'll render it differently
		if (typeof iconDef === 'string') return null;
		
		// Get icon name in PascalCase
		const name = iconDef.name
			.split('-')
			.map(s => s.charAt(0).toUpperCase() + s.slice(1))
			.join('');
		
		return (Icons as Record<string, any>)[name] || null;
	}
	
	// Check if icon is emoji
	function isEmoji(icon: string | { name: string } | undefined): boolean {
		return typeof icon === 'string';
	}
	
	// Reactive computations
	let styles = $derived(artifact ? {
		radius: radiusMap[artifact.style.radius] || '1.5rem',
		padding: paddingMap[artifact.style.padding] || '2.75rem',
		textSize: textSizeMap[artifact.style.textSize || 'base'],
		accent: artifact.style.accent || '#6366f1',
		accentRgb: hexToRgb(artifact.style.accent || '#6366f1'),
	} : null);
	
	let IconComponent = $derived(artifact ? getIconComponent(artifact.content.icon) : null);
	
	function hexToRgb(hex: string): string {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `${r}, ${g}, ${b}`;
	}
</script>

<svelte:head>
	<title>{artifact?.name || 'Preview'} - UI Viewer</title>
</svelte:head>

<div class="preview-container">
	{#if error}
		<div class="error">
			<p>{error}</p>
		</div>
	{:else if artifact && styles}
		<div 
			class="card {artifact.style.theme} {artifact.style.animation}"
			style="
				--radius: {styles.radius};
				--padding: {styles.padding};
				--accent: {styles.accent};
				--accent-rgb: {styles.accentRgb};
				--title-size: {styles.textSize.title};
				--body-size: {styles.textSize.body};
			"
		>
			{#if artifact.content.icon}
				<div class="icon">
					{#if isEmoji(artifact.content.icon)}
						<span class="emoji">{artifact.content.icon}</span>
					{:else if IconComponent}
						<IconComponent size={28} strokeWidth={2} />
					{/if}
				</div>
			{/if}
			
			{#if artifact.content.title}
				<h2 class="title">{artifact.content.title}</h2>
			{/if}
			
			{#if artifact.content.subtitle}
				<p class="subtitle">{artifact.content.subtitle}</p>
			{/if}
			
			{#if artifact.content.body}
				<p class="body">{artifact.content.body}</p>
			{/if}
			
			{#if artifact.content.items?.length}
				<ul class="items">
					{#each artifact.content.items as item}
						<li>{item}</li>
					{/each}
				</ul>
			{/if}
			
			{#if artifact.content.badge}
				<span class="badge">{artifact.content.badge}</span>
			{/if}
			
			{#if artifact.content.cta}
				{#if artifact.content.cta.href}
					<a href={artifact.content.cta.href} class="cta">{artifact.content.cta.label}</a>
				{:else}
					<button class="cta">{artifact.content.cta.label}</button>
				{/if}
			{/if}
		</div>
		
	{:else}
		<div class="loading">Loading...</div>
	{/if}
</div>

<style>
	.preview-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: #000;
	}
	
	.error {
		color: #f87171;
		text-align: center;
	}
	
	.loading {
		color: rgba(255, 255, 255, 0.5);
	}
	
	/* Card base */
	.card {
		border-radius: var(--radius);
		padding: var(--padding);
		max-width: 440px;
		font-family: system-ui, -apple-system, sans-serif;
		position: relative;
	}
	
	/* Themes */
	.card.glass-dark {
		background: rgba(15, 23, 42, 0.85);
		backdrop-filter: blur(24px);
		border: 1px solid rgba(var(--accent-rgb), 0.25);
		color: white;
	}
	
	.card.glass-light {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(24px);
		border: 1px solid rgba(0, 0, 0, 0.1);
		color: #1a1a2e;
	}
	
	.card.solid-dark {
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		border: 1px solid rgba(var(--accent-rgb), 0.25);
		color: white;
	}
	
	.card.solid-light {
		background: white;
		border: 1px solid rgba(0, 0, 0, 0.1);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
		color: #1a1a2e;
	}
	
	/* Gradient border overlay */
	.card::before {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: var(--radius);
		padding: 1px;
		background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.5), transparent 40%, transparent 60%, rgba(var(--accent-rgb), 0.3));
		-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		pointer-events: none;
	}
	
	/* Animations */
	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}
	
	@keyframes pulse {
		0%, 100% { box-shadow: 0 8px 24px rgba(var(--accent-rgb), 0.25); }
		50% { box-shadow: 0 8px 40px rgba(var(--accent-rgb), 0.45); }
	}
	
	@keyframes glow {
		0%, 100% { border-color: rgba(var(--accent-rgb), 0.25); }
		50% { border-color: rgba(var(--accent-rgb), 0.6); }
	}
	
	.card.float { animation: float 6s ease-in-out infinite; }
	.card.pulse { animation: pulse 3s ease-in-out infinite; }
	.card.glow { animation: glow 4s ease-in-out infinite; }
	
	/* Icon */
	.icon {
		width: 52px;
		height: 52px;
		background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent), #a855f7 50%));
		border-radius: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.5rem;
		box-shadow: 0 8px 24px rgba(var(--accent-rgb), 0.35);
		color: white;
	}
	
	.icon .emoji {
		font-size: 1.625rem;
	}
	
	/* Typography */
	.title {
		margin: 0 0 0.75rem;
		font-size: var(--title-size);
		font-weight: 700;
		letter-spacing: -0.025em;
		background: linear-gradient(135deg, currentColor 0%, var(--accent) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	
	.subtitle {
		margin: 0 0 1rem;
		font-size: calc(var(--body-size) * 1.1);
		opacity: 0.7;
		font-weight: 500;
	}
	
	.body {
		margin: 0;
		opacity: 0.6;
		line-height: 1.8;
		font-size: var(--body-size);
	}
	
	/* Items list */
	.items {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
	}
	
	.items li {
		padding: 0.5rem 0;
		padding-left: 1.5rem;
		position: relative;
		opacity: 0.7;
	}
	
	.items li::before {
		content: "→";
		position: absolute;
		left: 0;
		color: var(--accent);
	}
	
	/* Badge */
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(var(--accent-rgb), 0.12);
		border: 1px solid rgba(var(--accent-rgb), 0.2);
		color: var(--accent);
		padding: 0.625rem 1.125rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		margin-top: 1.5rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	
	.badge::before {
		content: "";
		width: 6px;
		height: 6px;
		background: var(--accent);
		border-radius: 50%;
		box-shadow: 0 0 8px var(--accent);
	}
	
	/* CTA */
	.cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--accent);
		color: white;
		padding: 0.875rem 1.75rem;
		border-radius: 0.75rem;
		font-size: 0.9375rem;
		font-weight: 600;
		margin-top: 1.75rem;
		text-decoration: none;
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;
	}
	
	.cta:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(var(--accent-rgb), 0.4);
	}
</style>
