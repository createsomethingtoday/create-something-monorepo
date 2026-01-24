/**
 * UI Viewer Embed Utilities
 * 
 * Helper functions for embedding and controlling UI Viewer in external pages (like LMS).
 * 
 * @example
 * ```typescript
 * import { createEmbedController } from '@create-something/ui-viewer/embed';
 * 
 * const viewer = createEmbedController({
 *   iframe: document.getElementById('viewer-frame'),
 *   bridgeUrl: 'http://localhost:4201',
 * });
 * 
 * // Simulate a change
 * await viewer.simulate({
 *   path: 'example.svelte',
 *   before: '<div>Hello</div>',
 *   after: '<div>Hello World</div>',
 * });
 * 
 * // Run a sequence
 * await viewer.sequence({
 *   path: 'example.svelte',
 *   steps: [
 *     { before: '', after: '<div>Step 1</div>' },
 *     { before: '<div>Step 1</div>', after: '<div>Step 2</div>' },
 *   ],
 * });
 * 
 * // Reset viewer
 * await viewer.reset();
 * ```
 */

export interface EmbedControllerOptions {
	/** The iframe element containing the viewer */
	iframe?: HTMLIFrameElement;
	/** Bridge server URL for simulation API */
	bridgeUrl?: string;
	/** Callback when viewer is ready */
	onReady?: () => void;
	/** Callback when node is selected */
	onSelect?: (node: unknown) => void;
}

export interface SimulateOptions {
	path: string;
	before: string;
	after: string;
	syntax?: string;
}

export interface SequenceOptions {
	path: string;
	steps: Array<{
		before: string;
		after: string;
		delay?: number;
	}>;
	syntax?: string;
}

export interface EmbedController {
	/** Simulate a single change */
	simulate: (options: SimulateOptions) => Promise<{ success: boolean; operations: number }>;
	/** Run a sequence of changes */
	sequence: (options: SequenceOptions) => Promise<{ success: boolean; steps: number }>;
	/** Reset the viewer to empty state */
	reset: () => Promise<{ success: boolean }>;
	/** Send a message directly to the iframe */
	postMessage: (data: unknown) => void;
	/** Clean up event listeners */
	destroy: () => void;
}

/**
 * Create a controller for an embedded UI Viewer
 */
export function createEmbedController(options: EmbedControllerOptions = {}): EmbedController {
	const { iframe, bridgeUrl = 'http://localhost:4201', onReady, onSelect } = options;
	
	// Listen for messages from iframe
	const messageHandler = (event: MessageEvent) => {
		const data = event.data;
		if (!data || data.source !== 'ui-viewer') return;
		
		if (data.type === 'ready' && onReady) {
			onReady();
		} else if (data.type === 'select' && onSelect) {
			onSelect(data.node);
		}
	};
	
	if (typeof window !== 'undefined') {
		window.addEventListener('message', messageHandler);
	}
	
	return {
		async simulate(opts: SimulateOptions) {
			const response = await fetch(`${bridgeUrl}/api/simulate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(opts),
			});
			return response.json();
		},
		
		async sequence(opts: SequenceOptions) {
			const response = await fetch(`${bridgeUrl}/api/sequence`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(opts),
			});
			return response.json();
		},
		
		async reset() {
			// Send via both API and postMessage for redundancy
			if (iframe?.contentWindow) {
				iframe.contentWindow.postMessage({ type: 'reset' }, '*');
			}
			
			const response = await fetch(`${bridgeUrl}/api/reset`, {
				method: 'POST',
			});
			return response.json();
		},
		
		postMessage(data: unknown) {
			if (iframe?.contentWindow) {
				iframe.contentWindow.postMessage(data, '*');
			}
		},
		
		destroy() {
			if (typeof window !== 'undefined') {
				window.removeEventListener('message', messageHandler);
			}
		},
	};
}

/**
 * Generate the embed URL for an iframe
 */
export function getEmbedUrl(options: {
	viewerUrl?: string;
	bridgeWsUrl?: string;
} = {}): string {
	const { 
		viewerUrl = 'http://localhost:4200', 
		bridgeWsUrl = 'ws://localhost:4201' 
	} = options;
	
	const url = new URL('/embed', viewerUrl);
	url.searchParams.set('ws', bridgeWsUrl);
	return url.toString();
}
