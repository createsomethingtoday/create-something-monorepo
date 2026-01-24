/**
 * WebSocket connection store for ui-bridge
 */

import { writable, derived, get } from 'svelte/store';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface ConnectionState {
	status: ConnectionStatus;
	url: string;
	watching: string | null;
	extensions: string[];
	error: string | null;
	reconnectAttempts: number;
}

// Get WebSocket URL from URL params or environment
function getDefaultUrl(): string {
	if (typeof window !== 'undefined') {
		const params = new URLSearchParams(window.location.search);
		const wsUrl = params.get('ws') || params.get('bridge');
		if (wsUrl) return wsUrl;
	}
	return 'ws://localhost:4201';
}

const initialState: ConnectionState = {
	status: 'disconnected',
	url: getDefaultUrl(),
	watching: null,
	extensions: [],
	error: null,
	reconnectAttempts: 0,
};

function createConnectionStore() {
	const { subscribe, set, update } = writable<ConnectionState>(initialState);
	
	let socket: WebSocket | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	
	// Message handlers (set by operations store)
	let messageHandler: ((data: unknown) => void) | null = null;
	
	function connect(url?: string) {
		const state = get({ subscribe });
		const wsUrl = url || state.url;
		
		// Clean up existing connection
		if (socket) {
			socket.close();
		}
		
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
		}
		
		update(s => ({ ...s, status: 'connecting', url: wsUrl, error: null }));
		
		try {
			socket = new WebSocket(wsUrl);
			
			socket.onopen = () => {
				update(s => ({ 
					...s, 
					status: 'connected', 
					error: null,
					reconnectAttempts: 0 
				}));
				console.log('Connected to ui-bridge');
			};
			
			socket.onclose = () => {
				update(s => ({ ...s, status: 'disconnected' }));
				console.log('Disconnected from ui-bridge');
				
				// Auto-reconnect with exponential backoff
				const state = get({ subscribe });
				if (state.reconnectAttempts < 10) {
					const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000);
					console.log(`Reconnecting in ${delay}ms...`);
					
					update(s => ({ ...s, reconnectAttempts: s.reconnectAttempts + 1 }));
					reconnectTimeout = setTimeout(() => connect(wsUrl), delay);
				}
			};
			
			socket.onerror = (event) => {
				update(s => ({ ...s, error: 'Connection error' }));
				console.error('WebSocket error:', event);
			};
			
			socket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					
					// Handle connection metadata
					if (data.type === 'connected') {
						update(s => ({
							...s,
							watching: data.watching,
							extensions: data.extensions,
						}));
					}
					
					// Forward to message handler
					if (messageHandler) {
						messageHandler(data);
					}
				} catch (e) {
					console.error('Failed to parse message:', e);
				}
			};
		} catch (e) {
			update(s => ({ ...s, status: 'disconnected', error: String(e) }));
		}
	}
	
	function disconnect() {
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
		}
		if (socket) {
			socket.close();
			socket = null;
		}
		set(initialState);
	}
	
	function send(data: unknown) {
		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(data));
		}
	}
	
	function subscribe_patterns(patterns: string[]) {
		send({ type: 'subscribe', patterns });
	}
	
	function setMessageHandler(handler: (data: unknown) => void) {
		messageHandler = handler;
	}
	
	// Update URL (for programmatic changes)
	function setUrl(url: string) {
		update(s => ({ ...s, url }));
	}
	
	return {
		subscribe,
		connect,
		disconnect,
		send,
		subscribe_patterns,
		setMessageHandler,
		setUrl,
	};
}

export const connection = createConnectionStore();

// Derived stores for convenience
export const isConnected = derived(connection, $c => $c.status === 'connected');
export const connectionStatus = derived(connection, $c => $c.status);
