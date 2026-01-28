/**
 * Content Loader - Type Definitions
 *
 * Shared type definitions for markdown content with frontmatter.
 * Actual loading implementations live in each package (io, ltd, agency)
 * since import.meta.glob is context-specific.
 */

import type { Component } from 'svelte';

/**
 * Base frontmatter schema - all content types extend this
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
 * Paper frontmatter (for .io papers)
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
 * Pattern frontmatter (for .ltd patterns)
 */
export interface PatternFrontmatter extends BaseFrontmatter {
	category: string;
	description: string;
	keywords?: string[];
	related?: string[];
}

/**
 * Canon page frontmatter (for .ltd canon)
 */
export interface CanonFrontmatter extends BaseFrontmatter {
	category: string;
	description: string;
	tokens?: string[];
	examples?: string[];
}

/**
 * Work page frontmatter (for .agency work)
 */
export interface WorkFrontmatter extends BaseFrontmatter {
	client: string;
	industry: string;
	services: string[];
	outcome: string;
	timeline?: string;
	testimonial?: {
		quote: string;
		author: string;
		role: string;
	};
}

/**
 * Generic content item with MDsveX component
 */
export interface ContentItem<T extends BaseFrontmatter = BaseFrontmatter> {
	frontmatter: T;
	component: Component;
	slug: string;
}
