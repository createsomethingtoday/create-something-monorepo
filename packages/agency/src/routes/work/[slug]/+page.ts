/**
 * Work Case Study - Universal Load Function
 *
 * Uses eager imports to load markdown at build time.
 * This avoids serialization issues with Svelte components.
 */

import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Component } from 'svelte';

interface WorkFrontmatter {
	title: string;
	description?: string;
	subtitle?: string;
	slug?: string;
	category?: string;
	industry?: string;
	metrics?: string[];
	publishedAt?: string;
	published?: boolean;
	hidden?: boolean;
}

// Eager import all work markdown files at build time
const modules = import.meta.glob<{
	default: Component;
	metadata: WorkFrontmatter;
}>('/content/work/*.md', { eager: true });

export const load: PageLoad = async ({ params }) => {
	const { slug } = params;

	// Find the matching module
	const path = `/content/work/${slug}.md`;
	const module = modules[path];

	if (!module) {
		throw error(404, `Work case study not found: ${slug}`);
	}

	const { default: component, metadata } = module;

	if (metadata.published === false || metadata.hidden === true) {
		throw error(404, 'Work case study not available');
	}

	return {
		component,
		frontmatter: metadata,
		slug
	};
};
