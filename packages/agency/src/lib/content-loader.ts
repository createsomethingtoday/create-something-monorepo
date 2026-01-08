/**
 * Content Loader - .agency Implementation
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
 * Work case study frontmatter
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
 * Load a single work case study by slug
 */
export async function loadWorkBySlug(slug: string): Promise<ContentItem<WorkFrontmatter>> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: WorkFrontmatter;
	}>('../content/work/*.md');

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
	}>('../content/work/*.md');
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
	}>('../content/work/*.md');
	return loadMarkdownContent(modules, true);
}
