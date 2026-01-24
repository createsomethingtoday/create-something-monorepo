/**
 * Client-Side Diff Engine
 * 
 * A simplified diff algorithm that runs entirely in the browser.
 * Designed for learning scenarios where we control both before/after content.
 * 
 * For production file watching, use the Rust WASM diff via ui-bridge.
 * For learning at scale (thousands of concurrent learners), use this client-side version.
 */

import type { NodeData, Operation } from './stores/operations';

/**
 * Parse HTML/Svelte into a simple node tree
 */
export function parseHtml(html: string): NodeData {
	if (typeof DOMParser === 'undefined') {
		// SSR fallback
		return { id: 'root', type: 'root', children: [] };
	}
	
	const parser = new DOMParser();
	const doc = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html');
	const root = doc.body.firstElementChild;
	
	if (!root) {
		return { id: 'root', type: 'root', children: [] };
	}
	
	return elementToNode(root, 'root');
}

function elementToNode(element: Element, parentId: string, index: number = 0): NodeData {
	const id = element.id || `${parentId}-${index}`;
	
	// Handle text-only elements
	if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
		const text = element.childNodes[0].textContent?.trim();
		if (text) {
			return {
				id,
				type: 'element',
				tag: element.tagName.toLowerCase(),
				text,
				attrs: getAttributes(element),
				children: [],
			};
		}
	}
	
	const children: NodeData[] = [];
	let childIndex = 0;
	
	for (const child of element.childNodes) {
		if (child.nodeType === Node.ELEMENT_NODE) {
			children.push(elementToNode(child as Element, id, childIndex++));
		} else if (child.nodeType === Node.TEXT_NODE) {
			const text = child.textContent?.trim();
			if (text) {
				children.push({
					id: `${id}-text-${childIndex++}`,
					type: 'text',
					text,
				});
			}
		}
	}
	
	return {
		id,
		type: 'element',
		tag: element.tagName.toLowerCase(),
		attrs: getAttributes(element),
		children,
	};
}

function getAttributes(element: Element): Record<string, string> {
	const attrs: Record<string, string> = {};
	for (const attr of element.attributes) {
		if (attr.name !== 'id') {
			attrs[attr.name] = attr.value;
		}
	}
	return attrs;
}

/**
 * Compute diff operations between two HTML strings
 */
export function computeDiff(before: string, after: string): Operation[] {
	const beforeTree = parseHtml(before);
	const afterTree = parseHtml(after);
	
	return diffTrees(beforeTree, afterTree);
}

function diffTrees(before: NodeData, after: NodeData, parentId: string = 'root'): Operation[] {
	const operations: Operation[] = [];
	
	const beforeChildren = before.children || [];
	const afterChildren = after.children || [];
	
	// Create maps for efficient lookup
	const beforeMap = new Map<string, { node: NodeData; index: number }>();
	const afterMap = new Map<string, { node: NodeData; index: number }>();
	
	beforeChildren.forEach((child, index) => {
		const key = getNodeKey(child, index);
		beforeMap.set(key, { node: child, index });
	});
	
	afterChildren.forEach((child, index) => {
		const key = getNodeKey(child, index);
		afterMap.set(key, { node: child, index });
	});
	
	// Find deletions
	for (const [key, { node }] of beforeMap) {
		if (!afterMap.has(key)) {
			operations.push({
				type: 'delete',
				target: node.id,
			});
		}
	}
	
	// Find insertions and updates
	for (const [key, { node: afterNode, index }] of afterMap) {
		const beforeEntry = beforeMap.get(key);
		
		if (!beforeEntry) {
			// New node - insert
			operations.push({
				type: 'insert',
				parent: parentId,
				node: afterNode,
				index,
				animate: 'pulse',
			});
		} else {
			// Existing node - check for updates
			const beforeNode = beforeEntry.node;
			const changes = getNodeChanges(beforeNode, afterNode);
			
			if (changes.length > 0) {
				operations.push({
					type: 'update',
					target: afterNode.id,
					changes,
				});
			}
			
			// Recurse into children
			const childOps = diffTrees(beforeNode, afterNode, afterNode.id);
			operations.push(...childOps);
		}
	}
	
	return operations;
}

function getNodeKey(node: NodeData, index: number): string {
	// Use tag + class as a stable key, falling back to index
	if (node.type === 'text') {
		return `text-${index}-${node.text?.slice(0, 20)}`;
	}
	const cls = node.attrs?.class || '';
	return `${node.tag}-${cls}-${index}`;
}

function getNodeChanges(before: NodeData, after: NodeData): Array<{ prop: string; from?: string; to: string }> {
	const changes: Array<{ prop: string; from?: string; to: string }> = [];
	
	// Check text changes
	if (before.text !== after.text && after.text) {
		changes.push({ prop: 'text', from: before.text, to: after.text });
	}
	
	// Check attribute changes
	const beforeAttrs = before.attrs || {};
	const afterAttrs = after.attrs || {};
	
	// Check for changed/added attrs
	for (const [key, value] of Object.entries(afterAttrs)) {
		if (beforeAttrs[key] !== value) {
			changes.push({ prop: key, from: beforeAttrs[key], to: value });
		}
	}
	
	// Check for removed attrs
	for (const key of Object.keys(beforeAttrs)) {
		if (!(key in afterAttrs)) {
			changes.push({ prop: key, from: beforeAttrs[key], to: '' });
		}
	}
	
	return changes;
}

/**
 * Process a simulate request entirely client-side
 */
export function simulateClientSide(before: string, after: string): {
	operations: Operation[];
	tree: NodeData;
} {
	const operations = computeDiff(before, after);
	const tree = parseHtml(after);
	
	return { operations, tree };
}
