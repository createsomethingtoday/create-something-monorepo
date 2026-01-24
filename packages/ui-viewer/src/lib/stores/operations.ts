/**
 * Operations store - receives and processes UI diff operations
 */

import { writable, derived, get } from 'svelte/store';
import { connection } from './connection';

// Types matching ui-diff output
export interface NodeData {
	id: string;
	type: 'element' | 'text' | 'component' | 'fragment' | 'root';
	tag?: string;
	text?: string;
	attrs?: Record<string, string>;
	children?: NodeData[];
}

export interface PropChange {
	prop: string;
	from?: string;
	to: string;
}

export type Operation = 
	| { type: 'insert'; parent: string; node: NodeData; index: number; animate?: string }
	| { type: 'update'; target: string; changes: PropChange[] }
	| { type: 'delete'; target: string }
	| { type: 'move'; target: string; new_parent: string; index: number };

export interface FileChange {
	type: 'change';
	path: string;
	operations: Operation[];
	timestamp: number;
}

interface OperationsState {
	// Current component tree
	tree: NodeData;
	// Recently changed node IDs (for highlighting)
	recentChanges: Set<string>;
	// Operation history for debugging
	history: FileChange[];
	// Currently selected node
	selectedId: string | null;
}

const emptyTree: NodeData = {
	id: 'root',
	type: 'root',
	children: [],
};

const initialState: OperationsState = {
	tree: emptyTree,
	recentChanges: new Set(),
	history: [],
	selectedId: null,
};

function createOperationsStore() {
	const { subscribe, set, update } = writable<OperationsState>(initialState);
	
	// Track animation timeouts
	const animationTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
	
	// Clear a node from recent changes after animation completes
	function clearRecentChange(id: string) {
		if (animationTimeouts.has(id)) {
			clearTimeout(animationTimeouts.get(id)!);
		}
		
		const timeout = setTimeout(() => {
			update(s => {
				const newChanges = new Set(s.recentChanges);
				newChanges.delete(id);
				return { ...s, recentChanges: newChanges };
			});
			animationTimeouts.delete(id);
		}, 600); // Match animation duration
		
		animationTimeouts.set(id, timeout);
	}
	
	// Apply a single operation to the tree
	function applyOperation(tree: NodeData, op: Operation): NodeData {
		switch (op.type) {
			case 'insert':
				return insertNode(tree, op.parent, op.node, op.index);
			case 'update':
				return updateNode(tree, op.target, op.changes);
			case 'delete':
				return deleteNode(tree, op.target);
			case 'move':
				return moveNode(tree, op.target, op.new_parent, op.index);
			default:
				return tree;
		}
	}
	
	// Process incoming file change
	function processChange(change: FileChange) {
		update(s => {
			let newTree = s.tree;
			const newChanges = new Set(s.recentChanges);
			
			for (const op of change.operations) {
				newTree = applyOperation(newTree, op);
				
				// Track changed nodes for animation
				if (op.type === 'insert') {
					newChanges.add(op.node.id);
					clearRecentChange(op.node.id);
				} else if (op.type === 'update') {
					newChanges.add(op.target);
					clearRecentChange(op.target);
				}
			}
			
			return {
				...s,
				tree: newTree,
				recentChanges: newChanges,
				history: [...s.history.slice(-99), change], // Keep last 100
			};
		});
	}
	
	// Select a node
	function selectNode(id: string | null) {
		update(s => ({ ...s, selectedId: id }));
	}
	
	// Reset tree
	function reset() {
		set(initialState);
	}
	
	// Set up connection message handler
	connection.setMessageHandler((data: unknown) => {
		const message = data as { type: string };
		if (message.type === 'change') {
			processChange(data as FileChange);
		} else if (message.type === 'reset') {
			reset();
		}
	});
	
	// Simulate a change client-side (for learning mode - no bridge needed)
	async function simulateLocal(before: string, after: string, path: string = 'lesson.svelte') {
		// Dynamic import to avoid SSR issues
		const { simulateClientSide } = await import('../client-diff');
		const { operations: ops, tree: newTree } = simulateClientSide(before, after);
		
		if (ops.length > 0) {
			processChange({
				type: 'change',
				path,
				operations: ops,
				timestamp: Date.now(),
			});
		}
		
		return { operations: ops.length };
	}
	
	// Set the entire tree directly (for hydrating from content)
	function setTree(tree: NodeData) {
		update(s => ({ ...s, tree, recentChanges: new Set() }));
	}
	
	// Handle postMessage from parent (for iframe embedding)
	if (typeof window !== 'undefined') {
		window.addEventListener('message', async (event) => {
			const data = event.data;
			if (!data || typeof data !== 'object') return;
			
			// Forward change messages from parent
			if (data.type === 'change') {
				processChange(data as FileChange);
			} else if (data.type === 'reset') {
				reset();
			} else if (data.type === 'select') {
				selectNode(data.id || null);
			} else if (data.type === 'simulate') {
				// Client-side simulation - no bridge needed!
				const result = await simulateLocal(data.before || '', data.after || '', data.path);
				// Notify parent of completion
				if (window.parent !== window) {
					window.parent.postMessage({ 
						source: 'ui-viewer', 
						type: 'simulated',
						operations: result.operations,
					}, '*');
				}
			} else if (data.type === 'setTree') {
				// Direct tree hydration
				if (data.tree) {
					setTree(data.tree);
				}
			}
		});
	}
	
	return {
		subscribe,
		processChange,
		selectNode,
		reset,
		simulateLocal,
		setTree,
	};
}

