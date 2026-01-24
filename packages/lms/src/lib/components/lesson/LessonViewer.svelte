<script lang="ts">
	/**
	 * LessonViewer - Embedded UI Viewer for interactive lessons
	 * 
	 * Wraps the UI Viewer in an iframe with controls for simulating changes.
	 * Used to provide visual feedback during terminal/code lessons.
	 * 
	 * TWO MODES:
	 * 1. Client-side (default) - Diff runs in browser, no server needed. 
	 *    Scales to thousands of concurrent learners.
	 * 2. Bridge mode - Uses shared bridge server. For development/file watching.
	 * 
	 * @example
	 * ```svelte
	 * <LessonViewer
	 *   simulations={[
	 *     { 
	 *       label: 'Add Hero Section',
	 *       before: '<div>Hello</div>',
	 *       after: '<div class="hero">Hello World</div>'
	 *     }
	 *   ]}
	 * />
	 * ```
	 */
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	
	interface Simulation {
		label: string;
		before: string;
		after: string;
		path?: string;
	}
	
	interface Props {
		/** List of simulations to show as buttons */
		simulations?: Simulation[];
		/** Auto-run first simulation on load */
		autoRun?: boolean;
		/** Height of the viewer */
		height?: string;
		/** Show controls */
		showControls?: boolean;
		/** Viewer URL (defaults to production) */
		viewerUrl?: string;
		/** Use bridge server instead of client-side (for development) */
		useBridge?: boolean;
		/** Bridge server URL (only if useBridge=true) */
		bridgeUrl?: string;
	}
	
	let {
		simulations = [],
		autoRun = false,
		height = '400px',
		showControls = true,
		viewerUrl = 'https://ui-viewer.createsomething.space',
		useBridge = false,
		bridgeUrl = 'http://localhost:4201',
	}: Props = $props();
	
	let iframe: HTMLIFrameElement;
	let isReady = $state(false);
	let currentSimulation = $state(-1);
	let isRunning = $state(false);
	
	// Build embed URL - no bridge connection needed for client-side mode
	const embedUrl = $derived(() => {
		if (useBridge) {
			const wsUrl = bridgeUrl.replace('http://', 'ws://').replace('https://', 'wss://');
			return `${viewerUrl}/embed?ws=${encodeURIComponent(wsUrl)}`;
		}
		// Client-side mode - no WebSocket needed
		return `${viewerUrl}/embed?mode=client`;
	});
	
	// Listen for messages from viewer
	function handleMessage(event: MessageEvent) {
		const data = event.data;
		if (!data || data.source !== 'ui-viewer') return;
		
		if (data.type === 'ready') {
			isReady = true;
			if (autoRun && simulations.length > 0) {
				runSimulation(0);
			}
		} else if (data.type === 'simulated') {
			// Client-side simulation completed
			isRunning = false;
		}
	}
	
	// Run a simulation - client-side by default
	async function runSimulation(index: number) {
		if (index < 0 || index >= simulations.length) return;
		if (!iframe?.contentWindow) return;
		
		const sim = simulations[index];
		isRunning = true;
		currentSimulation = index;
		
		if (useBridge) {
			// Bridge mode - call server API
			try {
				await fetch(`${bridgeUrl}/api/simulate`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						path: sim.path || 'lesson.svelte',
						before: sim.before,
						after: sim.after,
					}),
				});
			} catch (e) {
				console.error('Simulation failed:', e);
			} finally {
				isRunning = false;
			}
		} else {
			// Client-side mode - send via postMessage, diff runs in iframe
			iframe.contentWindow.postMessage({
				type: 'simulate',
				path: sim.path || 'lesson.svelte',
				before: sim.before,
				after: sim.after,
			}, '*');
			// isRunning will be set to false when we receive 'simulated' message
		}
	}
	
	// Reset viewer
	function reset() {
		currentSimulation = -1;
		
		if (iframe?.contentWindow) {
			iframe.contentWindow.postMessage({ type: 'reset' }, '*');
		}
		
		if (useBridge) {
			fetch(`${bridgeUrl}/api/reset`, { method: 'POST' }).catch(console.error);
		}
	}
	
	// Run all simulations in sequence
	async function runAll() {
		for (let i = 0; i < simulations.length; i++) {
			await runSimulation(i);
			// Wait for animation + small buffer
			await new Promise(r => setTimeout(r, 800));
		}
	}
	
	onMount(() => {
		if (browser) {
			window.addEventListener('message', handleMessage);
		}
	});
	
	onDestroy(() => {
		if (browser) {
			window.removeEventListener('message', handleMessage);
		}
	});
</script>

<div class="lesson-viewer">
	<div class="viewer-container" style="height: {height}">
		<iframe
			bind:this={iframe}
			src={embedUrl()}
			title="UI Viewer"
			class="viewer-iframe"
			allow="clipboard-write"
		></iframe>
		
		{#if !isReady}
			<div class="loading-overlay">
				<div class="loading-spinner"></div>
				<p>Loading viewer...</p>
			</div>
		{/if}
	</div>
	
	{#if showControls && simulations.length > 0}
		<div class="controls">
			<div class="simulation-buttons">
				{#each simulations as sim, i}
					<button
						class="sim-button"
						class:active={currentSimulation === i}
						onclick={() => runSimulation(i)}
						disabled={isRunning}
					>
						<span class="sim-number">{i + 1}</span>
						<span class="sim-label">{sim.label}</span>
					</button>
				{/each}
			</div>
			
			<div class="control-buttons">
				{#if simulations.length > 1}
					<button class="control-button" onclick={runAll} disabled={isRunning}>
						Run All
					</button>
				{/if}
				<button class="control-button secondary" onclick={reset} disabled={isRunning}>
					Reset
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.lesson-viewer {
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--color-bg-elevated);
	}
	
	.viewer-container {
		position: relative;
		width: 100%;
		background: var(--color-bg-pure);
	}
	
	.viewer-iframe {
		width: 100%;
		height: 100%;
		border: none;
	}
	
	.loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		background: var(--color-bg-pure);
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}
	
	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--color-border-default);
		border-top-color: var(--color-fg-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	.controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		border-top: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
	}
	
	.simulation-buttons {
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}
	
	.sim-button {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-caption);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}
	
	.sim-button:hover:not(:disabled) {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}
	
	.sim-button.active {
		border-color: var(--color-success);
		background: rgba(16, 185, 129, 0.1);
		color: var(--color-success);
	}
	
	.sim-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.sim-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		background: var(--color-border-default);
		border-radius: 50%;
		font-size: 10px;
		font-weight: var(--font-semibold);
	}
	
	.sim-button.active .sim-number {
		background: var(--color-success);
		color: var(--color-bg-pure);
	}
	
	.sim-label {
		font-weight: var(--font-medium);
	}
	
	.control-buttons {
		display: flex;
		gap: var(--space-xs);
	}
	
	.control-button {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}
	
	.control-button:hover:not(:disabled) {
		opacity: 0.9;
	}
	
	.control-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.control-button.secondary {
		background: var(--color-bg-elevated);
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
	}
	
	.control-button.secondary:hover:not(:disabled) {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}
</style>
