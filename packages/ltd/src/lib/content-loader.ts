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
	}>('../content/patterns/*.md');

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
	}>('../content/patterns/*.md');
	const items = await loadMarkdownContent(modules, true);
	return items.map((item) => item.slug);
}

/**
 * Load a single canon page by slug
 */
export async function loadCanonBySlug(slug: string): Promise<ContentItem<CanonFrontmatter>> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: CanonFrontmatter;
	}>('../content/canon/*.md');

	const items = await loadMarkdownContent(modules, false);
	const item = items.find((i) => i.slug === slug);

	if (!item) {
		throw error(404, `Canon page not found: ${slug}`);
	}

	if (item.frontmatter.published === false || item.frontmatter.hidden === true) {
		throw error(404, 'Canon page not available');
	}

	return item;
}

/**
 * Get all canon page slugs for static generation
 */
export async function getCanonSlugs(): Promise<string[]> {
	const modules = import.meta.glob<{
		default: Component;
		metadata: CanonFrontmatter;
	}>('../content/canon/*.md');
	const items = await loadMarkdownContent(modules, true);
	return items.map((item) => item.slug);
}
