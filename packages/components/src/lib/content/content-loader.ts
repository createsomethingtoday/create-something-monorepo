/**
 * Content Loader Utilities
 *
 * Shared utilities for loading markdown content using Vite's import.meta.glob.
 * Used across .ltd, .io, .agency, and .space properties.
 *
 * @example
 * import { loadMarkdownContent, type BaseFrontmatter, type ContentItem } from '@create-something/components/content';
 *
 * const items = await loadMarkdownContent<MyFrontmatter>(
 *   import.meta.glob('./content/*.md'),
 *   true
 * );
 */

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
 * Content item with MDsveX component
 */
export interface ContentItem<T extends BaseFrontmatter = BaseFrontmatter> {
	frontmatter: T;
	component: Component;
	slug: string;
}

/**
 * Glob pattern result type for import.meta.glob
 */
export type GlobPattern<T extends BaseFrontmatter> = Record<
	string,
	() => Promise<{ default: Component; metadata: T }>
>;

/**
 * Load all markdown content from a glob pattern
 *
 * @param globPattern - Result of import.meta.glob for markdown files
 * @param filterPublished - Whether to filter out unpublished content (default: true)
 * @returns Array of content items sorted by publishedAt date (newest first)
 *
 * @example
 * // In a SvelteKit +page.server.ts
 * const modules = import.meta.glob<{
 *   default: Component;
 *   metadata: PaperFrontmatter;
 * }>('../content/papers/*.md');
 *
 * const papers = await loadMarkdownContent(modules, true);
 */
export async function loadMarkdownContent<T extends BaseFrontmatter>(
	globPattern: GlobPattern<T>,
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
		const dateA = a.frontmatter?.publishedAt ? new Date(a.frontmatter.publishedAt).getTime() : 0;
		const dateB = b.frontmatter?.publishedAt ? new Date(b.frontmatter.publishedAt).getTime() : 0;
		return dateB - dateA;
	});
}

/**
 * Load a single content item by slug
 *
 * @param globPattern - Result of import.meta.glob for markdown files
 * @param slug - The slug to find
 * @param allowUnpublished - Whether to return unpublished content (default: false)
 * @returns The content item or null if not found
 */
export async function loadContentBySlug<T extends BaseFrontmatter>(
	globPattern: GlobPattern<T>,
	slug: string,
	allowUnpublished = false
): Promise<ContentItem<T> | null> {
	const items = await loadMarkdownContent(globPattern, false);
	const item = items.find((i) => i.slug === slug);

	if (!item) {
		return null;
	}

	if (!allowUnpublished && (item.frontmatter.published === false || item.frontmatter.hidden === true)) {
		return null;
	}

	return item;
}

/**
 * Get all slugs from a glob pattern for static generation
 *
 * @param globPattern - Result of import.meta.glob for markdown files
 * @param filterPublished - Whether to filter out unpublished content (default: true)
 * @returns Array of slugs
 */
export async function getContentSlugs<T extends BaseFrontmatter>(
	globPattern: GlobPattern<T>,
	filterPublished = true
): Promise<string[]> {
	const items = await loadMarkdownContent(globPattern, filterPublished);
	return items.map((item) => item.slug);
}