// Tree manipulation helpers
function insertNode(tree: NodeData, parentId: string, node: NodeData, index: number): NodeData {
	if (tree.id === parentId) {
		const children = [...(tree.children || [])];
		children.splice(index, 0, node);
		return { ...tree, children };
	}
	
	if (tree.children) {
		return {
			...tree,
			children: tree.children.map(child => insertNode(child, parentId, node, index)),
		};
	}
	
	return tree;
}

function updateNode(tree: NodeData, targetId: string, changes: PropChange[]): NodeData {
	if (tree.id === targetId) {
		const updated = { ...tree };
		for (const change of changes) {
			if (change.prop === 'text') {
				updated.text = change.to;
			} else {
				updated.attrs = { ...(updated.attrs || {}), [change.prop]: change.to };
			}
		}
		return updated;
	}
	
	if (tree.children) {
		return {
			...tree,
			children: tree.children.map(child => updateNode(child, targetId, changes)),
		};
	}
	
	return tree;
}

function deleteNode(tree: NodeData, targetId: string): NodeData {
	if (tree.children) {
		return {
			...tree,
			children: tree.children
				.filter(child => child.id !== targetId)
				.map(child => deleteNode(child, targetId)),
		};
	}
	
	return tree;
}

function moveNode(tree: NodeData, targetId: string, newParentId: string, index: number): NodeData {
	// Find and remove the node
	let movedNode: NodeData | null = null;
	
	function findAndRemove(node: NodeData): NodeData {
		if (node.children) {
			const targetIndex = node.children.findIndex(c => c.id === targetId);
			if (targetIndex !== -1) {
				movedNode = node.children[targetIndex];
				return {
					...node,
					children: node.children.filter(c => c.id !== targetId),
				};
			}
			return {
				...node,
				children: node.children.map(findAndRemove),
			};
		}
		return node;
	}
	
	const treeWithoutNode = findAndRemove(tree);
	
	// Insert at new location
	if (movedNode) {
		return insertNode(treeWithoutNode, newParentId, movedNode, index);
	}
	
	return treeWithoutNode;
}

export const operations = createOperationsStore();

// Derived stores
export const componentTree = derived(operations, $ops => $ops.tree);
export const currentTree = derived(operations, $ops => $ops.tree);
export const selectedNode = derived(operations, $ops => {
	if (!$ops.selectedId) return null;
	
	function find(node: NodeData): NodeData | null {
		if (node.id === $ops.selectedId) return node;
		for (const child of node.children || []) {
			const found = find(child);
			if (found) return found;
		}
		return null;
	}
	
	return find($ops.tree);
});
export const recentChanges = derived(operations, $ops => $ops.recentChanges);
export const operationHistory = derived(operations, $ops => $ops.history);
