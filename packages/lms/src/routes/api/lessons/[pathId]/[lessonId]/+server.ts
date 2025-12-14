/**
 * Lesson Content API
 *
 * GET /api/lessons/:pathId/:lessonId
 *
 * Returns lesson content for MCP server consumption.
 * Supports text/markdown Accept header for raw content.
 * Canon: Content delivery without ceremony.
 */

import type { RequestHandler } from './$types';
import { json, error, text } from '@sveltejs/kit';
import { getPath, getLesson } from '$lib/content/paths';
import { loadLesson, extractFrontmatter, extractHeadings } from '$lib/content/lessons';

export const GET: RequestHandler = async ({ params, request }) => {
	const { pathId, lessonId } = params;

	// Validate path exists
	const path = getPath(pathId);
	if (!path) {
		throw error(404, `Path not found: ${pathId}`);
	}

	// Validate lesson exists in path config
	const lessonMeta = getLesson(pathId, lessonId);
	if (!lessonMeta) {
		throw error(404, `Lesson not found: ${pathId}/${lessonId}`);
	}

	// Load lesson content
	let markdown: string;
	try {
		markdown = await loadLesson(pathId, lessonId);
	} catch (err) {
		console.error(`Failed to load lesson content: ${pathId}/${lessonId}`, err);
		throw error(404, `Lesson content not found: ${pathId}/${lessonId}`);
	}

	// Check Accept header for raw markdown
	const acceptHeader = request.headers.get('Accept') || '';
	if (acceptHeader.includes('text/markdown')) {
		return text(markdown, {
			headers: {
				'Content-Type': 'text/markdown; charset=utf-8',
				'Cache-Control': 'public, max-age=3600' // 1 hour cache
			}
		});
	}

	// Extract metadata from frontmatter
	const { frontmatter, content } = extractFrontmatter(markdown);

	// Extract table of contents
	const headings = extractHeadings(content);

	// Return structured JSON response
	return json(
		{
			path: {
				id: path.id,
				title: path.title,
				subtitle: path.subtitle
			},
			lesson: {
				id: lessonMeta.id,
				title: lessonMeta.title,
				description: lessonMeta.description,
				duration: lessonMeta.duration,
				praxis: lessonMeta.praxis || null
			},
			content: {
				markdown: content,
				frontmatter,
				headings
			}
		},
		{
			headers: {
				'Cache-Control': 'public, max-age=3600', // 1 hour cache
				ETag: `"${pathId}-${lessonId}-${Date.now()}"`
			}
		}
	);
};
