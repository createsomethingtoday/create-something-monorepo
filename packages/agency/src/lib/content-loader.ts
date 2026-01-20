/**
 * Content Loader - .agency Implementation
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
 * Work case study frontmatter - .agency specific
 */
export interface WorkFrontmatter extends BaseFrontmatter {
	description?: string;
	subtitle?: string;
	category?: string;
	industry?: string;
	metrics?: string[];
	client?: string;
	year?: string;
}

/**
 * Load a single work case study by slug
 */
export async function loadWorkBySlug(slug: string): Promise<ContentItem<WorkFrontmatter>> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: WorkFrontmatter;
	}>('../../content/work/*.md');

	const items = await loadMarkdownContent(modules, false);
	const item = items.find((i) => i.slug === slug);

	if (!item) {
		throw error(404, `Work case study not found: ${slug}`);
	}

	if (item.frontmatter.published === false || item.frontmatter.hidden === true) {
		throw error(404, 'Work case study not available');
	}

	return item;
}

/**
 * Get all work case study slugs for static generation
 */
export async function getWorkSlugs(): Promise<string[]> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: WorkFrontmatter;
	}>('../../content/work/*.md');
	const items = await loadMarkdownContent(modules, true);
	return items.map((item) => item.slug);
}

/**
 * Get all work case studies
 */
export async function getAllWork(): Promise<ContentItem<WorkFrontmatter>[]> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: WorkFrontmatter;
	}>('../../content/work/*.md');
	return loadMarkdownContent(modules, true);
}
