/**
 * Content Loader - .io Implementation
 *
 * Loads markdown content using Vite's import.meta.glob.
 * Uses shared utilities from @create-something/components.
 */

import { error } from '@sveltejs/kit';
import type { Component } from 'svelte';
import {
	loadMarkdownContent,
	type BaseFrontmatter,
	type ContentItem
} from '@create-something/components/content';

// Re-export shared types and functions for convenience
export { loadMarkdownContent, type BaseFrontmatter, type ContentItem };

/**
 * Paper frontmatter - .io specific
 */
export interface PaperFrontmatter extends BaseFrontmatter {
	subtitle?: string;
	authors: string[];
	category: string;
	abstract: string;
	keywords?: string[];
	readingTime?: number;
	difficulty?: 'beginner' | 'intermediate' | 'advanced';
	prerequisites?: string[];
}

/**
 * Load a single paper by slug
 */
export async function loadPaperBySlug(slug: string): Promise<ContentItem<PaperFrontmatter>> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: PaperFrontmatter;
	}>('../content/papers/*.md');

	const items = await loadMarkdownContent(modules, false);
	const item = items.find((i) => i.slug === slug);

	if (!item) {
		throw error(404, `Paper not found: ${slug}`);
	}

	if (item.frontmatter.published === false || item.frontmatter.hidden === true) {
		throw error(404, 'Paper not available');
	}

	return item;
}

/**
 * Get all paper slugs for static generation
 */
export async function getPaperSlugs(): Promise<string[]> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: PaperFrontmatter;
	}>('../content/papers/*.md');
	const items = await loadMarkdownContent(modules, true);
	return items.map((item) => item.slug);
}
