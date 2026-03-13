/**
 * Markdown formatting utilities for page export
 */

export interface PageMetadata {
	author?: string;
	date?: string;
	category?: string;
	keywords?: string[];
	sourceUrl?: string;
	[key: string]: unknown;
}

/**
 * Format page content as markdown with optional metadata
 * @param title - Page title
 * @param content - Page content (markdown or HTML)
 * @param metadata - Optional metadata to include
 * @returns Formatted markdown string
 */
export function formatPageMarkdown(
	title: string,
	content: string,
	metadata?: PageMetadata
): string {
	const parts: string[] = [];

	// Title
	parts.push(`# ${title}\n`);

	// Metadata section
	if (metadata) {
		const metaParts: string[] = [];

		if (metadata.author) metaParts.push(`**Author**: ${metadata.author}`);
		if (metadata.date) metaParts.push(`**Date**: ${metadata.date}`);
		if (metadata.category) metaParts.push(`**Category**: ${metadata.category}`);
		if (metadata.keywords && metadata.keywords.length > 0) {
			metaParts.push(`**Keywords**: ${metadata.keywords.join(', ')}`);
		}
		if (metadata.sourceUrl) metaParts.push(`**Source**: ${metadata.sourceUrl}`);

		// Add any other metadata fields
		Object.entries(metadata).forEach(([key, value]) => {
			if (
				!['author', 'date', 'category', 'keywords', 'sourceUrl'].includes(key) &&
				value !== undefined &&
				value !== null
			) {
				metaParts.push(`**${key}**: ${String(value)}`);
			}
		});

		if (metaParts.length > 0) {
			parts.push(metaParts.join('  \n') + '\n');
		}
	}

	// Content
	parts.push(content);

	return parts.join('\n');
}

/**
 * Maximum URL length for Claude.ai (conservative estimate)
 * Claude.ai has URL length limits, so we truncate if needed
 */
const MAX_URL_LENGTH = 8000;

/**
 * Truncate content to fit within URL length limits
 * @param content - Content to truncate
 * @param maxLength - Maximum length (default: conservative estimate)
 * @returns Truncated content with indicator if truncated
 */
export function truncateForUrl(content: string, maxLength: number = MAX_URL_LENGTH): string {
	if (content.length <= maxLength) {
		return content;
	}

	const truncated = content.substring(0, maxLength - 50); // Leave room for indicator
	return `${truncated}\n\n[Content truncated due to URL length limits]`;
}

/**
 * Generate Claude.ai URL with content and optional prompt
 * @param content - Markdown content to send
 * @param prompt - Optional prompt/context for Claude
 * @returns Claude.ai URL
 */
export function generateClaudeUrl(content: string, prompt?: string): string {
	const baseUrl = 'https://claude.ai/new';

	// Construct the query
	const queryParts: string[] = [];

	if (prompt) {
		queryParts.push(prompt);
		queryParts.push('\n\n---\n\n');
	}

	queryParts.push(content);

	const fullQuery = queryParts.join('');
	const truncatedQuery = truncateForUrl(fullQuery);

	// Encode for URL
	const encodedQuery = encodeURIComponent(truncatedQuery);

	return `${baseUrl}?q=${encodedQuery}`;
}
