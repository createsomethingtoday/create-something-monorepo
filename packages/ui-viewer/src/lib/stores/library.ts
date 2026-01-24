/**
 * Component Library Store
 * 
 * Save and manage reusable UI component snapshots.
 * Like Pencil's design library, but for CLI agents.
 */

import { writable, derived, get } from 'svelte/store';
import type { NodeData } from './operations';

export interface LibraryComponent {
	id: string;
	name: string;
	description?: string;
	tags: string[];
	tree: NodeData;
	sourcePath?: string;
	savedAt: string;
	updatedAt: string;
}

export interface ComponentLibrary {
	version: string;
	components: LibraryComponent[];
}

// Library state
const createLibraryStore = () => {
	const STORAGE_KEY = 'ui-preview-library';
	
	// Load from localStorage
	const loadLibrary = (): ComponentLibrary => {
		if (typeof localStorage === 'undefined') {
			return { version: '1.0', components: [] };
		}
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				return JSON.parse(stored);
			}
		} catch (e) {
			console.warn('Failed to load library:', e);
		}
		return { version: '1.0', components: [] };
	};
	
	const { subscribe, set, update } = writable<ComponentLibrary>(loadLibrary());
	
	// Persist to localStorage on changes
	subscribe((lib) => {
		if (typeof localStorage !== 'undefined') {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
			} catch (e) {
				console.warn('Failed to save library:', e);
			}
		}
	});
	
	return {
		subscribe,
		
		/**
		 * Save a component to the library
		 */
		save: (component: Omit<LibraryComponent, 'id' | 'savedAt' | 'updatedAt'>) => {
			const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
			const now = new Date().toISOString();
			
			update((lib) => ({
				...lib,
				components: [
					...lib.components,
					{
						...component,
						id,
						savedAt: now,
						updatedAt: now,
					},
				],
			}));
			
			return id;
		},
		
		/**
		 * Update an existing component
		 */
		update: (id: string, updates: Partial<Omit<LibraryComponent, 'id' | 'savedAt'>>) => {
			update((lib) => ({
				...lib,
				components: lib.components.map((comp) =>
					comp.id === id
						? { ...comp, ...updates, updatedAt: new Date().toISOString() }
						: comp
				),
			}));
		},
		
		/**
		 * Delete a component
		 */
		delete: (id: string) => {
			update((lib) => ({
				...lib,
				components: lib.components.filter((comp) => comp.id !== id),
			}));
		},
		
		/**
		 * Get component by ID
		 */
		get: (id: string): LibraryComponent | undefined => {
			return get({ subscribe }).components.find((comp) => comp.id === id);
		},
		
		/**
		 * Search components by name or tags
		 */
		search: (query: string): LibraryComponent[] => {
			const q = query.toLowerCase();
			return get({ subscribe }).components.filter(
				(comp) =>
					comp.name.toLowerCase().includes(q) ||
					comp.tags.some((tag) => tag.toLowerCase().includes(q)) ||
					comp.description?.toLowerCase().includes(q)
			);
		},
		
		/**
		 * Export library as JSON
		 */
		export: (): string => {
			return JSON.stringify(get({ subscribe }), null, 2);
		},
		
		/**
		 * Import library from JSON
		 */
		import: (json: string, merge = true) => {
			try {
				const imported: ComponentLibrary = JSON.parse(json);
				if (merge) {
					update((lib) => ({
						version: lib.version,
						components: [
							...lib.components,
							...imported.components.filter(
								(imp) => !lib.components.some((c) => c.id === imp.id)
							),
						],
					}));
				} else {
					set(imported);
				}
			} catch (e) {
				console.error('Failed to import library:', e);
				throw e;
			}
		},
		
		/**
		 * Clear entire library
		 */
		clear: () => {
			set({ version: '1.0', components: [] });
		},
	};
};

export const library = createLibraryStore();

// Derived store for component count
export const componentCount = derived(library, ($lib) => $lib.components.length);

// Derived store for all unique tags
export const allTags = derived(library, ($lib) => {
	const tags = new Set<string>();
	$lib.components.forEach((comp) => comp.tags.forEach((tag) => tags.add(tag)));
	return Array.from(tags).sort();
});
