/**
 * Content Loader - .ltd Implementation
 *
 * Loads markdown content using Vite's import.meta.glob.
 * This implementation is package-specific since glob context matters.
 */

import { error } from '@sveltejs/kit';
import type { Component } from 'svelte';

/**
 * Base frontmatter - all content types extend this
 */
export interface BaseFrontmatter {
	title: string;
	slug?: string;
	published?: boolean;
	publishedAt?: string;
	updatedAt?: string;
	hidden?: boolean;
}

/**
 * Pattern frontmatter
 */
export interface PatternFrontmatter extends BaseFrontmatter {
	subtitle?: string;
	category: string;
	keywords?: string[];
	readingTime?: number;
	difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Canon page frontmatter
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

/**
 * Content item with MDsveX component
 */
export interface ContentItem<T extends BaseFrontmatter = BaseFrontmatter> {
	frontmatter: T;
	component: Component;
	slug: string;
}

/**
 * Load all markdown content from a glob pattern
 */
export async function loadMarkdownContent<T extends BaseFrontmatter>(
	globPattern: Record<string, () => Promise<{ default: Component; metadata: T }>>,
	filterPublished = true
): Promise<ContentItem<T>[]> {
	const items = await Promise.all(
		Object.entries(globPattern).map(async ([path, resolver]) => {
			const mod = await resolver();
			const slug = path.split('/').pop()?.replace('.md', '') || '';

			return {
				frontmatter: mod.metadata,
				component: mod.default,
				slug
			};
		})
	);

	// Filter published content if requested
	const filtered = filterPublished
		? items.filter((item) => item.frontmatter.published !== false)
		: items;

	// Sort by publishedAt date (newest first)
	return filtered.sort((a, b) => {
		const dateA = a.frontmatter.publishedAt ? new Date(a.frontmatter.publishedAt).getTime() : 0;
		const dateB = b.frontmatter.publishedAt ? new Date(b.frontmatter.publishedAt).getTime() : 0;
		return dateB - dateA;
	});
}

/**
 * Load a single pattern by slug
 */
export async function loadPatternBySlug(slug: string): Promise<ContentItem<PatternFrontmatter>> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: PatternFrontmatter;
	}>('/content/patterns/*.md');

	const items = await loadMarkdownContent(modules, false);
	const item = items.find((i) => i.slug === slug);

	if (!item) {
		throw error(404, `Pattern not found: ${slug}`);
	}

	if (item.frontmatter.published === false || item.frontmatter.hidden === true) {
		throw error(404, 'Pattern not available');
	}

	return item;
}

/**
 * Get all pattern slugs for static generation
 */
export async function getPatternSlugs(): Promise<string[]> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: PatternFrontmatter;
	}>('/content/patterns/*.md');
	const items = await loadMarkdownContent(modules, true);
	return items.map((item) => item.slug);
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
	}>('/content/canon/**/*.md');

	// Convert path to expected file path
	let expectedPath: string;
	if (path.length === 0) {
		// Root index
		expectedPath = '/content/canon/index.md';
	} else if (path.length === 1) {
		// Section index (e.g., concepts/index.md)
		expectedPath = `/content/canon/${path[0]}/index.md`;
	} else {
		// Nested page (e.g., concepts/zuhandenheit.md)
		const section = path[0];
		const slug = path.slice(1).join('/');
		expectedPath = `/content/canon/${section}/${slug}.md`;
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
	}>('/content/canon/**/*.md');

	const paths: string[][] = [];

	for (const path of Object.keys(modules)) {
		// Extract path parts from: /content/canon/concepts/zuhandenheit.md
		const match = path.match(/\/content\/canon\/(.+)\.md$/);
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
