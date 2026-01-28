/**
 * Content Loader - .ltd Implementation
 *
 * Loads markdown content using Vite's import.meta.glob.
 * Uses shared utilities from @create-something/canon.
 */

import { error } from '@sveltejs/kit';
import type { Component } from 'svelte';
import {
	loadMarkdownContent,
	loadContentBySlug,
	getContentSlugs,
	type BaseFrontmatter,
	type ContentItem
} from '@create-something/canon/content';

// Re-export shared types and functions for convenience
export { loadMarkdownContent, loadContentBySlug, getContentSlugs, type BaseFrontmatter, type ContentItem };

/**
 * Pattern frontmatter - .ltd specific
 */
export interface PatternFrontmatter extends BaseFrontmatter {
	subtitle?: string;
	category: string;
	keywords?: string[];
	readingTime?: number;
	difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Canon page frontmatter - .ltd specific
 */
export interface CanonFrontmatter extends BaseFrontmatter {
	subtitle?: string;
	category?: string;
	section?: string;
	pronunciation?: string;
	translation?: string;
	description?: string;
	lead?: string;
	order?: number;
}

// Pattern modules - defined once, used by both functions
const getPatternModules = () =>
	import.meta.glob<{
		default: Component;
		metadata: PatternFrontmatter;
	}>('./content/patterns/*.md');

/**
 * Load a single pattern by slug
 */
export async function loadPatternBySlug(slug: string): Promise<ContentItem<PatternFrontmatter>> {
	const item = await loadContentBySlug(getPatternModules(), slug);

	if (!item) {
		throw error(404, `Pattern not found: ${slug}`);
	}

	return item;
}

/**
 * Get all pattern slugs for static generation
 */
export async function getPatternSlugs(): Promise<string[]> {
	return getContentSlugs(getPatternModules());
}

/**
 * Load a single canon page by path
 * @param path - Path parts (e.g., [] for index, ['concepts'] for section, ['concepts', 'zuhandenheit'] for page)
 */
export async function loadCanonByPath(
	path: string[]
): Promise<ContentItem<CanonFrontmatter>> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: CanonFrontmatter;
	}>('./content/canon/**/*.md');

	// Convert path to expected file path
	let expectedPath: string;
	if (path.length === 0) {
		// Root index
		expectedPath = './content/canon/index.md';
	} else if (path.length === 1) {
		// Section index (e.g., concepts/index.md)
		expectedPath = `./content/canon/${path[0]}/index.md`;
	} else {
		// Nested page (e.g., concepts/zuhandenheit.md)
		const section = path[0];
		const slug = path.slice(1).join('/');
		expectedPath = `./content/canon/${section}/${slug}.md`;
	}

	// Find matching module
	const resolver = modules[expectedPath];
	if (!resolver) {
		throw error(404, `Canon page not found: ${path.join('/')}`);
	}

	const mod = await resolver();
	const slug = path[path.length - 1] || 'index';

	const item = {
		frontmatter: mod.metadata,
		component: mod.default,
		slug
	};

	if (item.frontmatter.published === false || item.frontmatter.hidden === true) {
		throw error(404, 'Canon page not available');
	}

	return item;
}

/**
 * Get all canon page paths for static generation
 * @returns Array of path arrays (e.g., [[], ['concepts'], ['concepts', 'zuhandenheit']])
 */
export async function getCanonPaths(): Promise<string[][]> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: CanonFrontmatter;
	}>('./content/canon/**/*.md');

	const paths: string[][] = [];

	for (const path of Object.keys(modules)) {
		// Extract path parts from: ./content/canon/concepts/zuhandenheit.md
		const match = path.match(/\.\/content\/canon\/(.+)\.md$/);
		if (!match) continue;

		const parts = match[1].split('/');

		// Handle index files
		if (parts[parts.length - 1] === 'index') {
			if (parts.length === 1) {
				// Root index
				paths.push([]);
			} else {
				// Section index (e.g., concepts/index.md -> ['concepts'])
				paths.push(parts.slice(0, -1));
			}
		} else {
			// Regular page (e.g., concepts/zuhandenheit.md -> ['concepts', 'zuhandenheit'])
			paths.push(parts);
		}
	}

	return paths;
}
